import { useState } from "react";
import { discoveryApi } from "@/api/discovery";
import { useDiscoveryStore } from "@/store/discoveryStore";
import { CognitiveJTDCard, DelegationClusterCard, LivedJTDCard } from "./JTDCard";

interface CognitiveMapPanelProps {
  useCaseId: string;
}

// ─── Column header ────────────────────────────────────────────────────────────

function ColumnHeader({
  label,
  subtitle,
  count,
  accentColor,
}: {
  label: string;
  subtitle: string;
  count: number;
  accentColor: string;
}) {
  return (
    <div className="px-4 py-3 border-b border-bg-border shrink-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: accentColor }}
        />
        <h3
          className="text-xs font-medium font-ui uppercase tracking-wider"
          style={{ color: accentColor }}
        >
          {label}
        </h3>
        <span className="text-xs font-ui text-text-muted ml-auto">{count}</span>
      </div>
      <p className="text-xs text-text-muted font-body pl-4">{subtitle}</p>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function CognitiveMapPanel({ useCaseId }: CognitiveMapPanelProps) {
  const {
    livedJTDs,
    cognitiveJTDs,
    delegationClusters,
    updateLivedJTD,
    removeLivedJTD,
    updateCognitiveJTD,
    removeCognitiveJTD,
    updateDelegationCluster,
    removeDelegationCluster,
  } = useDiscoveryStore();

  const [scoringId, setScoringId] = useState<string | null>(null);

  // ── Lived JTD actions ────────────────────────────────────────────────────

  const confirmLivedJTD = async (id: string) => {
    try {
      const updated = await discoveryApi.updateLivedJTD(useCaseId, id, { status: "confirmed" });
      updateLivedJTD(updated);
    } catch (e) {
      console.error("Failed to confirm Lived JTD:", e);
    }
  };

  const rejectLivedJTD = async (id: string) => {
    try {
      await discoveryApi.deleteLivedJTD(useCaseId, id);
      removeLivedJTD(id);
    } catch (e) {
      console.error("Failed to reject Lived JTD:", e);
    }
  };

  const renameLivedJTD = async (id: string, description: string) => {
    try {
      const updated = await discoveryApi.updateLivedJTD(useCaseId, id, { description });
      updateLivedJTD(updated);
    } catch (e) {
      console.error("Failed to rename Lived JTD:", e);
    }
  };

  // ── Cognitive JTD actions ────────────────────────────────────────────────

  const confirmCognitiveJTD = async (id: string) => {
    try {
      const updated = await discoveryApi.updateCognitiveJTD(useCaseId, id, { status: "confirmed" });
      updateCognitiveJTD(updated);
    } catch (e) {
      console.error("Failed to confirm Cognitive JTD:", e);
    }
  };

  const rejectCognitiveJTD = async (id: string) => {
    try {
      await discoveryApi.deleteCognitiveJTD(useCaseId, id);
      removeCognitiveJTD(id);
    } catch (e) {
      console.error("Failed to reject Cognitive JTD:", e);
    }
  };

  const renameCognitiveJTD = async (id: string, description: string) => {
    try {
      const updated = await discoveryApi.updateCognitiveJTD(useCaseId, id, { description });
      updateCognitiveJTD(updated);
    } catch (e) {
      console.error("Failed to rename Cognitive JTD:", e);
    }
  };

  // ── Cluster actions ──────────────────────────────────────────────────────

  const confirmCluster = async (id: string) => {
    try {
      const updated = await discoveryApi.updateCluster(useCaseId, id, { status: "confirmed" });
      updateDelegationCluster(updated);
    } catch (e) {
      console.error("Failed to confirm cluster:", e);
    }
  };

  const scoreCluster = async (id: string) => {
    setScoringId(id);
    try {
      const updated = await discoveryApi.scoreCluster(useCaseId, id);
      updateDelegationCluster(updated);
    } catch (e) {
      console.error("Failed to score cluster:", e);
    } finally {
      setScoringId(null);
    }
  };

  // ── Empty column state ───────────────────────────────────────────────────

  const EmptyColumn = ({ label }: { label: string }) => (
    <div className="flex items-center justify-center h-32 text-xs font-ui text-text-muted text-center px-4">
      {label} will appear here as the agent extracts them
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Column 1: Lived JTDs ─────────────────────────────────────────── */}
      <div
        className="flex flex-col w-1/3 border-r border-bg-border overflow-hidden"
        style={{ minWidth: 0 }}
      >
        <ColumnHeader
          label="Lived JTDs"
          subtitle="Physical tasks & system interactions"
          count={livedJTDs.length}
          accentColor="var(--jtd-lived)"
        />
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
          {livedJTDs.length === 0 ? (
            <EmptyColumn label="Lived JTDs" />
          ) : (
            livedJTDs.map((jtd) => (
              <div
                key={jtd.id}
                className="jtd-card-enter"
                style={{ animation: "fadeIn 150ms ease-in" }}
              >
                <LivedJTDCard
                  jtd={jtd}
                  onConfirm={() => confirmLivedJTD(jtd.id)}
                  onReject={() => rejectLivedJTD(jtd.id)}
                  onRename={(desc) => renameLivedJTD(jtd.id, desc)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Column 2: Cognitive JTDs ─────────────────────────────────────── */}
      <div
        className="flex flex-col w-1/3 border-r border-bg-border overflow-hidden"
        style={{ minWidth: 0 }}
      >
        <ColumnHeader
          label="Cognitive JTDs"
          subtitle="Reasoning & judgment activities"
          count={cognitiveJTDs.length}
          accentColor="var(--jtd-cognitive)"
        />
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
          {cognitiveJTDs.length === 0 ? (
            <EmptyColumn label="Cognitive JTDs" />
          ) : (
            cognitiveJTDs.map((jtd) => (
              <div
                key={jtd.id}
                style={{ animation: "fadeIn 150ms ease-in" }}
              >
                <CognitiveJTDCard
                  jtd={jtd}
                  onConfirm={() => confirmCognitiveJTD(jtd.id)}
                  onReject={() => rejectCognitiveJTD(jtd.id)}
                  onRename={(desc) => renameCognitiveJTD(jtd.id, desc)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Column 3: Delegation Clusters ───────────────────────────────── */}
      <div
        className="flex flex-col w-1/3 overflow-hidden"
        style={{ minWidth: 0 }}
      >
        <ColumnHeader
          label="Clusters"
          subtitle="Delegation units for agent design"
          count={delegationClusters.length}
          accentColor="var(--jtd-cluster)"
        />
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
          {delegationClusters.length === 0 ? (
            <EmptyColumn label="Delegation clusters" />
          ) : (
            delegationClusters.map((cluster) => (
              <div
                key={cluster.id}
                style={{ animation: "fadeIn 150ms ease-in" }}
              >
                <DelegationClusterCard
                  cluster={cluster}
                  onConfirm={() => confirmCluster(cluster.id)}
                  onScore={() => scoreCluster(cluster.id)}
                  isScoring={scoringId === cluster.id}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
