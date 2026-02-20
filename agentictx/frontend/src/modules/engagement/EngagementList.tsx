import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { engagementsApi } from "@/api/engagements";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { CreateEngagementForm } from "./CreateEngagementForm";
import type { EngagementListItem } from "@/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function EngagementList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: engagements, isLoading } = useQuery({
    queryKey: ["engagements"],
    queryFn: engagementsApi.list,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => engagementsApi.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["engagements"] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm font-ui">
        Loading engagements…
      </div>
    );
  }

  const items = engagements ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-bg-border">
        <div>
          <h1 className="text-xl font-semibold font-display text-text-primary">
            Engagements
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {items.length} engagement{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + New Engagement
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {items.length === 0 ? (
          <EmptyState
            title="No engagements yet"
            description="Create your first client engagement to start mapping agentic transformation opportunities."
            action={
              <button
                className="btn-primary"
                onClick={() => setShowCreate(true)}
              >
                + New Engagement
              </button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted font-ui text-xs border-b border-bg-border">
                <th className="pb-3 font-medium pr-6">Client</th>
                <th className="pb-3 font-medium pr-6">Industry</th>
                <th className="pb-3 font-medium pr-6">Type</th>
                <th className="pb-3 font-medium pr-6">Use Cases</th>
                <th className="pb-3 font-medium pr-6">Status</th>
                <th className="pb-3 font-medium pr-6">Updated</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((e: EngagementListItem) => (
                <tr
                  key={e.id}
                  className="border-b border-bg-border hover:bg-bg-elevated/40 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/engagements/${e.id}`)}
                >
                  <td className="py-3 pr-6 font-medium text-text-primary">
                    {e.client_name}
                  </td>
                  <td className="py-3 pr-6 text-text-secondary">
                    {e.industry ?? <span className="text-text-muted">—</span>}
                  </td>
                  <td className="py-3 pr-6 text-text-secondary">
                    {e.engagement_type ?? (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-6 font-ui text-text-secondary">
                    {e.use_case_count}
                  </td>
                  <td className="py-3 pr-6">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="py-3 pr-6 font-ui text-text-muted text-xs">
                    {formatDate(e.updated_at)}
                  </td>
                  <td className="py-3 text-right">
                    {e.status === "active" && (
                      <button
                        className="text-text-muted hover:text-accent-amber text-xs font-ui opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          archiveMutation.mutate(e.id);
                        }}
                      >
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <Modal title="New Engagement" onClose={() => setShowCreate(false)}>
          <CreateEngagementForm onSuccess={() => setShowCreate(false)} />
        </Modal>
      )}
    </div>
  );
}
