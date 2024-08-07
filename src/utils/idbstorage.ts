import { del, get, set } from "idb-keyval";

const idbStorage = (name, version, migrate, keys) => ({
  name: name,
  storage: {
    getItem: (key) => {
      const val = get(key);
      if (val === undefined) {
        return null;
      }
      return val;
    },
    setItem: set,
    removeItem: del,
  },
  version,
  migrate,
  partialize: (state) =>
    Object.fromEntries(
      Object.entries(state).filter(([key]) => keys.includes(key)),
    ),
});

export default idbStorage;
