"""
Crime Prediction Routes
POST /predict-crime      → Full ML prediction (risk score, crime type, hotspot, alert)
GET  /crime-heatmap      → Lat/lng intensity data for Leaflet heatmap
GET  /crime-time-analysis → Hourly pattern + peak window
"""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..deps import get_db
from ..services.predict_service import (
    crime_heatmap,
    crime_time_analysis,
    predict_crime_risk,
)
from ..services.ws_hub import hub

router = APIRouter(tags=["prediction"])


# ── Schemas ──────────────────────────────────────────────────

class PredictRequest(BaseModel):
    latitude: Optional[float] = Field(None, description="GPS latitude (optional)")
    longitude: Optional[float] = Field(None, description="GPS longitude (optional)")
    area: str = Field("Mumbai", description="City / region name")
    hour: int = Field(20, ge=0, le=23, description="Hour of day (0–23)")
    day_of_week: int = Field(4, ge=0, le=6, description="Day 0=Mon … 6=Sun")
    crime_type: Optional[str] = Field(None, description="Hint crime type")


class PredictResponse(BaseModel):
    risk_score: int
    risk_level: str
    predicted_crime: str
    time_window: str
    hotspot: bool
    confidence: float
    alert_message: str
    model: str
    probabilities: dict
    cluster_risk: float


# ── Endpoints ────────────────────────────────────────────────

@router.post("/predict-crime", response_model=PredictResponse)
async def predict_crime(
    body: PredictRequest,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Full crime risk prediction.
    Returns risk_score (0–100), risk_level, predicted_crime, time_window, hotspot flag.
    If risk_score > 75 the result is also broadcast via WebSocket to all connected clients.
    """
    try:
        result = predict_crime_risk(
            db=db,
            region=body.area,
            hour=body.hour,
            day_of_week=body.day_of_week,
            crime_type=body.crime_type,
            latitude=body.latitude,
            longitude=body.longitude,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    # Real-time alert broadcast for high-risk predictions
    if result["risk_score"] > 75:
        await hub.broadcast(
            {
                "type": "crime_alert",
                "risk_score": result["risk_score"],
                "risk_level": result["risk_level"],
                "predicted_crime": result["predicted_crime"],
                "area": body.area,
                "time_window": result["time_window"],
                "hotspot": result["hotspot"],
                "alert_message": result["alert_message"],
            }
        )

    return result


@router.get("/crime-heatmap")
def get_crime_heatmap(
    db: Annotated[Session, Depends(get_db)],
    state: Optional[str] = None,
):
    """
    Returns lat/lng intensity points for heatmap visualization.
    Each point: {lat, lng, intensity (0-1), area, crime_type, count}
    """
    try:
        return crime_heatmap(db, state=state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Heatmap generation failed: {exc}") from exc


@router.get("/crime-time-analysis")
def get_crime_time_analysis(
    db: Annotated[Session, Depends(get_db)],
    state: Optional[str] = None,
):
    """
    Returns hourly crime distribution + peak window summary.
    Response: {peak_window, peak_label, hourly: [{hour, count}], summary}
    """
    try:
        return crime_time_analysis(db, state=state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Time analysis failed: {exc}") from exc
