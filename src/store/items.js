import create from "zustand";
import { persist } from 'zustand/middleware';
import idbStorage from "../utils/idbstorage";

const useStore = create(
  persist(
    set => ({
      crosshairs: {},
      putCrosshair: (k, v) => set((state) => ({ crosshairs: {...state.crosshairs, [k]: v} })),
      delCrosshair: (k) => set((state) => {
        delete state.crosshairs[k];
        return state;
      }),
    }),
    idbStorage("items", ["crosshairs"])
  )
);

export default useStore;
