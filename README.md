# CyberScope

> **"From Security Evidence to Actionable Insight"**

CyberScope is an evidence-driven cybersecurity intelligence platform that transforms security alerts and operational security evidence into prioritized, explainable insights for Security Operations Center (SOC) Analysts.

---

## Architecture & Technology Stack

CyberScope is designed with a clean, decoupled, local-first architecture ensuring offline-capable operations without requiring cloud vendor dependencies.

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (Enterprise Light Green + White Visual System)
- **Routing:** React Router (`react-router-dom`)
- **State & Data Fetching:** TanStack Query (`@tanstack/react-query`)
- **Icons:** Lucide React (`lucide-react`)
- **Visualization:** Recharts

### Backend
- **Framework:** Python + FastAPI
- **Server:** Uvicorn
- **ORM & Migrations:** SQLAlchemy 2.0 + Alembic
- **Validation & Settings:** Pydantic v2 + Pydantic Settings
- **API Protocol:** RESTful API with CORS configuration for local frontend development

### Storage & AI Architecture
- **Primary Database:** Native Local PostgreSQL 17.11 (Host: `localhost:5432`, Database: `cyberscope`)
- **Local AI Engine:** Ollama with Llama3 local model (Phase 16)

---

## Current Status — Phase 3: Database Schema & Migrations Established

We are currently at **Phase 3 (Database Schema and Migrations)**.

### What is established:
- [x] **Phase 1 Foundation:** React + Vite frontend, FastAPI backend, CORS, health endpoint.
- [x] **Phase 2 Database Foundation:** Native local PostgreSQL 17.11 connection pool, `app.db` SQLAlchemy session management, diagnostic endpoint `GET /api/v1/test/database`.
- [x] **Phase 3 Relational Schema:** Complete 38-table relational schema implemented across 7 logical domains (Identity, Sources, Evidence, Intelligence, Analytics, Response, Audit/Reports) with Alembic migration `08d35b688e91`.

*Note: Authentication, alert ingestion pipelines, analytics engines, AI integration, and response orchestration are scheduled for sequential implementation in Phases 4–24.*

---

## Database Migrations (Alembic)

Database schema management is handled via Alembic.

### Checking Migration Status
```bash
cd backend
alembic current
```

### Applying Migrations
```bash
cd backend
alembic upgrade head
```

---

## Directory Structure

```
cyberscope/
├── frontend/             # React + TypeScript + Vite application
│   ├── src/
│   │   ├── components/   # Header, Sidebar, StatusBadge, MetricCard
│   │   ├── pages/        # HomePage, NotFoundPage
│   │   ├── layouts/      # AppLayout
│   │   ├── hooks/        # useHealth
│   │   ├── services/     # API HTTP client
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/
│   └── package.json
├── backend/              # FastAPI application
│   ├── alembic/          # Alembic migration scripts and env.py
│   │   └── versions/     # Migration revision scripts (08d35b688e91)
│   ├── app/
│   │   ├── api/          # Modular API routers (/health, /test/database, etc.)
│   │   ├── db/           # SQLAlchemy engine, session maker, DeclarativeBase
│   │   ├── models/       # ORM Models (identity, sources, evidence, intelligence, analytics, response, audit)
│   │   ├── auth/         # Auth module shell (Phase 4)
│   │   ├── schemas/      # Pydantic data schemas
│   │   ├── services/     # Business logic services
│   │   └── main.py       # FastAPI application entry point
│   ├── requirements.txt
│   └── alembic.ini
├── ml/                   # Machine learning feature pipelines & models
├── database/             # Schema definitions, seeds & migrations
├── data/                 # Sample alerts, cases, assets, and entities
├── ollama/               # Ollama model configuration scripts
├── docker/               # Container scripts (optional)
├── tests/                # Test suites (test_health.py, test_database.py, test_schema.py)
├── docs/                 # Documentation
├── scripts/              # Helper & utility scripts
├── .env.example          # Development environment template
├── .gitignore
├── README.md
├── spec.md               # Product specification (Source of Truth)
├── prd.md                # Product requirements
├── design.md             # UI/UX Design system specification
└── implementationplan.md # Implementation roadmap (Phases 1-24)
```

---

## Getting Started

### 1. Backend Setup

1. Navigate to the project root directory.
2. Create and activate a Python virtual environment:

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

3. Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

4. Configure local `.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/cyberscope
```

5. Run Alembic migrations:

```bash
cd backend
alembic upgrade head
cd ..
```

6. Start the FastAPI development server:

```bash
uvicorn backend.app.main:app --reload --port 8000
```

7. Verify endpoints:
- `http://localhost:8000/health` -> `{"status": "healthy", "service": "cyberscope-api"}`
- `http://localhost:8000/api/v1/test/database` -> `{"database": "connected", "status": "healthy"}`

### 2. Frontend Setup

1. Open a new terminal window.
2. Navigate to the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```

3. Open http://localhost:5173 in your browser to view the CyberScope dashboard shell.

---

## Running Tests

```bash
# From project root with virtual environment activated
pytest tests/backend/
```

---

## Project Specification Documents

- [spec.md](spec.md) — Authoritative product specification
- [prd.md](prd.md) — Product requirements document
- [design.md](design.md) — UI/UX design direction (Light Green + White theme)
- [implementationplan.md](implementationplan.md) — Phase-by-phase development roadmap

---

## License

Enterprise Proprietary — CyberScope Security Platform.
