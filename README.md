# API Usage Tracker v2

Centralized dashboard for tracking API usage, token consumption, and billing across OpenAI, Anthropic, and Google Gemini accounts.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Language**: TypeScript (full-stack)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v5 (credentials + JWT + RBAC)
- **UI**: shadcn/ui + Tailwind CSS + Recharts
- **Encryption**: AES-256-GCM for stored API keys

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker run -d --name api_tracker_pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=api_usage_tracker_v2 \
  -p 5433:5432 \
  postgres:16
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your values (defaults work for local dev)
```

### 4. Setup database

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Login Credentials (Demo)

| Role  | Email             | Password  |
|-------|-------------------|-----------|
| Admin | admin@demo.com    | admin123  |
| User  | alice@demo.com    | user123   |
| User  | bob@demo.com      | user123   |
| User  | carol@demo.com    | user123   |
| User  | dave@demo.com     | user123   |

## Pages

| Route        | Description                                                    |
|--------------|----------------------------------------------------------------|
| `/login`     | Email/password authentication                                  |
| `/dashboard` | KPI cards, usage trends, cost breakdown, model distribution    |
| `/analytics` | Drill-down by Project, Key, Department, User with model tables |
| `/admin`     | Manage users, departments, projects, API keys, sync & logs     |

## Features

- **Multi-provider**: OpenAI, Anthropic, Google Gemini under one roof
- **Admin Key Discovery**: Auto-discover child API keys from org admin keys
- **Real Usage APIs**: Pulls data from provider usage/cost APIs
- **Dashboard**: Interactive charts with time range and platform filters
- **Analytics**: Tabbed drill-down with model-level breakdown tables and CSV export
- **Encryption**: API keys stored with AES-256-GCM encryption
- **RBAC**: Admin and user roles with per-project access control
