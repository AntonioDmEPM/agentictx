import { get, post, patch, del } from "./client";
import type {
  Engagement,
  EngagementCreate,
  EngagementListItem,
  EngagementUpdate,
  UseCase,
  UseCaseCreate,
  UseCaseUpdate,
} from "@/types";

// ─── Engagements ─────────────────────────────────────────────────────────────

export const engagementsApi = {
  list: () => get<EngagementListItem[]>("/engagements"),

  get: (id: string) => get<Engagement>(`/engagements/${id}`),

  create: (payload: EngagementCreate) =>
    post<Engagement, EngagementCreate>("/engagements", payload),

  update: (id: string, payload: EngagementUpdate) =>
    patch<Engagement, EngagementUpdate>(`/engagements/${id}`, payload),

  archive: (id: string) =>
    post<Engagement, Record<string, never>>(`/engagements/${id}/archive`, {}),

  delete: (id: string) => del(`/engagements/${id}`),
};

// ─── Use Cases ────────────────────────────────────────────────────────────────

export const useCasesApi = {
  list: (engagementId: string) =>
    get<UseCase[]>(`/engagements/${engagementId}/use-cases`),

  get: (engagementId: string, useCaseId: string) =>
    get<UseCase>(`/engagements/${engagementId}/use-cases/${useCaseId}`),

  create: (engagementId: string, payload: UseCaseCreate) =>
    post<UseCase, UseCaseCreate>(
      `/engagements/${engagementId}/use-cases`,
      payload
    ),

  update: (engagementId: string, useCaseId: string, payload: UseCaseUpdate) =>
    patch<UseCase, UseCaseUpdate>(
      `/engagements/${engagementId}/use-cases/${useCaseId}`,
      payload
    ),

  delete: (engagementId: string, useCaseId: string) =>
    del(`/engagements/${engagementId}/use-cases/${useCaseId}`),
};
