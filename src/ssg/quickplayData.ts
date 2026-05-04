
import { getImage } from "astro:assets";

import { sha256 } from "./appData";
import { fetchCache } from "./fetchCache";


let quickplayData: any = null;

async function optimizeThumbnailWithRetry(src: string, maxAttempts: number = 2): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const optimizedImage = await getImage({
        src,
        inferSize: true,
        format: "webp",
      });
      return optimizedImage.src;
    } catch (e) {
      if (attempt === maxAttempts) {
        console.warn(`[Thumbnail Optimize] inferSize failed for ${src} after ${maxAttempts} attempts`);
      } else {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const optimizedImage = await getImage({
        src,
        width: 800,
        height: 600,
        format: "webp",
      });
      return optimizedImage.src;
    } catch (e) {
      if (attempt === maxAttempts) {
        console.warn(`[Thumbnail Optimize] explicit size failed for ${src} after ${maxAttempts} attempts`);
      } else {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  console.warn(`[Thumbnail Optimize] Falling back to raw URL for ${src}`);
  return src;
}

export async function getQuickplayData() {
  if (!quickplayData) {
    const rawData = await fetchCache(
      `${import.meta.env.COMFIG_WORKER_URL ?? "https://worker.comfig.app/"}api/schema/get`,
      {
        method: "POST",
      },
    );
    const thumbnails = rawData.map_thumbnails;
    const newThumbnails: Record<string, string> = {};
    for (const [map, thumbnail] of Object.entries(thumbnails)) {
      if (!map || !thumbnail) {
        continue;
      }
      newThumbnails[map] = await optimizeThumbnailWithRetry(thumbnail as string);
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