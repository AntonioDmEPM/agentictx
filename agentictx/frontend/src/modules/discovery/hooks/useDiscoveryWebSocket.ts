import { useCallback, useEffect, useRef } from "react";
import { buildWsUrl } from "@/api/discovery";
import { useDiscoveryStore } from "@/store/discoveryStore";
import type { WSServerEvent } from "@/types/discovery";

interface UseDiscoveryWebSocketOptions {
  useCaseId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useDiscoveryWebSocket({
  useCaseId,
  onConnected,
  onDisconnected,
}: UseDiscoveryWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const {
    addChatMessage,
    addSystemMessage,
    appendStreamDelta,
    finaliseStreamingMessage,
    setIsStreaming,
    addLivedJTDs,
    addCognitiveJTDs,
    addProcessSteps,
    addDelegationCluster,
    markClustersReplaced,
    setClusterColumnHighlight,
    addActivityItem,
    completeActivityItem,
    clearActivityItems,
  } = useDiscoveryStore();

  const handleEvent = useCallback(
    (event: WSServerEvent) => {
      switch (event.type) {
        case "tool_call_started":
          addActivityItem(event.tool_name);
          break;

        case "tool_call_completed":
          completeActivityItem(event.tool_name, event.summary);
          break;

        case "text_delta":
          appendStreamDelta(event.delta);
          setIsStreaming(true);
          break;

        case "lived_jtds_proposed":
          addLivedJTDs(event.jtds);
          break;

        case "cognitive_jtds_proposed":
          addCognitiveJTDs(event.jtds);
          break;

        case "process_phases_proposed":
          addProcessSteps(event.phases);
          break;

        case "cluster_proposed":
          addDelegationCluster(event.cluster);
          break;

        case "message_complete":
          finaliseStreamingMessage(event.message_id);
          clearActivityItems();
          break;

        case "system_notification":
          addSystemMessage(event.text);
          if (event.highlight === "clusters") {
            setClusterColumnHighlight(true);
            setTimeout(() => setClusterColumnHighlight(false), 2000);
          }
          break;

        case "clusters_replaced":
          markClustersReplaced();
          break;

        case "error":
          console.error("[Discovery WS] Agent error:", event.message);
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
      addLivedJTDs,
      addCognitiveJTDs,
      addProcessSteps,
      addDelegationCluster,
      markClustersReplaced,
      setClusterColumnHighlight,
      addSystemMessage,
      finaliseStreamingMessage,
      addChatMessage,
      addActivityItem,
      completeActivityItem,
      clearActivityItems,
    ]
  );

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (!useCaseId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = buildWsUrl(useCaseId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      onConnected?.();
    };

    ws.onmessage = (ev) => {
      if (!mountedRef.current) return;
      try {
        const parsed: WSServerEvent = JSON.parse(ev.data);
        handleEvent(parsed);
      } catch (e) {
        console.error("[Discovery WS] Failed to parse event:", e);
      }
    };

    ws.onerror = (e) => {
      console.error("[Discovery WS] WebSocket error:", e);
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      onDisconnected?.();
      setIsStreaming(false);
      // Reconnect after 3s if still mounted
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

  /** Send a user text message over the WebSocket. */
  const sendMessage = useCallback(
    (text: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        console.warn("[Discovery WS] WebSocket not open — message dropped");
        return;
      }
      wsRef.current.send(
        JSON.stringify({ type: "user_message", content: text })
      );
    },
    []
  );

  /** Notify the agent that a file has been uploaded and processed. */
  const notifyFileProcessed = useCallback((rawInputId: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn("[Discovery WS] WebSocket not open — file event dropped");
      return;
    }
    wsRef.current.send(
      JSON.stringify({ type: "file_processed", raw_input_id: rawInputId })
    );
  }, []);

  return { sendMessage, notifyFileProcessed };
}
