import create from "zustand";

const useStore = create(set => ({
  crosshairs: {},
  putCrosshair: (k, v) => set((state) => ({ crosshairs: {...state.crosshairs, [k]: v} })),
}));

export default useStore;
