"""Shape engine objects into JSON for the browser.

The browser only ever receives what these functions return. Document text is
included only for documents the scenario's identity is allowed to read, so the
confidential recipe never leaves the server unless a response leaks it.
"""

from __future__ import annotations

from itertools import combinations

from packages.domain import Control, LegitimateResult, RoundResult, Scenario, Session, TurnResult
from packages.engine import Content
from packages.security import active_controls

# The checkpoints a request passes through, in order. Each maps to an engine
# trace stage and, if it is optional, to the control that switches it on.
CHECKPOINTS = (
    ("identity", "Identity", "🪪", None),
    ("retrieval", "Permission gate", "🚧", Control.RETRIEVAL_PERMISSIONS),
    ("context", "Instruction wall", "🧱", Control.INSTRUCTION_SEPARATION),
    ("assistant", "Assistant", "🤖", None),
    ("session", "History watch", "🕰️", Control.HISTORY_REVIEW),
    ("output", "Output check", "🔍", Control.OUTPUT_REVIEW),
)
GOOD_DECISIONS = {"filtered", "separated", "not-followed", "not-trusted", "refused", "blocked", "flagged", "noted"}
BAD_DECISIONS = {"unfiltered", "followed", "not-separated", "passed"}
SILENT_DECISIONS = {"not-applied"}


def catalog(content: Content) -> dict:
    return {
        "mode": "simulated",
        "attacks": [
            {"id": a.id, "title": a.title, "explanation": a.explanation, "risk": a.risk, "defenseId": a.defense_id}
            for a in content.attacks.values()
        ],
        "defenses": [
            {"id": d.id, "title": d.title, "explanation": d.explanation, "layer": d.layer, "limitation": d.limitation}
            for d in content.defenses.values()
        ],
        "scenarios": [
            {
                "id": s.id,
                "title": s.title,
                "summary": s.summary,
                "attackId": s.attack_id,
                "requesterRole": s.requester_role,
                "turns": s.max_turns,
                "fragmentCount": len(content.fragments_of(s)),
                "documents": _shelf(content, s),
                "incident": {"title": s.investigation.title, "summary": s.investigation.summary},
            }
            for s in sorted(content.scenarios.values(), key=lambda s: list(content.attacks).index(s.attack_id))
        ],
    }


def investigation(content: Content, scenario_id: str) -> dict:
    """The defender's case file: what happened, the evidence, and possible root causes."""
    case = content.scenarios[scenario_id].investigation
    return {
        "title": case.title,
        "summary": case.summary,
        "clues": [
            {"id": c.id, "target": c.target, "title": c.title, "explanation": c.explanation, "key": c.key}
            for c in case.clues
        ],
        "rootCauses": [
            {"id": r.id, "text": r.text, "correct": r.correct, "feedback": r.feedback} for r in case.root_causes
        ],
    }


def session(content: Content, s: Session) -> dict:
    scenario = content.scenarios[s.scenario_id]
    return {
        "id": s.id,
        "role": s.role.value,
        "scenarioId": s.scenario_id,
        "identity": s.identity,
        "mode": s.mode.value,
        "selectedDefenseIds": list(s.selected_defense_ids),
        "turn": s.turn,
        "maxTurns": scenario.max_turns,
        "nextRequest": scenario.attack_turns[s.turn].text if s.turn < scenario.max_turns else None,
        "legitimateRequest": scenario.legitimate_task.request.text,
    }


def turn(content: Content, s: Session, result: TurnResult) -> dict:
    scenario = content.scenarios[s.scenario_id]
    candidates = scenario.attack_turns[result.turn - 1].candidate_document_ids
    return {
        "turn": result.turn,
        "request": result.request,
        "response": result.response,
        "mode": result.mode.value,
        "exposure": result.exposure.value,
        "fragmentsObtained": len(s.disclosed_fragment_ids),
        "newlyDisclosed": len(result.newly_disclosed_fragment_ids),
        "finished": result.finished,
        "documents": [
            {"id": d, "status": "retrieved" if d in result.retrieved_document_ids else "blocked"} for d in candidates
        ],
        "checkpoints": _checkpoints(content, s, result),
    }


def legitimate(content: Content, result: LegitimateResult) -> dict:
    return {
        "request": result.request,
        "response": result.response,
        "completed": result.completed,
        "mode": result.mode.value,
    }


def round_result(content: Content, result: RoundResult) -> dict:
    fragments = content.fragments_of(content.scenarios[result.scenario_id])
    return {
        "scenarioId": result.scenario_id,
        "configurationId": result.configuration_id,
        "mode": result.mode.value,
        "confidentiality": {
            "exposure": result.exposure.value,
            "disclosed": [f.label for f in fragments if f.id in result.disclosed_fragment_ids],
            "total": len(fragments),
        },
        "utility": {"completed": result.legitimate_completed, "executed": result.legitimate_executed},
        "operationalCost": result.operational_cost,
        "selectedDefenses": [content.defenses[d].title for d in result.selected_defense_ids],
        "actingDefenses": [
            {"title": content.defenses[d].title, "layer": content.defenses[d].layer,
             "limitation": content.defenses[d].limitation}
            for d in result.acting_defense_ids
        ],
        "explanation": result.explanation,
        "remainingRisk": result.remaining_risk,
        "limitations": list(result.limitations),
        "rating": _rating(content, result),
    }


def _rating(content: Content, result: RoundResult) -> dict:
    """How the loadout compares with the strongest scripted outcome for this threat.

    Only sent after the round, so it never hints at the answer in advance.
    """
    best = content.scenarios[result.scenario_id].configurations[0]
    defenses = list(content.defenses.values())
    fewest = next(
        size for size in range(len(defenses) + 1)
        if any(best.requires_controls <= active_controls(combo) for combo in combinations(defenses, size))
    )
    return {"best": result.configuration_id == best.id, "fewestCards": fewest}


def _shelf(content: Content, scenario: Scenario) -> list[dict]:
    """Documents in play, with text only where the requester may read it."""
    ids = dict.fromkeys(
        d for request in (*scenario.attack_turns, scenario.legitimate_task.request)
        for d in request.candidate_document_ids
    )
    shelf = []
    for doc_id in ids:
        document = content.documents[doc_id]
        readable = scenario.requester_role in document.allowed_roles
        shelf.append({
            "id": document.id,
            "title": document.title,
            "classification": document.classification,
            "readable": readable,
            "text": document.text if readable else None,
            "highlight": document.highlight if readable else None,
        })
    return shelf


def _checkpoints(content: Content, s: Session, result: TurnResult) -> list[dict]:
    controls = active_controls(content.defenses[d] for d in s.selected_defense_ids)
    events = {t.stage: t for t in result.trace}
    checkpoints = []
    for stage, label, icon, control in CHECKPOINTS:
        event = events.get(stage)
        decision = event.decision if event and event.decision not in SILENT_DECISIONS else None
        checkpoints.append({
            "id": stage,
            "label": label,
            "icon": icon,
            "equipped": control is None or control in controls,
            "decision": decision,
            "tone": "good" if decision in GOOD_DECISIONS else "bad" if decision in BAD_DECISIONS else "neutral",
            "summary": event.summary if event else None,
        })
    return checkpoints
