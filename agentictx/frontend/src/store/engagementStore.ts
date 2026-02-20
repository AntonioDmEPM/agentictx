import { create } from "zustand";
import type { EngagementListItem } from "@/types";

interface EngagementState {
  activeEngagementId: string | null;
  activeUseCaseId: string | null;
  engagements: EngagementListItem[];
  setActiveEngagement: (id: string | null) => void;
  setActiveUseCase: (id: string | null) => void;
  setEngagements: (items: EngagementListItem[]) => void;
}

export const useEngagementStore = create<EngagementState>((set) => ({
  activeEngagementId: null,
  activeUseCaseId: null,
  engagements: [],
  setActiveEngagement: (id) =>
    set({ activeEngagementId: id, activeUseCaseId: null }),
  setActiveUseCase: (id) => set({ activeUseCaseId: id }),
  setEngagements: (items) => set({ engagements: items }),
}));
