import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { discoveryApi } from "@/api/discovery";
import { useDiscoveryStore } from "@/store/discoveryStore";
import { useDiscoveryWebSocket } from "./hooks/useDiscoveryWebSocket";
import { InputPanel } from "./InputPanel";
import { CognitiveMapPanel } from "./CognitiveMapPanel";
import type { ConversationMessage } from "@/types/discovery";

function extractText(blocks: ConversationMessage["content"]): string {
  if (!Array.isArray(blocks)) return String(blocks);
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
}

export function DiscoveryModule() {
  const { useCaseId } = useParams<{ id: string; useCaseId: string }>();
  const { hydrate, reset } = useDiscoveryStore();

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
      livedJTDs: mapData.lived_jtds,
      cognitiveJTDs: mapData.cognitive_jtds,
      delegationClusters: mapData.delegation_clusters,
      chatMessages: mapData.conversation_messages.map((m) => ({
        id: m.id,
        role: m.role,
        text: extractText(m.content),
      })),
    });
  }, [mapData, hydrate]);

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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — Input & Conversation (40%) */}
      <div className="w-2/5 shrink-0 flex flex-col overflow-hidden">
        <InputPanel
          useCaseId={useCaseId}
          sendMessage={sendMessage}
          notifyFileProcessed={notifyFileProcessed}
        />
      </div>

      {/* Right panel — Cognitive Map (60%) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Panel header */}
        <div className="px-5 py-3 border-b border-bg-border shrink-0">
          <h2 className="text-sm font-medium font-ui uppercase tracking-wider text-text-secondary">
            Cognitive Map
          </h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <CognitiveMapPanel useCaseId={useCaseId} />
        </div>
      </div>
    </div>
  );
}
