import * as client from "./client";
import type {
  ClusterProcessStep,
  CognitiveJTDUpdate,
  CognitiveMap,
  DelegationCluster,
  DelegationClusterUpdate,
  LivedJTD,
  LivedJTDUpdate,
  CognitiveJTD,
  ProcessFlow,
  ProcessStep,
  ProcessStepCreate,
  ProcessStepJTDLink,
  ProcessStepJTDLinkCreate,
  ProcessStepUpdate,
  RawInput,
} from "@/types/discovery";

const BASE = (ucId: string) => `/use-cases/${ucId}`;

export const discoveryApi = {
  // ─── Full cognitive map ───────────────────────────────────────────────────
  getMap: (ucId: string) =>
    client.get<CognitiveMap>(`${BASE(ucId)}/discovery`),

  // ─── File upload ──────────────────────────────────────────────────────────
  uploadFile: async (ucId: string, file: File): Promise<RawInput> => {
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
    return envelope.data as RawInput;
  },

  // ─── Lived JTDs ──────────────────────────────────────────────────────────
  updateLivedJTD: (ucId: string, jtdId: string, payload: LivedJTDUpdate) =>
    client.patch<LivedJTD, LivedJTDUpdate>(
      `${BASE(ucId)}/lived-jtds/${jtdId}`,
      payload
    ),

  deleteLivedJTD: (ucId: string, jtdId: string) =>
    client.del(`${BASE(ucId)}/lived-jtds/${jtdId}`),

  // ─── Cognitive JTDs ──────────────────────────────────────────────────────
  updateCognitiveJTD: (
    ucId: string,
    jtdId: string,
    payload: CognitiveJTDUpdate
  ) =>
    client.patch<CognitiveJTD, CognitiveJTDUpdate>(
      `${BASE(ucId)}/cognitive-jtds/${jtdId}`,
      payload
    ),

  deleteCognitiveJTD: (ucId: string, jtdId: string) =>
    client.del(`${BASE(ucId)}/cognitive-jtds/${jtdId}`),

  // ─── Delegation Clusters ──────────────────────────────────────────────────
  updateCluster: (
    ucId: string,
    clusterId: string,
    payload: DelegationClusterUpdate
  ) =>
    client.patch<DelegationCluster, DelegationClusterUpdate>(
      `${BASE(ucId)}/clusters/${clusterId}`,
      payload
    ),

  deleteCluster: (ucId: string, clusterId: string) =>
    client.del(`${BASE(ucId)}/clusters/${clusterId}`),

  scoreCluster: (ucId: string, clusterId: string) =>
    client.post<DelegationCluster, Record<string, never>>(
      `${BASE(ucId)}/clusters/${clusterId}/score`,
      {}
    ),

  // ─── Process Flow ─────────────────────────────────────────────────────────
  getProcessFlow: (ucId: string) =>
    client.get<ProcessFlow>(`${BASE(ucId)}/process-flow`),

  createStep: (ucId: string, payload: ProcessStepCreate) =>
    client.post<ProcessStep, ProcessStepCreate>(
      `${BASE(ucId)}/process-flow/steps`,
      payload
    ),

  updateStep: (ucId: string, stepId: string, payload: ProcessStepUpdate) =>
    client.patch<ProcessStep, ProcessStepUpdate>(
      `${BASE(ucId)}/process-flow/steps/${stepId}`,
      payload
    ),

  deleteStep: (ucId: string, stepId: string) =>
    client.del(`${BASE(ucId)}/process-flow/steps/${stepId}`),

  addJTDLink: (ucId: string, stepId: string, payload: ProcessStepJTDLinkCreate) =>
    client.post<ProcessStepJTDLink, ProcessStepJTDLinkCreate>(
      `${BASE(ucId)}/process-flow/steps/${stepId}/jtd-links`,
      payload
    ),

  removeJTDLink: (ucId: string, stepId: string, linkId: string) =>
    client.del(`${BASE(ucId)}/process-flow/steps/${stepId}/jtd-links/${linkId}`),

  assignStepToCluster: (ucId: string, clusterId: string, stepId: string) =>
    client.post<ClusterProcessStep, Record<string, never>>(
      `${BASE(ucId)}/process-flow/clusters/${clusterId}/steps/${stepId}`,
      {}
    ),

  removeStepFromCluster: (ucId: string, clusterId: string, stepId: string) =>
    client.del(
      `${BASE(ucId)}/process-flow/clusters/${clusterId}/steps/${stepId}`
    ),
};

/** Build the WebSocket URL for a use case's discovery session. */
export function buildWsUrl(ucId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/api/v1/use-cases/${ucId}/ws`;
}
