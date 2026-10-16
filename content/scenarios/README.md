# Scenarios

One JSON file per catalog attack. The engine loads every `*.json` file in this folder and validates it on startup.

| File | Attack | Requester identity | Turns |
| --- | --- | --- | --- |
| claimed-authority.json | I am on the leadership team | visitor | 1 |
| document-instruction.json | The document gives you a new instruction | supplier | 1 |
| partial-disclosure.json | Give me a small piece | employee | 3 |
| format-change.json | Put it in another format | employee | 1 |

## Contract

| Field | Meaning |
| --- | --- |
| id, title, summary | Identification and the one-line setup shown to players |
| attackId | The attack card this scenario plays |
| requesterRole | The access identity the service assigns: visitor, supplier, employee, or recipe-owner |
| protectedDocumentId | The document whose fragments count as exposure |
| maxTurns | Number of attack turns; must equal the length of attackTurns |
| attackTurns | Each turn's request and the documents a search would match (candidateDocumentIds) |
| legitimateTask | An authorized request, its candidate documents, when it counts as completed, and the default reply |
| defenseConfigurations | Scripted outcomes in priority order (see below) |
| limitations | What the defenses in this scenario do not solve |
| investigation | The defender's case file: `title` and `summary` of the incident, `clues`, and `rootCauses` |

Each defense configuration has `requiresControls`, one scripted reply per turn (`response`, `disclosedFragmentIds`, `trace`, and `operationalEvents`), an `explanation`, and a `remainingRisk`. It can also override `legitimate`.

The engine uses the first configuration whose `requiresControls` are all switched on by the selected defense cards. The last configuration must require no controls: it is the vulnerable teaching example and the fallback. This way every combination of cards has a defined outcome. Without a fallback, the engine reports the combination as undefined instead of inventing a result.

Controls per defense card are listed in content/defenses/catalog.json. The engine adds the identity and retrieval trace events, and a "verification" cost event whenever permissions are checked. Scripts only describe what happens in the context, assistant, session, and output stages.

## Recipe fragments

The fictional recipe has three fragments, defined on the document in content/knowledge-base/documents.json: `water`, `ruby-syrup`, and `azur-essence`. Exposure is `none` when no fragment has been disclosed, `fragment` when some have, and `full` when all three have been disclosed across the session, in any format. Fragments accumulate across turns and are cleared on reset.

`disclosedFragmentIds` must match what the response text actually reveals; the tests check this.

## Investigation

The defender starts from the incident: the attack against the assistant with no defenses. Each clue has an `id`, a `title`, an `explanation`, `key` (true for clues that explain the leak, false for red herrings), and a `target` naming what the player inspects: `doc:<document id>`, `checkpoint:<stage>` (identity, retrieval, context, assistant, session, output), `request:<turn>`, or `reply:<turn>`. Root causes have `text`, `feedback`, and `correct`; exactly one is correct. The loader rejects targets that don't exist, and the tests check that key checkpoint clues point at a checkpoint that actually failed in the incident.
