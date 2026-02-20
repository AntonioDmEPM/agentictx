import * as client from "./client";
import type {
  AgenticDesignMap,
  AgentSpecification,
  AgentSpecificationUpdate,
} from "@/types/agentic_design";

const BASE = (ucId: string) => `/use-cases/${ucId}/agentic-design`;

export const agenticDesignApi = {
  // ─── Full design map ──────────────────────────────────────────────────────
  getMap: (ucId: string) =>
    client.get<AgenticDesignMap>(BASE(ucId)),

  // ─── Agent specifications ─────────────────────────────────────────────────
  getSpec: (ucId: string, specId: string) =>
    client.get<AgentSpecification>(`${BASE(ucId)}/${specId}`),

  updateSpec: (ucId: string, specId: string, payload: AgentSpecificationUpdate) =>
    client.patch<AgentSpecification, AgentSpecificationUpdate>(
      `${BASE(ucId)}/${specId}`,
      payload
    ),

  deleteSpec: (ucId: string, specId: string) =>
    client.del(`${BASE(ucId)}/${specId}`),

  approveSpec: (ucId: string, specId: string) =>
    client.post<AgentSpecification, Record<string, never>>(
      `${BASE(ucId)}/${specId}/approve`,
      {}
    ),

  // ─── ARD document download ────────────────────────────────────────────────
  downloadArd: async (ucId: string): Promise<void> => {
    const res = await fetch(`/api/v1/use-cases/${ucId}/agentic-design/document/ard`);
    if (!res.ok) throw new Error("Failed to generate ARD document");
    const blob = await res.blob();
    const contentDisposition = res.headers.get("Content-Disposition") || "";
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : "ARD.md";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

/** Build the WebSocket URL for a use case's agentic design session. */
export function buildDesignWsUrl(ucId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/api/v1/use-cases/${ucId}/agentic-design/ws`;
}
