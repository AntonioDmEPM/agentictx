import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { engagementsApi } from "@/api/engagements";
import type { EngagementListItem } from "@/types";

export function LeftNav() {
  const navigate = useNavigate();
  const { id: activeId } = useParams<{ id?: string }>();
  const [collapsed, setCollapsed] = useState(false);

  const { data: engagements } = useQuery({
    queryKey: ["engagements"],
    queryFn: engagementsApi.list,
  });

  const active = engagements?.filter((e) => e.status === "active") ?? [];
  const archived = engagements?.filter((e) => e.status === "archived") ?? [];

  function NavItem({ e }: { e: EngagementListItem }) {
    const isActive = e.id === activeId;
    return (
      <button
        className={[
          "w-full text-left px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-bg-elevated text-text-primary border-l-2 border-accent-primary"
            : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50 border-l-2 border-transparent",
        ].join(" ")}
        onClick={() => navigate(`/engagements/${e.id}`)}
      >
        <div className="truncate font-medium">{e.client_name}</div>
        <div className="text-xs text-text-muted font-ui mt-0.5 truncate">
          {e.use_case_count} use case{e.use_case_count !== 1 ? "s" : ""}
        </div>
      </button>
    );
  }

  // ── Collapsed strip ──────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <div
        style={{
          width: 44,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--bg-border)",
          background: "var(--bg-surface)",
          overflow: "hidden",
          transition: "width 0.2s ease",
        }}
      >
        {/* Expand button at top */}
        <button
          onClick={() => setCollapsed(false)}
          title="Expand navigation"
          style={{
            background: "none",
            border: "none",
            borderBottom: "1px solid var(--bg-border)",
            height: 44,
            width: "100%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: 14,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          ›
        </button>

        {/* Vertical label */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={() => setCollapsed(false)}
        >
          <span
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: 10,
              fontFamily: "var(--font-ui)",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              userSelect: "none",
            }}
          >
            Engagements
          </span>
        </div>
      </div>
    );
  }

  // ── Expanded nav ──────────────────────────────────────────────────────────
  return (
    <nav
      style={{
        width: 224,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--bg-border)",
        background: "var(--bg-surface)",
        overflow: "hidden",
        transition: "width 0.2s ease",
      }}
    >
      {/* Dashboard link + collapse button */}
      <div
        className={[
          "flex items-center justify-between border-b border-bg-border transition-colors",
          !activeId
            ? "bg-bg-elevated"
            : "hover:bg-bg-elevated/50",
        ].join(" ")}
      >
        <button
          className={[
            "flex-1 text-left px-4 py-3 text-sm font-medium transition-colors",
            !activeId ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
          ].join(" ")}
          onClick={() => navigate("/")}
        >
          All Engagements
        </button>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse navigation"
          style={{
            background: "none",
            border: "none",
            padding: "2px 10px",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 14,
            lineHeight: 1,
            borderRadius: 3,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          ‹
        </button>
      </div>

      <div className="flex-1 overflow-auto py-2">
        {active.length > 0 && (
          <div>
            <div className="px-3 py-2 text-xs text-text-muted font-ui uppercase tracking-wider">
              Active
            </div>
            {active.map((e) => (
              <NavItem key={e.id} e={e} />
            ))}
          </div>
        )}

        {archived.length > 0 && (
          <div className="mt-3">
            <div className="px-3 py-2 text-xs text-text-muted font-ui uppercase tracking-wider">
              Archived
            </div>
            {archived.map((e) => (
              <NavItem key={e.id} e={e} />
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
