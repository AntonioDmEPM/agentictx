import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { engagementsApi } from "@/api/engagements";

// Maps stage label → route segment. null = not yet built (disabled).
// Compliance and Business Case are hidden pending requirements rework.
const STAGES: { label: string; segment: string | null }[] = [
  { label: "Discovery", segment: "discovery" },
  { label: "Agentic Design", segment: "agentic-design" },
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
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 48,
        flexShrink: 0,
        borderBottom: "1px solid var(--bg-border)",
        background: "rgba(245, 244, 240, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            fontFamily: '"Instrument Serif", Georgia, serif',
            fontSize: 17,
            fontWeight: 400,
            letterSpacing: "-0.5px",
            color: "var(--text-primary)",
          }}
        >
          ATW
        </span>
        <span style={{ color: "var(--bg-border)", fontSize: 16, fontWeight: 300 }}>|</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-muted)",
            fontFamily: '"DM Sans", system-ui, sans-serif',
          }}
        >
          Agentic Transformation Workbench
        </span>
      </div>

      {/* Active engagement + stage tabs */}
      {engagement && (
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: '"DM Sans", system-ui, sans-serif',
            }}
          >
            {engagement.client_name}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {STAGES.map((stage, i) => {
              const isActive = stage.segment === currentSegment;
              const isClickable = !!useCaseId && !!stage.segment;

              return (
                <div key={stage.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && (
                    <div
                      style={{ width: 20, height: 1, background: "var(--bg-border)" }}
                    />
                  )}
                  <button
                    disabled={!isClickable}
                    onClick={() => {
                      if (isClickable) {
                        navigate(
                          `/engagements/${id}/use-cases/${useCaseId}/${stage.segment}`
                        );
                      }
                    }}
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 500,
                      fontFamily: '"DM Sans", system-ui, sans-serif',
                      padding: "3px 12px",
                      border: "1px solid",
                      borderRadius: 4,
                      borderColor: isActive
                        ? "var(--accent-primary)"
                        : "var(--bg-border)",
                      color: isActive
                        ? "var(--accent-primary)"
                        : isClickable
                        ? "var(--text-secondary)"
                        : "var(--text-muted)",
                      background: isActive
                        ? "rgba(74, 111, 165, 0.06)"
                        : "transparent",
                      cursor: isClickable ? "pointer" : "default",
                      transition: "all 150ms ease",
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
      <div style={{ width: 128 }} />
    </header>
  );
}
