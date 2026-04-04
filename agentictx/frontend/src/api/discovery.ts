import * as client from "./client";
import type {
  Activity,
  ActivityCreate,
  ActivityUpdate,
  AgentScope,
  AgentScopeUpdate,
  CognitiveLoad,
  CognitiveLoadCreate,
  CognitiveLoadUpdate,
  CognitiveMap,
  Phase,
  PhaseCreate,
  PhaseUpdate,
  ProcessFlow,
  ScopePhaseLink,
  SourceMaterial,
} from "@/types/discovery";

const BASE = (ucId: string) => `/use-cases/${ucId}`;

export const discoveryApi = {
  // ─── Full cognitive map ───────────────────────────────────────────────────
  getMap: (ucId: string) =>
    client.get<CognitiveMap>(`${BASE(ucId)}/discovery`),

  // ─── File upload ──────────────────────────────────────────────────────────
  uploadFile: async (ucId: string, file: File): Promise<SourceMaterial> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/v1/use-cases/${ucId}/raw-inputs`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.detail || data?.error || "Upload failed");
    }
    const envelope = await res.json();
    if (envelope.error) throw new Error(envelope.error);
    return envelope.data as SourceMaterial;
  },

  // ─── Activities ──────────────────────────────────────────────────────────
  createActivity: (ucId: string, payload: ActivityCreate) =>
    client.post<Activity, ActivityCreate>(
      `${BASE(ucId)}/activities`,
      payload
    ),

  updateActivity: (ucId: string, activityId: string, payload: ActivityUpdate) =>
    client.patch<Activity, ActivityUpdate>(
      `${BASE(ucId)}/activities/${activityId}`,
      payload
    ),

  deleteActivity: (ucId: string, activityId: string) =>
    client.del(`${BASE(ucId)}/activities/${activityId}`),

  // ─── Cognitive Load Items ────────────────────────────────────────────────
  createCognitiveLoad: (ucId: string, payload: CognitiveLoadCreate) =>
    client.post<CognitiveLoad, CognitiveLoadCreate>(
      `${BASE(ucId)}/cognitive-load`,
      payload
    ),

  updateCognitiveLoad: (
    ucId: string,
    itemId: string,
    payload: CognitiveLoadUpdate
  ) =>
    client.patch<CognitiveLoad, CognitiveLoadUpdate>(
      `${BASE(ucId)}/cognitive-load/${itemId}`,
      payload
    ),

  deleteCognitiveLoad: (ucId: string, itemId: string) =>
    client.del(`${BASE(ucId)}/cognitive-load/${itemId}`),

  // ─── Agent Scopes (Delegation Clusters) ──────────────────────────────────
  updateScope: (
    ucId: string,
    scopeId: string,
    payload: AgentScopeUpdate
  ) =>
    client.patch<AgentScope, AgentScopeUpdate>(
      `${BASE(ucId)}/clusters/${scopeId}`,
      payload
    ),

  deleteScope: (ucId: string, scopeId: string) =>
    client.del(`${BASE(ucId)}/clusters/${scopeId}`),

  scoreScope: (ucId: string, scopeId: string) =>
    client.post<AgentScope, Record<string, never>>(
      `${BASE(ucId)}/clusters/${scopeId}/score`,
      {}
    ),

  // ─── Scope Membership Editing ──────────────────────────────────────────────
  addScopeActivity: (ucId: string, scopeId: string, activityId: string) =>
    client.put<AgentScope>(
      `${BASE(ucId)}/clusters/${scopeId}/activities/${activityId}`
    ),

  removeScopeActivity: (ucId: string, scopeId: string, activityId: string) =>
    client.del<AgentScope>(
      `${BASE(ucId)}/clusters/${scopeId}/activities/${activityId}`
    ),

  addScopeCognitiveLoad: (ucId: string, scopeId: string, itemId: string) =>
    client.put<AgentScope>(
      `${BASE(ucId)}/clusters/${scopeId}/cognitive-load/${itemId}`
    ),

  removeScopeCognitiveLoad: (ucId: string, scopeId: string, itemId: string) =>
    client.del<AgentScope>(
      `${BASE(ucId)}/clusters/${scopeId}/cognitive-load/${itemId}`
    ),

  // ─── System Messages ───────────────────────────────────────────────────────
  saveSystemMessage: (ucId: string, text: string) =>
    client.post<{ id: string; role: string; text: string }, { role: string; text: string }>(
      `${BASE(ucId)}/messages`,
      { role: "system", text }
    ),

  // ─── Process Flow ─────────────────────────────────────────────────────────
  getProcessFlow: (ucId: string) =>
    client.get<ProcessFlow>(`${BASE(ucId)}/process-flow`),

  createStep: (ucId: string, payload: PhaseCreate) =>
    client.post<Phase, PhaseCreate>(
      `${BASE(ucId)}/process-flow/steps`,
      payload
    ),

  updateStep: (ucId: string, stepId: string, payload: PhaseUpdate) =>
    client.patch<Phase, PhaseUpdate>(
      `${BASE(ucId)}/process-flow/steps/${stepId}`,
      payload
    ),

  deleteStep: (ucId: string, stepId: string) =>
    client.del(`${BASE(ucId)}/process-flow/steps/${stepId}`),

  assignStepToScope: (ucId: string, scopeId: string, stepId: string) =>
    client.post<ScopePhaseLink, Record<string, never>>(
      `${BASE(ucId)}/process-flow/clusters/${scopeId}/steps/${stepId}`,
      {}
    ),

  removeStepFromScope: (ucId: string, scopeId: string, stepId: string) =>
    client.del(
      `${BASE(ucId)}/process-flow/clusters/${scopeId}/steps/${stepId}`
    ),
};

/** Build the WebSocket URL for a use case's discovery session. */
export function buildWsUrl(ucId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/api/v1/use-cases/${ucId}/ws`;
}
