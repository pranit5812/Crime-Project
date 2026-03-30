---
title: AI Crime Reporting & Analysis Dashboard
emoji: ??
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 5173
tags:
  - openenv
  - fastapi
  - react
---

# AI Crime Reporting & Analysis Dashboard with OpenEnv Simulation

Production-ready full-stack project for crime report intake, analytics, risk-zone generation, and RL-based decision simulation.

## Project Overview

This platform combines:
- **React + Tailwind frontend** for interactive reporting and analytics
- **FastAPI backend** for report ingestion and data aggregation
- **OpenEnv RL module** to simulate a "Crime Data Processing & Decision Agent"
- **Dockerized deployment** for local/production and Hugging Face Spaces container mode

## Architecture Diagram

```text
[React Dashboard]
     |
     | HTTP (multipart/form-data + JSON)
     v
[FastAPI API] ---> [SQLite report store + uploads]
     |
     v
[Analytics + Risk Zone Generator]

[OpenEnv RL Environment] <--- [Baseline LLM Agent]
```

## Monorepo Structure

- `frontend/` React + Tailwind + Recharts + Framer Motion dashboard
- `backend/` FastAPI API and SQLite persistence
- `openenv/` RL environment (`reset`, `step`, `state`) + baseline script
- `docker/` compose setup for all services

## OpenEnv Specification

### Observation Space
- `current_reports`
- `selected_region`
- `crime_stats`
- `time_of_day`

### Action Space
- `classify_crime`
- `assign_zone`
- `escalate_case`
- `ignore_case`

### Reward Model
- `accuracy_score`
- `penalty`
- `progress_score`

Reward policy:
- +1 correct classification
- +0.5 partial match
- -1 wrong decision
- -2 invalid action
- loop penalty when same action repeats

## Tasks

1. **Task 1 (Easy):** classify crime correctly
2. **Task 2 (Medium):** assign zone risk with partial credit
3. **Task 3 (Hard):** full classify + zone + escalation pipeline

## API Usage

### `POST /report`
Multipart payload fields:
- `state`, `region`, `time`, `crime_type`, `actor_type`, `weapon`, `vehicle`
- `description`, `phone`, `numeric_input`, `vehicle_selection`
- optional `file`

### `GET /analytics`
Returns aggregated counts for charts (`crime_type`, `actor_type`, `time`, `region`).

### `GET /zones?state=...&region=...`
Returns generated risk zones based on frequency and locality.

## Local Setup

### 1) Frontend
```bash
cd frontend
npm install
npm run dev
```

### 2) Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3) OpenEnv Baseline
```bash
cd openenv
pip install -r requirements.txt
# set OPENAI_API_KEY in environment
python baseline.py
```

## Docker Run

```bash
cd docker
docker compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- OpenEnv baseline executes in `openenv` service

## Hugging Face Spaces Deployment

This repo is ready for **Docker Spaces**:
- `README.md` includes `sdk: docker`
- Containerized architecture available via `docker/` setup
- Tag used: `openenv`

Suggested deployment: expose frontend container and proxy backend via internal network or merged container build.

## Baseline Results

Baseline script prints per-step reward and final cumulative score:

```text
step=1 reward=...
step=2 reward=...
...
Baseline total score: ...
```

## UI/UX Highlights

- Glassmorphism cards with shadows and rounded corners
- Interactive India state map selection
- Dynamic region + time input controls
- Charts (Bar / Pie / Line) with live API data
- Risk-zone cards with color-coded severity
- Responsive layout for desktop/tablet/mobile
