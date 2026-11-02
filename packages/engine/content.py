"""Load and validate the JSON content in content/ into domain objects."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from packages.domain import (
    ACCESS_IDENTITIES,
    AttackCard,
    Clue,
    Control,
    DefenseCard,
    DefenseConfiguration,
    Fragment,
    Investigation,
    KnowledgeDocument,
    LegitimateReply,
    LegitimateTask,
    Mission,
    OperationalEvent,
    Request,
    RootCause,
    Scenario,
    ScriptedTurn,
    TraceEvent,
)

DEFAULT_CONTENT_ROOT = Path(__file__).resolve().parents[2] / "content"
OPERATIONAL_EVENT_TYPES = {"verification", "block", "human-review"}
CHECKPOINT_STAGES = {"identity", "retrieval", "context", "assistant", "session", "output"}


class ContentError(ValueError):
    """The content files are inconsistent with each other or with the contracts."""


@dataclass(frozen=True)
class Content:
    attacks: dict[str, AttackCard]
    defenses: dict[str, DefenseCard]
    documents: dict[str, KnowledgeDocument]
    scenarios: dict[str, Scenario]
    missions: dict[str, Mission]

    def fragments_of(self, scenario: Scenario) -> tuple[Fragment, ...]:
        return self.documents[scenario.protected_document_id].fragments


def load_content(root: Path = DEFAULT_CONTENT_ROOT) -> Content:
    attacks = {a.id: a for a in map(_attack, _read(root / "attacks" / "catalog.json"))}
    defenses = {d.id: d for d in map(_defense, _read(root / "defenses" / "catalog.json"))}
    documents = {d.id: d for d in map(_document, _read(root / "knowledge-base" / "documents.json"))}
    scenarios = {}
    for path in sorted((root / "scenarios").glob("*.json")):
        scenario = _scenario(_read(path))
        scenarios[scenario.id] = scenario
    missions = {m.id: m for m in map(_mission, _read(root / "missions" / "catalog.json"))}
    content = Content(attacks, defenses, documents, scenarios, missions)
    _validate(content)
    return content


def _read(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ContentError(f"{path}: {error}") from error


def _attack(raw: dict) -> AttackCard:
    return AttackCard(raw["id"], raw["title"], raw["explanation"], raw["risk"], raw["defenseId"])


def _defense(raw: dict) -> DefenseCard:
    return DefenseCard(
        raw["id"], raw["title"], raw["explanation"], raw["layer"], raw["limitation"],
        frozenset(Control(c) for c in raw["controls"]),
    )


def _mission(raw: dict) -> Mission:
    return Mission(raw["id"], raw["title"], raw["briefing"], tuple(raw["defenseIds"]), raw["attempts"], raw["lesson"])


def _document(raw: dict) -> KnowledgeDocument:
    return KnowledgeDocument(
        raw["id"], raw["title"], raw["classification"], frozenset(raw["allowedRoles"]), raw["text"],
        tuple(Fragment(f["id"], f["label"], tuple(f["matches"])) for f in raw.get("fragments", ())),
        raw.get("highlight"),
    )


def _request(text: str, candidates: list[str]) -> Request:
    return Request(text, tuple(candidates))


def _turn(raw: dict) -> ScriptedTurn:
    return ScriptedTurn(
        raw["response"],
        frozenset(raw["disclosedFragmentIds"]),
        tuple(TraceEvent(t["stage"], t["summary"], t["decision"]) for t in raw["trace"]),
        tuple(OperationalEvent(e["type"], e["summary"]) for e in raw["operationalEvents"]),
    )


def _configuration(raw: dict) -> DefenseConfiguration:
    legitimate = raw.get("legitimate")
    return DefenseConfiguration(
        raw["id"], raw["label"],
        frozenset(Control(c) for c in raw["requiresControls"]),
        tuple(map(_turn, raw["turns"])),
        raw["explanation"], raw["remainingRisk"],
        LegitimateReply(legitimate["response"], legitimate["completed"]) if legitimate else None,
    )


def _scenario(raw: dict) -> Scenario:
    task = raw["legitimateTask"]
    return Scenario(
        id=raw["id"],
        title=raw["title"],
        summary=raw["summary"],
        attack_id=raw["attackId"],
        requester_role=raw["requesterRole"],
        protected_document_id=raw["protectedDocumentId"],
        max_turns=raw["maxTurns"],
        attack_turns=tuple(_request(t["request"], t["candidateDocumentIds"]) for t in raw["attackTurns"]),
        legitimate_task=LegitimateTask(
            _request(task["request"], task["candidateDocumentIds"]),
            task["completedWhen"],
            LegitimateReply(task["response"], task["completed"]),
        ),
        configurations=tuple(map(_configuration, raw["defenseConfigurations"])),
        limitations=tuple(raw["limitations"]),
        investigation=_investigation(raw["investigation"]),
    )


def _investigation(raw: dict) -> Investigation:
    return Investigation(
        raw["title"],
        raw["summary"],
        tuple(Clue(c["id"], c["target"], c["title"], c["explanation"], c["key"]) for c in raw["clues"]),
        tuple(RootCause(r["id"], r["text"], r["correct"], r["feedback"]) for r in raw["rootCauses"]),
    )


def _validate(content: Content) -> None:
    problems: list[str] = []

    for attack in content.attacks.values():
        if attack.defense_id not in content.defenses:
            problems.append(f"attack {attack.id}: unknown defense {attack.defense_id}")

    for mission in content.missions.values():
        unknown = [d for d in mission.defense_ids if d not in content.defenses]
        if unknown:
            problems.append(f"mission {mission.id}: unknown defenses {unknown}")
        if mission.attempts < 1:
            problems.append(f"mission {mission.id}: needs at least one attempt")

    for document in content.documents.values():
        unknown = document.allowed_roles - set(ACCESS_IDENTITIES)
        if unknown:
            problems.append(f"document {document.id}: unknown roles {sorted(unknown)}")
        if document.highlight and document.highlight not in document.text:
            problems.append(f"document {document.id}: highlight is not part of the text")

    for scenario in content.scenarios.values():
        where = f"scenario {scenario.id}"
        if scenario.attack_id not in content.attacks:
            problems.append(f"{where}: unknown attack {scenario.attack_id}")
        if scenario.requester_role not in ACCESS_IDENTITIES:
            problems.append(f"{where}: unknown requester role {scenario.requester_role}")
        protected = content.documents.get(scenario.protected_document_id)
        if protected is None or not protected.fragments:
            problems.append(f"{where}: protected document must exist and define fragments")
            continue
        fragment_ids = {f.id for f in protected.fragments}
        if len(scenario.attack_turns) != scenario.max_turns:
            problems.append(f"{where}: maxTurns does not match the number of attack turns")
        requests = (*scenario.attack_turns, scenario.legitimate_task.request)
        for request in requests:
            for doc_id in request.candidate_document_ids:
                if doc_id not in content.documents:
                    problems.append(f"{where}: unknown document {doc_id}")
        if not scenario.configurations or scenario.configurations[-1].requires_controls:
            problems.append(f"{where}: the last configuration must require no controls (the fallback)")
        for configuration in scenario.configurations:
            if len(configuration.turns) != scenario.max_turns:
                problems.append(f"{where}/{configuration.id}: needs exactly {scenario.max_turns} turns")
            for turn in configuration.turns:
                if not turn.disclosed_fragment_ids <= fragment_ids:
                    problems.append(f"{where}/{configuration.id}: unknown fragment ids")
                for event in turn.operational_events:
                    if event.type not in OPERATIONAL_EVENT_TYPES:
                        problems.append(f"{where}/{configuration.id}: unknown event type {event.type}")

        problems.extend(_investigation_problems(scenario, where))

    if problems:
        raise ContentError("Invalid content:\n- " + "\n- ".join(problems))


def _investigation_problems(scenario: Scenario, where: str) -> list[str]:
    investigation = scenario.investigation
    documents = {d for r in (*scenario.attack_turns, scenario.legitimate_task.request) for d in r.candidate_document_ids}
    problems = []
    if not any(c.key for c in investigation.clues):
        problems.append(f"{where}: the investigation needs at least one key clue")
    if [r.correct for r in investigation.root_causes].count(True) != 1:
        problems.append(f"{where}: the investigation needs exactly one correct root cause")
    for clue in investigation.clues:
        kind, _, value = clue.target.partition(":")
        valid = (
            (kind == "doc" and value in documents)
            or (kind == "checkpoint" and value in CHECKPOINT_STAGES)
            or (kind in ("request", "reply") and value.isdigit() and 1 <= int(value) <= scenario.max_turns)
        )
        if not valid:
            problems.append(f"{where}: clue {clue.id} has an invalid target {clue.target!r}")
    return problems
