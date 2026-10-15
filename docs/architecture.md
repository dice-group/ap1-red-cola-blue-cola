# Initial architecture

Status: implemented for simulated mode. Stack: [decision 0001](decisions/0001-simulated-mvp-stack.md).

## Boundaries

The browser selects actions and displays explanations. The service controls the session's fictional identity and runs the engine. The domain defines contracts without depending on a framework. The engine coordinates scenarios and outcomes. The AI adapter separates simulation from a real provider. Security decides document access before the model's context is built.

## Contracts

Defined in packages/domain/models.py.

- Session: id, role, scenarioId, identity, mode, turn, selectedDefenseIds, configurationId, accumulated fragments and events.
- AttackCard / DefenseCard: id, title, explanation, risk or layer, limitation; defenses also list the controls they switch on.
- KnowledgeDocument: id, title, classification, allowedRoles, text, and protected fragments.
- Scenario: id, requesterRole, attackId, attackTurns, legitimateTask, defenseConfigurations (scripted outcomes in priority order), protectedDocumentId, limitations, maxTurns.
- TurnResult / LegitimateResult / RoundResult: exposure, legitimate tasks completed and executed, operational cost, acting defenses, explanation, remaining risk.
- TraceEvent: stage, summary, decision; the content shown depends on the audience.

## Request flow

Identity assigned by the service → controls derived from the selected cards → configuration selected → retrieval with or without permissions → assistant adapter → fragments accumulated → role-filtered view.

The gameplay role (RED COLA / BLUE COLA) is distinct from the access identity (visitor / supplier / employee / recipe-owner). The service assigns the scenario's identity and does not accept permissions claimed in a message.

## Simulated mode

Outcomes are defined per scenario and defense configuration. Resetting clears history and accumulated exposure. The interface labels every response as simulated. An undefined configuration produces an explicit message; no evaluation is invented.

## Future real mode

Use the same contract through an adapter. Configuration and credentials stay on the server. Access tests do not depend on the model obeying an instruction. Record provider, model, and parameters without credentials.

## Traces

The final explanation may reveal the fictional recipe after the game ends. Neither role receives the expected response in advance, or the text of any document its scenario identity cannot read. Both roles see each turn as a pipeline of checkpoints (which documents the permission gate let through, and what each layer decided), because seeing where the secret is stopped is the lesson. Decisions and document titles reveal no secret content.

## Pending decisions

Real-model provider, persistent session storage (if the demo is hosted), and license. Record decisions in docs/decisions/.
