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

// ─── Inline create form ──────────────────────────────────────────────────────

function CreateJTDForm({
  secondaryLabel,
  accentColor,
  onSave,
  onCancel,
}: {
  secondaryLabel: string;
  accentColor: string;
  onSave: (description: string, secondary: string) => void;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState("");
  const [secondary, setSecondary] = useState("");

  return (
    <div
      className="rounded-sm border bg-bg-surface overflow-hidden"
      style={{ borderColor: "var(--bg-border)", borderLeftWidth: "3px", borderLeftColor: accentColor }}
    >
      <div className="px-3 py-2.5 flex flex-col gap-2">
        <textarea
          className="w-full bg-bg-elevated text-text-primary text-sm font-body border border-bg-border rounded-sm px-2 py-1 resize-none focus:outline-none focus:border-accent-primary"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        />
        <input
          className="w-full bg-bg-elevated text-text-primary text-xs font-ui border border-bg-border rounded-sm px-2 py-1 focus:outline-none focus:border-accent-primary"
          value={secondary}
          onChange={(e) => setSecondary(e.target.value)}
          placeholder={secondaryLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (description.trim()) onSave(description.trim(), secondary.trim());
            }
            if (e.key === "Escape") onCancel();
          }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (description.trim()) onSave(description.trim(), secondary.trim()); }}
            className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
            style={{ color: "var(--accent-success)", borderColor: "var(--accent-success)" }}
          >
            Create
          </button>
          <button
            onClick={onCancel}
            className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
            style={{ color: "var(--text-muted)", borderColor: "var(--bg-border)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add button ──────────────────────────────────────────────────────────────

function AddButton({ onClick, accentColor }: { onClick: () => void; accentColor: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-sm border border-dashed transition-colors flex items-center justify-center gap-1.5 py-1.5 hover:border-solid"
      style={{
        borderColor: "var(--bg-border)",
        color: "var(--text-muted)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor;
        e.currentTarget.style.color = accentColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--bg-border)";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      <span className="text-sm">+</span>
      <span className="text-xs font-ui">Add</span>
    </button>
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
    addLivedJTDs,
    updateCognitiveJTD,
    removeCognitiveJTD,
    addCognitiveJTDs,
    updateDelegationCluster,
  } = useDiscoveryStore();

  const [scoringId, setScoringId] = useState<string | null>(null);
  const [creatingLived, setCreatingLived] = useState(false);
  const [creatingCognitive, setCreatingCognitive] = useState(false);

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

  const updateLivedJTDFields = async (id: string, description: string, systemContext: string) => {
    try {
      const updated = await discoveryApi.updateLivedJTD(useCaseId, id, {
        description,
        system_context: systemContext || null,
      });
      updateLivedJTD(updated);
    } catch (e) {
      console.error("Failed to update Lived JTD:", e);
    }
  };

  const deleteLivedJTD = async (id: string) => {
    try {
      await discoveryApi.deleteLivedJTD(useCaseId, id);
      removeLivedJTD(id);
    } catch (e) {
      console.error("Failed to delete Lived JTD:", e);
    }
  };

  const createLivedJTD = async (description: string, systemContext: string) => {
    try {
      const created = await discoveryApi.createLivedJTD(useCaseId, {
        description,
        system_context: systemContext || null,
      });
      addLivedJTDs([created]);
      setCreatingLived(false);
    } catch (e) {
      console.error("Failed to create Lived JTD:", e);
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

  const updateCognitiveJTDFields = async (id: string, description: string, cognitiveZone: string) => {
    try {
      const updated = await discoveryApi.updateCognitiveJTD(useCaseId, id, {
        description,
        cognitive_zone: cognitiveZone || null,
      });
      updateCognitiveJTD(updated);
    } catch (e) {
      console.error("Failed to update Cognitive JTD:", e);
    }
  };

  const deleteCognitiveJTD = async (id: string) => {
    try {
      await discoveryApi.deleteCognitiveJTD(useCaseId, id);
      removeCognitiveJTD(id);
    } catch (e) {
      console.error("Failed to delete Cognitive JTD:", e);
    }
  };

  const createCognitiveJTD = async (description: string, cognitiveZone: string) => {
    try {
      const created = await discoveryApi.createCognitiveJTD(useCaseId, {
        description,
        cognitive_zone: cognitiveZone || null,
      });
      addCognitiveJTDs([created]);
      setCreatingCognitive(false);
    } catch (e) {
      console.error("Failed to create Cognitive JTD:", e);
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
          {livedJTDs.length === 0 && !creatingLived ? (
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
                  onUpdate={(desc, ctx) => updateLivedJTDFields(jtd.id, desc, ctx)}
                  onDelete={() => deleteLivedJTD(jtd.id)}
                />
              </div>
            ))
          )}
          {creatingLived && (
            <CreateJTDForm
              secondaryLabel="System context (optional)"
              accentColor="var(--jtd-lived)"
              onSave={createLivedJTD}
              onCancel={() => setCreatingLived(false)}
            />
          )}
          {!creatingLived && (
            <AddButton onClick={() => setCreatingLived(true)} accentColor="var(--jtd-lived)" />
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
          {cognitiveJTDs.length === 0 && !creatingCognitive ? (
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
                  onUpdate={(desc, zone) => updateCognitiveJTDFields(jtd.id, desc, zone)}
                  onDelete={() => deleteCognitiveJTD(jtd.id)}
                />
              </div>
            ))
          )}
          {creatingCognitive && (
            <CreateJTDForm
              secondaryLabel="Cognitive zone (optional)"
              accentColor="var(--jtd-cognitive)"
              onSave={createCognitiveJTD}
              onCancel={() => setCreatingCognitive(false)}
            />
          )}
          {!creatingCognitive && (
            <AddButton onClick={() => setCreatingCognitive(true)} accentColor="var(--jtd-cognitive)" />
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
