import { useState, useRef, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import type { AgentSpecification, AutonomyLevel } from "@/types/agentic_design";
import { InlineEditableText } from "./InlineEditableText";

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTONOMY_COLORS: Record<AutonomyLevel, string> = {
  full_delegation: "var(--accent-success)",
  supervised_execution: "var(--accent-amber)",
  assisted_mode: "var(--accent-primary)",
};

const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  full_delegation: "Full Delegation",
  supervised_execution: "Supervised Execution",
  assisted_mode: "Assisted Mode",
};

const AUTONOMY_OPTIONS: { value: AutonomyLevel; label: string }[] = [
  { value: "full_delegation", label: "Full Delegation" },
  { value: "supervised_execution", label: "Supervised Execution" },
  { value: "assisted_mode", label: "Assisted Mode" },
];

// ─── Maturity dot ─────────────────────────────────────────────────────────────

function MaturityDot({ score }: { score: number | null }) {
  const color =
    score === null
      ? "var(--text-muted)"
      : score >= 70
        ? "var(--accent-success)"
        : score >= 40
          ? "var(--accent-amber)"
          : "var(--accent-warm)";
  return (
    <div
      title={score !== null ? `Maturity: ${score}/100` : "Maturity: not assessed"}
      style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }}
    />
  );
}

// ─── Inline select field (for autonomy_level) ─────────────────────────────────

function InlineSelectField({
  value,
  options,
  onCommit,
  disabled,
  labelStyle,
}: {
  value: string;
  options: { value: string; label: string }[];
  onCommit: (v: string) => void;
  disabled?: boolean;
  labelStyle?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <select
        ref={selectRef}
        value={value}
        onChange={(e) => { onCommit(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") setEditing(false); }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          background: "var(--bg-surface)",
          border: "1px solid var(--accent-primary)",
          borderRadius: 3,
          padding: "1px 4px",
          outline: "none",
          cursor: "pointer",
          color: "var(--text-primary)",
          width: "100%",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      onDoubleClick={(e) => { if (disabled) return; e.stopPropagation(); setEditing(true); }}
      title={disabled ? undefined : "Double-click to change"}
      style={{ cursor: disabled ? "default" : "text", ...labelStyle }}
    >
      {options.find((o) => o.value === value)?.label ?? value}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AgentNodeData {
  spec: AgentSpecification;
  viewMode: "architecture" | "token_economics";
  onEdit?: (patch: { model?: string; autonomy_level?: AutonomyLevel }) => void;
}

export function AgentNode({ data }: { data: AgentNodeData }) {
  const { spec, onEdit } = data;
  const [hovered, setHovered] = useState(false);

  const autonomyColor = spec.autonomy_level
    ? (AUTONOMY_COLORS[spec.autonomy_level as AutonomyLevel] ?? "var(--text-secondary)")
    : "var(--text-secondary)";
  const autonomyLabel = spec.autonomy_level
    ? (AUTONOMY_LABELS[spec.autonomy_level as AutonomyLevel] ?? spec.autonomy_level)
    : null;

  return (
    <>
      <Handle type="target" position={Position.Left}   id="left-in"   style={{ background: "var(--jtd-agent)" }} />
      <Handle type="target" position={Position.Top}    id="top-in"    style={{ background: "var(--jtd-agent)" }} />
      <Handle type="source" position={Position.Right}  id="right-out" style={{ background: "var(--jtd-agent)" }} />
      <Handle type="source" position={Position.Bottom} id="bottom-out" style={{ background: "var(--jtd-agent)" }} />

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 280,
          minHeight: 140,
          borderRadius: 8,
          border: "2px solid var(--jtd-agent)",
          background: "var(--bg-elevated)",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          position: "relative",
          boxShadow: hovered ? "0 0 0 3px rgba(79, 127, 255, 0.3)" : undefined,
          transition: "box-shadow 0.15s ease",
        }}
      >
        {/* Edit hint — top-left */}
        {hovered && (
          <span style={{ position: "absolute", top: 6, left: 8, fontSize: 9, color: "var(--text-muted)", pointerEvents: "none", lineHeight: 1 }}>
            ✎
          </span>
        )}

        {/* Maturity dot — top right */}
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <MaturityDot score={spec.maturity_score} />
        </div>

        {/* Agent name */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            color: "var(--text-primary)",
            textAlign: "center",
            paddingRight: 16,
            lineHeight: 1.2,
          }}
        >
          {spec.name}
        </div>

        {/* Model badge — editable */}
        {spec.model && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--text-secondary)",
                background: "var(--bg-surface)",
                border: "1px solid var(--bg-border)",
                borderRadius: 4,
                padding: "2px 8px",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <InlineEditableText
                value={spec.model}
                onCommit={(v) => onEdit?.({ model: v })}
                disabled={!onEdit}
                style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-secondary)" }}
                inputStyle={{ minWidth: 110, fontSize: 11, color: "var(--text-secondary)" }}
              />
            </span>
          </div>
        )}

        {/* Autonomy badge — editable via double-click → select */}
        {autonomyLabel && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                color: autonomyColor,
                border: `1px solid ${autonomyColor}`,
                borderRadius: 4,
                padding: "2px 8px",
                opacity: 0.9,
                display: "inline-flex",
                alignItems: "center",
                minWidth: 130,
                justifyContent: "center",
              }}
            >
              <InlineSelectField
                value={spec.autonomy_level ?? ""}
                options={AUTONOMY_OPTIONS}
                onCommit={(v) => onEdit?.({ autonomy_level: v as AutonomyLevel })}
                disabled={!onEdit}
                labelStyle={{ color: autonomyColor, fontFamily: "var(--font-ui)", fontSize: 10 }}
              />
            </span>
          </div>
        )}
      </div>
    </>
  );
}
