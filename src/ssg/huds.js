import { parse } from "vdf-parser";

import { JSDOM } from 'jsdom';

let hudDb = null;

const ghApi = async (path) => {
  let headers = {
    "User-Agent": "comfig app",
    Accept: "application/vnd.github.v3+json",
  };

  if (import.meta.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${import.meta.env.GITHUB_TOKEN}`
  }

  const resp = await fetch(`https://api.github.com/${path}`, {
    headers,
  });
  return await resp.json();
}

const hudApi = async (path) => {
  return await ghApi(`repos/mastercomfig/hud-db/${path}`);
}

const getHudDb = async () => {
  if (!hudDb) {
    hudDb = await hudApi("git/trees/main?recursive=1");
  }

  return hudDb;
};

const getHudResource = (id, name) => {
  if (name.startsWith("https://youtu.be/")) {
    return name.replace("https://youtu.be", "https://youtube.com/embed");
  }
  if (name.startsWith("https://")) {
    return name;
  }
  return `https://raw.githubusercontent.com/mastercomfig/hud-db/main/hud-resources/${id}/${name}.webp`
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 10000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal  
  });
  clearTimeout(id);
  return response;
}

let hudMap = null;
let hudChildren = new Map();

// TODO: Sync with tf_ui_version
const CURRENT_HUD_VERSION = 3;

const getHuds = async () => {
  if (!hudMap) {
    const db = await getHudDb();
    // Filter to only hud-data JSON files
    const huds = db.tree.filter((item) => item.path.startsWith("hud-data/"));
    const hudEntries = await Promise.all(huds.map(async (hud) => {
      // Fetch and parse JSON from db
      const data = await fetch(`https://raw.githubusercontent.com/mastercomfig/hud-db/main/${hud.path}`);
      const hudData = JSON.parse(await data.text());

      // Get HUD ID from json basename
      const fileName = hud.path.split('/').reverse()[0];
      const hudId = fileName.substr(0, fileName.lastIndexOf('.'));
      hudData.id = hudId;

      // Query markdown
      try {
        const markdownData = await fetchWithTimeout(`https://raw.githubusercontent.com/mastercomfig/hud-db/main/hud-pages/${hudId}.md`);
        if (markdownData.ok) {
          hudData.content = await markdownData.text();
        }
      } catch {
        // Ignore
      }

      // Release date
      if (hudData.releaseDate) {
        hudData.releaseDate = new Date(hudData.releaseDate);
      }

      // Add issues link for issues if not present
      if (!hudData.social) {
        hudData.social = {};
      }

      if (!hudData.social.issues) {
        hudData.social.issues = `${hudData.repo}/issues`;
      }

      // Just the user/repo
      const ghRepo = hudData.repo.replace("https://github.com/", "");

      // Query the info.vdf in the repo to get the UI version
      try {
        const infoVdf = await fetchWithTimeout(`https://raw.githubusercontent.com/${ghRepo}/${hudData.hash}/info.vdf`);
        if (infoVdf.ok) {
          try {
            const infoVdfJson = parse(await infoVdf.text());
            const tfUiVersion = parseInt(Object.entries(infoVdfJson)[0][1].ui_version, 10);
            hudData.outdated = tfUiVersion !== CURRENT_HUD_VERSION;
          } catch (e) {
            // info.vdf exists but is invalid
            console.log(`Invalid info.vdf for ${hudId} (${ghRepo})`);
            hudData.outdated = true;
          }
        } else if (infoVdf.status == 404) {
          // info.vdf doesn't exist at all, this is a very old HUD
          hudData.outdated = true;
        }
      } catch {
        // info.vdf timed out, assume it's outdated since GitHub sometimes stalls on 404s
        hudData.outdated = true;
      }

      // Add download link
      //hudData.downloadUrl = `https://github.com/${ghRepo}/archive/${hudData.hash}.zip`
      hudData.downloadUrl = `https://codeload.github.com/${ghRepo}/legacy.zip/${hudData.hash}`

      // Query the tag
      const branchTags = await fetch(`https://github.com/${ghRepo}/branch_commits/${hudData.hash}`);
      const dom = new JSDOM(await branchTags.text());
      const tagList = dom.window.document.querySelector(".branches-tag-list");
      if (tagList) {
        // Get the oldest tag associated with this commit
        hudData.versionName = tagList.children.item(tagList.children.length - 1).lastChild.textContent;
      }

      // Query the commit
      try {
        const commit = await ghApi(`repos/${ghRepo}/git/commits/${hudData.hash}`);
        hudData.publishDate = new Date(commit.author.date);
      } catch (e) {
        console.log(`Failed to fetch commit ${hudData.hash} for ${hudId} (${ghRepo})`);
        hudData.publishDate = new Date(null);
        throw e;
      }

      // Remap resources to full URLs
      hudData.resourceUrls = hudData.resources.map((name) => getHudResource(hudId, name));
      hudData.bannerUrl = hudData.resourceUrls[0];

      // Build child map
      if (hudData.parent) {
        if (!hudChildren.has(hudData.parent)) {
          hudChildren.set(hudData.parent, [hudId]);
        } else {
          hudChildren.get(hudData.parent).push(hudId);
        }
      }

      return [hudId, hudData];
    }));
    hudMap = new Map(hudEntries);
  }

  // Add children to parents
  for (const [parent, children] of hudChildren.entries()) {
    hudMap.get(parent).variants = children.map((child) => hudMap.get(child));
    const variants = [parent];
    for (const child of children) {
      const siblings = children.filter((sibling) => sibling !== child);
      hudMap.get(child).variants = variants.concat(siblings).map((variant) => hudMap.get(variant));
    }
  }

  return hudMap;
}

export const fetchHuds = async function (all) {
  const huds = await getHuds();

  if (all) {
    return Array.from(huds.values());
  }

  const results = Array.from(huds.values())
    .sort((a, b) => b.publishDate.valueOf() - a.publishDate.valueOf())
    .filter((hud) => !hud.parent); // No children shown on the page

  return results;
};
