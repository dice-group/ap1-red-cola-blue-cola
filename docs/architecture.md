# Initial architecture

Status: proposed responsibilities, with no stack selected and no runnable implementation.

## Boundaries

The browser selects actions and displays explanations. The service controls the session's fictional identity and runs the engine. The domain defines contracts without depending on a framework. The engine coordinates scenarios and outcomes. The AI adapter separates simulation from a real provider. Security decides document access before the model's context is built.

## Planned contracts

- Session: id, role, scenarioId, mode, turn, selectedDefenses.
- Action: id, title, explanation, risk, limitations.
- KnowledgeDocument: id, title, classification, allowedRoles, text.
- Scenario: id, requesterRole, attackId, legitimateTask, defenseConfigurations, expectedOutcomes, exposureRules, maxTurns.
- Result: exposure, legitimateTaskCompleted, operationalEvents, explanation.
- TraceEvent: stage, summary, decision; the content shown depends on the audience.

The gameplay role (RED COLA / BLUE COLA) is distinct from the access identity (visitor / supplier / employee / recipe-owner). The service assigns the scenario's identity and does not accept permissions claimed in a message.

## Simulated mode

Outcomes are defined per scenario and defense configuration. Resetting clears history and accumulated exposure. The interface labels every response as simulated. An undefined configuration produces an explicit message; no evaluation is invented.

## Future real mode

Use the same contract through an adapter. Configuration and credentials stay on the server. Access tests do not depend on the model obeying an instruction. Record provider, model, and parameters without credentials.

## Traces

The final explanation may reveal the fictional recipe after the game ends. During the attempt, BLUE COLA does not receive the confidential knowledge base, the expected response, or traces that reveal secrets. RED COLA sees enough control decisions to understand the outcome.

## Pending decisions

Interface framework, service runtime, executable contracts, session storage, optional provider, and license. Record decisions in docs/decisions/.
