from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
import os
import random
import secrets
import smtplib
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
from sqlalchemy import func
from .db import Base, SessionLocal, User, Otp, Report, engine
from .rl_service import get_rl_zones_for_state, risk_from_frequency

# Load SMTP + other secrets from backend/.env (dotenv format, not PowerShell $env:).
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env", override=False)

# Files are stored in PostgreSQL (proof bytes). UPLOAD_DIR is kept only for backward compatibility.
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

STATE_REGIONS = {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur"],
    "Arunachal Pradesh": ["Itanagar", "Tawang", "Pasighat"],
    "Assam": ["Guwahati", "Silchar", "Dibrugarh"],
    "Bihar": ["Patna", "Gaya", "Muzaffarpur"],
    "Chhattisgarh": ["Raipur", "Bilaspur", "Durg"],
    "Goa": ["Panaji", "Margao", "Vasco da Gama"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat"],
    "Himachal Pradesh": ["Shimla", "Dharamshala", "Mandi"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad"],
    "Karnataka": ["Bangalore", "Mysore", "Mangalore"],
    "Kerala": ["Kochi", "Trivandrum", "Kozhikode"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur"],
    "Manipur": ["Imphal", "Thoubal", "Churachandpur"],
    "Meghalaya": ["Shillong", "Tura", "Jowai"],
    "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur"],
    "Sikkim": ["Gangtok", "Namchi", "Geyzing"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
    "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
    "Tripura": ["Agartala", "Dharmanagar", "Udaipur"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Haldwani"],
    "West Bengal": ["Kolkata", "Durgapur", "Siliguri"],
    "Andaman and Nicobar Islands": ["Port Blair", "Havelock", "Diglipur"],
    "Chandigarh": ["Sector 17", "Manimajra", "Chandigarh Cantt"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
    "Delhi": ["Central Delhi", "Rohini", "Dwarka"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag"],
    "Ladakh": ["Leh", "Kargil", "Nubra"],
    "Lakshadweep": ["Kavaratti", "Agatti", "Minicoy"],
    "Puducherry": ["Puducherry", "Karaikal", "Mahe"],
}

app = FastAPI(title="AI Crime Reporting Backend", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/analytics/state-heatmap")
def state_heatmap(crime_type: Optional[str] = None):
    """
    Returns crime counts per state for India map coloring.
    Optional filter by crime_type.
    """
    db = SessionLocal()
    try:
        q = db.query(Report.state, func.count(Report.id)).group_by(Report.state)
        if crime_type:
            q = q.filter(Report.crime_type == crime_type)
        rows = q.all()
        return [{"state": st, "value": int(cnt)} for (st, cnt) in rows]
    finally:
        db.close()


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    state: str


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def send_otp_email(to_email: str, otp: str) -> None:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "noreply@crime-dashboard.local")

    if not smtp_host or not smtp_user or not smtp_pass:
        print(f"[OTP] Email provider not configured. OTP for {to_email}: {otp}")
        return

    msg = EmailMessage()
    msg["Subject"] = "Your OTP for AI Crime Dashboard"
    msg["From"] = smtp_from
    msg["To"] = to_email
    msg.set_content(f"Your OTP is {otp}. It is valid for 10 minutes.")

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/states")
def states_regions():
    return STATE_REGIONS


@app.post("/auth/register")
def register_user(payload: RegisterRequest):
    if payload.state not in STATE_REGIONS:
        raise HTTPException(status_code=400, detail="Invalid state")

    db = SessionLocal()
    otp = f"{random.randint(100000, 999999)}"
    try:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        user = User(
            username=payload.username,
            email=payload.email,
            password=payload.password,
            state=payload.state,
            verified=False,
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)

        # Use timezone-aware UTC datetimes to avoid naive/aware comparison crashes.
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.add(Otp(email=payload.email, otp=otp, expires_at=expires_at, used=False))
        db.commit()
    finally:
        db.close()

    send_otp_email(payload.email, otp)
    return {"status": "otp_sent", "message": "OTP sent to email"}


@app.post("/auth/verify-otp")
def verify_otp(payload: VerifyOtpRequest):
    db = SessionLocal()
    try:
        row = (
            db.query(Otp)
            .filter(Otp.email == payload.email)
            .order_by(Otp.id.desc())
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail="OTP not found")
        if row.used:
            raise HTTPException(status_code=400, detail="OTP already used")
        if datetime.now(timezone.utc) > row.expires_at:
            raise HTTPException(status_code=400, detail="OTP expired")
        if payload.otp != row.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")

        row.used = True
        user = db.query(User).filter(User.email == payload.email).first()
        if user:
            user.verified = True
        db.commit()
    finally:
        db.close()
    return {"status": "verified", "message": "Registration complete"}


@app.post("/auth/login")
def login(payload: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == payload.email, User.password == payload.password).first()
    finally:
        db.close()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.verified:
        raise HTTPException(status_code=403, detail="Please verify OTP first")

    token = secrets.token_hex(16)
    return {
        "status": "success",
        "token": token,
        "user": {"username": user.username, "email": user.email, "state": user.state},
    }


@app.post("/report")
async def create_report(
    state: str = Form(...),
    region: str = Form(...),
    time: str = Form(...),
    crime_type: str = Form(...),
    actor_type: str = Form(...),
    weapon: str = Form(...),
    vehicle: str = Form(...),
    description: str = Form(...),
    phone: str = Form(...),
    vehicle_selection: str = Form(...),
    file: Optional[UploadFile] = File(None),
):
    file_name = None
    file_content_type = None
    file_bytes = None
    if file and file.filename:
        file_name = file.filename
        file_content_type = file.content_type
        file_bytes = await file.read()

    db = SessionLocal()
    try:
        db.add(
            Report(
                state=state,
                region=region,
                time=time,
                crime_type=crime_type,
                actor_type=actor_type,
                weapon=weapon,
                vehicle=vehicle,
                description=description,
                phone=phone,
                vehicle_selection=vehicle_selection,
                file_name=file_name,
                file_content_type=file_content_type,
                file_bytes=file_bytes,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
    finally:
        db.close()
    return {"status": "success", "message": "Submitted successfully"}


@app.get("/analytics")
def analytics(
    state: Optional[str] = None,
    region: Optional[str] = None,
    crime_type: Optional[str] = None,
    actor_type: Optional[str] = None,
):
    db = SessionLocal()
    try:
        q = db.query(Report)
        if state:
            q = q.filter(Report.state == state)
        if region:
            q = q.filter(Report.region == region)
        if crime_type:
            q = q.filter(Report.crime_type == crime_type)
        if actor_type:
            q = q.filter(Report.actor_type == actor_type)
        rows = q.all()
    finally:
        db.close()

    def to_series(counter: Counter):
        return [{"name": k, "value": v} for k, v in counter.items()]

    return {
        "crime_type": to_series(Counter(r.crime_type for r in rows)),
        "actor_type": to_series(Counter(r.actor_type for r in rows)),
        "time": to_series(Counter((r.time or "").split(" ")[0] for r in rows)),
        "region": to_series(Counter(r.region for r in rows)),
        "vehicle": to_series(Counter(r.vehicle for r in rows)),
        "total": len(rows),
    }


@app.get("/zones")
def zones(state: Optional[str] = None, mode: str = "rl"):
    """
    mode:
    - rl (default): uses OpenEnv tabular Q-learning policy trained on Postgres reports for the given `state`
    - freq: deterministic risk from frequency thresholds (no OpenEnv)
    """
    db = SessionLocal()
    try:
        if state:
            if state not in STATE_REGIONS:
                raise HTTPException(status_code=400, detail="Invalid state")

            if mode == "rl":
                return get_rl_zones_for_state(db, state, STATE_REGIONS[state])

            # Frequency fallback for a single state.
            rows = db.query(Report.region).filter(Report.state == state).all()
            frequency = defaultdict(int)
            for (rg,) in rows:
                frequency[rg] += 1
            return [
                {"state": state, "zone": rg, "risk": risk_from_frequency(frequency.get(rg, 0)), "crime_frequency": frequency.get(rg, 0)}
                for rg in STATE_REGIONS[state]
            ]

        # If no state is provided, keep response compatible: return frequency-based for all states.
        rows = db.query(Report.state, Report.region).all()
        frequency = defaultdict(int)
        for st, rg in rows:
            frequency[(st, rg)] += 1

        result = []
        for st, regions in STATE_REGIONS.items():
            for rg in regions:
                count = frequency.get((st, rg), 0)
                result.append({"state": st, "zone": rg, "risk": risk_from_frequency(count), "crime_frequency": count})
        return result
    finally:
        db.close()
