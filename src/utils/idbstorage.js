import { get, set, del } from "idb-keyval";

const idbStorage = (name, version, migrate, keys) => ({
  name: name,
  storage: {
    getItem: get,
    setItem: set,
    removeItem: del,
  },
  version,
  migrate,
  partialize: (state) =>
    Object.fromEntries(
      Object.entries(state).filter(([key]) => keys.includes(key))
    ),
});

export default idbStorage;
