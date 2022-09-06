import create from "zustand";
import { persist } from 'zustand/middleware';
import idbStorage from "../utils/idbstorage";

const useStore = create(
  persist(
    set => ({
      crosshairs: {},
      muzzleflashes: new Set(),
      brassmodels: new Set(),
      tracers: new Set(),
      explosioneffects: {},
      playerexplosioneffects: {},
      setCrosshair: (k, v) => set((state) => ({ crosshairs: {...state.crosshairs, [k]: v} })),
      delCrosshair: (k) => set((state) => {
        delete state.crosshairs[k];
        return state;
      }),
      setMuzzleFlash: (k) => set((state) => { state.muzzleflashes.add(k); return state; }),
      delMuzzleFlash: (k) => set((state) => { state.muzzleflashes.delete(k); return state; }),
      setBrassModel: (k) => set((state) => { state.brassmodels.add(k); return state; }),
      delBrassModel: (k) => set((state) => { state.brassmodels.delete(k); return state; }),
      setTracer: (k) => set((state) => { state.tracers.add(k); return state; }),
      delTracer: (k) => set((state) => { state.tracers.delete(k); return state; }),
      setExplosionEffect: (k, v) => set((state) => ({ explosioneffects: {...state.explosioneffects, [k]: v} })),
      delExplosionEffect: (k) => set((state) => {
        delete state.explosioneffects[k];
        return state;
      }),
      setPlayerExplosionEffect: (k, v) => set((state) => ({ playerexplosioneffects: {...state.playerexplosioneffects, [k]: v} })),
      delPlayerExplosionEffect: (k) => set((state) => {
        delete state.playerexplosioneffects[k];
        return state;
      }),
    }),
    idbStorage("items", 4, (persistedState, version) => {
      // Explosion effects were wrong order
      if (version === 0) {
        for (const [key, val] of Object.entries(persistedState.explosioneffects)) {
          persistedState.explosioneffects[val] = key;
          delete persistedState.explosioneffects[key];
        }
      }
      // Incorrect migration
      if (version < 3) {
        for (const [key, val] of Object.entries(persistedState.explosioneffects)) {
          persistedState.explosioneffects[val] = explosionEffects[key];
          delete persistedState.explosioneffects[key];
        }
      }
      // Adding crosshair pack groups
      if (version < 4) {
        for (const [key, val] of Object.entries(persistedState.crosshairs)) {
          persistedState.crosshairs[key] = `Valve.${val}`;
        }
      }
      return persistedState;
    },
    ["crosshairs", "muzzleflashes", "brassmodels", "tracers", "explosioneffects", "playerexplosioneffects"])
  )
);

export default useStore;
