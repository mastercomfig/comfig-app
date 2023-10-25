import { fetchHuds, getAllHudsHash } from "@ssg/huds";
import removeMd from "remove-markdown";

export async function GET() {
  const allHuds = await fetchHuds(true);
  const hudData = allHuds.map((hud) => {
    const data = {
      id: hud.id,
      name: hud.name,
      author: hud.author,
      content: removeMd(hud.content).toLowerCase(),
      flags: hud.flags || [],
      tags: hud.tags || [],
      bannerUrl: hud.bannerUrl,
    };
    const traits = ["os", "gamemode", "res", "position"];
    if (hud.traits) {
      for (const [trait, traitVal] of Object.entries(hud.traits)) {
        data[trait] = traitVal;
      }
    }
    for (const trait of traits) {
      if (!data[trait]) {
        data[trait] = [];
      }
    }
    return data;
  });
  return new Response(JSON.stringify(hudData), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function getStaticPaths() {
  const hash = await getAllHudsHash();

  return [{ params: { id: `${hash.substring(0, 8)}.cached` } }];
}
