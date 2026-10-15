# Web interface

Static HTML, CSS, and JavaScript served by the demo service, with no build step. The look follows the README banner: a red half with script lettering, a blue half with heavy slanted capitals, and a navy "VS" badge.

- **Home:** a split-screen versus page for picking a side, plus a short briefing.
- **Red Cola · Defender HQ:** four screens, *Threat → Loadout → Match → Debrief*. Big flip cards for threats and defenses, the documents in play, the automated attack on its own screen, then outcome stamps, stats, a one-line utility check, a short lesson, and a before/after scoreboard.
- **Blue Cola · Heist Ops:** four screens, *Trick → Difficulty → Heist → Debrief*. Big flip cards for tricks, the documents in play (including the note you planted), turn-by-turn moves with bottle-cap loot, then the debrief.

Each screen has its own URL hash (for example `#/red/loadout`), so the browser's Back button works. A step bar in the header shows progress, and a dock pinned to the bottom of the screen holds the next action. Screens that need a round that hasn't happened yet redirect to the furthest one available.
- **The stage**, shared by both roles: each turn plays checkpoint by checkpoint (identity, permission gate, instruction wall, assistant, history watch, output check). Documents move from the knowledge base into "what the assistant can see", or get stamped DENIED. A narrator line explains the current checkpoint, and you can tap any checkpoint to read what it did. Multi-turn attacks get move tabs for replaying each turn.
- **Documents** open in a reader. Readable text is shown, embedded instructions are highlighted, and documents the identity can't read stay locked.

The interface consumes the service's JSON only. It does not evaluate permissions and never contains the confidential recipe; a test checks this. Every assistant response is labeled with its mode, outcomes use text and symbols as well as color, and animations are turned off when the system asks for reduced motion.

The script font is [Lobster](https://github.com/impallari/The-Lobster-Font), bundled in `fonts/` under the SIL Open Font License (see `fonts/OFL.txt`) so the demo works offline.
