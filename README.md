# HealthTracker

A PWA health tracker for logging medications and illnesses with a single tap.

## Features

- Multi-user support (no passwords — pick your profile at startup)
- One-tap logging for medications and illnesses
- Crisis tracking (e.g. ADHD): one-tap timer or past entry with intensity, duration, category, description, trigger and what helped
- Habit-change markers with a weekly trend chart and before/after comparison
- Calendar view with colored event dots
- Statistics (7-day, 30-day, all-time counts)
- PWA installable on mobile devices
- Admin panel for managing users

## Stack

- **Backend**: Python FastAPI + SQLAlchemy + SQLite
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v3
- **Deploy**: Docker Compose (backend + nginx/frontend)

## Run with Docker Compose

```bash
docker-compose up --build
```

The app will be available at http://localhost

## Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:8000`.

## Data

The SQLite database is persisted in the `./data/` directory (mounted as a Docker volume).

On first startup, a default **Admin** user is created with one sample medication (Tachipirina) and illness (Tosse).

## Adding users

Log in as Admin, go to the **Admin** tab, and create additional users.
