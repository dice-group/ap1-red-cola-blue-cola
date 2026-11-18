<img width="2172" height="724" alt="image" src="https://github.com/user-attachments/assets/e09eba58-a28a-4bc2-ad93-a00b4dc45400" />


# RED COLA – BLUE COLA

An interactive educational demo about how AI assistants can leak confidential information—and how safeguards can help prevent it. Play as RED COLA to investigate and defend, or as BLUE COLA to test the assistant's defenses.

## Project status

The simulated MVP is runnable: both roles, all four scenarios, before/after comparison, and the three outcome indicators. Responses are scripted and always labeled "simulated". Retrieval permissions and disclosure detection run for real in the security layer. No real model is connected yet.

## Run the demo on your computer

Coming here from the poster QR? Download the project on a **Windows, macOS, or Linux computer**, start it with Python, and play in your browser. Scanning the QR opens this repository; it does not start an online game.

**Python 3.10+ · No additional Python packages · No AI model download · No API key**

### 1. Check Python

Open **PowerShell** on Windows or **Terminal** on macOS/Linux.

**Windows:**

```powershell
py --version
```

**macOS / Linux:**

```bash
python3 --version
```

The version must be **3.10 or newer**. If Python is missing or older, install a supported version from [python.org](https://www.python.org/downloads/) or your Linux distribution's package manager, then close and reopen your terminal. On Windows, enable **Add Python to PATH** if the installer offers it.

If Windows does not recognize `py`, try `python --version`. If that reports Python 3.10+, use `python` instead of `py` in the commands below.

### 2. Download the project

Choose **one** option.

**Option A — Download ZIP (no Git needed)**

1. Click **Code → Download ZIP** at the top of this repository, or [download the ZIP directly](https://github.com/dice-group/ap1-red-cola-blue-cola/archive/refs/heads/main.zip).
2. Extract the ZIP completely. On Windows, use **Extract All**; do not run the demo from inside the ZIP.
3. Open the extracted project folder. It is normally named `ap1-red-cola-blue-cola-main`.
4. Open a terminal in that folder. On Windows, right-click inside the folder and choose **Open in Terminal**, if available. Alternatively, open PowerShell or Terminal, type `cd ` followed by the full folder path in quotes, and press Enter.

For example, if you extracted it into Downloads:

**Windows:**

```powershell
cd "$HOME\Downloads\ap1-red-cola-blue-cola-main"
```

**macOS / Linux:**

```bash
cd "$HOME/Downloads/ap1-red-cola-blue-cola-main"
```

Adjust the path if you extracted it elsewhere. You should be in the folder containing `README.md`, `apps`, `packages`, and `content`.

**Option B — Clone with Git**

If Git is installed:

```bash
git clone https://github.com/dice-group/ap1-red-cola-blue-cola.git
cd ap1-red-cola-blue-cola
```

### 3. Start the demo

Run the command from the project folder.

**Windows:**

```powershell
py -m apps.api
```

**macOS / Linux:**

```bash
python3 -m apps.api
```

No `pip install`, virtual environment, Node.js, Docker, or Ollama setup is required.

### 4. Open your browser

Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** on the **same computer** where you started Python.

Choose **RED COLA** to investigate and defend, or **BLUE COLA** to try the attack missions. You can start with either role.

Keep the terminal open while playing. Press **Ctrl+C** in that terminal to stop the server. Start it again with the same command whenever you want to play.

The game uses local files, including its fonts, and runs without an internet connection once Python and the project are downloaded. Responses are scripted: this demo illustrates security mechanisms rather than evaluating a live LLM.

### Troubleshooting

| Problem | What to do |
| --- | --- |
| `py`, `python`, or `python3` is not found | Install Python 3.10+, reopen the terminal, and check its version. On Windows, try `python` if `py` is unavailable. |
| `No module named apps` | Move into the extracted or cloned project folder containing `apps`, `packages`, and `content`, then run the command again. |
| Python errors immediately on startup | Check the version of the exact Python command you are using. The demo requires Python 3.10+. |
| Port 8000 is already in use (`Address already in use` / `WinError 10048`) | Run `py -m apps.api --port 8001` on Windows or `python3 -m apps.api --port 8001` on macOS/Linux. Then open [http://127.0.0.1:8001](http://127.0.0.1:8001). |
| The browser cannot connect | Keep the server terminal open, check it for errors, and use the address and port printed there. Open the browser on the same computer. |
| Opening `index.html` does not work | Start the Python server and use its local address. The interface needs the API; double-clicking the HTML file is not enough. |
| Progress disappears after reloading or restarting | Game progress is temporary. Start a new case or mission; this version does not save progress across reloads or server restarts. |

If you are still stuck, [open an issue](https://github.com/dice-group/ap1-red-cola-blue-cola/issues) with your operating system, Python version, command used, and error message.

## Developer checks

The automated checks use Python's standard library.

**Windows:**

```powershell
py -m unittest discover -s tests -t .
```

**macOS / Linux:**

```bash
python3 -m unittest discover -s tests -t .
```

These checks are optional for visitors. See [tests/README.md](tests/README.md) for the manual demo checklist.

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

1. Pick a mission. Each one is RED COLA's assistant with defenses the player cannot see: *The open door* (none), *The watchful reviewer* (output review), *The locked vault* (permissions).
2. Choose an attack card; the MVP does not require free-form input.
3. RED COLA's assistant responds using the mission's hidden defense configuration.
4. Observe the response, progress toward the recipe, and the checkpoint where the attempt was stopped.
5. Adapt: up to three attempts per mission, choosing another attack card each time.
6. The debrief reveals the hidden defense and explains why the attempts succeeded or failed and which mitigation made the difference.

The demo engine evaluates outcomes. The BLUE COLA client does not receive confidential documents, hidden expected responses, or the mission's defenses before the attempt.

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
| content/missions/catalog.json | Three attacker missions with hidden defenses |
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

## License

This project is licensed under the [MIT License](LICENSE-MIT).

Copyright (c) 2026 Data Science Group at Paderborn University, Paderborn, Germany.

Bundled fonts retain their own licenses; see the OFL license files in [apps/web/fonts/](apps/web/fonts/).

