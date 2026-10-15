"""The content files are consistent with each other and with the security layer."""

import unittest

from packages.domain import Control, Exposure
from packages.engine import DemoEngine, load_content, select_configuration
from packages.security import active_controls, detect_fragments, retrieve


class ContentTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.content = load_content()

    def test_every_attack_has_exactly_one_scenario(self):
        attack_ids = sorted(s.attack_id for s in self.content.scenarios.values())
        self.assertEqual(attack_ids, sorted(self.content.attacks))

    def test_scripted_disclosures_match_what_the_response_reveals(self):
        for scenario in self.content.scenarios.values():
            fragments = self.content.fragments_of(scenario)
            for configuration in scenario.configurations:
                for index, turn in enumerate(configuration.turns):
                    with self.subTest(scenario=scenario.id, configuration=configuration.id, turn=index):
                        self.assertEqual(detect_fragments(turn.response, fragments), turn.disclosed_fragment_ids)

    def test_legitimate_responses_never_reveal_the_recipe(self):
        for scenario in self.content.scenarios.values():
            fragments = self.content.fragments_of(scenario)
            replies = [scenario.legitimate_task.reply] + [c.legitimate for c in scenario.configurations if c.legitimate]
            for reply in replies:
                with self.subTest(scenario=scenario.id):
                    self.assertEqual(detect_fragments(reply.response, fragments), frozenset())

    def test_nothing_leaks_when_permissions_keep_the_recipe_out_of_context(self):
        """A scripted leak is only allowed if the security layer would let the recipe through."""
        for scenario in self.content.scenarios.values():
            for configuration in scenario.configurations:
                enforce = Control.RETRIEVAL_PERMISSIONS in configuration.requires_controls
                for index, turn in enumerate(configuration.turns):
                    retrieved, _ = retrieve(
                        scenario.requester_role, scenario.attack_turns[index].candidate_document_ids,
                        self.content.documents, enforce_permissions=enforce,
                    )
                    if scenario.protected_document_id not in retrieved:
                        with self.subTest(scenario=scenario.id, configuration=configuration.id, turn=index):
                            self.assertEqual(turn.disclosed_fragment_ids, frozenset())

    def test_each_attack_has_a_vulnerable_and_a_protected_case(self):
        engine = DemoEngine(self.content)
        for scenario in self.content.scenarios.values():
            paired = self.content.defenses[self.content.attacks[scenario.attack_id].defense_id]
            with self.subTest(scenario=scenario.id):
                self.assertEqual(_play(engine, scenario.id, []), Exposure.FULL)
                self.assertEqual(_play(engine, scenario.id, [paired.id]), Exposure.NONE)

    def test_every_combination_of_defenses_has_a_defined_outcome(self):
        defense_ids = list(self.content.defenses)
        for scenario in self.content.scenarios.values():
            for mask in range(1 << len(defense_ids)):
                selected = [d for i, d in enumerate(defense_ids) if mask >> i & 1]
                controls = active_controls(self.content.defenses[d] for d in selected)
                select_configuration(scenario, controls)  # raises if undefined

    def test_the_recipe_is_only_readable_by_its_owner(self):
        recipe = self.content.documents["fictional-recipe"]
        self.assertEqual(recipe.allowed_roles, frozenset({"recipe-owner"}))
        self.assertEqual(recipe.classification, "confidential")


def _play(engine, scenario_id, defense_ids):
    session = engine.create_session("red", scenario_id, defense_ids)
    for _ in range(engine.content.scenarios[scenario_id].max_turns):
        result = engine.run_attack_turn(session.id)
    return result.exposure


if __name__ == "__main__":
    unittest.main()
