import { create } from "zustand";
import type {
  ChatMessage,
  CognitiveJTD,
  DelegationCluster,
  LivedJTD,
  ProcessFlow,
  ProcessStep,
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

  // Process visualisation
  processFlow: ProcessFlow | null;

  // Cluster column highlight (pulse animation)
  clusterColumnHighlight: boolean;

  // Clustering banner guard — true once the auto-prompt has fired, prevents re-fire
  clusteringProposed: boolean;

  // Scroll-to-message provenance navigation
  scrollToMessageId: string | null;

  // Extraction activity strip
  activityItems: Array<{ tool_name: string; status: "running" | "done"; summary?: string }>;
  addActivityItem: (tool_name: string) => void;
  completeActivityItem: (tool_name: string, summary: string) => void;
  clearActivityItems: () => void;

  // Cluster selection highlighting
  selectedClusterId: string | null;
  setSelectedClusterId: (id: string | null) => void;

  // Actions — conversation
  addChatMessage: (msg: ChatMessage) => void;
  addSystemMessage: (text: string) => void;
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
  markClustersReplaced: () => void;

  // Cluster highlight & guard
  setClusterColumnHighlight: (v: boolean) => void;
  setClusteringProposed: (v: boolean) => void;

  // Provenance scroll
  setScrollToMessageId: (id: string | null) => void;

  // Process flow
  setProcessFlow: (flow: ProcessFlow | null) => void;
  addProcessSteps: (steps: ProcessStep[]) => void;

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
  processFlow: null as ProcessFlow | null,
  clusterColumnHighlight: false,
  clusteringProposed: false,
  scrollToMessageId: null as string | null,
  selectedClusterId: null as string | null,
  activityItems: [] as Array<{ tool_name: string; status: "running" | "done"; summary?: string }>,
};

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  ...initialState,

  // ── Conversation ──────────────────────────────────────────────────────────

  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),

  addSystemMessage: (text) =>
    set((s) => ({
      chatMessages: [
        ...s.chatMessages,
        { id: `system-${Date.now()}`, role: "system" as const, text },
      ],
    })),

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
    set((s) => {
      const remaining = s.delegationClusters.filter((c) => c.id !== id);
      const hasActive = remaining.some((c) => c.status !== "replaced");
      return {
        delegationClusters: remaining,
        ...(hasActive ? {} : { clusteringProposed: false }),
      };
    }),

  markClustersReplaced: () =>
    set((s) => ({
      delegationClusters: s.delegationClusters.map((c) =>
        c.status !== "replaced" ? { ...c, status: "replaced" as const } : c
      ),
    })),

  // ── Cluster Highlight & Provenance ────────────────────────────────────────

  setClusterColumnHighlight: (v) => set({ clusterColumnHighlight: v }),

  setClusteringProposed: (v) => set({ clusteringProposed: v }),

  setScrollToMessageId: (id) => set({ scrollToMessageId: id }),

  setSelectedClusterId: (id) => set({ selectedClusterId: id }),

  // ── Activity strip ─────────────────────────────────────────────────────────

  addActivityItem: (tool_name) =>
    set((s) => {
      // No-op if already running with same tool_name
      if (s.activityItems.some((i) => i.tool_name === tool_name && i.status === "running")) {
        return s;
      }
      return { activityItems: [...s.activityItems, { tool_name, status: "running" as const }] };
    }),

  completeActivityItem: (tool_name, summary) =>
    set((s) => {
      const idx = s.activityItems.findIndex(
        (i) => i.tool_name === tool_name && i.status === "running"
      );
      if (idx === -1) return s;
      const updated = [...s.activityItems];
      updated[idx] = { ...updated[idx], status: "done" as const, summary };
      return { activityItems: updated };
    }),

  clearActivityItems: () => set({ activityItems: [] }),

  // ── Process Flow ──────────────────────────────────────────────────────────

  setProcessFlow: (flow) => set({ processFlow: flow }),

  addProcessSteps: (steps) =>
    set((s) => {
      const flow = s.processFlow ?? {
        use_case_id: "",
        steps: [],
        cluster_steps: [],
      };
      return {
        processFlow: {
          ...flow,
          steps: [...flow.steps, ...steps],
        },
      };
    }),

  // ── Hydrate ───────────────────────────────────────────────────────────────

  hydrate: ({ livedJTDs, cognitiveJTDs, delegationClusters, chatMessages }) =>
    set({
      livedJTDs,
      cognitiveJTDs,
      delegationClusters,
      chatMessages,
      clusteringProposed: delegationClusters.some((c) => c.status !== "replaced"),
    }),

  // ── Reset ─────────────────────────────────────────────────────────────────

  reset: () => set(initialState),
}));
