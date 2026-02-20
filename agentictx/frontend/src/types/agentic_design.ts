// Mirrors backend app/schemas/agentic_design.py and app/models/agentic_design.py

export type AgentSpecStatus = "draft" | "approved";
export type AutonomyLevel = "full_delegation" | "supervised_execution" | "assisted_mode";
export type DesignMessageRole = "user" | "assistant";

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
  status: AgentSpecStatus;
  created_at: string;
  updated_at: string;
}

export interface AgentSpecificationUpdate {
  name?: string;
  purpose?: string;
  autonomy_level?: AutonomyLevel;
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
