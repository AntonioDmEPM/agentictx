import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { discoveryApi } from "@/api/discovery";
import { useDiscoveryStore } from "@/store/discoveryStore";
import { useDiscoveryWebSocket } from "./hooks/useDiscoveryWebSocket";
import { InputPanel } from "./InputPanel";
import { CognitiveMapPanel } from "./CognitiveMapPanel";
import ProcessMatrixGrid from "./ProcessMatrixGrid";
import type { ConversationMessage } from "@/types/discovery";

function extractText(blocks: ConversationMessage["content"]): string {
  if (!Array.isArray(blocks)) return String(blocks);
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
}

// ─── Collapse button ──────────────────────────────────────────────────────────

function CollapseBtn({ onClick, dir }: { onClick: () => void; dir: "left" | "right" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "none",
        border: "none",
        padding: "2px 6px",
        cursor: "pointer",
        color: hovered ? "var(--text-secondary)" : "var(--text-muted)",
        fontSize: 14,
        lineHeight: 1,
        borderRadius: 3,
      }}
    >
      {dir === "left" ? "‹" : "›"}
    </button>
  );
}

// ─── Collapsed strip ──────────────────────────────────────────────────────────

function CollapsedStrip({
  label,
  expandDir,
  onExpand,
}: {
  label: string;
  expandDir: "left" | "right";
  onExpand: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onExpand}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 44,
        height: "100%",
        background: hovered ? "var(--bg-elevated)" : "var(--bg-surface)",
        borderRight: expandDir === "right" ? "1px solid var(--bg-border)" : undefined,
        borderLeft: expandDir === "left" ? "1px solid var(--bg-border)" : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        gap: 10,
        userSelect: "none",
        transition: "background 0.15s ease",
      }}
    >
      <span
        style={{
          writingMode: "vertical-rl",
          fontSize: 10,
          fontFamily: "var(--font-ui)",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          transform: expandDir === "right" ? "rotate(180deg)" : undefined,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
        {expandDir === "right" ? "›" : "‹"}
      </span>
    </div>
  );
}

// ─── View toggle button ───────────────────────────────────────────────────────

function ViewToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--accent-primary)" : "var(--bg-elevated)",
        border: "1px solid " + (active ? "var(--accent-primary)" : "var(--bg-border)"),
        borderRadius: 5,
        padding: "3px 10px",
        cursor: "pointer",
        fontSize: 11,
        fontFamily: "var(--font-ui)",
        color: active ? "#fff" : "var(--text-secondary)",
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

// ─── Module ───────────────────────────────────────────────────────────────────

export function DiscoveryModule() {
  const { useCaseId } = useParams<{ id: string; useCaseId: string }>();
  const { hydrate, reset, setProcessFlow, processFlow } = useDiscoveryStore();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [view, setView] = useState<"extract" | "visualise">("extract");

  // Load existing cognitive map on mount
  const { data: mapData } = useQuery({
    queryKey: ["discovery", useCaseId],
    queryFn: () => discoveryApi.getMap(useCaseId!),
    enabled: !!useCaseId,
    staleTime: 0,
  });

  // Hydrate store when map data loads
  useEffect(() => {
    if (!mapData) return;
    hydrate({
      activities: mapData.lived_jtds,
      cognitiveLoadItems: mapData.cognitive_jtds,
      agentScopes: mapData.delegation_clusters,
      chatMessages: mapData.conversation_messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: extractText(m.content),
      })),
    });
  }, [mapData, hydrate]);

  // Load process flow on first switch to Visualise view
  const handleSwitchToVisualise = async () => {
    if (view === "visualise") return;
    setView("visualise");
    if (!processFlow && useCaseId) {
      try {
        const flow = await discoveryApi.getProcessFlow(useCaseId);
        setProcessFlow(flow);
      } catch {
        // first time — no steps yet, that's fine
        setProcessFlow({
          use_case_id: useCaseId,
          steps: [],
          cluster_steps: [],
        });
      }
    }
  };

  // Reset store on unmount
  useEffect(() => {
    return () => reset();
  }, [reset]);

  const { sendMessage, notifyFileProcessed } = useDiscoveryWebSocket({
    useCaseId: useCaseId!,
  });

  if (!useCaseId) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-ui">
        No use case selected.
      </div>
    );
  }

  // ── Visualise view — full width ───────────────────────────────────────────

  if (view === "visualise") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div
          style={{
            height: 44,
            paddingInline: 20,
            borderBottom: "1px solid var(--bg-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontSize: 12,
              fontFamily: "var(--font-ui)",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-secondary)",
              margin: 0,
            }}
          >
            Cognitive Map
          </h2>
          <div style={{ display: "flex", gap: 4 }}>
            <ViewToggle
              active={false}
              onClick={() => setView("extract")}
              label="Extract"
            />
            <ViewToggle active label="Visualise" onClick={() => {}} />
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <ProcessMatrixGrid useCaseId={useCaseId} />
        </div>
      </div>
    );
  }

  // ── Extract view — two-column layout ─────────────────────────────────────

  const gridCols = !leftOpen
    ? "44px 1fr"
    : !rightOpen
    ? "1fr 44px"
    : "2fr 3fr";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        height: "100%",
        overflow: "hidden",
        transition: "grid-template-columns 0.2s ease",
      }}
    >
      {/* Left cell — Conversation or collapsed strip */}
      {leftOpen ? (
        <div style={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <InputPanel
            useCaseId={useCaseId}
            sendMessage={sendMessage}
            notifyFileProcessed={notifyFileProcessed}
            onCollapse={() => setLeftOpen(false)}
          />
        </div>
      ) : (
        <CollapsedStrip
          label="Conversation"
          expandDir="right"
          onExpand={() => setLeftOpen(true)}
        />
      )}

      {/* Right cell — Cognitive Map or collapsed strip */}
      {rightOpen ? (
        <div style={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Panel header — fixed 44px height */}
          <div className="h-11 px-5 border-b border-bg-border shrink-0 flex items-center justify-between">
            <h2 className="text-sm font-medium font-ui uppercase tracking-wider text-text-secondary">
              Cognitive Map
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <ViewToggle active label="Extract" onClick={() => {}} />
                <ViewToggle
                  active={false}
                  onClick={handleSwitchToVisualise}
                  label="Visualise"
                />
              </div>
              <CollapseBtn onClick={() => setRightOpen(false)} dir="right" />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <CognitiveMapPanel useCaseId={useCaseId} />
          </div>
        </div>
      ) : (
        <CollapsedStrip
          label="Cognitive Map"
          expandDir="left"
          onExpand={() => setRightOpen(true)}
        />
      )}
    </div>
  );
}
