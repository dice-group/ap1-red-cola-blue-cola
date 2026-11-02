# Demo service

Run with `python3 -m apps.api [--host 127.0.0.1] [--port 8000]`. It serves the JSON API under `/api` and the web interface under `/`.

The service creates and resets sessions, assigns the scenario's fictional identity, validates catalog actions, and runs the engine. [views.py](views.py) is the only place that decides what the browser receives:

- The catalog lists each scenario's documents. Text is included only for documents the requester's identity may read, so the supplier sees their own delivery note, including its planted instruction, but nobody but the recipe owner gets the recipe text.
- Each turn reports which documents passed or were blocked by the permission gate, and a checkpoint-by-checkpoint pipeline (identity, permission gate, instruction wall, assistant, history watch, output check), with whether each one was equipped and what it decided. Turn views never contain document text; the recipe only appears if the scripted response itself leaks it.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/catalog | Attack and defense cards, scenario summaries, and the documents in play (text only where the requester may read it) |
| GET | /api/scenarios/{id}/investigation | The defender's case file: incident summary, clues (key and red herrings), and root causes |
| POST | /api/sessions | Start a round: `{ "role": "red" \| "blue", "scenarioId", "defenseIds": [] }`, or `"missionId"` instead of `defenseIds` for a mission with hidden defenses |
| GET | /api/sessions/{id} | Session state and the next attack request |
| POST | /api/sessions/{id}/turns | Run the next attack turn: response, document statuses, and checkpoints |
| POST | /api/sessions/{id}/legitimate | Run the scenario's legitimate request |
| POST | /api/sessions/{id}/reset | Clear turns, fragments, and costs, keeping the scenario and defenses |
| GET | /api/sessions/{id}/mission | For a mission session, once the attempt is over: the hidden defenses and the mission's lesson |
| GET | /api/sessions/{id}/result | Confidentiality, utility, cost, explanation, and a rating (strongest outcome reached? fewest cards that reach it) once every turn has run |

Any identity sent by the client is ignored. Sessions live in memory.
