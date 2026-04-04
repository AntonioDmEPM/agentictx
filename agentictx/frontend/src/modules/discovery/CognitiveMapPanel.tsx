import { useEffect, useMemo, useRef, useState } from "react";
import { discoveryApi } from "@/api/discovery";
import { useDiscoveryStore } from "@/store/discoveryStore";
import type { Activity, AgentScope, CognitiveLoad } from "@/types/discovery";
import { ActivityCard, AgentScopeCard, CognitiveLoadCard } from "./ActivityCard";

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

function CreateActivityForm({
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
      className="rounded-md border bg-bg-surface overflow-hidden"
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
    activities,
    cognitiveLoadItems,
    agentScopes,
    processFlow,
    scopeColumnHighlight,
    clusteringProposed,
    selectedScopeId,
    updateActivity,
    removeActivity,
    addActivities,
    updateCognitiveLoad,
    removeCognitiveLoad,
    addCognitiveLoadItems,
    updateAgentScope,
    addSystemMessage,
    setScrollToMessageId,
    setClusteringProposed,
    setSelectedScopeId,
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

  const sortedActivities = useMemo(() => sortByStatus(activities), [activities]);
  const sortedCognitiveLoad = useMemo(() => sortByStatus(cognitiveLoadItems), [cognitiveLoadItems]);

  const confirmedActivities  = useMemo(() => sortedActivities.filter((j: Activity) => j.status === "confirmed"),  [sortedActivities]);
  const proposedActivities   = useMemo(() => sortedActivities.filter((j: Activity) => j.status === "proposed"),   [sortedActivities]);
  const rejectedActivities   = useMemo(() => sortedActivities.filter((j: Activity) => j.status === "rejected"),   [sortedActivities]);
  const confirmedCognitiveLoad    = useMemo(() => sortedCognitiveLoad.filter((j: CognitiveLoad) => j.status === "confirmed"), [sortedCognitiveLoad]);
  const proposedCognitiveLoad     = useMemo(() => sortedCognitiveLoad.filter((j: CognitiveLoad) => j.status === "proposed"),  [sortedCognitiveLoad]);
  const rejectedCognitiveLoad     = useMemo(() => sortedCognitiveLoad.filter((j: CognitiveLoad) => j.status === "rejected"),  [sortedCognitiveLoad]);

  // ── Confirmed items for membership editing ─────────────────────────────────

  const confirmedActivitiesForEdit = useMemo(
    () => activities.filter((j) => j.status === "confirmed"),
    [activities]
  );
  const confirmedCognitiveLoadForEdit = useMemo(
    () => cognitiveLoadItems.filter((j) => j.status === "confirmed"),
    [cognitiveLoadItems]
  );

  // ── Selected cluster member sets (for dimming) ─────────────────────────────

  const selectedScope = useMemo(
    () => selectedScopeId ? agentScopes.find((c) => c.id === selectedScopeId) ?? null : null,
    [selectedScopeId, agentScopes]
  );
  const selectedActivityIds = useMemo(
    () => new Set(selectedScope?.lived_jtd_ids ?? []),
    [selectedScope]
  );
  const selectedCognitiveIds = useMemo(
    () => new Set(selectedScope?.cognitive_jtd_ids ?? []),
    [selectedScope]
  );

  // ── Split scopes into active vs replaced ───────────────────────────────────

  const activeScopes = useMemo(
    () => agentScopes.filter((c) => c.status !== "replaced"),
    [agentScopes]
  );
  const replacedScopes = useMemo(
    () => agentScopes.filter((c) => c.status === "replaced"),
    [agentScopes]
  );

  // ── Auto-prompt: check if all non-rejected cards are confirmed ─────────────

  const prevAllConfirmedRef = useRef(false);

  useEffect(() => {
    const nonRejectedActivities = activities.filter((j) => j.status !== "rejected");
    const nonRejectedCognitive = cognitiveLoadItems.filter((j) => j.status !== "rejected");
    const allActivitiesConfirmed = nonRejectedActivities.length > 0 && nonRejectedActivities.every((j) => j.status === "confirmed");
    const allCognitiveConfirmed = nonRejectedCognitive.length > 0 && nonRejectedCognitive.every((j) => j.status === "confirmed");
    const allConfirmed = allActivitiesConfirmed && allCognitiveConfirmed;
    const noScopes = activeScopes.length === 0;

    // Phase coverage gate: confirmed cards must span at least 2 distinct phases
    let hasPhaseCoverage = false;
    if (allConfirmed) {
      const coveredPhases = new Set<string>();
      for (const j of nonRejectedActivities) {
        if (j.process_phase_id) coveredPhases.add(j.process_phase_id);
      }
      for (const j of nonRejectedCognitive) {
        if (j.process_phase_id) coveredPhases.add(j.process_phase_id);
      }
      hasPhaseCoverage = coveredPhases.size >= 2;
    }

    const gateReady = allConfirmed && hasPhaseCoverage;

    if (gateReady && noScopes && !clusteringProposed && !prevAllConfirmedRef.current) {
      setClusteringProposed(true);
      const text = `You have confirmed ${nonRejectedActivities.length} activit${nonRejectedActivities.length !== 1 ? "ies" : "y"} and ${nonRejectedCognitive.length} cognitive load item${nonRejectedCognitive.length !== 1 ? "s" : ""}. I have enough material to propose agent scopes. Shall I proceed?`;
      addSystemMessage(text);
      // Persist so it survives navigation
      discoveryApi.saveSystemMessage(useCaseId, text).catch(console.error);
    }
    prevAllConfirmedRef.current = gateReady;
  }, [activities, cognitiveLoadItems, activeScopes.length, clusteringProposed, addSystemMessage, setClusteringProposed]);

  // ── Provenance scroll helper ───────────────────────────────────────────────

  const scrollToSource = (messageId: string) => {
    setScrollToMessageId(messageId);
  };

  // ── Activity actions ─────────────────────────────────────────────────────

  const confirmActivityItem = async (id: string) => {
    try {
      const updated = await discoveryApi.updateActivity(useCaseId, id, { status: "confirmed" });
      updateActivity(updated);
    } catch (e) {
      console.error("Failed to confirm activity:", e);
    }
  };

  const rejectActivityItem = async (id: string) => {
    try {
      const updated = await discoveryApi.updateActivity(useCaseId, id, { status: "rejected" });
      updateActivity(updated);
    } catch (e) {
      console.error("Failed to reject activity:", e);
    }
  };

  const unconfirmActivityItem = async (id: string) => {
    try {
      const updated = await discoveryApi.updateActivity(useCaseId, id, { status: "proposed" });
      updateActivity(updated);
    } catch (e) {
      console.error("Failed to unconfirm activity:", e);
    }
  };

  const reinstateActivityItem = async (id: string) => {
    try {
      const updated = await discoveryApi.updateActivity(useCaseId, id, { status: "proposed" });
      updateActivity(updated);
    } catch (e) {
      console.error("Failed to reinstate activity:", e);
    }
  };

  const updateActivityFields = async (id: string, description: string, systemContext: string) => {
    try {
      const updated = await discoveryApi.updateActivity(useCaseId, id, {
        description,
        system_context: systemContext || null,
        is_modified: true,
      });
      updateActivity(updated);
    } catch (e) {
      console.error("Failed to update activity:", e);
    }
  };

  const deleteActivityItem = async (id: string) => {
    try {
      await discoveryApi.deleteActivity(useCaseId, id);
      removeActivity(id);
    } catch (e) {
      console.error("Failed to delete activity:", e);
    }
  };

  const createActivityItem = async (description: string, systemContext: string) => {
    try {
      const created = await discoveryApi.createActivity(useCaseId, {
        description,
        system_context: systemContext || null,
      });
      addActivities([created]);
      setCreatingLived(false);
    } catch (e) {
      console.error("Failed to create activity:", e);
    }
  };

  // ── Cognitive Load actions ──────────────────────────────────────────────

  const confirmCognitiveLoadItem = async (id: string) => {
    try {
      const updated = await discoveryApi.updateCognitiveLoad(useCaseId, id, { status: "confirmed" });
      updateCognitiveLoad(updated);
    } catch (e) {
      console.error("Failed to confirm cognitive load:", e);
    }
  };

  const rejectCognitiveLoadItem = async (id: string) => {
    try {
      const updated = await discoveryApi.updateCognitiveLoad(useCaseId, id, { status: "rejected" });
      updateCognitiveLoad(updated);
    } catch (e) {
      console.error("Failed to reject cognitive load:", e);
    }
  };

  const unconfirmCognitiveLoadItem = async (id: string) => {
    try {
      const updated = await discoveryApi.updateCognitiveLoad(useCaseId, id, { status: "proposed" });
      updateCognitiveLoad(updated);
    } catch (e) {
      console.error("Failed to unconfirm cognitive load:", e);
    }
  };

  const reinstateCognitiveLoadItem = async (id: string) => {
    try {
      const updated = await discoveryApi.updateCognitiveLoad(useCaseId, id, { status: "proposed" });
      updateCognitiveLoad(updated);
    } catch (e) {
      console.error("Failed to reinstate cognitive load:", e);
    }
  };

  const updateCognitiveLoadFields = async (id: string, description: string, cognitiveZone: string) => {
    try {
      const updated = await discoveryApi.updateCognitiveLoad(useCaseId, id, {
        description,
        cognitive_zone: cognitiveZone || null,
        is_modified: true,
      });
      updateCognitiveLoad(updated);
    } catch (e) {
      console.error("Failed to update cognitive load:", e);
    }
  };

  const deleteCognitiveLoadItem = async (id: string) => {
    try {
      await discoveryApi.deleteCognitiveLoad(useCaseId, id);
      removeCognitiveLoad(id);
    } catch (e) {
      console.error("Failed to delete cognitive load:", e);
    }
  };

  const createCognitiveLoadItem = async (description: string, cognitiveZone: string) => {
    try {
      const created = await discoveryApi.createCognitiveLoad(useCaseId, {
        description,
        cognitive_zone: cognitiveZone || null,
      });
      addCognitiveLoadItems([created]);
      setCreatingCognitive(false);
    } catch (e) {
      console.error("Failed to create cognitive load:", e);
    }
  };

  // ── Agent scope actions ──────────────────────────────────────────────────

  const confirmScope = async (id: string) => {
    try {
      const scope = agentScopes.find((c) => c.id === id);
      const newStatus = scope?.status === "confirmed" ? "proposed" : "confirmed";
      const updated = await discoveryApi.updateScope(useCaseId, id, { status: newStatus as "proposed" | "confirmed" });
      updateAgentScope(updated);
    } catch (e) {
      console.error("Failed to toggle scope confirmation:", e);
    }
  };

  const scoreScope = async (id: string) => {
    setScoringId(id);
    try {
      const updated = await discoveryApi.scoreScope(useCaseId, id);
      updateAgentScope(updated);
    } catch (e) {
      console.error("Failed to score scope:", e);
    } finally {
      setScoringId(null);
    }
  };

  const selectDelegationMode = async (id: string, mode: string) => {
    try {
      const updated = await discoveryApi.updateScope(useCaseId, id, { delegation_mode: mode });
      updateAgentScope(updated);
    } catch (e) {
      console.error("Failed to set delegation mode:", e);
    }
  };

  // ── Scope membership toggle ────────────────────────────────────────────────

  const toggleScopeMembership = async (scopeId: string, itemId: string, type: "lived" | "cognitive", isMember: boolean) => {
    try {
      let updated: AgentScope;
      if (type === "lived") {
        if (isMember) {
          updated = await discoveryApi.removeScopeActivity(useCaseId, scopeId, itemId);
        } else {
          updated = await discoveryApi.addScopeActivity(useCaseId, scopeId, itemId);
        }
      } else {
        if (isMember) {
          updated = await discoveryApi.removeScopeCognitiveLoad(useCaseId, scopeId, itemId);
        } else {
          updated = await discoveryApi.addScopeCognitiveLoad(useCaseId, scopeId, itemId);
        }
      }
      updateAgentScope(updated);
    } catch (e) {
      console.error("Failed to toggle scope membership:", e);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderActivityCard = (activity: Activity) => (
    <div
      key={activity.id}
      className="card-enter"
      style={{ animation: "fadeIn 150ms ease-in" }}
    >
      <ActivityCard
        activity={activity}
        phaseName={activity.process_phase_id ? phaseNameMap.get(activity.process_phase_id) ?? null : null}
        dimmed={selectedScopeId !== null && !selectedActivityIds.has(activity.id)}
        onConfirm={() => confirmActivityItem(activity.id)}
        onReject={activity.status === "confirmed"
          ? () => unconfirmActivityItem(activity.id)
          : () => rejectActivityItem(activity.id)
        }
        onReinstate={() => reinstateActivityItem(activity.id)}
        onUpdate={(desc, ctx) => updateActivityFields(activity.id, desc, ctx)}
        onDelete={() => deleteActivityItem(activity.id)}
        onScrollToSource={scrollToSource}
      />
    </div>
  );

  const renderCognitiveCard = (item: CognitiveLoad) => (
    <div
      key={item.id}
      style={{ animation: "fadeIn 150ms ease-in" }}
    >
      <CognitiveLoadCard
        item={item}
        phaseName={item.process_phase_id ? phaseNameMap.get(item.process_phase_id) ?? null : null}
        dimmed={selectedScopeId !== null && !selectedCognitiveIds.has(item.id)}
        onConfirm={() => confirmCognitiveLoadItem(item.id)}
        onReject={item.status === "confirmed"
          ? () => unconfirmCognitiveLoadItem(item.id)
          : () => rejectCognitiveLoadItem(item.id)
        }
        onReinstate={() => reinstateCognitiveLoadItem(item.id)}
        onUpdate={(desc, zone) => updateCognitiveLoadFields(item.id, desc, zone)}
        onDelete={() => deleteCognitiveLoadItem(item.id)}
        onScrollToSource={scrollToSource}
      />
    </div>
  );

  const renderScopeCard = (scope: AgentScope) => (
    <div
      key={scope.id}
      style={{ animation: "fadeIn 150ms ease-in" }}
    >
      <AgentScopeCard
        cluster={scope}
        onConfirm={() => confirmScope(scope.id)}
        onScore={() => scoreScope(scope.id)}
        onSelectDelegationMode={(mode) => selectDelegationMode(scope.id, mode)}
        isScoring={scoringId === scope.id}
        isSelected={selectedScopeId === scope.id}
        onSelect={() => setSelectedScopeId(selectedScopeId === scope.id ? null : scope.id)}
        confirmedActivities={confirmedActivitiesForEdit}
        confirmedCognitiveLoad={confirmedCognitiveLoadForEdit}
        onToggleMembership={(itemId, type, isMember) => toggleScopeMembership(scope.id, itemId, type, isMember)}
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
      {/* ── Column 1: Activities ────────────────────────────────────────── */}
      <div
        className="flex flex-col w-1/3 border-r border-bg-border overflow-hidden"
        style={{ minWidth: 0 }}
        onClick={() => selectedScopeId && setSelectedScopeId(null)}
      >
        <ColumnHeader
          label="Activities"
          subtitle="What people do — actions, decisions, system interactions"
          count={activities.filter((j) => j.status !== "rejected").length}
          accentColor="var(--color-activity)"
        />
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
          {sortedActivities.length === 0 && !creatingLived ? (
            <EmptyColumn label="Activities" />
          ) : (
            <>
              <div className="flex flex-col gap-1">{confirmedActivities.map(renderActivityCard)}</div>
              {confirmedActivities.length > 0 && proposedActivities.length > 0 && (
                <hr style={{ borderColor: "var(--bg-border)", margin: "4px 0" }} />
              )}
              <div className="flex flex-col gap-2">{proposedActivities.map(renderActivityCard)}</div>
              {rejectedActivities.length > 0 && (proposedActivities.length > 0 || confirmedActivities.length > 0) && (
                <hr style={{ borderColor: "var(--bg-border)", margin: "4px 0" }} />
              )}
              <div className="flex flex-col gap-1">{rejectedActivities.map(renderActivityCard)}</div>
            </>
          )}
          {creatingLived && (
            <CreateActivityForm
              secondaryLabel="System context (optional)"
              accentColor="var(--color-activity)"
              onSave={createActivityItem}
              onCancel={() => setCreatingLived(false)}
            />
          )}
          {!creatingLived && (
            <AddButton onClick={() => setCreatingLived(true)} accentColor="var(--color-activity)" />
          )}
        </div>
      </div>

      {/* ── Column 2: Cognitive Load ─────────────────────────────────────── */}
      <div
        className="flex flex-col w-1/3 border-r border-bg-border overflow-hidden"
        style={{ minWidth: 0 }}
        onClick={() => selectedScopeId && setSelectedScopeId(null)}
      >
        <ColumnHeader
          label="Cognitive Load"
          subtitle="Mental effort, judgment and decision-making"
          count={cognitiveLoadItems.filter((j) => j.status !== "rejected").length}
          accentColor="var(--color-cognitive)"
        />
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
          {sortedCognitiveLoad.length === 0 && !creatingCognitive ? (
            <EmptyColumn label="Cognitive Load" />
          ) : (
            <>
              <div className="flex flex-col gap-1">{confirmedCognitiveLoad.map(renderCognitiveCard)}</div>
              {confirmedCognitiveLoad.length > 0 && proposedCognitiveLoad.length > 0 && (
                <hr style={{ borderColor: "var(--bg-border)", margin: "4px 0" }} />
              )}
              <div className="flex flex-col gap-2">{proposedCognitiveLoad.map(renderCognitiveCard)}</div>
              {rejectedCognitiveLoad.length > 0 && (proposedCognitiveLoad.length > 0 || confirmedCognitiveLoad.length > 0) && (
                <hr style={{ borderColor: "var(--bg-border)", margin: "4px 0" }} />
              )}
              <div className="flex flex-col gap-1">{rejectedCognitiveLoad.map(renderCognitiveCard)}</div>
            </>
          )}
          {creatingCognitive && (
            <CreateActivityForm
              secondaryLabel="Cognitive zone (optional)"
              accentColor="var(--color-cognitive)"
              onSave={createCognitiveLoadItem}
              onCancel={() => setCreatingCognitive(false)}
            />
          )}
          {!creatingCognitive && (
            <AddButton onClick={() => setCreatingCognitive(true)} accentColor="var(--color-cognitive)" />
          )}
        </div>
      </div>

      {/* ── Column 3: Agent Scopes ──────────────────────────────────────── */}
      <div
        className={`flex flex-col w-1/3 overflow-hidden${scopeColumnHighlight ? " cluster-pulse" : ""}`}
        style={{ minWidth: 0 }}
      >
        <ColumnHeader
          label="Agent Scopes"
          subtitle="Scoped work for each agent"
          count={activeScopes.length}
          accentColor="var(--color-scope)"
        />
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
          {activeScopes.length === 0 && replacedScopes.length === 0 ? (
            <EmptyColumn label="Agent Scopes" />
          ) : (
            <>
              {activeScopes.map(renderScopeCard)}

              {/* Replaced scopes — collapsed section */}
              {replacedScopes.length > 0 && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--bg-border)" }}>
                  <button
                    onClick={() => setReplacedExpanded((v) => !v)}
                    className="flex items-center gap-1.5 w-full text-left text-xs font-ui mb-2 transition-colors"
                    style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <span>{replacedExpanded ? "▼" : "▶"}</span>
                    <span>Previously proposed ({replacedScopes.length})</span>
                  </button>
                  {replacedExpanded && (
                    <div className="flex flex-col gap-2" style={{ opacity: 0.5 }}>
                      {replacedScopes.map(renderScopeCard)}
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
