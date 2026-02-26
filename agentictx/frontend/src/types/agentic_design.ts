// Mirrors backend app/schemas/agentic_design.py and app/models/agentic_design.py

export type AgentSpecStatus = "draft" | "approved";
export type AutonomyLevel = "full_delegation" | "supervised_execution" | "assisted_mode";
export type DesignMessageRole = "user" | "assistant";

// ─── Phase 5a: Diagram structured types ──────────────────────────────────────

export interface SystemPromptComponent {
  description: string;
  estimated_tokens: number;
  cache_hit_pct: number;
  engineering_effort?: string;
}

export interface DynamicContextItem {
  name: string;
  source: string;
  estimated_tokens_per_call: number;
  cache_hit_pct: number;
  fetch_frequency?: string;
}

export interface FewShotExamples {
  description: string;
  estimated_tokens: number;
  cache_hit_pct: number;
  update_frequency?: string;
}

export interface Guardrail {
  description: string;
  type: "safety" | "compliance" | "scope";
  estimated_tokens: number;
  cache_hit_pct: number;
}

export interface PromptRequirements {
  system_prompt?: SystemPromptComponent;
  dynamic_context?: DynamicContextItem[];
  few_shot_examples?: FewShotExamples;
  guardrails?: Guardrail[];
}

export type InputChannelType = "voice" | "form" | "system_event" | "agent_handoff";

export interface InputChannel {
  name: string;
  type: InputChannelType;
  icon?: string;
  estimated_tokens_per_call: number;
  description?: string;
}

export type ToolStatus = "existing" | "new" | "pending" | "blocked";
export type ToolType = "mcp_server" | "knowledge_base";

export interface ConnectedSystem {
  name: string;
  node_prefix: string;
  type: string;
  status: ToolStatus;
}

export interface BackwardImpact {
  agent: string;
  change_required: string;
  effort: string;
}

export interface Tool {
  name: string;
  node_prefix: string;
  type: ToolType;
  status: ToolStatus;
  build_effort?: string;
  input_tokens_per_call: number;
  output_tokens_per_call: number;
  output_cache_hit_pct: number;
  used_by_agents?: string[];
  backward_impact?: BackwardImpact[];
  connected_systems?: ConnectedSystem[];
}

export type OutputChannelType = "system_write" | "text_response" | "agent_handoff" | "audit_log";

export interface OutputChannel {
  type: OutputChannelType;
  name: string;
  destination?: string;
  format?: string;
  estimated_tokens: number;
  latency_requirement_ms?: number | null;
}

export type AssumptionRisk = "low" | "medium" | "high";
export type AssumptionResolutionStatus = "open" | "resolved" | "escalated";

export interface Assumption {
  id: string;
  description: string;
  linked_to?: string;
  risk_level?: AssumptionRisk;
  owner?: string | null;
  resolution_status?: AssumptionResolutionStatus;
}

export type HandoffType = "sequential" | "parallel" | "conditional";

export interface AgentHandoff {
  id: string;
  use_case_id: string;
  from_agent_id: string;
  to_agent_id: string;
  trigger_condition?: string | null;
  payload_description?: string | null;
  estimated_tokens: number;
  handoff_type: HandoffType;
  created_at: string;
  updated_at: string;
}

export interface SupervisedActivity {
  activity: string;
  hitl_trigger?: string;
  human_action?: string;
}

export interface DataSource {
  name: string;
  type?: string;
  availability?: string;
  access_method?: string;
}

export interface McpServer {
  name: string;
  purpose?: string;
}

export interface ToolApi {
  name: string;
  type?: string;
  endpoint?: string;
}

export interface InputDefinition {
  trigger?: string;
  format?: string;
  variability?: string;
}

export interface OutputDefinition {
  format?: string;
  destination?: string;
  success_criteria?: string;
}

export interface HitlDesign {
  trigger_conditions?: string[];
  escalation_path?: string;
  human_role?: string;
}

export interface Compliance {
  eu_ai_act_class?: "Minimal Risk" | "Limited Risk" | "High Risk" | "Prohibited";
  gdpr_implications?: string;
  audit_requirements?: string;
  guardrails?: string[];
}

export interface AgentSpecification {
  id: string;
  use_case_id: string;
  delegation_cluster_id: string | null;
  name: string;
  purpose: string | null;
  autonomy_level: AutonomyLevel | null;
  // Phase 5a
  model: string | null;
  maturity_score: number | null;
  activities: string[];
  supervised_activities: SupervisedActivity[];
  out_of_scope: string[];
  data_sources: DataSource[];
  mcp_servers: McpServer[];
  tools_apis: ToolApi[];
  input_definition: InputDefinition;
  output_definition: OutputDefinition;
  hitl_design: HitlDesign;
  compliance: Compliance;
  open_questions: string[];
  // Phase 5a: diagram structured fields
  prompt_requirements: PromptRequirements;
  input_channels: InputChannel[];
  tool_stack: Tool[];
  output_channels: OutputChannel[];
  assumptions: Assumption[];
  // Phase 5b: persisted node positions — {nodeId: {x, y}}
  node_positions: Record<string, { x: number; y: number }>;
  status: AgentSpecStatus;
  created_at: string;
  updated_at: string;
}

export interface AgentSpecificationUpdate {
  name?: string;
  purpose?: string;
  autonomy_level?: AutonomyLevel;
  model?: string;
  maturity_score?: number;
  activities?: string[];
  supervised_activities?: SupervisedActivity[];
  out_of_scope?: string[];
  data_sources?: DataSource[];
  mcp_servers?: McpServer[];
  tools_apis?: ToolApi[];
  input_definition?: InputDefinition;
  output_definition?: OutputDefinition;
  hitl_design?: HitlDesign;
  compliance?: Compliance;
  open_questions?: string[];
  // Phase 5a: diagram fields
  prompt_requirements?: PromptRequirements;
  input_channels?: InputChannel[];
  tool_stack?: Tool[];
  output_channels?: OutputChannel[];
  assumptions?: Assumption[];
  // Phase 5b: node positions
  node_positions?: Record<string, { x: number; y: number }>;
  status?: AgentSpecStatus;
}

export interface AgenticDesignMessage {
  id: string;
  use_case_id: string;
  role: DesignMessageRole;
  content: unknown;
  created_at: string;
}

export interface CrossAgentOpportunity {
  resource_type: "data_source" | "mcp_server" | "tool_api";
  resource_name: string;
  shared_by_agents: string[];
  reuse_recommendation: string;
}

export interface AgenticDesignMap {
  use_case_id: string;
  agent_specifications: AgentSpecification[];
  messages: AgenticDesignMessage[];
  cross_agent_opportunities: CrossAgentOpportunity[];
  handoffs: AgentHandoff[];
}

// UI-only chat message type (mirrors discovery ChatMessage pattern)
export interface DesignChatMessage {
  id: string;
  role: DesignMessageRole;
  text: string;
  streaming?: boolean;
}

// WebSocket event types
export interface WSDesignTextDelta {
  type: "text_delta";
  delta: string;
}

export interface WSDesignSpecProposed {
  type: "agent_spec_proposed";
  spec: AgentSpecification;
}

export interface WSDesignCrossAgentOpportunity {
  type: "cross_agent_opportunity";
  opportunity: CrossAgentOpportunity;
}

export interface WSDesignMessageComplete {
  type: "message_complete";
  message_id: string;
}

export interface WSDesignError {
  type: "error";
  message: string;
}

export type WSDesignServerEvent =
  | WSDesignTextDelta
  | WSDesignSpecProposed
  | WSDesignCrossAgentOpportunity
  | WSDesignMessageComplete
  | WSDesignError;
