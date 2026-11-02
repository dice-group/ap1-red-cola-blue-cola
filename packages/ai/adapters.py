from __future__ import annotations

from typing import Protocol

from packages.domain import (
    DefenseConfiguration,
    KnowledgeDocument,
    LegitimateReply,
    Mode,
    Scenario,
    ScriptedTurn,
)


class AssistantAdapter(Protocol):
    """What the engine needs from an assistant, simulated or real.

    `context` has already been filtered by the security layer. A real adapter
    must send only that context to the model and must report its own mode.
    """

    mode: Mode

    def reply(
        self,
        scenario: Scenario,
        configuration: DefenseConfiguration,
        turn_index: int,
        context: tuple[KnowledgeDocument, ...],
    ) -> ScriptedTurn: ...

    def reply_legitimate(
        self,
        scenario: Scenario,
        configuration: DefenseConfiguration,
        context: tuple[KnowledgeDocument, ...],
    ) -> LegitimateReply: ...


class SimulatedAssistant:
    """Plays back the scripted outcome for the active defense configuration."""

    mode = Mode.SIMULATED

    def reply(self, scenario, configuration, turn_index, context):
        return configuration.turns[turn_index]

    def reply_legitimate(self, scenario, configuration, context):
        return configuration.legitimate or scenario.legitimate_task.reply
