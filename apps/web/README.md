# Web interface

Static HTML, CSS, and JavaScript served by the demo service, with no build step.

**Look.** Two worlds that share one print language (ink outlines, hard offset shadows, square shapes, no soft gradients):
- **Red Cola** is a vintage soda company's case file: a red halftone print sheet behind paper panels, manila folders, ruled notebooks, sticky-note clues and rubber-stamp verdicts.
- **Blue Cola** is a spy's blueprint: a cobalt grid sheet behind paper panels, chalk-white type, and typewriter messages.

Both sides follow the same rule: a strong world colour fills the background and the panels sit on top. Light and dark mode change the depth of that colour and the panels (paper or night print), not the identity of each side. The home page stays neutral paper because it shows both.
The home page is a diagonal poster split between the two, with a square VS stamp.

- **Home:** a split-screen versus page for picking a side, plus a short briefing.
- **Red Cola · Incident response:** five screens, *Case → Investigate → Fix → Replay → Result*.
  - **Case:** pick one of four leaks.
  - **Investigate:** the incident replays on the stage. Suspicious items (messages, documents, checkpoints) are outlined; inspecting them adds notes to the case file, marked as key clues or red herrings. Once every key clue is found, the player names the root cause; wrong answers get a hint.
  - **Fix:** big flip cards for defenses, with the root cause pinned on top.
  - **Replay:** the same attack runs against the fix.
  - **Result:** before/after table (confidentiality, utility, operational cost), a fix rating (★★★ removes the root cause with the fewest cards, ★★ with extra cards, ★ safe but risk remains, none if it still leaks), and a short lesson.
- **Blue Cola · Heist Ops:** four screens, *Mission → Trick → Heist → Debrief*.
  - **Mission:** three targets with hidden defenses (*The open door*, *The watchful reviewer*, *The locked vault*), each with three attempts. Cards show whether a mission was cracked or held.
  - **Trick:** big flip cards, the documents in play (including the note you planted), and a log of earlier attempts with the checkpoint that stopped each one.
  - **Heist:** turn-by-turn moves with bottle-cap loot; after each attempt, try another trick or go to the debrief.
  - **Debrief:** reveals the hidden defense, lists the attempts, and gives the mission's lesson, with links to retry, move to the next mission, or investigate the same case as Red Cola.

Each screen has its own URL hash (for example `#/red/loadout`), so the browser's Back button works. A step bar in the header shows progress, and a dock pinned to the bottom of the screen holds the next action. Screens that need a round that hasn't happened yet redirect to the furthest one available.
- **The stage**, shared by both roles: each turn plays checkpoint by checkpoint (identity, permission gate, instruction wall, assistant, history watch, output check). Documents move from the knowledge base into "what the assistant can see", or get stamped DENIED. A narrator line explains the current checkpoint, and you can tap any checkpoint to read what it did. Multi-turn attacks get move tabs for replaying each turn.
- **Documents** open in a reader. Readable text is shown, embedded instructions are highlighted, and documents the identity can't read stay locked.

The interface consumes the service's JSON only. It does not evaluate permissions and never contains the confidential recipe; a test checks this. Every assistant response is labeled with its mode, outcomes use text and symbols as well as color, and animations are turned off when the system asks for reduced motion.

**Icons and themes.** Icons are a small hand-drawn SVG set in [icons.js](icons.js): one stroke style with a soft tinted fill, no emoji and no icon library. Big card icons sit on square ink-outlined stickers. A header button switches between paper (light) and night-print (dark) themes; without a saved choice the page follows the system setting, and [theme.js](theme.js) applies the saved choice before the page paints.

**Fonts,** bundled in `fonts/` under the SIL Open Font License so the demo works offline: [Lobster](https://github.com/impallari/The-Lobster-Font) for the Red Cola script, [Anton](https://github.com/googlefonts/AntonFont) for poster headings, and [Space Mono](https://github.com/googlefonts/spacemono) for labels and the spy's typewriter. Licenses: `fonts/OFL-*.txt`.
