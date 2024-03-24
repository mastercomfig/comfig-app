import gm from "@utils/game.js";
import { fetchCache } from "./fetchCache";

export function getAppVersion() {
  const npmVersion = process.env.npm_package_version;
  return npmVersion;
}

let appData = null;

export async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  );
  return Array.from(new Uint32Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getAppData() {
  if (!appData) {
    appData = await fetchCache("https://api.comfig.app/");
  }

  const hash = await sha256(JSON.stringify(appData));

  return {
    appData,
    hash,
  };
}

let hasInit = false;

export async function getGameData() {
  if (!hasInit) {
    await gm.initGameData();
  }
  const clientLanguageCache = {};
  for (const lang of Object.keys(gm.languageCache)) {
    let langCache = {};
    for (const playerClass of Object.keys(itemUsedBy)) {
      const classItems = itemUsedBy[playerClass];
      for (const item of classItems) {
        const itemData = gm.items[item];
        let key = itemData.printname;
        if (classNameToName[itemData.classname]) {
          key = classNameToName[itemData.classname];
        }
        if (Array.isArray(key)) {
          for (const k of key) {
            key = k.substring(1);
            langCache[key] = gm.languageCache[lang][key];
          }
        } else if (key.startsWith("#")) {
          key = key.substring(1);
          langCache[key] = gm.languageCache[lang][key];
        }
      }
    }
    clientLanguageCache[lang] = langCache;
  }

  const gameData = {
    languageCache: clientLanguageCache,
    items: gm.items,
  };

  const hash = await sha256(JSON.stringify(gameData));

  return {
    gameData,
    hash,
  };
}
