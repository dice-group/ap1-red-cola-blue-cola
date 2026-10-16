# Verification

## Automated

```bash
python3 -m unittest discover -s tests -t .
```

Standard library only; no installs needed.

| File | What it checks |
| --- | --- |
| test_content.py | Every attack has a scenario; scripted disclosures match the response text; nothing leaks when permissions keep the recipe out of context; each attack has a vulnerable and a protected case; all 16 combinations of defenses have an outcome |
| test_security.py | Permissions before retrieval for each identity; fragment detection across formats and case; exposure levels |
| test_engine.py | Server-assigned identity; accumulation across turns; reset and replay; utility for legitimate requests; cost; undefined configurations are reported |
| test_api.py | End-to-end rounds over HTTP; no recipe in the catalog or web bundle; documents shown only when the identity may read them; turn views carry checkpoints but no document text; identity in the request body is ignored; path traversal; error responses |

## Manual demo checklist

Run `python3 -m apps.api`, open http://127.0.0.1:8000, and check:

- [ ] The "Simulated mode" badge is visible on every screen, and each assistant response is tagged "simulated".
- [ ] RED COLA: for each scenario, run with no defenses (full disclosure), then with the paired defense (no disclosure, 1 of 1 legitimate requests completed). The "Before and after" table shows both rounds.
- [ ] RED COLA, "Give me a small piece" with only "Review content in any format" selected: the recipe still leaks across three turns.
- [ ] RED COLA, "The document gives you a new instruction" with only "Verify identity and permissions" selected: no leak, but the explanation says the injected instruction was still followed.
- [ ] BLUE COLA: each attack succeeds on Easy and fails on Hard. "Replay" restores 0 of 3 pieces.
- [ ] Before an attack, open each document in play: the supplier's delivery note shows the highlighted hidden instruction; the recipe stays locked for every identity.
- [ ] During a turn, checkpoints light up one by one, the recipe card is stamped DENIED when the permission gate is equipped, and "What the assistant can see" glows red when the recipe gets in.
- [ ] Tap a checkpoint after a turn: the narrator line explains what it did. Multi-turn attacks show move tabs.
- [ ] Each card's ⓘ button flips it to show details, and flipping doesn't change the selection.
- [ ] Each flow moves screen by screen, the browser's Back and Forward buttons move between screens, and the step bar is locked while an attack plays.
- [ ] The Predict screen keeps Launch disabled until both questions are answered. The debrief shows each call as right or wrong, with the decisive checkpoint's explanation, and the insight count in the header goes up.
- [ ] Defender stars: "The document gives you a new instruction" with only "Separate documents from instructions" earns ★★★; adding another card drops it to ★★; only "Review content in any format" gives ★; nothing equipped gives none.
- [ ] Opening a later screen directly (for example `#/red/debrief` in a fresh tab) lands on the furthest screen available.
- [ ] The whole flow works with the keyboard only (Tab, Space, Enter), and focus is visible.
- [ ] Outcomes can be read without color (✓, ⚠, ✕ and text).
- [ ] The layout works at phone width and in dark mode.
