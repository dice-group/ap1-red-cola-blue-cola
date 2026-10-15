# Web interface

Static HTML, CSS, and JavaScript served by the demo service, with no build step. The look follows the README banner: a red half with script lettering, a blue half with heavy slanted capitals, and a navy "VS" badge.

- **Home:** a split-screen versus page for picking a side, plus a short briefing.
- **Red Cola · Defender HQ:** threat cards, a defense loadout, the automated attack with a typing assistant, a utility check, outcome stamps, stats, a debrief, and a before/after scoreboard.
- **Blue Cola · Heist Ops:** trick cards, a difficulty choice (undefended or defended), turn-by-turn moves, bottle-cap loot for recipe pieces, and a debrief.

The interface consumes the service's JSON only. It does not evaluate permissions and never contains the confidential recipe; a test checks this. Every assistant response is labeled with its mode, outcomes use text and symbols as well as color, and animations are turned off when the system asks for reduced motion.

The script font is [Lobster](https://github.com/impallari/The-Lobster-Font), bundled in `fonts/` under the SIL Open Font License (see `fonts/OFL.txt`) so the demo works offline.
