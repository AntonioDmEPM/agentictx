/**
 * Token economics summary panel — shown in bottom-right when viewMode === 'token_economics'.
 * Positioned above the legend.
 */
import type { AgentSpecification } from "@/types/agentic_design";

interface TokenEconomicsSummaryProps {
  spec: AgentSpecification;
}

export function TokenEconomicsSummary({ spec }: TokenEconomicsSummaryProps) {
  const pr = spec.prompt_requirements ?? {};

  // Total input tokens
  const systemPromptTokens = pr.system_prompt?.estimated_tokens ?? 0;
  const dynamicContextTokens = (pr.dynamic_context ?? []).reduce(
    (sum, dc) => sum + (dc.estimated_tokens_per_call ?? 0),
    0
  );
  const fewShotTokens = pr.few_shot_examples?.estimated_tokens ?? 0;
  const guardrailTokens = (pr.guardrails ?? []).reduce(
    (sum, g) => sum + (g.estimated_tokens ?? 0),
    0
  );
  const promptInputTokens = systemPromptTokens + dynamicContextTokens + fewShotTokens + guardrailTokens;

  const channelInputTokens = (spec.input_channels ?? []).reduce(
    (sum, ch) => sum + (ch.estimated_tokens_per_call ?? 0),
    0
  );
  const toolInputTokens = (spec.tool_stack ?? []).reduce(
    (sum, t) => sum + (t.input_tokens_per_call ?? 0),
    0
  );
  const totalInputTokens = promptInputTokens + channelInputTokens + toolInputTokens;

  // Total output tokens
  const toolOutputTokens = (spec.tool_stack ?? []).reduce(
    (sum, t) => sum + (t.output_tokens_per_call ?? 0),
    0
  );
  const channelOutputTokens = (spec.output_channels ?? []).reduce(
    (sum, ch) => sum + (ch.estimated_tokens ?? 0),
    0
  );
  const totalOutputTokens = toolOutputTokens + channelOutputTokens;

  // Cached input tokens (prompt components only)
  const cachedInputTokens =
    Math.round(systemPromptTokens * ((pr.system_prompt?.cache_hit_pct ?? 95) / 100)) +
    (pr.dynamic_context ?? []).reduce(
      (sum, dc) =>
        sum + Math.round((dc.estimated_tokens_per_call ?? 0) * ((dc.cache_hit_pct ?? 15) / 100)),
      0
    ) +
    Math.round(fewShotTokens * ((pr.few_shot_examples?.cache_hit_pct ?? 90) / 100)) +
    (pr.guardrails ?? []).reduce(
      (sum, g) => sum + Math.round((g.estimated_tokens ?? 0) * ((g.cache_hit_pct ?? 95) / 100)),
      0
    );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16 + 310, // above the legend (legend ~290px tall)
        right: 16,
        zIndex: 10,
        background: "var(--bg-elevated)",
        border: "1px solid var(--bg-border)",
        borderTop: "2px solid var(--jtd-cognitive)",
        borderRadius: 8,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 200,
        fontFamily: "var(--font-ui)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Token Economics / Call
      </div>

      {[
        { label: "Total input tokens", value: totalInputTokens.toLocaleString(), color: "var(--text-primary)" },
        { label: "  of which cached", value: cachedInputTokens.toLocaleString(), color: "var(--accent-success)" },
        { label: "Total output tokens", value: totalOutputTokens.toLocaleString(), color: "var(--text-primary)" },
        { label: "Est. cost / call", value: "—", color: "var(--text-muted)" },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            fontSize: 10,
          }}
        >
          <span style={{ color: "var(--text-secondary)" }}>{label}</span>
          <span style={{ color, fontWeight: 600 }}>{value}</span>
        </div>
      ))}

      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>
        Configure pricing in Business Case
      </div>
    </div>
  );
}
