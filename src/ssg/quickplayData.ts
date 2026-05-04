

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { sha256 } from "./appData";
import { fetchCache } from "./fetchCache";

let quickplayData: any = null;

async function optimizeThumbnailWithRetry(map: string, src: string, maxAttempts: number = 2): Promise<string> {
  const publicDir = path.resolve("public/generated/maps");
  await fs.mkdir(publicDir, { recursive: true });

  const destFilename = `${map}.webp`;
  const destPath = path.join(publicDir, destFilename);
  const publicUrl = `/generated/maps/${destFilename}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(src, {
        headers: { "User-Agent": "comfig-app-build/1.0" }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      await sharp(buffer)
        .webp({ quality: 80 })
        .toFile(destPath);

      return publicUrl;
    } catch (e) {
      if (attempt === maxAttempts) {
        console.warn(`[Thumbnail Optimize] Manual fetch/process failed for ${src} after ${maxAttempts} attempts:`, e instanceof Error ? e.message : e);
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
      newThumbnails[map] = await optimizeThumbnailWithRetry(map, thumbnail as string);
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