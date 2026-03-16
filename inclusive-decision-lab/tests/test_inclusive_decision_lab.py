import json
import random
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCENARIOS_PATH = ROOT / "scenarios.json"
APP_JS_PATH = ROOT / "app.js"
INDEX_HTML_PATH = ROOT / "index.html"
STYLES_PATH = ROOT / "styles.css"

INDICATOR_KEYS = {"accessibility", "legalRisk", "trust", "technicalDebt", "budget"}


def clamp(value: int) -> int:
    return max(0, min(100, value))


def apply_changes(indicators: dict, changes: dict) -> dict:
    out = dict(indicators)
    for key, delta in changes.items():
        if key in out:
            out[key] = clamp(out[key] + delta)
    return out


def apply_drift(indicators: dict) -> dict:
    drift = {
        "accessibility": 0,
        "legalRisk": 0,
        "trust": 0,
        "technicalDebt": 0,
        "budget": 0,
    }

    i = indicators
    if i["technicalDebt"] > 70:
        drift["accessibility"] -= 4
        drift["legalRisk"] += 4
        drift["budget"] -= 3

    if i["accessibility"] < 40:
        drift["legalRisk"] += 5
        drift["trust"] -= 4

    if i["trust"] < 35:
        drift["budget"] -= 2

    if i["budget"] < 30:
        drift["technicalDebt"] += 3
        drift["accessibility"] -= 2

    if i["accessibility"] > 75 and i["trust"] > 70:
        drift["legalRisk"] -= 3

    if i["technicalDebt"] < 30:
        drift["budget"] += 1

    if any(v != 0 for v in drift.values()):
        return apply_changes(indicators, drift)
    return dict(indicators)


def is_immediate_loss(indicators: dict) -> bool:
    return (
        indicators["legalRisk"] >= 95
        or indicators["trust"] <= 5
        or indicators["budget"] <= 0
        or indicators["accessibility"] <= 5
    )


class TestScenarioSchema(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scenarios = json.loads(SCENARIOS_PATH.read_text(encoding="utf-8"))

    def test_exactly_20_scenarios(self):
        self.assertEqual(len(self.scenarios), 20)

    def test_unique_ids(self):
        ids = [s["id"] for s in self.scenarios]
        self.assertEqual(len(ids), len(set(ids)))

    def test_each_scenario_has_3_to_4_choices(self):
        for scenario in self.scenarios:
            self.assertIn("choices", scenario)
            self.assertGreaterEqual(len(scenario["choices"]), 3)
            self.assertLessEqual(len(scenario["choices"]), 4)

    def test_effect_keys_are_valid_and_numeric(self):
        for scenario in self.scenarios:
            for choice in scenario["choices"]:
                effects = choice.get("effects", {})
                self.assertTrue(effects, f"Scenario {scenario['id']} has empty effects")
                self.assertTrue(set(effects).issubset(INDICATOR_KEYS))
                for value in effects.values():
                    self.assertIsInstance(value, int)

                hidden = choice.get("hiddenEffects", {})
                self.assertTrue(set(hidden).issubset(INDICATOR_KEYS))
                for value in hidden.values():
                    self.assertIsInstance(value, int)


class TestSimulationRules(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scenarios = json.loads(SCENARIOS_PATH.read_text(encoding="utf-8"))

    def test_drift_rule_combination_case(self):
        start = {
            "accessibility": 35,
            "legalRisk": 50,
            "trust": 30,
            "technicalDebt": 75,
            "budget": 25,
        }
        # Expected total drift:
        # td>70: a-4 lr+4 b-3
        # a<40: lr+5 t-4
        # t<35: b-2
        # b<30: td+3 a-2
        # td<30: no
        expected = {
            "accessibility": 29,
            "legalRisk": 59,
            "trust": 26,
            "technicalDebt": 78,
            "budget": 20,
        }
        self.assertEqual(apply_drift(start), expected)

    def test_immediate_loss_thresholds(self):
        self.assertTrue(is_immediate_loss({"accessibility": 50, "legalRisk": 95, "trust": 50, "technicalDebt": 50, "budget": 50}))
        self.assertTrue(is_immediate_loss({"accessibility": 5, "legalRisk": 30, "trust": 50, "technicalDebt": 50, "budget": 50}))
        self.assertTrue(is_immediate_loss({"accessibility": 50, "legalRisk": 30, "trust": 5, "technicalDebt": 50, "budget": 50}))
        self.assertTrue(is_immediate_loss({"accessibility": 50, "legalRisk": 30, "trust": 50, "technicalDebt": 50, "budget": 0}))

    def test_random_playthroughs_stay_in_bounds(self):
        rng = random.Random(42)
        for _ in range(500):
            indicators = {
                "accessibility": 55,
                "legalRisk": 40,
                "trust": 55,
                "technicalDebt": 50,
                "budget": 70,
            }
            round_num = 1
            ended = None

            while round_num <= 20:
                scenario = self.scenarios[rng.randrange(0, len(self.scenarios))]
                choice = scenario["choices"][rng.randrange(0, len(scenario["choices"]))]
                indicators = apply_changes(indicators, choice["effects"])
                if "hiddenEffects" in choice:
                    indicators = apply_changes(indicators, choice["hiddenEffects"])
                indicators = apply_drift(indicators)

                for v in indicators.values():
                    self.assertGreaterEqual(v, 0)
                    self.assertLessEqual(v, 100)

                if is_immediate_loss(indicators):
                    ended = "fail"
                    break

                round_num += 1

            if ended is None:
                ended = "complete"

            self.assertIn(ended, {"fail", "complete"})


class TestStaticRequirements(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app_js = APP_JS_PATH.read_text(encoding="utf-8")
        cls.index_html = INDEX_HTML_PATH.read_text(encoding="utf-8")
        cls.styles_css = STYLES_PATH.read_text(encoding="utf-8")

    def test_core_functions_present(self):
        required = [
            "function updateIndicators",
            "function applyDriftRules",
            "function renderScenario",
            "function evaluateGameEnd",
            "function exportResults",
            "async function loadScenarios",
        ]
        for marker in required:
            self.assertIn(marker, self.app_js)

    def test_accessibility_controls_present(self):
        self.assertIn('id="toggle-motion"', self.index_html)
        self.assertIn('id="toggle-text"', self.index_html)
        self.assertIn('id="toggle-plain-language"', self.index_html)
        self.assertIn('id="toggle-low-complexity"', self.index_html)
        self.assertIn('id="toggle-high-contrast"', self.index_html)
        self.assertIn('id="toggle-large-spacing"', self.index_html)
        self.assertIn('id="toggle-enhanced-readability"', self.index_html)
        self.assertIn('id="toggle-anonymized-mode"', self.index_html)
        self.assertIn('id="toggle-research-mode"', self.index_html)
        self.assertIn('id="toggle-audit"', self.index_html)
        self.assertIn("Research &amp; Theoretical Foundations", self.index_html)
        self.assertIn("Learning Impact", self.index_html)
        self.assertIn("Strategic Accessibility Governance Simulation Framework", self.index_html)
        self.assertIn("Deliverable Context", self.index_html)
        self.assertIn("Version 2.0 – Research-Enabled Edition", self.index_html)
        self.assertIn('class="skip-link"', self.index_html)
        self.assertIn('aria-live="polite"', self.index_html)
        self.assertIn('aria-live="assertive"', self.index_html)
        self.assertIn('role="tablist"', self.index_html)
        self.assertIn('role="tab"', self.index_html)
        self.assertIn('role="tabpanel"', self.index_html)

    def test_dashboard_labels_present(self):
        labels = [
            "Accessibility Index",
            "Legal Risk",
            "Stakeholder Trust",
            "Technical Debt",
            "Budget",
        ]
        for label in labels:
            self.assertRegex(self.app_js, re.escape(label))

    def test_end_screen_hidden_css_rule_present(self):
        self.assertIn(".end-screen[hidden]", self.styles_css)

    def test_strategic_reflection_and_tabs_logic_present(self):
        self.assertIn("function buildStrategicReflection", self.app_js)
        self.assertIn("function activateTab", self.app_js)
        self.assertIn("function bindTabs", self.app_js)
        self.assertIn("function exportAccessibleReport", self.app_js)
        self.assertIn("function exportCaseStudyReport", self.app_js)
        self.assertIn("function renderAuditPanel", self.app_js)
        self.assertIn('const LAB_VERSION = "2.0.0-Research-Enabled"', self.app_js)


if __name__ == "__main__":
    unittest.main()
