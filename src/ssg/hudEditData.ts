import { fetchCacheText } from "./fetchCache";

const supportedHuds = [
  "berryhud",
  "budhud",
  "flawhud",
  "hexhud",
  "hud-fixes",
  "hypnotize-hud",
  "kbnhud",
  "m0rehud",
  "rayshud",
  "sunsethud",
  "zeeshud",
];

export const sharedDataName = "shared-hud";

const hudIdMap = {
  "hypnotize-hud": "hypnotizehud",
};

const baseDataUrl =
  "https://raw.githubusercontent.com/CriticalFlaw/TF2HUD.Editor/master/src/TF2HUD.Editor/JSON/";

const hudDataUrl = (hud) => `${baseDataUrl}${hud}.json`;

async function getEditData(hud) {
  const textData = await fetchCacheText(hudDataUrl(hud));
  // https://stackoverflow.com/a/62945875
  const data = JSON.parse(
    textData.replace(
      /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
      (m, g) => (g ? "" : m),
    ),
  );
  return [hudIdMap[hud] ?? hud, data];
}

let hudEditData = null;

export async function getHudEditData() {
  if (hudEditData) {
    return hudEditData;
  }

  const allDataPromises = supportedHuds.concat(sharedDataName).map(getEditData);

  const resolved = await Promise.all(allDataPromises);
  hudEditData = Object.fromEntries(resolved);
  return hudEditData;
}
