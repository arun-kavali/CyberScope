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
- **Validation & Settings:** Pydantic v2 + Pydantic Settings
- **API Protocol:** RESTful API with CORS configuration for local frontend development

### Storage & AI Architecture (Planned for Future Phases)
- **Primary Database:** Native Local PostgreSQL (Phase 2)
- **Local AI Engine:** Ollama with Llama3 local model (Phase 16)

---

## Current Status — Phase 1: Project Foundation

We are currently at **Phase 1 (Project Foundation)**.

### What is established in Phase 1:
- [x] Complete repository directory structure
- [x] React + TypeScript + Vite frontend application shell
- [x] FastAPI backend application with modular API router structure
- [x] Light green + white enterprise visual design foundation
- [x] Backend health endpoint `GET /health` returning `{"status": "healthy", "service": "cyberscope-api"}`
- [x] TanStack Query frontend integration with real-time health status indicator
- [x] Environment configuration template (`.env.example`) and Git ignore rules (`.gitignore`)
- [x] Backend test suite verifying health endpoint

*Note: Database schemas, migrations, authentication, alert ingestion, analytics, AI integration, and response actions are scheduled for implementation in Phases 2–24.*

---

## Directory Structure

```
cyberscope/
├── frontend/             # React + TypeScript + Vite application
│   ├── src/
│   │   ├── components/   # UI components (Header, Sidebar, Badges, MetricCards)
│   │   ├── pages font/    # Router page views (HomePage, NotFoundPage)
│   │   ├── layouts/     # Application shell layout
│   │   ├── hooks font/    # Custom React / TanStack Query hooks (useHealth)
│   │   ├── services/    # API HTTP client services
│   │   ├── types/       # TypeScript type definitions
│   │   └── utils/       # Utility functions
│   └── package.json
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/          # Modular API routers (/health, /auth, /alerts, etc.)
│   │   ├── auth/         # Auth module shell
│   │   ├── models/       # Database models (Phase 2)
│   │   ├── schemas/      # Pydantic data schemas
│   │   ├── services/     # Business logic services
│   │   ├── ingestion/    # Data ingestion engine
│   │   ├── analytics font/# Detection & analytics engines
│   │   ├── correlation/  # Incident correlation engine
│   │   ├── risk/         # Risk & confidence scoring
│   │   ├── ai/           # Ollama AI intelligence integration
│   │   ├── response/     # Orchestration & response actions
│   │   ├── audit/        # Immutable audit logging
│   │   └── main.py       # FastAPI application entry point
│   ├── requirements.txt
│   └── alembic.ini
├── ml/                   # Machine learning feature pipelines & models
├── database/             # Schema definitions, seeds & migrations
├── data/                 # Sample alerts, cases, assets, and entities
├── ollama/               # Ollama model configuration scripts
├── docker/               # Container scripts (optional)
├── tests/                # Test suites (backend, frontend, integration, e2e)
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

4. Start the FastAPI development server:

```bash
# From project root
uvicorn backend.app.main:app --reload --port 8000
```

5. Verify the backend health endpoint:

Open http://localhost:8000/health in your browser or run:

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "cyberscope-api"
}
```

### 2. Frontend Setup

1. Open a new terminal window.
2. Navigate to the `frontend/` directory:

```bash
cd frontend
```

3. Install frontend dependencies:

```bash
npm install
```

4. Start the Vite development server:

```bash
npm run dev
```

5. Open http://localhost:5173 in your browser to view the CyberScope dashboard shell.

---

## Running Tests

### Backend Health Check Test

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
