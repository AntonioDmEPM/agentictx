import { useEffect, useRef, useState } from "react";
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

// ─── Three-dot menu ──────────────────────────────────────────────────────────

function ThreeDotMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-text-muted hover:text-text-secondary transition-colors"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
          padding: "2px 4px",
        }}
      >
        ···
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 rounded-sm border bg-bg-elevated shadow-lg"
          style={{ borderColor: "var(--bg-border)", minWidth: 100 }}
        >
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="block w-full text-left text-xs font-ui px-3 py-1.5 hover:bg-bg-surface transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            Edit
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="block w-full text-left text-xs font-ui px-3 py-1.5 hover:bg-bg-surface transition-colors"
            style={{ color: "var(--accent-warm)" }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Inline edit form (description + secondary field) ─────────────────────────

function InlineEditForm({
  description,
  secondaryLabel,
  secondaryValue,
  onSave,
  onCancel,
}: {
  description: string;
  secondaryLabel: string;
  secondaryValue: string;
  onSave: (desc: string, secondary: string) => void;
  onCancel: () => void;
}) {
  const [desc, setDesc] = useState(description);
  const [secondary, setSecondary] = useState(secondaryValue);

  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="w-full bg-bg-elevated text-text-primary text-sm font-body border border-bg-border rounded-sm px-2 py-1 resize-none focus:outline-none focus:border-accent-primary"
        rows={3}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      <input
        className="w-full bg-bg-elevated text-text-primary text-xs font-ui border border-bg-border rounded-sm px-2 py-1 focus:outline-none focus:border-accent-primary"
        value={secondary}
        onChange={(e) => setSecondary(e.target.value)}
        placeholder={secondaryLabel}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (desc.trim()) onSave(desc.trim(), secondary.trim());
          }
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => { if (desc.trim()) onSave(desc.trim(), secondary.trim()); }}
          className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
          style={{ color: "var(--accent-success)", borderColor: "var(--accent-success)" }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
          style={{ color: "var(--text-muted)", borderColor: "var(--bg-border)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Description with two-line clamp and tooltip ─────────────────────────────

function ClampedDescription({
  text,
  onDoubleClick,
}: {
  text: string;
  onDoubleClick: () => void;
}) {
  return (
    <p
      className="text-sm text-text-primary font-body leading-snug cursor-text"
      title={text}
      onDoubleClick={onDoubleClick}
      style={{
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {text}
    </p>
  );
}

// ─── Lived JTD Card ───────────────────────────────────────────────────────────

interface LivedJTDCardProps {
  jtd: LivedJTD;
  onConfirm: () => void;
  onReject: () => void;
  onUpdate: (description: string, systemContext: string) => void;
  onDelete: () => void;
}

export function LivedJTDCard({ jtd, onConfirm, onReject, onUpdate, onDelete }: LivedJTDCardProps) {
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
          <div className="flex items-center gap-1.5">
            <LoadDot score={jtd.cognitive_load_score} accentColor="var(--jtd-lived)" />
            <ThreeDotMenu onEdit={() => setEditing(true)} onDelete={onDelete} />
          </div>
        </div>

        {/* Description / Edit form */}
        {editing ? (
          <InlineEditForm
            description={jtd.description}
            secondaryLabel="System context (optional)"
            secondaryValue={jtd.system_context ?? ""}
            onSave={(desc, ctx) => { onUpdate(desc, ctx); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <ClampedDescription text={jtd.description} onDoubleClick={() => setEditing(true)} />
            {jtd.system_context && (
              <p className="text-xs text-text-muted font-ui">{jtd.system_context}</p>
            )}
          </>
        )}

        {/* Actions for proposed cards */}
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
  onUpdate: (description: string, cognitiveZone: string) => void;
  onDelete: () => void;
}

export function CognitiveJTDCard({ jtd, onConfirm, onReject, onUpdate, onDelete }: CognitiveJTDCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <CardShell
      accentColor="var(--jtd-cognitive)"
      borderColor="var(--bg-border)"
    >
      <div className="px-3 py-2.5 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <StatusChip status={jtd.status} />
          <div className="flex items-center gap-1.5">
            <LoadDot score={jtd.load_intensity} accentColor="var(--jtd-cognitive)" />
            <ThreeDotMenu onEdit={() => setEditing(true)} onDelete={onDelete} />
          </div>
        </div>

        {editing ? (
          <InlineEditForm
            description={jtd.description}
            secondaryLabel="Cognitive zone (optional)"
            secondaryValue={jtd.cognitive_zone ?? ""}
            onSave={(desc, zone) => { onUpdate(desc, zone); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <ClampedDescription text={jtd.description} onDoubleClick={() => setEditing(true)} />
            {jtd.cognitive_zone && (
              <p className="text-xs text-text-muted font-ui">{jtd.cognitive_zone}</p>
            )}
          </>
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
