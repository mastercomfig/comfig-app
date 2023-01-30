import { fetchHuds } from '../../ssg/huds';
import removeMd from 'remove-markdown';

export const get = async function get() {
  const allHuds = await fetchHuds(true);
  const hudData = allHuds.map((hud) => ({
    title: hud.name,
    author: hud.author,
    content: removeMd(hud.content),
    flags: hud.flags,
    tags: hud.tags,
  }));
  return { body: JSON.stringify(hudData) };
};
