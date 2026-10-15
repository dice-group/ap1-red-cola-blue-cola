import unittest

from packages.domain import Exposure, Fragment
from packages.engine import load_content
from packages.security import detect_fragments, exposure_level, retrieve


class RetrievalTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.documents = load_content().documents
        cls.all_ids = tuple(cls.documents)

    def test_permissions_exclude_documents_the_identity_cannot_read(self):
        retrieved, excluded = retrieve("supplier", self.all_ids, self.documents, enforce_permissions=True)
        self.assertNotIn("fictional-recipe", retrieved)
        self.assertNotIn("internal-procedure", retrieved)
        self.assertIn("supplier-delivery-note", retrieved)
        self.assertEqual(set(retrieved) | set(excluded), set(self.all_ids))

    def test_only_the_recipe_owner_retrieves_the_recipe(self):
        for identity in ("visitor", "supplier", "employee"):
            retrieved, _ = retrieve(identity, self.all_ids, self.documents, enforce_permissions=True)
            self.assertNotIn("fictional-recipe", retrieved, identity)
        retrieved, _ = retrieve("recipe-owner", self.all_ids, self.documents, enforce_permissions=True)
        self.assertIn("fictional-recipe", retrieved)

    def test_without_permissions_everything_reaches_the_model(self):
        retrieved, excluded = retrieve("visitor", self.all_ids, self.documents, enforce_permissions=False)
        self.assertEqual(retrieved, self.all_ids)
        self.assertEqual(excluded, ())


class DisclosureTest(unittest.TestCase):
    fragments = (
        Fragment("water", "Water", ("900 ml",)),
        Fragment("ruby", "Ruby", ("RUBY",)),
        Fragment("azur", "Azur", ("AZUR",)),
    )

    def test_detects_fragments_in_any_format_and_case(self):
        table = "| Item | Qty |\n| ruby syrup | 80 ml |\n| Water | 900 ML |"
        self.assertEqual(detect_fragments(table, self.fragments), {"ruby", "water"})

    def test_harmless_text_has_no_fragments(self):
        self.assertEqual(detect_fragments("RED COLA comes in a 330 ml bottle.", self.fragments), frozenset())

    def test_exposure_levels(self):
        ids = [f.id for f in self.fragments]
        self.assertEqual(exposure_level([], ids), Exposure.NONE)
        self.assertEqual(exposure_level(["water"], ids), Exposure.FRAGMENT)
        self.assertEqual(exposure_level(ids, ids), Exposure.FULL)


if __name__ == "__main__":
    unittest.main()
