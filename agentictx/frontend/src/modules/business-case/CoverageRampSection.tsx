import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { businessCaseApi } from "@/api/business_case";
import type { BusinessCase } from "@/types/business_case";

interface Props {
  useCaseId: string;
  bc: BusinessCase;
}

export function CoverageRampSection({ useCaseId, bc }: Props) {
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  // Work with a local 48-entry array, padded from stored ramp
  const storedRamp = bc.coverage_ramp ?? [];
  const buildFull = (): number[] => {
    const arr = Array.from({ length: 48 }, (_, i) => {
      if (i < storedRamp.length) return storedRamp[i];
      return storedRamp.length > 0 ? storedRamp[storedRamp.length - 1] : 0;
    });
    return arr;
  };

  const [localRamp, setLocalRamp] = useState<number[]>(buildFull);

  const mutation = useMutation({
    mutationFn: (ramp: number[]) =>
      businessCaseApi.patchAssumptions(useCaseId, { coverage_ramp: ramp }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business-case", useCaseId], updated);
    },
  });

  const updateCell = (index: number, raw: string) => {
    const parsed = parseFloat(raw);
    const value = isNaN(parsed) ? 0 : Math.min(1, Math.max(0, parsed));
    const next = [...localRamp];
    next[index] = value;
    setLocalRamp(next);
    mutation.mutate(next);
  };

  const fillRemaining = () => {
    const base = localRamp[11] ?? 0;
    const next = [...localRamp];
    for (let i = 12; i < 48; i++) next[i] = base;
    setLocalRamp(next);
    mutation.mutate(next);
  };

  const visibleCount = showAll ? 48 : 12;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 mt-5">
        <h3 className="text-xs font-ui uppercase tracking-widest text-text-muted">
          Coverage Ramp
        </h3>
        <div className="flex gap-2">
          <button
            onClick={fillRemaining}
            className="text-xs font-ui text-text-muted hover:text-text-secondary px-2 py-0.5 border border-bg-border"
            style={{ borderColor: "var(--bg-border)" }}
          >
            Fill M13–48
          </button>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-ui text-text-muted hover:text-text-secondary px-2 py-0.5 border border-bg-border"
            style={{ borderColor: "var(--bg-border)" }}
          >
            {showAll ? "Show M1–12" : "Show all 48"}
          </button>
        </div>
      </div>

      <p className="text-xs text-text-muted font-ui mb-3">
        Enter % of volume handled by AI each month (0–1). M1 = Month 1.
      </p>

      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: visibleCount }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <label className="text-xs text-text-muted font-ui">M{i + 1}</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={localRamp[i] ?? 0}
              onChange={(e) => updateCell(i, e.target.value)}
              className="w-full bg-bg-primary border border-bg-border text-text-primary text-xs px-1 py-1 font-ui text-center focus:outline-none focus:border-accent-primary"
              style={{ borderColor: "var(--bg-border)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
