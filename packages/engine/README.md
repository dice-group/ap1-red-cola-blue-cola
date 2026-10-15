# Engine

- [content.py](content.py) loads `content/` into domain objects and rejects inconsistent content, such as unknown ids, a wrong number of turns, or a missing fallback configuration.
- [engine.py](engine.py) runs sessions. It assigns the identity from the scenario, picks the defense configuration whose controls are all active, applies retrieval permissions, asks the assistant adapter for a reply, accumulates disclosed fragments across turns, and scores confidentiality, utility, and operational cost separately.

Outcomes come from the scenario script, not from parsing the visible text. The tests check that scripts and the security layer agree.
