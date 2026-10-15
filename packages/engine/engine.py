from __future__ import annotations

import secrets
import threading
from collections import Counter

from packages.ai import AssistantAdapter, SimulatedAssistant
from packages.domain import (
    Control,
    DefenseConfiguration,
    Exposure,
    GameRole,
    LegitimateResult,
    OperationalEvent,
    RoundResult,
    Scenario,
    Session,
    TraceEvent,
    TurnResult,
)
from packages.engine.content import Content
from packages.security import active_controls, exposure_level, retrieve


class InvalidAction(ValueError):
    """The request does not match the catalog or the session's state."""


class SessionNotFound(KeyError):
    pass


class RoundNotFinished(Exception):
    pass


class UndefinedConfiguration(Exception):
    """No scripted outcome exists for this defense combination."""


def select_configuration(scenario: Scenario, controls: frozenset[Control]) -> DefenseConfiguration:
    """The first configuration, in priority order, whose controls are all active."""
    for configuration in scenario.configurations:
        if configuration.requires_controls <= controls:
            return configuration
    raise UndefinedConfiguration(
        f"Scenario {scenario.id} has no simulated outcome for this combination of defenses."
    )


class DemoEngine:
    """Runs sessions in memory. The service owns identity; the browser never does."""

    def __init__(self, content: Content, assistant: AssistantAdapter | None = None) -> None:
        self.content = content
        self.assistant = assistant or SimulatedAssistant()
        self._sessions: dict[str, Session] = {}
        self._lock = threading.Lock()

    # --- Sessions --------------------------------------------------------------

    def create_session(self, role: str, scenario_id: str, defense_ids: list[str]) -> Session:
        try:
            game_role = GameRole(role)
        except ValueError as error:
            raise InvalidAction(f"Unknown role: {role!r}") from error
        scenario = self._scenario(scenario_id)
        unknown = [d for d in defense_ids if d not in self.content.defenses]
        if unknown:
            raise InvalidAction(f"Unknown defenses: {unknown}")
        selected = tuple(dict.fromkeys(defense_ids))
        configuration = select_configuration(scenario, self._controls(selected))
        session = Session(
            id=secrets.token_urlsafe(12),
            role=game_role,
            scenario_id=scenario.id,
            identity=scenario.requester_role,  # assigned here, never taken from a message
            selected_defense_ids=selected,
            configuration_id=configuration.id,
            mode=self.assistant.mode,
        )
        with self._lock:
            self._sessions[session.id] = session
        return session

    def get_session(self, session_id: str) -> Session:
        with self._lock:
            session = self._sessions.get(session_id)
        if session is None:
            raise SessionNotFound(session_id)
        return session

    def reset(self, session_id: str) -> Session:
        """Same scenario, identity and defenses; history and exposure cleared."""
        session = self.get_session(session_id)
        with self._lock:
            session.turn = 0
            session.disclosed_fragment_ids.clear()
            session.operational_events.clear()
            session.legitimate_executed = 0
            session.legitimate_completed = 0
        return session

    # --- Turns -----------------------------------------------------------------

    def run_attack_turn(self, session_id: str) -> TurnResult:
        session = self.get_session(session_id)
        scenario = self._scenario(session.scenario_id)
        if session.turn >= scenario.max_turns:
            raise InvalidAction("This round is finished. Reset to play it again.")

        configuration = self._configuration(session)
        request = scenario.attack_turns[session.turn]
        retrieved, retrieval_trace, retrieval_events = self._retrieve(session, request.candidate_document_ids)
        context = tuple(self.content.documents[d] for d in retrieved)
        scripted = self.assistant.reply(scenario, configuration, session.turn, context)

        with self._lock:
            new = sorted(scripted.disclosed_fragment_ids - session.disclosed_fragment_ids)
            session.disclosed_fragment_ids |= scripted.disclosed_fragment_ids
            events = (*retrieval_events, *scripted.operational_events)
            session.operational_events.extend(events)
            session.turn += 1
            exposure = self._exposure(session, scenario)

        return TurnResult(
            turn=session.turn,
            request=request.text,
            response=scripted.response,
            mode=session.mode,
            retrieved_document_ids=retrieved,
            newly_disclosed_fragment_ids=tuple(new),
            exposure=exposure,
            trace=(*retrieval_trace, *scripted.trace),
            operational_events=events,
            finished=session.turn >= scenario.max_turns,
        )

    def run_legitimate_request(self, session_id: str) -> LegitimateResult:
        """Check that the selected defenses still let authorized work through."""
        session = self.get_session(session_id)
        scenario = self._scenario(session.scenario_id)
        request = scenario.legitimate_task.request
        retrieved, retrieval_trace, retrieval_events = self._retrieve(session, request.candidate_document_ids)
        context = tuple(self.content.documents[d] for d in retrieved)
        reply = self.assistant.reply_legitimate(scenario, self._configuration(session), context)

        with self._lock:
            session.legitimate_executed += 1
            session.legitimate_completed += int(reply.completed)
            session.operational_events.extend(retrieval_events)

        return LegitimateResult(
            request=request.text,
            response=reply.response,
            completed=reply.completed,
            mode=session.mode,
            retrieved_document_ids=retrieved,
            trace=retrieval_trace,
        )

    def round_result(self, session_id: str) -> RoundResult:
        session = self.get_session(session_id)
        scenario = self._scenario(session.scenario_id)
        if session.turn < scenario.max_turns:
            raise RoundNotFinished("Finish every attack turn before reading the result.")
        configuration = self._configuration(session)
        acting = tuple(
            d for d in session.selected_defense_ids
            if self.content.defenses[d].controls & configuration.requires_controls
        )
        cost = Counter(event.type for event in session.operational_events)
        return RoundResult(
            scenario_id=scenario.id,
            configuration_id=configuration.id,
            mode=session.mode,
            selected_defense_ids=session.selected_defense_ids,
            acting_defense_ids=acting,
            exposure=self._exposure(session, scenario),
            disclosed_fragment_ids=tuple(sorted(session.disclosed_fragment_ids)),
            legitimate_executed=session.legitimate_executed,
            legitimate_completed=session.legitimate_completed,
            operational_cost={
                "verifications": cost["verification"],
                "blocks": cost["block"],
                "humanReviews": cost["human-review"],
            },
            explanation=configuration.explanation,
            remaining_risk=configuration.remaining_risk,
            limitations=scenario.limitations,
        )

    # --- Internals -------------------------------------------------------------

    def _scenario(self, scenario_id: str) -> Scenario:
        try:
            return self.content.scenarios[scenario_id]
        except KeyError as error:
            raise InvalidAction(f"Unknown scenario: {scenario_id!r}") from error

    def _controls(self, defense_ids: tuple[str, ...]) -> frozenset[Control]:
        return active_controls(self.content.defenses[d] for d in defense_ids)

    def _configuration(self, session: Session) -> DefenseConfiguration:
        scenario = self._scenario(session.scenario_id)
        return next(c for c in scenario.configurations if c.id == session.configuration_id)

    def _exposure(self, session: Session, scenario: Scenario) -> Exposure:
        fragments = self.content.fragments_of(scenario)
        return exposure_level(session.disclosed_fragment_ids, (f.id for f in fragments))

    def _retrieve(self, session: Session, candidate_ids: tuple[str, ...]):
        enforce = Control.RETRIEVAL_PERMISSIONS in self._controls(session.selected_defense_ids)
        retrieved, excluded = retrieve(
            session.identity, candidate_ids, self.content.documents, enforce_permissions=enforce
        )
        titles = lambda ids: ", ".join(self.content.documents[d].title for d in ids) or "none"  # noqa: E731
        trace = [TraceEvent("identity", f"Session identity: {session.identity}, assigned by the service.", "assigned")]
        events: list[OperationalEvent] = []
        if enforce:
            trace.append(TraceEvent(
                "retrieval",
                f"Permissions checked. Retrieved: {titles(retrieved)}. Excluded: {titles(excluded)}.",
                "filtered" if excluded else "allowed",
            ))
            events.append(OperationalEvent("verification", "Document permissions checked for the session identity."))
        else:
            trace.append(TraceEvent(
                "retrieval",
                f"No permission check. Every matching document reached the assistant: {titles(retrieved)}.",
                "unfiltered",
            ))
        return retrieved, tuple(trace), tuple(events)
