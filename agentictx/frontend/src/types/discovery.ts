// ─── Enums (mirror Python models exactly) ─────────────────────────────────────

export type RawInputType = "transcript" | "document" | "image" | "note";

export type JTDStatus = "proposed" | "confirmed" | "rejected";

export type ClusterStatus = "proposed" | "confirmed" | "replaced";

export type MessageRole = "user" | "assistant" | "system";

// ─── Raw Input ────────────────────────────────────────────────────────────────

export interface RawInput {
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

// ─── Lived JTD ───────────────────────────────────────────────────────────────

export interface LivedJTD {
  id: string;
  use_case_id: string;
  description: string;
  system_context: string | null;
  process_phase_id: string | null;
  status: JTDStatus;
  linked_cognitive_jtd_id: string | null;
  source_message_id: string | null;
  is_modified: boolean;
  created_at: string;
  updated_at: string;
}

export interface LivedJTDCreate {
  description: string;
  system_context?: string | null;
  process_phase_id?: string | null;
}

export interface LivedJTDUpdate {
  description?: string;
  system_context?: string | null;
  process_phase_id?: string | null;
  status?: JTDStatus;
  linked_cognitive_jtd_id?: string | null;
  is_modified?: boolean;
}

// ─── Cognitive JTD ───────────────────────────────────────────────────────────

export interface CognitiveJTD {
  id: string;
  use_case_id: string;
  description: string;
  cognitive_zone: string | null;
  load_intensity: number | null;
  process_phase_id: string | null;
  linked_lived_jtd_ids: string[] | null;
  status: JTDStatus;
  source_message_id: string | null;
  is_modified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CognitiveJTDCreate {
  description: string;
  cognitive_zone?: string | null;
  load_intensity?: number | null;
  process_phase_id?: string | null;
}

export interface CognitiveJTDUpdate {
  description?: string;
  cognitive_zone?: string | null;
  load_intensity?: number | null;
  process_phase_id?: string | null;
  linked_lived_jtd_ids?: string[] | null;
  status?: JTDStatus;
  is_modified?: boolean;
}

// ─── Delegation Cluster ───────────────────────────────────────────────────────

export interface SuitabilityScores {
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

export interface DelegationCluster {
  id: string;
  use_case_id: string;
  name: string;
  purpose: string | null;
  cognitive_jtd_ids: string[];
  lived_jtd_ids: string[] | null;
  suitability_scores: SuitabilityScores | null;
  delegation_mode: string | null;
  status: ClusterStatus;
  is_scored: boolean;
  created_at: string;
  updated_at: string;
}

export interface DelegationClusterUpdate {
  name?: string;
  purpose?: string | null;
  cognitive_jtd_ids?: string[];
  lived_jtd_ids?: string[] | null;
  delegation_mode?: string | null;
  status?: ClusterStatus;
}

// ─── Cognitive Map ────────────────────────────────────────────────────────────

export interface CognitiveMap {
  use_case_id: string;
  raw_inputs: RawInput[];
  conversation_messages: ConversationMessage[];
  lived_jtds: LivedJTD[];
  cognitive_jtds: CognitiveJTD[];
  delegation_clusters: DelegationCluster[];
}

// ─── WebSocket Event Types ────────────────────────────────────────────────────

export interface WSTextDelta {
  type: "text_delta";
  delta: string;
}

export interface WSLivedJTDsProposed {
  type: "lived_jtds_proposed";
  jtds: LivedJTD[];
}

export interface WSCognitiveJTDsProposed {
  type: "cognitive_jtds_proposed";
  jtds: CognitiveJTD[];
}

export interface WSClusterProposed {
  type: "cluster_proposed";
  cluster: DelegationCluster;
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

export interface WSClustersReplaced {
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
  phases: ProcessStep[];
}

export type WSServerEvent =
  | WSTextDelta
  | WSLivedJTDsProposed
  | WSCognitiveJTDsProposed
  | WSProcessPhasesProposed
  | WSClusterProposed
  | WSMessageComplete
  | WSError
  | WSSystemNotification
  | WSClustersReplaced
  | WSToolCallStarted
  | WSToolCallCompleted;

// ─── Process Visualisation ────────────────────────────────────────────────────

export interface ProcessStep {
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

export interface ProcessStepCreate {
  name: string;
  description?: string | null;
  sequence_order: number;
  is_breakpoint?: boolean;
  cognitive_load_intensity?: number | null;
}

export interface ProcessStepUpdate {
  name?: string;
  description?: string | null;
  sequence_order?: number;
  is_breakpoint?: boolean;
  cognitive_load_intensity?: number | null;
}

export interface ClusterProcessStep {
  id: string;
  cluster_id: string;
  process_step_id: string;
}

export interface ProcessFlow {
  use_case_id: string;
  steps: ProcessStep[];
  cluster_steps: ClusterProcessStep[];
}

// ─── UI-only types ─────────────────────────────────────────────────────────────

/** A chat message shown in the input panel. */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  streaming?: boolean;
}
