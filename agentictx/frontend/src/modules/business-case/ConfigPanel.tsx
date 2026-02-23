import type { BusinessCase } from "@/types/business_case";
import { ModalityToggleSection } from "./ModalityToggleSection";
import { AssumptionsSection } from "./AssumptionsSection";
import { CoverageRampSection } from "./CoverageRampSection";
import { ScenarioConfigSection } from "./ScenarioConfigSection";

interface Props {
  useCaseId: string;
  bc: BusinessCase;
}

export function ConfigPanel({ useCaseId, bc }: Props) {
  return (
    <div
      className="flex flex-col h-full border-r overflow-y-auto"
      style={{ borderColor: "var(--bg-border)", width: "40%" }}
    >
      <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--bg-border)" }}>
        <h2 className="text-sm font-medium text-text-primary">Configuration</h2>
        <p className="text-xs text-text-muted font-ui mt-0.5">
          Define assumptions, modality, and scenarios
        </p>
      </div>

      <div className="px-5 py-4 flex-1 overflow-y-auto">
        <ModalityToggleSection useCaseId={useCaseId} bc={bc} />
        <AssumptionsSection useCaseId={useCaseId} bc={bc} />
        <CoverageRampSection useCaseId={useCaseId} bc={bc} />
        <ScenarioConfigSection useCaseId={useCaseId} bc={bc} />
      </div>
    </div>
  );
}
