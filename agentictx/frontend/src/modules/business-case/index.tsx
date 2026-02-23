import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { businessCaseApi } from "@/api/business_case";
import { useBusinessCaseStore } from "@/store/businessCaseStore";
import { ConfigPanel } from "./ConfigPanel";
import { ResultsPanel } from "./ResultsPanel";

export function BusinessCaseModule() {
  const { useCaseId } = useParams<{ useCaseId: string }>();
  const reset = useBusinessCaseStore((s) => s.reset);

  const { data: bc, isLoading, isError, error } = useQuery({
    queryKey: ["business-case", useCaseId],
    queryFn: () => businessCaseApi.get(useCaseId!),
    enabled: !!useCaseId,
    staleTime: 0,
  });

  // Reset store on unmount
  useEffect(() => {
    return () => reset();
  }, [reset]);

  if (!useCaseId) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-ui">
        No use case selected.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-ui">
        Loading business case…
      </div>
    );
  }

  if (isError || !bc) {
    return (
      <div className="flex items-center justify-center h-full text-accent-warm text-sm font-ui">
        {error instanceof Error ? error.message : "Failed to load business case."}
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      <ConfigPanel useCaseId={useCaseId} bc={bc} />
      <ResultsPanel useCaseId={useCaseId} bc={bc} />
    </div>
  );
}
