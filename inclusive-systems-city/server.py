#!/usr/bin/env python3
import csv
import hmac
import io
import json
import math
import os
import secrets
import sqlite3
import threading
import time
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8000"))
ADMIN_KEY = os.environ.get("ADMIN_KEY", "inclusive-systems-city-admin").strip()
DB_PATH = Path(os.environ.get("LOG_DB_PATH", str(ROOT / "inclusive_systems_city.sqlite3")))
CRISIS_PATH = ROOT / "crisis-data.json"

MIN_PLAYERS = 2
MAX_PLAYERS = 5
ROLE_OPTIONS = [
    "Inclusive Design Lead",
    "Legal Counsel",
    "Chief Technology Officer",
    "Community Advocate",
    "Budget Director",
]

PHASE_SEQUENCE = [
    "crisis_reveal",
    "pre_vote",
    "aggregated_reveal",
    "deliberation",
    "final_decision",
    "indicator_update",
]

PHASE_DURATIONS_MS = {
    "crisis_reveal": 45_000,
    "pre_vote": 120_000,
    "aggregated_reveal": 45_000,
    "deliberation": 180_000,
    "final_decision": 120_000,
    "indicator_update": 20_000,
}

MANUAL_ADVANCE_PHASES = {
    "crisis_reveal",
    "aggregated_reveal",
    "deliberation",
    "indicator_update",
}

INITIAL_INDICATORS = {
    "inclusion": 58,
    "legal_exposure": 34,
    "technical_debt": 47,
    "public_trust": 56,
    "cognitive_load": 42,
    "system_stability": 61,
    "budget": 68,
}

INDICATOR_LABELS = {
    "inclusion": "Inclusion Index",
    "legal_exposure": "Legal Exposure",
    "technical_debt": "Technical Debt",
    "public_trust": "Public Trust",
    "cognitive_load": "Cognitive Load",
    "system_stability": "System Stability",
    "budget": "Budget",
}

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}

LOG_FIELDS = [
    "sessionUUID",
    "roomID",
    "participantUUID",
    "role",
    "crisisID",
    "preVote",
    "finalDecision",
    "voteShift",
    "consensusTimeMs",
    "indicatorDelta",
    "confidenceRating",
    "confidenceScore",
]

ADMIN_SESSIONS = set()
ROOM_LOCK = threading.Lock()


def now_ms() -> int:
    return int(time.time() * 1000)


def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def load_crises() -> list[dict]:
    raw = json.loads(CRISIS_PATH.read_text(encoding="utf-8"))
    crises = []
    for entry in raw:
        options = []
        for index, choice in enumerate(entry.get("choices", []), start=1):
            options.append(
                {
                    "id": f"{entry['id']}-O{index}",
                    "title": choice["text"],
                    "neutralDescription": "Institutional response option available for evaluation before explanation reveal.",
                    "expertExplanation": choice["hiddenReveal"],
                    "impact": build_impact_text(choice.get("effects", {}), choice.get("hiddenEffects", {})),
                    "publicNote": "Expert explanation remains hidden until a final answer is submitted.",
                    "effects": map_effects(choice.get("effects", {}), choice.get("hiddenEffects", {})),
                }
            )
        crises.append(
            {
                "id": f"CR-{int(entry['id']):02d}",
                "sourceID": entry["id"],
                "category": entry["category"],
                "title": entry["title"],
                "neutralDescription": entry["description"],
                "options": options,
            }
        )
    return crises


def build_impact_text(primary: dict, hidden: dict) -> str:
    merged = {
        "Inclusion Index": int(primary.get("accessibility", 0)),
        "Legal Exposure": -(int(primary.get("legalRisk", 0)) + int(hidden.get("legalRisk", 0))),
        "Technical Debt": -(int(primary.get("technicalDebt", 0)) + int(hidden.get("technicalDebt", 0))),
        "Public Trust": int(primary.get("trust", 0)) + int(hidden.get("trust", 0)),
        "Budget": int(primary.get("budget", 0)) + int(hidden.get("budget", 0)),
    }
    parts = []
    for label, value in merged.items():
        if value == 0:
            continue
        prefix = "+" if value > 0 else ""
        parts.append(f"{label} {prefix}{value}")
    if not parts:
        return "No material indicator shift is expected from this option."
    return "Expected indicator impact: " + "; ".join(parts) + "."


def map_effects(primary: dict, hidden: dict) -> dict:
    combined = {
        "budget": int(primary.get("budget", 0)) + int(hidden.get("budget", 0)),
        "inclusion": int(primary.get("accessibility", 0)),
        "legal_exposure": -(int(primary.get("legalRisk", 0)) + int(hidden.get("legalRisk", 0))),
        "technical_debt": -(int(primary.get("technicalDebt", 0)) + int(hidden.get("technicalDebt", 0))),
        "public_trust": int(primary.get("trust", 0)) + int(hidden.get("trust", 0)),
        "cognitive_load": 0,
        "system_stability": 0,
    }
    combined["cognitive_load"] = round((-combined["inclusion"] + max(0, combined["technical_debt"] * -1) + max(0, -combined["budget"])) / 3)
    combined["system_stability"] = round((combined["inclusion"] + combined["public_trust"] + combined["legal_exposure"]) / 3)
    return combined


CRISES = load_crises()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db_connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS rooms (
                room_id TEXT PRIMARY KEY,
                session_uuid TEXT NOT NULL,
                host_uuid TEXT NOT NULL,
                status TEXT NOT NULL,
                max_players INTEGER NOT NULL,
                timer_enabled INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                current_round INTEGER NOT NULL,
                phase TEXT NOT NULL,
                phase_started_at INTEGER,
                phase_deadline_at INTEGER,
                indicators_json TEXT NOT NULL,
                round_summary_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS participants (
                participant_uuid TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                display_name TEXT NOT NULL,
                role TEXT NOT NULL,
                joined_at INTEGER NOT NULL,
                last_seen_at INTEGER NOT NULL,
                is_host INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS votes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT NOT NULL,
                round_number INTEGER NOT NULL,
                participant_uuid TEXT NOT NULL,
                vote_type TEXT NOT NULL,
                option_id TEXT NOT NULL,
                confidence_rating INTEGER NOT NULL,
                submitted_at INTEGER NOT NULL,
                UNIQUE(room_id, round_number, participant_uuid, vote_type)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT NOT NULL,
                round_number INTEGER NOT NULL,
                participant_uuid TEXT NOT NULL,
                display_name TEXT NOT NULL,
                role TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS research_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sessionUUID TEXT NOT NULL,
                roomID TEXT NOT NULL,
                participantUUID TEXT NOT NULL,
                role TEXT NOT NULL,
                crisisID TEXT NOT NULL,
                preVote TEXT NOT NULL,
                finalDecision TEXT NOT NULL,
                voteShift INTEGER NOT NULL,
                consensusTimeMs INTEGER,
                indicatorDelta TEXT NOT NULL,
                confidenceRating INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS phase_ready (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT NOT NULL,
                round_number INTEGER NOT NULL,
                phase TEXT NOT NULL,
                participant_uuid TEXT NOT NULL,
                ready_at INTEGER NOT NULL,
                UNIQUE(room_id, round_number, phase, participant_uuid)
            );
            """
        )
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(rooms)").fetchall()}
        if "timer_enabled" not in columns:
            conn.execute("ALTER TABLE rooms ADD COLUMN timer_enabled INTEGER NOT NULL DEFAULT 0")
        conn.commit()


def generate_room_id() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))


def new_round_summary(round_number: int) -> dict:
    return {
        "roundNumber": round_number,
        "deliberationStartedAt": None,
        "preVoteSummary": [],
        "preVoteCount": 0,
        "divergenceIndex": 0.0,
        "winningOptionID": None,
        "winningOptionTitle": None,
        "consensusTimeMs": None,
        "indicatorDelta": {key: 0 for key in INITIAL_INDICATORS},
        "voteShiftCount": 0,
        "updateNarrative": "",
    }


def clamp(value: int) -> int:
    return max(0, min(100, int(value)))


def normalize_indicator_score(key: str, value: int) -> int:
    if key in {"legal_exposure", "technical_debt", "cognitive_load"}:
        return clamp(100 - value)
    return clamp(value)


def json_dumps(data: dict | list) -> str:
    return json.dumps(data, ensure_ascii=True, separators=(",", ":"))


def parse_json(raw: str, fallback):
    try:
        return json.loads(raw)
    except Exception:
        return fallback


def sanitize_text(value: str, limit: int) -> str:
    return str(value or "").strip()[:limit]


def build_completion_report(indicators: dict) -> dict:
    normalized = {
        key: normalize_indicator_score(key, int(indicators.get(key, 0)))
        for key in INITIAL_INDICATORS
    }
    overall_score = round(sum(normalized.values()) / len(normalized))
    ordered = sorted(normalized.items(), key=lambda item: item[1], reverse=True)
    strongest = ordered[:2]
    weakest = ordered[-2:]

    label = lambda key: INDICATOR_LABELS[key]

    strengths = []
    for key, score in strongest:
        if key in {"inclusion", "public_trust", "system_stability", "budget"}:
            strengths.append(f"{label(key)} remained comparatively strong at {indicators[key]}/100.")
        else:
            strengths.append(f"{label(key)} stayed relatively contained at {indicators[key]}/100.")

    watch_areas = []
    for key, score in weakest:
        if key in {"legal_exposure", "technical_debt", "cognitive_load"}:
            watch_areas.append(f"{label(key)} still needs attention because it ended at {indicators[key]}/100.")
        else:
            watch_areas.append(f"{label(key)} needs reinforcement because it finished at {indicators[key]}/100.")

    if overall_score >= 75:
        verdict = "The team kept the city in a resilient and broadly inclusive position."
    elif overall_score >= 60:
        verdict = "The team achieved a workable outcome, but some systems remain under pressure."
    else:
        verdict = "The city remained operational, but the final balance shows meaningful institutional strain."

    recommendations = []
    if indicators["budget"] < 40:
        recommendations.append("Protect implementation capacity earlier so budget pressure does not block later reforms.")
    if indicators["legal_exposure"] > 55:
        recommendations.append("Bring legal risk into the discussion earlier so compliance pressure does not accumulate across rounds.")
    if indicators["technical_debt"] > 55:
        recommendations.append("Pair quick fixes with structural remediation to prevent technical debt from compounding.")
    if indicators["public_trust"] < 55:
        recommendations.append("Use clearer public communication and visible accountability steps to rebuild trust after difficult trade-offs.")
    if indicators["inclusion"] < 60:
        recommendations.append("Test decisions more explicitly against inclusion outcomes before choosing the fastest institutional response.")
    if indicators["cognitive_load"] > 50:
        recommendations.append("Simplify service journeys and operational processes so the system remains usable for both residents and staff.")
    if indicators["system_stability"] < 60:
        recommendations.append("Create more operational slack before the next crisis so the system can absorb shocks without cascading failure.")
    if not recommendations:
        recommendations.append("Keep using cross-functional trade-off checks, because the team preserved a strong balance across the city systems.")

    return {
        "overallScore": overall_score,
        "verdict": verdict,
        "categoryScores": [
            {
                "key": key,
                "label": label(key),
                "rawValue": int(indicators[key]),
                "normalizedScore": int(normalized[key]),
                "direction": "Higher is better." if key not in {"legal_exposure", "technical_debt", "cognitive_load"} else "Lower is better.",
            }
            for key in INITIAL_INDICATORS
        ],
        "strengths": strengths,
        "watchAreas": watch_areas,
        "recommendations": recommendations[:3],
    }


def fetch_room(conn: sqlite3.Connection, room_id: str):
    return conn.execute("SELECT * FROM rooms WHERE room_id = ?", (room_id,)).fetchone()


def fetch_participants(conn: sqlite3.Connection, room_id: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT * FROM participants
        WHERE room_id = ?
        ORDER BY is_host DESC, joined_at ASC
        """,
        (room_id,),
    ).fetchall()


def fetch_votes(conn: sqlite3.Connection, room_id: str, round_number: int, vote_type: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT * FROM votes
        WHERE room_id = ? AND round_number = ? AND vote_type = ?
        ORDER BY submitted_at ASC
        """,
        (room_id, round_number, vote_type),
    ).fetchall()


def fetch_messages(conn: sqlite3.Connection, room_id: str, round_number: int) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT * FROM messages
        WHERE room_id = ? AND round_number = ?
        ORDER BY created_at ASC, id ASC
        """,
        (room_id, round_number),
    ).fetchall()


def fetch_phase_ready(conn: sqlite3.Connection, room_id: str, round_number: int, phase: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT * FROM phase_ready
        WHERE room_id = ? AND round_number = ? AND phase = ?
        ORDER BY ready_at ASC, id ASC
        """,
        (room_id, round_number, phase),
    ).fetchall()


def clear_phase_ready(conn: sqlite3.Connection, room_id: str) -> None:
    conn.execute("DELETE FROM phase_ready WHERE room_id = ?", (room_id,))


def room_self(conn: sqlite3.Connection, room_id: str, participant_uuid: str):
    return conn.execute(
        "SELECT * FROM participants WHERE room_id = ? AND participant_uuid = ?",
        (room_id, participant_uuid),
    ).fetchone()


def remove_participant_from_room(conn: sqlite3.Connection, room_id: str, participant_uuid: str) -> dict:
    room = fetch_room(conn, room_id)
    participant = room_self(conn, room_id, participant_uuid)
    if not room or not participant:
        raise ValueError("Room membership not found.")

    if participant["is_host"]:
        conn.execute("DELETE FROM participants WHERE room_id = ?", (room_id,))
        conn.execute("DELETE FROM votes WHERE room_id = ?", (room_id,))
        conn.execute("DELETE FROM messages WHERE room_id = ?", (room_id,))
        conn.execute("DELETE FROM phase_ready WHERE room_id = ?", (room_id,))
        conn.execute("DELETE FROM rooms WHERE room_id = ?", (room_id,))
        conn.commit()
        return {"roomClosed": True, "roomEndedByHost": True}

    conn.execute(
        "DELETE FROM participants WHERE room_id = ? AND participant_uuid = ?",
        (room_id, participant_uuid),
    )
    conn.execute(
        "DELETE FROM phase_ready WHERE room_id = ? AND participant_uuid = ?",
        (room_id, participant_uuid),
    )
    remaining = fetch_participants(conn, room_id)

    if not remaining:
        conn.execute("DELETE FROM votes WHERE room_id = ?", (room_id,))
        conn.execute("DELETE FROM messages WHERE room_id = ?", (room_id,))
        conn.execute("DELETE FROM phase_ready WHERE room_id = ?", (room_id,))
        conn.execute("DELETE FROM rooms WHERE room_id = ?", (room_id,))
        conn.commit()
        return {"roomClosed": True, "roomEndedByHost": False}

    conn.execute(
        "UPDATE rooms SET updated_at = ? WHERE room_id = ?",
        (now_ms(), room_id),
    )

    conn.commit()
    return {"roomClosed": False, "roomEndedByHost": False}


def crisis_for_round(round_number: int) -> dict | None:
    if round_number < 1 or round_number > len(CRISES):
        return None
    return CRISES[round_number - 1]


def option_lookup(crisis: dict) -> dict[str, dict]:
    return {option["id"]: option for option in crisis.get("options", [])}


def entropy(counts: list[int]) -> float:
    total = sum(counts)
    if total <= 0:
        return 0.0
    value = 0.0
    for count in counts:
        if count <= 0:
            continue
        probability = count / total
        value -= probability * math.log(probability, 2)
    return round(value, 4)


def apply_system_drift(indicators: dict, delta: dict) -> dict:
    drift = {key: 0 for key in INITIAL_INDICATORS}
    if indicators["technical_debt"] >= 60:
        drift["system_stability"] -= 4
        drift["cognitive_load"] += 3
    if indicators["public_trust"] <= 35:
        drift["legal_exposure"] -= 2
        drift["system_stability"] -= 3
    if indicators["budget"] <= 30:
        drift["technical_debt"] -= 2
        drift["cognitive_load"] += 2
    if delta["inclusion"] >= 10:
        drift["public_trust"] += 2
    if delta["legal_exposure"] <= -10:
        drift["public_trust"] -= 2
    return drift


def combine_delta(base_delta: dict, drift_delta: dict) -> dict:
    return {key: int(base_delta.get(key, 0)) + int(drift_delta.get(key, 0)) for key in INITIAL_INDICATORS}


def summarize_prevotes(crisis: dict, votes: list[sqlite3.Row]) -> tuple[list[dict], float]:
    lookup = option_lookup(crisis)
    counts = {option["id"]: 0 for option in crisis["options"]}
    for vote in votes:
        counts[vote["option_id"]] = counts.get(vote["option_id"], 0) + 1
    total = len(votes)
    summary = [
        {
            "optionID": option_id,
            "optionTitle": lookup[option_id]["title"],
            "count": count,
            "total": total,
        }
        for option_id, count in counts.items()
    ]
    return summary, entropy(list(counts.values()))


def compute_consensus_time(start_ms: int | None, votes: list[sqlite3.Row], participant_total: int, winning_option_id: str) -> int | None:
    if not start_ms or not votes:
        return None
    tally = {}
    threshold = participant_total // 2 + 1
    for vote in votes:
        tally[vote["option_id"]] = tally.get(vote["option_id"], 0) + 1
        if vote["option_id"] == winning_option_id and tally[vote["option_id"]] >= threshold:
            return max(0, int(vote["submitted_at"]) - int(start_ms))
    return None


def choose_winner(crisis: dict, effective_votes: list[dict]) -> tuple[str, dict]:
    lookup = option_lookup(crisis)
    rankings = {}
    option_order = {option["id"]: index for index, option in enumerate(crisis["options"])}
    for vote in effective_votes:
        item = rankings.setdefault(vote["option_id"], {"count": 0, "confidence_sum": 0})
        item["count"] += 1
        item["confidence_sum"] += vote["confidence_rating"]
    winner_id = sorted(
        rankings.keys(),
        key=lambda option_id: (
            -rankings[option_id]["count"],
            -rankings[option_id]["confidence_sum"],
            option_order[option_id],
        ),
    )[0]
    return winner_id, lookup[winner_id]


def log_research_rows(
    conn: sqlite3.Connection,
    room: sqlite3.Row,
    participants: list[sqlite3.Row],
    crisis: dict,
    pre_votes_by_user: dict[str, sqlite3.Row],
    final_votes_by_user: dict[str, dict],
    round_summary: dict,
) -> None:
    delta_text = json_dumps(round_summary["indicatorDelta"])
    for participant in participants:
        pre_vote = pre_votes_by_user.get(participant["participant_uuid"])
        final_vote = final_votes_by_user.get(participant["participant_uuid"])
        conn.execute(
            """
            INSERT INTO research_logs (
                sessionUUID, roomID, participantUUID, role, crisisID, preVote, finalDecision,
                voteShift, consensusTimeMs, indicatorDelta, confidenceRating
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                room["session_uuid"],
                room["room_id"],
                participant["participant_uuid"],
                participant["role"],
                crisis["id"],
                pre_vote["option_id"] if pre_vote else "",
                final_vote["option_id"] if final_vote else "",
                int(bool(pre_vote and final_vote and pre_vote["option_id"] != final_vote["option_id"])),
                round_summary["consensusTimeMs"],
                delta_text,
                int(final_vote["confidence_rating"] if final_vote else 0),
            ),
        )


def advance_room_if_needed(conn: sqlite3.Connection, room_id: str):
    room = fetch_room(conn, room_id)
    if not room or room["status"] in {"lobby", "completed"}:
        return room

    participants = fetch_participants(conn, room_id)
    participant_total = len(participants)
    current_round = int(room["current_round"])
    phase = room["phase"]
    timer_enabled = bool(room["timer_enabled"])
    now = now_ms()
    deadline = room["phase_deadline_at"] or 0
    round_summary = parse_json(room["round_summary_json"], new_round_summary(current_round))

    while True:
        crisis = crisis_for_round(current_round)
        if crisis is None:
            conn.execute(
                """
                UPDATE rooms
                SET status = 'completed',
                    phase = 'completed',
                    phase_started_at = ?,
                    phase_deadline_at = NULL,
                    updated_at = ?
                WHERE room_id = ?
                """,
                (now, now, room_id),
            )
            conn.commit()
            return fetch_room(conn, room_id)

        phase_ready = fetch_phase_ready(conn, room_id, current_round, phase)
        ready_total = len(phase_ready)

        if phase == "crisis_reveal" and (now >= deadline if timer_enabled else ready_total >= participant_total):
            phase = "pre_vote"
        elif phase == "pre_vote":
            pre_votes = fetch_votes(conn, room_id, current_round, "pre")
            if len(pre_votes) >= participant_total or (timer_enabled and now >= deadline):
                summary, divergence = summarize_prevotes(crisis, pre_votes)
                round_summary["preVoteSummary"] = summary
                round_summary["preVoteCount"] = len(pre_votes)
                round_summary["divergenceIndex"] = divergence
                phase = "aggregated_reveal"
            else:
                break
        elif phase == "aggregated_reveal" and (now >= deadline if timer_enabled else ready_total >= participant_total):
            round_summary["deliberationStartedAt"] = now_ms()
            phase = "deliberation"
        elif phase == "deliberation" and (now >= deadline if timer_enabled else ready_total >= participant_total):
            phase = "final_decision"
        elif phase == "final_decision":
            final_votes = fetch_votes(conn, room_id, current_round, "final")
            pre_votes = fetch_votes(conn, room_id, current_round, "pre")
            if len(final_votes) >= participant_total or (timer_enabled and now >= deadline):
                pre_votes_by_user = {vote["participant_uuid"]: vote for vote in pre_votes}
                final_votes_by_user = {
                    vote["participant_uuid"]: {
                        "option_id": vote["option_id"],
                        "confidence_rating": vote["confidence_rating"],
                        "submitted_at": vote["submitted_at"],
                    }
                    for vote in final_votes
                }
                crisis_lookup = option_lookup(crisis)
                fallback_option_id = crisis["options"][0]["id"]
                effective_votes = []
                for participant in participants:
                    vote = final_votes_by_user.get(participant["participant_uuid"])
                    if vote is None:
                        pre_vote = pre_votes_by_user.get(participant["participant_uuid"])
                        vote = {
                            "option_id": pre_vote["option_id"] if pre_vote else fallback_option_id,
                            "confidence_rating": pre_vote["confidence_rating"] if pre_vote else 3,
                            "submitted_at": now,
                        }
                        final_votes_by_user[participant["participant_uuid"]] = vote
                    if vote["option_id"] not in crisis_lookup:
                        vote["option_id"] = fallback_option_id
                    effective_votes.append(vote)

                winner_id, winner_option = choose_winner(crisis, effective_votes)
                base_delta = winner_option["effects"]
                indicators = parse_json(room["indicators_json"], dict(INITIAL_INDICATORS))
                drift = apply_system_drift(indicators, base_delta)
                total_delta = combine_delta(base_delta, drift)
                next_indicators = {
                    key: clamp(indicators[key] + total_delta[key])
                    for key in INITIAL_INDICATORS
                }
                actual_final_rows = fetch_votes(conn, room_id, current_round, "final")
                consensus_time_ms = compute_consensus_time(
                    round_summary.get("deliberationStartedAt"),
                    actual_final_rows,
                    participant_total,
                    winner_id,
                )
                vote_shift_count = sum(
                    1
                    for participant in participants
                    if (
                        participant["participant_uuid"] in pre_votes_by_user
                        and pre_votes_by_user[participant["participant_uuid"]]["option_id"]
                        != final_votes_by_user[participant["participant_uuid"]]["option_id"]
                    )
                )
                round_summary.update(
                    {
                        "winningOptionID": winner_id,
                        "winningOptionTitle": winner_option["title"],
                        "consensusTimeMs": consensus_time_ms,
                        "indicatorDelta": total_delta,
                        "voteShiftCount": vote_shift_count,
                        "updateNarrative": winner_option["expertExplanation"],
                    }
                )
                log_research_rows(
                    conn,
                    room,
                    participants,
                    crisis,
                    pre_votes_by_user,
                    final_votes_by_user,
                    round_summary,
                )
                conn.execute(
                    """
                    UPDATE rooms
                    SET indicators_json = ?
                    WHERE room_id = ?
                    """,
                    (json_dumps(next_indicators), room_id),
                )
                phase = "indicator_update"
            else:
                break
        elif phase == "indicator_update" and (now >= deadline if timer_enabled else ready_total >= participant_total):
            current_round += 1
            round_summary = new_round_summary(current_round)
            if current_round > len(CRISES):
                conn.execute(
                    """
                    UPDATE rooms
                    SET current_round = ?,
                        status = 'completed',
                        phase = 'completed',
                        phase_started_at = ?,
                        phase_deadline_at = NULL,
                        round_summary_json = ?,
                        updated_at = ?
                    WHERE room_id = ?
                    """,
                    (current_round - 1, now, json_dumps(round_summary), now, room_id),
                )
                conn.commit()
                return fetch_room(conn, room_id)
            phase = "crisis_reveal"
        else:
            break

        phase_started = now_ms()
        clear_phase_ready(conn, room_id)
        phase_deadline = None if phase == "completed" or not timer_enabled else phase_started + PHASE_DURATIONS_MS.get(phase, 0)
        conn.execute(
            """
            UPDATE rooms
            SET current_round = ?,
                phase = ?,
                phase_started_at = ?,
                phase_deadline_at = ?,
                round_summary_json = ?,
                updated_at = ?
            WHERE room_id = ?
            """,
            (current_round, phase, phase_started, phase_deadline, json_dumps(round_summary), phase_started, room_id),
        )
        conn.commit()
        room = fetch_room(conn, room_id)
        deadline = room["phase_deadline_at"] or 0
        now = now_ms()

    return fetch_room(conn, room_id)


def build_room_payload(conn: sqlite3.Connection, room: sqlite3.Row, participant_uuid: str) -> dict:
    room = advance_room_if_needed(conn, room["room_id"]) or room
    participants = fetch_participants(conn, room["room_id"])
    current_round = int(room["current_round"])
    crisis = crisis_for_round(current_round) if room["status"] != "completed" else None
    round_summary = parse_json(room["round_summary_json"], new_round_summary(current_round))
    indicators = parse_json(room["indicators_json"], dict(INITIAL_INDICATORS))
    self_row = room_self(conn, room["room_id"], participant_uuid)
    pre_votes = fetch_votes(conn, room["room_id"], current_round, "pre")
    final_votes = fetch_votes(conn, room["room_id"], current_round, "final")
    phase_ready = fetch_phase_ready(conn, room["room_id"], current_round, room["phase"])
    pre_by_user = {vote["participant_uuid"]: vote for vote in pre_votes}
    final_by_user = {vote["participant_uuid"]: vote for vote in final_votes}
    ready_by_user = {row["participant_uuid"]: row for row in phase_ready}
    messages = [
        {
            "displayName": row["display_name"],
            "role": row["role"],
            "body": row["body"],
            "isoTime": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(row["created_at"] / 1000)),
            "displayTime": time.strftime("%H:%M:%S", time.localtime(row["created_at"] / 1000)),
        }
        for row in fetch_messages(conn, room["room_id"], current_round)
    ]

    status_message = ""
    if room["status"] == "lobby":
        needed = max(0, MIN_PLAYERS - len(participants))
        status_message = "Host can start the room." if needed == 0 else f"Waiting for {needed} more participant(s)."
    elif room["status"] == "completed":
        status_message = "All twenty crises have been completed."
    elif not bool(room["timer_enabled"]) and room["phase"] in MANUAL_ADVANCE_PHASES:
        status_message = f"{len(phase_ready)} of {len(participants)} participants are ready to continue."
    else:
        status_message = f"{PHASE_SEQUENCE.index(room['phase']) + 1} of 6 phases active."

    payload = {
        "roomID": room["room_id"],
        "sessionUUID": room["session_uuid"],
        "status": room["status"],
        "statusMessage": status_message,
        "maxPlayers": room["max_players"],
        "currentRound": min(current_round, len(CRISES)),
        "phase": room["phase"],
        "timerEnabled": bool(room["timer_enabled"]),
        "phaseDeadlineMs": room["phase_deadline_at"],
        "phaseReadyEligible": room["status"] == "active" and room["phase"] in MANUAL_ADVANCE_PHASES and not bool(room["timer_enabled"]),
        "phaseReadyCount": len(phase_ready),
        "phaseReadyTotal": len(participants),
        "participants": [
            {
                "participantUUID": row["participant_uuid"],
                "displayName": row["display_name"],
                "role": row["role"],
                "isHost": bool(row["is_host"]),
            }
            for row in participants
        ],
        "indicators": indicators,
        "currentCrisis": crisis,
        "roundSummary": round_summary,
        "messages": messages,
        "self": {
            "participantUUID": self_row["participant_uuid"],
            "displayName": self_row["display_name"],
            "role": self_row["role"],
            "isHost": bool(self_row["is_host"]),
            "preVoteSubmitted": self_row["participant_uuid"] in pre_by_user,
            "preVoteOptionID": pre_by_user[self_row["participant_uuid"]]["option_id"] if self_row["participant_uuid"] in pre_by_user else None,
            "preVoteConfidence": pre_by_user[self_row["participant_uuid"]]["confidence_rating"] if self_row["participant_uuid"] in pre_by_user else None,
            "finalVoteSubmitted": self_row["participant_uuid"] in final_by_user,
            "finalVoteOptionID": final_by_user[self_row["participant_uuid"]]["option_id"] if self_row["participant_uuid"] in final_by_user else None,
            "finalVoteConfidence": final_by_user[self_row["participant_uuid"]]["confidence_rating"] if self_row["participant_uuid"] in final_by_user else None,
            "phaseReady": self_row["participant_uuid"] in ready_by_user,
            "voteShift": bool(
                self_row["participant_uuid"] in pre_by_user
                and self_row["participant_uuid"] in final_by_user
                and pre_by_user[self_row["participant_uuid"]]["option_id"] != final_by_user[self_row["participant_uuid"]]["option_id"]
            ),
        },
        "completionSummary": "The room completed all twenty crises and recorded a structured round-level research dataset.",
        "completionReport": build_completion_report(indicators),
    }
    return payload


def parse_cookie_header(cookie_header: str) -> dict:
    out = {}
    if not cookie_header:
        return out
    for segment in cookie_header.split(";"):
        if "=" not in segment:
            continue
        key, val = segment.split("=", 1)
        out[key.strip()] = val.strip()
    return out


def extract_admin_key(headers, parsed):
    provided = headers.get("X-Admin-Key", "").strip()
    if provided:
        return provided
    auth = headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    query = parse_qs(parsed.query or "")
    return (query.get("token") or query.get("key") or [""])[0].strip()


class Handler(BaseHTTPRequestHandler):
    server_version = "InclusiveSystemsCityHTTP/1.0"

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/rooms/state":
            self.handle_room_state(parsed)
            return
        if parsed.path == "/api/admin/logs":
            self.handle_admin_logs(parsed)
            return
        if parsed.path == "/api/admin/logs.csv":
            self.handle_admin_logs_csv(parsed)
            return
        if parsed.path == "/admin/dashboard":
            if not self.has_admin_access(parsed):
                self.send_text(HTTPStatus.UNAUTHORIZED, "Unauthorized")
                return
            cookie = self.issue_session_cookie(parsed)
            self.serve_static_file(ROOT / "admin-dashboard.html", {"Set-Cookie": cookie} if cookie else None)
            return
        self.serve_static_request(parsed.path)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/rooms/create":
            self.handle_create_room()
            return
        if parsed.path == "/api/rooms/join":
            self.handle_join_room()
            return
        if parsed.path == "/api/rooms/start":
            self.handle_start_room()
            return
        if parsed.path == "/api/rooms/timer-mode":
            self.handle_timer_mode()
            return
        if parsed.path == "/api/rooms/ready":
            self.handle_phase_ready()
            return
        if parsed.path == "/api/rooms/leave":
            self.handle_leave_room()
            return
        if parsed.path == "/api/rooms/pre-vote":
            self.handle_vote("pre")
            return
        if parsed.path == "/api/rooms/final-vote":
            self.handle_vote("final")
            return
        if parsed.path == "/api/rooms/message":
            self.handle_message()
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > 1_000_000:
            raise ValueError("Invalid request body length.")
        raw = self.rfile.read(length)
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("Expected JSON object.")
        return data

    def handle_create_room(self):
        try:
            payload = self.read_json_body()
            display_name = sanitize_text(payload.get("displayName"), 40)
            role = sanitize_text(payload.get("role"), 60)
            max_players = int(payload.get("maxPlayers") or 4)
            if not display_name:
                raise ValueError("Display name is required.")
            if role not in ROLE_OPTIONS:
                raise ValueError("Select a valid role.")
            if max_players < MIN_PLAYERS or max_players > MAX_PLAYERS:
                raise ValueError("Room size must be between 2 and 5.")
            with ROOM_LOCK, db_connect() as conn:
                room_id = generate_room_id()
                while fetch_room(conn, room_id):
                    room_id = generate_room_id()
                participant_uuid = str(uuid.uuid4())
                session_uuid = str(uuid.uuid4())
                timestamp = now_ms()
                conn.execute(
                    """
                    INSERT INTO rooms (
                        room_id, session_uuid, host_uuid, status, max_players, created_at, updated_at,
                        timer_enabled, current_round, phase, phase_started_at, phase_deadline_at, indicators_json, round_summary_json
                    ) VALUES (?, ?, ?, 'lobby', ?, ?, ?, 0, 1, 'crisis_reveal', NULL, NULL, ?, ?)
                    """,
                    (
                        room_id,
                        session_uuid,
                        participant_uuid,
                        max_players,
                        timestamp,
                        timestamp,
                        json_dumps(dict(INITIAL_INDICATORS)),
                        json_dumps(new_round_summary(1)),
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO participants (
                        participant_uuid, room_id, display_name, role, joined_at, last_seen_at, is_host
                    ) VALUES (?, ?, ?, ?, ?, ?, 1)
                    """,
                    (participant_uuid, room_id, display_name, role, timestamp, timestamp),
                )
                conn.commit()
                room = fetch_room(conn, room_id)
                self.send_json(HTTPStatus.CREATED, {"ok": True, "room": build_room_payload(conn, room, participant_uuid)})
        except Exception as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

    def handle_join_room(self):
        try:
            payload = self.read_json_body()
            room_id = sanitize_text(payload.get("roomId"), 8).upper()
            display_name = sanitize_text(payload.get("displayName"), 40)
            role = sanitize_text(payload.get("role"), 60)
            if not room_id or not display_name:
                raise ValueError("Room ID and display name are required.")
            if role not in ROLE_OPTIONS:
                raise ValueError("Select a valid role.")
            with ROOM_LOCK, db_connect() as conn:
                room = fetch_room(conn, room_id)
                if not room:
                    raise ValueError("Room not found.")
                if room["status"] != "lobby":
                    raise ValueError("This room has already started.")
                participants = fetch_participants(conn, room_id)
                if len(participants) >= room["max_players"]:
                    raise ValueError("This room is full.")
                if role in {row["role"] for row in participants}:
                    raise ValueError("That role is already assigned in this room.")
                participant_uuid = str(uuid.uuid4())
                timestamp = now_ms()
                conn.execute(
                    """
                    INSERT INTO participants (
                        participant_uuid, room_id, display_name, role, joined_at, last_seen_at, is_host
                    ) VALUES (?, ?, ?, ?, ?, ?, 0)
                    """,
                    (participant_uuid, room_id, display_name, role, timestamp, timestamp),
                )
                conn.commit()
                room = fetch_room(conn, room_id)
                self.send_json(HTTPStatus.OK, {"ok": True, "room": build_room_payload(conn, room, participant_uuid)})
        except Exception as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

    def handle_start_room(self):
        try:
            payload = self.read_json_body()
            room_id = sanitize_text(payload.get("roomId"), 8).upper()
            participant_uuid = sanitize_text(payload.get("participantUUID"), 64)
            with ROOM_LOCK, db_connect() as conn:
                room = fetch_room(conn, room_id)
                participant = room_self(conn, room_id, participant_uuid)
                participants = fetch_participants(conn, room_id)
                if not room or not participant:
                    raise ValueError("Room membership not found.")
                if not participant["is_host"]:
                    raise ValueError("Only the host can start the room.")
                if len(participants) < MIN_PLAYERS:
                    raise ValueError("At least two players are required.")
                phase_started = now_ms()
                conn.execute(
                    """
                    UPDATE rooms
                    SET status = 'active',
                        timer_enabled = 0,
                        phase = 'crisis_reveal',
                        phase_started_at = ?,
                        phase_deadline_at = NULL,
                        updated_at = ?
                    WHERE room_id = ?
                    """,
                    (
                        phase_started,
                        phase_started,
                        room_id,
                    ),
                )
                clear_phase_ready(conn, room_id)
                conn.commit()
                room = fetch_room(conn, room_id)
                self.send_json(HTTPStatus.OK, {"ok": True, "room": build_room_payload(conn, room, participant_uuid)})
        except Exception as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

    def handle_timer_mode(self):
        try:
            payload = self.read_json_body()
            room_id = sanitize_text(payload.get("roomId"), 8).upper()
            participant_uuid = sanitize_text(payload.get("participantUUID"), 64)
            timer_enabled = bool(payload.get("timerEnabled"))
            with ROOM_LOCK, db_connect() as conn:
                room = fetch_room(conn, room_id)
                participant = room_self(conn, room_id, participant_uuid)
                if not room or not participant:
                    raise ValueError("Room membership not found.")
                if not participant["is_host"]:
                    raise ValueError("Only the host can change the timer mode.")
                if room["status"] != "active" or room["phase"] == "completed":
                    raise ValueError("The timer can only be changed after the mission has started.")
                phase_deadline = None
                if timer_enabled:
                    phase_deadline = now_ms() + PHASE_DURATIONS_MS.get(room["phase"], 0)
                conn.execute(
                    """
                    UPDATE rooms
                    SET timer_enabled = ?, phase_deadline_at = ?, updated_at = ?
                    WHERE room_id = ?
                    """,
                    (1 if timer_enabled else 0, phase_deadline, now_ms(), room_id),
                )
                clear_phase_ready(conn, room_id)
                conn.commit()
                room = fetch_room(conn, room_id)
                self.send_json(HTTPStatus.OK, {"ok": True, "room": build_room_payload(conn, room, participant_uuid)})
        except Exception as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

    def handle_phase_ready(self):
        try:
            payload = self.read_json_body()
            room_id = sanitize_text(payload.get("roomId"), 8).upper()
            participant_uuid = sanitize_text(payload.get("participantUUID"), 64)
            is_ready = bool(payload.get("isReady", True))
            with ROOM_LOCK, db_connect() as conn:
                room = fetch_room(conn, room_id)
                participant = room_self(conn, room_id, participant_uuid)
                if not room or not participant:
                    raise ValueError("Room membership not found.")
                room = advance_room_if_needed(conn, room_id)
                if room["status"] != "active" or bool(room["timer_enabled"]) or room["phase"] not in MANUAL_ADVANCE_PHASES:
                    raise ValueError("Manual advance is not available for this phase.")
                if is_ready:
                    conn.execute(
                        """
                        INSERT INTO phase_ready (room_id, round_number, phase, participant_uuid, ready_at)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT(room_id, round_number, phase, participant_uuid)
                        DO UPDATE SET ready_at = excluded.ready_at
                        """,
                        (room_id, room["current_round"], room["phase"], participant_uuid, now_ms()),
                    )
                else:
                    conn.execute(
                        """
                        DELETE FROM phase_ready
                        WHERE room_id = ? AND round_number = ? AND phase = ? AND participant_uuid = ?
                        """,
                        (room_id, room["current_round"], room["phase"], participant_uuid),
                    )
                conn.commit()
                room = fetch_room(conn, room_id)
                self.send_json(HTTPStatus.OK, {"ok": True, "room": build_room_payload(conn, room, participant_uuid)})
        except Exception as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

    def handle_leave_room(self):
        try:
            payload = self.read_json_body()
            room_id = sanitize_text(payload.get("roomId"), 8).upper()
            participant_uuid = sanitize_text(payload.get("participantUUID"), 64)
            with ROOM_LOCK, db_connect() as conn:
                result = remove_participant_from_room(conn, room_id, participant_uuid)
                self.send_json(HTTPStatus.OK, {"ok": True, **result})
        except Exception as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

    def handle_vote(self, vote_type: str):
        try:
            payload = self.read_json_body()
            room_id = sanitize_text(payload.get("roomId"), 8).upper()
            participant_uuid = sanitize_text(payload.get("participantUUID"), 64)
            option_id = sanitize_text(payload.get("optionID"), 32)
            confidence = int(payload.get("confidenceRating") or 0)
            if confidence < 1 or confidence > 5:
                raise ValueError("Confidence rating must be between 1 and 5.")
            with ROOM_LOCK, db_connect() as conn:
                room = fetch_room(conn, room_id)
                participant = room_self(conn, room_id, participant_uuid)
                if not room or not participant:
                    raise ValueError("Room membership not found.")
                room = advance_room_if_needed(conn, room_id)
                expected_phase = "pre_vote" if vote_type == "pre" else "final_decision"
                if room["phase"] != expected_phase:
                    raise ValueError("Voting is not open for this phase.")
                crisis = crisis_for_round(room["current_round"])
                if option_id not in option_lookup(crisis):
                    raise ValueError("Invalid option for this crisis.")
                submitted_at = now_ms()
                conn.execute(
                    """
                    INSERT INTO votes (room_id, round_number, participant_uuid, vote_type, option_id, confidence_rating, submitted_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(room_id, round_number, participant_uuid, vote_type)
                    DO UPDATE SET option_id = excluded.option_id,
                                  confidence_rating = excluded.confidence_rating,
                                  submitted_at = excluded.submitted_at
                    """,
                    (room_id, room["current_round"], participant_uuid, vote_type, option_id, confidence, submitted_at),
                )
                conn.execute(
                    "UPDATE participants SET last_seen_at = ? WHERE participant_uuid = ?",
                    (submitted_at, participant_uuid),
                )
                conn.commit()
                room = fetch_room(conn, room_id)
                self.send_json(HTTPStatus.ACCEPTED, {"ok": True, "room": build_room_payload(conn, room, participant_uuid)})
        except Exception as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

    def handle_message(self):
        try:
            payload = self.read_json_body()
            room_id = sanitize_text(payload.get("roomId"), 8).upper()
            participant_uuid = sanitize_text(payload.get("participantUUID"), 64)
            body = sanitize_text(payload.get("body"), 280)
            if not body:
                raise ValueError("Message body is required.")
            with ROOM_LOCK, db_connect() as conn:
                room = fetch_room(conn, room_id)
                participant = room_self(conn, room_id, participant_uuid)
                if not room or not participant:
                    raise ValueError("Room membership not found.")
                room = advance_room_if_needed(conn, room_id)
                if room["phase"] != "deliberation":
                    raise ValueError("Messages can only be posted during deliberation.")
                timestamp = now_ms()
                conn.execute(
                    """
                    INSERT INTO messages (room_id, round_number, participant_uuid, display_name, role, body, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (room_id, room["current_round"], participant_uuid, participant["display_name"], participant["role"], body, timestamp),
                )
                conn.execute(
                    "UPDATE participants SET last_seen_at = ? WHERE participant_uuid = ?",
                    (timestamp, participant_uuid),
                )
                conn.commit()
                self.send_json(HTTPStatus.ACCEPTED, {"ok": True})
        except Exception as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

    def handle_room_state(self, parsed):
        try:
            query = parse_qs(parsed.query or "")
            room_id = sanitize_text((query.get("roomId") or [""])[0], 8).upper()
            participant_uuid = sanitize_text((query.get("participantUUID") or [""])[0], 64)
            with ROOM_LOCK, db_connect() as conn:
                room = fetch_room(conn, room_id)
                participant = room_self(conn, room_id, participant_uuid)
                if not room or not participant:
                    raise ValueError("Room membership not found.")
                conn.execute(
                    "UPDATE participants SET last_seen_at = ? WHERE participant_uuid = ?",
                    (now_ms(), participant_uuid),
                )
                conn.commit()
                self.send_json(HTTPStatus.OK, {"ok": True, "room": build_room_payload(conn, room, participant_uuid)})
        except Exception as exc:
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

    def handle_admin_logs(self, parsed):
        if not self.has_admin_access(parsed):
            self.send_json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "Unauthorized"})
            return
        cookie = self.issue_session_cookie(parsed)
        with db_connect() as conn:
            rows = [dict(row) for row in conn.execute("SELECT * FROM research_logs ORDER BY id ASC").fetchall()]
        for row in rows:
            row["confidenceScore"] = row.get("confidenceRating", 0)
        self.send_json(
            HTTPStatus.OK,
            {"ok": True, "items": rows, "total": len(rows)},
            {"Set-Cookie": cookie} if cookie else None,
        )

    def handle_admin_logs_csv(self, parsed):
        if not self.has_admin_access(parsed):
            self.send_text(HTTPStatus.UNAUTHORIZED, "Unauthorized")
            return
        cookie = self.issue_session_cookie(parsed)
        with db_connect() as conn:
            rows = [dict(row) for row in conn.execute("SELECT * FROM research_logs ORDER BY id ASC").fetchall()]
        for row in rows:
            row["confidenceScore"] = row.get("confidenceRating", 0)
        sio = io.StringIO()
        writer = csv.DictWriter(sio, fieldnames=LOG_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
        body = sio.getvalue().encode("utf-8")
        headers = {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Length": str(len(body)),
        }
        if cookie:
            headers["Set-Cookie"] = cookie
        self.send_bytes(HTTPStatus.OK, body, headers)

    def serve_static_request(self, url_path: str):
        clean = "/index.html" if url_path == "/" else url_path
        if ".." in clean:
            self.send_error(HTTPStatus.BAD_REQUEST)
            return
        self.serve_static_file(ROOT / clean.lstrip("/"))

    def serve_static_file(self, file_path: Path, extra_headers: dict | None = None):
        if not file_path.exists() or not file_path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        body = file_path.read_bytes()
        headers = {
            "Content-Type": MIME_TYPES.get(file_path.suffix.lower(), "application/octet-stream"),
            "Content-Length": str(len(body)),
        }
        if extra_headers:
            headers.update(extra_headers)
        self.send_bytes(HTTPStatus.OK, body, headers)

    def send_json(self, status: int, payload: dict, extra_headers: dict | None = None):
        body = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": str(len(body)),
        }
        if extra_headers:
            headers.update(extra_headers)
        self.send_bytes(status, body, headers)

    def send_text(self, status: int, text: str):
        body = text.encode("utf-8")
        self.send_bytes(
            status,
            body,
            {
                "Content-Type": "text/plain; charset=utf-8",
                "Content-Length": str(len(body)),
            },
        )

    def send_bytes(self, status: int, body: bytes, headers: dict):
        self.send_response(status)
        for key, value in headers.items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def has_admin_access(self, parsed) -> bool:
        cookies = parse_cookie_header(self.headers.get("Cookie", ""))
        session_id = cookies.get("adminSession")
        if session_id and session_id in ADMIN_SESSIONS:
            return True
        provided = extract_admin_key(self.headers, parsed)
        return bool(provided and ADMIN_KEY and hmac.compare_digest(provided, ADMIN_KEY))

    def issue_session_cookie(self, parsed):
        provided = extract_admin_key(self.headers, parsed)
        if not (provided and ADMIN_KEY and hmac.compare_digest(provided, ADMIN_KEY)):
            return None
        session_id = secrets.token_hex(18)
        ADMIN_SESSIONS.add(session_id)
        return f"adminSession={session_id}; HttpOnly; SameSite=Strict; Path=/"

    def log_message(self, _format, *_args):
        return


def main():
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Inclusive Systems City running on http://localhost:{PORT}/index.html")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
