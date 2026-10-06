# Contributing

Before starting development, read README.md, docs/demo-flow.md, and docs/architecture.md.

## Changes

- Work on a branch and submit a pull request describing the problem, expected behavior, and validation.
- Document stack decisions in docs/decisions/ before adding dependencies.
- Keep educational content separate from application logic and AI providers.
- Clearly distinguish simulated outcomes from real model outcomes.
- Use fictional data only. Do not include credentials or documents from real companies.
- Explain each card in accessible language and describe its limitations.
- Keep RED COLA as the defender and BLUE COLA as the attacker.
- Write documentation, educational content, and user-facing text in English.

## Validation

For content: check consistency between cards, scenarios, and documentation; validate JSON.

For the engine or security controls: verify permissions before retrieval, partial disclosure, legitimate requests, and session resets.

For the interface: check both roles, keyboard navigation, labels, and that outcomes do not rely exclusively on color.

The project does not yet define a test runner. Each pull request must state what was verified and what remains pending.
