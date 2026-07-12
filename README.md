# FinLens — Competitor Margin Intelligence Dashboard

A full-stack web application that visualises competitor pricing vs your own margin data — the join that no BI tool can do.

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11 + FastAPI + openpyxl |
| Frontend | Vanilla HTML / CSS / JS (no framework) |
| Deploy | Render (backend as Web Service, frontend as Static Site) |

---

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Then open `http://localhost:8000/api/health` — should return `{"status":"ok"}`.

### Frontend
Open `frontend/index.html` directly in your browser.

The frontend auto-detects `localhost` and hits `http://localhost:8000`.

---

## Deployment on Render

### Step 2 — Backend Web Service
1. Render → **New → Web Service** → connect this repo
2. **Root Directory**: `backend`
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Instance type: **Free**

### Step 3 — Frontend Static Site
1. Render → **New → Static Site** → connect this repo
2. **Root Directory**: `frontend`
3. **Build Command**: *(leave blank)*
4. **Publish Directory**: `./`
