import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { OutputChannel, OutputChannelType } from "@/types/agentic_design";
import { InlineEditableText } from "./InlineEditableText";

const OUTPUT_ICONS: Record<OutputChannelType, string> = {
  system_write: "💾",
  text_response: "💬",
  agent_handoff: "→",
  audit_log: "📋",
};

interface OutputChannelNodeData {
  channel: OutputChannel;
  viewMode: "architecture" | "token_economics";
  onEdit?: (patch: Partial<OutputChannel>) => void;
}

export function OutputChannelNode({ data }: { data: OutputChannelNodeData }) {
  const { channel, viewMode, onEdit } = data;
  const [hovered, setHovered] = useState(false);
  const icon = OUTPUT_ICONS[channel.type as OutputChannelType] ?? "◈";

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ background: "var(--accent-success)" }} />

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 180,
          minHeight: 70,
          borderRadius: 6,
          background: "var(--bg-elevated)",
          border: "1px solid var(--bg-border)",
          borderBottom: "2px solid var(--accent-success)",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
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

        {/* Icon + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
          <InlineEditableText
            value={channel.name}
            onCommit={(v) => onEdit?.({ name: v })}
            disabled={!onEdit}
            style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-primary)", fontWeight: 500 }}
          />
        </div>

        {/* Destination */}
        {channel.destination !== undefined && (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <span>→</span>
            <InlineEditableText
              value={channel.destination ?? ""}
              onCommit={(v) => onEdit?.({ destination: v })}
              disabled={!onEdit}
              style={{ fontSize: 10, color: "var(--text-muted)" }}
            />
          </div>
        )}

        {/* Token economics */}
        {viewMode === "token_economics" && (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              color: "var(--text-secondary)",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <InlineEditableText
                value={channel.estimated_tokens ?? 0}
                onCommit={(v) => onEdit?.({ estimated_tokens: Number(v) || 0 })}
                disabled={!onEdit}
                numeric
                style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-secondary)" }}
              />
              <span>t</span>
            </div>
            {channel.latency_requirement_ms != null && (
              <span style={{ color: "var(--accent-amber)" }}>{channel.latency_requirement_ms}ms</span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
