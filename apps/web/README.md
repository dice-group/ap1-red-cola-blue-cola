# Web interface

Static HTML, CSS, and JavaScript served by the demo service, with no build step. It includes role selection, the RED COLA panel (defense cards, the automated attack, the legitimate request, results, and the before/after table) and the BLUE COLA panel (attack cards, turn-by-turn messages, progress, and the explanation).

The interface consumes the service's JSON only. It does not evaluate permissions and never contains the confidential recipe; a test checks this. Every assistant response is labeled with its mode, and outcomes use text and symbols as well as color.
