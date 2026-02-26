# Agentic Transformation Workbench (ATW)

A consultant-facing intelligence platform that operationalises the EPAM Agentic Transformation Framework. ATW turns raw, unstructured inputs into structured agent designs, architecture diagrams, roadmaps, and business cases — accelerating discovery and improving consistency across engagements.

This repo is the source of truth for the product implementation. The conceptual ground truth is in `CLAUDE.md`.

## What ATW Is
- An engagement-centric workspace for agentic transformation work
- A dual‑stream discovery engine that extracts **Lived JTDs (tasks)** and **Cognitive JTDs (reasoning)**
- A structured agent design system that generates architecture diagrams and Agent Requirements Documents (ARDs)
- A business‑case engine (in active development) that composes token economics and ROI from the agent spec

## What ATW Is Not
- A replacement for Miro, PowerPoint, or Excel
- A prompt engineering or calibration platform
- A client‑facing product (v1 is consultant‑only)

## How It Works (Functional Flow)
1. **Create Engagements and Use Cases**
   - Each engagement contains one or more use cases to transform.
2. **Discovery (Dual‑Stream Extraction)**
   - Ingest raw inputs: text, documents, transcripts, images.
   - Extract Lived JTDs (tasks) and Cognitive JTDs (reasoning) independently.
3. **Delegation Clusters + Suitability**
   - Combine the two streams into delegation clusters.
   - Score clusters across cognitive‑load dimensions to recommend delegation modes.
4. **Agentic Design**
   - Translate clusters into agent specs, inputs, tool stacks, outputs, and HITL design.
5. **Outputs**
   - Agent Architecture Diagram (React Flow)
   - Agent Requirements Document (ARD)
   - Agentic Roadmap (multi‑agent matrix)
   - Business Case (token economics + ROI) — **in development**

## Architecture
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, Zustand, React Query, React Flow
- **Backend**: FastAPI (async), Pydantic, SQLAlchemy, Alembic
- **AI**: Anthropic Claude API (tool use + multimodal)
- **Storage**: PostgreSQL + pgvector
- **Infra**: Docker Compose

## Repo Layout
- `backend/`: FastAPI app, agents, services, schemas, persistence
- `frontend/`: React app, modules, components, state
- `docker-compose.yml`: dev stack (db + backend + frontend)
- `CLAUDE.md`: product vision, constraints, and detailed specs

## Quickstart (Docker)
1. Configure environment:
   - Copy and edit `./.env.example` to `./.env` if needed.
   - Set `ANTHROPIC_API_KEY`.
2. Start the stack:
   - `docker compose up --build`
3. Open the app:
   - Frontend: `http://localhost:5173`
   - Backend health: `http://localhost:8000/health`
   - FastAPI docs: `http://localhost:8000/docs`

## Environment Configuration
Key variables (see `./.env.example`):
- `DATABASE_URL` (asyncpg)
- `ANTHROPIC_API_KEY`
- `LLM_REASONING_MODEL`, `LLM_FAST_MODEL` (configurable; do not hardcode)
- `CORS_ORIGINS`

## Development Notes
- Migrations are managed by Alembic (`backend/alembic`).
- Business Case UI is currently deactivated; model work continues server‑side.
- Do not violate constraints in `CLAUDE.md` (e.g., no prompt‑engineering features).

## Updating Documentation
This project changes quickly. Update this README and `CLAUDE.md` as the product evolves. For functional accuracy, defer to `CLAUDE.md` when in doubt.

---

If you want a deeper, module‑level specification or a formal “solution overview” doc for stakeholders, say the word and I’ll generate it.
