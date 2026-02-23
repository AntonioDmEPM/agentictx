import type { BusinessCaseScenario } from "@/types/business_case";

interface Props {
  scenarios: BusinessCaseScenario[];
}

function fmtCurrency(v: number): string {
  if (v === 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

export function ScenarioComparisonTable({ scenarios }: Props) {
  const withResults = scenarios.filter((s) => s.results?.monthly?.length);

  if (withResults.length === 0) return null;

  // Use first scenario's monthly array for Month + Manual Labor columns
  const firstMonthly = withResults[0].results.monthly ?? [];

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-xs font-ui border-collapse">
        <thead>
          <tr
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderBottom: "1px solid var(--bg-border)",
            }}
          >
            <th className="text-left px-2 py-2 text-text-muted sticky left-0 bg-bg-elevated z-10">
              Month
            </th>
            <th className="text-right px-2 py-2 text-text-muted whitespace-nowrap">
              Manual Labor
            </th>
            {withResults.map((s) => (
              <>
                <th
                  key={`${s.id}-ai`}
                  className="text-right px-2 py-2 whitespace-nowrap"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {s.name} AI Cost
                </th>
                <th
                  key={`${s.id}-sav`}
                  className="text-right px-2 py-2 whitespace-nowrap"
                  style={{ color: "var(--accent-success)" }}
                >
                  {s.name} Savings
                </th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 48 }, (_, m) => {
            const manual =
              m < firstMonthly.length ? firstMonthly[m].manual_labor_cost : 0;
            return (
              <tr
                key={m}
                style={{
                  borderBottom: "1px solid var(--bg-border)",
                  backgroundColor:
                    m % 2 === 0 ? "var(--bg-primary)" : "var(--bg-surface)",
                }}
              >
                <td
                  className="px-2 py-1.5 text-text-muted sticky left-0 z-10"
                  style={{ backgroundColor: "inherit" }}
                >
                  {m + 1}
                </td>
                <td className="px-2 py-1.5 text-right text-text-secondary">
                  {fmtCurrency(manual)}
                </td>
                {withResults.map((s) => {
                  const monthly = s.results.monthly ?? [];
                  const row = m < monthly.length ? monthly[m] : null;
                  const aiCost = row?.ai_total_cost ?? 0;
                  const savings = row?.monthly_savings ?? 0;
                  return (
                    <>
                      <td
                        key={`${s.id}-ai-${m}`}
                        className="px-2 py-1.5 text-right text-text-secondary"
                      >
                        {fmtCurrency(aiCost)}
                      </td>
                      <td
                        key={`${s.id}-sav-${m}`}
                        className="px-2 py-1.5 text-right font-medium"
                        style={{
                          color:
                            savings > 0
                              ? "var(--accent-success)"
                              : savings < 0
                              ? "var(--accent-warm)"
                              : "var(--text-muted)",
                        }}
                      >
                        {savings === 0 ? "—" : fmtCurrency(savings)}
                      </td>
                    </>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
