import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { engagementsApi } from "@/api/engagements";

// Maps stage label → route segment. null = not yet built (disabled).
const STAGES: { label: string; segment: string | null }[] = [
  { label: "Discovery", segment: "discovery" },
  { label: "Agentic Design", segment: "agentic-design" },
  { label: "Compliance", segment: null },
  { label: "Business Case", segment: "business-case" },
];

export function TopBar() {
  const { id, useCaseId } = useParams<{ id?: string; useCaseId?: string }>();
  const navigate = useNavigate();

  // Derive active stage from the current URL path
  const currentSegment = window.location.pathname.split("/").pop() ?? "";

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

      {/* Active engagement + stage tabs */}
      {engagement && (
        <div className="flex items-center gap-6">
          <span className="text-sm text-text-secondary font-medium">
            {engagement.client_name}
          </span>
          <div className="flex items-center gap-1">
            {STAGES.map((stage, i) => {
              const isActive = stage.segment === currentSegment;
              const isClickable = !!useCaseId && !!stage.segment;

              return (
                <div key={stage.label} className="flex items-center gap-1">
                  {i > 0 && <div className="w-6 h-px bg-bg-border" />}
                  <button
                    disabled={!isClickable}
                    onClick={() => {
                      if (isClickable) {
                        navigate(
                          `/engagements/${id}/use-cases/${useCaseId}/${stage.segment}`
                        );
                      }
                    }}
                    className="text-xs font-ui px-2 py-0.5 border rounded-sm transition-colors"
                    style={{
                      borderColor: isActive
                        ? "var(--accent-primary)"
                        : "var(--bg-border)",
                      color: isActive
                        ? "var(--accent-primary)"
                        : isClickable
                        ? "var(--text-secondary)"
                        : "var(--text-muted)",
                      cursor: isClickable ? "pointer" : "default",
                    }}
                  >
                    {stage.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Right slot — reserved for future auth/user info */}
      <div className="w-32" />
    </header>
  );
}
