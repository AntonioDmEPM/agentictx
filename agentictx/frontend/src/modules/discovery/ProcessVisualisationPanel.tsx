/**
 * ProcessVisualisationPanel
 *
 * Three-layer horizontal swimlane:
 *   Layer 3 (top)    — cluster bands spanning assigned steps
 *   Layer 1 (middle) — process step nodes connected left-to-right
 *   Layer 2 (bottom) — lived (amber) and cognitive (blue) Activity pills below each step
 */
import { useCallback, useRef, useState } from "react";
import { discoveryApi } from "@/api/discovery";
import { useDiscoveryStore } from "@/store/discoveryStore";
import type {
  Activity,
  AgentScope,
  CognitiveLoad,
  Phase,
} from "@/types/discovery";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLUSTER_COLOURS = [
  "var(--color-scope)",
  "var(--color-agent)",
  "var(--accent-warm)",
  "var(--accent-primary)",
];

function loadTint(intensity: number | null): string {
  if (intensity === null) return "transparent";
  if (intensity === 0) return "transparent";
  if (intensity === 1) return "rgba(74,111,165,0.08)";
  if (intensity === 2) return "rgba(176,115,64,0.12)";
  return "rgba(196,93,62,0.15)";
}

// ─── Inline-rename input ──────────────────────────────────────────────────────

function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  return (
    <input
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        const trimmed = val.trim();
        if (trimmed && trimmed !== initial) onCommit(trimmed);
        else onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const trimmed = val.trim();
          if (trimmed && trimmed !== initial) onCommit(trimmed);
          else onCancel();
        }
        if (e.key === "Escape") onCancel();
      }}
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--accent-primary)",
        borderRadius: 4,
        color: "var(--text-primary)",
        fontSize: 11,
        fontFamily: "var(--font-ui)",
        padding: "2px 6px",
        width: "100%",
        outline: "none",
      }}
    />
  );
}

// ─── Activity Pill ────────────────────────────────────────────────────────────

function JTDPill({
  label,
  type,
  onRemove,
}: {
  label: string;
  type: "lived" | "cognitive";
  onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const colour = type === "lived" ? "var(--color-activity)" : "var(--color-cognitive)";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: `${colour}20`,
        border: `1px solid ${colour}60`,
        borderRadius: 12,
        padding: "2px 7px",
        fontSize: 10,
        fontFamily: "var(--font-ui)",
        color: colour,
        maxWidth: 140,
        cursor: "default",
      }}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 100,
        }}
      >
        {label}
      </span>
      {hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            background: "none",
            border: "none",
            color: colour,
            cursor: "pointer",
            fontSize: 11,
            lineHeight: 1,
            padding: 0,
            marginLeft: 2,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Activity Picker ──────────────────────────────────────────────────────────

function JTDPicker({
  activities,
  cognitiveLoadItems,
  linkedIds,
  onPick,
  onClose,
}: {
  activities: Activity[];
  cognitiveLoadItems: CognitiveLoad[];
  linkedIds: Set<string>;
  onPick: (type: "lived" | "cognitive", jtdId: string) => void;
  onClose: () => void;
}) {
  const available = [
    ...activities
      .filter((j) => !linkedIds.has(j.id))
      .map((j) => ({ type: "lived" as const, id: j.id, desc: j.description })),
    ...cognitiveLoadItems
      .filter((j) => !linkedIds.has(j.id))
      .map((j) => ({ type: "cognitive" as const, id: j.id, desc: j.description })),
  ];

  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 4px)",
        left: 0,
        zIndex: 50,
        background: "var(--bg-elevated)",
        border: "1px solid var(--bg-border)",
        borderRadius: 8,
        padding: 8,
        minWidth: 240,
        maxHeight: 240,
        overflowY: "auto",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: "var(--font-ui)",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Link Activity
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 13,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
      {available.length === 0 && (
        <p
          style={{
            fontSize: 11,
            fontFamily: "var(--font-body)",
            color: "var(--text-muted)",
            margin: 0,
          }}
        >
          All linked
        </p>
      )}
      {available.map((item) => {
        const colour =
          item.type === "lived" ? "var(--color-activity)" : "var(--color-cognitive)";
        return (
          <button
            key={item.id}
            onClick={() => {
              onPick(item.type, item.id);
              onClose();
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              background: "none",
              border: "none",
              borderRadius: 4,
              padding: "4px 6px",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "var(--font-body)",
              color: colour,
              marginBottom: 2,
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background =
                "var(--bg-border)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = "none")
            }
          >
            <span
              style={{
                fontSize: 9,
                fontFamily: "var(--font-ui)",
                textTransform: "uppercase",
                marginRight: 6,
                opacity: 0.7,
              }}
            >
              {item.type === "lived" ? "Task" : "Reasoning"}
            </span>
            {item.desc.length > 60 ? item.desc.slice(0, 58) + "…" : item.desc}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step Node ────────────────────────────────────────────────────────────────

interface LinkedJTD {
  id: string;
  type: "lived" | "cognitive";
  description: string;
}

function StepNode({
  step,
  linkedJTDs,
  activities,
  cognitiveLoadItems,
  isLast,
  useCaseId,
  onUpdated,
  onDeleted,
  onJTDLinked,
  onJTDUnlinked,
}: {
  step: Phase;
  linkedJTDs: LinkedJTD[];
  activities: Activity[];
  cognitiveLoadItems: CognitiveLoad[];
  isLast: boolean;
  useCaseId: string;
  onUpdated: (s: Phase) => void;
  onDeleted: (id: string) => void;
  onJTDLinked: (type: "lived" | "cognitive", jtdId: string) => void;
  onJTDUnlinked: (type: "lived" | "cognitive", jtdId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const linkedIds = new Set(linkedJTDs.map((j) => j.id));

  const handleRename = useCallback(
    async (newName: string) => {
      setRenaming(false);
      const updated = await discoveryApi.updateStep(useCaseId, step.id, {
        name: newName,
      });
      onUpdated(updated);
    },
    [useCaseId, step.id, onUpdated]
  );

  const handleToggleBreakpoint = useCallback(async () => {
    const updated = await discoveryApi.updateStep(useCaseId, step.id, {
      is_breakpoint: !step.is_breakpoint,
    });
    onUpdated(updated);
  }, [useCaseId, step.id, step.is_breakpoint, onUpdated]);

  const handleDelete = useCallback(async () => {
    await discoveryApi.deleteStep(useCaseId, step.id);
    onDeleted(step.id);
  }, [useCaseId, step.id, onDeleted]);

  const handleLinkPick = useCallback(
    async (type: "lived" | "cognitive", jtdId: string) => {
      if (type === "lived") {
        await discoveryApi.updateActivity(useCaseId, jtdId, { process_phase_id: step.id });
      } else {
        await discoveryApi.updateCognitiveLoad(useCaseId, jtdId, { process_phase_id: step.id });
      }
      onJTDLinked(type, jtdId);
    },
    [useCaseId, step.id, onJTDLinked]
  );

  const handleUnlink = useCallback(
    async (type: "lived" | "cognitive", jtdId: string) => {
      if (type === "lived") {
        await discoveryApi.updateActivity(useCaseId, jtdId, { process_phase_id: null });
      } else {
        await discoveryApi.updateCognitiveLoad(useCaseId, jtdId, { process_phase_id: null });
      }
      onJTDUnlinked(type, jtdId);
    },
    [useCaseId, onJTDUnlinked]
  );

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
      {/* Step column: node + pills */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Node */}
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "relative",
            minWidth: 140,
            minHeight: 72,
            background: hovered ? "var(--bg-elevated)" : "var(--bg-surface)",
            backgroundColor: `color-mix(in srgb, ${loadTint(step.cognitive_load_intensity)}, var(--bg-surface))`,
            border: step.is_breakpoint
              ? "2px solid var(--accent-warm)"
              : "1px solid var(--bg-border)",
            borderRadius: 8,
            padding: "8px 10px",
            cursor: "default",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            transition: "background 0.15s ease, border-color 0.15s ease",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 4,
            }}
          >
            {renaming ? (
              <RenameInput
                initial={step.name}
                onCommit={handleRename}
                onCancel={() => setRenaming(false)}
              />
            ) : (
              <span
                onDoubleClick={() => setRenaming(true)}
                title="Double-click to rename"
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-body)",
                  color: "var(--text-primary)",
                  fontWeight: step.is_breakpoint ? 600 : 400,
                  lineHeight: 1.3,
                  cursor: "text",
                  flexGrow: 1,
                }}
              >
                {step.name}
              </span>
            )}
          </div>

          {/* Breakpoint label */}
          {step.is_breakpoint && (
            <span
              style={{
                fontSize: 9,
                fontFamily: "var(--font-ui)",
                color: "var(--accent-warm)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginTop: 2,
              }}
            >
              Breakpoint
            </span>
          )}

          {/* Hover controls */}
          {hovered && !renaming && (
            <div
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                display: "flex",
                gap: 3,
              }}
            >
              <button
                onClick={handleToggleBreakpoint}
                title={step.is_breakpoint ? "Remove breakpoint" : "Mark as breakpoint"}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-warm)",
                  cursor: "pointer",
                  fontSize: 13,
                  lineHeight: 1,
                  padding: "1px 3px",
                  borderRadius: 3,
                }}
              >
                ✦
              </button>
              <button
                onClick={handleDelete}
                title="Delete step"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 13,
                  lineHeight: 1,
                  padding: "1px 3px",
                  borderRadius: 3,
                }}
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Activity pills layer (Layer 2) */}
        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            width: "100%",
            position: "relative",
          }}
        >
          {linkedJTDs.map((j) => (
            <JTDPill
              key={j.id}
              label={j.description}
              type={j.type}
              onRemove={() => handleUnlink(j.type, j.id)}
            />
          ))}

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              style={{
                background: "none",
                border: "1px dashed var(--bg-border)",
                borderRadius: 12,
                padding: "2px 8px",
                cursor: "pointer",
                fontSize: 10,
                fontFamily: "var(--font-ui)",
                color: "var(--text-muted)",
              }}
            >
              ＋ Link
            </button>
            {pickerOpen && (
              <JTDPicker
                activities={activities}
                cognitiveLoadItems={cognitiveLoadItems}
                linkedIds={linkedIds}
                onPick={handleLinkPick}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Connector arrow */}
      {!isLast && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 72,
            paddingInline: 4,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: step.is_breakpoint ? 18 : 14,
              color: step.is_breakpoint
                ? "var(--accent-warm)"
                : "var(--text-muted)",
            }}
          >
            {step.is_breakpoint ? "✦" : "▶"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Insert button (appears between steps on hover) ───────────────────────────

function InsertBtn({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 72,
        paddingInline: 2,
      }}
    >
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Insert step here"
        style={{
          background: hovered ? "var(--bg-elevated)" : "none",
          border: "1px dashed var(--bg-border)",
          borderRadius: 4,
          width: 20,
          height: 32,
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          transition: "background 0.1s ease",
        }}
      >
        ＋
      </button>
    </div>
  );
}

// ─── Cluster band (Layer 3) ───────────────────────────────────────────────────

function ScopeBand({
  scope,
  assignedStepIds,
  steps,
  colour,
  isAssignMode,
  onToggleStep,
}: {
  scope: AgentScope;
  assignedStepIds: Set<string>;
  steps: Phase[];
  colour: string;
  isAssignMode: boolean;
  onToggleStep: (stepId: string) => void;
}) {
  const assignedCount = steps.filter((s) => assignedStepIds.has(s.id)).length;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 4,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--font-ui)",
          color: colour,
          minWidth: 100,
          textAlign: "right",
          paddingRight: 8,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={scope.name}
      >
        {scope.name}
      </span>

      {steps.map((step) => {
        const assigned = assignedStepIds.has(step.id);
        return (
          <div
            key={step.id}
            onClick={() => isAssignMode && onToggleStep(step.id)}
            style={{
              minWidth: 140,
              height: 20,
              background: assigned ? `${colour}30` : "transparent",
              border: assigned ? `1px solid ${colour}80` : "1px solid transparent",
              borderRadius: 4,
              cursor: isAssignMode ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isAssignMode && (
              <div
                style={{
                  width: 12,
                  height: 12,
                  border: `1px solid ${colour}`,
                  borderRadius: 2,
                  background: assigned ? colour : "transparent",
                }}
              />
            )}
          </div>
        );
      })}

      <span
        style={{
          fontSize: 9,
          fontFamily: "var(--font-ui)",
          color: "var(--text-muted)",
          marginLeft: 4,
          whiteSpace: "nowrap",
        }}
      >
        {assignedCount} step{assignedCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ProcessVisualisationPanel({
  useCaseId,
}: {
  useCaseId: string;
}) {
  const {
    processFlow,
    setProcessFlow,
    activities,
    cognitiveLoadItems,
    agentScopes,
  } = useDiscoveryStore();

  const [assignModeClusterId, setAssignModeClusterId] = useState<string | null>(
    null
  );
  const pendingAssignments = useRef<Map<string, Set<string>>>(new Map());

  const steps = processFlow?.steps ?? [];
  const clusterSteps = processFlow?.cluster_steps ?? [];

  // ── Helpers ──────────────────────────────────────────────────────────────

  const jtdsForStep = (stepId: string): LinkedJTD[] => {
    const result: LinkedJTD[] = [];
    for (const j of activities) {
      if (j.process_phase_id === stepId) {
        result.push({ id: j.id, type: "lived", description: j.description });
      }
    }
    for (const j of cognitiveLoadItems) {
      if (j.process_phase_id === stepId) {
        result.push({ id: j.id, type: "cognitive", description: j.description });
      }
    }
    return result;
  };

  const assignedStepIdsForCluster = (clusterId: string): Set<string> =>
    new Set(
      clusterSteps
        .filter((cs) => cs.cluster_id === clusterId)
        .map((cs) => cs.process_step_id)
    );

  const getClusterColour = (index: number) =>
    CLUSTER_COLOURS[index % CLUSTER_COLOURS.length];

  // ── Step mutations ────────────────────────────────────────────────────────

  const handleStepUpdated = useCallback(
    (updated: Phase) => {
      if (!processFlow) return;
      setProcessFlow({
        ...processFlow,
        steps: processFlow.steps.map((s) =>
          s.id === updated.id ? updated : s
        ),
      });
    },
    [processFlow, setProcessFlow]
  );

  const handleStepDeleted = useCallback(
    (deletedId: string) => {
      if (!processFlow) return;
      setProcessFlow({
        ...processFlow,
        steps: processFlow.steps.filter((s) => s.id !== deletedId),
        cluster_steps: processFlow.cluster_steps.filter(
          (cs) => cs.process_step_id !== deletedId
        ),
      });
    },
    [processFlow, setProcessFlow]
  );

  const { updateActivity: storeUpdateActivity, updateCognitiveLoad: storeUpdateCognitiveLoad } = useDiscoveryStore();

  const handleJTDLinked = useCallback(
    (type: "lived" | "cognitive", jtdId: string) => {
      // Store already has the item — we need to update process_phase_id
      // The API call was already made in the StepNode; just refresh the store entry
      if (type === "lived") {
        const item = activities.find((j) => j.id === jtdId);
        if (item) storeUpdateActivity({ ...item, process_phase_id: jtdId });
      } else {
        const item = cognitiveLoadItems.find((j) => j.id === jtdId);
        if (item) storeUpdateCognitiveLoad({ ...item, process_phase_id: jtdId });
      }
    },
    [activities, cognitiveLoadItems, storeUpdateActivity, storeUpdateCognitiveLoad]
  );

  const handleJTDUnlinked = useCallback(
    (type: "lived" | "cognitive", jtdId: string) => {
      if (type === "lived") {
        const item = activities.find((j) => j.id === jtdId);
        if (item) storeUpdateActivity({ ...item, process_phase_id: null });
      } else {
        const item = cognitiveLoadItems.find((j) => j.id === jtdId);
        if (item) storeUpdateCognitiveLoad({ ...item, process_phase_id: null });
      }
    },
    [activities, cognitiveLoadItems, storeUpdateActivity, storeUpdateCognitiveLoad]
  );

  // ── Add step ──────────────────────────────────────────────────────────────

  const handleAddStep = useCallback(
    async (afterOrder?: number) => {
      const nextOrder =
        afterOrder !== undefined
          ? afterOrder + 1
          : steps.length > 0
          ? steps[steps.length - 1].sequence_order + 1
          : 0;
      const created = await discoveryApi.createStep(useCaseId, {
        name: `Step ${nextOrder + 1}`,
        sequence_order: nextOrder,
      });
      if (!processFlow) {
        setProcessFlow({
          use_case_id: useCaseId,
          steps: [created],
          cluster_steps: [],
        });
      } else {
        // Insert at right position and renumber subsequent steps if needed
        const newSteps = [...processFlow.steps, created].sort(
          (a, b) => a.sequence_order - b.sequence_order
        );
        setProcessFlow({ ...processFlow, steps: newSteps });
      }
    },
    [useCaseId, steps, processFlow, setProcessFlow]
  );

  // ── Cluster assignment ────────────────────────────────────────────────────

  const enterAssignMode = (clusterId: string) => {
    const current = assignedStepIdsForCluster(clusterId);
    pendingAssignments.current.set(clusterId, new Set(current));
    setAssignModeClusterId(clusterId);
  };

  const toggleStepInPending = (stepId: string) => {
    if (!assignModeClusterId) return;
    const pending = pendingAssignments.current.get(assignModeClusterId);
    if (!pending) return;
    if (pending.has(stepId)) pending.delete(stepId);
    else pending.add(stepId);
    // Force re-render
    pendingAssignments.current = new Map(pendingAssignments.current);
    setAssignModeClusterId(assignModeClusterId);
  };

  const commitAssignments = useCallback(async () => {
    if (!assignModeClusterId || !processFlow) return;
    const pending =
      pendingAssignments.current.get(assignModeClusterId) ?? new Set<string>();
    const current = assignedStepIdsForCluster(assignModeClusterId);

    const toAdd = [...pending].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !pending.has(id));

    const newClusterSteps = [...processFlow.cluster_steps];

    for (const stepId of toAdd) {
      const cs = await discoveryApi.assignStepToScope(
        useCaseId,
        assignModeClusterId,
        stepId
      );
      newClusterSteps.push(cs);
    }
    for (const stepId of toRemove) {
      await discoveryApi.removeStepFromScope(
        useCaseId,
        assignModeClusterId,
        stepId
      );
    }

    const filteredSteps = newClusterSteps.filter(
      (cs) =>
        !(cs.cluster_id === assignModeClusterId && toRemove.includes(cs.process_step_id))
    );

    setProcessFlow({ ...processFlow, cluster_steps: filteredSteps });
    setAssignModeClusterId(null);
  }, [assignModeClusterId, processFlow, useCaseId, setProcessFlow]);

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (steps.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontFamily: "var(--font-body)",
            color: "var(--text-muted)",
          }}
        >
          No process steps yet.
        </p>
        <button
          onClick={() => handleAddStep()}
          style={{
            background: "var(--accent-primary)",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            color: "#fff",
            fontSize: 13,
            fontFamily: "var(--font-ui)",
            cursor: "pointer",
          }}
        >
          ＋ Add First Step
        </button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const currentAssignSet = assignModeClusterId
    ? (pendingAssignments.current.get(assignModeClusterId) ??
        assignedStepIdsForCluster(assignModeClusterId))
    : null;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid var(--bg-border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => handleAddStep()}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--bg-border)",
            borderRadius: 6,
            padding: "5px 12px",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontFamily: "var(--font-ui)",
            cursor: "pointer",
          }}
        >
          ＋ Add Step
        </button>

        {assignModeClusterId && (
          <>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-ui)",
                color: "var(--text-secondary)",
              }}
            >
              Assigning:{" "}
              <strong>
                {agentScopes.find((c) => c.id === assignModeClusterId)
                  ?.name ?? "Scope"}
              </strong>
            </span>
            <button
              onClick={commitAssignments}
              style={{
                background: "var(--accent-success)",
                border: "none",
                borderRadius: 6,
                padding: "5px 12px",
                color: "#000",
                fontSize: 12,
                fontFamily: "var(--font-ui)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Done
            </button>
            <button
              onClick={() => setAssignModeClusterId(null)}
              style={{
                background: "none",
                border: "1px solid var(--bg-border)",
                borderRadius: 6,
                padding: "5px 10px",
                color: "var(--text-muted)",
                fontSize: 12,
                fontFamily: "var(--font-ui)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {/* Layer 3 — cluster bands */}
        {agentScopes.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-ui)",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              Scope Assignments
            </div>
            {agentScopes.map((scope, idx) => {
              const colour = getClusterColour(idx);
              const assigned =
                assignModeClusterId === scope.id && currentAssignSet
                  ? currentAssignSet
                  : assignedStepIdsForCluster(scope.id);

              return (
                <div
                  key={scope.id}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <ScopeBand
                    scope={scope}
                    assignedStepIds={assigned}
                    steps={steps}
                    colour={colour}
                    isAssignMode={assignModeClusterId === scope.id}
                    onToggleStep={toggleStepInPending}
                  />
                  {assignModeClusterId !== scope.id && (
                    <button
                      onClick={() => enterAssignMode(scope.id)}
                      style={{
                        background: "none",
                        border: "1px solid var(--bg-border)",
                        borderRadius: 4,
                        padding: "2px 8px",
                        cursor: "pointer",
                        fontSize: 10,
                        fontFamily: "var(--font-ui)",
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      Assign
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Layer 1 + 2 — steps row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 0,
            flexWrap: "nowrap",
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          {steps.map((step, idx) => (
            <div key={step.id} style={{ display: "flex", alignItems: "flex-start" }}>
              {/* Insert before this step */}
              {idx > 0 && (
                <InsertBtn
                  onClick={() =>
                    handleAddStep(steps[idx - 1].sequence_order)
                  }
                />
              )}

              <StepNode
                step={step}
                linkedJTDs={jtdsForStep(step.id)}
                activities={activities}
                cognitiveLoadItems={cognitiveLoadItems}
                isLast={idx === steps.length - 1}
                useCaseId={useCaseId}
                onUpdated={handleStepUpdated}
                onDeleted={handleStepDeleted}
                onJTDLinked={handleJTDLinked}
                onJTDUnlinked={handleJTDUnlinked}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
