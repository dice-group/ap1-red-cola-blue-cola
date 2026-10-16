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
- [ ] BLUE COLA missions: every trick cracks *The open door*; against *The watchful reviewer* the first three tricks are stopped at the output check and "Give me a small piece" gets the full recipe; *The locked vault* stops every trick at the permission gate. The defense is only named in the debrief.
- [ ] Before an attack, open each document in play: the supplier's delivery note shows the highlighted hidden instruction; the recipe stays locked for every identity.
- [ ] During a turn, checkpoints light up one by one, the recipe card is stamped DENIED when the permission gate is equipped, and "What the assistant can see" glows red when the recipe gets in.
- [ ] Tap a checkpoint after a turn: the narrator line explains what it did. Multi-turn attacks show move tabs.
- [ ] Each card's ⓘ button flips it to show details, and flipping doesn't change the selection.
- [ ] Each flow moves screen by screen, the browser's Back and Forward buttons move between screens, and the step bar is locked while an attack plays.
- [ ] Red Cola, case "The bottle-cap delivery note": inspecting the supplier's request is a red herring; the delivery note, the instruction wall, and the permission gate are key clues. "Next: choose the fix" stays locked until the right root cause is chosen; wrong ones show a hint.
- [ ] Fix rating on that case: only "Separate documents from instructions" earns ★★★; adding another card drops it to ★★; only "Review content in any format" gives ★; nothing equipped still leaks (no stars), and the result offers "Adjust the fix".
- [ ] The result screen's before/after table shows the incident against the fix, and a scoreboard appears after two or more attempts.
- [ ] Opening a later screen directly (for example `#/red/debrief` in a fresh tab) lands on the furthest screen available.
- [ ] The whole flow works with the keyboard only (Tab, Space, Enter), and focus is visible.
- [ ] Outcomes can be read without color (✓, ⚠, ✕ and text).
- [ ] The layout works at phone width and in dark mode.
