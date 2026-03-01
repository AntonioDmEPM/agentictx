# Agentic Transformation Workbench — CLAUDE.md
> Ground truth for every architectural, design, and implementation decision.
> Read this fully before writing any code, creating any file, or making any structural decision.
> Last updated: 2026-02-27

---

## 1. Vision

The **Agentic Transformation Workbench** (ATW) is a consultant-facing intelligence platform that operationalises the EPAM Agentic Transformation Framework.

It replaces a fragmented set of passive tools — PowerPoint, Miro boards, Excel spreadsheets — not by replicating their canvas capabilities, but by becoming the **active intelligence layer** that connects, structures, and generates the analytical outputs those tools currently produce manually.

The workbench is **proactive and assistive**. It does not wait for consultants to fill in forms. It listens, extracts, challenges, suggests, and generates. It reduces the cognitive burden on the consultant while dramatically increasing the quality, consistency, and speed of the analysis.

### What the workbench is
- A structured knowledge store for every client engagement
- An AI-powered analysis engine that processes raw, unstructured input
- A multimodal platform: accepts text, documents, transcripts, and images (including screenshots of Miro boards and PowerPoint slides)
- A generator of four primary deliverables: Agent Architecture Diagrams, Agent Requirements Documents, Agentic Roadmap, and Business Case Spreadsheets
- A consultant augmentation tool — it makes the consultant smarter, faster, and more consistent

### What the workbench is not
- Not a replacement for Miro, PowerPoint, or Excel as visual/creative tools — those remain the consultant's freeform workspace; the workbench is the intelligence beneath them
- Not a prompt engineering tool — prompt design happens in the agentic platform
- Not a context engineering tool — context engineering happens in MCP servers
- Not a calibration platform — agent calibration happens in the agentic platform after deployment
- Not a client-facing tool — version 1 is exclusively for EPAM consultants

### The core philosophy
Agentic AI is most valuable when applied to processes dominated by **cognitive ambiguity** — where humans spend effort handling exceptions, interpreting incomplete information, and making judgment calls that no deterministic system can replicate. The workbench exists to identify exactly those moments, map them with precision, and translate them into agent designs that are economically justified and operationally reliable.

---

## 2. The Agentic Transformation Framework

The workbench operationalises a six-stage framework. Stages 1–4 are in scope for the workbench. Stages 5–6 belong to the agentic platform.

### Stage 1 — Cognitive Load Mapping ✅ IN SCOPE
Map the lived process — not the documented one. Identify cognitive requirements, zones, breakpoints, and tasks (Jobs To Be Done), anchored to process phases.

**Two distinct layers — critical distinction**:
- **Jobs To Be Done (JTDs)**: What humans physically do — real actions, tasks, decisions, activities. The execution layer. Formerly called Lived JTDs.
- **Cognitive Load**: The mental effort behind those actions — judgment, interpretation, decision-making, reasoning. Includes requirements (what must be achieved), zones (mental mode active), and breakpoints (deviation triggers). Formerly called Cognitive JTDs.
- These are **distinct layers**, not parallel streams. Cognitive Load describes the mental work. JTDs describe what gets executed.
- Both attach to **Process Phases** — the backbone that gives structure to the cognitive map.
- Both streams extracted **simultaneously and independently** from natural conversation.
- The translation JTDs + Cognitive Load → Delegation Clusters is the core IP of the framework.

**Cognitive Load Dimensions** (scored 0–3):
- Cognitive Load Intensity, Input Data Structure, Actionability / Tool Coverage, Decision Determinism, Risk & Compliance Sensitivity, Context Complexity, Exception Rate, Turn-Taking Complexity, Latency Constraints

**Suitability → Delegation Mode** (auto-recommended from score, consultant can override):
- Score 2.5-3.0 + high cognitive load → Full Delegation
- Score 1.8-2.4 + high cognitive load → Supervised Execution
- Score 1.0-1.7 + high cognitive load → Assisted Mode
- Score below 1.0 or low cognitive load → Human Only

The workbench must display the delegation mode recommendation automatically when scoring is complete. The consultant selects and confirms the final delegation mode — their selection flows into Agentic Design as the autonomy level for the resulting agent spec.

### Stage 2 — Agentic Mapping ✅ IN SCOPE
Two discovery levels:
- **Level 1 — Cognitive Discovery** (Stage 1): What people do and think
- **Level 2 — Operational Discovery** (Stage 2): How people interact with systems and data. Integration requirements derived from human operating pattern — never asked before understanding human behaviour first.

### Stage 3 — Compliance & Regulatory Assessment ✅ IN SCOPE
EU AI Act classification, GDPR, HITL requirements, audit trail, sector regulations (FCA, financial services, healthcare, etc.), guardrails.

### Stage 4 — Business Case ✅ IN SCOPE (UNDER ACTIVE DEVELOPMENT)
Token economics composed from structured agent architecture data. See Section 4.

### Stage 5 — Value Calibration ❌ OUT OF SCOPE
### Stage 6 — Deploy & Optimise ❌ OUT OF SCOPE

---

## 3. System Architecture

### 3.1 Module Structure

```
ATW
├── Engagement Layer          # Client engagements, use cases
├── Discovery Module          # Dual-stream JTD extraction, cognitive map
├── Agentic Design Module     # Agent specs, architecture diagrams
├── Agentic Roadmap           # Multi-agent matrix view (engagement level)
├── Business Case Module      # Token economics, ROI model [IN DEV]
└── Output Generator          # ARDs, diagrams, roadmap, Excel
```

### 3.2 Navigation Structure

```
Engagement Level
├── Overview
├── Agentic Roadmap          ← spans all agents across all use cases
└── Use Cases[]
    └── Use Case Detail
        ├── Discovery        ← dual-stream JTD extraction
        ├── Agentic Design   ← agent specs + architecture diagrams
        ├── Compliance       ← DEACTIVATED (embedded in ARD)
        └── Business Case    ← DEACTIVATED (under development)
```

### 3.3 Internal Agents

**Discovery Agent**: Extracts Jobs To Be Done (tasks/execution) and Cognitive Load (mental effort/reasoning) simultaneously and independently. Calls `propose_jtds` and `propose_cognitive_load` independently, any order, any number of times. Anchors all extractions to Process Phases. Proactively drives conversation toward completeness — always ends each turn with one targeted follow-up probe. Detects when sufficient confirmed material exists and proactively prompts consultant to proceed to clustering. Revises cluster proposals when consultant gives feedback — never restates. Provides delegation mode recommendation automatically after scoring.

**Suitability Agent**: Scores delegation clusters against 9 dimensions. Proposes delegation mode.

**Agentic Design Agent**: Conducts Level 2 operational discovery before proposing specs. Probes human system behaviour before asking about API availability. Derives integration requirements from human operating pattern.

**Business Case Agent** (IN DEVELOPMENT): Composes token economics from structured payload data in agent specs.

### 3.4 Data Model

**Governing principle**: Process Phase is the master structure. JTDs and Cognitive Load items are slaves to Process Phases — they belong to a phase directly via a foreign key. Delegation Clusters are a grouping construct that pulls JTDs and Cognitive Load items from one or more phases.

```
ENGAGEMENT
├── id, client_name, industry, created_at, status
└── USE_CASE[]
    ├── id, name, description, status
    ├── Raw Inputs[]
    │
    ├── PROCESS_PHASE[]              # governing backbone — everything attaches here
    │   ├── id (UUID)
    │   ├── name (string)
    │   ├── sequence_order (int)
    │   └── use_case_id (FK)
    │        │
    │        ├── JTD[]               # Jobs To Be Done — execution layer
    │        │   ├── id (UUID)
    │        │   ├── use_case_id (FK)
    │        │   ├── process_phase_id (FK → PROCESS_PHASE)  # direct FK, not junction
    │        │   ├── description (string)
    │        │   ├── system_context (string)
    │        │   ├── status (proposed | confirmed | rejected)
    │        │   ├── source_message_id (FK → CONVERSATION_MESSAGE)
    │        │   └── is_modified (bool)
    │        │
    │        └── COGNITIVE_LOAD[]    # Mental effort layer
    │            ├── id (UUID)
    │            ├── use_case_id (FK)
    │            ├── process_phase_id (FK → PROCESS_PHASE)  # direct FK, not junction
    │            ├── description (string)
    │            ├── cognitive_zone (string)
    │            ├── load_intensity (0–3)     # scoring lives here, NOT on JTD
    │            ├── status (proposed | confirmed | rejected)
    │            ├── source_message_id (FK → CONVERSATION_MESSAGE)
    │            └── is_modified (bool)
    │
    ├── DELEGATION_CLUSTER[]         # grouping construct — spans phases
    │   ├── id (UUID)
    │   ├── use_case_id (FK)
    │   ├── name (string)
    │   ├── description (string)
    │   ├── status (proposed | confirmed | closed | replaced)
    │   ├── delegation_mode (full_delegation | supervised_execution | assisted_mode | human_only)
    │   └── suitability_score (float 0–3)
    │        │
    │        ├── CLUSTER_JTD_LINK[]           # many-to-many: cluster ↔ JTD
    │        │   ├── cluster_id (FK)
    │        │   └── jtd_id (FK → JTD)
    │        │
    │        └── CLUSTER_COGNITIVE_LINK[]     # many-to-many: cluster ↔ COGNITIVE_LOAD
    │            ├── cluster_id (FK)
    │            └── cognitive_load_id (FK → COGNITIVE_LOAD)
    │
    ├── CONVERSATION_MESSAGE[]
    │   ├── id (UUID)
    │   ├── role (user | assistant | system)
    │   ├── content (JSON)
    │   └── created_at
    │
    └── AGENT_SPECIFICATION[]
        ├── id, name, purpose, autonomy_level, status, maturity_score
        ├── model
        ├── delegation_cluster_id (FK → DELEGATION_CLUSTER)
        ├── activities[]
        ├── supervised_activities[]
        ├── prompt_requirements{}    # Section 5.1
        ├── input_channels[]         # Section 5.2
        ├── tool_stack[]             # Section 5.3
        ├── output_channels[]        # Section 5.4
        ├── hitl_design{}
        ├── compliance{}
        ├── open_questions[]
        ├── assumptions[]            # Section 5.5
        └── Agent Handoffs[]         # Section 5.6
```

**Key design decisions**:
- JTD and Cognitive Load have a direct `process_phase_id` FK — phase assignment is native to the card, not via a junction table. A card belongs to exactly one phase.
- The old `PROCESS_STEP_JTD_LINK` polymorphic junction table is eliminated. Replaced by direct FKs.
- Cognitive Load carries `load_intensity` (0–3). JTD carries no score — cognitive weight belongs to the effort layer, not the execution layer.
- Cluster membership uses two concrete link tables (`CLUSTER_JTD_LINK`, `CLUSTER_COGNITIVE_LINK`) — no polymorphic pattern, proper FK constraints enforced.
- Matrix cell colour coding is driven by `load_intensity` on Cognitive Load items only. JTD cells have no colour coding.

### 3.5 Technology Stack

**Frontend**: React + TypeScript, Tailwind CSS, Zustand, React Query, **React Flow** (node-based diagrams)
**Backend**: Python + FastAPI, async, Pydantic
**AI**: Anthropic Claude API, tool use, vision
**Storage**: PostgreSQL + pgvector
**Infrastructure**: Docker Compose

---

## 4. Business Case Module (UNDER ACTIVE DEVELOPMENT — UI DEACTIVATED)

### 4.1 Token Economics Composition

Token economics composed automatically from structured agent specification data. Every cost line traceable to a specific integration node, prompt component, or output channel. No manual entry.

**Token sources per agent per call**:

| Source | Token Type | Caching Applicable |
|---|---|---|
| System prompt | Input | Yes — ~95% cache hit |
| Few-shot examples | Input | Yes — ~90% cache hit |
| Dynamic context payloads | Input | Partial — ~10-20% cache hit |
| Guardrails | Input | Yes — ~95% cache hit |
| Integration input tokens | Input | No — query is variable |
| Integration output tokens | Input (returned to context) | Partial — KB results cacheable |
| Agent output | Output | No |

**Caching applies to prompt components only** — not to input channels or integration queries, which carry variable user-generated content.

### 4.2 Compounding Logic

**Forward**: Tools introduced for Agent N reduce build cost for Agent N+1 that reuses them.
**Backward**: New tool for Agent N enhances already-deployed agents sharing the same integration.

The Agentic Roadmap matrix (Section 6.2) drives this logic visually and the Business Case computes it financially.

### 4.3 Financial Model (48-month)

Inputs: weekly volume, average duration, token density per case, caching ratio, LLM model pricing, STT/TTS/IVR costs, FTE count and cost, coverage ramp, implementation cost, infrastructure cost, growth and inflation rates.

Outputs: manual vs AI cost comparison, cost per case, FTE impact, monthly/cumulative savings, break-even month, ROI at 12/24/36/48 months.

### 4.4 Excel Output

Sheets: `Assumptions`, `Token Economics`, `Financial Model`, `FTE Impact`, `ROI Summary`

---

## 5. Structured Data Models

> **Note on examples**: All JSON examples in Section 5 use generic, illustrative values.
> Implementation must be fully domain-agnostic. Field names and structure are the spec —
> example values (system names, agent names, descriptions) are placeholders only.


### 5.1 Prompt Requirements

```json
{
  "system_prompt": {
    "description": "...",
    "estimated_tokens": 500,
    "cache_hit_pct": 95,
    "engineering_effort": "3d"
  },
  "dynamic_context": [
    {
      "name": "Customer Data",
      "source": "CRM system",
      "estimated_tokens_per_call": 1500,
      "cache_hit_pct": 15,
      "fetch_frequency": "per_call"
    },
    {
      "name": "KB Results",
      "source": "Azure AI Search",
      "estimated_tokens_per_call": 500,
      "cache_hit_pct": 20,
      "fetch_frequency": "per_call"
    }
  ],
  "few_shot_examples": {
    "description": "...",
    "estimated_tokens": 300,
    "cache_hit_pct": 90,
    "update_frequency": "monthly"
  },
  "guardrails": [
    {
      "description": "...",
      "type": "safety | compliance | scope",
      "estimated_tokens": 100,
      "cache_hit_pct": 95
    }
  ]
}
```

### 5.2 Input Channels

Each input channel is a distinct node on the left side of the Agent Architecture Diagram.

```json
{
  "input_channels": [
    {
      "name": "Voice Call",
      "type": "voice",
      "icon": "phone",
      "estimated_tokens_per_call": 800,
      "description": "Inbound request via voice channel"
    },
    {
      "name": "Web Form",
      "type": "form",
      "icon": "document",
      "estimated_tokens_per_call": 400,
      "description": "Inbound request via web form"
    },
    {
      "name": "Agent Handoff",
      "type": "handoff",
      "icon": "arrow",
      "estimated_tokens_per_call": 600,
      "description": "Structured payload from upstream agent"
    }
  ]
}
```

**No caching on input channels** — content is variable and user-generated.

### 5.3 Tool Stack

Each tool/MCP is a node connected to the agent. Each tool connects to one or more system/KB nodes behind it. The agent never connects directly to a system — always through a tool or MCP abstraction layer.

```json
{
  "tools": [
    {
      "name": "Domain Logic MCP",
      "node_prefix": "T",
      "type": "mcp_server",
      "status": "new",
      "build_effort": "2w",
      "input_tokens_per_call": 150,
      "output_tokens_per_call": 600,
      "output_cache_hit_pct": 10,
      "used_by_agents": ["Agent A", "Agent B"],
      "backward_impact": [
        {
          "agent": "Agent C",
          "change_required": "Add domain context to prompt",
          "effort": "3d"
        }
      ],
      "connected_systems": [
        {
          "name": "Backend System X",
          "node_prefix": "S",
          "type": "system",
          "status": "existing"
        }
      ]
    },
    {
      "name": "Domain Knowledge Base",
      "node_prefix": "KB",
      "type": "knowledge_base",
      "status": "new",
      "build_effort": "3w",
      "input_tokens_per_call": 200,
      "output_tokens_per_call": 800,
      "output_cache_hit_pct": 40,
      "used_by_agents": ["Agent A"],
      "connected_systems": [
        {
          "name": "Document Store",
          "node_prefix": "S",
          "type": "system",
          "status": "existing"
        }
      ]
    }
  ]
}
```

**Tool node token economics**:
- `input_tokens_per_call` = tokens sent TO the tool (query, parameters, context)
- `output_tokens_per_call` = tokens returned FROM the tool (data payload, retrieved content)
- `output_cache_hit_pct` = proportion of output tokens likely cached (KB results often cacheable, system writes not)
- These flow into the Business Case token economics model

**Node type prefixes**:
- `T:` = Tool / MCP Server (active capability encapsulating logic)
- `S:` = System (passive data store or platform — always behind a T: node)
- `KB` = Knowledge Base (retrieval source — always behind a T: node)

**Build status colours**:
- Gray = existing, already built, zero marginal build cost
- Green = new, build effort required
- Orange = pending, dependency not yet confirmed
- Red = blocked, integration not available or approved

### 5.4 Output Channels

Each output is a distinct node on the bottom of the Agent Architecture Diagram.

```json
{
  "output_channels": [
    {
      "type": "system_write",
      "name": "Output Record",
      "destination": "System of Record",
      "format": "Structured JSON",
      "estimated_tokens": 0,
      "latency_requirement_ms": null
    },
    {
      "type": "text_response",
      "name": "Client Confirmation",
      "destination": "Client (voice)",
      "format": "Natural language",
      "estimated_tokens": 200,
      "latency_requirement_ms": 800
    },
    {
      "type": "agent_handoff",
      "name": "Intake Summary",
      "destination": "Agent B",
      "format": "Structured JSON",
      "estimated_tokens": 400,
      "latency_requirement_ms": null
    },
    {
      "type": "audit_log",
      "name": "Routing Decision",
      "destination": "Audit System",
      "format": "Structured log entry",
      "estimated_tokens": 150,
      "latency_requirement_ms": null
    }
  ]
}
```

### 5.5 Assumption Register

```json
{
  "assumptions": [
    {
      "id": "A1",
      "description": "Backend System X API will be available for integration",
      "linked_to": "Domain Logic MCP",
      "risk_level": "high",
      "owner": null,
      "resolution_status": "open"
    }
  ]
}
```

### 5.6 Agent Handoff Map (per engagement)

```json
{
  "handoffs": [
    {
      "from_agent": "Agent A",
      "to_agent": "Agent B",
      "trigger_condition": "Upstream process complete, record created",
      "payload_description": "Structured handoff payload with context and recommendation",
      "estimated_tokens": 400,
      "handoff_type": "sequential"
    }
  ]
}
```

Handoff types: `sequential` | `parallel` | `conditional`

---

## 6. Visual Outputs

### 6.1 Agent Architecture Diagram (PRIMARY — per agent, in Agentic Design module)

Built with **React Flow**. Interactive, zoomable, pannable. Replaces markdown ARD as primary visual deliverable.

#### Agent Node (center)

Rounded rectangle. Contains:
- Agent name (large, center)
- LLM model badge (small, below name — e.g. `claude-sonnet-4-5`)
- Autonomy level badge (`Full Delegation` | `Supervised Execution` | `Assisted Mode`)
- Maturity score traffic light (top right corner — green/amber/red dot)

#### Input Channel Nodes (left side)

One node per channel. Connected to agent by arrow pointing RIGHT (→ into agent).

Each node displays:
- Channel type icon + name
- Token load per call

No caching % on input channels — content is variable.

Node types: `voice` | `form` | `system_event` | `agent_handoff`

#### Prompt Component Nodes (top)

One node per component. Connected to agent by arrow pointing DOWN (↓ into agent).

Each node displays:
- Component name
- Token load
- Cache hit % (caching applies to prompt components only)

Components: System Prompt | Dynamic Context (one node per source) | Few-shot Examples | Guardrails

#### Tool / Integration Nodes (right side — two layers)

**Layer 1 — Tool/MCP nodes** (closer to agent). Connected to agent by arrow pointing RIGHT (→ out of agent = agent invokes tool).

Each tool node displays:
- Node prefix + name (`T: Domain Logic MCP`)
- Build status colour (gray/green/orange/red)
- Build effort (e.g. `2w`) — shown on node, not just hover
- Input tokens per call (sent to tool)
- Output tokens per call (returned from tool)
- Output cache hit %

**Layer 2 — System/KB nodes** (further right, behind tool nodes). Connected to their tool node by arrow.

Each system node displays:
- Node prefix + name (`S: Backend System X`)
- Build status colour

Arrow direction convention:
- → pointing INTO agent = data flowing in (read operation)
- → pointing OUT OF agent = action flowing out (write/trigger)
- Bidirectional arrow = both read and write

**The agent never connects directly to a system node — always through a tool/MCP node.**

#### Output Channel Nodes (bottom)

One node per output type. Connected to agent by arrow pointing DOWN (↓ out of agent).

Each node displays:
- Output type icon + name
- Destination
- Token estimate (for text outputs)
- Latency requirement (where defined)

Output types: `system_write` | `text_response` | `agent_handoff` | `audit_log`

#### Legend (permanent, fixed corner)

Always visible, never hidden. Explains:

**Node Types**:
- `T:` Tool / MCP Server — active capability the agent invokes (encapsulates logic)
- `S:` System — passive data store or platform (always behind a T: node)
- `KB` Knowledge Base — retrieval source (always behind a T: node)

**Build Status**:
- Gray = existing, zero marginal build cost
- Green = new, build effort required
- Orange = pending confirmation
- Red = blocked

**Arrow Direction**:
- → into agent = data in (read)
- → out of agent = action out (write/trigger)
- ↔ bidirectional = read and write

#### Token Economics Toggle

Second view of the same diagram. Toggle button top-right of canvas.

In token economics view:
- Each node shows its token contribution highlighted
- Edge labels show token flow between nodes
- Summary panel bottom-right: total input tokens / total output tokens / estimated cost per call
- Cached vs uncached split shown for prompt components

#### Views available on Agent Architecture Diagram

- **Architecture View** (default) — full diagram with build status, effort, connections
- **Token Economics View** (toggle) — same diagram, token loads highlighted on each node

---

### 6.2 Agentic Roadmap (per engagement — at engagement level in navigation)

A **multi-agent matrix** — not a diagram, a structured table. Built with React (standard table/grid, not React Flow).

#### Structure

- **Columns** = Agents, ordered left to right by implementation sequence
- **Rows** = All tools, MCPs, systems, and KBs across all agents, deduplicated
- **Cells** = Coloured indicator showing whether this agent uses this integration

#### Cell States

- **Green cell** = this agent introduces this tool (new build, first time used)
- **Gray cell** = this agent reuses this tool (already built by a previous agent, zero marginal cost)
- **Empty cell** = this agent does not use this tool
- **Orange cell** = pending — tool planned but not yet confirmed for this agent
- **Red cell** = blocked — integration not available for this agent

#### Column Header (per agent)

- Agent name
- LLM model
- Autonomy level badge
- Maturity score traffic light
- Total new build effort (sum of green cells)
- Total reused integrations count (sum of gray cells)

#### Row Labels (per integration)

- Node prefix + name (`T: Domain Logic MCP`)
- Input tokens per call
- Output tokens per call
- Output cache hit %

#### Reading the Roadmap

- **Vertical reading** (column) = full tool stack for one agent
- **Horizontal reading** (row) = which agents share this integration = compounding opportunity
- **Left to right** = implementation sequence — first agent is most expensive (all green), subsequent agents increasingly cheaper (more gray)
- **Compounding story** = visible at a glance — a row that is green then gray gray gray shows a tool built once, reused three times

#### Backward Compounding Annotation

When a new tool (green cell) also retroactively benefits an already-deployed agent to the left, show a backward arrow annotation on that cell with the enhancement description and effort estimate.

#### Footer Row

- Total build effort per agent (column sum of green cells)
- Total reused integrations per agent (column sum of gray cells)
- Cumulative engagement build effort (running total left to right)

---

## 7. Agent Requirements Document (ARD)

Structured, scannable markdown. Generated as secondary export alongside the visual diagram. No prose paragraphs.

```
# Agent Requirements Document — {use_case_name}

## {Agent Name}
> Purpose: {one sentence}
> Model: {model identifier}
> Autonomy Level: {level}
> EU AI Act Classification: {classification}
> Maturity Score: {score}/100

### Activities
| Activity | Delegation | HITL Trigger |
|---|---|---|

### Input Channels
| Channel | Type | Token Load/Call |
|---|---|---|

### Prompt Components
| Component | Tokens | Cache Hit % |
|---|---|---|

### Integration Requirements
| Node | Type | Status | Build Effort | Input Tokens | Output Tokens | Cache Hit % |
|---|---|---|---|---|---|---|

### Output Channels
| Output | Type | Destination | Token Est. | Latency |
|---|---|---|---|---|

### Human-in-the-Loop Design
| Trigger | Escalation Path | Human Role |
|---|---|---|

### Compliance & Regulatory
| Area | Requirement |
|---|---|

### Assumptions
| # | Description | Linked To | Risk | Status |
|---|---|---|---|---|

### Open Questions
| # | Category | Question |
|---|---|---|
```

---

## 8. Design System

### 8.1 Color Palette

```css
--bg-primary:     #0A0B0F;
--bg-surface:     #12141A;
--bg-elevated:    #1A1D26;
--bg-border:      #252836;

--accent-primary: #4F7FFF;
--accent-warm:    #FF6B35;
--accent-success: #2DD4A0;
--accent-amber:   #F5A623;

--text-primary:   #F0F2F8;
--text-secondary: #8B90A8;
--text-muted:     #4A5068;

/* JTD Colors */
--jtd-lived:      #F5A623;   /* Amber — Tasks */
--jtd-cognitive:  #4F7FFF;   /* Blue — Reasoning */
--jtd-cluster:    #2DD4A0;   /* Mint — Clusters */
--jtd-agent:      #9B6FFF;   /* Purple — Agents */

/* Tool Build Status */
--tool-existing:  #6B7280;   /* Gray */
--tool-new:       #2DD4A0;   /* Green */
--tool-pending:   #F5A623;   /* Orange */
--tool-blocked:   #FF6B35;   /* Red */
```

### 8.2 Typography

```css
--font-display: 'DM Serif Display', Georgia, serif;
--font-ui:      'DM Mono', 'Fira Code', monospace;
--font-body:    'Inter', system-ui, sans-serif;
```

### 8.3 Layout

```
┌──────────────────────────────────────────────────────────┐
│  Top Bar: ATW | Active Engagement | Stage Progress       │
├──────────┬───────────────────────────────────────────────┤
│  Left    │  Main Canvas (context-dependent per module)   │
│  Nav     │                                               │
│          ├───────────────────────────────────────────────┤
│          │  Agent Conversation Strip (persistent)        │
└──────────┴───────────────────────────────────────────────┘
```

### 8.4 React Flow Configuration

- Background: `--bg-primary` with subtle dot grid
- Node border radius: 8px (rounded rectangle for agents)
- Edge style: smooth bezier, `--bg-border` colour, 2px width
- Edge labels: monospace font, small, token counts in token economics view
- Controls: zoom in/out/fit, bottom left
- Mini map: disabled (canvas not large enough to need it)
- Node drag: enabled (consultant can reposition)
- Pan: enabled
- Zoom: 0.25x to 2x

---

## 9. Development Conventions

### 9.1 Code Standards

**TypeScript**: Strict mode, no `any`, functional components, hooks for logic.
**Python**: Type hints everywhere, Pydantic models, async FastAPI, no business logic in route handlers.
**API**: RESTful for CRUD, WebSocket for streaming, `{ data, error, meta }` envelope.
**Prompts**: All system prompts in `backend/app/agents/prompts/`, never inline.

### 9.2 Build Order

```
Phase 1 — Foundation ✅ COMPLETE
Phase 2 — Discovery Module ✅ COMPLETE
  - Dual-stream extraction (JTDs + Cognitive Load)
  - Process Phases as backbone with direct FK
  - Card CRUD, colour system, provenance
  - Confirm toggle, rejected state, superseded clusters
  - Auto-prompt to cluster, clustering feedback states
  - Process Matrix Visualise view
  - Write-path fix for conversation history integrity
  - Schema: direct process_phase_id FK, concrete cluster link tables
Phase 3 — Agentic Design Module ✅ COMPLETE
  - Agent specs, ARD generation
  - Agent Architecture Diagram (React Flow) ✅ COMPLETE (Phase 5a)
  - Suitability scoring with delegation mode recommendation
Phase 4 — Business Case Module ❌ DEACTIVATED (under redesign)
Phase 3.5 — Process Visualisation Layer ✅ COMPLETE (built as Visualise view in Discovery)

Phase 5 — Visual Output Layer
  5a. Agent Architecture Diagram ✅ COMPLETE
  5b. Agentic Roadmap 📋 NOT BUILT — next after Discovery testing complete
  5c. ARD reformatting 📋 NOT BUILT
  5d. Data model updates ✅ COMPLETE (input_channels, output_channels, tool connected_systems)
  5e. End-to-end validation 🔄 IN PROGRESS

Phase 6 — Voice Capabilities 📋 PLANNED (after Phase 5 complete)
```

**Current focus**: Complete Discovery module end-to-end testing, close UX gaps (Notes 44, 45, 46, 49), then build Phase 5b Agentic Roadmap.
      - Column headers with agent summary
      - Row labels with token economics
      - Backward compounding annotations
      - Footer with build effort totals
  5c. ARD reformatting (tables not prose, all sections structured)
  5d. Data model updates (input_channels, output_channels, tool connected_systems)
  5e. End-to-end validation and UI refinement
```

---

## 10. Critical Constraints — Never Violate

1. Do not build prompt engineering features
2. Do not build context engineering features
3. Do not build agent calibration or testing
4. Do not build client-facing features — v1 consultants only
5. Do not replicate Miro or PowerPoint canvas
6. Do not hardcode LLM model names — always configurable via environment
7. Do not store raw API keys in code
8. Do not collapse JTDs and Cognitive Load — execution vs mental effort, always distinct layers
9. Do not make business case a static form — compose from agent spec payload data
10. Do not build a linear wizard — workspace, non-linear navigation
11. Do not ask about integrations before understanding human behaviour
12. Do not generate ARD as unstructured prose — tables and structured sections only
13. Do not connect agent directly to system nodes — always through a T: tool/MCP node
14. Do not apply caching % to input channels — caching applies to prompt components only
15. Do not permanently delete rejected cards — rejected state must remain visible and auditable
16. Do not freeze cards on confirm — cards only freeze when their cluster is set to Closed
17. Do not make confirm permanent — consultant must be able to toggle confirmed cards back to proposed
18. Do not show only active clusters — superseded clusters must be marked as replaced, not hidden
19. Do not lose card provenance — every agent-generated card must retain a reference to the conversation turn that created it
20. Do not treat Scored as a cluster status — Scored is an attribute, not a lifecycle state. Status and score are independent. A cluster can be Proposed+Scored or Confirmed+Scored.
21. Do not remove the Confirm button after scoring — Confirm must remain visible regardless of whether the cluster has been scored
22. Do not require manual scoring — scoring must trigger automatically when cluster membership is saved after editing
23. Do not cascade unconfirmed clusters to Agentic Design — only Confirmed clusters create agent specs

---

## 11. Key Terminology

| Term | Definition |
|---|---|
| Engagement | Client project containing one or more use cases |
| Use Case | Business process evaluated for agentic transformation |
| Process Phase | A distinct stage in the process — the backbone all cards attach to |
| Jobs To Be Done (JTD) | What humans physically do — real actions, tasks, decisions, activities. Formerly Lived JTDs |
| Cognitive Load | The mental effort layer — judgment, interpretation, decision-making, reasoning. Formerly Cognitive JTDs |
| Delegation Cluster | JTDs + Cognitive Load items coherent enough for a single agent |
| Cluster Status | proposed / confirmed / closed — cards freeze only on Closed |
| Card Provenance | Link from each agent-generated card back to the conversation turn that created it |
| Abrasive Step | High cognitive load task — prime delegation target |
| Autonomy Level | Full Delegation / Supervised Execution / Assisted Mode / Human Only |
| Delegation Mode | Recommended autonomy level derived from suitability score — consultant confirms or overrides |
| Input Channel | Distinct input source to an agent (voice, form, handoff, event) |
| Prompt Component | System prompt / Dynamic context / Few-shot examples / Guardrails |
| T: node | Tool / MCP Server — active capability encapsulating logic |
| S: node | System — passive data store, always behind a T: node |
| KB node | Knowledge Base — retrieval source, always behind a T: node |
| Tool Stack | All T:/S:/KB nodes for an agent with build status and token economics |
| Output Channel | Distinct output from agent (system write, text, handoff, audit log) |
| Token Economics | Cost model composed from prompt + integration + output token loads |
| Cache Hit % | Proportion of prompt component tokens served from cache (prompt only) |
| Forward Compounding | New tool for Agent N reduces cost for Agent N+1 |
| Backward Compounding | New tool for Agent N enhances already-deployed agents |
| Agent Maturity Score | 0-100 — specification completeness and risk indicator |
| Agentic Roadmap | Multi-agent matrix showing tool reuse and compounding visually |
| Value Calibration | Post-deployment tuning — OUT OF SCOPE |

---

## 12. Process Visualisation Layer (Phase 3.5 — Planned after Phase 4)

### 12.1 Purpose
After Discovery extracts Lived JTDs and Cognitive JTDs, consultant reconstructs them into a validated process flow — reflecting how humans actually live on top of processes. Validation layer before committing to agent design.

### 12.2 Three-Layer Visual Model

**Layer 1 — Process Flow**: Horizontal swimlane, steps in sequence, branching at breakpoints.
**Layer 2 — Cognitive Overlay**: Tasks (amber) and Reasoning (blue) stacked below each step. Load intensity as colour gradient on step node.
**Layer 3 — Cluster Boundaries**: Consultant draws boundaries around step groups. Each boundary = delegation cluster. Agent rectangle spans owned steps.

### 12.3 Data Model Additions (Phase 3.5)
```
process_steps: id, use_case_id, name, sequence_order, is_breakpoint, cognitive_load_intensity
process_step_jtd_links: process_step_id, jtd_type, jtd_id, sequence_within_step
cluster_process_steps: cluster_id, process_step_id
```

### 12.4 Build Order Note
Do not build Phase 3.5 until Phase 4 is complete.


---

## 13. Voice Capabilities (Planned — Phase 6)

### 13.1 Voice-to-Voice Discovery (Option A — Anthropic Native)

**Purpose**: Enable consultants to conduct Discovery conversations by speaking naturally with the agent instead of typing. Reduces friction during client sessions — consultant can speak observations, interview notes, or live client responses directly into the workbench.

**Approach**: Anthropic native real-time audio API. No external services required. Same API already in use — extended to accept audio input and return audio output. Single integration point, no additional vendor dependencies.

**Where it appears**: Discovery module — the conversation panel gains a microphone button alongside the text input. Consultant presses and holds to speak. Agent responds in voice and simultaneously populates the cognitive map (Lived JTDs and Cognitive JTDs) exactly as it does with text input.

**Technical implementation**:
- Frontend: WebRTC audio capture in browser, streamed to backend via WebSocket
- Backend: Anthropic real-time audio API — input_audio and output_audio modalities enabled on the existing Discovery Agent
- The same dual-stream JTD extraction tools (, ) fire during voice conversation exactly as during text conversation
- Audio output streamed back to frontend and played through browser audio
- Full conversation transcript saved to database alongside audio session metadata

**Interaction model**:
- Microphone button in conversation panel — press to activate, release to send
- Visual waveform indicator while speaking
- Agent responds in voice — text transcript of response also shown in conversation panel
- JTD cards appear in the cognitive map in real time during voice conversation
- Consultant can switch between voice and text mid-conversation

**Compliance note**: Audio processing occurs via Anthropic API. Data residency and retention rules from Section 8 (Compliance) apply. Consultant must be aware that voice data is processed by the LLM provider.

### 13.2 Audio Transcript Processing

**Purpose**: Accept uploaded audio recordings (client interviews, workshop sessions, process walkthroughs) and process them through the Discovery pipeline automatically.

**Approach**: Server-side transcription using OpenAI Whisper (open source, runs locally in Docker, no API key required). Transcript fed into existing Discovery Agent pipeline identically to pasted text — no new agent logic required.

**Supported formats**: .mp3, .wav, .m4a, .ogg

**Where it appears**: Discovery module file upload zone — extended to accept audio files alongside existing PDF, DOCX, TXT, and image support.

**Technical implementation**:
- Frontend: audio file types added to upload zone accepted formats
- Backend: new file_storage.py handler for audio files — saves to uploads directory, triggers Whisper transcription
- Whisper runs as a sidecar service in Docker Compose (openai/whisper Docker image)
- Transcription output saved as RawInput with type: transcript, processed: false
- Existing Discovery Agent processes the transcript exactly as any other text input
- Progress indicator shown in UI during transcription (can take 30-120 seconds for long recordings)

**Technical note**: Whisper large-v3 model recommended for accuracy. Runs on CPU — transcription of a 60-minute recording takes approximately 3-5 minutes on standard hardware. Add to docker-compose.yml as  service.

### 13.3 Build Order Note

Do not build Phase 6 until Phase 5 (Visual Output Layer) is complete and tested. Voice capabilities depend on a stable Discovery module — build the foundation solid before adding audio complexity.

### 13.4 Terminology Additions

| Term | Definition |
|---|---|
| V2V | Voice-to-voice interaction — consultant speaks, agent responds in voice |
| Audio Session | A voice conversation recorded and processed through the Discovery pipeline |
| Whisper | Open-source speech-to-text model (OpenAI) running locally — no API key required |
| Real-time Audio | Anthropic native audio modality — input and output audio via existing Claude API |

---

## 14. Applied UX and Agent Behaviour Fixes

### 14.1 Engagement Creation Form (Simplified)
Two fields only on creation: **Client Name** (required text input) and **Industry** (dropdown, required).

Industry options: Financial Services, Insurance, Healthcare, Retail, Telecommunications, Energy & Utilities, Manufacturing, Public Sector, Professional Services, Technology, Real Estate, Other.

`engagement_type` field removed from creation form (still exists in data model for backward compatibility).

### 14.2 Discovery Opening Message
When a Discovery session has no messages, the conversation panel displays a warm opening message from the agent automatically — no user prompt required. Single clear invitation: describe the process, paste notes, or upload a document. No numbered questions. Professional and directive tone.

### 14.3 Discovery Agent Response Formatting
Short paragraphs only (2-4 sentences max), no walls of text. Prose only in conversational responses — never bullet points or numbered lists. Probing questions placed on their own line, clearly separated from preceding text. Bold used sparingly — only for framework-specific terms or critical distinctions. Prompt rules enforced in `backend/app/agents/prompts/discovery_agent.py`.

### 14.4 Discovery Agent Probing Behaviour
After every extraction turn, the agent ends with exactly **one** targeted follow-up question. The question must reference something specific from what the consultant just described. Must go deeper into the most cognitively interesting element — never generic. The agent must proactively drive the conversation toward completeness — it maintains an internal model of what a complete cognitive map requires and probes for gaps. It does not wait for the consultant to lead. If process phases are not yet established, it asks about phases. If exception cases have not been covered, it asks about failure modes.

### 14.5 Card CRUD (Manual JTD and Cognitive Load Management)
**Create**: `+` button at bottom of JTD and Cognitive Load columns opens inline form (description + context field). Manually created cards are set to `confirmed` status immediately — bypasses agent proposal flow.

**Edit**: Double-click any card opens full inline edit form. Same interaction pattern as Agentic Design node editing. Edited cards are marked "manually edited" — their source message reference is preserved but a modified flag is shown.

**Delete**: Three-dot menu (`...`) on every card provides Edit and Delete options. Deleting a card removes it from view but logs the deletion with timestamp and preserves the source message reference for audit purposes.

Backend: POST endpoints added at `/{uc_id}/jtds` and `/{uc_id}/cognitive-load`.

### 14.6 Card Text Display
Card descriptions wrap to two lines maximum. Truncated with ellipsis (`-webkit-line-clamp: 2`) when text exceeds two lines. Full text shown on hover via `title` attribute tooltip.

### 14.7 Card State Colour System
Consistent colour system across all cards in Discovery:

- **Proposed** — amber/orange border and badge (current, keep)
- **Confirm button** — cyan
- **Confirmed state** — green border and badge
- **Reject button** — red
- **Rejected state** — grey/dimmed, card remains visible but visually suppressed

Confirmed and Confirm button must never appear in the same colour. Rejected cards never disappear — they remain in the column in a dimmed state, clearly marked Rejected, so the consultant can see what was considered and dismissed. Rejection is an auditable decision, not a deletion.

### 14.8 Card Confirm/Reject Behaviour
Confirmed cards are not permanently locked. Confirm is a toggle — confirmed cards can be returned to Proposed state by clicking again. Cards only become non-editable when their Delegation Cluster is set to **Closed** status. Until then, all cards remain editable regardless of their confirmed/proposed state.

### 14.9 Card Provenance
Every card generated by the Discovery Agent carries a `source_message_id` — a reference to the conversation turn that produced it. This is displayed on the card as a small indicator (message number or timestamp). Clicking it scrolls the conversation panel to the originating message.

When a card is manually edited: content changes, source reference is preserved, "modified" flag shown on card.
When a card is deleted: card removed from view, source reference logged in audit trail with deletion timestamp and consultant identity.

### 14.10 Clustering Behaviour and Feedback
The workbench detects when all JTD and Cognitive Load cards are confirmed and surfaces a proactive prompt in the conversation panel: "You have confirmed X tasks and Y cognitive load items. I have enough material to propose delegation clusters. Shall I proceed?" One-click approval triggers clustering.

Visual feedback during clustering: "Generating clusters..." loading state in conversation panel. On completion: "X clusters proposed" success message, Clusters column animates or highlights to draw the consultant's eye.

When the consultant gives feedback on proposed clusters (split, merge, rename, reassign): the agent must act on the feedback and propose a revised set. Never restate the original. Superseded clusters are marked "Replaced" and remain visible in a collapsed state — never deleted. The current active proposal is always the most recent revision.

### 14.11 Cluster Lifecycle (Corrected)

**Status and score are independent attributes.** Scored is not a status — it is a flag. A cluster can be in any combination: Proposed+Unscored, Proposed+Scored, Confirmed+Scored, Confirmed+Unscored, Closed+Scored.

**Correct cluster lifecycle:**
```
Proposed (agent-generated)
  → Consultant edits membership (add/remove JTDs and Cognitive Load items)
  → Auto-score fires on save (suitability score calculated automatically)
  → Consultant reviews score and sets delegation mode
  → Consultant clicks Confirm
  → Confirmed cluster cascades to Agentic Design (one agent spec created per confirmed cluster)
  → Closed (after Agentic Design is complete — cards freeze)
```

**Confirm button must always be visible** on Proposed clusters — scoring never hides or replaces it.

**Auto-score**: Scoring triggers automatically on every membership change (each checkbox toggle calls the server, which re-runs the suitability agent if `is_scored` is already `true`). The Score button is only shown for clusters that have never been scored (`is_scored=false`). Once scored, `is_scored` never reverts to `false` — all subsequent membership edits trigger automatic re-scoring server-side, and the updated scores are returned in the API response without any additional user action.

### 14.12 Cluster Membership Editing

Every cluster card in the Extract view has an Edit button. Clicking Edit opens a membership panel showing:
- All confirmed JTDs — each with a checkbox showing whether it is in this cluster
- All confirmed Cognitive Load items — each with a checkbox showing whether it is in this cluster

Consultant can check/uncheck items freely. Each toggle immediately calls the server to update the link table; if the cluster has been scored (`is_scored=true`), the server automatically re-runs suitability scoring and returns the updated scores in the response. The Confirm button is always visible alongside the Edit and Score display.

### 14.13 Cluster Selection Highlighting

When a consultant clicks on a cluster card in the Clusters column, the JTD and Cognitive Load columns enter **selection mode**:
- Cards that belong to the selected cluster retain full colour and opacity
- Cards that do not belong to the selected cluster are dimmed to 30% opacity
- A clear visual boundary or indicator shows cluster membership at a glance
- Clicking anywhere outside the cluster card exits selection mode and restores full opacity

This makes cluster membership immediately visible and verifiable without opening the edit panel.

### 14.14 Suitability Scoring Display
Suitability score dimensions must display full labels — never truncated. All nine dimension names visible on the scoring card. Score displayed as X/3 with a clear delegation mode recommendation below it:

- 2.5-3.0 → Full Delegation
- 1.8-2.4 → Supervised Execution
- 1.0-1.7 → Assisted Mode
- Below 1.0 → Human Only

The consultant selects and confirms the delegation mode — a dropdown or button group showing the four options, with the recommended one pre-selected. Their confirmed selection flows into Agentic Design as the autonomy level.

---

## 15. Cognitive Map UX Specification

### 15.1 Two Views

The Cognitive Map has two views toggled by the existing Extract/Visualise buttons:

**Extract View (default)** — three-column card layout: JTDs | Cognitive Load | Clusters. This is the working surface during conversation. Cards appear here as the agent extracts. Consultant confirms, rejects, edits, creates cards here.

**Visualise View** — process matrix grid. This is the analytical surface after sufficient extraction. Replaces card columns with a structured grid rendering the same data.

### 15.2 Visualise View — Process Matrix Grid

Structure matches the EPAM Agentic Transformation Framework slide:

- **Columns** — Process Phases, left to right in sequence
- **Rows** — Two layers: Cognitive Load (top row), Jobs To Be Done (bottom row)
- **Cells** — Compact bullet list of confirmed items for that phase and layer
- **Colour coding** — Green cells = low cognitive load, Red/pink cells = high cognitive load, assessed from suitability dimension scores
- **Value Stream label** — optional, shown at top left, consultant can name it

Each cell is expandable — click to see full item descriptions. Items can be dragged between phase columns if misclassified. Cluster boundaries shown as coloured overlays spanning the phase columns they cover.

### 15.3 Phase Management
Process Phases are established early in the Discovery conversation. The agent proposes phases as it identifies them. Consultant confirms, renames, reorders, adds, or removes phases. All JTD and Cognitive Load cards can be assigned to a phase — assignment shown on card in Extract view, drives column placement in Visualise view. Unassigned cards appear in an "Unassigned" column in Visualise view.

### 15.4 Navigation Guidance
The workbench must provide clear progress signals at each stage:

- When Discovery conversation has sufficient material: prompt to confirm cards
- When all cards are confirmed: prompt to generate clusters
- When clusters are proposed: prompt to score and confirm delegation mode
- When clusters are confirmed: prompt to proceed to Agentic Design

Never leave the consultant wondering what to do next.

---

*This document is the single source of truth for the ATW build. Any ambiguity should be resolved by returning to Section 1 (Vision) and Section 2 (Framework). Default to: what makes the consultant smarter and faster, while keeping framework fidelity intact.*
