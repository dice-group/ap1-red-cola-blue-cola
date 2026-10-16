"""End-to-end checks through HTTP, including what each role is allowed to see."""

import json
import threading
import unittest
import urllib.error
import urllib.request

from apps.api.server import create_server
from packages.engine import load_content

RECIPE_MARKERS = ("RUBY", "AZUR", "DEMO-RECIPE")


class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = create_server("127.0.0.1", 0, quiet=True)
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def request(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method,
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as response:
                return response.status, response.read().decode(errors="replace")
        except urllib.error.HTTPError as error:
            return error.code, error.read().decode()

    def json(self, method, path, body=None, expect=200):
        status, text = self.request(method, path, body)
        self.assertEqual(status, expect, text)
        return json.loads(text)

    def test_catalog_contains_no_secrets_or_scripted_outcomes(self):
        status, text = self.request("GET", "/api/catalog")
        self.assertEqual(status, 200)
        for marker in (*RECIPE_MARKERS, "defenseConfigurations", "response"):
            self.assertNotIn(marker, text)

    def test_web_bundle_contains_no_secrets(self):
        for path in ("/", "/app.js", "/styles.css", "/fonts/lobster-latin.woff2"):
            status, text = self.request("GET", path)
            self.assertEqual(status, 200, path)
            if path.endswith(".woff2"):
                continue
            for marker in RECIPE_MARKERS:
                self.assertNotIn(marker, text, path)

    def test_only_known_static_files_are_served(self):
        for path in ("/../README.md", "/%2e%2e/content/knowledge-base/documents.json", "/content/knowledge-base/documents.json"):
            status, _ = self.request("GET", path)
            self.assertEqual(status, 404, path)

    def test_catalog_shows_only_documents_the_requester_may_read(self):
        catalog = self.json("GET", "/api/catalog")
        content = load_content()
        for scenario in catalog["scenarios"]:
            identity = scenario["requesterRole"]
            for doc in scenario["documents"]:
                allowed = identity in content.documents[doc["id"]].allowed_roles
                with self.subTest(scenario=scenario["id"], document=doc["id"]):
                    self.assertEqual(doc["readable"], allowed)
                    self.assertEqual(doc["text"] is not None, allowed)

    def test_planted_instruction_is_visible_to_the_supplier(self):
        catalog = self.json("GET", "/api/catalog")
        scenario = next(s for s in catalog["scenarios"] if s["id"] == "document-instruction")
        note = next(d for d in scenario["documents"] if d["id"] == "supplier-delivery-note")
        self.assertIn(note["highlight"], note["text"])

    def test_turn_views_carry_no_document_text(self):
        for role, defenses in (("blue", ["verified-access"]), ("red", ["verified-access"])):
            session = self.json("POST", "/api/sessions", {"role": role, "scenarioId": "claimed-authority", "defenseIds": defenses}, 201)
            status, text = self.request("POST", f"/api/sessions/{session['id']}/turns")
            self.assertEqual(status, 200)
            for marker in RECIPE_MARKERS:
                self.assertNotIn(marker, text)
            turn = json.loads(text)
            self.assertEqual([c["id"] for c in turn["checkpoints"]],
                             ["identity", "retrieval", "context", "assistant", "session", "output"])
            self.assertEqual({d["id"]: d["status"] for d in turn["documents"]}["fictional-recipe"], "blocked")

    def test_red_round_end_to_end(self):
        session = self.json("POST", "/api/sessions", {"role": "red", "scenarioId": "document-instruction", "defenseIds": ["instruction-boundary"]}, 201)
        self.assertEqual(session["identity"], "supplier")
        self.assertEqual(session["mode"], "simulated")
        turn = self.json("POST", f"/api/sessions/{session['id']}/turns")
        gate = next(c for c in turn["checkpoints"] if c["id"] == "retrieval")
        self.assertEqual((gate["equipped"], gate["tone"]), (True, "good"))
        self.json("POST", f"/api/sessions/{session['id']}/legitimate")
        result = self.json("GET", f"/api/sessions/{session['id']}/result")
        self.assertEqual(result["confidentiality"]["exposure"], "none")
        self.assertEqual(result["utility"], {"completed": 1, "executed": 1})

    def test_rating_rewards_the_strongest_outcome(self):
        def rating(scenario_id, defense_ids):
            session = self.json("POST", "/api/sessions", {"role": "red", "scenarioId": scenario_id, "defenseIds": defense_ids}, 201)
            while self.json("GET", f"/api/sessions/{session['id']}")["nextRequest"]:
                self.json("POST", f"/api/sessions/{session['id']}/turns")
            return self.json("GET", f"/api/sessions/{session['id']}/result")["rating"]

        self.assertEqual(rating("document-instruction", ["instruction-boundary"]), {"best": True, "fewestCards": 1})
        self.assertEqual(rating("document-instruction", ["verified-access"])["best"], False)
        self.assertEqual(rating("partial-disclosure", [])["best"], False)

    def test_investigation_case_file(self):
        case = self.json("GET", "/api/scenarios/document-instruction/investigation")
        self.assertEqual(case["title"], "The bottle-cap delivery note")
        self.assertTrue(any(c["key"] for c in case["clues"]))
        self.assertEqual(sum(r["correct"] for r in case["rootCauses"]), 1)
        status, text = self.request("GET", "/api/scenarios/document-instruction/investigation")
        for marker in RECIPE_MARKERS:
            self.assertNotIn(marker, text)
        self.json("GET", "/api/scenarios/nope/investigation", expect=404)

    def test_claimed_role_in_the_request_body_is_ignored(self):
        session = self.json("POST", "/api/sessions", {"role": "blue", "scenarioId": "claimed-authority", "defenseIds": [], "identity": "recipe-owner"}, 201)
        self.assertEqual(session["identity"], "visitor")

    def test_reset_restarts_the_round(self):
        session = self.json("POST", "/api/sessions", {"role": "blue", "scenarioId": "partial-disclosure", "defenseIds": []}, 201)
        self.json("POST", f"/api/sessions/{session['id']}/turns")
        reset = self.json("POST", f"/api/sessions/{session['id']}/reset")
        self.assertEqual(reset["turn"], 0)
        turn = self.json("POST", f"/api/sessions/{session['id']}/turns")
        self.assertEqual(turn["fragmentsObtained"], 1)

    def test_errors(self):
        self.json("POST", "/api/sessions", {"role": "red", "scenarioId": "nope"}, 400)
        self.json("POST", "/api/sessions", {"role": "red", "scenarioId": "claimed-authority", "defenseIds": "x"}, 400)
        self.json("GET", "/api/sessions/unknown", expect=404)
        status, _ = self.request("POST", "/api/sessions", None)
        self.assertEqual(status, 400)
        session = self.json("POST", "/api/sessions", {"role": "red", "scenarioId": "partial-disclosure"}, 201)
        self.json("GET", f"/api/sessions/{session['id']}/result", expect=400)


if __name__ == "__main__":
    unittest.main()
