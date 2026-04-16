# AI-Powered Real-Time Crime Intelligence Platform

Full-stack system combining **React + Tailwind**, **FastAPI**, **WebSockets**, **scikit-learn** risk models, **OpenCV** image heuristics (optional **YOLOv8**), **OpenEnv** RL evaluation hooks, and optional **OpenAI** for chat + baseline agents.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React dashboard (Vite)                   │
│  Leaflet map · WS live alerts · voice · panic · analytics  │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST + WebSocket
┌───────────────────────────▼─────────────────────────────────┐
│                      FastAPI (`backend/app`)                 │
│  routers: auth, analytics, reports, ai, panic, chat,         │
│           notifications, realtime, openenv                   │
│  services: predict (RF), image, nlp, chat, geo, notify      │
└─────────────────────────────────────────────────────────────┘

OpenEnv (`openenv/`): `Observation`, `Action`, `Reward` + `CrimeOpenEnv.reset/step/state`
Baseline agent: `openenv/baseline.py` (OpenAI JSON tool).
```

## Features

- **Real-time**: native WebSocket `/ws/live?token=<JWT>` broadcasts `crime_report` + `panic` payloads.
- **AI prediction**: `POST /predict` and `GET /predict/zones` — RandomForest when enough data; frequency fallback otherwise.
- **Image analysis**: `POST /ai/analyze-image` — OpenCV heuristics; if `ultralytics` + `yolov8n.pt` present, YOLO augments detections.
- **Voice → structured**: browser **Web Speech API** → `POST /ai/nlp/extract`.
- **Leaflet map**: `GET /map/incidents`, heat layer, markers, live blink on WS events.
- **Analytics**: extended `GET /analytics` includes `peak_hours` bar series; region comparison chart in UI.
- **Auth**: JWT (`Authorization: Bearer`), roles `citizen | police | admin`, bcrypt passwords for new users; legacy plaintext upgraded on login.
- **Panic**: `POST /panic/` (auth required) — GPS + optional camera snapshot; notifies police/admin users.
- **Chatbot**: `POST /chat/` — OpenAI when `OPENAI_API_KEY` set; else grounded on DB aggregates.
- **Report tracking**: `GET /reports/tracking`, `PATCH /reports/{public_id}/status` (police/admin).
- **Notifications**: `GET /notifications`, `POST /notifications/{id}/read`.
- **OpenEnv HTTP**: `/openenv/reset`, `/openenv/step`, `/openenv/state`, `/openenv/dataset`.
- **UX**: dark/light toggle, skeleton loaders, Framer Motion, toast + live alert feed.

## Hugging Face Spaces (`openenv` tag)

Use this repo on a **Docker** Space: the `Dockerfile` exposes the API on port **8000**. For a GPU image-analysis variant, extend the image with `ultralytics` and cache `yolov8n.pt` in the Space build. Tag releases with `openenv` for the MCP card.

## Environment

### Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | `sqlite:///./crime_reports.db` (default) or Postgres DSN |
| `JWT_SECRET` | **Required in production** (32+ chars) |
| `OPENAI_API_KEY` | Enables `/chat` + `openenv/baseline.py` |
| `OPENAI_MODEL` | Default `gpt-4o-mini` |
| `POLICE_REGISTER_SECRET` | Secret for `role=police` self-registration |
| `ALLOW_OPEN_POLICE_REGISTER` | `true` to allow police signup without secret |
| `SMTP_*` | OTP email (optional) |

### Frontend

- `VITE_API_BASE` — API origin (default `http://localhost:8000`)
- `VITE_WS_BASE` — WebSocket origin (default `ws://localhost:8000`)

## Run locally

```bash
# Backend
cd backend
python -m venv .venv
. .venv/Scripts/activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Docker

```bash
docker build -t crime-intelligence .
docker run -p 8000:8000 crime-intelligence
```

Serve the Vite `frontend/dist` via any static host or reverse-proxy to the API.

## OpenEnv specification

- **Observation**: `current_reports`, `selected_region`, `crime_stats`, `time_of_day`
- **Action**: `classify_crime`, `assign_zone`, `escalate_case`, `ignore_case`
- **Reward**: `accuracy_score`, `penalty`, `progress_score` — combined scalar in `step`
- **API**: see `/openenv/*` routes

### Baseline scores

```bash
cd openenv
pip install openai python-dotenv
export OPENAI_API_KEY=...
python baseline.py
```

## API quick reference

- `POST /auth/register` · `POST /auth/verify-otp` · `POST /auth/login`
- `POST /report` (multipart, optional Bearer for `user_email` linkage)
- `GET /analytics` · `GET /analytics/state-heatmap` · `GET /zones`
- `GET /map/incidents` · `GET /map/region-stats` · `GET /geo/hint`
- `POST /predict` · `GET /predict/zones`
- `POST /ai/analyze-image` · `POST /ai/nlp/extract`
- `POST /panic/` · `POST /chat/`
- `GET /notifications/*` · WebSocket `/ws/live`

## Security notes

- Change `JWT_SECRET`, use Postgres in production, TLS terminate at your edge proxy.
- Image / panic features require explicit user consent for camera and location.
- Police workflows should be audited; this codebase is a **starting point** for integration with real dispatch systems.

## License

MIT (adapt as needed for your deployment).
