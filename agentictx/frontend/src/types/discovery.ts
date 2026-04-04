// ─── Enums ──────────────────────────────────────────────────────────────────

export type RawInputType = "transcript" | "document" | "image" | "note";

export type ActivityStatus = "proposed" | "confirmed" | "rejected";

export type ScopeStatus = "proposed" | "confirmed" | "replaced";

export type MessageRole = "user" | "assistant" | "system";

// Backward compatibility aliases
export type JTDStatus = ActivityStatus;
export type ClusterStatus = ScopeStatus;

// ─── Source Material ─────────────────────────────────────────────────────────

export interface SourceMaterial {
  id: string;
  use_case_id: string;
  type: RawInputType;
  content: string | null;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  processed: boolean;
  created_at: string;
}

// Backward compatibility alias
export type RawInput = SourceMaterial;

// ─── Conversation Message ─────────────────────────────────────────────────────

export interface ConversationMessage {
  id: string;
  use_case_id: string;
  role: MessageRole;
  content: AnthropicContentBlock[];
  created_at: string;
}

// Anthropic content block types (simplified subset used in UI)
export type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: unknown };

// ─── Activity (formerly LivedJTD) ───────────────────────────────────────────

export interface Activity {
  id: string;
  use_case_id: string;
  description: string;
  system_context: string | null;
  process_phase_id: string | null;
  status: ActivityStatus;
  linked_cognitive_jtd_id: string | null;
  source_message_id: string | null;
  is_modified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityCreate {
  description: string;
  system_context?: string | null;
  process_phase_id?: string | null;
}

export interface ActivityUpdate {
  description?: string;
  system_context?: string | null;
  process_phase_id?: string | null;
  status?: ActivityStatus;
  linked_cognitive_jtd_id?: string | null;
  is_modified?: boolean;
}

// Backward compatibility aliases
export type LivedJTD = Activity;
export type LivedJTDCreate = ActivityCreate;
export type LivedJTDUpdate = ActivityUpdate;

// ─── Cognitive Load (formerly CognitiveJTD) ─────────────────────────────────

export interface CognitiveLoad {
  id: string;
  use_case_id: string;
  description: string;
  cognitive_zone: string | null;
  load_intensity: number | null;
  process_phase_id: string | null;
  linked_lived_jtd_ids: string[] | null;
  status: ActivityStatus;
  source_message_id: string | null;
  is_modified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CognitiveLoadCreate {
  description: string;
  cognitive_zone?: string | null;
  load_intensity?: number | null;
  process_phase_id?: string | null;
}

export interface CognitiveLoadUpdate {
  description?: string;
  cognitive_zone?: string | null;
  load_intensity?: number | null;
  process_phase_id?: string | null;
  linked_lived_jtd_ids?: string[] | null;
  status?: ActivityStatus;
  is_modified?: boolean;
}

// Backward compatibility aliases
export type CognitiveJTD = CognitiveLoad;
export type CognitiveJTDCreate = CognitiveLoadCreate;
export type CognitiveJTDUpdate = CognitiveLoadUpdate;

// ─── Agent Scope (formerly DelegationCluster) ───────────────────────────────

export interface ReadinessScores {
  cognitive_load_intensity: number;
  input_data_structure: number;
  actionability_tool_coverage: number;
  decision_determinism: number;
  risk_compliance_sensitivity: number;
  context_complexity: number;
  exception_rate: number;
  turn_taking_complexity: number;
  latency_constraints: number;
}

export interface AgentScope {
  id: string;
  use_case_id: string;
  name: string;
  purpose: string | null;
  cognitive_jtd_ids: string[];
  lived_jtd_ids: string[] | null;
  suitability_scores: ReadinessScores | null;
  delegation_mode: string | null;
  status: ScopeStatus;
  is_scored: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentScopeUpdate {
  name?: string;
  purpose?: string | null;
  cognitive_jtd_ids?: string[];
  lived_jtd_ids?: string[] | null;
  delegation_mode?: string | null;
  status?: ScopeStatus;
}

// Backward compatibility aliases
export type SuitabilityScores = ReadinessScores;
export type DelegationCluster = AgentScope;
export type DelegationClusterUpdate = AgentScopeUpdate;

// ─── Cognitive Map ────────────────────────────────────────────────────────────

export interface CognitiveMap {
  use_case_id: string;
  raw_inputs: SourceMaterial[];
  conversation_messages: ConversationMessage[];
  lived_jtds: Activity[];
  cognitive_jtds: CognitiveLoad[];
  delegation_clusters: AgentScope[];
}

// ─── WebSocket Event Types ────────────────────────────────────────────────────

export interface WSTextDelta {
  type: "text_delta";
  delta: string;
}

export interface WSActivitiesProposed {
  type: "activities_proposed";
  items: Activity[];
}

export interface WSCognitiveLoadProposed {
  type: "cognitive_load_proposed";
  items: CognitiveLoad[];
}

export interface WSAgentScopeProposed {
  type: "cluster_proposed";
  cluster: AgentScope;
}

export interface WSMessageComplete {
  type: "message_complete";
  message_id: string;
}

export interface WSError {
  type: "error";
  message: string;
}

export interface WSSystemNotification {
  type: "system_notification";
  text: string;
  highlight?: string;
}

export interface WSScopesReplaced {
  type: "clusters_replaced";
  count: number;
}

export interface WSToolCallStarted {
  type: "tool_call_started";
  tool_name: string;
}

export interface WSToolCallCompleted {
  type: "tool_call_completed";
  tool_name: string;
  summary: string;
}

export interface WSProcessPhasesProposed {
  type: "process_phases_proposed";
  phases: Phase[];
}

export type WSServerEvent =
  | WSTextDelta
  | WSActivitiesProposed
  | WSCognitiveLoadProposed
  | WSProcessPhasesProposed
  | WSAgentScopeProposed
  | WSMessageComplete
  | WSError
  | WSSystemNotification
  | WSScopesReplaced
  | WSToolCallStarted
  | WSToolCallCompleted;

// Backward compatibility aliases for WS events (kept for any external consumers)
export type WSLivedJTDsProposed = WSActivitiesProposed;
export type WSCognitiveJTDsProposed = WSCognitiveLoadProposed;
export type WSClusterProposed = WSAgentScopeProposed;
export type WSClustersReplaced = WSScopesReplaced;

// ─── Phase (formerly ProcessStep) ───────────────────────────────────────────

export interface Phase {
  id: string;
  use_case_id: string;
  name: string;
  description: string | null;
  sequence_order: number;
  is_breakpoint: boolean;
  cognitive_load_intensity: number | null;
  created_at: string;
  updated_at: string;
}

export interface PhaseCreate {
  name: string;
  description?: string | null;
  sequence_order: number;
  is_breakpoint?: boolean;
  cognitive_load_intensity?: number | null;
}

export interface PhaseUpdate {
  name?: string;
  description?: string | null;
  sequence_order?: number;
  is_breakpoint?: boolean;
  cognitive_load_intensity?: number | null;
}

// Backward compatibility aliases
export type ProcessStep = Phase;
export type ProcessStepCreate = PhaseCreate;
export type ProcessStepUpdate = PhaseUpdate;

export interface ScopePhaseLink {
  id: string;
  cluster_id: string;
  process_step_id: string;
}

// Backward compatibility alias
export type ClusterProcessStep = ScopePhaseLink;

export interface ProcessFlow {
  use_case_id: string;
  steps: Phase[];
  cluster_steps: ScopePhaseLink[];
}

// ─── UI-only types ─────────────────────────────────────────────────────────────

/** A chat message shown in the input panel. */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  streaming?: boolean;
}
