import { fetchHuds } from '../../ssg/huds';
import removeMd from 'remove-markdown';

export const get = async function get() {
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
  return { body: JSON.stringify(hudData) };
};
