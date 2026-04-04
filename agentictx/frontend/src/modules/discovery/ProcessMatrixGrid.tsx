import { useState, useMemo, useCallback, type DragEvent } from "react";
import { useDiscoveryStore } from "@/store/discoveryStore";
import { discoveryApi } from "@/api/discovery";
import type {
  Activity,
  AgentScope,
  CognitiveLoad,
  Phase,
  ScopePhaseLink,
} from "@/types/discovery";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ITEMS_COLLAPSED = 5;
const UNASSIGNED_KEY = "__unassigned__";

const TINT_LOW = "rgba(90, 138, 106, 0.20)";
const TINT_MED = "rgba(176, 115, 64, 0.20)";
const TINT_HIGH = "rgba(196, 93, 62, 0.22)";
const DROP_HIGHLIGHT = "rgba(74, 111, 165, 0.15)";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maxScore(items: Array<{ score: number | null }>): number {
  let max = 0;
  for (const item of items) {
    if (item.score !== null && item.score > max) max = item.score;
  }
  return max;
}

function cellTint(score: number): string {
  if (score >= 3) return TINT_HIGH;
  if (score >= 2) return TINT_MED;
  if (score >= 1) return TINT_LOW;
  return "transparent";
}

type CellKey = string;

interface CellItem {
  id: string;
  description: string;
  score: number | null;
  jtdType: "lived" | "cognitive";
}

type Layer = "cognitive" | "lived";

// ─── Drag data ────────────────────────────────────────────────────────────────

interface DragPayload {
  jtdId: string;
  jtdType: "lived" | "cognitive";
}

const DRAG_MIME = "application/x-activity-assign";

// ─── Build cell lookup ────────────────────────────────────────────────────────

function buildCellMap(
  steps: Phase[],
  activities: Activity[],
  cognitiveLoadItems: CognitiveLoad[]
): Map<CellKey, CellItem[]> {
  const confirmedActivities = activities.filter((j) => j.status === "confirmed");
  const confirmedCognitive = cognitiveLoadItems.filter((j) => j.status === "confirmed");

  const cellMap = new Map<CellKey, CellItem[]>();

  const stepIds = new Set(steps.map((s) => s.id));
  for (const stepId of stepIds) {
    cellMap.set(`${stepId}-cognitive`, []);
    cellMap.set(`${stepId}-lived`, []);
  }
  cellMap.set(`${UNASSIGNED_KEY}-cognitive`, []);
  cellMap.set(`${UNASSIGNED_KEY}-lived`, []);

  for (const act of confirmedActivities) {
    const phaseId = act.process_phase_id;
    const key: CellKey = phaseId && stepIds.has(phaseId)
      ? `${phaseId}-lived`
      : `${UNASSIGNED_KEY}-lived`;
    cellMap.get(key)!.push({
      id: act.id,
      description: act.description,
      score: null,
      jtdType: "lived",
    });
  }

  for (const clItem of confirmedCognitive) {
    const phaseId = clItem.process_phase_id;
    const key: CellKey = phaseId && stepIds.has(phaseId)
      ? `${phaseId}-cognitive`
      : `${UNASSIGNED_KEY}-cognitive`;
    cellMap.get(key)!.push({
      id: clItem.id,
      description: clItem.description,
      score: clItem.load_intensity,
      jtdType: "cognitive",
    });
  }

  return cellMap;
}

// ─── Build cluster spans ──────────────────────────────────────────────────────

interface ScopeBand {
  scope: AgentScope;
  startCol: number;
  spanCols: number;
}

function buildScopeBands(
  scopes: AgentScope[],
  scopePhaseLinks: ScopePhaseLink[],
  orderedStepIds: string[]
): ScopeBand[] {
  const stepIndexMap = new Map(orderedStepIds.map((id, i) => [id, i]));
  const bands: ScopeBand[] = [];

  for (const scope of scopes) {
    if (scope.status === "replaced") continue;

    const stepIdsForScope = scopePhaseLinks
      .filter((cs) => cs.cluster_id === scope.id)
      .map((cs) => cs.process_step_id);

    const indices = stepIdsForScope
      .map((id) => stepIndexMap.get(id))
      .filter((i): i is number => i !== undefined);

    if (indices.length === 0) continue;

    const min = Math.min(...indices);
    const max = Math.max(...indices);
    bands.push({ scope, startCol: min, spanCols: max - min + 1 });
  }

  return bands.sort((a, b) => a.startCol - b.startCol);
}

// ─── Draggable Item ───────────────────────────────────────────────────────────

function DraggableItem({
  item,
  expanded,
}: {
  item: CellItem;
  expanded: boolean;
}) {
  const onDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      const payload: DragPayload = { jtdId: item.id, jtdType: item.jtdType };
      e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "move";
    },
    [item.id, item.jtdType]
  );

  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{
        fontSize: 12,
        fontFamily: "var(--font-body)",
        color: "var(--text-primary)",
        lineHeight: 1.5,
        display: "-webkit-box",
        WebkitLineClamp: expanded ? undefined : 1,
        WebkitBoxOrient: "vertical",
        overflow: expanded ? undefined : "hidden",
        marginBottom: 2,
        cursor: "grab",
        borderRadius: 3,
        padding: "1px 2px",
      }}
      title={`${item.description}\n\nDrag to assign to a phase`}
    >
      <span style={{ color: "var(--text-muted)", marginRight: 4 }}>•</span>
      {item.description}
    </div>
  );
}

// ─── Cell Components ──────────────────────────────────────────────────────────

function UnassignedCell({
  cellKey,
  items,
  expanded,
  onToggle,
  onUnassign,
}: {
  cellKey: CellKey;
  items: CellItem[];
  expanded: boolean;
  onToggle: (key: CellKey) => void;
  onUnassign: (payload: DragPayload) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const raw = e.dataTransfer.getData(DRAG_MIME);
      if (!raw) return;
      try {
        const payload: DragPayload = JSON.parse(raw);
        onUnassign(payload);
      } catch { /* ignore malformed */ }
    },
    [onUnassign]
  );

  const isEmpty = items.length === 0;
  const bg = dragOver ? DROP_HIGHLIGHT : isEmpty ? "transparent" : cellTint(maxScore(items));
  const visibleItems = expanded ? items : items.slice(0, MAX_ITEMS_COLLAPSED);
  const overflow = !expanded && items.length > MAX_ITEMS_COLLAPSED;

  return (
    <div
      onClick={isEmpty ? undefined : () => onToggle(cellKey)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        padding: "8px 10px",
        background: bg,
        cursor: isEmpty ? "default" : "pointer",
        transition: "background 0.15s ease",
        minHeight: 48,
        outline: dragOver ? "2px dashed var(--accent-primary)" : undefined,
        outlineOffset: -2,
        borderRadius: dragOver ? 4 : undefined,
      }}
    >
      {isEmpty && !dragOver && (
        <div style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-ui)" }}>—</div>
      )}
      {visibleItems.map((item) => (
        <DraggableItem key={item.id} item={item} expanded={expanded} />
      ))}
      {overflow && (
        <div style={{ fontSize: 11, fontFamily: "var(--font-ui)", color: "var(--text-muted)", marginTop: 2 }}>
          +{items.length - MAX_ITEMS_COLLAPSED} more
        </div>
      )}
      {dragOver && isEmpty && (
        <div style={{ fontSize: 11, fontFamily: "var(--font-ui)", color: "var(--accent-primary)" }}>
          Drop to unassign
        </div>
      )}
    </div>
  );
}

function PhaseCell({
  cellKey,
  stepId,
  layer,
  items,
  expanded,
  onToggle,
  onDrop,
}: {
  cellKey: CellKey;
  stepId: string;
  layer: Layer;
  items: CellItem[];
  expanded: boolean;
  onToggle: (key: CellKey) => void;
  onDrop: (stepId: string, payload: DragPayload) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (e.dataTransfer.types.includes(DRAG_MIME)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }
    },
    []
  );

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const raw = e.dataTransfer.getData(DRAG_MIME);
      if (!raw) return;
      try {
        const payload: DragPayload = JSON.parse(raw);
        // Only accept drops matching this layer
        if (payload.jtdType === layer) {
          onDrop(stepId, payload);
        }
      } catch {
        // ignore malformed
      }
    },
    [stepId, layer, onDrop]
  );

  const isEmpty = items.length === 0;
  const bg = dragOver ? DROP_HIGHLIGHT : isEmpty ? "transparent" : cellTint(maxScore(items));

  if (isEmpty && !dragOver) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ padding: "8px 10px", color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-ui)", minHeight: 48 }}
      >
        —
      </div>
    );
  }

  const visibleItems = expanded ? items : items.slice(0, MAX_ITEMS_COLLAPSED);
  const overflow = !expanded && items.length > MAX_ITEMS_COLLAPSED;

  return (
    <div
      onClick={() => onToggle(cellKey)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        padding: "8px 10px",
        background: bg,
        cursor: "pointer",
        transition: "background 0.15s ease",
        minHeight: 48,
        outline: dragOver ? "2px dashed var(--accent-primary)" : undefined,
        outlineOffset: -2,
        borderRadius: dragOver ? 4 : undefined,
      }}
    >
      {visibleItems.map((item) => (
        <DraggableItem key={item.id} item={item} expanded={expanded} />
      ))}
      {overflow && (
        <div style={{ fontSize: 11, fontFamily: "var(--font-ui)", color: "var(--text-muted)", marginTop: 2 }}>
          +{items.length - MAX_ITEMS_COLLAPSED} more
        </div>
      )}
      {dragOver && isEmpty && (
        <div style={{ fontSize: 11, fontFamily: "var(--font-ui)", color: "var(--accent-primary)" }}>
          Drop to assign
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProcessMatrixGrid({ useCaseId }: { useCaseId: string }) {
  const { processFlow, activities, cognitiveLoadItems, agentScopes, updateActivity, updateCognitiveLoad } =
    useDiscoveryStore();

  const [expandedCell, setExpandedCell] = useState<CellKey | null>(null);

  const steps = useMemo(
    () =>
      processFlow
        ? [...processFlow.steps].sort((a, b) => a.sequence_order - b.sequence_order)
        : [],
    [processFlow]
  );

  const cellMap = useMemo(
    () => buildCellMap(steps, activities, cognitiveLoadItems),
    [steps, activities, cognitiveLoadItems]
  );

  const orderedStepIds = useMemo(() => steps.map((s) => s.id), [steps]);

  const scopeBands = useMemo(
    () =>
      buildScopeBands(
        agentScopes,
        processFlow?.cluster_steps ?? [],
        orderedStepIds
      ),
    [agentScopes, processFlow?.cluster_steps, orderedStepIds]
  );

  const hasUnassigned =
    (cellMap.get(`${UNASSIGNED_KEY}-cognitive`)?.length ?? 0) > 0 ||
    (cellMap.get(`${UNASSIGNED_KEY}-lived`)?.length ?? 0) > 0;

  const toggleCell = (key: CellKey) => {
    setExpandedCell((prev) => (prev === key ? null : key));
  };

  const handleDrop = useCallback(
    async (stepId: string, payload: DragPayload) => {
      try {
        if (payload.jtdType === "lived") {
          const updated = await discoveryApi.updateActivity(useCaseId, payload.jtdId, {
            process_phase_id: stepId,
          });
          updateActivity(updated);
        } else {
          const updated = await discoveryApi.updateCognitiveLoad(useCaseId, payload.jtdId, {
            process_phase_id: stepId,
          });
          updateCognitiveLoad(updated);
        }
      } catch (err) {
        console.error("[ProcessMatrixGrid] Failed to assign phase:", err);
      }
    },
    [useCaseId, updateActivity, updateCognitiveLoad]
  );

  const handleUnassign = useCallback(
    async (payload: DragPayload) => {
      try {
        if (payload.jtdType === "lived") {
          const updated = await discoveryApi.updateActivity(useCaseId, payload.jtdId, {
            process_phase_id: null,
          });
          updateActivity(updated);
        } else {
          const updated = await discoveryApi.updateCognitiveLoad(useCaseId, payload.jtdId, {
            process_phase_id: null,
          });
          updateCognitiveLoad(updated);
        }
      } catch (err) {
        console.error("[ProcessMatrixGrid] Failed to unassign:", err);
      }
    },
    [useCaseId, updateActivity, updateCognitiveLoad]
  );

  // ── No phases placeholder ─────────────────────────────────────────────────

  if (steps.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontFamily: "var(--font-body)",
            color: "var(--text-muted)",
            textAlign: "center",
            maxWidth: 440,
            lineHeight: 1.6,
          }}
        >
          No process phases established yet. Continue the Discovery conversation
          — the agent will identify phases as it maps the process.
        </p>
      </div>
    );
  }

  // ── Column definitions ────────────────────────────────────────────────────

  const colCount = steps.length + (hasUnassigned ? 1 : 0);
  const gridTemplateColumns = `140px repeat(${colCount}, minmax(140px, 1fr))`;

  const layers: { key: Layer; label: string; accent: string }[] = [
    { key: "cognitive", label: "Cognitive Load", accent: "var(--color-cognitive)" },
    { key: "lived", label: "Activities", accent: "var(--color-activity)" },
  ];

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "16px 20px" }}>
      {/* Grid table */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns,
          border: "1px solid var(--bg-border)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        {/* ── Header row ──────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "10px 12px",
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--bg-border)",
            borderRight: "1px solid var(--bg-border)",
          }}
        />

        {steps.map((step) => (
          <div
            key={step.id}
            style={{
              padding: "10px 12px",
              background: "var(--bg-surface)",
              borderBottom: "1px solid var(--bg-border)",
              borderRight: "1px solid var(--bg-border)",
              fontSize: 11,
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textAlign: "center",
            }}
            title={step.name}
          >
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {step.name}
            </div>
          </div>
        ))}

        {hasUnassigned && (
          <div
            style={{
              padding: "10px 12px",
              background: "var(--bg-surface)",
              borderBottom: "1px solid var(--bg-border)",
              fontSize: 11,
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            Unassigned
          </div>
        )}

        {/* ── Data rows ───────────────────────────────────────────────────── */}
        {layers.map((layer) => (
          <div key={`row-${layer.key}`} style={{ display: "contents" }}>
            {/* Row label */}
            <div
              style={{
                padding: "10px 12px",
                background: "var(--bg-surface)",
                borderBottom: "1px solid var(--bg-border)",
                borderRight: "1px solid var(--bg-border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 28,
                  borderRadius: 2,
                  background: layer.accent,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-ui)",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  lineHeight: 1.3,
                }}
              >
                {layer.label}
              </span>
            </div>

            {/* Phase cells — drop targets */}
            {steps.map((step) => {
              const cellKey: CellKey = `${step.id}-${layer.key}`;
              return (
                <div
                  key={cellKey}
                  style={{
                    borderBottom: "1px solid var(--bg-border)",
                    borderRight: "1px solid var(--bg-border)",
                    minHeight: 48,
                  }}
                >
                  <PhaseCell
                    cellKey={cellKey}
                    stepId={step.id}
                    layer={layer.key}
                    items={cellMap.get(cellKey) ?? []}
                    expanded={expandedCell === cellKey}
                    onToggle={toggleCell}
                    onDrop={handleDrop}
                  />
                </div>
              );
            })}

            {/* Unassigned cell — draggable items */}
            {hasUnassigned && (
              <div
                style={{
                  borderBottom: "1px solid var(--bg-border)",
                  minHeight: 48,
                }}
              >
                <UnassignedCell
                  cellKey={`${UNASSIGNED_KEY}-${layer.key}`}
                  items={cellMap.get(`${UNASSIGNED_KEY}-${layer.key}`) ?? []}
                  expanded={expandedCell === `${UNASSIGNED_KEY}-${layer.key}`}
                  onToggle={toggleCell}
                  onUnassign={handleUnassign}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Scope bands ────────────────────────────────────────────────── */}
      {scopeBands.length > 0 && (
        <div style={{ marginTop: 16 }}>
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
            Agent Scopes
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns,
              gap: 0,
            }}
          >
            {scopeBands.map((band) => (
              <div
                key={band.scope.id}
                style={{
                  gridColumnStart: band.startCol + 2,
                  gridColumnEnd: band.startCol + 2 + band.spanCols,
                  background: "rgba(90, 138, 106, 0.08)",
                  borderLeft: "3px solid var(--color-scope)",
                  borderRadius: 4,
                  padding: "6px 10px",
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-ui)",
                    fontWeight: 500,
                    color: "var(--color-scope)",
                  }}
                >
                  {band.scope.name}
                </span>
                {band.scope.delegation_mode && (
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-ui)",
                      color: "var(--text-muted)",
                      background: "var(--bg-elevated)",
                      padding: "1px 6px",
                      borderRadius: 3,
                    }}
                  >
                    {band.scope.delegation_mode}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
