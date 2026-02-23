import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { businessCaseApi } from "@/api/business_case";
import type { BusinessCase } from "@/types/business_case";
import { MetricCards } from "./MetricCards";
import { ScenarioComparisonTable } from "./ScenarioComparisonTable";

interface Props {
  useCaseId: string;
  bc: BusinessCase;
}

export function ResultsPanel({ useCaseId, bc }: Props) {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  const hasResults = bc.scenarios.some(
    (s) => s.results?.monthly && s.results.monthly.length > 0
  );

  const calculateMut = useMutation({
    mutationFn: () => businessCaseApi.calculate(useCaseId),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business-case", useCaseId], updated);
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await businessCaseApi.exportExcel(useCaseId);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ width: "60%" }}>
      {/* Action bar */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor: "var(--bg-border)" }}
      >
        <div>
          <h2 className="text-sm font-medium text-text-primary">Financial Model</h2>
          <p className="text-xs text-text-muted font-ui mt-0.5">48-month P&L comparison</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => calculateMut.mutate()}
            disabled={calculateMut.isPending || bc.scenarios.length === 0}
            className="text-xs font-ui px-4 py-1.5 transition-colors disabled:opacity-40"
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "white",
            }}
          >
            {calculateMut.isPending ? "Calculating…" : "Calculate"}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !hasResults}
            className="text-xs font-ui px-4 py-1.5 border transition-colors disabled:opacity-40"
            style={{
              borderColor: "var(--accent-success)",
              color: "var(--accent-success)",
            }}
          >
            {isExporting ? "Exporting…" : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {calculateMut.isError && (
          <div
            className="mb-4 px-3 py-2 text-xs font-ui border"
            style={{
              borderColor: "var(--accent-warm)",
              color: "var(--accent-warm)",
              backgroundColor: "var(--bg-elevated)",
            }}
          >
            {calculateMut.error?.message ?? "Calculation failed. Check assumptions and try again."}
          </div>
        )}

        {!hasResults && !calculateMut.isPending && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-text-muted text-sm font-ui">
              {bc.scenarios.length === 0
                ? "Add at least one scenario in the Config panel, then run Calculate."
                : "Configure assumptions and pricing, then click Calculate to run the model."}
            </p>
          </div>
        )}

        {hasResults && (
          <>
            <MetricCards scenarios={bc.scenarios} />
            <div
              className="mt-6 pt-4 border-t"
              style={{ borderColor: "var(--bg-border)" }}
            >
              <h3 className="text-xs font-ui uppercase tracking-widest text-text-muted mb-3">
                Month-by-Month Comparison
              </h3>
              <ScenarioComparisonTable scenarios={bc.scenarios} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
