import { useEffect, useMemo, useRef, useState } from "react";
import { discoveryApi } from "@/api/discovery";
import { useDiscoveryStore } from "@/store/discoveryStore";
import type { CognitiveJTD, DelegationCluster, LivedJTD } from "@/types/discovery";
import { CognitiveJTDCard, DelegationClusterCard, LivedJTDCard } from "./JTDCard";

interface CognitiveMapPanelProps {
  useCaseId: string;
}

// ─── Sort helper: confirmed first, proposed newest-first, rejected last ──────

function sortByStatus<T extends { status: string; created_at: string }>(items: T[]): T[] {
  const order: Record<string, number> = { confirmed: 0, proposed: 1, rejected: 2 };
  return [...items].sort((a, b) => {
    const statusDiff = (order[a.status] ?? 1) - (order[b.status] ?? 1);
    if (statusDiff !== 0) return statusDiff;
    // Proposed: newest first so new agent-added cards appear at top of active section
    if (a.status === "proposed") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });
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
    processFlow,
    clusterColumnHighlight,
    clusteringProposed,
    selectedClusterId,
    updateLivedJTD,
    removeLivedJTD,
    addLivedJTDs,
    updateCognitiveJTD,
    removeCognitiveJTD,
    addCognitiveJTDs,
    updateDelegationCluster,
    addSystemMessage,
    setScrollToMessageId,
    setClusteringProposed,
    setSelectedClusterId,
  } = useDiscoveryStore();

  const [scoringId, setScoringId] = useState<string | null>(null);
  const [creatingLived, setCreatingLived] = useState(false);
  const [creatingCognitive, setCreatingCognitive] = useState(false);
  const [replacedExpanded, setReplacedExpanded] = useState(false);

  // ── Phase name lookup ──────────────────────────────────────────────────────

  const phaseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const step of processFlow?.steps ?? []) {
      map.set(step.id, step.name);
    }
    return map;
  }, [processFlow?.steps]);

  // ── Sorted cards ───────────────────────────────────────────────────────────

  const sortedLived = useMemo(() => sortByStatus(livedJTDs), [livedJTDs]);
  const sortedCognitive = useMemo(() => sortByStatus(cognitiveJTDs), [cognitiveJTDs]);

  const confirmedLived  = useMemo(() => sortedLived.filter((j: LivedJTD) => j.status === "confirmed"),  [sortedLived]);
  const proposedLived   = useMemo(() => sortedLived.filter((j: LivedJTD) => j.status === "proposed"),   [sortedLived]);
  const rejectedLived   = useMemo(() => sortedLived.filter((j: LivedJTD) => j.status === "rejected"),   [sortedLived]);
  const confirmedCog    = useMemo(() => sortedCognitive.filter((j: CognitiveJTD) => j.status === "confirmed"), [sortedCognitive]);
  const proposedCog     = useMemo(() => sortedCognitive.filter((j: CognitiveJTD) => j.status === "proposed"),  [sortedCognitive]);
  const rejectedCog     = useMemo(() => sortedCognitive.filter((j: CognitiveJTD) => j.status === "rejected"),  [sortedCognitive]);

  // ── Confirmed items for membership editing ─────────────────────────────────

  const confirmedLivedJTDs = useMemo(
    () => livedJTDs.filter((j) => j.status === "confirmed"),
    [livedJTDs]
  );
  const confirmedCognitiveJTDs = useMemo(
    () => cognitiveJTDs.filter((j) => j.status === "confirmed"),
    [cognitiveJTDs]
  );

  // ── Selected cluster member sets (for dimming) ─────────────────────────────

  const selectedCluster = useMemo(
    () => selectedClusterId ? delegationClusters.find((c) => c.id === selectedClusterId) ?? null : null,
    [selectedClusterId, delegationClusters]
  );
  const selectedLivedIds = useMemo(
    () => new Set(selectedCluster?.lived_jtd_ids ?? []),
    [selectedCluster]
  );
  const selectedCognitiveIds = useMemo(
    () => new Set(selectedCluster?.cognitive_jtd_ids ?? []),
    [selectedCluster]
  );

  // ── Split clusters into active vs replaced ─────────────────────────────────

  const activeClusters = useMemo(
    () => delegationClusters.filter((c) => c.status !== "replaced"),
    [delegationClusters]
  );
  const replacedClusters = useMemo(
    () => delegationClusters.filter((c) => c.status === "replaced"),
    [delegationClusters]
  );

  // ── Auto-prompt: check if all non-rejected cards are confirmed ─────────────

  const prevAllConfirmedRef = useRef(false);

  useEffect(() => {
    const nonRejectedLived = livedJTDs.filter((j) => j.status !== "rejected");
    const nonRejectedCognitive = cognitiveJTDs.filter((j) => j.status !== "rejected");
    const allLivedConfirmed = nonRejectedLived.length > 0 && nonRejectedLived.every((j) => j.status === "confirmed");
    const allCognitiveConfirmed = nonRejectedCognitive.length > 0 && nonRejectedCognitive.every((j) => j.status === "confirmed");
    const allConfirmed = allLivedConfirmed && allCognitiveConfirmed;
    const noClusters = activeClusters.length === 0;

    // Phase coverage gate: confirmed cards must span at least 2 distinct phases
    let hasPhaseCoverage = false;
    if (allConfirmed) {
      const coveredPhases = new Set<string>();
      for (const j of nonRejectedLived) {
        if (j.process_phase_id) coveredPhases.add(j.process_phase_id);
      }
      for (const j of nonRejectedCognitive) {
        if (j.process_phase_id) coveredPhases.add(j.process_phase_id);
      }
      hasPhaseCoverage = coveredPhases.size >= 2;
    }

    const gateReady = allConfirmed && hasPhaseCoverage;

    if (gateReady && noClusters && !clusteringProposed && !prevAllConfirmedRef.current) {
      setClusteringProposed(true);
      const text = `You have confirmed ${nonRejectedLived.length} task${nonRejectedLived.length !== 1 ? "s" : ""} and ${nonRejectedCognitive.length} cognitive load item${nonRejectedCognitive.length !== 1 ? "s" : ""}. I have enough material to propose delegation clusters. Shall I proceed?`;
      addSystemMessage(text);
      // Persist so it survives navigation
      discoveryApi.saveSystemMessage(useCaseId, text).catch(console.error);
    }
    prevAllConfirmedRef.current = gateReady;
  }, [livedJTDs, cognitiveJTDs, activeClusters.length, clusteringProposed, addSystemMessage, setClusteringProposed]);

  // ── Provenance scroll helper ───────────────────────────────────────────────

  const scrollToSource = (messageId: string) => {
    setScrollToMessageId(messageId);
  };

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
      const updated = await discoveryApi.updateLivedJTD(useCaseId, id, { status: "rejected" });
      updateLivedJTD(updated);
    } catch (e) {
      console.error("Failed to reject Lived JTD:", e);
    }
  };

  const unconfirmLivedJTD = async (id: string) => {
    try {
      const updated = await discoveryApi.updateLivedJTD(useCaseId, id, { status: "proposed" });
      updateLivedJTD(updated);
    } catch (e) {
      console.error("Failed to unconfirm Lived JTD:", e);
    }
  };

  const reinstateLivedJTD = async (id: string) => {
    try {
      const updated = await discoveryApi.updateLivedJTD(useCaseId, id, { status: "proposed" });
      updateLivedJTD(updated);
    } catch (e) {
      console.error("Failed to reinstate Lived JTD:", e);
    }
  };

  const updateLivedJTDFields = async (id: string, description: string, systemContext: string) => {
    try {
      const updated = await discoveryApi.updateLivedJTD(useCaseId, id, {
        description,
        system_context: systemContext || null,
        is_modified: true,
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
      const updated = await discoveryApi.updateCognitiveJTD(useCaseId, id, { status: "rejected" });
      updateCognitiveJTD(updated);
    } catch (e) {
      console.error("Failed to reject Cognitive JTD:", e);
    }
  };

  const unconfirmCognitiveJTD = async (id: string) => {
    try {
      const updated = await discoveryApi.updateCognitiveJTD(useCaseId, id, { status: "proposed" });
      updateCognitiveJTD(updated);
    } catch (e) {
      console.error("Failed to unconfirm Cognitive JTD:", e);
    }
  };

  const reinstateCognitiveJTD = async (id: string) => {
    try {
      const updated = await discoveryApi.updateCognitiveJTD(useCaseId, id, { status: "proposed" });
      updateCognitiveJTD(updated);
    } catch (e) {
      console.error("Failed to reinstate Cognitive JTD:", e);
    }
  };

  const updateCognitiveJTDFields = async (id: string, description: string, cognitiveZone: string) => {
    try {
      const updated = await discoveryApi.updateCognitiveJTD(useCaseId, id, {
        description,
        cognitive_zone: cognitiveZone || null,
        is_modified: true,
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
      const cluster = delegationClusters.find((c) => c.id === id);
      const newStatus = cluster?.status === "confirmed" ? "proposed" : "confirmed";
      const updated = await discoveryApi.updateCluster(useCaseId, id, { status: newStatus as "proposed" | "confirmed" });
      updateDelegationCluster(updated);
    } catch (e) {
      console.error("Failed to toggle cluster confirmation:", e);
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

  const selectDelegationMode = async (id: string, mode: string) => {
    try {
      const updated = await discoveryApi.updateCluster(useCaseId, id, { delegation_mode: mode });
      updateDelegationCluster(updated);
    } catch (e) {
      console.error("Failed to set delegation mode:", e);
    }
  };

  // ── Cluster membership toggle ──────────────────────────────────────────────

  const toggleClusterMembership = async (clusterId: string, jtdId: string, type: "lived" | "cognitive", isMember: boolean) => {
    try {
      let updated: DelegationCluster;
      if (type === "lived") {
        if (isMember) {
          updated = await discoveryApi.removeClusterLivedJTD(useCaseId, clusterId, jtdId);
        } else {
          updated = await discoveryApi.addClusterLivedJTD(useCaseId, clusterId, jtdId);
        }
      } else {
        if (isMember) {
          updated = await discoveryApi.removeClusterCognitiveJTD(useCaseId, clusterId, jtdId);
        } else {
          updated = await discoveryApi.addClusterCognitiveJTD(useCaseId, clusterId, jtdId);
        }
      }
      updateDelegationCluster(updated);
    } catch (e) {
      console.error("Failed to toggle cluster membership:", e);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderLivedCard = (jtd: LivedJTD) => (
    <div
      key={jtd.id}
      className="jtd-card-enter"
      style={{ animation: "fadeIn 150ms ease-in" }}
    >
      <LivedJTDCard
        jtd={jtd}
        phaseName={jtd.process_phase_id ? phaseNameMap.get(jtd.process_phase_id) ?? null : null}
        dimmed={selectedClusterId !== null && !selectedLivedIds.has(jtd.id)}
        onConfirm={() => confirmLivedJTD(jtd.id)}
        onReject={jtd.status === "confirmed"
          ? () => unconfirmLivedJTD(jtd.id)
          : () => rejectLivedJTD(jtd.id)
        }
        onReinstate={() => reinstateLivedJTD(jtd.id)}
        onUpdate={(desc, ctx) => updateLivedJTDFields(jtd.id, desc, ctx)}
        onDelete={() => deleteLivedJTD(jtd.id)}
        onScrollToSource={scrollToSource}
      />
    </div>
  );

  const renderCognitiveCard = (jtd: CognitiveJTD) => (
    <div
      key={jtd.id}
      style={{ animation: "fadeIn 150ms ease-in" }}
    >
      <CognitiveJTDCard
        jtd={jtd}
        phaseName={jtd.process_phase_id ? phaseNameMap.get(jtd.process_phase_id) ?? null : null}
        dimmed={selectedClusterId !== null && !selectedCognitiveIds.has(jtd.id)}
        onConfirm={() => confirmCognitiveJTD(jtd.id)}
        onReject={jtd.status === "confirmed"
          ? () => unconfirmCognitiveJTD(jtd.id)
          : () => rejectCognitiveJTD(jtd.id)
        }
        onReinstate={() => reinstateCognitiveJTD(jtd.id)}
        onUpdate={(desc, zone) => updateCognitiveJTDFields(jtd.id, desc, zone)}
        onDelete={() => deleteCognitiveJTD(jtd.id)}
        onScrollToSource={scrollToSource}
      />
    </div>
  );

  const renderClusterCard = (cluster: DelegationCluster) => (
    <div
      key={cluster.id}
      style={{ animation: "fadeIn 150ms ease-in" }}
    >
      <DelegationClusterCard
        cluster={cluster}
        onConfirm={() => confirmCluster(cluster.id)}
        onScore={() => scoreCluster(cluster.id)}
        onSelectDelegationMode={(mode) => selectDelegationMode(cluster.id, mode)}
        isScoring={scoringId === cluster.id}
        isSelected={selectedClusterId === cluster.id}
        onSelect={() => setSelectedClusterId(selectedClusterId === cluster.id ? null : cluster.id)}
        confirmedLivedJTDs={confirmedLivedJTDs}
        confirmedCognitiveJTDs={confirmedCognitiveJTDs}
        onToggleMembership={(jtdId, type, isMember) => toggleClusterMembership(cluster.id, jtdId, type, isMember)}
      />
    </div>
  );

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
        onClick={() => selectedClusterId && setSelectedClusterId(null)}
      >
        <ColumnHeader
          label="Tasks & Interactions"
          subtitle="Physical tasks & system interactions"
          count={livedJTDs.filter((j) => j.status !== "rejected").length}
          accentColor="var(--jtd-lived)"
        />
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
          {sortedLived.length === 0 && !creatingLived ? (
            <EmptyColumn label="Tasks & Interactions" />
          ) : (
            <>
              <div className="flex flex-col gap-1">{confirmedLived.map(renderLivedCard)}</div>
              {confirmedLived.length > 0 && proposedLived.length > 0 && (
                <hr style={{ borderColor: "var(--bg-border)", margin: "4px 0" }} />
              )}
              <div className="flex flex-col gap-2">{proposedLived.map(renderLivedCard)}</div>
              {rejectedLived.length > 0 && (proposedLived.length > 0 || confirmedLived.length > 0) && (
                <hr style={{ borderColor: "var(--bg-border)", margin: "4px 0" }} />
              )}
              <div className="flex flex-col gap-1">{rejectedLived.map(renderLivedCard)}</div>
            </>
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
        onClick={() => selectedClusterId && setSelectedClusterId(null)}
      >
        <ColumnHeader
          label="Cognitive Load"
          subtitle="Mental effort, judgment and decision-making"
          count={cognitiveJTDs.filter((j) => j.status !== "rejected").length}
          accentColor="var(--jtd-cognitive)"
        />
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
          {sortedCognitive.length === 0 && !creatingCognitive ? (
            <EmptyColumn label="Cognitive Load" />
          ) : (
            <>
              <div className="flex flex-col gap-1">{confirmedCog.map(renderCognitiveCard)}</div>
              {confirmedCog.length > 0 && proposedCog.length > 0 && (
                <hr style={{ borderColor: "var(--bg-border)", margin: "4px 0" }} />
              )}
              <div className="flex flex-col gap-2">{proposedCog.map(renderCognitiveCard)}</div>
              {rejectedCog.length > 0 && (proposedCog.length > 0 || confirmedCog.length > 0) && (
                <hr style={{ borderColor: "var(--bg-border)", margin: "4px 0" }} />
              )}
              <div className="flex flex-col gap-1">{rejectedCog.map(renderCognitiveCard)}</div>
            </>
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
        className={`flex flex-col w-1/3 overflow-hidden${clusterColumnHighlight ? " cluster-pulse" : ""}`}
        style={{ minWidth: 0 }}
      >
        <ColumnHeader
          label="Clusters"
          subtitle="Delegation units for agent design"
          count={activeClusters.length}
          accentColor="var(--jtd-cluster)"
        />
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
          {activeClusters.length === 0 && replacedClusters.length === 0 ? (
            <EmptyColumn label="Delegation clusters" />
          ) : (
            <>
              {activeClusters.map(renderClusterCard)}

              {/* Replaced clusters — collapsed section */}
              {replacedClusters.length > 0 && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--bg-border)" }}>
                  <button
                    onClick={() => setReplacedExpanded((v) => !v)}
                    className="flex items-center gap-1.5 w-full text-left text-xs font-ui mb-2 transition-colors"
                    style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <span>{replacedExpanded ? "▼" : "▶"}</span>
                    <span>Previously proposed ({replacedClusters.length})</span>
                  </button>
                  {replacedExpanded && (
                    <div className="flex flex-col gap-2" style={{ opacity: 0.5 }}>
                      {replacedClusters.map(renderClusterCard)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
