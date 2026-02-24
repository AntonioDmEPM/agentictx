import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { InputChannel, InputChannelType } from "@/types/agentic_design";
import { InlineEditableText } from "./InlineEditableText";

const CHANNEL_ICONS: Record<InputChannelType, string> = {
  voice: "🎤",
  form: "📄",
  system_event: "⚡",
  agent_handoff: "↩",
};

interface InputChannelNodeData {
  channel: InputChannel;
  viewMode: "architecture" | "token_economics";
  onEdit?: (patch: Partial<InputChannel>) => void;
}

export function InputChannelNode({ data }: { data: InputChannelNodeData }) {
  const { channel, onEdit } = data;
  const [hovered, setHovered] = useState(false);
  const icon = CHANNEL_ICONS[channel.type as InputChannelType] ?? "◈";

  return (
    <>
      <Handle type="source" position={Position.Right} style={{ background: "var(--accent-primary)" }} />

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 160,
          minHeight: 60,
          borderRadius: 6,
          background: "var(--bg-elevated)",
          border: "1px solid var(--bg-border)",
          borderLeft: "2px solid var(--accent-primary)",
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
          <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
          <InlineEditableText
            value={channel.name}
            onCommit={(v) => onEdit?.({ name: v })}
            disabled={!onEdit}
            style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}
          />
        </div>

        {/* Token load — always visible, always editable */}
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <InlineEditableText
            value={channel.estimated_tokens_per_call ?? 0}
            onCommit={(v) => onEdit?.({ estimated_tokens_per_call: Number(v) || 0 })}
            disabled={!onEdit}
            numeric
            style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-secondary)" }}
          />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--text-secondary)" }}>t / call</span>
        </div>
      </div>
    </>
  );
}
