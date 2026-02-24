/**
 * Deterministic layout function for the Agent Architecture Diagram.
 *
 * Zone layout (all coordinates are left-edge / top-edge):
 *
 *   [Prompt nodes ── top row, centred, min 12px gap, no overlap]
 *                ↓ blue edges (jtd-cognitive)
 *   [Input left] → [Agent centre] → [Tool L1] → [System L2]
 *    green edges     green edges    amber edges   amber edges
 *                ↓ green edges
 *   [Output nodes ── bottom row, centred, min 12px gap]
 *
 * Height calculation drives every Y so there is never overlap:
 *   mainRowH = max(AGENT_H, inputColH, toolColH)
 *   toolColH accounts for each T's S-node group height, not just TOOL_H.
 *   S nodes for each T are vertically centred on that T's centre Y.
 */
import { MarkerType } from "@xyflow/react";
import type { Node, Edge } from "@xyflow/react";
import type {
  AgentSpecification,
  AutonomyLevel,
  ConnectedSystem,
  InputChannel,
  OutputChannel,
  Tool,
} from "@/types/agentic_design";

export type ViewMode = "architecture" | "token_economics";

/** Callback invoked whenever a node's inline edit commits. */
export type OnNodeEdit = (specPatch: Partial<AgentSpecification>) => void;

// ─── Node dimensions ──────────────────────────────────────────────────────────

const AGENT_W  = 280, AGENT_H  = 140;
const INPUT_W  = 160, INPUT_H  = 60;
const PROMPT_W = 180, PROMPT_H = 70;
const TOOL_W   = 200, TOOL_H   = 90;
const SYS_W    = 160, SYS_H    = 50;
const OUTPUT_W = 180, OUTPUT_H = 70;

// ─── Spacing ──────────────────────────────────────────────────────────────────

const H_GAP          = 80;   // horizontal gap between zone columns
const V_GAP          = 30;   // vertical gap between nodes in same column
const SYS_V_GAP      = 16;   // vertical gap between S nodes of the same T
const PROMPT_H_GAP   = 12;   // minimum horizontal gap between prompt nodes
const OUTPUT_H_GAP   = 12;   // minimum horizontal gap between output nodes
const PROMPT_TOP     = 30;   // canvas top padding for prompt row
const PROMPT_TO_MAIN = 60;   // prompt row bottom → main row top
const MAIN_TO_OUTPUT = 60;   // main row bottom → output row top

// ─── Zone X positions (left edges) ───────────────────────────────────────────

const INPUT_X = 60;
const AGENT_X = INPUT_X + INPUT_W + H_GAP;   // 300
const TOOL_X  = AGENT_X + AGENT_W + H_GAP;   // 660
const SYS_X   = TOOL_X  + TOOL_W  + H_GAP;   // 940

// Horizontal centre of the main content area — used to centre prompt + output rows
const CONTENT_CENTER_X = (INPUT_X + SYS_X + SYS_W) / 2; // 580

// ─── Edge styles by connection type ──────────────────────────────────────────

const IO_STYLE     = { stroke: "var(--accent-success)", strokeWidth: 2 };
const IO_ARROW     = { type: MarkerType.ArrowClosed, color: "var(--accent-success)", width: 12, height: 12 };

const PROMPT_STYLE = { stroke: "var(--jtd-cognitive)", strokeWidth: 2 };
const PROMPT_ARROW = { type: MarkerType.ArrowClosed, color: "var(--jtd-cognitive)", width: 12, height: 12 };

const TOOL_STYLE   = { stroke: "var(--accent-amber)", strokeWidth: 2 };
const TOOL_ARROW   = { type: MarkerType.ArrowClosed, color: "var(--accent-amber)", width: 12, height: 12 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolvePos(
  nodeId: string,
  defaultX: number,
  defaultY: number,
  saved?: Record<string, { x: number; y: number }>
): { x: number; y: number } {
  return saved?.[nodeId] ?? { x: defaultX, y: defaultY };
}

/**
 * Distribute `count` items of width `itemW` with at least `minGap` between
 * them, centred at `centreX`.  Returns the left-edge X of each item.
 */
function spreadCentred(
  count: number,
  itemW: number,
  minGap: number,
  centreX: number
): number[] {
  if (count === 0) return [];
  const spacing  = itemW + minGap;
  const groupW   = count * itemW + (count - 1) * minGap;
  const startX   = centreX - groupW / 2;
  return Array.from({ length: count }, (_, i) => startX + i * spacing);
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function buildDiagramLayout(
  spec: AgentSpecification,
  viewMode: ViewMode,
  savedPositions?: Record<string, { x: number; y: number }>,
  onEdit?: OnNodeEdit
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const agentId = `agent-${spec.id}`;
  const pr      = spec.prompt_requirements ?? {};
  const inputs  = spec.input_channels  ?? [];
  const tools   = spec.tool_stack       ?? [];
  const outputs = spec.output_channels  ?? [];

  // ── 1. Count prompt nodes ────────────────────────────────────────────────

  let promptCount = 0;
  if (pr.system_prompt)                 promptCount++;
  promptCount += (pr.dynamic_context ?? []).length;
  if (pr.few_shot_examples)             promptCount++;
  promptCount += (pr.guardrails ?? []).length;

  // ── 2. Measure column heights ─────────────────────────────────────────────

  // Input column
  const inputColH = inputs.length > 0
    ? inputs.length * INPUT_H + (inputs.length - 1) * V_GAP
    : 0;

  // Tool column — each group's effective height = max(TOOL_H, its S-node stack height)
  // This prevents S nodes from one T overlapping with the next T group.
  const toolGroups: Array<{ effectiveH: number; centerOffset: number }> = [];
  let toolColH = 0;

  for (let ti = 0; ti < tools.length; ti++) {
    const sCount     = (tools[ti].connected_systems ?? []).length;
    const sStackH    = sCount > 0 ? sCount * SYS_H + (sCount - 1) * SYS_V_GAP : 0;
    const effectiveH = Math.max(TOOL_H, sStackH);

    // centerOffset = distance from the top of the tool column to this group's centre
    toolGroups.push({ effectiveH, centerOffset: toolColH + effectiveH / 2 });
    toolColH += effectiveH + (ti < tools.length - 1 ? V_GAP : 0);
  }

  // ── 3. Derive Y anchors ───────────────────────────────────────────────────

  const mainRowH   = Math.max(AGENT_H, inputColH, toolColH, 1);
  const mainRowTop = PROMPT_TOP + (promptCount > 0 ? PROMPT_H + PROMPT_TO_MAIN : 0);
  const outputTop  = mainRowTop + mainRowH + MAIN_TO_OUTPUT;

  // ── 4. Agent node ─────────────────────────────────────────────────────────

  const agentY = mainRowTop + (mainRowH - AGENT_H) / 2;
  nodes.push({
    id: agentId,
    type: "agentNode",
    position: resolvePos(agentId, AGENT_X, agentY, savedPositions),
    width: AGENT_W,
    height: AGENT_H,
    draggable: true,
    data: {
      spec,
      viewMode,
      onEdit: onEdit
        ? (patch: { model?: string; autonomy_level?: AutonomyLevel }) => onEdit(patch)
        : undefined,
    },
  });

  // ── 5. Prompt component nodes (top row, centred) ──────────────────────────

  if (promptCount > 0) {
    const promptXs = spreadCentred(promptCount, PROMPT_W, PROMPT_H_GAP, CONTENT_CENTER_X);
    let col = 0;

    const addPromptNode = (
      id: string,
      label: string,
      tokens: number,
      cacheHitPct: number,
      editFn?: (patch: { label?: string; tokens?: number; cacheHitPct?: number }) => void
    ) => {
      nodes.push({
        id,
        type: "promptComponentNode",
        position: resolvePos(id, promptXs[col], PROMPT_TOP, savedPositions),
        width: PROMPT_W,
        height: PROMPT_H,
        draggable: true,
        data: { label, tokens, cacheHitPct, viewMode, onEdit: editFn },
      });
      edges.push({
        id: `e-${id}-agent`,
        source: id,
        target: agentId,
        targetHandle: "top-in",
        type: "smoothstep",
        markerEnd: PROMPT_ARROW,
        style: PROMPT_STYLE,
        label: viewMode === "token_economics" ? `${tokens}t` : undefined,
      });
      col++;
    };

    if (pr.system_prompt) {
      const sp = pr.system_prompt;
      addPromptNode(
        "prompt-system",
        "System Prompt",
        sp.estimated_tokens ?? 0,
        sp.cache_hit_pct ?? 95,
        onEdit
          ? (patch) =>
              onEdit({
                prompt_requirements: {
                  ...spec.prompt_requirements,
                  system_prompt: {
                    ...sp,
                    ...(patch.tokens     !== undefined && { estimated_tokens: patch.tokens }),
                    ...(patch.cacheHitPct !== undefined && { cache_hit_pct: patch.cacheHitPct }),
                  },
                },
              })
          : undefined
      );
    }

    for (let i = 0; i < (pr.dynamic_context ?? []).length; i++) {
      const dc = pr.dynamic_context![i];
      addPromptNode(
        `prompt-dynamic-${i}`,
        dc.name || "Dynamic Context",
        dc.estimated_tokens_per_call ?? 0,
        dc.cache_hit_pct ?? 15,
        onEdit
          ? (patch) => {
              const dc2 = [...(pr.dynamic_context ?? [])];
              dc2[i] = {
                ...dc2[i],
                ...(patch.label      !== undefined && { name: patch.label }),
                ...(patch.tokens     !== undefined && { estimated_tokens_per_call: patch.tokens }),
                ...(patch.cacheHitPct !== undefined && { cache_hit_pct: patch.cacheHitPct }),
              };
              onEdit({ prompt_requirements: { ...spec.prompt_requirements, dynamic_context: dc2 } });
            }
          : undefined
      );
    }

    if (pr.few_shot_examples) {
      const fs = pr.few_shot_examples;
      addPromptNode(
        "prompt-fewshot",
        "Few-Shot Examples",
        fs.estimated_tokens ?? 0,
        fs.cache_hit_pct ?? 90,
        onEdit
          ? (patch) =>
              onEdit({
                prompt_requirements: {
                  ...spec.prompt_requirements,
                  few_shot_examples: {
                    ...fs,
                    ...(patch.tokens      !== undefined && { estimated_tokens: patch.tokens }),
                    ...(patch.cacheHitPct !== undefined && { cache_hit_pct: patch.cacheHitPct }),
                  },
                },
              })
          : undefined
      );
    }

    for (let i = 0; i < (pr.guardrails ?? []).length; i++) {
      const g = pr.guardrails![i];
      addPromptNode(
        `prompt-guardrail-${i}`,
        `Guardrail: ${g.type ?? ""}`,
        g.estimated_tokens ?? 0,
        g.cache_hit_pct ?? 95,
        onEdit
          ? (patch) => {
              const g2 = [...(pr.guardrails ?? [])];
              g2[i] = {
                ...g2[i],
                ...(patch.tokens      !== undefined && { estimated_tokens: patch.tokens }),
                ...(patch.cacheHitPct !== undefined && { cache_hit_pct: patch.cacheHitPct }),
              };
              onEdit({ prompt_requirements: { ...spec.prompt_requirements, guardrails: g2 } });
            }
          : undefined
      );
    }
  }

  // ── 6. Input channel nodes (left, centred in main row) ────────────────────

  const inputGroupTop = mainRowTop + (mainRowH - inputColH) / 2;

  inputs.forEach((channel: InputChannel, i: number) => {
    const id = `input-${i}`;
    const iy = inputGroupTop + i * (INPUT_H + V_GAP);
    nodes.push({
      id,
      type: "inputChannelNode",
      position: resolvePos(id, INPUT_X, iy, savedPositions),
      width: INPUT_W,
      height: INPUT_H,
      draggable: true,
      data: {
        channel,
        viewMode,
        onEdit: onEdit
          ? (patch: Partial<InputChannel>) =>
              onEdit({ input_channels: inputs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) })
          : undefined,
      },
    });
    edges.push({
      id: `e-${id}-agent`,
      source: id,
      target: agentId,
      targetHandle: "left-in",
      type: "smoothstep",
      markerEnd: IO_ARROW,
      style: IO_STYLE,
      label: viewMode === "token_economics" ? `${channel.estimated_tokens_per_call ?? 0}t` : undefined,
    });
  });

  // ── 7. Tool nodes (L1) + System nodes (L2, centred on their T) ───────────

  const toolGroupStart = mainRowTop + (mainRowH - toolColH) / 2;

  tools.forEach((tool: Tool, ti: number) => {
    const g           = toolGroups[ti];
    const toolCenterY = toolGroupStart + g.centerOffset;
    const toolTopY    = toolCenterY - TOOL_H / 2;
    const toolId      = `tool-${ti}`;

    nodes.push({
      id: toolId,
      type: "toolNode",
      position: resolvePos(toolId, TOOL_X, toolTopY, savedPositions),
      width: TOOL_W,
      height: TOOL_H,
      draggable: true,
      data: {
        tool,
        viewMode,
        onEdit: onEdit
          ? (patch: Partial<Tool>) =>
              onEdit({ tool_stack: tools.map((t, idx) => (idx === ti ? { ...t, ...patch } : t)) })
          : undefined,
      },
    });
    edges.push({
      id: `e-agent-${toolId}`,
      source: agentId,
      sourceHandle: "right-out",
      target: toolId,
      type: "smoothstep",
      markerEnd: TOOL_ARROW,
      style: TOOL_STYLE,
      label:
        viewMode === "token_economics"
          ? `↓${tool.input_tokens_per_call ?? 0} ↑${tool.output_tokens_per_call ?? 0}`
          : undefined,
    });

    // S nodes — centred on T's vertical centre
    const connected = tool.connected_systems ?? [];
    const sStackH   = connected.length > 0
      ? connected.length * SYS_H + (connected.length - 1) * SYS_V_GAP
      : 0;
    const sGroupTop = toolCenterY - sStackH / 2;

    connected.forEach((sys, si) => {
      const sysId = `system-${ti}-${si}`;
      const sysY  = sGroupTop + si * (SYS_H + SYS_V_GAP);
      nodes.push({
        id: sysId,
        type: "systemNode",
        position: resolvePos(sysId, SYS_X, sysY, savedPositions),
        width: SYS_W,
        height: SYS_H,
        draggable: true,
        data: {
          system: sys,
          viewMode,
          onEdit: onEdit
            ? (patch: Partial<ConnectedSystem>) => {
                const newTools = tools.map((t, idx) => {
                  if (idx !== ti) return t;
                  return {
                    ...t,
                    connected_systems: (t.connected_systems ?? []).map((s, sidx) =>
                      sidx === si ? { ...s, ...patch } : s
                    ),
                  };
                });
                onEdit({ tool_stack: newTools });
              }
            : undefined,
        },
      });
      edges.push({
        id: `e-${toolId}-${sysId}`,
        source: toolId,
        target: sysId,
        type: "smoothstep",
        markerEnd: TOOL_ARROW,
        style: TOOL_STYLE,
      });
    });
  });

  // ── 8. Output channel nodes (bottom row, centred) ─────────────────────────

  const outputXs = spreadCentred(outputs.length, OUTPUT_W, OUTPUT_H_GAP, CONTENT_CENTER_X);

  outputs.forEach((channel: OutputChannel, i: number) => {
    const id = `output-${i}`;
    nodes.push({
      id,
      type: "outputChannelNode",
      position: resolvePos(id, outputXs[i], outputTop, savedPositions),
      width: OUTPUT_W,
      height: OUTPUT_H,
      draggable: true,
      data: {
        channel,
        viewMode,
        onEdit: onEdit
          ? (patch: Partial<OutputChannel>) =>
              onEdit({ output_channels: outputs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) })
          : undefined,
      },
    });
    edges.push({
      id: `e-agent-${id}`,
      source: agentId,
      sourceHandle: "bottom-out",
      target: id,
      type: "smoothstep",
      markerEnd: IO_ARROW,
      style: IO_STYLE,
      label:
        viewMode === "token_economics" && (channel.estimated_tokens ?? 0) > 0
          ? `${channel.estimated_tokens}t`
          : undefined,
    });
  });

  return { nodes, edges };
}
