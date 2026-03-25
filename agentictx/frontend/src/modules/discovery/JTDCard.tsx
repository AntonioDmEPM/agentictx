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

function StatusChip({ status }: { status: JTDStatus | "replaced" }) {
  const map: Record<string, { label: string; color: string }> = {
    proposed: { label: "Proposed", color: "var(--accent-amber)" },
    confirmed: { label: "Confirmed", color: "var(--accent-success)" },
    rejected: { label: "Rejected", color: "var(--text-muted)" },
    replaced: { label: "Replaced", color: "var(--text-muted)" },
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

// ─── Confirm / Reject action buttons ──────────────────────────────────────────

function ConfirmButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
      style={{
        color: "var(--accent-primary)",
        borderColor: "var(--accent-primary)",
      }}
    >
      Confirm
    </button>
  );
}

function UnconfirmButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
      style={{
        color: "var(--text-secondary)",
        borderColor: "var(--bg-border)",
      }}
    >
      Unconfirm
    </button>
  );
}

function RejectButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
      style={{
        color: "var(--accent-warm)",
        borderColor: "var(--accent-warm)",
      }}
    >
      Reject
    </button>
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
  onReinstate,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onReinstate?: () => void;
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
          {onReinstate ? (
            <button
              onClick={() => { setOpen(false); onReinstate(); }}
              className="block w-full text-left text-xs font-ui px-3 py-1.5 hover:bg-bg-surface transition-colors"
              style={{ color: "var(--accent-success)" }}
            >
              Reinstate
            </button>
          ) : (
            <>
              {onEdit && (
                <button
                  onClick={() => { setOpen(false); onEdit(); }}
                  className="block w-full text-left text-xs font-ui px-3 py-1.5 hover:bg-bg-surface transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => { setOpen(false); onDelete(); }}
                  className="block w-full text-left text-xs font-ui px-3 py-1.5 hover:bg-bg-surface transition-colors"
                  style={{ color: "var(--accent-warm)" }}
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Provenance indicator ────────────────────────────────────────────────────

function ProvenanceIndicator({
  sourceMessageId,
  isModified,
  onScrollToSource,
}: {
  sourceMessageId: string | null;
  isModified: boolean;
  onScrollToSource?: (messageId: string) => void;
}) {
  if (!sourceMessageId) return null;
  return (
    <button
      onClick={() => onScrollToSource?.(sourceMessageId)}
      className="group/prov flex items-center gap-1 text-xs font-ui transition-colors"
      style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      title="Click to view source message"
    >
      <svg
        className="group-hover/prov:text-text-secondary transition-colors"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="group-hover/prov:text-text-secondary transition-colors">view source</span>
      {isModified && (
        <span
          className="px-1 rounded-sm"
          style={{ background: "var(--bg-border)", color: "var(--accent-amber)", fontSize: 10 }}
        >
          modified
        </span>
      )}
    </button>
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

// ─── Compact pill (confirmed / rejected) ─────────────────────────────────────

function CompactPill({
  status,
  description,
  phaseName,
  dimmed,
  onExpand,
}: {
  status: "confirmed" | "rejected";
  description: string;
  phaseName?: string | null;
  dimmed?: boolean;
  onExpand: () => void;
}) {
  const isConfirmed = status === "confirmed";
  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded-sm border bg-bg-surface cursor-pointer transition-opacity duration-150 overflow-hidden"
      style={{
        borderColor: isConfirmed ? "var(--accent-success)" : "var(--bg-border)",
        borderLeftWidth: "3px",
        borderLeftColor: isConfirmed ? "var(--accent-success)" : "var(--text-muted)",
        opacity: dimmed ? 0.3 : isConfirmed ? 1 : 0.45,
      }}
      onClick={onExpand}
      title={description}
    >
      <span className="shrink-0 text-xs font-ui" style={{ color: isConfirmed ? "var(--accent-success)" : "var(--text-muted)" }}>
        {isConfirmed ? "✓" : "✗"}
      </span>
      <span className="flex-1 text-xs font-body truncate" style={{ color: isConfirmed ? "var(--text-secondary)" : "var(--text-muted)" }}>
        {description}
      </span>
      {phaseName && (
        <span className="shrink-0 text-xs font-ui text-text-muted truncate" style={{ maxWidth: "4rem" }}>
          {phaseName}
        </span>
      )}
    </div>
  );
}

// ─── Lived JTD Card ───────────────────────────────────────────────────────────

interface LivedJTDCardProps {
  jtd: LivedJTD;
  phaseName?: string | null;
  dimmed?: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onReinstate: () => void;
  onUpdate: (description: string, systemContext: string) => void;
  onDelete: () => void;
  onScrollToSource?: (messageId: string) => void;
}

export function LivedJTDCard({ jtd, phaseName, dimmed, onConfirm, onReject, onReinstate, onUpdate, onDelete, onScrollToSource }: LivedJTDCardProps) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isRejected = jtd.status === "rejected";
  const isCompact = (jtd.status === "confirmed" || isRejected) && !expanded;

  if (isCompact) {
    return (
      <CompactPill
        status={jtd.status as "confirmed" | "rejected"}
        description={jtd.description}
        phaseName={phaseName}
        dimmed={dimmed}
        onExpand={() => setExpanded(true)}
      />
    );
  }

  return (
    <CardShell
      accentColor={isRejected ? "var(--text-muted)" : "var(--jtd-lived)"}
      borderColor={jtd.status === "confirmed" ? "var(--accent-success)" : "var(--bg-border)"}
    >
      <div
        className="px-3 py-2.5 flex flex-col gap-2"
        style={{
          opacity: dimmed ? 0.3 : isRejected ? 0.45 : 1,
          pointerEvents: dimmed ? "none" : undefined,
          transition: "opacity 150ms ease",
        }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <StatusChip status={jtd.status} />
          <div className="flex items-center gap-1.5">
            <LoadDot score={null} accentColor="var(--jtd-lived)" />
            <button
              onClick={() => setExpanded(false)}
              className="text-xs font-ui text-text-muted hover:text-text-secondary transition-colors"
              title="Collapse"
            >
              ▲
            </button>
            {isRejected ? (
              <ThreeDotMenu onReinstate={onReinstate} />
            ) : (
              <ThreeDotMenu onEdit={() => setEditing(true)} onDelete={onDelete} />
            )}
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
            <ClampedDescription text={jtd.description} onDoubleClick={() => !isRejected && setEditing(true)} />
            {jtd.system_context && (
              <p className="text-xs text-text-muted font-ui">{jtd.system_context}</p>
            )}
            {phaseName && (
              <p className="text-xs font-ui" style={{ color: "var(--text-muted)" }}>{phaseName}</p>
            )}
          </>
        )}

        {/* Provenance indicator */}
        {!editing && (
          <ProvenanceIndicator
            sourceMessageId={jtd.source_message_id}
            isModified={jtd.is_modified}
            onScrollToSource={onScrollToSource}
          />
        )}

        {/* Actions — proposed: Confirm + Reject */}
        {jtd.status === "proposed" && !editing && (
          <div className="flex items-center gap-2 pt-0.5">
            <ConfirmButton onClick={onConfirm} />
            <RejectButton onClick={onReject} />
          </div>
        )}

        {/* Actions — confirmed: Unconfirm toggle */}
        {jtd.status === "confirmed" && !editing && (
          <div className="flex items-center gap-2 pt-0.5">
            <UnconfirmButton onClick={onReject} />
          </div>
        )}
      </div>
    </CardShell>
  );
}

// ─── Cognitive JTD Card ───────────────────────────────────────────────────────

interface CognitiveJTDCardProps {
  jtd: CognitiveJTD;
  phaseName?: string | null;
  dimmed?: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onReinstate: () => void;
  onUpdate: (description: string, cognitiveZone: string) => void;
  onDelete: () => void;
  onScrollToSource?: (messageId: string) => void;
}

export function CognitiveJTDCard({ jtd, phaseName, dimmed, onConfirm, onReject, onReinstate, onUpdate, onDelete, onScrollToSource }: CognitiveJTDCardProps) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isRejected = jtd.status === "rejected";
  const isCompact = (jtd.status === "confirmed" || isRejected) && !expanded;

  if (isCompact) {
    return (
      <CompactPill
        status={jtd.status as "confirmed" | "rejected"}
        description={jtd.description}
        phaseName={phaseName}
        dimmed={dimmed}
        onExpand={() => setExpanded(true)}
      />
    );
  }

  return (
    <CardShell
      accentColor={isRejected ? "var(--text-muted)" : "var(--jtd-cognitive)"}
      borderColor={jtd.status === "confirmed" ? "var(--accent-success)" : "var(--bg-border)"}
    >
      <div
        className="px-3 py-2.5 flex flex-col gap-2"
        style={{
          opacity: dimmed ? 0.3 : isRejected ? 0.45 : 1,
          pointerEvents: dimmed ? "none" : undefined,
          transition: "opacity 150ms ease",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <StatusChip status={jtd.status} />
          <div className="flex items-center gap-1.5">
            <LoadDot score={jtd.load_intensity} accentColor="var(--jtd-cognitive)" />
            <button
              onClick={() => setExpanded(false)}
              className="text-xs font-ui text-text-muted hover:text-text-secondary transition-colors"
              title="Collapse"
            >
              ▲
            </button>
            {isRejected ? (
              <ThreeDotMenu onReinstate={onReinstate} />
            ) : (
              <ThreeDotMenu onEdit={() => setEditing(true)} onDelete={onDelete} />
            )}
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
            <ClampedDescription text={jtd.description} onDoubleClick={() => !isRejected && setEditing(true)} />
            {jtd.cognitive_zone && (
              <p className="text-xs text-text-muted font-ui">{jtd.cognitive_zone}</p>
            )}
            {phaseName && (
              <p className="text-xs font-ui" style={{ color: "var(--text-muted)" }}>{phaseName}</p>
            )}
          </>
        )}

        {/* Provenance indicator */}
        {!editing && (
          <ProvenanceIndicator
            sourceMessageId={jtd.source_message_id}
            isModified={jtd.is_modified}
            onScrollToSource={onScrollToSource}
          />
        )}

        {/* Actions — proposed: Confirm + Reject */}
        {jtd.status === "proposed" && !editing && (
          <div className="flex items-center gap-2 pt-0.5">
            <ConfirmButton onClick={onConfirm} />
            <RejectButton onClick={onReject} />
          </div>
        )}

        {/* Actions — confirmed: Unconfirm toggle */}
        {jtd.status === "confirmed" && !editing && (
          <div className="flex items-center gap-2 pt-0.5">
            <UnconfirmButton onClick={onReject} />
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

function getDelegationMode(avg: number): { label: string; color: string } {
  if (avg >= 2.5) return { label: "Full Delegation", color: "var(--accent-success)" };
  if (avg >= 1.8) return { label: "Supervised Execution", color: "var(--accent-primary)" };
  if (avg >= 1.0) return { label: "Assisted Mode", color: "var(--accent-amber)" };
  return { label: "Human Only", color: "var(--accent-warm)" };
}

const DELEGATION_MODES = [
  { label: "Full Delegation", color: "var(--accent-success)" },
  { label: "Supervised Execution", color: "var(--accent-primary)" },
  { label: "Assisted Mode", color: "var(--accent-amber)" },
  { label: "Human Only", color: "var(--accent-warm)" },
] as const;

function SuitabilityBar({
  scores,
  delegationMode,
  onSelectDelegationMode,
}: {
  scores: SuitabilityScores;
  delegationMode?: string | null;
  onSelectDelegationMode?: (mode: string) => void;
}) {
  const avg =
    Object.values(scores).reduce((a, b) => a + b, 0) /
    Object.values(scores).length;

  const recommended = getDelegationMode(avg);
  const activeMode = delegationMode || recommended.label;

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
            <span className="text-xs font-ui text-text-muted shrink-0" style={{ minWidth: "7rem" }}>
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

      {/* Delegation mode recommendation */}
      <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--bg-border)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-ui text-text-secondary">Delegation Mode</span>
          <span
            className="text-xs font-ui"
            style={{ color: recommended.color }}
          >
            rec: {recommended.label}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {DELEGATION_MODES.map((mode) => {
            const isActive = activeMode === mode.label;
            return (
              <button
                key={mode.label}
                onClick={() => onSelectDelegationMode?.(mode.label)}
                className="text-xs font-ui px-1.5 py-0.5 rounded-sm border transition-colors"
                style={{
                  color: isActive ? mode.color : "var(--text-muted)",
                  borderColor: isActive ? mode.color : "var(--bg-border)",
                  background: isActive ? `${mode.color}15` : "transparent",
                }}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Membership Edit Panel ────────────────────────────────────────────────────

function MembershipEditPanel({
  cluster,
  confirmedLivedJTDs,
  confirmedCognitiveJTDs,
  onToggle,
}: {
  cluster: DelegationCluster;
  confirmedLivedJTDs: LivedJTD[];
  confirmedCognitiveJTDs: CognitiveJTD[];
  onToggle: (jtdId: string, type: "lived" | "cognitive", isMember: boolean) => void;
}) {
  const livedMemberSet = new Set(cluster.lived_jtd_ids ?? []);
  const cognitiveMemberSet = new Set(cluster.cognitive_jtd_ids);

  return (
    <div
      className="mt-1 pt-2 border-t flex flex-col gap-2"
      style={{ borderColor: "var(--bg-border)" }}
    >
      {/* JTDs section */}
      {confirmedLivedJTDs.length > 0 && (
        <div>
          <p className="text-xs font-ui mb-1" style={{ color: "var(--jtd-lived)" }}>
            Jobs To Be Done
          </p>
          {confirmedLivedJTDs.map((jtd) => {
            const isMember = livedMemberSet.has(jtd.id);
            return (
              <label
                key={jtd.id}
                className="flex items-start gap-2 py-0.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isMember}
                  onChange={() => onToggle(jtd.id, "lived", isMember)}
                  className="mt-0.5 shrink-0"
                />
                <span
                  className="text-xs font-body leading-snug"
                  style={{
                    color: "var(--text-secondary)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={jtd.description}
                >
                  {jtd.description}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Cognitive Load section */}
      {confirmedCognitiveJTDs.length > 0 && (
        <div>
          <p className="text-xs font-ui mb-1" style={{ color: "var(--jtd-cognitive)" }}>
            Cognitive Load
          </p>
          {confirmedCognitiveJTDs.map((jtd) => {
            const isMember = cognitiveMemberSet.has(jtd.id);
            return (
              <label
                key={jtd.id}
                className="flex items-start gap-2 py-0.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isMember}
                  onChange={() => onToggle(jtd.id, "cognitive", isMember)}
                  className="mt-0.5 shrink-0"
                />
                <span
                  className="text-xs font-body leading-snug"
                  style={{
                    color: "var(--text-secondary)",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={jtd.description}
                >
                  {jtd.description}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Delegation Cluster Card ──────────────────────────────────────────────────

interface DelegationClusterCardProps {
  cluster: DelegationCluster;
  onConfirm: () => void;
  onScore: () => void;
  onSelectDelegationMode?: (mode: string) => void;
  isScoring?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  confirmedLivedJTDs?: LivedJTD[];
  confirmedCognitiveJTDs?: CognitiveJTD[];
  onToggleMembership?: (jtdId: string, type: "lived" | "cognitive", isMember: boolean) => void;
}

export function DelegationClusterCard({
  cluster,
  onConfirm,
  onScore,
  onSelectDelegationMode,
  isScoring = false,
  isSelected = false,
  onSelect,
  confirmedLivedJTDs,
  confirmedCognitiveJTDs,
  onToggleMembership,
}: DelegationClusterCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingMembers, setEditingMembers] = useState(false);

  return (
    <CardShell
      accentColor="var(--jtd-cluster)"
      borderColor={isSelected ? "var(--jtd-cluster)" : "var(--bg-border)"}
    >
      <div
        className="px-3 py-2.5 flex flex-col gap-2 cursor-pointer"
        onClick={(e) => {
          // Don't trigger select when clicking buttons inside
          if ((e.target as HTMLElement).closest("button, input, label")) return;
          onSelect?.();
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <StatusChip status={cluster.status} />
            {cluster.is_scored && (
              <span
                className="text-xs font-ui px-1.5 py-0.5 rounded-sm"
                style={{ color: "var(--accent-primary)", border: "1px solid var(--accent-primary)", opacity: 0.85 }}
              >
                Scored
              </span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
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

        {/* Item counts */}
        <p className="text-xs font-ui text-text-muted">
          {cluster.cognitive_jtd_ids.length} Cognitive Load item
          {cluster.cognitive_jtd_ids.length !== 1 ? "s" : ""}
          {cluster.lived_jtd_ids?.length
            ? ` · ${cluster.lived_jtd_ids.length} JTD${cluster.lived_jtd_ids.length !== 1 ? "s" : ""}`
            : ""}
        </p>

        {/* Suitability scores (if scored) */}
        {expanded && cluster.suitability_scores && (
          <SuitabilityBar
            scores={cluster.suitability_scores}
            delegationMode={cluster.delegation_mode}
            onSelectDelegationMode={onSelectDelegationMode}
          />
        )}

        {/* Membership editing panel */}
        {editingMembers && confirmedLivedJTDs && confirmedCognitiveJTDs && onToggleMembership && (
          <MembershipEditPanel
            cluster={cluster}
            confirmedLivedJTDs={confirmedLivedJTDs}
            confirmedCognitiveJTDs={confirmedCognitiveJTDs}
            onToggle={onToggleMembership}
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-0.5">
          {cluster.status === "proposed" && (
            <ConfirmButton onClick={onConfirm} />
          )}
          {cluster.status === "confirmed" && (
            <UnconfirmButton onClick={onConfirm} />
          )}
          {!cluster.is_scored && (
            <button
              onClick={(e) => { e.stopPropagation(); onScore(); }}
              disabled={isScoring}
              className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
              style={{
                color: "var(--jtd-cluster)",
                borderColor: "var(--jtd-cluster)",
                opacity: isScoring ? 0.5 : 1,
              }}
            >
              {isScoring ? "Scoring..." : "Score"}
            </button>
          )}
          {cluster.status !== "replaced" && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditingMembers((v) => !v); }}
              className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
              style={{
                color: editingMembers ? "var(--accent-primary)" : "var(--text-secondary)",
                borderColor: editingMembers ? "var(--accent-primary)" : "var(--bg-border)",
              }}
            >
              {editingMembers ? "Done" : "Edit"}
            </button>
          )}
        </div>
      </div>
    </CardShell>
  );
}
