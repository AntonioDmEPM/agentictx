import { useState } from "react";
import type { CognitiveJTD, DelegationCluster, JTDStatus, LivedJTD, SuitabilityScores } from "@/types/discovery";

// ─── Shared card wrapper ──────────────────────────────────────────────────────

interface CardShellProps {
  accentColor: string;
  borderColor: string;
  children: React.ReactNode;
}

function CardShell({ accentColor, borderColor, children }: CardShellProps) {
  return (
    <div
      className="group relative rounded-sm border bg-bg-surface transition-all duration-150 overflow-hidden"
      style={{
        borderColor,
        borderLeftWidth: "3px",
        borderLeftColor: accentColor,
      }}
    >
      {children}
    </div>
  );
}

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: JTDStatus | "scored" }) {
  const map: Record<string, { label: string; color: string }> = {
    proposed: { label: "Proposed", color: "var(--accent-amber)" },
    confirmed: { label: "Confirmed", color: "var(--accent-success)" },
    rejected: { label: "Rejected", color: "var(--text-muted)" },
    scored: { label: "Scored", color: "var(--accent-primary)" },
  };
  const { label, color } = map[status] ?? map.proposed;
  return (
    <span
      className="text-xs font-ui px-1.5 py-0.5 rounded-sm"
      style={{ color, border: `1px solid ${color}`, opacity: 0.85 }}
    >
      {label}
    </span>
  );
}

// ─── Load score dot ───────────────────────────────────────────────────────────

function LoadDot({ score, accentColor }: { score: number | null; accentColor: string }) {
  if (score === null) return null;
  return (
    <span className="flex items-center gap-1 text-xs font-ui" style={{ color: "var(--text-secondary)" }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: i < score ? accentColor : "var(--bg-border)" }}
        />
      ))}
    </span>
  );
}

// ─── Inline rename input ──────────────────────────────────────────────────────

function InlineRename({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(value);
  return (
    <textarea
      className="w-full bg-bg-elevated text-text-primary text-sm font-body border border-bg-border rounded-sm px-2 py-1 resize-none focus:outline-none focus:border-accent-primary"
      rows={3}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (text.trim()) onSave(text.trim());
        }
        if (e.key === "Escape") onCancel();
      }}
      autoFocus
    />
  );
}

// ─── Lived JTD Card ───────────────────────────────────────────────────────────

interface LivedJTDCardProps {
  jtd: LivedJTD;
  onConfirm: () => void;
  onReject: () => void;
  onRename: (description: string) => void;
}

export function LivedJTDCard({ jtd, onConfirm, onReject, onRename }: LivedJTDCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <CardShell
      accentColor="var(--jtd-lived)"
      borderColor="var(--bg-border)"
    >
      <div className="px-3 py-2.5 flex flex-col gap-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <StatusChip status={jtd.status} />
          <LoadDot score={jtd.cognitive_load_score} accentColor="var(--jtd-lived)" />
        </div>

        {/* Description */}
        {editing ? (
          <InlineRename
            value={jtd.description}
            onSave={(v) => { onRename(v); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <p
            className="text-sm text-text-primary font-body leading-snug cursor-text"
            onDoubleClick={() => setEditing(true)}
          >
            {jtd.description}
          </p>
        )}

        {/* System context */}
        {jtd.system_context && (
          <p className="text-xs text-text-muted font-ui">{jtd.system_context}</p>
        )}

        {/* Actions */}
        {jtd.status === "proposed" && !editing && (
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={onConfirm}
              className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
              style={{
                color: "var(--accent-success)",
                borderColor: "var(--accent-success)",
              }}
            >
              Confirm
            </button>
            <button
              onClick={onReject}
              className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
              style={{ color: "var(--text-muted)", borderColor: "var(--bg-border)" }}
            >
              Reject
            </button>
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors ml-auto"
              style={{ color: "var(--text-secondary)", borderColor: "var(--bg-border)" }}
            >
              Rename
            </button>
          </div>
        )}
      </div>
    </CardShell>
  );
}

// ─── Cognitive JTD Card ───────────────────────────────────────────────────────

interface CognitiveJTDCardProps {
  jtd: CognitiveJTD;
  onConfirm: () => void;
  onReject: () => void;
  onRename: (description: string) => void;
}

export function CognitiveJTDCard({ jtd, onConfirm, onReject, onRename }: CognitiveJTDCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <CardShell
      accentColor="var(--jtd-cognitive)"
      borderColor="var(--bg-border)"
    >
      <div className="px-3 py-2.5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <StatusChip status={jtd.status} />
          <LoadDot score={jtd.load_intensity} accentColor="var(--jtd-cognitive)" />
        </div>

        {editing ? (
          <InlineRename
            value={jtd.description}
            onSave={(v) => { onRename(v); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <p
            className="text-sm text-text-primary font-body leading-snug cursor-text"
            onDoubleClick={() => setEditing(true)}
          >
            {jtd.description}
          </p>
        )}

        {jtd.cognitive_zone && (
          <p className="text-xs text-text-muted font-ui">{jtd.cognitive_zone}</p>
        )}

        {jtd.status === "proposed" && !editing && (
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={onConfirm}
              className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
              style={{
                color: "var(--accent-success)",
                borderColor: "var(--accent-success)",
              }}
            >
              Confirm
            </button>
            <button
              onClick={onReject}
              className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
              style={{ color: "var(--text-muted)", borderColor: "var(--bg-border)" }}
            >
              Reject
            </button>
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors ml-auto"
              style={{ color: "var(--text-secondary)", borderColor: "var(--bg-border)" }}
            >
              Rename
            </button>
          </div>
        )}
      </div>
    </CardShell>
  );
}

// ─── Suitability Score Bar ─────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<keyof SuitabilityScores, string> = {
  cognitive_load_intensity: "Cognitive Load",
  input_data_structure: "Input Structure",
  actionability_tool_coverage: "Tool Coverage",
  decision_determinism: "Determinism",
  risk_compliance_sensitivity: "Compliance Risk",
  context_complexity: "Context Complexity",
  exception_rate: "Exception Rate",
  turn_taking_complexity: "Turn Complexity",
  latency_constraints: "Latency",
};

function SuitabilityBar({ scores }: { scores: SuitabilityScores }) {
  const avg =
    Object.values(scores).reduce((a, b) => a + b, 0) /
    Object.values(scores).length;

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-ui text-text-secondary">Suitability</span>
        <span className="text-xs font-ui" style={{ color: "var(--jtd-cluster)" }}>
          {avg.toFixed(1)}/3
        </span>
      </div>
      {(Object.entries(scores) as [keyof SuitabilityScores, number][]).map(
        ([dim, score]) => (
          <div key={dim} className="flex items-center gap-2">
            <span className="text-xs font-ui text-text-muted w-24 shrink-0 truncate">
              {DIMENSION_LABELS[dim]}
            </span>
            <div className="flex-1 h-1 rounded-full bg-bg-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(score / 3) * 100}%`,
                  background:
                    score >= 2
                      ? "var(--accent-success)"
                      : score === 1
                      ? "var(--accent-amber)"
                      : "var(--accent-warm)",
                }}
              />
            </div>
            <span className="text-xs font-ui text-text-muted w-3 text-right">{score}</span>
          </div>
        )
      )}
    </div>
  );
}

// ─── Delegation Cluster Card ──────────────────────────────────────────────────

interface DelegationClusterCardProps {
  cluster: DelegationCluster;
  onConfirm: () => void;
  onScore: () => void;
  isScoring?: boolean;
}

export function DelegationClusterCard({
  cluster,
  onConfirm,
  onScore,
  isScoring = false,
}: DelegationClusterCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <CardShell
      accentColor="var(--jtd-cluster)"
      borderColor="var(--bg-border)"
    >
      <div className="px-3 py-2.5 flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <StatusChip status={cluster.status} />
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-ui text-text-muted hover:text-text-secondary"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>

        {/* Name */}
        <p className="text-sm font-medium text-text-primary font-body">{cluster.name}</p>

        {/* Purpose */}
        {cluster.purpose && (
          <p className="text-xs text-text-secondary font-body leading-snug">
            {cluster.purpose}
          </p>
        )}

        {/* Cognitive JTD count */}
        <p className="text-xs font-ui text-text-muted">
          {cluster.cognitive_jtd_ids.length} Cognitive JTD
          {cluster.cognitive_jtd_ids.length !== 1 ? "s" : ""}
          {cluster.lived_jtd_ids?.length
            ? ` · ${cluster.lived_jtd_ids.length} Lived JTD${cluster.lived_jtd_ids.length !== 1 ? "s" : ""}`
            : ""}
        </p>

        {/* Suitability scores (if scored) */}
        {expanded && cluster.suitability_scores && (
          <SuitabilityBar scores={cluster.suitability_scores} />
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-0.5">
          {cluster.status === "proposed" && (
            <button
              onClick={onConfirm}
              className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
              style={{
                color: "var(--accent-success)",
                borderColor: "var(--accent-success)",
              }}
            >
              Confirm
            </button>
          )}
          {cluster.status !== "scored" && (
            <button
              onClick={onScore}
              disabled={isScoring}
              className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
              style={{
                color: "var(--jtd-cluster)",
                borderColor: "var(--jtd-cluster)",
                opacity: isScoring ? 0.5 : 1,
              }}
            >
              {isScoring ? "Scoring…" : "Score"}
            </button>
          )}
        </div>
      </div>
    </CardShell>
  );
}
