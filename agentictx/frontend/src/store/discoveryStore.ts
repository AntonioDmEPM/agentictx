import { create } from "zustand";
import type {
  Activity,
  AgentScope,
  ChatMessage,
  CognitiveLoad,
  ProcessFlow,
  Phase,
} from "@/types/discovery";

interface DiscoveryState {
  // Conversation panel
  chatMessages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;

  // Cognitive map columns — fed by WS events and API loads
  activities: Activity[];
  cognitiveLoadItems: CognitiveLoad[];
  agentScopes: AgentScope[];

  // Process visualisation
  processFlow: ProcessFlow | null;

  // Scope column highlight (pulse animation)
  scopeColumnHighlight: boolean;

  // Clustering banner guard — true once the auto-prompt has fired, prevents re-fire
  clusteringProposed: boolean;

  // Scroll-to-message provenance navigation
  scrollToMessageId: string | null;

  // Extraction activity strip
  activityItems: Array<{ tool_name: string; status: "running" | "done"; summary?: string }>;
  addActivityItem: (tool_name: string) => void;
  completeActivityItem: (tool_name: string, summary: string) => void;
  clearActivityItems: () => void;

  // Agent scope selection highlighting
  selectedScopeId: string | null;
  setSelectedScopeId: (id: string | null) => void;

  // Actions — conversation
  addChatMessage: (msg: ChatMessage) => void;
  addSystemMessage: (text: string) => void;
  appendStreamDelta: (delta: string) => void;
  finaliseStreamingMessage: (messageId: string) => void;
  setIsStreaming: (v: boolean) => void;

  // Actions — map columns
  addActivities: (items: Activity[]) => void;
  updateActivity: (item: Activity) => void;
  removeActivity: (id: string) => void;

  addCognitiveLoadItems: (items: CognitiveLoad[]) => void;
  updateCognitiveLoad: (item: CognitiveLoad) => void;
  removeCognitiveLoad: (id: string) => void;

  addAgentScope: (scope: AgentScope) => void;
  updateAgentScope: (scope: AgentScope) => void;
  removeAgentScope: (id: string) => void;
  markScopesReplaced: () => void;

  // Scope highlight & guard
  setScopeColumnHighlight: (v: boolean) => void;
  setClusteringProposed: (v: boolean) => void;

  // Provenance scroll
  setScrollToMessageId: (id: string | null) => void;

  // Process flow
  setProcessFlow: (flow: ProcessFlow | null) => void;
  addProcessSteps: (steps: Phase[]) => void;

  // Hydrate from full map API response
  hydrate: (data: {
    activities: Activity[];
    cognitiveLoadItems: CognitiveLoad[];
    agentScopes: AgentScope[];
    chatMessages: ChatMessage[];
  }) => void;

  // Reset when navigating away
  reset: () => void;
}

const initialState = {
  chatMessages: [],
  streamingText: "",
  isStreaming: false,
  activities: [],
  cognitiveLoadItems: [],
  agentScopes: [],
  processFlow: null as ProcessFlow | null,
  scopeColumnHighlight: false,
  clusteringProposed: false,
  scrollToMessageId: null as string | null,
  selectedScopeId: null as string | null,
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

  // ── Activities ─────────────────────────────────────────────────────────────

  addActivities: (items) =>
    set((s) => ({ activities: [...s.activities, ...items] })),

  updateActivity: (item) =>
    set((s) => ({
      activities: s.activities.map((j) => (j.id === item.id ? item : j)),
    })),

  removeActivity: (id) =>
    set((s) => ({ activities: s.activities.filter((j) => j.id !== id) })),

  // ── Cognitive Load Items ──────────────────────────────────────────────────

  addCognitiveLoadItems: (items) =>
    set((s) => ({ cognitiveLoadItems: [...s.cognitiveLoadItems, ...items] })),

  updateCognitiveLoad: (item) =>
    set((s) => ({
      cognitiveLoadItems: s.cognitiveLoadItems.map((j) => (j.id === item.id ? item : j)),
    })),

  removeCognitiveLoad: (id) =>
    set((s) => ({ cognitiveLoadItems: s.cognitiveLoadItems.filter((j) => j.id !== id) })),

  // ── Agent Scopes ──────────────────────────────────────────────────────────

  addAgentScope: (scope) =>
    set((s) => ({ agentScopes: [...s.agentScopes, scope] })),

  updateAgentScope: (scope) =>
    set((s) => ({
      agentScopes: s.agentScopes.map((c) =>
        c.id === scope.id ? scope : c
      ),
    })),

  removeAgentScope: (id) =>
    set((s) => {
      const remaining = s.agentScopes.filter((c) => c.id !== id);
      const hasActive = remaining.some((c) => c.status !== "replaced");
      return {
        agentScopes: remaining,
        ...(hasActive ? {} : { clusteringProposed: false }),
      };
    }),

  markScopesReplaced: () =>
    set((s) => ({
      agentScopes: s.agentScopes.map((c) =>
        c.status !== "replaced" ? { ...c, status: "replaced" as const } : c
      ),
    })),

  // ── Scope Highlight & Provenance ──────────────────────────────────────────

  setScopeColumnHighlight: (v) => set({ scopeColumnHighlight: v }),

  setClusteringProposed: (v) => set({ clusteringProposed: v }),

  setScrollToMessageId: (id) => set({ scrollToMessageId: id }),

  setSelectedScopeId: (id) => set({ selectedScopeId: id }),

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

  hydrate: ({ activities, cognitiveLoadItems, agentScopes, chatMessages }) =>
    set({
      activities,
      cognitiveLoadItems,
      agentScopes,
      chatMessages,
      clusteringProposed: agentScopes.some((c) => c.status !== "replaced"),
    }),

  // ── Reset ─────────────────────────────────────────────────────────────────

  reset: () => set(initialState),
}));
