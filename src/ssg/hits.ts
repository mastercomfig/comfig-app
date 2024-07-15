import { shuffle } from "@utils/shuffle";

import hs from "./hitsounds.json";

const seed = new Date().toLocaleDateString();

export function getHitsounds(alpha?: boolean) {
  if (alpha) {
    return hs.hitsounds.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { ignorePunctuation: true }),
    );
  }
  return shuffle(hs.hitsounds, seed);
}

export function getKillsounds(alpha?: boolean) {
  if (alpha) {
    return hs.killsounds.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { ignorePunctuation: true }),
    );
  }
  return shuffle(hs.killsounds, seed);
}
