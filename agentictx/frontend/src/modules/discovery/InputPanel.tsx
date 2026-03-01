import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { discoveryApi } from "@/api/discovery";
import { useDiscoveryStore } from "@/store/discoveryStore";
import type { ChatMessage } from "@/types/discovery";

interface InputPanelProps {
  useCaseId: string;
  sendMessage: (text: string) => void;
  notifyFileProcessed: (rawInputId: string) => void;
  onCollapse: () => void;
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

// ─── System message banner ────────────────────────────────────────────────────

function SystemMessageBanner({
  msg,
  onProceed,
  clusteringProposed,
}: {
  msg: ChatMessage;
  onProceed?: () => void;
  clusteringProposed: boolean;
}) {
  const showProceed = msg.text.includes("propose delegation clusters");
  const [proceeding, setProceeding] = useState(false);
  const disabled = proceeding || clusteringProposed;
  return (
    <div className="flex justify-center mb-4">
      <div
        className="max-w-[90%] rounded-sm px-4 py-2.5 text-sm font-body leading-relaxed text-center"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--accent-primary)",
          color: "var(--text-secondary)",
        }}
      >
        {msg.text}
        {showProceed && onProceed && !clusteringProposed && (
          <div className="mt-2">
            <button
              onClick={() => { setProceeding(true); onProceed(); }}
              disabled={disabled}
              className="text-xs font-ui px-3 py-1 rounded-sm border transition-colors"
              style={{
                color: disabled ? "var(--text-muted)" : "var(--accent-success)",
                borderColor: disabled ? "var(--bg-border)" : "var(--accent-success)",
                background: disabled ? "transparent" : "rgba(45, 212, 160, 0.08)",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {proceeding ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Proceeding…
                </span>
              ) : (
                "Proceed"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chat message bubble ──────────────────────────────────────────────────────

// Collapsed height: 4 lines × (14px font × 1.625 line-height) ≈ 91px
const MSG_COLLAPSED_HEIGHT = 91;

function MessageBubble({ msg, messageId }: { msg: ChatMessage; messageId?: string }) {
  const isUser = msg.role === "user";
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isUser || msg.streaming) return;
    const el = bubbleRef.current;
    if (!el) return;
    const prev = el.style.maxHeight;
    el.style.maxHeight = "none";
    setOverflows(el.scrollHeight > MSG_COLLAPSED_HEIGHT + 4);
    el.style.maxHeight = prev;
  }, [isUser, msg.text, msg.streaming]);

  const collapsed = isUser && !expanded && overflows;

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      data-message-id={messageId}
    >
      {!isUser && (
        <div
          className="w-5 h-5 rounded-sm flex items-center justify-center text-xs font-ui mr-2 mt-0.5 shrink-0"
          style={{ background: "var(--accent-primary)", color: "white" }}
        >
          A
        </div>
      )}
      <div className="max-w-[85%]">
        <div
          ref={bubbleRef}
          className={`rounded-sm px-3 py-2.5 text-sm font-body leading-relaxed whitespace-pre-wrap ${
            isUser ? "rounded-br-none" : "rounded-bl-none"
          }`}
          style={{
            background: isUser ? "var(--accent-primary)" : "var(--bg-elevated)",
            color: isUser ? "white" : "var(--text-primary)",
            overflow: collapsed ? "hidden" : undefined,
            maxHeight: collapsed ? MSG_COLLAPSED_HEIGHT : undefined,
            transition: "max-height 0.2s ease",
          }}
        >
          {msg.text}
          {msg.streaming && (
            <span className="inline-block w-1 h-4 ml-1 align-text-bottom animate-pulse bg-current rounded-sm" />
          )}
        </div>
        {isUser && overflows && !msg.streaming && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="block mt-1 text-xs font-ui transition-colors"
            style={{
              color: "rgba(255,255,255,0.55)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              textAlign: "right",
              width: "100%",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── File drop zone ───────────────────────────────────────────────────────────

function FileDropZone({
  useCaseId,
  onFileUploaded,
}: {
  useCaseId: string;
  onFileUploaded: (rawInputId: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const raw = await discoveryApi.uploadFile(useCaseId, file);
      onFileUploaded(raw.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [useCaseId]
  );

  return (
    <div
      className="border-2 border-dashed rounded-sm px-4 py-3 text-center cursor-pointer transition-colors mb-3"
      style={{
        borderColor: dragging ? "var(--accent-primary)" : "var(--bg-border)",
        background: dragging ? "var(--bg-elevated)" : "transparent",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.pdf,.docx,.png,.jpg,.jpeg,.webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {uploading ? (
        <span className="text-xs font-ui" style={{ color: "var(--accent-primary)" }}>
          Uploading…
        </span>
      ) : (
        <span className="text-xs font-ui" style={{ color: "var(--text-muted)" }}>
          Drop file or click — PDF, DOCX, TXT, images
        </span>
      )}
      {error && (
        <p className="text-xs mt-1" style={{ color: "var(--accent-warm)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Main InputPanel ──────────────────────────────────────────────────────────

export function InputPanel({ useCaseId, sendMessage, notifyFileProcessed, onCollapse }: InputPanelProps) {
  const {
    chatMessages, streamingText, isStreaming, addChatMessage,
    scrollToMessageId, setScrollToMessageId,
    clusteringProposed, setClusteringProposed,
  } = useDiscoveryStore();

  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingText]);

  // Scroll-to-message for provenance navigation
  useEffect(() => {
    if (!scrollToMessageId || !threadRef.current) return;
    const el = threadRef.current.querySelector(`[data-message-id="${scrollToMessageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("message-highlight");
      setTimeout(() => el.classList.remove("message-highlight"), 1500);
    }
    setScrollToMessageId(null);
  }, [scrollToMessageId, setScrollToMessageId]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    // Add user message optimistically to UI
    addChatMessage({
      id: `user-${Date.now()}`,
      role: "user",
      text,
    });

    sendMessage(text);
    setInputText("");
  };

  const handleProceed = () => {
    // Guard: only one clustering request allowed
    if (clusteringProposed) return;
    setClusteringProposed(true);

    addChatMessage({
      id: `user-${Date.now()}`,
      role: "user",
      text: "Please propose delegation clusters based on the confirmed JTDs.",
    });
    sendMessage("Please propose delegation clusters based on the confirmed JTDs.");
  };

  const handleFileUploaded = (rawInputId: string) => {
    notifyFileProcessed(rawInputId);
  };

  return (
    <div className="flex flex-col h-full border-r border-bg-border">
      {/* Header — fixed 44px height */}
      <div className="h-11 px-5 border-b border-bg-border shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-medium font-ui uppercase tracking-wider text-text-secondary">
          Discovery Conversation
        </h2>
        <CollapseBtn onClick={onCollapse} dir="left" />
      </div>

      {/* Message thread */}
      <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-4">
        {chatMessages.length === 0 && !streamingText && (
          <div className="flex justify-start mb-4">
            <div
              className="w-5 h-5 rounded-sm flex items-center justify-center text-xs font-ui mr-2 mt-0.5 shrink-0"
              style={{ background: "var(--accent-primary)", color: "white" }}
            >
              A
            </div>
            <div
              className="max-w-[85%] rounded-sm rounded-bl-none px-3 py-2.5 text-sm font-body leading-relaxed whitespace-pre-wrap"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
              }}
            >
              {`Welcome to Discovery. I'm here to help you map the lived reality of this process — not the documented version, but what people actually do, think, and struggle with every day.

To get started, describe the process in your own words, paste in interview notes or workshop transcripts, or drop a document into the upload zone below. Whatever you have is a good starting point — we'll dig deeper together from there.`}
            </div>
          </div>
        )}

        {chatMessages.map((msg) =>
          msg.role === "system" ? (
            <SystemMessageBanner key={msg.id} msg={msg} onProceed={handleProceed} clusteringProposed={clusteringProposed} />
          ) : (
            <MessageBubble key={msg.id} msg={msg} messageId={msg.id} />
          )
        )}

        {/* Streaming in-progress bubble */}
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

      {/* Input area */}
      <div className="shrink-0 px-5 pb-5 pt-3 border-t border-bg-border">
        <FileDropZone useCaseId={useCaseId} onFileUploaded={handleFileUploaded} />

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            className="flex-1 input resize-none text-sm font-body leading-relaxed"
            rows={3}
            placeholder="Describe the process, ask a question, or paste raw notes…"
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
