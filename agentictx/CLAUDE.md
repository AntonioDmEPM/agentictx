# Agentic Transformation Workbench — CLAUDE.md
> Ground truth for every architectural, design, and implementation decision.
> Read this fully before writing any code, creating any file, or making any structural decision.

---

## 1. Vision

The **Agentic Transformation Workbench** (ATW) is a consultant-facing intelligence platform that operationalises the EPAM Agentic Transformation Framework.

It replaces a fragmented set of passive tools — PowerPoint, Miro boards, Excel spreadsheets — not by replicating their canvas capabilities, but by becoming the **active intelligence layer** that connects, structures, and generates the analytical outputs those tools currently produce manually.

The workbench is **proactive and assistive**. It does not wait for consultants to fill in forms. It listens, extracts, challenges, suggests, and generates. It reduces the cognitive burden on the consultant while dramatically increasing the quality, consistency, and speed of the analysis.

### What the workbench is
- A structured knowledge store for every client engagement
- An AI-powered analysis engine that processes raw, unstructured input
- A generator of two primary deliverables: Agent Requirements Documents and Business Case Spreadsheets
- A multimodal platform: it accepts text, documents, transcripts, and images (including screenshots of Miro boards and PowerPoint slides)
- A consultant augmentation tool — it makes the consultant smarter, faster, and more consistent

### What the workbench is not
- Not a replacement for Miro, PowerPoint, or Excel as visual/creative tools — those remain the consultant's freeform workspace; the workbench is the intelligence beneath them
- Not a prompt engineering tool — prompt design happens in the agentic platform
- Not a context engineering tool — context engineering happens in MCP servers
- Not a calibration platform — agent calibration (accuracy, precision, sigma tuning) happens in the agentic platform after deployment
- Not a client-facing tool — version 1 is exclusively for EPAM consultants

### The core philosophy
Agentic AI is most valuable when applied to processes dominated by **cognitive ambiguity** — where humans spend effort handling exceptions, interpreting incomplete information, and making judgment calls that no deterministic system can replicate. The workbench exists to identify exactly those moments, map them with precision, and translate them into agent designs that are economically justified and operationally reliable.

---

## 2. The Agentic Transformation Framework

The workbench operationalises a six-stage framework. Stages 1–4 are in scope for the workbench. Stages 5–6 belong to the agentic platform.

### Stage 1 — Cognitive Load Mapping ✅ IN SCOPE
Map the lived process — not the documented one. Identify cognitive requirements, zones, breakpoints, and tasks (Jobs To Be Done). Distinguish high-load from low-load cognitive activities. Flag the abrasive steps where humans spend disproportionate mental effort.

**Key principle**: The documented process describes what people *should* do. The lived process describes what they *actually* do, including how they navigate exceptions, resolve ambiguity, and adapt to unpredictable inputs. The workbench targets the lived process.

**JTD layers — critical distinction**:
- **Lived JTDs**: What humans actually do, including all system-driven friction (filling field A, uploading to system B, describing in system C). These are artifacts of the environment.
- **Cognitive JTDs**: The underlying mental work stripped of system friction. One cognitive judgment may manifest as five lived JTDs.
- The translation between Lived JTDs → Cognitive JTDs → Delegation Clusters is the core IP of the framework. The workbench must assist and preserve this translation explicitly.

**Cognitive Load Dimensions** (used in suitability assessment):
- Cognitive Load intensity
- Input Data Structure
- Actionability / Tool Coverage
- Decision Determinism
- Risk & Compliance Sensitivity
- Context Complexity
- Exception Rate
- Turn-Taking Complexity
- Latency Constraints

Each dimension is scored 0–3 (Not Suitable → High Suitability).

### Stage 2 — Agentic Mapping ✅ IN SCOPE
Define an agent for each delegation cluster. For each agent, specify:
- Purpose and objectives
- Activities and tasks (full delegation vs. supervised)
- Autonomy level (full delegation / supervised execution / assisted mode)
- Required systems, data sources, APIs, MCP servers
- Input definition (format, source, trigger)
- Output definition (format, destination)
- Human-in-the-loop design
- Compliance and regulatory constraints

**Delegation cluster logic**: A delegation cluster is a set of Cognitive JTDs that share sufficient purpose and context to be handled by a single agent in a single interaction. Clustering must be validated against: cognitive coherence, data availability, tool coverage, and compliance risk.

### Stage 3 — Compliance & Regulatory Assessment ✅ IN SCOPE
For each agent:
- EU AI Act risk classification (Minimal / Limited / High / Prohibited)
- GDPR implications
- HITL requirements
- Auditability and traceability requirements
- Behavioural and operational guardrail requirements
- Deployer obligations

### Stage 4 — Business Case ✅ IN SCOPE
Produce a complete, scenario-based financial model per use case (or set of use cases). See Section 5 for full specification.

### Stage 5 — Value Calibration ❌ OUT OF SCOPE (agentic platform)
Statistical evaluation of agent accuracy and precision through large-volume testing. Normal distribution / sigma analysis. Prompt and context optimisation based on measured performance.

### Stage 6 — Deploy & Optimise ❌ OUT OF SCOPE (agentic platform)
Production deployment, observability, telemetry, continuous improvement.

---

## 3. System Architecture

### 3.1 High-Level Structure

```
ATW
├── Engagement Layer          # Client engagements, use cases, versioning
├── Discovery Module          # Cognitive load mapping, JTD extraction
├── Agentic Design Module     # Agent specification, delegation mapping
├── Business Case Module      # Token economics, ROI model, scenario comparison
└── Output Generator          # Requirements documents, Excel business cases
```

### 3.2 Agent Architecture (Internal to ATW)

The workbench runs multiple specialised agents underneath. Each has a distinct role:

**Discovery Agent**
- Processes raw inputs: transcripts, documents, images, notes
- Extracts Lived JTDs from unstructured content
- Proposes collapse of Lived JTDs → Cognitive JTDs
- Asks targeted clarifying questions to surface ambiguity
- Does NOT ask "describe your process" — asks "what happens when X goes wrong", "where do you spend most time thinking", "when does the documented process not fit reality"
- Flags cognitive load indicators: high-effort steps, exception frequency, judgment-heavy decisions
- Builds and maintains the cognitive map progressively

**Suitability Agent**
- Scores each cognitive task / cluster against the 9 suitability dimensions
- Proposes delegation mode (full / supervised / assisted)
- Flags compliance risks
- Identifies where cognitive load is high but suitability is low (human-only zones)

**Agentic Design Agent**
- Translates validated delegation clusters into agent specifications
- Proposes MCP server requirements, data source mappings, tool integrations
- Generates draft Agent Requirements Documents
- Identifies shared resources across agents (cross-agent efficiency opportunities)

**Business Case Agent**
- Composes token economics from use case modality profile
- Runs 48-month financial model
- Produces multi-scenario comparison (Current / Preferred / Microsoft-only or client-defined scenarios)
- Calculates FTE impact, coverage ramp, break-even, cumulative savings
- Generates populated Excel output

**Orchestrator**
- Routes between agents based on context
- Maintains engagement state
- Ensures data flows correctly between modules
- Surfaces the right agent to the consultant at the right moment

### 3.3 Data Model

```
Engagement
├── id, client_name, created_at, status
├── Use Cases[]
│   ├── id, name, description, status
│   ├── Raw Inputs[]
│   │   ├── type: transcript | document | image | note
│   │   ├── content / file_reference
│   │   └── processed: bool
│   ├── Cognitive Map
│   │   ├── Lived JTDs[]
│   │   │   ├── id, description, system_context, cognitive_load_score
│   │   │   └── linked_cognitive_jtd_id
│   │   ├── Cognitive JTDs[]
│   │   │   ├── id, description, cognitive_zone, load_intensity
│   │   │   └── constituent_lived_jtd_ids[]
│   │   └── Delegation Clusters[]
│   │       ├── id, name, purpose
│   │       ├── cognitive_jtd_ids[]
│   │       └── suitability_scores{dimension: score}
│   ├── Agent Specifications[]
│   │   ├── id, name, purpose, autonomy_level
│   │   ├── delegation_cluster_id
│   │   ├── activities[]
│   │   ├── data_sources[]
│   │   ├── mcp_servers[]
│   │   ├── tools[]
│   │   ├── input_definition{}
│   │   ├── output_definition{}
│   │   ├── hitl_design{}
│   │   └── compliance{}
│   ├── Modality Profile
│   │   ├── has_voice: bool
│   │   ├── has_realtime_audio: bool
│   │   ├── has_image_processing: bool
│   │   ├── has_text_only: bool
│   │   ├── stt_service, tts_service, llm_model
│   │   └── ivr_service
│   └── Business Case
│       ├── assumptions{}
│       ├── scenarios[]
│       └── outputs{}
```

### 3.4 Technology Stack

**Frontend**
- React with TypeScript
- Tailwind CSS (utility classes only — no custom CSS framework)
- Zustand for state management
- React Query for server state
- No component library — build custom components to design spec

**Backend**
- Python with FastAPI
- Async throughout
- Pydantic for data validation and schema definition

**AI / Agent Layer**
- Anthropic Claude API (claude-sonnet-4-5 for reasoning-heavy tasks, claude-haiku-4-5 for fast extraction)
- Structured outputs via tool use / function calling
- Multi-turn conversation management per module
- Vision capability for image processing (Miro screenshots, PowerPoint images)

**Storage**
- PostgreSQL for structured engagement data
- File storage for raw inputs (local filesystem in dev, S3-compatible in production)
- Vector store for semantic search across engagement history (pgvector)

**Infrastructure**
- Docker Compose for local development
- Environment-based configuration
- No cloud-specific dependencies in v1

---

## 4. Module Specifications

### 4.1 Engagement Management

The outer shell. Every piece of work lives inside an engagement.

**Capabilities**:
- Create / archive engagements (client name, industry, engagement type)
- Create multiple use cases per engagement
- Track status of each use case through the framework stages
- Version control on key artefacts (cognitive map, agent specs, business case)
- Dashboard view: all engagements, status, last updated

**UI pattern**: Left sidebar with engagement/use case tree. Main canvas changes based on active module.

### 4.2 Discovery Module

The entry point for every use case. Accepts any form of raw input and converts it into a structured cognitive map.

**Input types accepted**:
- Plain text (interview notes, process descriptions)
- Uploaded documents (PDF, DOCX, TXT)
- Uploaded images (Miro board screenshots, PowerPoint slide photos, whiteboard photos, process diagrams)
- Structured note-taking within the workbench

**Interaction model**:
The Discovery module has two panels side by side.

Left panel — **Input & Conversation**: The consultant drops in raw material or types directly. The Discovery Agent responds, asks questions, surfaces observations, flags gaps. This is a structured conversation, not a form.

Right panel — **Emerging Cognitive Map**: As the conversation progresses, the cognitive map builds in real time. Lived JTDs appear, get collapsed into Cognitive JTDs, get grouped into emerging clusters. The consultant can drag, rename, merge, split items. The map is always editable.

**Discovery Agent behaviour**:
- Never asks generic questions ("tell me about your process")
- Always asks specific, probing questions that surface the lived reality
- Example prompts the agent uses:
  - "You mentioned the claims handler checks three systems — what happens when those systems show conflicting data?"
  - "Where in this process do you see the most re-work or escalations?"
  - "What would a junior person get wrong that an experienced person gets right?"
  - "What information do people need that isn't in the documented process?"
- After processing an image: explicitly states what it extracted, asks for confirmation, asks what's missing
- Tracks unresolved ambiguities and surfaces them proactively

**JTD Translation flow**:
1. Raw input processed → Lived JTDs extracted (shown in amber)
2. Agent proposes Cognitive JTD groupings (shown in blue) with rationale
3. Consultant reviews, accepts, modifies, or splits
4. Agent proposes Delegation Clusters (shown in green)
5. Consultant validates cluster coherence
6. Suitability scoring triggered automatically on confirmed clusters

### 4.3 Agentic Design Module

Translates validated delegation clusters into agent specifications.

**Interaction model**:
For each delegation cluster, the Agentic Design Agent walks the consultant through a structured but conversational specification process. Not a form — a guided dialogue that produces structured output.

**For each agent, the module captures**:
- Agent name and purpose statement
- Primary activities (full delegation)
- Supervised activities (with HITL definition)
- Autonomy level classification
- Required data sources (with availability assessment)
- Required MCP servers (proposed based on data sources)
- Required tools and APIs
- Input trigger and format
- Output format and destination
- Compliance classification (EU AI Act tier)
- GDPR implications
- HITL design (when, how, who)
- Known blockers and data gaps

**Cross-agent analysis**:
The module automatically identifies shared data sources and tools across multiple agents within the same engagement and flags reuse opportunities. This feeds the agentic roadmap logic.

**Output**: Draft Agent Requirements Document (Markdown, structured sections). Consultant reviews and approves before it is locked.

### 4.4 Business Case Module

The financial engine. Produces a defensible, scenario-based business case per use case.

**Modality composition** — critical feature:
Each use case has a modality profile. The token economics are composed from the active components:

| Component | Triggered when |
|---|---|
| STT (Speech to Text) | Voice input present |
| LLM Input Tokens (text) | Text processing |
| LLM Input Tokens (audio) | Realtime audio API used |
| LLM Output Tokens (text) | Text generation |
| LLM Output Tokens (audio) | Realtime audio API used |
| TTS (Text to Speech) | Voice output present |
| IVR / Audio Connector | Telephony integration present |
| Image Processing | Vision/image input present |
| Caching | Always — split cached/uncached by ratio |

The consultant selects the modality profile for the use case. The module automatically activates the relevant cost components and requests the necessary parameters.

**Scenario engine** — critical feature:
Every business case supports multiple named scenarios (e.g. Current, Preferred, Microsoft-only, or consultant-defined names). Each scenario has independent model selections and pricing. Scenarios are shown side-by-side for comparison.

**Financial model inputs**:
- Weekly case/call/task volume
- Average duration (if voice)
- Token density per case (input + output, by modality)
- Caching ratio (cached / uncached split)
- LLM model selection per modality
- STT / TTS service selection
- IVR service selection (if applicable)
- FTE count involved in the process
- Average FTE fully-loaded annual cost
- FTE monthly overhead
- Coverage ramp (month-by-month % of cases transferred to agent)
- Implementation cost (one-off or amortised)
- Infrastructure cost (monthly)
- Maintenance cost (monthly)
- YoY volume growth rate
- YoY complexity ingestion growth rate
- Inflation rate

**Financial model outputs** (48-month horizon):
- Manual labor cost (as-is, monthly and cumulative)
- AI total cost (token + infra + maintenance + amortisation)
- Cost per case: manual vs. AI
- Remaining FTEs after AI coverage
- Additional generated capacity (FTE equivalent freed)
- Monthly savings
- Cumulative savings
- Break-even month
- ROI at 12, 24, 36, 48 months
- Cost savings % (like-for-like)

**Output**: Populated Excel spreadsheet using the established model structure. Generated programmatically from the stored assumptions. Downloadable.

---

## 5. Output Artefacts

### 5.1 Agent Requirements Document

**Format**: Structured Markdown, exported as PDF or DOCX.

**Structure**:
```
1. Agent Overview
   - Name, Purpose, Delegation Cluster reference
   - Autonomy Level
   - EU AI Act Classification

2. Activities
   - Fully delegated activities
   - Supervised activities (with HITL specification)
   - Out of scope activities

3. Data & Knowledge Requirements
   - Data sources (name, type, availability, access method)
   - Knowledge bases required
   - Context requirements (indicative — detail in MCP)

4. Integration Requirements
   - Systems to integrate
   - APIs required
   - MCP servers required (indicative)
   - Authentication requirements

5. Input Specification
   - Trigger / entry point
   - Input format and structure
   - Expected variability and exception handling

6. Output Specification
   - Output format
   - Destination system(s)
   - Success criteria

7. Human-in-the-Loop Design
   - HITL trigger conditions
   - Escalation path
   - Human role definition

8. Compliance & Regulatory Requirements
   - EU AI Act obligations
   - GDPR implications
   - Audit and traceability requirements
   - Behavioural guardrails (indicative)

9. Open Questions & Blockers
   - Unresolved data availability issues
   - Integration unknowns
   - Compliance items requiring legal review
```

### 5.2 Business Case Spreadsheet

**Format**: Excel (.xlsx), programmatically generated using openpyxl.

**Sheets**:
- `Assumptions` — all input parameters, clearly labelled, colour-coded (blue = input)
- `Token Economics` — component-level cost breakdown per scenario
- `Financial Model` — 48-month P&L comparison, monthly and cumulative
- `FTE Impact` — coverage ramp, remaining FTEs, freed capacity
- `ROI Summary` — key metrics, break-even, scenario comparison chart data

---

## 6. Design System

### 6.1 Design Philosophy

The workbench is a **precision instrument for expert consultants**. The aesthetic must communicate seriousness, intelligence, and control. It should feel like a high-end analytical tool — not a consumer app, not a generic SaaS dashboard.

**Tone**: Refined dark professional. Data-rich without being cluttered. Every element earns its place.

**One thing users remember**: The cognitive map coming alive as the conversation progresses — structured intelligence emerging from chaos in real time.

### 6.2 Color Palette

```css
--bg-primary:     #0A0B0F;   /* Near-black background */
--bg-surface:     #12141A;   /* Card / panel surfaces */
--bg-elevated:    #1A1D26;   /* Elevated elements */
--bg-border:      #252836;   /* Borders, dividers */

--accent-primary: #4F7FFF;   /* Primary blue — actions, active states */
--accent-warm:    #FF6B35;   /* Warm orange — alerts, high cognitive load */
--accent-success: #2DD4A0;   /* Mint green — validated, confirmed states */
--accent-amber:   #F5A623;   /* Amber — pending, needs review */

--text-primary:   #F0F2F8;   /* Primary text */
--text-secondary: #8B90A8;   /* Secondary, labels */
--text-muted:     #4A5068;   /* Disabled, placeholder */

/* JTD State Colors */
--jtd-lived:      #F5A623;   /* Amber — Lived JTDs */
--jtd-cognitive:  #4F7FFF;   /* Blue — Cognitive JTDs */
--jtd-cluster:    #2DD4A0;   /* Mint — Delegation Clusters */
--jtd-agent:      #9B6FFF;   /* Purple — Agent Specifications */
```

### 6.3 Typography

```css
--font-display:  'DM Serif Display', Georgia, serif;    /* Headers, titles */
--font-ui:       'DM Mono', 'Fira Code', monospace;     /* Labels, metadata, codes */
--font-body:     'Inter', system-ui, sans-serif;         /* Body text, conversation */

/* Scale */
--text-xs:   11px;
--text-sm:   13px;
--text-base: 15px;
--text-lg:   18px;
--text-xl:   24px;
--text-2xl:  32px;
--text-3xl:  48px;
```

### 6.4 Layout Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Top Bar: ATW logo | Active Engagement | Stage Progress     │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  Left    │            Main Canvas                          │
│  Nav     │                                                  │
│          │  Context-dependent based on active module        │
│  - Engagements                                              │
│  - Use Cases                                                │
│  - Stages│                                                  │
│          │                                                  │
│          ├──────────────────────────────────────────────────┤
│          │  Agent Conversation Strip (persistent)           │
└──────────┴──────────────────────────────────────────────────┘
```

**Discovery Module Canvas** (two-panel):
```
┌─────────────────────────┬───────────────────────────────────┐
│  Input & Conversation   │  Cognitive Map (live)             │
│                         │                                   │
│  Drop zone for files    │  Lived JTDs → Cognitive JTDs      │
│  Image upload           │  → Delegation Clusters            │
│  Text input             │                                   │
│  Agent responses        │  Interactive, editable            │
│                         │  Colour-coded by JTD type         │
└─────────────────────────┴───────────────────────────────────┘
```

### 6.5 Component Principles

- No rounded corners beyond 4px — sharp, precise
- Subtle borders, not shadows, to define surfaces
- Monospace font for all IDs, scores, token counts, financial figures
- Colour-coded consistently: amber = needs attention, blue = in progress, mint = validated, purple = agent-defined
- Animations: purposeful only. The cognitive map building is animated. Navigation is instant.
- Empty states: always show what to do next — the workbench never leaves the consultant stranded

---

## 7. Development Conventions

### 7.1 Project Structure

```
atw/
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── modules/           # One folder per module
│   │   │   ├── discovery/
│   │   │   ├── agentic-design/
│   │   │   ├── business-case/
│   │   │   └── engagement/
│   │   ├── agents/            # Agent prompt templates and configs
│   │   ├── store/             # Zustand stores
│   │   ├── api/               # API client functions
│   │   └── types/             # TypeScript types mirroring backend schemas
│   └── public/
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI route handlers
│   │   ├── modules/           # Business logic per module
│   │   │   ├── discovery/
│   │   │   ├── agentic_design/
│   │   │   ├── business_case/
│   │   │   └── engagement/
│   │   ├── agents/            # Agent implementations
│   │   ├── models/            # Pydantic schemas + DB models
│   │   ├── services/          # Shared services (file storage, LLM client)
│   │   └── core/              # Config, database, auth
│   └── tests/
├── docker-compose.yml
├── .env.example
└── CLAUDE.md                  # This file
```

### 7.2 Code Standards

**TypeScript**:
- Strict mode enabled
- No `any` types — define everything
- Types for all API responses mirror Pydantic schemas exactly
- Components: functional only, hooks for logic

**Python**:
- Type hints everywhere
- Pydantic models for all data structures
- Async FastAPI handlers throughout
- No business logic in route handlers — always in service layer

**API Design**:
- RESTful for CRUD operations on engagements, use cases, artefacts
- WebSocket for streaming agent responses (conversation panels)
- Consistent response envelope: `{ data, error, meta }`

**Agent Prompts**:
- All system prompts live in `backend/app/agents/prompts/`
- One file per agent
- Prompts are structured: role definition → constraints → output format → examples
- Never hardcode prompts inline in business logic

### 7.3 Build Order

Build in this sequence. Do not skip ahead.

```
Phase 1 — Foundation
  1. Project scaffold (frontend + backend)
  2. Database schema and migrations
  3. Engagement CRUD (create, list, view, archive)
  4. Use case CRUD within engagement
  5. Basic navigation shell with design system

Phase 2 — Discovery Module
  6. File upload and storage (text, PDF, DOCX, images)
  7. Discovery Agent (LLM integration, streaming)
  8. Lived JTD extraction pipeline
  9. Cognitive JTD grouping with agent assistance
  10. Delegation cluster proposal and validation
  11. Suitability scoring engine
  12. Cognitive map visualisation (right panel)

Phase 3 — Agentic Design Module
  13. Agent specification dialogue (conversational)
  14. Agent Requirements Document generator
  15. Cross-agent resource analysis
  16. Document export (Markdown → PDF/DOCX)

Phase 4 — Business Case Module
  17. Modality profile configuration
  18. Token economics composition engine
  19. Scenario management (create, name, configure)
  20. 48-month financial model engine
  21. Excel output generator (openpyxl)
  22. Scenario comparison view

Phase 5 — Polish & Integration
  23. End-to-end data flow validation
  24. UI refinement to design spec
  25. Error handling and edge cases
  26. Performance optimisation
```

---

## 8. Critical Constraints — Never Violate

1. **Do not build prompt engineering features** — the workbench gives directional indication only; actual prompt engineering happens in the agentic platform
2. **Do not build context engineering features** — this happens in MCP servers, not here
3. **Do not build agent calibration or testing** — this belongs in the agentic platform
4. **Do not build client-facing features** — v1 is consultants only
5. **Do not replicate Miro or PowerPoint canvas capabilities** — the workbench is the intelligence layer; visual tools remain external
6. **Do not hardcode LLM model names** — always configurable via environment
7. **Do not store raw API keys in code** — environment variables only
8. **Do not skip the JTD translation layer** — Lived JTDs and Cognitive JTDs are distinct entities; collapsing them silently loses critical framework fidelity
9. **Do not make the business case a static form** — it must be composed dynamically from the modality profile of the use case
10. **Do not build a linear wizard** — the workbench is a workspace; consultants move between stages non-linearly, revisit, iterate

---

## 9. Key Terminology

| Term | Definition |
|---|---|
| Engagement | A client project within which one or more use cases are analysed |
| Use Case | A specific business process or workflow being evaluated for agentic transformation |
| Lived JTD | A Job To Be Done as humans actually perform it, including system-driven friction |
| Cognitive JTD | The underlying mental work of a Lived JTD, stripped of environmental friction |
| Delegation Cluster | A group of Cognitive JTDs coherent enough to be handled by a single agent |
| Abrasive Step | A high cognitive load step where humans spend disproportionate mental effort — prime target for delegation |
| Autonomy Level | Full Delegation / Supervised Execution / Assisted Mode |
| Modality Profile | The combination of input/output modalities active in a use case (voice, text, image, realtime audio) |
| Cognitive Zone | A grouping of cognitive tasks that share a common mental context |
| Cognitive Breakpoint | A decision moment that determines which cognitive path is taken next |
| Suitability Score | A 0–3 score across 9 dimensions assessing readiness for agentic delegation |
| Token Economics | The component-level cost model for an agent, composed from active modalities |
| Coverage Ramp | The month-by-month progression of case volume transferred from humans to agents |
| Value Calibration | Post-deployment accuracy/precision tuning — OUT OF SCOPE for workbench |

---

## 10. Reference: Framework Outputs Per Stage

| Stage | Workbench Output |
|---|---|
| Cognitive Load Mapping | Cognitive map with Lived JTDs, Cognitive JTDs, Delegation Clusters, Suitability Scores |
| Agentic Mapping | Agent Specifications, Agent Requirements Documents |
| Compliance | Compliance assessment per agent (embedded in Requirements Document) |
| Business Case | Token Economics model, 48-month ROI model, Scenario comparison, Excel export |

---

*This document is the single source of truth for the ATW build. Any ambiguity in implementation should be resolved by returning to the Vision (Section 1) and the Framework (Section 2). If a decision is not covered here, default to: what makes the consultant smarter and faster, while keeping the framework fidelity intact.*
