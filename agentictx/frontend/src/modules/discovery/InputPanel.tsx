import { useCallback, useEffect, useRef, useState } from "react";
import { discoveryApi } from "@/api/discovery";
import { useDiscoveryStore } from "@/store/discoveryStore";
import type { ChatMessage } from "@/types/discovery";

interface InputPanelProps {
  useCaseId: string;
  sendMessage: (text: string) => void;
  notifyFileProcessed: (rawInputId: string) => void;
}

// ─── Chat message bubble ──────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div
          className="w-5 h-5 rounded-sm flex items-center justify-center text-xs font-ui mr-2 mt-0.5 shrink-0"
          style={{ background: "var(--accent-primary)", color: "white" }}
        >
          A
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

export function InputPanel({ useCaseId, sendMessage, notifyFileProcessed }: InputPanelProps) {
  const { chatMessages, streamingText, isStreaming, addChatMessage } =
    useDiscoveryStore();

  const [inputText, setInputText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingText]);

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

  const handleFileUploaded = (rawInputId: string) => {
    notifyFileProcessed(rawInputId);
  };

  return (
    <div className="flex flex-col h-full border-r border-bg-border">
      {/* Header */}
      <div className="px-5 py-3 border-b border-bg-border shrink-0">
        <h2 className="text-sm font-medium font-ui uppercase tracking-wider text-text-secondary">
          Discovery Conversation
        </h2>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {chatMessages.length === 0 && !streamingText && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xs">
              <p className="text-sm font-ui text-text-muted mb-2">Discovery session ready</p>
              <p className="text-xs text-text-muted font-body leading-relaxed">
                Describe the process, drop in a transcript, or upload a document to begin.
                The agent will extract Lived JTDs and Cognitive JTDs simultaneously.
              </p>
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

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
