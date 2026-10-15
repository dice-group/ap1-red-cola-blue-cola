import dataclasses
import unittest

from packages.domain import Exposure
from packages.engine import (
    DemoEngine,
    InvalidAction,
    RoundNotFinished,
    UndefinedConfiguration,
    load_content,
)


class EngineTest(unittest.TestCase):
    def setUp(self):
        self.engine = DemoEngine(load_content())

    def test_identity_comes_from_the_scenario_not_the_player(self):
        session = self.engine.create_session("blue", "claimed-authority", [])
        self.assertEqual(session.identity, "visitor")

    def test_unknown_inputs_are_rejected(self):
        with self.assertRaises(InvalidAction):
            self.engine.create_session("green", "claimed-authority", [])
        with self.assertRaises(InvalidAction):
            self.engine.create_session("red", "no-such-scenario", [])
        with self.assertRaises(InvalidAction):
            self.engine.create_session("red", "claimed-authority", ["no-such-defense"])

    def test_fragments_accumulate_across_turns(self):
        session = self.engine.create_session("blue", "partial-disclosure", [])
        exposures = [self.engine.run_attack_turn(session.id).exposure for _ in range(3)]
        self.assertEqual(exposures, [Exposure.FRAGMENT, Exposure.FRAGMENT, Exposure.FULL])

    def test_per_response_review_misses_accumulated_fragments(self):
        session = self.engine.create_session("red", "partial-disclosure", ["content-review"])
        for _ in range(3):
            result = self.engine.run_attack_turn(session.id)
        self.assertEqual(result.exposure, Exposure.FULL)

    def test_reset_clears_turns_fragments_and_costs(self):
        session = self.engine.create_session("red", "partial-disclosure", [])
        self.engine.run_attack_turn(session.id)
        self.engine.run_legitimate_request(session.id)
        self.engine.reset(session.id)
        self.assertEqual(session.turn, 0)
        self.assertEqual(session.disclosed_fragment_ids, set())
        self.assertEqual(session.operational_events, [])
        self.assertEqual(session.legitimate_executed, 0)
        self.assertEqual(self.engine.run_attack_turn(session.id).exposure, Exposure.FRAGMENT)

    def test_replay_after_reset_gives_the_same_result(self):
        session = self.engine.create_session("red", "format-change", ["content-review"])
        first = self.engine.run_attack_turn(session.id)
        self.engine.reset(session.id)
        self.assertEqual(self.engine.run_attack_turn(session.id), first)

    def test_cannot_play_past_the_last_turn(self):
        session = self.engine.create_session("red", "claimed-authority", [])
        self.engine.run_attack_turn(session.id)
        with self.assertRaises(InvalidAction):
            self.engine.run_attack_turn(session.id)

    def test_result_requires_a_finished_round(self):
        session = self.engine.create_session("red", "partial-disclosure", [])
        self.engine.run_attack_turn(session.id)
        with self.assertRaises(RoundNotFinished):
            self.engine.round_result(session.id)

    def test_defenses_keep_legitimate_work_possible(self):
        for scenario_id, attack in ((s.id, s.attack_id) for s in self.engine.content.scenarios.values()):
            defense = self.engine.content.attacks[attack].defense_id
            session = self.engine.create_session("red", scenario_id, [defense])
            for _ in range(session_max := self.engine.content.scenarios[scenario_id].max_turns):
                self.engine.run_attack_turn(session.id)
            legit = self.engine.run_legitimate_request(session.id)
            result = self.engine.round_result(session.id)
            with self.subTest(scenario=scenario_id, turns=session_max):
                self.assertTrue(legit.completed)
                self.assertEqual((result.legitimate_completed, result.legitimate_executed), (1, 1))
                self.assertEqual(result.exposure, Exposure.NONE)
                self.assertIn(defense, result.acting_defense_ids)

    def test_permission_checks_count_as_operational_cost(self):
        session = self.engine.create_session("red", "claimed-authority", ["verified-access"])
        self.engine.run_attack_turn(session.id)
        result = self.engine.round_result(session.id)
        self.assertEqual(result.operational_cost["verifications"], 1)

    def test_vulnerable_round_names_no_acting_defense(self):
        session = self.engine.create_session("red", "document-instruction", [])
        self.engine.run_attack_turn(session.id)
        result = self.engine.round_result(session.id)
        self.assertEqual(result.configuration_id, "vulnerable")
        self.assertEqual(result.acting_defense_ids, ())

    def test_undefined_configuration_is_reported_not_invented(self):
        content = self.engine.content
        scenario = content.scenarios["claimed-authority"]
        without_fallback = dataclasses.replace(scenario, configurations=scenario.configurations[:1])
        engine = DemoEngine(dataclasses.replace(content, scenarios={scenario.id: without_fallback}))
        with self.assertRaises(UndefinedConfiguration):
            engine.create_session("red", scenario.id, [])


if __name__ == "__main__":
    unittest.main()
