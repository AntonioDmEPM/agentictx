import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { businessCaseApi } from "@/api/business_case";
import type { AssumptionsUpdate, BusinessCase } from "@/types/business_case";

interface Props {
  useCaseId: string;
  bc: BusinessCase;
}

function NumericField({
  label,
  value,
  onChange,
  step,
  min,
  max,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [local, setLocal] = useState(String(value));

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(local);
    if (!isNaN(parsed)) onChange(parsed);
    else setLocal(String(value));
  };

  return (
    <div className="mb-3">
      <label className="block text-xs text-text-muted font-ui mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-text-muted text-sm font-ui">{prefix}</span>}
        <input
          type="number"
          value={local}
          step={step ?? 1}
          min={min}
          max={max}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-full bg-bg-primary border border-bg-border text-text-primary text-sm px-2 py-1 font-ui focus:outline-none focus:border-accent-primary"
          style={{ borderColor: "var(--bg-border)" }}
        />
        {suffix && <span className="text-text-muted text-sm font-ui">{suffix}</span>}
      </div>
    </div>
  );
}

export function AssumptionsSection({ useCaseId, bc }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: AssumptionsUpdate) =>
      businessCaseApi.patchAssumptions(useCaseId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business-case", useCaseId], updated);
    },
  });

  const patch = useCallback(
    (payload: AssumptionsUpdate) => mutation.mutate(payload),
    [mutation]
  );

  return (
    <div>
      <h3 className="text-xs font-ui uppercase tracking-widest text-text-muted mb-3 mt-5">
        Volume & FTE
      </h3>
      <NumericField
        label="Weekly Volume (cases / calls)"
        value={bc.weekly_volume}
        min={0}
        onChange={(v) => patch({ weekly_volume: Math.round(v) })}
      />
      {bc.has_voice && (
        <NumericField
          label="Avg Duration (minutes)"
          value={bc.avg_duration_minutes}
          step={0.5}
          min={0}
          onChange={(v) => patch({ avg_duration_minutes: v })}
        />
      )}
      <NumericField
        label="FTE Count"
        value={bc.fte_count}
        min={1}
        onChange={(v) => patch({ fte_count: Math.round(v) })}
      />
      <NumericField
        label="Avg FTE Annual Cost"
        value={bc.avg_fte_annual_cost}
        step={1000}
        min={0}
        prefix="$"
        onChange={(v) => patch({ avg_fte_annual_cost: v })}
      />
      <NumericField
        label="FTE Monthly Overhead"
        value={bc.fte_monthly_overhead}
        step={100}
        min={0}
        prefix="$"
        onChange={(v) => patch({ fte_monthly_overhead: v })}
      />

      <h3 className="text-xs font-ui uppercase tracking-widest text-text-muted mb-3 mt-5">
        Token Density
      </h3>
      <NumericField
        label="Input Tokens per Case"
        value={bc.token_density_input}
        step={100}
        min={0}
        onChange={(v) => patch({ token_density_input: Math.round(v) })}
      />
      <NumericField
        label="Output Tokens per Case"
        value={bc.token_density_output}
        step={100}
        min={0}
        onChange={(v) => patch({ token_density_output: Math.round(v) })}
      />
      <NumericField
        label="Caching Ratio (0–1)"
        value={bc.caching_ratio}
        step={0.05}
        min={0}
        max={1}
        onChange={(v) => patch({ caching_ratio: v })}
      />

      <h3 className="text-xs font-ui uppercase tracking-widest text-text-muted mb-3 mt-5">
        Cost Model
      </h3>
      <NumericField
        label="Implementation Cost"
        value={bc.implementation_cost}
        step={1000}
        min={0}
        prefix="$"
        onChange={(v) => patch({ implementation_cost: v })}
      />
      <NumericField
        label="Amortization Months"
        value={bc.implementation_amortization_months}
        min={1}
        max={48}
        onChange={(v) => patch({ implementation_amortization_months: Math.round(v) })}
      />
      <NumericField
        label="Monthly Infrastructure Cost"
        value={bc.monthly_infra_cost}
        step={100}
        min={0}
        prefix="$"
        onChange={(v) => patch({ monthly_infra_cost: v })}
      />
      <NumericField
        label="Monthly Maintenance Cost"
        value={bc.monthly_maintenance_cost}
        step={100}
        min={0}
        prefix="$"
        onChange={(v) => patch({ monthly_maintenance_cost: v })}
      />

      <h3 className="text-xs font-ui uppercase tracking-widest text-text-muted mb-3 mt-5">
        Growth Rates
      </h3>
      <NumericField
        label="Volume Growth Rate YoY"
        value={bc.volume_growth_rate_yoy}
        step={0.01}
        min={0}
        suffix="%"
        onChange={(v) => patch({ volume_growth_rate_yoy: v })}
      />
      <NumericField
        label="Complexity Growth Rate YoY"
        value={bc.complexity_growth_rate_yoy}
        step={0.01}
        min={0}
        suffix="%"
        onChange={(v) => patch({ complexity_growth_rate_yoy: v })}
      />
      <NumericField
        label="Inflation Rate YoY"
        value={bc.inflation_rate_yoy}
        step={0.01}
        min={0}
        suffix="%"
        onChange={(v) => patch({ inflation_rate_yoy: v })}
      />
    </div>
  );
}
