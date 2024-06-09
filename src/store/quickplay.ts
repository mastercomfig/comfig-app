import { create } from "zustand";
import { persist } from "zustand/middleware";

import idbStorage from "@utils/idbstorage";

const useStore = create(
  persist(
    (set) => ({
      recentServers: {},
      setRecentServer: (k, v) =>
        set((state) => ({ recentServers: { ...state.recentServers, [k]: v } })),
      maxPlayerCap: [24, 32],
      setMaxPlayerCap: (cap) => set(() => ({ maxPlayerCap: cap })),
      gamemode: "any",
      setGamemode: (gamemode) => set(() => ({ gamemode })),
      respawntimes: 0,
      setRespawnTimes: (respawntimes) => set(() => ({ respawntimes })),
      crits: -1,
      setCrits: (crits) => set(() => ({ crits })),
      beta: -1,
      setBeta: (beta) => set(() => ({ beta })),
      blocklist: new Set([]),
      addBlocklist: (steamid) =>
        set((state) => {
          state.blocklist.add(steamid);
          return state.blocklist;
        }),
      pinglimit: -1,
      setPingLimit: (pinglimit) => set(() => ({ pinglimit })),
    }),
    idbStorage("quickplay", 1, (persistedState, version) => {}, [
      "recentServers",
      "maxPlayerCap",
      "gamemode",
      "respawntimes",
      "crits",
      "beta",
      "blocklist",
    ]),
  ),
);

export default useStore;
