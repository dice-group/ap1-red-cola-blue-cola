# Web interface

Static HTML, CSS, and JavaScript served by the demo service, with no build step. The look follows the README banner: a red half with script lettering, a blue half with heavy slanted capitals, and a navy "VS" badge.

- **Home:** a split-screen versus page for picking a side, plus a short briefing.
- **Red Cola · Defender HQ:** flip cards for threats and defenses, the documents in play, the automated attack, a one-line utility check, outcome stamps, stats, a short lesson, and a before/after scoreboard.
- **Blue Cola · Heist Ops:** flip cards for tricks, the documents in play (including the note you planted), a difficulty choice, turn-by-turn moves, and bottle-cap loot for recipe pieces.
- **The stage**, shared by both roles: each turn plays checkpoint by checkpoint (identity, permission gate, instruction wall, assistant, history watch, output check). Documents move from the knowledge base into "what the assistant can see", or get stamped DENIED. A narrator line explains the current checkpoint, and you can tap any checkpoint to read what it did. Multi-turn attacks get move tabs for replaying each turn.
- **Documents** open in a reader. Readable text is shown, embedded instructions are highlighted, and documents the identity can't read stay locked.

The interface consumes the service's JSON only. It does not evaluate permissions and never contains the confidential recipe; a test checks this. Every assistant response is labeled with its mode, outcomes use text and symbols as well as color, and animations are turned off when the system asks for reduced motion.

The script font is [Lobster](https://github.com/impallari/The-Lobster-Font), bundled in `fonts/` under the SIL Open Font License (see `fonts/OFL.txt`) so the demo works offline.
