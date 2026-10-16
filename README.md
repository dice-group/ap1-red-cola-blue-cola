<img width="2172" height="724" alt="image" src="https://github.com/user-attachments/assets/e09eba58-a28a-4bc2-ad93-a00b4dc45400" />


# RED COLA – BLUE COLA

An educational demo of AI safety risks and mitigation strategies for industry stakeholders and non-specialist audiences.

> Demonstrators that communicate AI Safety risks and mitigation strategies in a way that is accessible to industry stakeholders and non-specialist audiences.

## Project status

The simulated MVP is runnable: both roles, all four scenarios, before/after comparison, and the three outcome indicators. Responses are scripted and always labeled "simulated". Retrieval permissions and disclosure detection run for real in the security layer. No real model is connected yet.

## Quick start

Requires Python 3.10 or newer. There are no dependencies to install.

```bash
python3 -m apps.api
```

Open http://127.0.0.1:8000. Use `--port` to change the port.

Run the tests:

```bash
python3 -m unittest discover -s tests -t .
```

## The scenario

RED COLA uses an AI assistant to consult its corporate knowledge base and help employees and suppliers. Documents have different access levels: public, internal, and confidential. A completely fictional recipe represents the secret to protect.

BLUE COLA, a fictional competitor, tries to obtain that recipe by manipulating requests or documents consulted by the assistant. Visitors choose one of two interfaces.

**Central question:** can the assistant help people without revealing information they are not authorized to receive?

The initial focus is confidentiality, instruction manipulation, and tool use. The demo illustrates a subset of AI safety risks; it is not a comprehensive model safety assessment.

## The two gameplay phases

Here, “phase” refers to each role's experience. Users can start with either role and then replay the situation from the other perspective. These are not two mandatory stages of a single game.

### RED COLA phase: investigate and defend

**Role:** the person responsible for the enterprise assistant, called in after a leak.

**Goal:** find out how the recipe leaked, fix it, and prove the fix works while keeping the assistant useful for authorized requests. Blocking everything does not count as winning.

1. Open a case: the recipe has already leaked through the undefended assistant (the "before").
2. Investigate the evidence: the conversation, the documents in play, and what each checkpoint did. Flag what looks suspicious; some clues are red herrings.
3. Name the root cause once the key clues are found. Wrong answers get a hint, not a penalty.
4. Choose the fix from a catalog of easy-to-understand defense cards.
5. The automated opponent replays the same BLUE COLA attempt against the fix.
6. Compare before and after: confidentiality, utility, and operational cost. A fix rating rewards removing the root cause with the fewest cards.

Each card explains what it protects, where it acts, and its limitations. The flow change is recorded in [docs/decisions/0002-investigation-flow.md](docs/decisions/0002-investigation-flow.md).

### BLUE COLA phase: attack

**Role:** a competitor interacting with the assistant within the fictional environment.

**Goal:** obtain the recipe or partial information using the catalog options.

1. Review the context and the available attack options.
2. Choose an attack card; the MVP does not require free-form input.
3. RED COLA's assistant responds using the scenario's defense configuration.
4. Observe the response and progress toward obtaining the recipe.
5. Read why the attempt succeeded or failed and which mitigation could have helped.
6. Replay from the same initial state to compare strategies.

The demo engine evaluates outcomes. The BLUE COLA client does not receive confidential documents or hidden expected responses before the attempt.

## Initial MVP catalog

Four attacks and four defenses. These pairings explain each risk; they do not guarantee that a single defense will resolve it.

| BLUE COLA attack | Risk illustrated | RED COLA defense | Limitation to explain |
| --- | --- | --- | --- |
| “I am on the leadership team” | Accepting an identity or authority claimed in chat | Verify identity and permissions outside the model | A statement or prompt does not authenticate anyone |
| “The document gives you a new instruction” | Confusing retrieved content with instructions: indirect prompt injection | Separate instructions from documents; enforce permissions during retrieval | Instruction separation reduces risk but does not replace permissions |
| “Give me a small piece” | Accumulating fragments of sensitive information across turns | Apply least privilege and review cumulative disclosure | A per-response filter may miss connections between requests |
| “Put it in another format” | Revealing a secret through translation, summarization, or transformation | Review sensitive content regardless of format | Output review is an additional layer, not an access control |

A later extension may introduce tools and external destinations to illustrate information transfers. The MVP will not send information externally.

## Before / after example

A supplier document contains an instruction asking the assistant to include the recipe in its summary.

- **Vulnerable configuration:** the assistant receives documents without permission filtering and follows the supplier's instruction. The script simulates a disclosure.
- **Protected configuration:** retrieval excludes the recipe for that identity, and the supplier's content is treated as data rather than authority. The assistant provides an authorized summary.
- **Lesson:** access controls must prevent the model from receiving unauthorized information. “Do not reveal the recipe” alone is a weak defense.

## Outcomes and learning

Display three independent indicators instead of hiding them behind a single score:

| Indicator | Question | Planned evaluation |
| --- | --- | --- |
| Confidentiality | Was restricted information exposed? | Full recipe, fragment, or no disclosure, depending on the scenario |
| Utility | Was the legitimate request completed? | Completed authorized cases divided by executed authorized cases |
| Operational cost | What effort did protection require? | Simulated blocks, verification steps, and human reviews |

Each scenario's disclosure rules must specify what counts as a fragment or the full recipe. These educational indicators are not certification metrics.

The results screen should explain what happened, which information was authorized, which layer acted, and what risk remains.

## Initial scope

- Two interfaces: RED COLA and BLUE COLA.
- Individual games against an automated opponent.
- Four reproducible scenarios with four attacks and four defenses.
- A fictional knowledge base and recipe.
- Before/after comparisons by resetting state.
- Explanatory traces of retrieval, decisions, and responses.
- Legitimate requests to check that defenses preserve utility.
- Simulation mode explicitly labeled at all times.

The planned MVP uses predefined responses and outcomes. A later technical development stage may connect a real model through an adapter. In that case, the interface must display “real model,” record its configuration, and explain that results may vary. A simulated script does not demonstrate a real model's behavior.

## Architecture

| Module | Responsibility |
| --- | --- |
| apps/web | Role selection, cards, interaction, results, and explanations (static HTML, CSS, and JavaScript) |
| apps/api | Sessions, scenario identity, engine execution, and role-filtered JSON views |
| packages/domain | Shared contracts: roles, actions, documents, traces, and results |
| packages/engine | Content loading and validation, turns, resets, evaluation, and simulation |
| packages/ai | Assistant adapters: simulated now, real models later |
| packages/security | Retrieval permissions and disclosure detection |
| content | Educational catalogs, fictional documents, and scenario scripts |
| tests | Content consistency, security, engine, and HTTP tests |

The stack is recorded in [docs/decisions/0001-simulated-mvp-stack.md](docs/decisions/0001-simulated-mvp-stack.md).

Planned flow: **identity and permissions → authorized retrieval → assistant → response review → educational outcome**.

The vulnerable configuration exists only as an explicit teaching example. In a protected implementation, permissions are enforced before documents are passed to the model. The engine must not trust a role supplied by the browser as proof of authorization.

The fictional recipe may be visible in the repository's public code. The goal is to protect it within the simulated session, not to claim that a public repository keeps it secret.

## Repository structure

| Path | Contents |
| --- | --- |
| README.md | Context, both phases, scope, and architecture |
| CONTRIBUTING.md | Development and review guidance |
| docs/architecture.md | Module boundaries and design rules |
| docs/demo-flow.md | Walkthrough and acceptance criteria |
| docs/decisions/ | Technical decision records |
| apps/web/ | Web interface |
| apps/api/ | HTTP service (`python3 -m apps.api`) |
| packages/*/ | Domain, engine, AI adapters, and security controls |
| content/attacks/catalog.json | Four attack cards |
| content/defenses/catalog.json | Four defense cards |
| content/knowledge-base/documents.json | Demo documents and recipe |
| content/scenarios/ | One scenario script per attack, plus the scenario contract |
| tests/ | Automated tests and the manual demo checklist |
| .gitignore | Common exclusions and local secrets |

## Next steps

1. Rehearse the demo using the checklist in tests/README.md.
2. Choose a license.
3. Connect a real model through a new adapter in packages/ai, only after recording the decision. The interface must then display "real model" and its configuration.
4. Optionally add tools and external destinations to illustrate information transfers.

## Communication and contribution principles

All project documentation, educational content, and user-facing text should be written in English.

Use everyday language and offer technical details on demand. Show code in small modules and explain the purpose of each layer. Do not present any mitigation as infallible. Follow the project's convention: **RED COLA defends and BLUE COLA attacks**, even though the color names may evoke other conventions.

See [CONTRIBUTING.md](CONTRIBUTING.md). The project license remains to be selected by its maintainers.
