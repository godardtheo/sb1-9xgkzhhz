import { create } from 'zustand';

type ProgramsStoreState = {
  needsRefresh: boolean;
  setNeedsRefresh: (value: boolean) => void;
};

export const useProgramsStore = create<ProgramsStoreState>((set) => ({
  needsRefresh: false,
  setNeedsRefresh: (value) => set({ needsRefresh: value }),
}));