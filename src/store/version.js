import { create } from "zustand";

const useStore = create(set => ({
  value: "latest",
  update: (v) => set({ value: v }),
}));


export default useStore;