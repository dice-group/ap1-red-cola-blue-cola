# Security controls

[controls.py](controls.py):

- `retrieve` applies the session identity's permissions before any document reaches the assistant.
- `detect_fragments` finds protected fragments in text, in any format or case.
- `exposure_level` turns accumulated fragments into none, fragment, or full.
- `active_controls` lists the controls switched on by the selected defense cards.

The identity always comes from the service, never from a message. An instruction to the model does not replace authorization. The vulnerable profile (permissions off) exists only as the explicit teaching example.
