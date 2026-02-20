import { create } from "zustand";
import type {
  ChatMessage,
  CognitiveJTD,
  DelegationCluster,
  LivedJTD,
} from "@/types/discovery";

interface DiscoveryState {
  // Conversation panel
  chatMessages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;

  // Cognitive map columns — fed by WS events and API loads
  livedJTDs: LivedJTD[];
  cognitiveJTDs: CognitiveJTD[];
  delegationClusters: DelegationCluster[];

  // Actions — conversation
  addChatMessage: (msg: ChatMessage) => void;
  appendStreamDelta: (delta: string) => void;
  finaliseStreamingMessage: (messageId: string) => void;
  setIsStreaming: (v: boolean) => void;

  // Actions — map columns
  addLivedJTDs: (jtds: LivedJTD[]) => void;
  updateLivedJTD: (jtd: LivedJTD) => void;
  removeLivedJTD: (id: string) => void;

  addCognitiveJTDs: (jtds: CognitiveJTD[]) => void;
  updateCognitiveJTD: (jtd: CognitiveJTD) => void;
  removeCognitiveJTD: (id: string) => void;

  addDelegationCluster: (cluster: DelegationCluster) => void;
  updateDelegationCluster: (cluster: DelegationCluster) => void;
  removeDelegationCluster: (id: string) => void;

  // Hydrate from full map API response
  hydrate: (data: {
    livedJTDs: LivedJTD[];
    cognitiveJTDs: CognitiveJTD[];
    delegationClusters: DelegationCluster[];
    chatMessages: ChatMessage[];
  }) => void;

  // Reset when navigating away
  reset: () => void;
}

const initialState = {
  chatMessages: [],
  streamingText: "",
  isStreaming: false,
  livedJTDs: [],
  cognitiveJTDs: [],
  delegationClusters: [],
};

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  ...initialState,

  // ── Conversation ──────────────────────────────────────────────────────────

  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),

  appendStreamDelta: (delta) =>
    set((s) => ({ streamingText: s.streamingText + delta })),

  finaliseStreamingMessage: (messageId) => {
    const { streamingText, chatMessages } = get();
    if (!streamingText) return;
    const finalisedMsg: ChatMessage = {
      id: messageId,
      role: "assistant",
      text: streamingText,
      streaming: false,
    };
    set({ chatMessages: [...chatMessages, finalisedMsg], streamingText: "", isStreaming: false });
  },

  setIsStreaming: (v) => set({ isStreaming: v }),

  // ── Lived JTDs ────────────────────────────────────────────────────────────

  addLivedJTDs: (jtds) =>
    set((s) => ({ livedJTDs: [...s.livedJTDs, ...jtds] })),

  updateLivedJTD: (jtd) =>
    set((s) => ({
      livedJTDs: s.livedJTDs.map((j) => (j.id === jtd.id ? jtd : j)),
    })),

  removeLivedJTD: (id) =>
    set((s) => ({ livedJTDs: s.livedJTDs.filter((j) => j.id !== id) })),

  // ── Cognitive JTDs ────────────────────────────────────────────────────────

  addCognitiveJTDs: (jtds) =>
    set((s) => ({ cognitiveJTDs: [...s.cognitiveJTDs, ...jtds] })),

  updateCognitiveJTD: (jtd) =>
    set((s) => ({
      cognitiveJTDs: s.cognitiveJTDs.map((j) => (j.id === jtd.id ? jtd : j)),
    })),

  removeCognitiveJTD: (id) =>
    set((s) => ({ cognitiveJTDs: s.cognitiveJTDs.filter((j) => j.id !== id) })),

  // ── Delegation Clusters ───────────────────────────────────────────────────

  addDelegationCluster: (cluster) =>
    set((s) => ({ delegationClusters: [...s.delegationClusters, cluster] })),

  updateDelegationCluster: (cluster) =>
    set((s) => ({
      delegationClusters: s.delegationClusters.map((c) =>
        c.id === cluster.id ? cluster : c
      ),
    })),

  removeDelegationCluster: (id) =>
    set((s) => ({
      delegationClusters: s.delegationClusters.filter((c) => c.id !== id),
    })),

  // ── Hydrate ───────────────────────────────────────────────────────────────

  hydrate: ({ livedJTDs, cognitiveJTDs, delegationClusters, chatMessages }) =>
    set({ livedJTDs, cognitiveJTDs, delegationClusters, chatMessages }),

  // ── Reset ─────────────────────────────────────────────────────────────────

  reset: () => set(initialState),
}));
