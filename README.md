# API Usage Tracker

A full-stack application to track API usage, token consumption, and billing across multiple AI provider accounts (OpenAI, Anthropic, Google) under one dashboard.

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic v2
- **Frontend**: React 18, Vite, TypeScript, TanStack Query, Recharts, Tailwind CSS
- **Database**: PostgreSQL
- **Auth**: JWT (access + refresh tokens), bcrypt passwords
- **Encryption**: Fernet symmetric encryption for API key storage
- **Background Jobs**: APScheduler for periodic usage sync

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

## Setup

### 1. Database

```bash
# Create the database
createdb api_usage_tracker
```

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate    # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your database URL and generate an ENCRYPTION_KEY:
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Run migrations
alembic upgrade head

# Seed demo data
python seed.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (proxies /api to backend)
npm run dev
```

### 4. Access the app

Open http://localhost:5173 and log in with:
- **Admin**: admin@demo.com / admin123
- **Users**: alice@demo.com, bob@demo.com, carol@demo.com / user123

## Architecture

```
Tenant
├── Departments (1..N)
│   └── Users (1..N) ─── role: admin | user
├── Projects (1..N)
│   └── Platform Keys (1..N) ─── encrypted API keys
│       ├── Usage Records ─── per-model, per-day token/cost data
│       └── Billing Snapshots ─── periodic cost summaries
└── User-Project Access ─── permission: view | manage
```

## Features

### Dashboard (all users)
- KPI cards: total tokens, cost, active keys, projects, requests
- Usage trend chart (7d/30d/90d with platform filter)
- Cost breakdown by provider (donut chart)
- Model distribution (bar chart)
- Top projects by spend
- Billing summary table

### Analytics (all users)
- Drill-down by Project, Key, Department, User
- Per-key model-level token breakdown
- Daily usage tables and charts
- User usage ranking
- CSV export

### Admin Panel (admin only)
- User CRUD with role and department assignment
- Department management
- Project management
- API key management (add via UI, encrypted storage)
- User-project access control
- Sync configuration and logs
- Manual and auto-sync triggers

## API Key Security

- API keys are entered via the admin UI over HTTPS
- Keys are encrypted with Fernet (AES-128-CBC) before storage
- The master `ENCRYPTION_KEY` is the only secret in `.env`
- Raw keys are never stored in plain text, logged, or returned to the frontend
- Keys are decrypted only in-memory during sync operations

## Supported Providers

| Provider  | Usage Sync | Billing Sync |
|-----------|-----------|--------------|
| OpenAI    | Yes       | Yes          |
| Anthropic | Yes       | Partial      |
| Google    | Partial   | No           |

<!-- activity: 2026-03-31T16:37:42 -->
