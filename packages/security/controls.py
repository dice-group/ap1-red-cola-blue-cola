from __future__ import annotations

from collections.abc import Iterable, Mapping

from packages.domain import Control, DefenseCard, Exposure, Fragment, KnowledgeDocument


def active_controls(defenses: Iterable[DefenseCard]) -> frozenset[Control]:
    """Every control switched on by the selected defense cards."""
    return frozenset(control for defense in defenses for control in defense.controls)


def retrieve(
    identity: str,
    candidate_ids: Iterable[str],
    documents: Mapping[str, KnowledgeDocument],
    *,
    enforce_permissions: bool,
) -> tuple[tuple[str, ...], tuple[str, ...]]:
    """Return (retrieved, excluded) document ids for a request.

    `identity` must come from the service's session, never from a message.
    With permissions off, every candidate reaches the model: this exists only
    as the explicit teaching example.
    """
    retrieved: list[str] = []
    excluded: list[str] = []
    for doc_id in candidate_ids:
        allowed = identity in documents[doc_id].allowed_roles
        (retrieved if allowed or not enforce_permissions else excluded).append(doc_id)
    return tuple(retrieved), tuple(excluded)


def detect_fragments(text: str, fragments: Iterable[Fragment]) -> frozenset[str]:
    """Ids of protected fragments that appear in `text`, in any format."""
    lowered = text.casefold()
    return frozenset(
        fragment.id
        for fragment in fragments
        if any(match.casefold() in lowered for match in fragment.matches)
    )


def exposure_level(disclosed_ids: Iterable[str], all_fragment_ids: Iterable[str]) -> Exposure:
    disclosed = set(disclosed_ids)
    total = set(all_fragment_ids)
    if not disclosed:
        return Exposure.NONE
    return Exposure.FULL if total <= disclosed else Exposure.FRAGMENT
