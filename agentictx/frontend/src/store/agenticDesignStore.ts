import { create } from "zustand";
import type {
  AgentSpecification,
  CrossAgentOpportunity,
  DesignChatMessage,
} from "@/types/agentic_design";

interface AgenticDesignState {
  // Conversation panel
  chatMessages: DesignChatMessage[];
  streamingText: string;
  isStreaming: boolean;

  // Agent specifications — fed by WS events and API loads
  agentSpecs: AgentSpecification[];

  // Cross-agent opportunities — surfaced by agent in real-time
  opportunities: CrossAgentOpportunity[];

  // Actions — conversation
  addChatMessage: (msg: DesignChatMessage) => void;
  appendStreamDelta: (delta: string) => void;
  finaliseStreamingMessage: (messageId: string) => void;
  setIsStreaming: (v: boolean) => void;

  // Actions — agent specs
  addAgentSpec: (spec: AgentSpecification) => void;
  updateAgentSpec: (spec: AgentSpecification) => void;
  removeAgentSpec: (id: string) => void;

  // Actions — opportunities
  addOpportunity: (opp: CrossAgentOpportunity) => void;

  // Hydrate from full map API response
  hydrate: (data: {
    agentSpecs: AgentSpecification[];
    opportunities: CrossAgentOpportunity[];
    chatMessages: DesignChatMessage[];
  }) => void;

  // Reset when navigating away
  reset: () => void;
}

const initialState = {
  chatMessages: [],
  streamingText: "",
  isStreaming: false,
  agentSpecs: [],
  opportunities: [],
};

export const useAgenticDesignStore = create<AgenticDesignState>((set, get) => ({
  ...initialState,

  // ── Conversation ──────────────────────────────────────────────────────────

  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),

  appendStreamDelta: (delta) =>
    set((s) => ({ streamingText: s.streamingText + delta })),

  finaliseStreamingMessage: (messageId) => {
    const { streamingText, chatMessages } = get();
    if (!streamingText) return;
    const finalisedMsg: DesignChatMessage = {
      id: messageId,
      role: "assistant",
      text: streamingText,
      streaming: false,
    };
    set({ chatMessages: [...chatMessages, finalisedMsg], streamingText: "", isStreaming: false });
  },

  setIsStreaming: (v) => set({ isStreaming: v }),

  // ── Agent Specs ───────────────────────────────────────────────────────────

  addAgentSpec: (spec) =>
    set((s) => ({ agentSpecs: [...s.agentSpecs, spec] })),

  updateAgentSpec: (spec) =>
    set((s) => ({
      agentSpecs: s.agentSpecs.map((s2) => (s2.id === spec.id ? spec : s2)),
    })),

  removeAgentSpec: (id) =>
    set((s) => ({ agentSpecs: s.agentSpecs.filter((s2) => s2.id !== id) })),

  // ── Opportunities ─────────────────────────────────────────────────────────

  addOpportunity: (opp) =>
    set((s) => ({
      opportunities: [...s.opportunities, opp],
    })),

  // ── Hydrate ───────────────────────────────────────────────────────────────

  hydrate: ({ agentSpecs, opportunities, chatMessages }) =>
    set({ agentSpecs, opportunities, chatMessages }),

  // ── Reset ─────────────────────────────────────────────────────────────────

  reset: () => set(initialState),
}));
