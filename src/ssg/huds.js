import { parse } from "vdf-parser";

import { JSDOM } from "jsdom";
import { sha256 } from "./appData";

let hudDb = null;

const ghApi = async (path) => {
  let headers = {
    "User-Agent": "comfig app",
    Accept: "application/vnd.github+json",
  };

  if (import.meta.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${import.meta.env.GITHUB_TOKEN}`;
  }

  const resp = await fetch(`https://api.github.com/${path}`, {
    headers,
  });
  return await resp.json();
};

const hudApi = async (path) => {
  return await ghApi(`repos/mastercomfig/hud-db/${path}`);
};

const getHudDb = async () => {
  if (!hudDb) {
    hudDb = await hudApi("git/trees/main?recursive=1");
  }

  return hudDb;
};

const getHudFileCommits = async (path) => {
  return await hudApi(`commits?path=${path}`);
};

const getHudDbCommit = async (sha) => {
  return await hudApi(`git/commits/${sha}`);
};

const getHudResource = (id, name) => {
  if (name.startsWith("https://youtu.be/")) {
    return name.replace("https://youtu.be", "https://youtube.com/embed");
  }
  if (name.startsWith("https://")) {
    return name;
  }
  return `https://raw.githubusercontent.com/mastercomfig/hud-db/main/hud-resources/${id}/${name}.webp`;
};

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 10000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
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
    const hudEntries = await Promise.all(
      huds.map(async (hud) => {
        // Fetch and parse JSON from db
        const data = await fetch(
          `https://raw.githubusercontent.com/mastercomfig/hud-db/main/${hud.path}`,
        );
        const hudData = JSON.parse(await data.text());

        // Get HUD ID from json basename
        const fileName = hud.path.split("/").reverse()[0];
        const hudId = fileName.substr(0, fileName.lastIndexOf("."));
        hudData.id = hudId;

        // Query markdown
        try {
          const markdownData = await fetchWithTimeout(
            `https://raw.githubusercontent.com/mastercomfig/hud-db/main/hud-pages/${hudId}.md`,
          );
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

        const isGithub = hudData.repo.startsWith("https://github.com/");
        hudData.isGithub = isGithub;

        if (!hudData.social.issues && isGithub) {
          hudData.social.issues = `${hudData.repo}/issues`;
        }

        if (isGithub) {
          // Just the user/repo
          const ghRepo = hudData.repo.replace("https://github.com/", "");

          // Query the tag
          const branchTags = await fetch(
            `https://github.com/${ghRepo}/branch_commits/${hudData.hash}`,
          );
          const dom = new JSDOM(await branchTags.text());
          const tagList =
            dom.window.document.querySelector(".branches-tag-list");
          let isLatest = true;
          hudData.versions = [];
          if (tagList) {
            const latestRelease =
              tagList.children.item(0).lastChild.textContent;
            if (tagList.children.length === 1) {
              hudData.versionName = latestRelease;
              hudData.versions.push({
                hash: hudData.hash,
                name: latestRelease,
              });
            } else {
              console.log(
                `HUD ${hudId} hash ${hudData.hash} is outdated, latest release is ${latestRelease}`,
              );
              const oldestRelease = tagList.children.item(
                tagList.children.length - 1,
              ).lastChild.textContent;
              isLatest = false;
              if (!hudData.verified) {
                hudData.versions.push({
                  hash: hudData.hash,
                  name: oldestRelease,
                });
              }
              hudData.versions.push({
                hash: latestRelease,
                name: latestRelease,
              });
            }
          } else {
            hudData.versions.push({
              hash: hudData.hash,
            });
          }

          const latestVersion =
            hudData.versions[hudData.versions.length - 1].hash;

          // Query the latest info.vdf in the repo to get the UI version
          try {
            const infoVdf = await fetchWithTimeout(
              `https://raw.githubusercontent.com/${ghRepo}/${latestVersion}/info.vdf`,
            );
            if (infoVdf.ok) {
              try {
                const infoVdfJson = parse(await infoVdf.text());
                const tfUiVersion = parseInt(
                  Object.entries(infoVdfJson)[0][1].ui_version,
                  10,
                );
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
          for (const version of hudData.versions) {
            version.downloadUrl = `https://codeload.github.com/${ghRepo}/legacy.zip/${version.hash}`;
          }

          // Query the commit
          try {
            const commit = isLatest
              ? await ghApi(`repos/${ghRepo}/git/commits/${latestVersion}`)
              : await ghApi(`repos/${ghRepo}/releases/tags/${latestVersion}`);
            hudData.publishDate = new Date(
              isLatest ? commit.author.date : commit.published_at,
            );
          } catch (e) {
            console.log(
              `Failed to fetch commit ${latestVersion} for ${hudId} (${ghRepo})`,
            );
            hudData.publishDate = new Date(null);
            throw e;
          }
        } else {
          // Not a GitHub repo, assume it's outdated
          if (!hudData.publishDate) {
            const hudDbFile = await getHudFileCommits(hud.path);
            const commitHash = hudDbFile.sha;
            const commit = await getHudDbCommit(commitHash);
            hudData.publishDate = new Date(commit.author.date);
          } else {
            hudData.publishDate = new Date(hudData.publishDate);
          }
          hudData.versions = [
            {
              name: hudData.hash,
            },
          ];
          hudData.outdated = true;
        }

        // Remap resources to full URLs
        hudData.resourceUrls = hudData.resources.map((name) =>
          getHudResource(hudId, name),
        );
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
      }),
    );
    hudMap = new Map(hudEntries);
  }

  // Add children to parents
  for (const [parent, children] of hudChildren.entries()) {
    hudMap.get(parent).variants = children.map((child) => hudMap.get(child));
    const variants = [parent];
    for (const child of children) {
      const siblings = children.filter((sibling) => sibling !== child);
      hudMap.get(child).variants = variants
        .concat(siblings)
        .map((variant) => hudMap.get(variant));
    }
  }

  return hudMap;
};

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

export async function getAllHudsHash() {
  const allHuds = await getHudDb();

  const hudsJson = JSON.stringify(allHuds);

  const hash = await sha256(hudsJson);

  return hash;
}
