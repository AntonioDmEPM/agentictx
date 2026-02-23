import { create } from "zustand";
import type { BusinessCase } from "@/types/business_case";

interface BusinessCaseState {
  businessCase: BusinessCase | null;
  isCalculating: boolean;
  isExporting: boolean;

  // Actions
  hydrate: (bc: BusinessCase) => void;
  setIsCalculating: (v: boolean) => void;
  setIsExporting: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  businessCase: null,
  isCalculating: false,
  isExporting: false,
};

export const useBusinessCaseStore = create<BusinessCaseState>((set) => ({
  ...initialState,

  hydrate: (bc) => set({ businessCase: bc }),

  setIsCalculating: (v) => set({ isCalculating: v }),

  setIsExporting: (v) => set({ isExporting: v }),

  reset: () => set(initialState),
}));
