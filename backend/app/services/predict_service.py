"""
Crime Prediction Service — RandomForest + KMeans + Synthetic seeding.

Provides:
  • predict_crime_risk()  → risk_score 0-100, risk_level, predicted_crime, time_window, hotspot
  • crime_heatmap()       → lat/lng intensity points for leaflet heatmap
  • crime_time_analysis() → hourly distribution + peak window
  • high_risk_zones()     → top-N zones sorted by risk
"""

from __future__ import annotations

import random
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import Report

# ── Constants ────────────────────────────────────────────────
CRIME_LABELS = ["Theft", "Robbery", "Assault", "Cybercrime", "Fraud"]

CITY_PROFILES: Dict[str, Dict[str, Any]] = {
    # city_region: {lat, lng, crime_weights(by hour bucket 0-3), dominant_crimes}
    "Mumbai": {
        "lat": 19.076, "lng": 72.877,
        "hour_weights": [0.1, 0.4, 0.35, 0.15],   # night heavy
        "crimes": {"Theft": 0.4, "Robbery": 0.35, "Assault": 0.15, "Fraud": 0.1},
    },
    "Pune": {
        "lat": 18.520, "lng": 73.856,
        "hour_weights": [0.1, 0.3, 0.4, 0.2],
        "crimes": {"Theft": 0.35, "Robbery": 0.25, "Cybercrime": 0.3, "Fraud": 0.1},
    },
    "Delhi": {
        "lat": 28.704, "lng": 77.102,
        "hour_weights": [0.05, 0.35, 0.45, 0.15],
        "crimes": {"Robbery": 0.45, "Assault": 0.25, "Theft": 0.2, "Fraud": 0.1},
    },
    "Hyderabad": {
        "lat": 17.385, "lng": 78.487,
        "hour_weights": [0.1, 0.3, 0.35, 0.25],
        "crimes": {"Cybercrime": 0.45, "Fraud": 0.3, "Theft": 0.2, "Assault": 0.05},
    },
    "Bangalore": {
        "lat": 12.972, "lng": 77.594,
        "hour_weights": [0.1, 0.25, 0.4, 0.25],
        "crimes": {"Cybercrime": 0.4, "Fraud": 0.3, "Theft": 0.2, "Robbery": 0.1},
    },
    "Chennai": {
        "lat": 13.083, "lng": 80.270,
        "hour_weights": [0.15, 0.3, 0.35, 0.2],
        "crimes": {"Theft": 0.45, "Robbery": 0.25, "Assault": 0.2, "Fraud": 0.1},
    },
    "Kolkata": {
        "lat": 22.573, "lng": 88.364,
        "hour_weights": [0.1, 0.35, 0.4, 0.15],
        "crimes": {"Theft": 0.4, "Robbery": 0.3, "Assault": 0.2, "Fraud": 0.1},
    },
    "Ahmedabad": {
        "lat": 23.023, "lng": 72.572,
        "hour_weights": [0.2, 0.3, 0.3, 0.2],
        "crimes": {"Fraud": 0.35, "Cybercrime": 0.3, "Theft": 0.25, "Robbery": 0.1},
    },
    "Lucknow": {
        "lat": 26.847, "lng": 80.947,
        "hour_weights": [0.1, 0.35, 0.4, 0.15],
        "crimes": {"Robbery": 0.4, "Theft": 0.3, "Assault": 0.2, "Fraud": 0.1},
    },
    "Jaipur": {
        "lat": 26.912, "lng": 75.787,
        "hour_weights": [0.15, 0.25, 0.4, 0.2],
        "crimes": {"Theft": 0.45, "Fraud": 0.25, "Robbery": 0.2, "Cybercrime": 0.1},
    },
}

HOUR_BUCKETS = [
    (0,  5,  "12 AM – 6 AM",  "Late Night"),
    (6,  11, "6 AM – 12 PM",  "Morning"),
    (12, 17, "12 PM – 6 PM",  "Afternoon"),
    (18, 23, "6 PM – 12 AM",  "Evening/Night"),
]

HOUR_BUCKET_LABELS = ["Late Night", "Morning", "Afternoon", "Evening/Night"]


# ── Helpers ──────────────────────────────────────────────────

def hour_bucket(time_str: str) -> int:
    """Parse '08:30 PM' or '20:30' → hour int 0-23."""
    if not time_str:
        return 12
    parts = str(time_str).strip().split()
    t = parts[0]
    try:
        h, *_ = t.split(":")
        hour = int(h) % 24
        if len(parts) > 1 and parts[-1].upper() == "PM" and hour < 12:
            hour = (hour + 12) % 24
        if len(parts) > 1 and parts[-1].upper() == "AM" and hour == 12:
            hour = 0
        return hour
    except Exception:
        return 12


def hour_to_bucket_idx(hour: int) -> int:
    for idx, (start, end, _, _) in enumerate(HOUR_BUCKETS):
        if start <= hour <= end:
            return idx
    return 3  # default evening


def hour_to_time_window(hour: int) -> str:
    for start, end, label, _ in HOUR_BUCKETS:
        if start <= hour <= end:
            return label
    return "6 PM – 12 AM"


def _encode_crime(ct: str) -> int:
    try:
        return CRIME_LABELS.index(ct)
    except ValueError:
        return 0


def _risk_from_count(c: int) -> int:
    if c >= 8:
        return 2
    if c >= 3:
        return 1
    return 0


def _proba_to_score(proba: np.ndarray, pred_class: int) -> int:
    """Convert RF probability vector to 0-100 risk score."""
    # Weight classes: Low=0, Med=1, High=2
    weighted = 0.0 * proba[0] + 50.0 * proba[1] + 100.0 * proba[2]
    # Ensure monotonicity: higher predicted class → higher base score
    base = {"0": 15, "1": 50, "2": 80}.get(str(pred_class), 50)
    raw = 0.6 * weighted + 0.4 * base
    return int(min(100, max(0, round(raw))))


def _score_to_level(score: int) -> str:
    if score >= 71:
        return "High"
    if score >= 31:
        return "Medium"
    return "Low"


# ── Synthetic data generation ──────────────────────────────

def _weighted_choice(choices: Dict[str, float]) -> str:
    names = list(choices.keys())
    weights = list(choices.values())
    return random.choices(names, weights=weights, k=1)[0]


def generate_synthetic_rows(n: int = 2500) -> List[Dict[str, Any]]:
    """Generate realistic synthetic crime records seeded by city profiles."""
    rng = random.Random(42)
    rows = []
    cities = list(CITY_PROFILES.items())
    for _ in range(n):
        city_name, profile = rng.choice(cities)
        bucket_idx = rng.choices(range(4), weights=profile["hour_weights"], k=1)[0]
        start_h, end_h = HOUR_BUCKETS[bucket_idx][0], HOUR_BUCKETS[bucket_idx][1]
        hour = rng.randint(start_h, end_h)
        dow = rng.randint(0, 6)
        crime = _weighted_choice(profile["crimes"])
        # Add lat/lng jitter
        lat = profile["lat"] + rng.gauss(0, 0.04)
        lng = profile["lng"] + rng.gauss(0, 0.04)
        rows.append({
            "region": city_name,
            "hour": hour,
            "dow": dow,
            "bucket": bucket_idx,
            "crime": crime,
            "crime_idx": CRIME_LABELS.index(crime) if crime in CRIME_LABELS else 0,
            "lat": lat,
            "lng": lng,
            "is_group": rng.random() > 0.7,
        })
    return rows


# ── Trained model store ──────────────────────────────────────

@dataclass
class TrainedPredictor:
    clf_risk: RandomForestClassifier          # predicts Low/Med/High (0/1/2)
    clf_crime: RandomForestClassifier         # predicts crime type index
    le_region: LabelEncoder
    kmeans: KMeans
    cluster_risk: Dict[int, float]            # cluster_id → avg risk class (0-2)
    region_crime_dist: Dict[str, Counter]     # region → Counter of crime types
    synthetic_rows: List[Dict[str, Any]]
    region_index: Dict[str, int] = field(default_factory=dict)


_GLOBAL_PREDICTOR: Optional[TrainedPredictor] = None


def _build_predictor(db_rows: List[Any]) -> TrainedPredictor:
    synthetic = generate_synthetic_rows(2500)

    # Combine DB rows with synthetic
    all_rows: List[Dict[str, Any]] = list(synthetic)
    region_freq: defaultdict[str, int] = defaultdict(int)

    for row in db_rows:
        reg = row.region or "Unknown"
        region_freq[reg] += 1

    for row in db_rows:
        reg = row.region or "Unknown"
        h = hour_bucket(row.time or "")
        dow = 0
        try:
            if row.created_at:
                dow = row.created_at.weekday()
        except Exception:
            pass
        bucket = hour_to_bucket_idx(h)
        crime = row.crime_type or "Theft"
        crime_idx = _encode_crime(crime)
        count = region_freq[reg]
        risk_cls = _risk_from_count(count)
        all_rows.append({
            "region": reg,
            "hour": h,
            "dow": dow,
            "bucket": bucket,
            "crime": crime,
            "crime_idx": crime_idx,
            "lat": row.latitude or CITY_PROFILES.get(reg, {"lat": 20.0})["lat"],
            "lng": row.longitude or CITY_PROFILES.get(reg, {"lng": 78.0})["lng"],
            "is_group": (row.actor_type or "").lower() == "group",
            "_risk_cls": risk_cls,
        })

    # Build region-level stats
    region_crime_dist: Dict[str, Counter] = defaultdict(Counter)
    for r in all_rows:
        region_crime_dist[r["region"]][r["crime"]] += 1

    # Encode regions
    le_region = LabelEncoder()
    all_regions = [r["region"] for r in all_rows]
    le_region.fit(all_regions)

    # Compute region frequency from combined set
    region_counts: Counter = Counter(all_regions)

    # Build feature matrix
    X_list, y_risk, y_crime = [], [], []
    coords = []

    for r in all_rows:
        reg_enc = int(le_region.transform([r["region"]])[0])
        cnt = region_counts[r["region"]]
        # Determine risk class
        risk_cls = r.get("_risk_cls", _risk_from_count(cnt))
        X_list.append([
            reg_enc,
            r["hour"],
            r["dow"],
            r["bucket"],
            r["crime_idx"],
            1.0 if r["is_group"] else 0.0,
            min(cnt, 200),
        ])
        y_risk.append(risk_cls)
        y_crime.append(r["crime_idx"])
        coords.append([r["lat"], r["lng"]])

    X = np.array(X_list, dtype=np.float32)
    Y_risk = np.array(y_risk, dtype=np.int32)
    Y_crime = np.array(y_crime, dtype=np.int32)
    coords_arr = np.array(coords, dtype=np.float32)

    # Train RF classifiers
    clf_risk = RandomForestClassifier(
        n_estimators=120, max_depth=8, random_state=42,
        class_weight="balanced_subsample", n_jobs=-1,
    )
    clf_risk.fit(X, Y_risk)

    clf_crime = RandomForestClassifier(
        n_estimators=80, max_depth=6, random_state=42,
        class_weight="balanced_subsample", n_jobs=-1,
    )
    clf_crime.fit(X[:, :4], Y_crime)  # region, hour, dow, bucket → crime type

    # KMeans clustering on lat/lng
    n_clusters = min(15, max(5, len(all_rows) // 150))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(coords_arr)

    # Compute per-cluster average risk
    cluster_risk_scores: defaultdict[int, List[float]] = defaultdict(list)
    for lbl, risk in zip(cluster_labels, Y_risk):
        cluster_risk_scores[lbl].append(float(risk))
    cluster_risk = {k: float(np.mean(v)) for k, v in cluster_risk_scores.items()}

    region_index = {r: int(le_region.transform([r])[0]) for r in le_region.classes_}

    return TrainedPredictor(
        clf_risk=clf_risk,
        clf_crime=clf_crime,
        le_region=le_region,
        kmeans=kmeans,
        cluster_risk=cluster_risk,
        region_crime_dist=region_crime_dist,
        synthetic_rows=synthetic,
        region_index=region_index,
    )


def _get_predictor(db: Session) -> TrainedPredictor:
    global _GLOBAL_PREDICTOR
    if _GLOBAL_PREDICTOR is None:
        db_rows = db.query(
            Report.region, Report.crime_type, Report.time, Report.actor_type,
            Report.latitude, Report.longitude, Report.created_at,
        ).all()
        _GLOBAL_PREDICTOR = _build_predictor(db_rows)
    return _GLOBAL_PREDICTOR


def invalidate_predictor() -> None:
    """Call after inserting new reports so the model is retrained on next request."""
    global _GLOBAL_PREDICTOR
    _GLOBAL_PREDICTOR = None


# ── Public API ───────────────────────────────────────────────

def predict_crime_risk(
    db: Session,
    region: str,
    hour: int,
    day_of_week: int,
    crime_type: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Dict[str, Any]:
    """Full prediction with risk_score, risk_level, predicted_crime, time_window, hotspot."""
    pred = _get_predictor(db)

    # Encode region (fallback to nearest known)
    known_regions = list(pred.le_region.classes_)
    if region not in known_regions:
        region = known_regions[0] if known_regions else "Mumbai"
    reg_enc = int(pred.le_region.transform([region])[0])

    bucket = hour_to_bucket_idx(hour)
    crime_idx = _encode_crime(crime_type) if crime_type else 0

    X = np.array([[
        reg_enc, hour, day_of_week, bucket, crime_idx, 0.0,
        float(pred.region_index.get(region, 0)),
    ]], dtype=np.float32)

    proba = pred.clf_risk.predict_proba(X)[0]
    # Pad to 3 classes if needed
    n_cls = len(proba)
    if n_cls == 1:
        proba = np.array([proba[0], 0.0, 0.0])
    elif n_cls == 2:
        proba = np.array([proba[0], proba[1], 0.0])

    pred_cls = int(np.argmax(proba))
    risk_score = _proba_to_score(proba, pred_cls)
    risk_level = _score_to_level(risk_score)
    time_window = hour_to_time_window(hour)

    # Predict crime type
    X_crime = np.array([[reg_enc, hour, day_of_week, bucket]], dtype=np.float32)
    crime_proba = pred.clf_crime.predict_proba(X_crime)[0]
    crime_classes = pred.clf_crime.classes_
    predicted_crime_idx = int(crime_classes[np.argmax(crime_proba)])
    predicted_crime = CRIME_LABELS[predicted_crime_idx] if 0 <= predicted_crime_idx < len(CRIME_LABELS) else "Theft"

    # Hotspot detection via KMeans
    hotspot = False
    cluster_avg_risk = 0.0
    if latitude is not None and longitude is not None:
        pt = np.array([[latitude, longitude]], dtype=np.float32)
        cluster_id = int(pred.kmeans.predict(pt)[0])
        cluster_avg_risk = pred.cluster_risk.get(cluster_id, 0.0)
        hotspot = cluster_avg_risk > 1.2 or risk_score >= 65
    else:
        # Estimate from region profile
        profile = CITY_PROFILES.get(region, {})
        if profile:
            pt = np.array([[profile.get("lat", 20.0), profile.get("lng", 78.0)]], dtype=np.float32)
            cluster_id = int(pred.kmeans.predict(pt)[0])
            cluster_avg_risk = pred.cluster_risk.get(cluster_id, 0.0)
            hotspot = cluster_avg_risk > 1.2 or risk_score >= 65

    # Build alert message
    if risk_level == "High":
        alert_message = f"⚠️ High risk of {predicted_crime} in {region} during {time_window}"
    elif risk_level == "Medium":
        alert_message = f"🟡 Moderate risk of {predicted_crime} in {region} during {time_window}"
    else:
        alert_message = f"✅ Low risk for {region} during {time_window}"

    labels = ["Low", "Medium", "High"]
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "predicted_crime": predicted_crime,
        "time_window": time_window,
        "hotspot": hotspot,
        "confidence": round(float(np.max(proba)), 3),
        "alert_message": alert_message,
        "model": "random_forest_kmeans",
        "probabilities": {labels[i]: round(float(p), 3) for i, p in enumerate(proba) if i < 3},
        "cluster_risk": round(cluster_avg_risk, 3),
    }


def crime_heatmap(db: Session, state: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return lat/lng intensity points for heatmap visualization."""
    pred = _get_predictor(db)

    # Start with synthetic rows (city profiles)
    heatmap_points: List[Dict[str, Any]] = []
    seen_cities: set = set()

    for region, profile in CITY_PROFILES.items():
        crime_dist = pred.region_crime_dist.get(region, Counter({"Theft": 5}))
        dominant = crime_dist.most_common(1)[0][0] if crime_dist else "Theft"
        total = sum(crime_dist.values())
        # Normalize intensity
        max_possible = 600
        intensity = min(1.0, total / max_possible)
        heatmap_points.append({
            "lat": profile["lat"] + random.gauss(0, 0.01),
            "lng": profile["lng"] + random.gauss(0, 0.01),
            "intensity": round(intensity, 3),
            "area": region,
            "crime_type": dominant,
            "count": total,
        })
        seen_cities.add(region)

    # Add actual DB reports
    q = db.query(Report.latitude, Report.longitude, Report.region, Report.crime_type)
    if state:
        q = q.filter(Report.state == state)
    for lat, lng, reg, ct in q.all():
        if lat is None or lng is None:
            continue
        heatmap_points.append({
            "lat": float(lat),
            "lng": float(lng),
            "intensity": 0.9,
            "area": reg or "Unknown",
            "crime_type": ct or "Theft",
            "count": 1,
        })

    return heatmap_points


def crime_time_analysis(db: Session, state: Optional[str] = None) -> Dict[str, Any]:
    """Return hourly crime distribution + peak window for time analysis."""
    pred = _get_predictor(db)
    hourly: Counter = Counter()

    # From synthetic
    for row in pred.synthetic_rows:
        hourly[row["hour"]] += 1

    # From real DB
    q = db.query(Report.time)
    if state:
        q = q.filter(Report.state == state)
    for (ts,) in q.all():
        h = hour_bucket(ts or "")
        hourly[h] += 1

    if not hourly:
        hourly = Counter({h: 10 for h in range(24)})

    hourly_list = [{"hour": h, "count": hourly.get(h, 0), "hour_label": f"{h}:00"} for h in range(24)]

    # Aggregate by bucket
    bucket_sums = [0, 0, 0, 0]
    for h, cnt in hourly.items():
        bucket_sums[hour_to_bucket_idx(h)] += cnt

    peak_idx = int(np.argmax(bucket_sums))
    peak_window = HOUR_BUCKETS[peak_idx][2]
    peak_label = HOUR_BUCKETS[peak_idx][3]

    # find peak hour
    peak_hour = max(hourly, key=hourly.get) if hourly else 20

    return {
        "peak_window": peak_window,
        "peak_label": peak_label,
        "peak_hour": peak_hour,
        "hourly": hourly_list,
        "bucket_totals": [
            {"label": HOUR_BUCKETS[i][3], "window": HOUR_BUCKETS[i][2], "count": bucket_sums[i]}
            for i in range(4)
        ],
        "summary": f"Crime peaks during {peak_label} ({peak_window})",
    }


def high_risk_zones(db: Session, state: str, top_n: int = 6) -> List[Dict[str, Any]]:
    """Top-N zones sorted by ML risk level."""
    rows = (
        db.query(Report.region, func.count(Report.id))
        .filter(Report.state == state)
        .group_by(Report.region)
        .all()
    )

    pred = _get_predictor(db)
    scored = []
    for reg, count in rows:
        result = predict_crime_risk(db, reg, 20, 4)
        scored.append({
            "region": reg,
            "reports": int(count),
            "risk_level": result["risk_level"],
            "risk_score": result["risk_score"],
            "predicted_crime": result["predicted_crime"],
            "confidence": result["confidence"],
        })

    scored.sort(
        key=lambda x: (
            {"High": 3, "Medium": 2, "Low": 1}.get(x["risk_level"], 0),
            x["risk_score"],
            x["reports"],
        ),
        reverse=True,
    )
    return scored[:top_n]


# ── Legacy shim for existing analytics_routes ────────────────

def predict_risk(
    db: Session,
    state: str,
    region: str,
    time_str: str,
    crime_type: str,
    actor_type: str,
) -> Dict[str, Any]:
    """Backward-compatible wrapper used by analytics_routes."""
    hour = hour_bucket(time_str)
    result = predict_crime_risk(db, region, hour, 4, crime_type)
    return {
        "risk_level": result["risk_level"],
        "confidence": result["confidence"],
        "model": result["model"],
        "features": {"region": region, "hour": hour, "crime_type": crime_type},
        "probabilities": result.get("probabilities", {}),
    }
