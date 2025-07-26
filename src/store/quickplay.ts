import {
  getDefaultMatchGroupSettings,
  getDefaultMatchGroups,
} from "@ssg/quickplayStaticData";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import fastClone from "@utils/fastClone";
import idbStorage from "@utils/idbstorage";

const state = (set) => ({
  carousel: null,
  setCarousel: (carousel) => set(() => ({ carousel })),
  availableMatchGroups: getDefaultMatchGroups().filter((r) => r.active),
  setAvailableMatchGroups: (availableMatchGroups) =>
    set(() => ({ availableMatchGroups })),
  matchGroupSettings: getDefaultMatchGroupSettings(),
  setMatchGroupSettings: (matchGroupSettings) =>
    set(() => ({ matchGroupSettings })),
  customizing: 0,
  toggleCustomizing: () =>
    set((state) => ({ customizing: !state.customizing })),
  found: 0,
  setFound: (found) => set(() => ({ found })),
  lastServer: null,
  setLastServer: (lastServer) => set(() => ({ lastServer })),
  foundTime: 0,
  setFoundTime: (foundTime) => set(() => ({ foundTime })),
  findCount: 0,
  setFindCount: (findCount) => set(() => ({ findCount })),
  sessionCount: 0,
  setSessionCount: (sessionCount) => set(() => ({ sessionCount })),
  searching: 0,
  setSearching: (searching) => set(() => ({ searching })),
  showServers: false,
  setShowServers: (showServers) => set(() => ({ showServers })),
  recentServers: {},
  setRecentServer: (k, v) =>
    set((state) => ({ recentServers: { ...state.recentServers, [k]: v } })),
  removeRecentServer: (k) =>
    set((state) => {
      const recentServers = {
        ...state.recentServers,
      };
      delete recentServers[k];
      return { recentServers };
    }),
  maxPlayerCap: [24, 32],
  setMaxPlayerCap: (cap) => set(() => ({ maxPlayerCap: cap })),
  matchGroup: "pvp",
  setMatchGroup: (matchGroup) => set(() => ({ matchGroup })),
  gamemodes: new Set([
    "payload",
    "koth",
    "attack_defense",
    "ctf",
    "capture_point",
    "payload_race",
  ]),
  addGamemode: (gamemode) =>
    set((state) => {
      const gamemodes = new Set(state.gamemodes);
      gamemodes.add(gamemode);
      return { gamemodes };
    }),
  removeGamemode: (gamemode) =>
    set((state) => {
      const gamemodes = new Set(state.gamemodes);
      gamemodes.delete(gamemode);
      return { gamemodes };
    }),
  toggleGamemode: (gamemode) =>
    set((state) => {
      const gamemodes = new Set(state.gamemodes);
      if (gamemodes.has(gamemode)) {
        gamemodes.delete(gamemode);
      } else {
        gamemodes.add(gamemode);
      }
      return { gamemodes };
    }),
  clearGamemodes: () => set(() => ({ gamemodes: new Set([]) })),
  setGamemodes: (arr) => set(() => ({ gamemodes: new Set(arr) })),
  respawntimes: 0,
  setRespawnTimes: (respawntimes) => set(() => ({ respawntimes })),
  crits: -1,
  setCrits: (crits) => set(() => ({ crits })),
  beta: -1,
  setBeta: (beta) => set(() => ({ beta })),
  rtd: 0,
  setRtd: (rtd) => set(() => ({ rtd })),
  blocklist: new Set([]),
  addBlocklist: (steamid) =>
    set((state) => {
      const blocklist = new Set(state.blocklist);
      blocklist.add(steamid);
      return { blocklist };
    }),
  clearBlocklist: () => set(() => ({ blocklist: new Set([]) })),
  mapbanlist: [],
  addMapBan: (map, i) =>
    set((state) => {
      const mapbanlist = [...state.mapbanlist];
      if (mapbanlist.length <= i) {
        i = undefined;
      }
      if (i !== undefined) {
        mapbanlist[i] = map;
      } else if (mapbanlist.length < 6) {
        mapbanlist.push(map);
      }
      return { mapbanlist };
    }),
  delMapBan: (index) =>
    set((state) => {
      const mapbanlist = [...state.mapbanlist];
      mapbanlist.splice(index, 1);
      return { mapbanlist };
    }),
  favorites: new Set([]),
  addFavorite: (steamid) =>
    set((state) => {
      const favorites = new Set(state.favorites);
      favorites.add(steamid);
      return { favorites };
    }),
  pingmode: 1,
  setPingMode: (pingmode) => set(() => ({ pingmode })),
  pinglimit: 50,
  setPingLimit: (pinglimit) => set(() => ({ pinglimit })),
  partysize: 1,
  setPartySize: (partysize) => set(() => ({ partysize })),
  nocap: 0,
  setNoCap: (nocap) => set(() => ({ nocap })),
  classres: 1,
  setClassRes: (classres) => set(() => ({ classres })),
  pure: -1,
  setPure: (pure) => set(() => ({ pure })),
});

const useStore = create(
  persist(
    state,
    idbStorage(
      "quickplay",
      6,
      (inPersistedState, version) => {
        const persistedState = fastClone(inPersistedState);
        if (version < 2) {
          persistedState.pinglimit = 50;
        }
        if (version < 3) {
          persistedState.recentServers = {};
        }
        if (version < 4) {
          delete persistedState.gamemode;
        }
        if (version < 5) {
          delete persistedState.beta;
        }
        if (version < 6) {
          const mapbans = Array.from(persistedState["mapbans"]);
          persistedState.mapbanlist = mapbans.slice(0, 5);
        }
        return persistedState;
      },
      [
        "recentServers",
        "maxPlayerCap",
        "respawntimes",
        "crits",
        "beta",
        "rtd",
        "blocklist",
        "mapbanlist",
        "favorites",
        "pingmode",
        "pinglimit",
        "foundTime",
        "findCount",
        "nocap",
        "classres",
        "pure",
      ],
    ),
  ),
);

export default useStore;
