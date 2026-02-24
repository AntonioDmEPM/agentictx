import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { Tool, ToolStatus } from "@/types/agentic_design";
import { InlineEditableText } from "./InlineEditableText";

const STATUS_COLORS: Record<ToolStatus, string> = {
  existing: "var(--tool-existing)",
  new: "var(--tool-new)",
  pending: "var(--tool-pending)",
  blocked: "var(--tool-blocked)",
};

interface ToolNodeData {
  tool: Tool;
  viewMode: "architecture" | "token_economics";
  onEdit?: (patch: Partial<Tool>) => void;
}

export function ToolNode({ data }: { data: ToolNodeData }) {
  const { tool, viewMode, onEdit } = data;
  const [hovered, setHovered] = useState(false);
  const statusColor = STATUS_COLORS[tool.status as ToolStatus] ?? "var(--tool-existing)";

  return (
    <>
      <Handle type="target" position={Position.Left}  style={{ background: statusColor }} />
      <Handle type="source" position={Position.Right} style={{ background: statusColor }} />

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 200,
          minHeight: 90,
          borderRadius: 6,
          background: "var(--bg-elevated)",
          border: "1px solid var(--bg-border)",
          borderLeft: `3px solid ${statusColor}`,
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          position: "relative",
          boxShadow: hovered ? "0 0 0 2px rgba(79, 127, 255, 0.3)" : undefined,
          transition: "box-shadow 0.15s ease",
        }}
      >
        {/* Edit hint */}
        {hovered && (
          <span style={{ position: "absolute", top: 4, right: 5, fontSize: 9, color: "var(--text-muted)", pointerEvents: "none", lineHeight: 1 }}>
            ✎
          </span>
        )}

        {/* Node prefix + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 9,
              color: statusColor,
              fontWeight: 700,
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            {tool.node_prefix}:
          </span>
          <InlineEditableText
            value={tool.name}
            onCommit={(v) => onEdit?.({ name: v })}
            disabled={!onEdit}
            style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-primary)", fontWeight: 500 }}
          />
        </div>

        {/* Build effort — always visible per spec */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 9, color: "var(--text-muted)" }}>effort:</span>
          <InlineEditableText
            value={tool.build_effort ?? "—"}
            onCommit={(v) => onEdit?.({ build_effort: v === "—" ? undefined : v })}
            disabled={!onEdit}
            style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: statusColor, fontWeight: 600 }}
          />
        </div>

        {/* Token economics — shown in token_economics view, fields editable */}
        {viewMode === "token_economics" && (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              color: "var(--text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span>↓</span>
              <InlineEditableText
                value={tool.input_tokens_per_call ?? 0}
                onCommit={(v) => onEdit?.({ input_tokens_per_call: Number(v) || 0 })}
                disabled={!onEdit}
                numeric
                style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-secondary)" }}
              />
              <span>t  ↑</span>
              <InlineEditableText
                value={tool.output_tokens_per_call ?? 0}
                onCommit={(v) => onEdit?.({ output_tokens_per_call: Number(v) || 0 })}
                disabled={!onEdit}
                numeric
                style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-secondary)" }}
              />
              <span>t</span>
            </div>
            <span style={{ color: "var(--accent-success)" }}>{tool.output_cache_hit_pct ?? 0}% output cached</span>
          </div>
        )}
      </div>
    </>
  );
}
