import { useState } from "react";
import type { AgentSpecification, AutonomyLevel, CrossAgentOpportunity } from "@/types/agentic_design";

// ─── Autonomy badge ────────────────────────────────────────────────────────────

const AUTONOMY_LABELS: Record<AutonomyLevel, string> = {
  full_delegation: "Full Delegation",
  supervised_execution: "Supervised",
  assisted_mode: "Assisted",
};

function AutonomyBadge({ level }: { level: AutonomyLevel | null }) {
  if (!level) return null;
  const colorMap: Record<AutonomyLevel, string> = {
    full_delegation: "var(--accent-success)",
    supervised_execution: "var(--accent-amber)",
    assisted_mode: "var(--accent-primary)",
  };
  const color = colorMap[level] ?? "var(--text-secondary)";
  return (
    <span
      className="text-xs font-ui px-1.5 py-0.5 rounded-sm"
      style={{ color, border: `1px solid ${color}`, opacity: 0.9 }}
    >
      {AUTONOMY_LABELS[level] ?? level}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "draft" | "approved" }) {
  const color = status === "approved" ? "var(--accent-success)" : "var(--text-muted)";
  return (
    <span
      className="text-xs font-ui px-1.5 py-0.5 rounded-sm"
      style={{ color, border: `1px solid ${color}` }}
    >
      {status === "approved" ? "Approved" : "Draft"}
    </span>
  );
}

// ─── Section preview ──────────────────────────────────────────────────────────

function SectionPreview({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <span className="text-xs font-ui text-text-muted">
      {count} {label}{count !== 1 ? "s" : ""}
    </span>
  );
}

// ─── Compliance chip ──────────────────────────────────────────────────────────

function ComplianceChip({ cls }: { cls: string | undefined }) {
  if (!cls) return null;
  const colorMap: Record<string, string> = {
    "Minimal Risk": "var(--accent-success)",
    "Limited Risk": "var(--accent-amber)",
    "High Risk": "var(--accent-warm)",
    "Prohibited": "#FF4444",
  };
  const color = colorMap[cls] ?? "var(--text-secondary)";
  return (
    <span
      className="text-xs font-ui px-1.5 py-0.5 rounded-sm"
      style={{ color, border: `1px solid ${color}`, opacity: 0.85 }}
    >
      EU AI: {cls}
    </span>
  );
}

// ─── Expanded detail view ─────────────────────────────────────────────────────

function SpecDetail({ spec }: { spec: AgentSpecification }) {
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-bg-border pt-3">
      {spec.activities.length > 0 && (
        <div>
          <p className="text-xs font-ui text-text-secondary mb-1 uppercase tracking-wider">Activities</p>
          <ul className="flex flex-col gap-1">
            {spec.activities.map((a, i) => (
              <li key={i} className="text-xs text-text-primary font-body flex gap-1.5">
                <span style={{ color: "var(--jtd-agent)" }}>›</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {spec.supervised_activities.length > 0 && (
        <div>
          <p className="text-xs font-ui text-text-secondary mb-1 uppercase tracking-wider">Supervised Activities</p>
          <ul className="flex flex-col gap-1">
            {spec.supervised_activities.map((sa, i) => (
              <li key={i} className="text-xs text-text-primary font-body flex gap-1.5">
                <span style={{ color: "var(--accent-amber)" }}>›</span>
                {sa.activity}
                {sa.hitl_trigger && (
                  <span className="text-text-muted ml-1">— {sa.hitl_trigger}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {spec.data_sources.length > 0 && (
        <div>
          <p className="text-xs font-ui text-text-secondary mb-1 uppercase tracking-wider">Data Sources</p>
          <ul className="flex flex-col gap-1">
            {spec.data_sources.map((ds, i) => (
              <li key={i} className="text-xs text-text-primary font-body flex gap-1.5">
                <span style={{ color: "var(--accent-primary)" }}>›</span>
                {ds.name}
                {ds.type && <span className="text-text-muted">({ds.type})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {spec.mcp_servers.length > 0 && (
        <div>
          <p className="text-xs font-ui text-text-secondary mb-1 uppercase tracking-wider">MCP Servers</p>
          <ul className="flex flex-col gap-1">
            {spec.mcp_servers.map((mcp, i) => (
              <li key={i} className="text-xs text-text-primary font-body flex gap-1.5">
                <span style={{ color: "var(--accent-primary)" }}>›</span>
                {mcp.name}
                {mcp.purpose && <span className="text-text-muted">— {mcp.purpose}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {spec.open_questions.length > 0 && (
        <div>
          <p className="text-xs font-ui text-text-secondary mb-1 uppercase tracking-wider">Open Questions</p>
          <ul className="flex flex-col gap-1">
            {spec.open_questions.map((q, i) => (
              <li key={i} className="text-xs font-body flex gap-1.5" style={{ color: "var(--accent-amber)" }}>
                <span>?</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Agent Spec Card ──────────────────────────────────────────────────────────

interface AgentSpecCardProps {
  spec: AgentSpecification;
  onApprove: () => void;
  onDownloadArd: () => void;
  isApproving?: boolean;
}

export function AgentSpecCard({
  spec,
  onApprove,
  onDownloadArd,
  isApproving = false,
}: AgentSpecCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="group rounded-sm border bg-bg-surface transition-all duration-150 overflow-hidden"
      style={{
        borderColor: "var(--bg-border)",
        borderLeftWidth: "3px",
        borderLeftColor: "var(--jtd-agent)",
      }}
    >
      <div className="px-3 py-2.5 flex flex-col gap-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={spec.status} />
            {spec.autonomy_level && <AutonomyBadge level={spec.autonomy_level} />}
            <ComplianceChip cls={spec.compliance?.eu_ai_act_class} />
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-ui text-text-muted hover:text-text-secondary shrink-0"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>

        {/* Name */}
        <p
          className="text-sm font-medium font-body"
          style={{ color: "var(--jtd-agent)" }}
        >
          {spec.name}
        </p>

        {/* Purpose */}
        {spec.purpose && (
          <p className="text-xs text-text-secondary font-body leading-snug">
            {spec.purpose}
          </p>
        )}

        {/* Section preview counts */}
        <div className="flex items-center gap-3 flex-wrap">
          <SectionPreview label="activity" count={spec.activities.length} />
          <SectionPreview label="data source" count={spec.data_sources.length} />
          <SectionPreview label="MCP server" count={spec.mcp_servers.length} />
          <SectionPreview label="open question" count={spec.open_questions.length} />
        </div>

        {/* Expanded details */}
        {expanded && <SpecDetail spec={spec} />}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          {spec.status === "draft" && (
            <button
              onClick={onApprove}
              disabled={isApproving}
              className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
              style={{
                color: "var(--accent-success)",
                borderColor: "var(--accent-success)",
                opacity: isApproving ? 0.5 : 1,
              }}
            >
              {isApproving ? "Approving…" : "Approve"}
            </button>
          )}
          <button
            onClick={onDownloadArd}
            className="text-xs font-ui px-2 py-0.5 rounded-sm border transition-colors"
            style={{
              color: "var(--jtd-agent)",
              borderColor: "var(--jtd-agent)",
            }}
          >
            Download ARD
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cross-Agent Opportunity Card ─────────────────────────────────────────────

interface OpportunityCardProps {
  opportunity: CrossAgentOpportunity;
}

const RESOURCE_TYPE_LABELS: Record<CrossAgentOpportunity["resource_type"], string> = {
  data_source: "Data Source",
  mcp_server: "MCP Server",
  tool_api: "Tool / API",
};

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  return (
    <div
      className="rounded-sm border bg-bg-surface overflow-hidden"
      style={{
        borderColor: "var(--bg-border)",
        borderLeftWidth: "3px",
        borderLeftColor: "var(--accent-primary)",
      }}
    >
      <div className="px-3 py-2.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-ui px-1.5 py-0.5 rounded-sm"
            style={{ color: "var(--accent-primary)", border: "1px solid var(--accent-primary)" }}
          >
            {RESOURCE_TYPE_LABELS[opportunity.resource_type]}
          </span>
          <span className="text-xs font-ui text-text-secondary font-medium">
            {opportunity.resource_name}
          </span>
        </div>
        <p className="text-xs text-text-secondary font-body leading-snug">
          {opportunity.reuse_recommendation}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {opportunity.shared_by_agents.map((agent, i) => (
            <span
              key={i}
              className="text-xs font-ui px-1.5 py-0.5 rounded-sm"
              style={{
                color: "var(--jtd-agent)",
                background: "color-mix(in srgb, var(--jtd-agent) 10%, transparent)",
              }}
            >
              {agent}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
