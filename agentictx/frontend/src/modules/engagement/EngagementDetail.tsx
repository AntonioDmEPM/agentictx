import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { engagementsApi } from "@/api/engagements";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { CreateUseCaseForm } from "./CreateUseCaseForm";
import type { UseCase } from "@/types";

const STAGE_ORDER = ["pending", "discovery", "agentic_design", "business_case", "complete"] as const;

function StageProgress({ status }: { status: UseCase["status"] }) {
  const current = STAGE_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {STAGE_ORDER.map((s, i) => (
        <div
          key={s}
          className="h-1 w-6 rounded-full"
          style={{
            background:
              i < current
                ? "var(--accent-success)"
                : i === current
                ? "var(--accent-primary)"
                : "var(--bg-border)",
          }}
        />
      ))}
    </div>
  );
}

export function EngagementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: engagement, isLoading } = useQuery({
    queryKey: ["engagement", id],
    queryFn: () => engagementsApi.get(id!),
    enabled: !!id,
  });

  const archiveMutation = useMutation({
    mutationFn: () => engagementsApi.archive(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engagements"] });
      qc.invalidateQueries({ queryKey: ["engagement", id] });
    },
  });

  const deleteUseCaseMutation = useMutation({
    mutationFn: (ucId: string) => engagementsApi.delete(id + "/use-cases/" + ucId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["engagement", id] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm font-ui">
        Loading…
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-text-secondary">Engagement not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-8 py-5 border-b border-bg-border">
        <div>
          <button
            className="text-xs text-text-muted font-ui hover:text-text-secondary transition-colors mb-2"
            onClick={() => navigate("/")}
          >
            ← All Engagements
          </button>
          <h1 className="text-xl font-semibold font-display text-text-primary">
            {engagement.client_name}
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <StatusBadge status={engagement.status} />
            {engagement.industry && (
              <span className="text-xs text-text-secondary font-ui">
                {engagement.industry}
              </span>
            )}
            {engagement.engagement_type && (
              <span className="text-xs text-text-muted font-ui">
                {engagement.engagement_type}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {engagement.status === "active" && (
            <button
              className="btn-ghost text-xs"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
            >
              Archive Engagement
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + Add Use Case
          </button>
        </div>
      </div>

      {/* Use Cases */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <h2 className="text-sm font-medium text-text-secondary font-ui uppercase tracking-wider mb-4">
          Use Cases ({engagement.use_cases.length})
        </h2>

        {engagement.use_cases.length === 0 ? (
          <EmptyState
            title="No use cases yet"
            description="Add the first use case to begin the cognitive load mapping process."
            action={
              <button
                className="btn-primary"
                onClick={() => setShowCreate(true)}
              >
                + Add Use Case
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {engagement.use_cases.map((uc: UseCase) => (
              <div
                key={uc.id}
                className="panel px-5 py-4 flex items-center justify-between group hover:border-bg-elevated transition-colors cursor-pointer"
                onClick={() => navigate(`/engagements/${id}/use-cases/${uc.id}/discovery`)}
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-base font-medium text-text-primary">
                    {uc.name}
                  </span>
                  {uc.description && (
                    <span className="text-sm text-text-secondary line-clamp-1">
                      {uc.description}
                    </span>
                  )}
                  <div className="flex items-center gap-4 mt-1">
                    <StatusBadge status={uc.status} />
                    <StageProgress status={uc.status} />
                  </div>
                </div>
                <button
                  className="text-text-muted hover:text-accent-warm text-xs font-ui opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteUseCaseMutation.mutate(uc.id);
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Add Use Case" onClose={() => setShowCreate(false)}>
          <CreateUseCaseForm
            engagementId={id!}
            onSuccess={() => {
              setShowCreate(false);
              qc.invalidateQueries({ queryKey: ["engagement", id] });
            }}
          />
        </Modal>
      )}
    </div>
  );
}
