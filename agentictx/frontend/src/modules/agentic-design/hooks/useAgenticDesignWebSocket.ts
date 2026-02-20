import { useCallback, useEffect, useRef } from "react";
import { buildDesignWsUrl } from "@/api/agentic_design";
import { useAgenticDesignStore } from "@/store/agenticDesignStore";
import type { WSDesignServerEvent } from "@/types/agentic_design";

interface UseAgenticDesignWebSocketOptions {
  useCaseId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useAgenticDesignWebSocket({
  useCaseId,
  onConnected,
  onDisconnected,
}: UseAgenticDesignWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const {
    addChatMessage,
    appendStreamDelta,
    finaliseStreamingMessage,
    setIsStreaming,
    addAgentSpec,
    addOpportunity,
  } = useAgenticDesignStore();

  const handleEvent = useCallback(
    (event: WSDesignServerEvent) => {
      switch (event.type) {
        case "text_delta":
          appendStreamDelta(event.delta);
          setIsStreaming(true);
          break;

        case "agent_spec_proposed":
          addAgentSpec(event.spec);
          break;

        case "cross_agent_opportunity":
          addOpportunity(event.opportunity);
          break;

        case "message_complete":
          finaliseStreamingMessage(event.message_id);
          break;

        case "error":
          console.error("[Design WS] Agent error:", event.message);
          setIsStreaming(false);
          addChatMessage({
            id: `error-${Date.now()}`,
            role: "assistant",
            text: `Error: ${event.message}`,
          });
          break;
      }
    },
    [
      appendStreamDelta,
      setIsStreaming,
      addAgentSpec,
      addOpportunity,
      finaliseStreamingMessage,
      addChatMessage,
    ]
  );

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (!useCaseId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = buildDesignWsUrl(useCaseId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      onConnected?.();
    };

    ws.onmessage = (ev) => {
      if (!mountedRef.current) return;
      try {
        const parsed: WSDesignServerEvent = JSON.parse(ev.data);
        handleEvent(parsed);
      } catch (e) {
        console.error("[Design WS] Failed to parse event:", e);
      }
    };

    ws.onerror = (e) => {
      console.error("[Design WS] WebSocket error:", e);
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      onDisconnected?.();
      setIsStreaming(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, 3000);
    };
  }, [useCaseId, handleEvent, onConnected, onDisconnected, setIsStreaming]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn("[Design WS] WebSocket not open — message dropped");
      return;
    }
    wsRef.current.send(
      JSON.stringify({ type: "user_message", content: text })
    );
  }, []);

  return { sendMessage };
}
