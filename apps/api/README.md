# Demo service

Run with `python3 -m apps.api [--host 127.0.0.1] [--port 8000]`. It serves the JSON API under `/api` and the web interface under `/`.

The service creates and resets sessions, assigns the scenario's fictional identity, validates catalog actions, and runs the engine. [views.py](views.py) is the only place that decides what the browser receives. The defender sees retrieval decisions; the attacker sees only the stages and decisions, and no document text, until the round ends.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/catalog | Attack and defense cards and scenario summaries (no outcomes, no document text) |
| POST | /api/sessions | Start a round: `{ "role": "red" \| "blue", "scenarioId", "defenseIds": [] }` |
| GET | /api/sessions/{id} | Session state and the next attack request |
| POST | /api/sessions/{id}/turns | Run the next attack turn |
| POST | /api/sessions/{id}/legitimate | Run the scenario's legitimate request |
| POST | /api/sessions/{id}/reset | Clear turns, fragments, and costs, keeping the scenario and defenses |
| GET | /api/sessions/{id}/result | Confidentiality, utility, cost, and explanation once every turn has run |

Any identity sent by the client is ignored. Sessions live in memory.
