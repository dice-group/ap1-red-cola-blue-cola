from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

__all__ = [
    "ACCESS_IDENTITIES",
    "AttackCard",
    "Control",
    "DefenseCard",
    "DefenseConfiguration",
    "Exposure",
    "Fragment",
    "GameRole",
    "KnowledgeDocument",
    "LegitimateReply",
    "LegitimateResult",
    "LegitimateTask",
    "Mode",
    "OperationalEvent",
    "Request",
    "RoundResult",
    "Scenario",
    "ScriptedTurn",
    "Session",
    "TraceEvent",
    "TurnResult",
]


class GameRole(str, Enum):
    """The visitor's side in the game. Not an access identity."""

    RED = "red"  # defends
    BLUE = "blue"  # attacks


class Mode(str, Enum):
    SIMULATED = "simulated"
    REAL = "real"


class Exposure(str, Enum):
    NONE = "none"
    FRAGMENT = "fragment"
    FULL = "full"


class Control(str, Enum):
    """Security controls a defense card switches on."""

    RETRIEVAL_PERMISSIONS = "retrieval-permissions"
    INSTRUCTION_SEPARATION = "instruction-separation"
    HISTORY_REVIEW = "history-review"
    OUTPUT_REVIEW = "output-review"


# Who the assistant is talking to, as assigned by the service for a scenario.
ACCESS_IDENTITIES = ("visitor", "supplier", "employee", "recipe-owner")


# --- Catalog -----------------------------------------------------------------


@dataclass(frozen=True)
class AttackCard:
    id: str
    title: str
    explanation: str
    risk: str
    defense_id: str


@dataclass(frozen=True)
class DefenseCard:
    id: str
    title: str
    explanation: str
    layer: str
    limitation: str
    controls: frozenset[Control]


@dataclass(frozen=True)
class Fragment:
    id: str
    label: str
    matches: tuple[str, ...]


@dataclass(frozen=True)
class KnowledgeDocument:
    id: str
    title: str
    classification: str
    allowed_roles: frozenset[str]
    text: str
    fragments: tuple[Fragment, ...] = ()


# --- Scenarios ---------------------------------------------------------------


@dataclass(frozen=True)
class TraceEvent:
    stage: str
    summary: str
    decision: str


@dataclass(frozen=True)
class OperationalEvent:
    type: str  # "verification" | "block" | "human-review"
    summary: str


@dataclass(frozen=True)
class Request:
    text: str
    candidate_document_ids: tuple[str, ...]


@dataclass(frozen=True)
class ScriptedTurn:
    response: str
    disclosed_fragment_ids: frozenset[str]
    trace: tuple[TraceEvent, ...]
    operational_events: tuple[OperationalEvent, ...]


@dataclass(frozen=True)
class LegitimateReply:
    response: str
    completed: bool


@dataclass(frozen=True)
class LegitimateTask:
    request: Request
    completed_when: str
    reply: LegitimateReply


@dataclass(frozen=True)
class DefenseConfiguration:
    """A scripted outcome, chosen when its required controls are all active."""

    id: str
    label: str
    requires_controls: frozenset[Control]
    turns: tuple[ScriptedTurn, ...]
    explanation: str
    remaining_risk: str
    legitimate: LegitimateReply | None = None


@dataclass(frozen=True)
class Scenario:
    id: str
    title: str
    summary: str
    attack_id: str
    requester_role: str
    protected_document_id: str
    max_turns: int
    attack_turns: tuple[Request, ...]
    legitimate_task: LegitimateTask
    configurations: tuple[DefenseConfiguration, ...]  # in priority order
    limitations: tuple[str, ...]


# --- Session and results -----------------------------------------------------


@dataclass
class Session:
    id: str
    role: GameRole
    scenario_id: str
    identity: str
    selected_defense_ids: tuple[str, ...]
    configuration_id: str
    mode: Mode = Mode.SIMULATED
    turn: int = 0
    disclosed_fragment_ids: set[str] = field(default_factory=set)
    operational_events: list[OperationalEvent] = field(default_factory=list)
    legitimate_executed: int = 0
    legitimate_completed: int = 0


@dataclass(frozen=True)
class TurnResult:
    turn: int
    request: str
    response: str
    mode: Mode
    retrieved_document_ids: tuple[str, ...]
    newly_disclosed_fragment_ids: tuple[str, ...]
    exposure: Exposure
    trace: tuple[TraceEvent, ...]
    operational_events: tuple[OperationalEvent, ...]
    finished: bool


@dataclass(frozen=True)
class LegitimateResult:
    request: str
    response: str
    completed: bool
    mode: Mode
    retrieved_document_ids: tuple[str, ...]
    trace: tuple[TraceEvent, ...]


@dataclass(frozen=True)
class RoundResult:
    scenario_id: str
    configuration_id: str
    mode: Mode
    selected_defense_ids: tuple[str, ...]
    acting_defense_ids: tuple[str, ...]
    exposure: Exposure
    disclosed_fragment_ids: tuple[str, ...]
    legitimate_executed: int
    legitimate_completed: int
    operational_cost: dict[str, int]
    explanation: str
    remaining_risk: str
    limitations: tuple[str, ...]
