import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { engagementsApi } from "@/api/engagements";

const STAGES = ["Discovery", "Agentic Design", "Compliance", "Business Case"];

export function TopBar() {
  const { id } = useParams<{ id?: string }>();

  const { data: engagement } = useQuery({
    queryKey: ["engagement", id],
    queryFn: () => engagementsApi.get(id!),
    enabled: !!id,
  });

  return (
    <header
      className="flex items-center justify-between px-6 h-12 shrink-0 border-b border-bg-border bg-bg-surface"
      style={{ borderBottom: "1px solid var(--bg-border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <span className="font-display text-base text-text-primary tracking-tight">
          ATW
        </span>
        <span className="text-bg-border text-lg font-light">|</span>
        <span className="text-xs text-text-muted font-ui uppercase tracking-widest">
          Agentic Transformation Workbench
        </span>
      </div>

      {/* Active engagement + stage progress */}
      {engagement && (
        <div className="flex items-center gap-6">
          <span className="text-sm text-text-secondary font-medium">
            {engagement.client_name}
          </span>
          <div className="flex items-center gap-1">
            {STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center gap-1">
                {i > 0 && (
                  <div className="w-6 h-px bg-bg-border" />
                )}
                <span className="text-xs font-ui text-text-muted px-2 py-0.5 border border-bg-border rounded-sm">
                  {stage}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Right slot — reserved for future auth/user info */}
      <div className="w-32" />
    </header>
  );
}
