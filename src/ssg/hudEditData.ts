import { fetchCacheText } from "./fetchCache";

const supportedHuds = [
  "berryhud",
  "budhud",
  "eve-plus",
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
  "https://raw.githubusercontent.com/CriticalFlaw/TF2HUD.Editor/master/src/HUDEditor/JSON/";

const hudDataUrl = (hud: string) => `${baseDataUrl}${hud}.json`;

async function getEditData(hud: string): Promise<[string, any] | null> {
  try {
    const textData = await fetchCacheText(hudDataUrl(hud));
    // https://stackoverflow.com/a/62945875
    const data = JSON.parse(
      textData.replace(
        /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
        (m, g) => (g ? "" : m),
      ),
    );
    return [hudIdMap[hud] ?? hud, data];
  } catch (err) {
    console.error(`Could not get edit data for HUD ${hud}`, err);
  }
  return null;
}

let hudEditData: Record<string, any> | null = null;

export async function getHudEditData() {
  if (hudEditData) {
    return hudEditData;
  }

  const allDataPromises = supportedHuds.concat(sharedDataName).map(getEditData);

  const resolved = await Promise.all(allDataPromises);
  hudEditData = Object.fromEntries(resolved.filter((e) => e !== null));
  return hudEditData;
}
