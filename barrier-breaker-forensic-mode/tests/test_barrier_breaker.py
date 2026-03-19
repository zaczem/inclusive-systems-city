import json
import os
import subprocess
import time
import unittest
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
CSS = ROOT / "styles.css"
JS = ROOT / "app.js"
CASES = ROOT / "cases.json"
STARTER = ROOT / "Start Barrier Breaker Forensic Mode.command"
PY_SERVER = ROOT / "server.py"
ADMIN_DASHBOARD = ROOT / "admin-dashboard.html"

ADMIN_TOKEN = "integration-admin-token"


class BarrierBreakerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server_port = 8765
        env = os.environ.copy()
        env["PORT"] = str(cls.server_port)
        env["ADMIN_KEY"] = ADMIN_TOKEN
        cls.server_proc = subprocess.Popen(
            ["python3", "server.py"],
            cwd=ROOT,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        time.sleep(1.0)

    @classmethod
    def tearDownClass(cls):
        cls.server_proc.terminate()
        try:
            cls.server_proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            cls.server_proc.kill()

    def test_required_files_exist(self):
        for path in (INDEX, CSS, JS, CASES, STARTER, PY_SERVER, ADMIN_DASHBOARD):
            self.assertTrue(path.exists(), f"Missing required file: {path}")

    def test_starter_is_executable_and_contains_expected_commands(self):
        mode = STARTER.stat().st_mode
        self.assertTrue(mode & 0o111, "Starter script should be executable")
        content = STARTER.read_text(encoding="utf-8")
        self.assertIn("python3 server.py", content)
        self.assertIn('open "$URL"', content)

    def test_index_contains_core_simulation_controls_and_research_controls_are_hidden_by_default(self):
        html = INDEX.read_text(encoding="utf-8")
        required_ids = [
            'id="contrast-toggle"',
            'id="motion-toggle"',
            'id="font-scale"',
            'id="analysis-canvas"',
            'id="barrier-type"',
            'id="affected-group"',
            'id="rationale"',
            'id="confidence-rating"',
            'id="research-data-panel"',
            'id="export-json"',
            'id="export-csv"',
            'id="current-access-status"',
            'id="activate-research-mode"',
            'id="access-modal"',
        ]
        for marker in required_ids:
            self.assertIn(marker, html)

        self.assertIn('id="research-data-panel" class="panel data-panel" aria-labelledby="data-heading" hidden', html)
        self.assertIn('id="export-json" type="button" disabled', html)
        self.assertIn('id="export-csv" type="button" disabled', html)
        self.assertNotIn('id="restricted-access-link"', html)

        self.assertIn('script type="module" src="app.js', html)
        self.assertIn('link rel="stylesheet" href="styles.css"', html)

    def test_cases_json_schema_and_geometry(self):
        data = json.loads(CASES.read_text(encoding="utf-8"))
        self.assertIn("issueTypes", data)
        self.assertIn("levels", data)
        self.assertIn("cases", data)
        self.assertGreaterEqual(len(data["levels"]), 5)
        self.assertGreaterEqual(len(data["cases"]), 30)

        for case in data["cases"]:
            for field in (
                "id",
                "level",
                "difficulty",
                "category",
                "wcag",
                "keywords",
                "problemZone",
                "neutralDescription",
                "expertExplanation",
                "impact",
                "affectedGroups",
                "screenshot",
            ):
                self.assertIn(field, case, f"Case missing field {field}: {case.get('id', 'unknown')}")
            self.assertIn("layout", case["neutralDescription"])
            self.assertIn("elements", case["neutralDescription"])
            self.assertIsInstance(case["neutralDescription"]["elements"], list)
            self.assertGreater(len(case["affectedGroups"]), 0)

            shot = case["screenshot"]
            zone = case["problemZone"]
            self.assertGreater(shot["width"], 0)
            self.assertGreater(shot["height"], 0)

            for key in ("x", "y", "width", "height"):
                self.assertIn(key, zone)
                self.assertGreaterEqual(zone[key], 0)

            self.assertLessEqual(zone["x"] + zone["width"], shot["width"])
            self.assertLessEqual(zone["y"] + zone["height"], shot["height"])
            ET.fromstring(shot["svg"])

    def test_case_categories_are_present_in_issue_types(self):
        data = json.loads(CASES.read_text(encoding="utf-8"))
        issue_types = set(data["issueTypes"])
        for case in data["cases"]:
            self.assertIn(case["category"], issue_types, f"Unknown category in case {case['id']}")

    def test_regression_case_layouts_for_previously_unstable_cases(self):
        data = json.loads(CASES.read_text(encoding="utf-8"))
        by_id = {case["id"]: case for case in data["cases"]}

        l2_c07 = by_id["L2-C07"]
        self.assertEqual(
            l2_c07["neutralDescription"]["layout"],
            "Account settings page with side navigation and a profile details form.",
        )
        self.assertEqual(
            l2_c07["neutralDescription"]["elements"],
            ["Settings navigation list", "Profile form fields", "Primary save action"],
        )
        self.assertEqual(
            l2_c07["problemZone"],
            {"x": 126, "y": 194, "width": 184, "height": 42},
        )
        self.assertIn("Account Settings", l2_c07["screenshot"]["svg"])
        self.assertIn("Navigation", l2_c07["screenshot"]["svg"])

        l1_c03 = by_id["L1-C03"]
        self.assertEqual(
            l1_c03["problemZone"],
            {"x": 620, "y": 204, "width": 44, "height": 44},
        )
        self.assertIn("Settings Panel", l1_c03["screenshot"]["svg"])
        self.assertIn("System Status", l1_c03["screenshot"]["svg"])
        self.assertIn("Save", l1_c03["screenshot"]["svg"])

        l1_c02 = by_id["L1-C02"]
        self.assertEqual(
            l1_c02["problemZone"],
            {"x": 224, "y": 388, "width": 224, "height": 18},
        )
        self.assertIn("Sign In", l1_c02["screenshot"]["svg"])
        self.assertIn("Password", l1_c02["screenshot"]["svg"])
        self.assertIn("Use at least 12 characters.", l1_c02["screenshot"]["svg"])

        l2_c04 = by_id["L2-C04"]
        self.assertEqual(
            l2_c04["problemZone"],
            {"x": 540, "y": 412, "width": 180, "height": 40},
        )
        self.assertIn("Registration Form", l2_c04["screenshot"]["svg"])
        self.assertIn("Create Account", l2_c04["screenshot"]["svg"])

        l2_c05 = by_id["L2-C05"]
        self.assertEqual(
            l2_c05["problemZone"],
            {"x": 120, "y": 166, "width": 660, "height": 58},
        )
        self.assertIn("Timed Assessment", l2_c05["screenshot"]["svg"])
        self.assertIn("Time remaining: 01:58", l2_c05["screenshot"]["svg"])
        self.assertIn("Submit", l2_c05["screenshot"]["svg"])

        l2_c06 = by_id["L2-C06"]
        self.assertEqual(
            l2_c06["problemZone"],
            {"x": 536, "y": 184, "width": 142, "height": 40},
        )
        self.assertIn("Command Toolbar", l2_c06["screenshot"]["svg"])
        self.assertIn("Export data", l2_c06["screenshot"]["svg"])
        self.assertIn("Share", l2_c06["screenshot"]["svg"])

        l2_c02 = by_id["L2-C02"]
        self.assertEqual(
            l2_c02["problemZone"],
            {"x": 304, "y": 108, "width": 118, "height": 38},
        )
        self.assertIn("Navigation Header", l2_c02["screenshot"]["svg"])
        self.assertIn("Projects", l2_c02["screenshot"]["svg"])

        l2_c03 = by_id["L2-C03"]
        self.assertEqual(
            l2_c03["problemZone"],
            {"x": 642, "y": 174, "width": 36, "height": 36},
        )
        self.assertIn("Confirm changes", l2_c03["screenshot"]["svg"])
        self.assertIn("Cancel", l2_c03["screenshot"]["svg"])
        self.assertIn("Confirm", l2_c03["screenshot"]["svg"])

        l3_c02 = by_id["L3-C02"]
        self.assertEqual(
            l3_c02["problemZone"],
            {"x": 168, "y": 206, "width": 244, "height": 44},
        )
        self.assertIn("Booking Form", l3_c02["screenshot"]["svg"])
        self.assertIn("Confirm Booking", l3_c02["screenshot"]["svg"])

        l3_c03 = by_id["L3-C03"]
        self.assertEqual(
            l3_c03["problemZone"],
            {"x": 146, "y": 214, "width": 430, "height": 96},
        )
        self.assertIn("Knowledge Article", l3_c03["screenshot"]["svg"])
        self.assertIn("Overview and key requirements", l3_c03["screenshot"]["svg"])
        self.assertIn("Summary", l3_c03["screenshot"]["svg"])

        l3_c04 = by_id["L3-C04"]
        self.assertEqual(
            l3_c04["problemZone"],
            {"x": 170, "y": 186, "width": 560, "height": 46},
        )
        self.assertIn("Profile Validation", l3_c04["screenshot"]["svg"])
        self.assertIn("<circle cx='194' cy='209' r='9'", l3_c04["screenshot"]["svg"])

        l3_c05 = by_id["L3-C05"]
        self.assertEqual(
            l3_c05["neutralDescription"]["layout"],
            "Results page with heading, sorting toolbar, and a product grid.",
        )
        self.assertEqual(
            l3_c05["problemZone"],
            {"x": 582, "y": 152, "width": 150, "height": 42},
        )
        self.assertIn("Browse Results", l3_c05["screenshot"]["svg"])
        self.assertIn("Sort: Newest", l3_c05["screenshot"]["svg"])

        l3_c06 = by_id["L3-C06"]
        self.assertEqual(
            l3_c06["neutralDescription"]["layout"],
            "Process page with a sequence row, supporting text, and a completion summary.",
        )
        self.assertEqual(
            l3_c06["problemZone"],
            {"x": 178, "y": 196, "width": 470, "height": 72},
        )
        self.assertIn("Process Sequence", l3_c06["screenshot"]["svg"])
        self.assertIn(">3</text>", l3_c06["screenshot"]["svg"])

        l3_c07 = by_id["L3-C07"]
        self.assertEqual(
            l3_c07["problemZone"],
            {"x": 384, "y": 336, "width": 128, "height": 38},
        )
        self.assertIn("Card Actions", l3_c07["screenshot"]["svg"])
        self.assertIn("Launch", l3_c07["screenshot"]["svg"])
        self.assertIn("Open report", l3_c07["screenshot"]["svg"])

        l4_c03 = by_id["L4-C03"]
        self.assertEqual(
            l4_c03["problemZone"],
            {"x": 150, "y": 180, "width": 604, "height": 46},
        )
        self.assertIn("Metrics Table", l4_c03["screenshot"]["svg"])
        self.assertIn("Region", l4_c03["screenshot"]["svg"])

        l4_c05 = by_id["L4-C05"]
        self.assertEqual(
            l4_c05["problemZone"],
            {"x": 156, "y": 186, "width": 588, "height": 144},
        )
        self.assertIn("Accordion FAQ", l4_c05["screenshot"]["svg"])
        self.assertIn("How do billing updates work?", l4_c05["screenshot"]["svg"])

        l4_c06 = by_id["L4-C06"]
        self.assertEqual(
            l4_c06["problemZone"],
            {"x": 174, "y": 214, "width": 452, "height": 150},
        )
        self.assertIn("Autocomplete Search", l4_c06["screenshot"]["svg"])
        self.assertIn("24 results", l4_c06["screenshot"]["svg"])

        l4_c02 = by_id["L4-C02"]
        self.assertEqual(
            l4_c02["problemZone"],
            {"x": 596, "y": 196, "width": 122, "height": 112},
        )
        self.assertIn("Custom Switches", l4_c02["screenshot"]["svg"])
        self.assertIn("Notification alerts", l4_c02["screenshot"]["svg"])
        self.assertIn("Profile visibility", l4_c02["screenshot"]["svg"])

        l4_c04 = by_id["L4-C04"]
        self.assertEqual(
            l4_c04["problemZone"],
            {"x": 610, "y": 268, "width": 126, "height": 34},
        )
        self.assertIn("Live Queue", l4_c04["screenshot"]["svg"])
        self.assertIn("Reopened", l4_c04["screenshot"]["svg"])
        self.assertIn("Updated 09:42", l4_c04["screenshot"]["svg"])

        l4_c07 = by_id["L4-C07"]
        self.assertEqual(
            l4_c07["problemZone"],
            {"x": 112, "y": 148, "width": 156, "height": 248},
        )
        self.assertIn("App Shell Navigation", l4_c07["screenshot"]["svg"])
        self.assertIn("Navigation", l4_c07["screenshot"]["svg"])
        self.assertIn("Workspace Summary", l4_c07["screenshot"]["svg"])
        self.assertIn("Help Center", l4_c07["screenshot"]["svg"])

        l5_c02 = by_id["L5-C02"]
        self.assertEqual(
            l5_c02["neutralDescription"]["layout"],
            "Multi-step enrollment page with step navigation, content area, and summary sidebar.",
        )
        self.assertEqual(
            l5_c02["problemZone"],
            {"x": 126, "y": 170, "width": 164, "height": 40},
        )
        self.assertIn("Enrollment Steps", l5_c02["screenshot"]["svg"])
        self.assertIn("Verification", l5_c02["screenshot"]["svg"])

        l5_c01 = by_id["L5-C01"]
        self.assertEqual(
            l5_c01["problemZone"],
            {"x": 646, "y": 180, "width": 132, "height": 56},
        )
        self.assertIn("Live Trading Panel", l5_c01["screenshot"]["svg"])
        self.assertIn("Alert Rail", l5_c01["screenshot"]["svg"])
        self.assertIn("Price jump", l5_c01["screenshot"]["svg"])

        l5_c03 = by_id["L5-C03"]
        self.assertEqual(
            l5_c03["problemZone"],
            {"x": 160, "y": 234, "width": 570, "height": 162},
        )
        self.assertIn("Kanban Board", l5_c03["screenshot"]["svg"])
        self.assertIn("In Progress", l5_c03["screenshot"]["svg"])

        l5_c04 = by_id["L5-C04"]
        self.assertEqual(
            l5_c04["problemZone"],
            {"x": 110, "y": 176, "width": 660, "height": 156},
        )
        self.assertIn("Hero Carousel", l5_c04["screenshot"]["svg"])
        self.assertIn("<circle cx='130' cy='254' r='16'", l5_c04["screenshot"]["svg"])
        self.assertIn("<rect x='676' y='188' width='88' height='20'", l5_c04["screenshot"]["svg"])

        l5_c05 = by_id["L5-C05"]
        self.assertEqual(
            l5_c05["problemZone"],
            {"x": 156, "y": 392, "width": 598, "height": 28},
        )
        self.assertIn("Analytics Dashboard", l5_c05["screenshot"]["svg"])
        self.assertIn("Conversion", l5_c05["screenshot"]["svg"])

        l5_c06 = by_id["L5-C06"]
        self.assertEqual(
            l5_c06["problemZone"],
            {"x": 126, "y": 192, "width": 430, "height": 52},
        )
        self.assertIn("Order Review", l5_c06["screenshot"]["svg"])
        self.assertIn("Shipping details", l5_c06["screenshot"]["svg"])
        self.assertIn("Checkout Summary", l5_c06["screenshot"]["svg"])

    def test_local_server_serves_all_assets(self):
        for endpoint in ("/index.html", "/styles.css", "/app.js", "/cases.json", "/admin-dashboard.html"):
            with self.subTest(endpoint=endpoint):
                url = f"http://127.0.0.1:{self.server_port}{endpoint}"
                with urllib.request.urlopen(url, timeout=5) as response:
                    self.assertEqual(response.status, 200)
                    payload = response.read()
                    self.assertGreater(len(payload), 50)

    def test_log_endpoint_and_admin_protection(self):
        base = f"http://127.0.0.1:{self.server_port}"

        with self.assertRaises(urllib.error.HTTPError) as unauthorized:
            urllib.request.urlopen(f"{base}/admin/dashboard", timeout=5)
        self.assertEqual(unauthorized.exception.code, 401)

        payload = {
            "sessionUUID": "abc-session",
            "role": "public",
            "caseID": "L1-C01",
            "round": 1,
            "decisionTimestamp": "2026-03-08T12:00:00.000Z",
            "responseTimeMs": 12000,
            "clickX": 320,
            "clickY": 220,
            "spatialAccuracy": True,
            "issueClassification": "Color contrast failure",
            "classificationCorrect": True,
            "justificationText": "Contrast ratio appears below threshold",
            "justificationScore": 0.9,
            "confidenceRating": 4,
            "barrierComplexityScore": 1,
            "visualSalienceScore": 5,
            "severityIndex": 4,
            "experimentCondition": "timed",
            "researchMode": False,
            "anonymizedMode": True,
            "datasetVersion": "v2.0-research",
            "caseOrderSeed": 12345,
            "randomizedCaseOrder": ["L1-C01", "L2-C01"],
            "mode": "spatial",
            "indicatorChanges": ["zoomEnabled", "fontScale"],
        }

        req = urllib.request.Request(
            f"{base}/api/log-session",
            method="POST",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            self.assertEqual(response.status, 202)

        dashboard_req = urllib.request.Request(
            f"{base}/admin/dashboard",
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
        )
        with urllib.request.urlopen(dashboard_req, timeout=5) as response:
            self.assertEqual(response.status, 200)

        logs_req = urllib.request.Request(
            f"{base}/api/admin/logs",
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
        )
        with urllib.request.urlopen(logs_req, timeout=5) as response:
            self.assertEqual(response.status, 200)
            body = json.loads(response.read().decode("utf-8"))

        self.assertTrue(body["ok"])
        self.assertGreaterEqual(body["total"], 1)
        self.assertEqual(body["items"][-1]["sessionUUID"], "abc-session")
        self.assertEqual(body["items"][-1]["issueClassification"], "Color contrast failure")

        role_req = urllib.request.Request(f"{base}/api/admin/session-role")
        with urllib.request.urlopen(role_req, timeout=5) as response:
            self.assertEqual(response.status, 200)
            role_body = json.loads(response.read().decode("utf-8"))
            self.assertEqual(role_body["role"], "public")

        role_admin_req = urllib.request.Request(
            f"{base}/api/admin/session-role",
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
        )
        with urllib.request.urlopen(role_admin_req, timeout=5) as response:
            self.assertEqual(response.status, 200)
            role_body = json.loads(response.read().decode("utf-8"))
            self.assertEqual(role_body["role"], "research")

        csv_req = urllib.request.Request(
            f"{base}/api/admin/logs.csv",
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
        )
        with urllib.request.urlopen(csv_req, timeout=5) as response:
            self.assertEqual(response.status, 200)
            csv_body = response.read().decode("utf-8")
        self.assertIn("sessionUUID,role,caseID,round", csv_body)
        self.assertIn("abc-session", csv_body)

    def test_app_js_contains_required_server_logging_fields(self):
        js = JS.read_text(encoding="utf-8")
        for field in (
            "sessionUUID",
            "round",
            "role",
            "caseID",
            "decisionTimestamp",
            "responseTimeMs",
            "clickX",
            "clickY",
            "spatialAccuracy",
            "issueClassification",
            "classificationCorrect",
            "justificationText",
            "justificationScore",
            "confidenceRating",
            "barrierComplexityScore",
            "visualSalienceScore",
            "severityIndex",
            "experimentCondition",
            "researchMode",
            "anonymizedMode",
            "datasetVersion",
            "mode",
            "indicatorChanges",
            "fetch(\"/api/admin/session-role\"",
            "/api/admin/logs",
            "/api/admin/logs.csv",
            "fetch(\"/api/log-session\"",
        ):
            self.assertIn(field, js)


if __name__ == "__main__":
    unittest.main(verbosity=2)
