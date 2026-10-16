# AI adapters

`AssistantAdapter` is the contract the engine uses. `SimulatedAssistant` plays back the scripted outcome for the active defense configuration.

Adapters receive context that the security layer has already authorized. A future real-model adapter must send only that context, report `Mode.REAL`, and surface errors instead of silently falling back to simulated results. Provider configuration and credentials stay on the server.
