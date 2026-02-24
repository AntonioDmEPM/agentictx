import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { ConnectedSystem, ToolStatus } from "@/types/agentic_design";
import { InlineEditableText } from "./InlineEditableText";

const STATUS_COLORS: Record<ToolStatus, string> = {
  existing: "var(--tool-existing)",
  new: "var(--tool-new)",
  pending: "var(--tool-pending)",
  blocked: "var(--tool-blocked)",
};

interface SystemNodeData {
  system: ConnectedSystem;
  viewMode: "architecture" | "token_economics";
  onEdit?: (patch: Partial<ConnectedSystem>) => void;
}

export function SystemNode({ data }: { data: SystemNodeData }) {
  const { system, onEdit } = data;
  const [hovered, setHovered] = useState(false);
  const statusColor = STATUS_COLORS[system.status as ToolStatus] ?? "var(--tool-existing)";

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: statusColor }} />

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 160,
          minHeight: 50,
          borderRadius: 6,
          background: "var(--bg-surface)",
          border: `1px solid ${statusColor}`,
          borderLeft: `3px solid ${statusColor}`,
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 3,
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

        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
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
            {system.node_prefix}:
          </span>
          <InlineEditableText
            value={system.name}
            onCommit={(v) => onEdit?.({ name: v })}
            disabled={!onEdit}
            style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-secondary)" }}
          />
        </div>
      </div>
    </>
  );
}
