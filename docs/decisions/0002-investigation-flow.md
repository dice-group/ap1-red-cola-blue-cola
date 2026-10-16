# 0002: Defender flow starts from the incident

Status: proposed (on the `challenge` branch, for review by the maintainers)

## Context

The original RED COLA flow is: review the scenario → select defenses → watch the automated attack → evaluate → replay with other defenses. Play-testing showed it asks little of the player: they pick cards and watch. A prediction quiz was tried and felt like ticking boxes.

## Options

1. Keep the original flow.
2. Add a prediction step before each match (tried, rejected: guessing from a menu).
3. Start from the incident: the leak has happened, the player investigates the evidence, names the root cause, chooses the fix, and replays the attack to verify it.

## Decision

Option 3 for the defender. The attacker flow stays as described in the README (choose an attack card, no free-form input).

## Rationale

- It uses the same ingredients as the README: the four attacks and defenses, the automated opponent, the three indicators, and before/after comparison. Only the order changes, plus an investigation step.
- It matches the README's own before/after example (the supplier document with an embedded instruction), and the way security teams actually work: observe, form a theory, fix, verify.
- The lesson (access control before the model) is discovered from evidence rather than read from a card.
- No new currency: operational cost stays the README's indicator. The fix rating only compares the outcome with the strongest scripted one, and the number of cards with the fewest needed.

## Consequences

- Each scenario gains an `investigation` block: incident title and summary, clues (key and red herrings, each pointing at a document, checkpoint, request or reply), and root causes (exactly one correct). The loader validates it.
- The defender sees the incident conversation, including the leaked fictional recipe, because it is the evidence. The attacker's restrictions are unchanged.
- New endpoint: `GET /api/scenarios/{id}/investigation`.
- README, docs/demo-flow.md, and the acceptance criteria are updated to match.
