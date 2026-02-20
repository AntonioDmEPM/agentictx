import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { engagementsApi } from "@/api/engagements";
import type { EngagementListItem } from "@/types";

export function LeftNav() {
  const navigate = useNavigate();
  const { id: activeId } = useParams<{ id?: string }>();

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

  return (
    <nav className="w-56 shrink-0 flex flex-col border-r border-bg-border bg-bg-surface overflow-hidden">
      {/* Dashboard link */}
      <button
        className={[
          "px-4 py-3 text-left text-sm font-medium border-b border-bg-border transition-colors",
          !activeId
            ? "text-text-primary bg-bg-elevated"
            : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50",
        ].join(" ")}
        onClick={() => navigate("/")}
      >
        All Engagements
      </button>

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
