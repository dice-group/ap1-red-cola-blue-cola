"""Shape engine objects into JSON for each audience.

The browser only ever receives what these functions return. Nothing here
includes document text, scripted outcomes, or the recipe before a round ends.
"""

from __future__ import annotations

from packages.domain import GameRole, LegitimateResult, RoundResult, Session, TurnResult
from packages.engine import Content


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
            }
            for s in sorted(content.scenarios.values(), key=lambda s: list(content.attacks).index(s.attack_id))
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
    view = {
        "turn": result.turn,
        "request": result.request,
        "response": result.response,
        "mode": result.mode.value,
        "exposure": result.exposure.value,
        "fragmentsObtained": len(s.disclosed_fragment_ids),
        "finished": result.finished,
    }
    if s.role is GameRole.RED:
        # The defender sees which controls acted and what was retrieved.
        view["retrievedDocuments"] = _titles(content, result.retrieved_document_ids)
        view["trace"] = [_trace(t) for t in result.trace]
        view["operationalEvents"] = [{"type": e.type, "summary": e.summary} for e in result.operational_events]
    else:
        # The attacker sees only which stages decided something, not what they saw.
        view["trace"] = [{"stage": t.stage, "decision": t.decision} for t in result.trace]
    return view


def legitimate(content: Content, result: LegitimateResult) -> dict:
    return {
        "request": result.request,
        "response": result.response,
        "completed": result.completed,
        "mode": result.mode.value,
        "retrievedDocuments": _titles(content, result.retrieved_document_ids),
        "trace": [_trace(t) for t in result.trace],
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
    }


def _titles(content: Content, ids) -> list[str]:
    return [content.documents[d].title for d in ids]


def _trace(t) -> dict:
    return {"stage": t.stage, "summary": t.summary, "decision": t.decision}
