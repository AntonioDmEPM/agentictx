import type { BusinessCaseScenario } from "@/types/business_case";

interface Props {
  scenarios: BusinessCaseScenario[];
}

function fmt(value: number, type: "currency" | "pct" | "number" = "currency"): string {
  if (type === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (type === "pct") {
    return `${value.toFixed(1)}%`;
  }
  return value.toFixed(1);
}

function MetricCard({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="p-3 border"
      style={{
        borderColor: accent ?? "var(--bg-border)",
        backgroundColor: "var(--bg-elevated)",
        borderLeftWidth: 2,
        borderLeftColor: accent ?? "var(--bg-border)",
      }}
    >
      <p className="text-xs text-text-muted font-ui uppercase tracking-wider mb-1">{title}</p>
      <p className="text-lg font-ui text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-muted font-ui mt-0.5">{sub}</p>}
    </div>
  );
}

export function MetricCards({ scenarios }: Props) {
  return (
    <div className="space-y-4">
      {scenarios.map((s) => {
        const r = s.results;
        if (!r || !r.monthly || r.monthly.length === 0) return null;

        const breakEven = r.break_even_month
          ? `Month ${r.break_even_month}`
          : "Not within 48m";
        const roi48 = r.roi_48m ?? 0;
        const savings48 = r.total_savings_48m ?? 0;
        const freedFte = r.freed_capacity_fte ?? 0;

        return (
          <div key={s.id}>
            <p
              className="text-xs font-ui font-medium mb-2"
              style={{ color: "var(--accent-primary)" }}
            >
              {s.name}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                title="Break-even"
                value={breakEven}
                accent={r.break_even_month ? "var(--accent-success)" : "var(--accent-warm)"}
              />
              <MetricCard
                title="ROI at 48M"
                value={fmt(roi48, "pct")}
                accent={roi48 > 0 ? "var(--accent-success)" : "var(--accent-warm)"}
              />
              <MetricCard
                title="Total Savings (48M)"
                value={fmt(savings48)}
                accent="var(--accent-success)"
              />
              <MetricCard
                title="Freed FTE Capacity"
                value={fmt(freedFte, "number")}
                sub="FTE equivalent"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
