from __future__ import annotations

import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from sqlalchemy import desc
from sqlalchemy.orm import Session

from .db import Report

# Import OpenEnv from the sibling package.
OPENENV_ROOT = Path(__file__).resolve().parents[2] / "openenv"
if str(OPENENV_ROOT) not in sys.path:
    sys.path.insert(0, str(OPENENV_ROOT))

from openenv.environment import CrimeOpenEnv  # type: ignore
from openenv.models import Observation  # type: ignore
from openenv.qtrainer import policy_predict_assign_zone, train_q_policy  # type: ignore


def parse_time_of_day(time_str: str) -> str:
    # UI sends strings like "08:30 AM". We map to "AM"/"PM" (fallback: "Night").
    if not time_str:
        return "AM"
    parts = [p for p in str(time_str).strip().split(" ") if p]
    if not parts:
        return "AM"
    last = parts[-1].upper()
    if last in ("AM", "PM"):
        return last
    return "Night"


def weapon_to_bool(weapon_value: str) -> bool:
    v = (weapon_value or "").strip().lower()
    return v in ("yes", "true", "y", "1")


def risk_from_frequency(count: int) -> str:
    if count >= 7:
        return "High"
    if count >= 3:
        return "Medium"
    return "Low"


@dataclass
class RlCacheEntry:
    max_report_id: int
    q_table: Dict
    trained_at: datetime


_CACHE: Dict[str, RlCacheEntry] = {}


def _build_env_dataset(rows: List[Report]) -> Tuple[List[Dict], Dict[str, int], Dict[str, int]]:
    # Returns: dataset(list[dict]), crime_stats(dict[crime_type->count]), frequency(dict[region->count])
    frequency = Counter(r.region for r in rows)
    crime_stats = Counter(r.crime_type for r in rows)

    dataset = []
    for r in rows:
        dataset.append(
            {
                "region": r.region,
                "crime_type": r.crime_type,
                "zone": risk_from_frequency(frequency.get(r.region, 0)),
                "time_of_day": parse_time_of_day(r.time),
                "needs_escalation": weapon_to_bool(r.weapon),
            }
        )
    return dataset, dict(crime_stats), dict(frequency)


def _most_common_time_of_day(rows: List[Report], region: str) -> str:
    tod_counts = Counter(parse_time_of_day(r.time) for r in rows if r.region == region)
    if not tod_counts:
        return "AM"
    return tod_counts.most_common(1)[0][0]


def train_or_load_q_for_state(db: Session, state: str) -> Dict:
    # Fetch all reports for the state (cap rows to keep RL training fast).
    # We also track max id for cache invalidation.
    max_id = db.query(Report.id).filter(Report.state == state).order_by(desc(Report.id)).first()
    max_report_id = max_id[0] if max_id else 0

    cached = _CACHE.get(state)
    if cached and cached.max_report_id == max_report_id:
        return cached.q_table

    rows = db.query(Report).filter(Report.state == state).order_by(Report.id.desc()).limit(250).all()
    if not rows:
        _CACHE[state] = RlCacheEntry(max_report_id=0, q_table={}, trained_at=datetime.utcnow())
        return {}

    dataset, _crime_stats, _frequency = _build_env_dataset(rows)

    # RL training: cap dataset size to reduce episode runtime.
    max_samples = 80
    dataset = dataset[:max_samples]

    env = CrimeOpenEnv(max_steps=len(dataset), dataset=dataset)

    # Episodes are kept small so the request is responsive.
    episodes = min(90, max(30, len(dataset) * 4))
    q_table = train_q_policy(env, episodes=episodes)

    _CACHE[state] = RlCacheEntry(
        max_report_id=max_report_id,
        q_table=q_table,
        trained_at=datetime.utcnow(),
    )
    return q_table


def get_rl_zones_for_state(db: Session, state: str, regions: List[str]) -> List[Dict]:
    rows = db.query(Report).filter(Report.state == state).order_by(Report.id.desc()).limit(500).all()
    if not regions:
        return []

    crime_stats = Counter(r.crime_type for r in rows)
    frequency = Counter(r.region for r in rows)

    if not rows:
        # No data yet -> low risk everywhere.
        return [
            {"state": state, "zone": rg, "risk": "Low", "crime_frequency": 0}
            for rg in regions
        ]

    q_table = train_or_load_q_for_state(db, state)

    dominant_crime_type = crime_stats.most_common(1)[0][0] if crime_stats else ""

    zones = []
    for rg in regions:
        tod = _most_common_time_of_day(rows, rg)
        obs = Observation(
            current_reports=[],
            selected_region=rg,
            crime_stats=dict(crime_stats),
            time_of_day=tod,
        )
        predicted_risk = policy_predict_assign_zone(q_table, obs) if q_table else "Low"
        zones.append(
            {
                "state": state,
                "zone": rg,
                "risk": predicted_risk,
                "crime_frequency": frequency.get(rg, 0),
            }
        )
    return zones

