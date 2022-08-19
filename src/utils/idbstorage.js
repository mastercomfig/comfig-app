import {get, set, del} from "idb-keyval";

const idbStorage = (name, keys) => ({
  name: name,
  getStorage: () => ({
    getItem: get,
    setItem: set,
    removeItem: del,
  }),
  deserialize: (val) => val,
  serialize: (state) => state,
  partialize: (state) =>
  Object.fromEntries(
    Object.entries(state).filter(([key]) => keys.includes(key))
  )
})

export default idbStorage;