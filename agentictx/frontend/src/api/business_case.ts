import axios from "axios";
import * as client from "./client";
import type {
  AssumptionsUpdate,
  BusinessCase,
  BusinessCaseScenario,
  ModalityUpdate,
  ScenarioCreate,
  ScenarioUpdate,
} from "@/types/business_case";

const BASE = (ucId: string) => `/use-cases/${ucId}/business-case`;

export const businessCaseApi = {
  // ── Get or create ─────────────────────────────────────────────────────────
  get: (ucId: string) =>
    client.get<BusinessCase>(BASE(ucId)),

  // ── Assumptions ───────────────────────────────────────────────────────────
  patchAssumptions: (ucId: string, payload: AssumptionsUpdate) =>
    client.patch<BusinessCase, AssumptionsUpdate>(`${BASE(ucId)}/assumptions`, payload),

  // ── Modality ──────────────────────────────────────────────────────────────
  patchModality: (ucId: string, payload: ModalityUpdate) =>
    client.patch<BusinessCase, ModalityUpdate>(`${BASE(ucId)}/modality`, payload),

  // ── Scenarios ─────────────────────────────────────────────────────────────
  createScenario: (ucId: string, payload: ScenarioCreate) =>
    client.post<BusinessCaseScenario, ScenarioCreate>(`${BASE(ucId)}/scenarios`, payload),

  updateScenario: (ucId: string, scenarioId: string, payload: ScenarioUpdate) =>
    client.patch<BusinessCaseScenario, ScenarioUpdate>(
      `${BASE(ucId)}/scenarios/${scenarioId}`,
      payload
    ),

  deleteScenario: (ucId: string, scenarioId: string) =>
    client.del(`${BASE(ucId)}/scenarios/${scenarioId}`),

  // ── Calculate ─────────────────────────────────────────────────────────────
  calculate: (ucId: string) =>
    client.post<BusinessCase, Record<string, never>>(`${BASE(ucId)}/calculate`, {}),

  // ── Export Excel ──────────────────────────────────────────────────────────
  exportExcel: async (ucId: string): Promise<void> => {
    const response = await axios.get(`/api/v1${BASE(ucId)}/export/excel`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `business_case_${ucId}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
