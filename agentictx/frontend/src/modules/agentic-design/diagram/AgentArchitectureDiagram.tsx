/**
 * Agent Architecture Diagram — React Flow canvas, per-agent view.
 *
 * Features:
 * - Node dragging with position persistence (PATCH node_positions on drag stop)
 * - Multi-select: Ctrl/Cmd+click or Shift+drag to rubber-band select multiple nodes
 * - Snap guides: blue alignment lines appear during drag when a node aligns with
 *   another; snap delta applied in-place via onNodesChange intercept (no jitter)
 * - Alignment toolbar: align left/center/right/top/middle/bottom, distribute H/V
 * - Node detail panel: double-click any node → slide-in panel with full field editing
 * - Auto Layout: reset all nodes to computed overlap-free positions
 * - "Spec updated X mins ago" sync indicator in header
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type Node,
  type NodeChange,
  type NodePositionChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { AgentSpecification, AgentSpecificationUpdate } from "@/types/agentic_design";
import { agenticDesignApi } from "@/api/agentic_design";
import { buildDiagramLayout, type ViewMode } from "./buildDiagramLayout";
import { computeAutoLayout } from "./computeAutoLayout";
import { computeSnapGuides, type SnapLine } from "./snapGuides";
import { SnapGuidesOverlay } from "./SnapGuidesOverlay";
import { AlignmentToolbar, type AlignDir, type DistributeDir } from "./AlignmentToolbar";
import { AgentNode } from "./nodes/AgentNode";
import { InputChannelNode } from "./nodes/InputChannelNode";
import { PromptComponentNode } from "./nodes/PromptComponentNode";
import { ToolNode } from "./nodes/ToolNode";
import { SystemNode } from "./nodes/SystemNode";
import { OutputChannelNode } from "./nodes/OutputChannelNode";
import { DiagramLegend } from "./DiagramLegend";
import { TokenEconomicsSummary } from "./TokenEconomicsSummary";
import { NodeDetailPanel } from "./NodeDetailPanel";

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_TYPES: NodeTypes = {
  agentNode: AgentNode,
  inputChannelNode: InputChannelNode,
  promptComponentNode: PromptComponentNode,
  toolNode: ToolNode,
  systemNode: SystemNode,
  outputChannelNode: OutputChannelNode,
};

const POSITION_SAVE_DEBOUNCE_MS = 800;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasArchitectureData(spec: AgentSpecification): boolean {
  return (
    (spec.input_channels?.length ?? 0) > 0 ||
    (spec.tool_stack?.length ?? 0) > 0 ||
    (spec.output_channels?.length ?? 0) > 0
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

/** Measured or declared width of a node. */
function nw(n: Node): number {
  return n.measured?.width ?? (n.width as number | undefined) ?? 0;
}
/** Measured or declared height of a node. */
function nh(n: Node): number {
  return n.measured?.height ?? (n.height as number | undefined) ?? 0;
}

/** Type predicate: position change actively in-drag with a proposed position. */
function isActiveDrag(
  c: NodeChange<Node>
): c is NodePositionChange & { position: { x: number; y: number }; dragging: true } {
  if (c.type !== "position") return false;
  const pc = c as NodePositionChange;
  return pc.dragging === true && pc.position !== undefined;
}

// ─── Collapse button ──────────────────────────────────────────────────────────

function CollapseBtn({ onClick, dir }: { onClick: () => void; dir: "left" | "right" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "none",
        border: "none",
        padding: "2px 6px",
        cursor: "pointer",
        color: hovered ? "var(--text-secondary)" : "var(--text-muted)",
        fontSize: 14,
        lineHeight: 1,
        borderRadius: 3,
      }}
    >
      {dir === "left" ? "‹" : "›"}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AgentArchitectureDiagramProps {
  spec: AgentSpecification;
  useCaseId: string;
  onBack: () => void;
  onSpecUpdated: (spec: AgentSpecification) => void;
  onCollapse?: () => void;
}

export function AgentArchitectureDiagram({
  spec,
  useCaseId,
  onBack,
  onSpecUpdated,
  onCollapse,
}: AgentArchitectureDiagramProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("architecture");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [syncDisplay, setSyncDisplay] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [selectionCount, setSelectionCount] = useState(0);
  const [panelNodeId, setPanelNodeId] = useState<string | null>(null);

  // Track dragged positions without triggering re-renders on every pixel move
  const positionsRef = useRef<Record<string, { x: number; y: number }>>(
    spec.node_positions ?? {}
  );

  // Debounce timer ref for position saves
  const positionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref to latest spec so callbacks inside effects don't go stale
  const specRef = useRef(spec);
  useEffect(() => { specRef.current = spec; }, [spec]);

  // ── Sync display ticker ───────────────────────────────────────────────────
  useEffect(() => {
    if (!lastSavedAt) return;
    setSyncDisplay(formatRelativeTime(lastSavedAt));
    const interval = setInterval(() => {
      setSyncDisplay(formatRelativeTime(lastSavedAt));
    }, 30_000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  // ── Build initial layout ──────────────────────────────────────────────────
  const buildLayout = useCallback(
    (currentSpec: AgentSpecification, currentViewMode: ViewMode) => {
      return buildDiagramLayout(
        currentSpec,
        currentViewMode,
        positionsRef.current,
        // No inline onEdit — editing is handled by the NodeDetailPanel
        undefined
      );
    },
    []
  );

  // ── Panel save handler (panel edits → PATCH spec) ─────────────────────────
  const handleNodeEdit = useCallback(
    async (patch: Partial<AgentSpecification>) => {
      const current = specRef.current;
      const optimistic: AgentSpecification = { ...current, ...patch };
      onSpecUpdated(optimistic);

      try {
        setIsSaving(true);
        const saved = await agenticDesignApi.updateSpec(
          useCaseId,
          current.id,
          patch as AgentSpecificationUpdate
        );
        onSpecUpdated(saved);
        setLastSavedAt(new Date());
        setSyncDisplay("just now");
      } catch (err) {
        console.error("Failed to save spec field:", err);
        onSpecUpdated(current);
      } finally {
        setIsSaving(false);
      }
    },
    [useCaseId, onSpecUpdated]
  );

  // ── Node double-click → open detail panel ────────────────────────────────
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setPanelNodeId(node.id);
    },
    []
  );

  // ── Build nodes/edges (memoised by spec identity) ────────────────────────
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildLayout(spec, viewMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec.id]
  );

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  // Mirror nodes into a ref so callbacks can read latest state without stale closures
  const nodesRef = useRef<Node[]>(initialNodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // ── Re-sync nodes when spec fields change ─────────────────────────────────
  const prevSpecUpdatedAt = useRef(spec.updated_at);
  useEffect(() => {
    if (spec.updated_at === prevSpecUpdatedAt.current) return;
    prevSpecUpdatedAt.current = spec.updated_at;
    const { nodes: fresh, edges: freshEdges } = buildLayout(spec, viewMode);
    setNodes(fresh);
    setEdges(freshEdges);
  }, [spec, viewMode, buildLayout, setNodes, setEdges]);

  // ── Rebuild when viewMode toggles ─────────────────────────────────────────
  const prevViewMode = useRef(viewMode);
  useEffect(() => {
    if (viewMode === prevViewMode.current) return;
    prevViewMode.current = viewMode;
    const { nodes: fresh, edges: freshEdges } = buildLayout(spec, viewMode);
    setNodes(fresh);
    setEdges(freshEdges);
  }, [viewMode, spec, buildLayout, setNodes, setEdges]);

  // ── Position persistence ──────────────────────────────────────────────────
  const savePositions = useCallback(
    async (positions: Record<string, { x: number; y: number }>) => {
      try {
        setIsSaving(true);
        const saved = await agenticDesignApi.updateSpec(useCaseId, specRef.current.id, {
          node_positions: positions,
        });
        onSpecUpdated(saved);
        setLastSavedAt(new Date());
        setSyncDisplay("just now");
      } catch (err) {
        console.error("Failed to save node positions:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [useCaseId, onSpecUpdated]
  );

  // ── Snap-during-drag: intercept onNodesChange ─────────────────────────────
  //
  // React Flow computes drag positions as (startPosition + mouseOffset).
  // By modifying position changes BEFORE they hit state, the snapped position
  // becomes the canonical state each frame — no jitter, no position fight.
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      const dragChanges = changes.filter(isActiveDrag);

      if (dragChanges.length > 0) {
        // Build dragging nodes with their PROPOSED (current drag) positions
        const draggingNodes = dragChanges.flatMap(c => {
          const node = nodesRef.current.find(n => n.id === c.id);
          return node ? [{ ...node, position: c.position }] : [];
        });

        const { lines, snapDx, snapDy } = computeSnapGuides(
          draggingNodes,
          nodesRef.current
        );

        setSnapLines(lines);

        if (snapDx !== 0 || snapDy !== 0) {
          // Modify position changes in-place to include snap delta
          const modified = changes.map(c => {
            if (!isActiveDrag(c)) return c;
            return {
              ...c,
              position: {
                x: c.position.x + snapDx,
                y: c.position.y + snapDy,
              },
            };
          });
          onNodesChangeInternal(modified);
          return;
        }
      } else {
        // Check if a drag just ended (dragging: false on a position change)
        const dragEnded = changes.some(
          c => c.type === "position" && (c as NodePositionChange).dragging === false
        );
        if (dragEnded) setSnapLines([]);
      }

      onNodesChangeInternal(changes);
    },
    [onNodesChangeInternal]
  );

  // ── Drag stop: save all moved nodes' positions ────────────────────────────
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node, draggingNodes: Node[]) => {
      setSnapLines([]);

      // draggingNodes contains all nodes that moved (selected group or single)
      for (const n of draggingNodes) {
        positionsRef.current[n.id] = { x: n.position.x, y: n.position.y };
      }

      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
      positionSaveTimer.current = setTimeout(() => {
        savePositions({ ...positionsRef.current });
      }, POSITION_SAVE_DEBOUNCE_MS);
    },
    [savePositions]
  );

  // ── Auto Layout ───────────────────────────────────────────────────────────
  const handleAutoLayout = useCallback(async () => {
    if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
    const positions = computeAutoLayout(specRef.current);
    positionsRef.current = positions;
    const { nodes: fresh, edges: freshEdges } = buildDiagramLayout(
      specRef.current, viewMode, positions, undefined
    );
    setNodes(fresh);
    setEdges(freshEdges);
    try {
      setIsSaving(true);
      const saved = await agenticDesignApi.updateSpec(
        useCaseId, specRef.current.id, { node_positions: positions }
      );
      onSpecUpdated(saved);
      setLastSavedAt(new Date());
      setSyncDisplay("just now");
    } catch (err) {
      console.error("Failed to save auto layout:", err);
    } finally {
      setIsSaving(false);
    }
  }, [viewMode, useCaseId, onSpecUpdated, setNodes, setEdges]);

  // ── Alignment ─────────────────────────────────────────────────────────────
  const handleAlign = useCallback(
    (dir: AlignDir) => {
      const selected = nodesRef.current.filter(n => n.selected);
      if (selected.length < 2) return;

      const minLeft    = Math.min(...selected.map(n => n.position.x));
      const maxRight   = Math.max(...selected.map(n => n.position.x + nw(n)));
      const minTop     = Math.min(...selected.map(n => n.position.y));
      const maxBottom  = Math.max(...selected.map(n => n.position.y + nh(n)));
      const bboxCenterX = (minLeft  + maxRight)  / 2;
      const bboxCenterY = (minTop   + maxBottom) / 2;

      const newNodes = nodesRef.current.map(n => {
        if (!n.selected) return n;

        let newX = n.position.x;
        let newY = n.position.y;

        if (dir === "left")    newX = minLeft;
        if (dir === "centerX") newX = bboxCenterX - nw(n) / 2;
        if (dir === "right")   newX = maxRight - nw(n);
        if (dir === "top")     newY = minTop;
        if (dir === "centerY") newY = bboxCenterY - nh(n) / 2;
        if (dir === "bottom")  newY = maxBottom - nh(n);

        positionsRef.current[n.id] = { x: newX, y: newY };
        return { ...n, position: { x: newX, y: newY } };
      });

      setNodes(newNodes);
      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
      savePositions({ ...positionsRef.current });
    },
    [setNodes, savePositions]
  );

  // ── Distribution ──────────────────────────────────────────────────────────
  const handleDistribute = useCallback(
    (dir: DistributeDir) => {
      const selected = nodesRef.current.filter(n => n.selected);
      if (selected.length < 3) return;

      let newNodes: Node[];

      if (dir === "h") {
        const sorted = [...selected].sort((a, b) => a.position.x - b.position.x);
        const totalW = sorted.reduce((s, n) => s + nw(n), 0);
        const span   = sorted.at(-1)!.position.x + nw(sorted.at(-1)!) - sorted[0].position.x;
        const gap    = (span - totalW) / (sorted.length - 1);

        let x = sorted[0].position.x;
        const xMap: Record<string, number> = {};
        for (const n of sorted) { xMap[n.id] = x; x += nw(n) + gap; }

        newNodes = nodesRef.current.map(n => {
          if (!n.selected) return n;
          const newX = xMap[n.id] ?? n.position.x;
          positionsRef.current[n.id] = { x: newX, y: n.position.y };
          return { ...n, position: { x: newX, y: n.position.y } };
        });
      } else {
        const sorted = [...selected].sort((a, b) => a.position.y - b.position.y);
        const totalH = sorted.reduce((s, n) => s + nh(n), 0);
        const span   = sorted.at(-1)!.position.y + nh(sorted.at(-1)!) - sorted[0].position.y;
        const gap    = (span - totalH) / (sorted.length - 1);

        let y = sorted[0].position.y;
        const yMap: Record<string, number> = {};
        for (const n of sorted) { yMap[n.id] = y; y += nh(n) + gap; }

        newNodes = nodesRef.current.map(n => {
          if (!n.selected) return n;
          const newY = yMap[n.id] ?? n.position.y;
          positionsRef.current[n.id] = { x: n.position.x, y: newY };
          return { ...n, position: { x: n.position.x, y: newY } };
        });
      }

      setNodes(newNodes);
      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
      savePositions({ ...positionsRef.current });
    },
    [setNodes, savePositions]
  );

  const isEmpty = !hasArchitectureData(spec);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      {/* Header bar — fixed 44px height to align with adjacent panels */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 44,
          padding: "0 16px",
          borderBottom: "1px solid var(--bg-border)",
          flexShrink: 0,
          gap: 8,
        }}
      >
        {/* Left: back + sync indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button
            onClick={onBack}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "none",
              border: "1px solid var(--bg-border)",
              borderRadius: 4,
              padding: "4px 10px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ← Specs
          </button>

          {(lastSavedAt || isSaving) && (
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                color: isSaving ? "var(--accent-amber)" : "var(--text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {isSaving ? "Saving…" : `Spec updated ${syncDisplay}`}
            </span>
          )}
        </div>

        {/* Centre: agent name */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            color: "var(--text-primary)",
            flexShrink: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {spec.name}
        </div>

        {/* Right: toolbar group */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

          {/* Auto Layout */}
          <button
            onClick={handleAutoLayout}
            disabled={isSaving}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              color: "var(--text-muted)",
              background: "none",
              border: "1px solid var(--bg-border)",
              borderRadius: 4,
              padding: "4px 8px",
              cursor: isSaving ? "default" : "pointer",
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            Auto Layout
          </button>

          {/* Alignment + Distribution */}
          <AlignmentToolbar
            selectionCount={selectionCount}
            onAlign={handleAlign}
            onDistribute={handleDistribute}
          />

          {/* Architecture / Token Economics toggle */}
          <div
            style={{
              display: "flex",
              border: "1px solid var(--bg-border)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {(["architecture", "token_economics"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  padding: "4px 10px",
                  cursor: "pointer",
                  background: viewMode === mode ? "var(--accent-primary)" : "transparent",
                  color: viewMode === mode ? "white" : "var(--text-secondary)",
                  border: "none",
                  textTransform: "capitalize",
                }}
              >
                {mode === "architecture" ? "Architecture" : "Token Economics"}
              </button>
            ))}
          </div>

          {/* Collapse panel */}
          {onCollapse && <CollapseBtn onClick={onCollapse} dir="right" />}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", userSelect: "none" }}>
        {isEmpty ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: 32,
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                No architecture data yet.
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  maxWidth: 340,
                  lineHeight: 1.6,
                }}
              >
                The Agentic Design Agent will populate this diagram as you define the
                agent's integrations, input channels, tool stack, and output channels.
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={handleNodesChange}
            onNodeDragStop={handleNodeDragStop}
            onNodeDoubleClick={handleNodeDoubleClick}
            onSelectionChange={({ nodes: sel }) => setSelectionCount(sel.length)}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.25}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            onInit={(instance) => {
              setTimeout(() => instance.fitView({ padding: 0.15 }), 50);
            }}
            style={{ position: "absolute", inset: 0 }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="var(--bg-border)"
              gap={20}
              size={1}
            />
            <Controls position="bottom-left" />
            <SnapGuidesOverlay lines={snapLines} />
          </ReactFlow>
        )}

        {/* Legend — always visible */}
        <DiagramLegend />

        {/* Token economics summary */}
        {viewMode === "token_economics" && (
          <TokenEconomicsSummary spec={spec} />
        )}

        {/* Node detail panel — slide-in on double-click */}
        {panelNodeId !== null && (
          <NodeDetailPanel
            nodeId={panelNodeId}
            spec={spec}
            onSave={handleNodeEdit}
            onClose={() => setPanelNodeId(null)}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}
