import { create } from "zustand";
import { persist } from "zustand/middleware";

import fastClone from "@utils/fastClone";
import "@utils/game.js";
import idbStorage from "@utils/idbstorage";

const persistence = idbStorage(
  "items",
  7,
  (inPersistedState, version) => {
    const persistedState = fastClone(inPersistedState);
    try {
      // Explosion effects were wrong order
      if (version === 0) {
        for (const [key, val] of Object.entries(
          persistedState.explosioneffects,
        )) {
          persistedState.explosioneffects[val] = key;
          delete persistedState.explosioneffects[key];
        }
      }
      // Incorrect migration
      if (version < 3) {
        for (const [key, val] of Object.entries(
          persistedState.explosioneffects,
        )) {
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
      // We didn't create new entries before v7, but we have to do it before v6 migration because it relies on them
      if (version < 7) {
        if (!persistedState.zoomCrosshairs) {
          persistedState.zoomCrosshairs = {};
        }
        if (!persistedState.crosshairScales) {
          persistedState.crosshairScales = {};
        }
        if (!persistedState.crosshairColors) {
          persistedState.crosshairColors = {};
        }
        if (!persistedState.playerexplosions) {
          persistedState.playerexplosions = {};
        }
        if (!persistedState.crosshairScales) {
          persistedState.crosshairScales = {};
        }
      }
      // Removing blocked items which were added post release
      if (version < 6) {
        for (const blockedItem of blockedItems) {
          delete persistedState.crosshairs[blockedItem];
          delete persistedState.crosshairColors[blockedItem];
          delete persistedState.crosshairScales[blockedItem];
          delete persistedState.zoomCrosshairs[blockedItem];
          persistedState.muzzleflashes.delete(blockedItem);
          persistedState.brassmodels.delete(blockedItem);
          persistedState.tracers.delete(blockedItem);
          delete persistedState.explosioneffects[blockedItem];
          delete persistedState.playerexplosions[blockedItem];
        }
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
    return persistedState;
  },
  [
    "crosshairs",
    "crosshairColors",
    "crosshairScales",
    "zoomCrosshairs",
    "muzzleflashes",
    "brassmodels",
    "tracers",
    "explosioneffects",
    "playerexplosions",
  ],
);

const useStore = create(
  persist(
    (set) => ({
      crosshairs: {},
      zoomCrosshairs: {},
      crosshairColors: {},
      crosshairScales: {},
      muzzleflashes: new Set(),
      brassmodels: new Set(),
      tracers: new Set(),
      explosioneffects: {},
      playerexplosions: {},
      clearAllItems: () =>
        set((state) => {
          state.crosshairs = {};
          state.crosshairColors = {};
          state.crosshairScales = {};
          state.zoomCrosshairs = {};
          state.muzzleflashes = new Set();
          state.brassmodels = new Set();
          state.tracers = new Set();
          state.explosioneffects = {};
          state.playerexplosions = {};
          return state;
        }),
      setCrosshair: (k, v) =>
        set((state) => ({ crosshairs: { ...state.crosshairs, [k]: v } })),
      delCrosshair: (k) =>
        set((state) => {
          const crosshairs = {
            ...state.crosshairs,
          };
          delete crosshairs[k];
          return { crosshairs };
        }),
      setCrosshairColor: (k, v) =>
        set((state) => ({
          crosshairColors: { ...state.crosshairColors, [k]: v },
        })),
      delCrosshairColor: (k) =>
        set((state) => {
          const crosshairColors = {
            ...state.crosshairColors,
          };
          delete crosshairColors[k];
          return { crosshairColors };
        }),
      setCrosshairScale: (k, v) => {
        set((state) => ({
          crosshairScales: { ...state.crosshairScales, [k]: v },
        }));
      },
      delCrosshairScale: (k) =>
        set((state) => {
          const crosshairScales = {
            ...state.crosshairScales,
          };
          delete crosshairScales[k];
          return { crosshairScales };
        }),
      setZoomCrosshair: (k, v) =>
        set((state) => ({
          zoomCrosshairs: { ...state.zoomCrosshairs, [k]: v },
        })),
      delZoomCrosshair: (k) =>
        set((state) => {
          const zoomCrosshairs = {
            ...state.zoomCrosshairs,
          };
          delete zoomCrosshairs[k];
          return { zoomCrosshairs };
        }),
      setMuzzleFlash: (k) =>
        set((state) => {
          const muzzleflashes = new Set(state.muzzleflashes);
          muzzleflashes.add(k);
          return { muzzleflashes };
        }),
      delMuzzleFlash: (k) =>
        set((state) => {
          const muzzleflashes = new Set(state.muzzleflashes);
          muzzleflashes.delete(k);
          return { muzzleflashes };
        }),
      setBrassModel: (k) =>
        set((state) => {
          const brassmodels = new Set(state.brassmodels);
          brassmodels.add(k);
          return { brassmodels };
        }),
      delBrassModel: (k) =>
        set((state) => {
          const brassmodels = new Set(state.brassmodels);
          brassmodels.delete(k);
          return { brassmodels };
        }),
      setTracer: (k) =>
        set((state) => {
          const tracers = new Set(state.tracers);
          tracers.add(k);
          return { tracers };
        }),
      delTracer: (k) =>
        set((state) => {
          const tracers = new Set(state.tracers);
          tracers.delete(k);
          return { tracers };
        }),
      setExplosionEffect: (k, v) =>
        set((state) => ({
          explosioneffects: { ...state.explosioneffects, [k]: v },
        })),
      delExplosionEffect: (k) =>
        set((state) => {
          const explosioneffects = {
            ...state.explosioneffects,
          };
          delete explosioneffects[k];
          return { explosioneffects };
        }),
      setPlayerExplosionEffect: (k, v) =>
        set((state) => ({
          playerexplosions: { ...state.playerexplosions, [k]: v },
        })),
      delPlayerExplosionEffect: (k) =>
        set((state) => {
          const playerexplosions = {
            ...state.playerexplosions,
          };
          delete playerexplosions[k];
          return { playerexplosions };
        }),
    }),
    persistence,
  ),
);

export default useStore;
