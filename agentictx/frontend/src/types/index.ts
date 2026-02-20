// ─── Shared ──────────────────────────────────────────────────────────────────

export interface ResponseEnvelope<T> {
  data: T | null;
  error: string | null;
  meta: Record<string, unknown> | null;
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export type EngagementStatus = "active" | "archived";

export type UseCaseStatus =
  | "pending"
  | "discovery"
  | "agentic_design"
  | "business_case"
  | "complete";

// ─── Engagement ──────────────────────────────────────────────────────────────

export interface EngagementListItem {
  id: string;
  client_name: string;
  industry: string | null;
  engagement_type: string | null;
  status: EngagementStatus;
  created_at: string;
  updated_at: string;
  use_case_count: number;
}

export interface Engagement {
  id: string;
  client_name: string;
  industry: string | null;
  engagement_type: string | null;
  status: EngagementStatus;
  created_at: string;
  updated_at: string;
  use_cases: UseCase[];
}

export interface EngagementCreate {
  client_name: string;
  industry?: string;
  engagement_type?: string;
}

export interface EngagementUpdate {
  client_name?: string;
  industry?: string;
  engagement_type?: string;
  status?: EngagementStatus;
}

// ─── Use Case ────────────────────────────────────────────────────────────────

export interface UseCase {
  id: string;
  engagement_id: string;
  name: string;
  description: string | null;
  status: UseCaseStatus;
  created_at: string;
  updated_at: string;
}

export interface UseCaseCreate {
  name: string;
  description?: string;
}

export interface UseCaseUpdate {
  name?: string;
  description?: string;
  status?: UseCaseStatus;
}
