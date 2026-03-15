import json
import os
import socket
import sqlite3
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVER_PATH = ROOT / "server.py"
CRISIS_PATH = ROOT / "crisis-data.json"


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def post_json(base_url: str, path: str, payload: dict) -> dict:
    request = urllib.request.Request(
        f"{base_url}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def get_json(base_url: str, path: str) -> dict:
    with urllib.request.urlopen(f"{base_url}{path}", timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


class InclusiveSystemsCityServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.port = find_free_port()
        cls.db_path = Path(cls.temp_dir.name) / "test.sqlite3"
        env = os.environ.copy()
        env["PORT"] = str(cls.port)
        env["LOG_DB_PATH"] = str(cls.db_path)
        cls.proc = subprocess.Popen(
            ["python3", str(SERVER_PATH)],
            cwd=str(ROOT),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        cls.base_url = f"http://127.0.0.1:{cls.port}"
        deadline = time.time() + 10
        last_error = None
        while time.time() < deadline:
            try:
                urllib.request.urlopen(f"{cls.base_url}/index.html", timeout=1)
                last_error = None
                break
            except Exception as exc:  # pragma: no cover - startup polling
                last_error = exc
                time.sleep(0.2)
        if last_error:
            stdout, stderr = cls.proc.communicate(timeout=2)
            raise RuntimeError(f"Server did not start.\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}") from last_error

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        try:
            cls.proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            cls.proc.kill()
        cls.temp_dir.cleanup()

    def expire_phase(self, room_id: str):
        conn = sqlite3.connect(self.db_path)
        conn.execute("UPDATE rooms SET phase_deadline_at = 0 WHERE room_id = ?", (room_id,))
        conn.commit()
        conn.close()

    def test_crisis_dataset_has_twenty_scenarios(self):
        crises = json.loads(CRISIS_PATH.read_text(encoding="utf-8"))
        self.assertEqual(len(crises), 20)
        for crisis in crises:
            self.assertIn("title", crisis)
            self.assertGreaterEqual(len(crisis.get("choices", [])), 3)

    def test_index_includes_optional_timer_preference(self):
        index_html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="pref-timer"', index_html)
        self.assertIn("Show round timer", index_html)

    def test_untimed_mode_requires_all_players_ready_between_non_vote_phases(self):
        host = post_json(
            self.base_url,
            "/api/rooms/create",
            {"displayName": "Host", "role": "Inclusive Design Lead", "maxPlayers": 2},
        )["room"]
        room_id = host["roomID"]
        host_id = host["self"]["participantUUID"]
        joined = post_json(
            self.base_url,
            "/api/rooms/join",
            {"roomId": room_id, "displayName": "Legal", "role": "Legal Counsel"},
        )["room"]
        legal_id = joined["self"]["participantUUID"]

        started = post_json(self.base_url, "/api/rooms/start", {"roomId": room_id, "participantUUID": host_id})["room"]
        self.assertFalse(started["timerEnabled"])
        self.assertTrue(started["phaseReadyEligible"])
        self.assertEqual(started["phase"], "crisis_reveal")

        post_json(self.base_url, "/api/rooms/ready", {"roomId": room_id, "participantUUID": host_id, "isReady": True})
        state = get_json(self.base_url, f"/api/rooms/state?roomId={room_id}&participantUUID={host_id}")["room"]
        self.assertEqual(state["phase"], "crisis_reveal")
        self.assertEqual(state["phaseReadyCount"], 1)

        state = post_json(self.base_url, "/api/rooms/ready", {"roomId": room_id, "participantUUID": legal_id, "isReady": True})["room"]
        self.assertEqual(state["phase"], "pre_vote")
        self.assertFalse(state["phaseReadyEligible"])
        self.assertIsNone(state["phaseDeadlineMs"])

    def test_room_creation_join_and_start(self):
        created = post_json(
            self.base_url,
            "/api/rooms/create",
            {"displayName": "Host", "role": "Inclusive Design Lead", "maxPlayers": 2},
        )
        room = created["room"]
        room_id = room["roomID"]
        host_id = room["self"]["participantUUID"]

        joined = post_json(
            self.base_url,
            "/api/rooms/join",
            {"roomId": room_id, "displayName": "Legal", "role": "Legal Counsel"},
        )
        self.assertEqual(joined["room"]["roomID"], room_id)

        self.assertEqual(len(joined["room"]["participants"]), 2)

        started = post_json(
            self.base_url,
            "/api/rooms/start",
            {"roomId": room_id, "participantUUID": host_id},
        )
        self.assertEqual(started["room"]["status"], "active")
        self.assertEqual(started["room"]["phase"], "crisis_reveal")
        self.assertEqual(started["room"]["currentRound"], 1)

    def test_index_mentions_two_to_five_players(self):
        index_html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("2-5 players per room", index_html)
        self.assertIn('<option value="2">2 players</option>', index_html)

    def test_index_includes_room_snapshot_panel(self):
        index_html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("Room Snapshot", index_html)
        self.assertIn('id="setup-participants"', index_html)
        self.assertIn('id="setup-readiness"', index_html)

    def test_index_includes_leave_room_and_explanatory_copy(self):
        index_html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="leave-room"', index_html)
        self.assertIn("The lobby is the waiting room before the active round begins.", index_html)
        self.assertIn("City Systems are the simulation indicators that track the health of the city.", index_html)

    def test_leave_room_removes_participant(self):
        created = post_json(
            self.base_url,
            "/api/rooms/create",
            {"displayName": "Host", "role": "Inclusive Design Lead", "maxPlayers": 2},
        )["room"]
        room_id = created["roomID"]
        joined = post_json(
            self.base_url,
            "/api/rooms/join",
            {"roomId": room_id, "displayName": "Legal", "role": "Legal Counsel"},
        )["room"]
        participant_id = joined["self"]["participantUUID"]

        left = post_json(
            self.base_url,
            "/api/rooms/leave",
            {"roomId": room_id, "participantUUID": participant_id},
        )
        self.assertTrue(left["ok"])
        self.assertFalse(left["roomClosed"])

        state = get_json(self.base_url, f"/api/rooms/state?roomId={room_id}&participantUUID={created['self']['participantUUID']}")["room"]
        self.assertEqual(len(state["participants"]), 1)

    def test_host_leave_closes_room_for_everyone(self):
        host = post_json(
            self.base_url,
            "/api/rooms/create",
            {"displayName": "Host", "role": "Inclusive Design Lead", "maxPlayers": 2},
        )["room"]
        room_id = host["roomID"]
        host_id = host["self"]["participantUUID"]
        joined = post_json(
            self.base_url,
            "/api/rooms/join",
            {"roomId": room_id, "displayName": "Legal", "role": "Legal Counsel"},
        )["room"]
        participant_id = joined["self"]["participantUUID"]

        left = post_json(
            self.base_url,
            "/api/rooms/leave",
            {"roomId": room_id, "participantUUID": host_id},
        )
        self.assertTrue(left["ok"])
        self.assertTrue(left["roomClosed"])
        self.assertTrue(left["roomEndedByHost"])

        with self.assertRaises(urllib.error.HTTPError):
            urllib.request.urlopen(
                f"{self.base_url}/api/rooms/state?roomId={room_id}&participantUUID={participant_id}",
                timeout=5,
            )

    def test_full_round_logs_research_dataset(self):
        host = post_json(
            self.base_url,
            "/api/rooms/create",
            {"displayName": "Host", "role": "Inclusive Design Lead", "maxPlayers": 3},
        )["room"]
        room_id = host["roomID"]
        host_id = host["self"]["participantUUID"]
        legal = post_json(
            self.base_url,
            "/api/rooms/join",
            {"roomId": room_id, "displayName": "Legal", "role": "Legal Counsel"},
        )["room"]
        tech = post_json(
            self.base_url,
            "/api/rooms/join",
            {"roomId": room_id, "displayName": "Tech", "role": "Chief Technology Officer"},
        )["room"]
        legal_id = legal["self"]["participantUUID"]
        tech_id = tech["self"]["participantUUID"]

        post_json(self.base_url, "/api/rooms/start", {"roomId": room_id, "participantUUID": host_id})
        post_json(
            self.base_url,
            "/api/rooms/timer-mode",
            {"roomId": room_id, "participantUUID": host_id, "timerEnabled": True},
        )

        self.expire_phase(room_id)
        state = get_json(self.base_url, f"/api/rooms/state?roomId={room_id}&participantUUID={host_id}")["room"]
        self.assertEqual(state["phase"], "pre_vote")
        self.assertIn("neutralDescription", state["currentCrisis"])
        self.assertIn("neutralDescription", state["currentCrisis"]["options"][0])
        self.assertIn("expertExplanation", state["currentCrisis"]["options"][0])
        self.assertIn("impact", state["currentCrisis"]["options"][0])

        post_json(
            self.base_url,
            "/api/rooms/pre-vote",
            {"roomId": room_id, "participantUUID": host_id, "optionID": "1-O1", "confidenceRating": 4},
        )
        post_json(
            self.base_url,
            "/api/rooms/pre-vote",
            {"roomId": room_id, "participantUUID": legal_id, "optionID": "1-O2", "confidenceRating": 3},
        )
        post_json(
            self.base_url,
            "/api/rooms/pre-vote",
            {"roomId": room_id, "participantUUID": tech_id, "optionID": "1-O2", "confidenceRating": 5},
        )

        state = get_json(self.base_url, f"/api/rooms/state?roomId={room_id}&participantUUID={host_id}")["room"]
        self.assertEqual(state["phase"], "aggregated_reveal")
        self.assertGreater(state["roundSummary"]["divergenceIndex"], 0)
        self.assertEqual(state["roundSummary"]["preVoteCount"], 3)

        self.expire_phase(room_id)
        state = get_json(self.base_url, f"/api/rooms/state?roomId={room_id}&participantUUID={host_id}")["room"]
        self.assertEqual(state["phase"], "deliberation")

        post_json(
            self.base_url,
            "/api/rooms/message",
            {"roomId": room_id, "participantUUID": host_id, "body": "We should converge on the lower-risk path."},
        )
        state = get_json(self.base_url, f"/api/rooms/state?roomId={room_id}&participantUUID={host_id}")["room"]
        self.assertEqual(len(state["messages"]), 1)

        self.expire_phase(room_id)
        state = get_json(self.base_url, f"/api/rooms/state?roomId={room_id}&participantUUID={host_id}")["room"]
        self.assertEqual(state["phase"], "final_decision")

        post_json(
            self.base_url,
            "/api/rooms/final-vote",
            {"roomId": room_id, "participantUUID": host_id, "optionID": "1-O2", "confidenceRating": 5},
        )
        post_json(
            self.base_url,
            "/api/rooms/final-vote",
            {"roomId": room_id, "participantUUID": legal_id, "optionID": "1-O2", "confidenceRating": 4},
        )
        post_json(
            self.base_url,
            "/api/rooms/final-vote",
            {"roomId": room_id, "participantUUID": tech_id, "optionID": "1-O2", "confidenceRating": 5},
        )

        state = get_json(self.base_url, f"/api/rooms/state?roomId={room_id}&participantUUID={host_id}")["room"]
        self.assertEqual(state["phase"], "indicator_update")
        self.assertEqual(state["roundSummary"]["winningOptionTitle"], "Patch most critical components")
        self.assertEqual(state["roundSummary"]["voteShiftCount"], 1)
        self.assertIsInstance(state["roundSummary"]["consensusTimeMs"], int)
        self.assertGreaterEqual(state["roundSummary"]["consensusTimeMs"], 0)
        self.assertNotEqual(state["roundSummary"]["indicatorDelta"]["inclusion"], 0)

        conn = sqlite3.connect(self.db_path)
        rows = conn.execute(
            "SELECT roomID, crisisID, voteShift, confidenceRating FROM research_logs WHERE roomID = ? ORDER BY id ASC",
            (room_id,),
        ).fetchall()
        conn.close()
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[0][0], room_id)
        self.assertEqual(rows[0][1], "CR-01")
        self.assertEqual(sum(row[2] for row in rows), 1)
        self.assertEqual(rows[-1][3], 5)

    def test_admin_export_includes_confidence_score_alias(self):
        request = urllib.request.Request(f"{self.base_url}/api/admin/logs?token=inclusive-systems-city-admin")
        with urllib.request.urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
        self.assertTrue(payload["ok"])
        if payload["items"]:
            self.assertIn("confidenceScore", payload["items"][0])

    def test_admin_endpoint_requires_token(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(f"{self.base_url}/api/admin/logs", timeout=5)
        self.assertEqual(ctx.exception.code, 401)


if __name__ == "__main__":
    unittest.main()
