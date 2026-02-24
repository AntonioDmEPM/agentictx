import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { InlineEditableText } from "./InlineEditableText";

interface PromptComponentNodeData {
  label: string;
  tokens: number;
  cacheHitPct: number;
  viewMode: "architecture" | "token_economics";
  onEdit?: (patch: { label?: string; tokens?: number; cacheHitPct?: number }) => void;
}

export function PromptComponentNode({ data }: { data: PromptComponentNodeData }) {
  const { label, tokens, cacheHitPct, onEdit } = data;
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <Handle type="source" position={Position.Bottom} style={{ background: "var(--jtd-cognitive)" }} />

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 180,
          minHeight: 70,
          borderRadius: 6,
          background: "var(--bg-elevated)",
          border: "1px solid var(--bg-border)",
          borderTop: "2px solid var(--jtd-cognitive)",
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

        {/* Label — editable for dynamic_context nodes */}
        <InlineEditableText
          value={label}
          onCommit={(v) => onEdit?.({ label: v })}
          disabled={!onEdit}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 9,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        />

        {/* Token count */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <InlineEditableText
            value={tokens}
            onCommit={(v) => onEdit?.({ tokens: Number(v) || 0 })}
            disabled={!onEdit}
            numeric
            style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-secondary)" }}
          />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-secondary)" }}>t</span>
        </div>

        {/* Cache hit % — always visible, always editable */}
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <InlineEditableText
            value={cacheHitPct}
            onCommit={(v) => onEdit?.({ cacheHitPct: Math.min(100, Math.max(0, Number(v) || 0)) })}
            disabled={!onEdit}
            numeric
            style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--accent-success)" }}
          />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, color: "var(--accent-success)" }}>% cached</span>
        </div>
      </div>
    </>
  );
}
