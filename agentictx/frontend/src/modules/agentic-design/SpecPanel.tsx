import { useState } from "react";
import { agenticDesignApi } from "@/api/agentic_design";
import { useAgenticDesignStore } from "@/store/agenticDesignStore";
import { AgentSpecCard, OpportunityCard } from "./AgentSpecCard";
import type { DelegationCluster } from "@/types/discovery";

interface SpecPanelProps {
  useCaseId: string;
  clusters: DelegationCluster[];
}

export function SpecPanel({ useCaseId, clusters }: SpecPanelProps) {
  const { agentSpecs, opportunities, updateAgentSpec } = useAgenticDesignStore();
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const handleApprove = async (specId: string) => {
    setApprovingIds((s) => new Set(s).add(specId));
    try {
      const updated = await agenticDesignApi.approveSpec(useCaseId, specId);
      updateAgentSpec(updated);
    } catch (e) {
      console.error("Failed to approve spec:", e);
    } finally {
      setApprovingIds((s) => {
        const next = new Set(s);
        next.delete(specId);
        return next;
      });
    }
  };

  const handleDownloadArd = async () => {
    try {
      await agenticDesignApi.downloadArd(useCaseId);
    } catch (e) {
      console.error("Failed to download ARD:", e);
    }
  };

  const approvedCount = agentSpecs.filter((s) => s.status === "approved").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-bg-border shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium font-ui uppercase tracking-wider text-text-secondary">
            Agent Specifications
          </h2>
          {agentSpecs.length > 0 && (
            <p className="text-xs font-ui text-text-muted mt-0.5">
              {agentSpecs.length} spec{agentSpecs.length !== 1 ? "s" : ""}
              {approvedCount > 0 && ` · ${approvedCount} approved`}
            </p>
          )}
        </div>
        {approvedCount > 0 && (
          <button
            onClick={handleDownloadArd}
            className="text-xs font-ui px-3 py-1 rounded-sm border transition-colors"
            style={{
              color: "var(--jtd-agent)",
              borderColor: "var(--jtd-agent)",
            }}
          >
            Download ARD
          </button>
        )}
      </div>

      {/* Cluster chips — context for consultant */}
      {clusters.length > 0 && (
        <div className="px-5 py-2.5 border-b border-bg-border shrink-0">
          <p className="text-xs font-ui text-text-muted mb-2">Delegation clusters in scope</p>
          <div className="flex flex-wrap gap-2">
            {clusters.map((cluster) => {
              const hasSpec = agentSpecs.some(
                (s) =>
                  s.delegation_cluster_id === cluster.id ||
                  (s.name && cluster.name && s.name.toLowerCase().includes(cluster.name.toLowerCase().split(" ")[0]))
              );
              return (
                <span
                  key={cluster.id}
                  className="text-xs font-ui px-2 py-0.5 rounded-sm"
                  style={{
                    color: hasSpec ? "var(--jtd-agent)" : "var(--jtd-cluster)",
                    border: `1px solid ${hasSpec ? "var(--jtd-agent)" : "var(--jtd-cluster)"}`,
                    opacity: 0.85,
                  }}
                >
                  {cluster.name}
                  {hasSpec && " ✓"}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Main scrollable area */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Agent spec cards */}
        {agentSpecs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-text-muted text-sm font-ui mb-2">No agent specifications yet</p>
            <p className="text-text-muted text-xs font-body max-w-xs leading-relaxed">
              Use the conversation on the left to discuss a delegation cluster. The agent will
              propose a specification once enough information has been gathered.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {agentSpecs.map((spec) => (
              <AgentSpecCard
                key={spec.id}
                spec={spec}
                onApprove={() => handleApprove(spec.id)}
                onDownloadArd={handleDownloadArd}
                isApproving={approvingIds.has(spec.id)}
              />
            ))}
          </div>
        )}

        {/* Cross-agent opportunities */}
        {opportunities.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-ui uppercase tracking-wider text-text-secondary">
                Cross-Agent Opportunities
              </h3>
              <span
                className="text-xs font-ui px-1.5 py-0.5 rounded-sm"
                style={{ color: "var(--accent-primary)", border: "1px solid var(--accent-primary)" }}
              >
                {opportunities.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {opportunities.map((opp, i) => (
                <OpportunityCard key={i} opportunity={opp} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
