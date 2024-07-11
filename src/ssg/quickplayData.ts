import { getImage } from "astro:assets";

import { sha256 } from "./appData";
import { fetchCache } from "./fetchCache";

let quickplayData: any = null;

export async function getQuickplayData() {
  if (!quickplayData) {
    const rawData = await fetchCache(
      "https://worker.comfig.app/api/schema/get",
      {
        method: "POST",
      },
    );
    const thumbnails = rawData.map_thumbnails;
    const newThumbnails = {};
    for (const [map, thumbnail] of Object.entries(thumbnails)) {
      const optimizedImage = await getImage({
        src: thumbnail,
        inferSize: true,
        format: "webp",
      });
      newThumbnails[map] = optimizedImage.src;
    }
    quickplayData = {
      map_thumbnails: newThumbnails,
    };
  }

  const hash = await sha256(JSON.stringify(quickplayData));

  return {
    quickplayData,
    hash,
  };
}
