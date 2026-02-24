/**
 * Permanent fixed legend overlay — always visible on the diagram canvas.
 */
export function DiagramLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 10,
        background: "var(--bg-elevated)",
        border: "1px solid var(--bg-border)",
        borderRadius: 8,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 200,
        fontSize: 10,
        fontFamily: "var(--font-ui)",
        pointerEvents: "none",
      }}
    >
      {/* Node Types */}
      <div>
        <div
          style={{
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 5,
          }}
        >
          Node Types
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[
            { prefix: "T:", label: "Tool / MCP Server" },
            { prefix: "S:", label: "System (passive store)" },
            { prefix: "KB", label: "Knowledge Base" },
          ].map(({ prefix, label }) => (
            <div key={prefix} style={{ display: "flex", gap: 6, color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--text-primary)", fontWeight: 700, minWidth: 22 }}>
                {prefix}
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Build Status */}
      <div>
        <div
          style={{
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 5,
          }}
        >
          Build Status
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[
            { color: "var(--tool-existing)", label: "Existing — zero marginal cost" },
            { color: "var(--tool-new)", label: "New — build required" },
            { color: "var(--tool-pending)", label: "Pending confirmation" },
            { color: "var(--tool-blocked)", label: "Blocked" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Arrow Direction */}
      <div>
        <div
          style={{
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 5,
          }}
        >
          Arrows
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, color: "var(--text-secondary)" }}>
          <div>→ into agent = data in (read)</div>
          <div>→ out of agent = action (write)</div>
          <div>↔ both directions</div>
        </div>
      </div>
    </div>
  );
}
