import gm from "@utils/game.ts";

import { fetchCache } from "./fetchCache";

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
    appData = await fetchCache(
      import.meta.env.COMFIG_API_URL ?? "https://api.comfig.app/",
      {
        headers: {
          Authorization: "EsohjoaThatooloaj1GuN0Pooc4Dah9eedee6zoa",
        },
      },
    );
  }

  const hash = await sha256(JSON.stringify(appData));

  return {
    appData,
    hash,
  };
}

let hasInit = false;

async function initItemData(gameData) {
  const clientLanguageCache = {};
  for (const lang of Object.keys(gm.languageCache)) {
    const langCache = {};
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

  gameData["languageCache"] = clientLanguageCache;
  gameData["items"] = gm.items;
}

async function initCrosshairData(gameData) {
  const dynamicCrosshairPacks = {};
  const dynamicCrosshairPackGroups = {
    Misc: [],
  };
  const crosshairsWithGroups = new Set();
  for (const group of Object.values(crosshairPackGroups)) {
    for (const crosshair of group) {
      crosshairsWithGroups.add(crosshair);
    }
  }
  if (typeof self === "undefined") {
    const fs = await import("node:fs/promises");
    const files = await fs.readdir("./public/assets/app/crosshairs");
    for (const file of files) {
      if (!file.endsWith(".vtf")) {
        continue;
      }
      const name = file.split(".")[0];
      if (!(name in crosshairPacks)) {
        dynamicCrosshairPacks[name] = {
          _0_0: {
            name,
          },
        };
      }
      if (!crosshairsWithGroups.has(name)) {
        dynamicCrosshairPackGroups["Misc"].push(name);
      }
    }
  }

  gameData["dynamicCrosshairPacks"] = dynamicCrosshairPacks;
  gameData["dynamicCrosshairPackGroups"] = dynamicCrosshairPackGroups;
}

export async function getGameData() {
  if (!hasInit) {
    await gm.initGameData();
    hasInit = true;
  }

  const gameData = {};

  await initItemData(gameData);
  await initCrosshairData(gameData);

  const hash = await sha256(JSON.stringify(gameData));

  return {
    gameData,
    hash,
  };
}
