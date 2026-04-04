import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { agenticDesignApi } from "@/api/agentic_design";
import { discoveryApi } from "@/api/discovery";
import { useAgenticDesignStore } from "@/store/agenticDesignStore";
import { useAgenticDesignWebSocket } from "./hooks/useAgenticDesignWebSocket";
import { SpecPanel } from "./SpecPanel";
import { AgentArchitectureDiagram } from "./diagram/AgentArchitectureDiagram";
import type { AgenticDesignMessage } from "@/types/agentic_design";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractTextFromBlocks(content: AgenticDesignMessage["content"]): string {
  if (!Array.isArray(content)) return String(content);
  return (content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
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

// ─── Message bubble ───────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div
          className="w-5 h-5 rounded-sm flex items-center justify-center text-xs font-ui mr-2 mt-0.5 shrink-0"
          style={{ background: "var(--color-agent)", color: "white" }}
        >
          D
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-sm px-3 py-2.5 text-sm font-body leading-relaxed whitespace-pre-wrap ${
          isUser ? "rounded-br-none" : "rounded-bl-none"
        }`}
        style={{
          background: isUser ? "var(--accent-primary)" : "var(--bg-elevated)",
          color: isUser ? "white" : "var(--text-primary)",
        }}
      >
        {msg.text}
        {msg.streaming && (
          <span className="inline-block w-1 h-4 ml-1 align-text-bottom animate-pulse bg-current rounded-sm" />
        )}
      </div>
    </div>
  );
}

// ─── Design conversation panel ────────────────────────────────────────────────

interface ConversationPanelProps {
  sendMessage: (text: string) => void;
  onCollapse: () => void;
}

function ConversationPanel({ sendMessage, onCollapse }: ConversationPanelProps) {
  const { chatMessages, streamingText, isStreaming, addChatMessage } =
    useAgenticDesignStore();

  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingText]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isStreaming) return;
    addChatMessage({ id: `user-${Date.now()}`, role: "user", text });
    sendMessage(text);
    setInputText("");
  }, [inputText, isStreaming, addChatMessage, sendMessage]);

  return (
    <div className="flex flex-col h-full border-r border-bg-border">
      {/* Header — fixed 44px height */}
      <div className="h-11 px-5 border-b border-bg-border shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-medium font-ui uppercase tracking-wider text-text-secondary">
          Design Conversation
        </h2>
        <CollapseBtn onClick={onCollapse} dir="left" />
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {chatMessages.length === 0 && !streamingText && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xs">
              <p className="text-sm font-ui text-text-muted mb-2">Agentic Design session ready</p>
              <p className="text-xs text-text-muted font-body leading-relaxed">
                Tell the agent which cluster to start with, or ask it to begin with the
                highest-priority one. It will interview you to build a complete agent specification.
              </p>
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {streamingText && (
          <MessageBubble
            msg={{
              id: "streaming",
              role: "assistant",
              text: streamingText,
              streaming: true,
            }}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-5 pb-5 pt-3 border-t border-bg-border">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 input resize-none text-sm font-body leading-relaxed"
            rows={3}
            placeholder="Start with a cluster, answer the agent's questions, or provide additional context…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isStreaming}
          />
          <button
            className="btn-primary shrink-0 self-end"
            onClick={handleSend}
            disabled={!inputText.trim() || isStreaming}
          >
            {isStreaming ? "…" : "Send"}
          </button>
        </div>
        <p className="text-xs text-text-muted font-ui mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ─── Module root ──────────────────────────────────────────────────────────────

export function AgenticDesignModule() {
  const { useCaseId } = useParams<{ id: string; useCaseId: string }>();
  const { hydrate, reset, agentSpecs, updateAgentSpec } = useAgenticDesignStore();
  const [diagramSpecId, setDiagramSpecId] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Load existing design map on mount
  const { data: designMap } = useQuery({
    queryKey: ["agentic-design", useCaseId],
    queryFn: () => agenticDesignApi.getMap(useCaseId!),
    enabled: !!useCaseId,
    staleTime: 0,
  });

  // Load discovery map for cluster context
  const { data: discoveryMap } = useQuery({
    queryKey: ["discovery", useCaseId],
    queryFn: () => discoveryApi.getMap(useCaseId!),
    enabled: !!useCaseId,
    staleTime: 30_000,
  });

  // Hydrate store when map data loads
  useEffect(() => {
    if (!designMap) return;
    hydrate({
      agentSpecs: designMap.agent_specifications,
      opportunities: designMap.cross_agent_opportunities,
      chatMessages: designMap.messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: extractTextFromBlocks(m.content),
      })),
    });
  }, [designMap, hydrate]);

  // Reset store on unmount
  useEffect(() => {
    return () => reset();
  }, [reset]);

  const { sendMessage } = useAgenticDesignWebSocket({
    useCaseId: useCaseId!,
  });

  const handleViewDiagram = useCallback((id: string) => {
    setDiagramSpecId(id);
    setRightOpen(true);
  }, []);

  const handleBack = useCallback(() => {
    setDiagramSpecId(null);
    setRightOpen(true);
  }, []);

  if (!useCaseId) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-ui">
        No use case selected.
      </div>
    );
  }

  const agentScopes = discoveryMap?.delegation_clusters ?? [];
  const diagramSpec = diagramSpecId
    ? agentSpecs.find((s) => s.id === diagramSpecId) ?? null
    : null;

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
          <ConversationPanel
            sendMessage={sendMessage}
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

      {/* Right cell — Spec Panel / Diagram or collapsed strip */}
      {rightOpen ? (
        <div style={{ minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {diagramSpec ? (
            <AgentArchitectureDiagram
              spec={diagramSpec}
              useCaseId={useCaseId}
              onBack={handleBack}
              onSpecUpdated={updateAgentSpec}
              onCollapse={() => setRightOpen(false)}
            />
          ) : (
            <SpecPanel
              useCaseId={useCaseId}
              clusters={agentScopes}
              onViewDiagram={handleViewDiagram}
              onCollapse={() => setRightOpen(false)}
            />
          )}
        </div>
      ) : (
        <CollapsedStrip
          label={diagramSpec ? "Diagram" : "Specs"}
          expandDir="left"
          onExpand={() => setRightOpen(true)}
        />
      )}
    </div>
  );
}
