import { JSDOM } from "jsdom";
import { parse } from "vdf-parser";

import { sha256 } from "./appData";
import {
  fetchCache,
  fetchCacheText,
  fetchCacheTextWithTimeout,
} from "./fetchCache";

let hudDb = null;

const ghApi = async (path) => {
  const headers = {
    "User-Agent": "comfig app",
    Accept: "application/vnd.github+json",
  };

  if (import.meta.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${import.meta.env.GITHUB_TOKEN}`;
  }

  return fetchCache(`https://api.github.com/${path}`, {
    headers,
  });
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
    return name.replace(
      "https://youtu.be",
      "https://www.youtube-nocookie.com/embed",
    );
  }
  if (name.startsWith("https://")) {
    return name;
  }
  return `https://raw.githubusercontent.com/mastercomfig/hud-db/main/hud-resources/${id}/${name}.webp`;
};

let hudMap = null;
const hudChildren = new Map();

// TODO: Sync with tf_ui_version
const CURRENT_HUD_VERSION = 3;

export const getHuds = async () => {
  if (!hudMap) {
    const db = await getHudDb();
    // Filter to only hud-data JSON files
    const huds = db.tree.filter((item) => item.path.startsWith("hud-data/"));
    const hudEntries = await Promise.all(
      huds.map(async (hud) => {
        // Fetch and parse JSON from db
        const data = await fetchCacheText(
          `https://raw.githubusercontent.com/mastercomfig/hud-db/main/${hud.path}`,
        );
        const hudData = JSON.parse(data);

        // Get HUD ID from json basename
        const fileName = hud.path.split("/").reverse()[0];
        const hudId = fileName.substr(0, fileName.lastIndexOf("."));
        hudData.id = hudId;
        hudData.authorId = hudData.author
          .replace(/[^\p{L}\p{N}]+/gu, "-")
          .replace(/-+/g, "-")
          .toLowerCase();
        hudData.code = hudId.replaceAll("-", "");

        // Query markdown
        try {
          const markdownData = await fetchCacheTextWithTimeout(
            `https://raw.githubusercontent.com/mastercomfig/hud-db/main/hud-pages/${hudId}.md`,
          );
          if (markdownData !== null) {
            hudData.content = markdownData;
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

        if (hudData.githubAuthor) {
          hudData.ghAuthor = hudData.githubAuthor;
        }

        if (isGithub) {
          // Just the user/repo
          const ghRepo = hudData.repo.replace("https://github.com/", "");
          if (
            hudData.githubAuthor === undefined &&
            hudData.author !== "Unknown"
          ) {
            hudData.ghAuthor = ghRepo.split("/")[0];
          }

          // Query the tag
          // TODO: this may be flagged as abuse by GitHub.
          const branchTags = await fetchCacheText(
            `https://github.com/${ghRepo}/branch_commits/${hudData.hash}`,
          );
          const dom = new JSDOM(branchTags);
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
            const infoVdf = await fetchCacheTextWithTimeout(
              `https://raw.githubusercontent.com/${ghRepo}/${latestVersion}/info.vdf`,
            );
            if (infoVdf !== null) {
              try {
                const infoVdfJson = parse(infoVdf);
                const hudVdfInfo = Object.entries(infoVdfJson)[0][1];
                const vdfEntry = hudVdfInfo.ui_version ?? hudVdfInfo.UI_VERSION;
                const tfUiVersion = parseInt(vdfEntry, 10);
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
    for (const child of children) {
      const siblings = children.filter((sibling) => sibling !== child);
      hudMap.get(child).parentHud = hudMap.get(parent);
      hudMap.get(child).variants = siblings.map((variant) =>
        hudMap.get(variant),
      );
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

let hudAuthors = null;

export const transformName = function (name) {
  return name
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
};

export const fetchAuthors = async function () {
  if (hudAuthors) {
    return hudAuthors;
  }

  const authorHuds = {};
  const contributorHuds = {};
  const creatorName = {};
  const creatorGithub = {};

  const huds = await fetchHuds(true);

  for (const hud of huds) {
    const author = hud.authorId;
    if (authorHuds[author]) {
      authorHuds[author].push(hud);
    } else {
      authorHuds[author] = [hud];
      if (!creatorName[author]) {
        creatorName[author] = hud.author;
      }
      if (!creatorGithub[author]) {
        creatorGithub[author] = hud.ghAuthor;
      }
    }
    for (const contributor of hud.contributors ?? []) {
      const contributorId = transformName(contributor);
      if (contributorHuds[contributorId]) {
        contributorHuds[contributorId].push(hud);
      } else {
        contributorHuds[contributorId] = [hud];
        if (!creatorName[contributorId]) {
          creatorName[contributorId] = contributor;
        }
      }
    }
  }

  const anyCreatorSet = new Set(Object.keys(authorHuds));
  anyCreatorSet.delete("unknown");
  for (const contributor of Object.keys(contributorHuds)) {
    anyCreatorSet.add(contributor);
  }
  const anyCreator = Array.from(anyCreatorSet);

  hudAuthors = Object.fromEntries(
    anyCreator.map((creatorId) => {
      const authorName = creatorName[creatorId];
      const ghAuthor = creatorGithub[creatorId];
      const socials = {
        support: undefined,
        steam_profile: undefined,
        steam_group: undefined,
        twitter: undefined,
        discord: undefined,
        youtube: undefined,
        twitch: undefined,
      };
      const myHuds = authorHuds[creatorId] ?? [];
      for (const hud of myHuds) {
        for (const social of Object.keys(socials)) {
          const socialLink = hud.social?.[social] ?? null;
          if (socials[social] === undefined) {
            socials[social] = socialLink;
          } else {
            if (socials[social] !== socialLink) {
              socials[social] = null;
            }
          }
        }
      }
      for (const social of Object.keys(socials)) {
        if (!socials[social]) {
          delete socials[social];
        }
      }
      const contributing = contributorHuds[creatorId] ?? [];
      return [
        creatorId,
        {
          authorName,
          ghAuthor,
          huds: myHuds.sort((a, b) => a.code.localeCompare(b.code)),
          contributing: contributing.sort((a, b) =>
            a.code.localeCompare(b.code),
          ),
          socials,
        },
      ];
    }),
  );

  return hudAuthors;
};

export async function getAllHudsHash() {
  const allHuds = await getHudDb();

  const hudsJson = JSON.stringify(allHuds);

  const hash = await sha256(hudsJson);

  return hash;
}

const debugPopularity = false;
function logPopularity(...args) {
  if (debugPopularity) {
    console.log(...args);
  }
}

let popularityLookup: any = null;
let maxHype = 0;
export async function getPopularity() {
  if (!popularityLookup) {
    popularityLookup = {};
    if (import.meta.env.CLOUDFLARE_AUTH && import.meta.env.CF_ACCOUNT_TAG) {
      let headers = {
        "User-Agent": "comfig app",
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.CLOUDFLARE_AUTH}`,
      };
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      const dayAgo = new Date(now - DAY).toISOString();
      const weekAgo = new Date(now - 7 * DAY).toISOString().split("T")[0];
      const monthAgo = new Date(Date.now() - 30 * DAY)
        .toISOString()
        .split("T")[0];
      const popularityQuery = await fetch(
        "https://api.cloudflare.com/client/v4/graphql",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: `query GetRumAnalyticsTopNs {
                    viewer {
                      accounts(filter: { accountTag: "${import.meta.env.CF_ACCOUNT_TAG}" }) {
                        topMonth: rumPageloadEventsAdaptiveGroups(
                          filter: {
                            AND: [
                              { date_geq: "${monthAgo}" }
                              { bot: 0 }
                              { requestPath_like: "/huds/page%/" }
                            ]
                          }
                          limit: 1000
                          orderBy: [sum_visits_DESC]
                        ) {
                          count
                          sum {
                            visits
                          }
                          dimensions {
                            path: requestPath
                          }
                        }
                        topWeekSearch: rumPageloadEventsAdaptiveGroups(
                          filter: {
                            AND: [
                              { date_geq: "${weekAgo}" }
                              { bot: 0 }
                              { requestPath_like: "/huds/page%/" }
                              {
                                OR: [
                                  { refererHost_like: "www.google.%" }
                                  { refererHost_like: "yandex.%" }
                                  { refererHost_like: "%bing.com" }
                                  { refererHost_like: "%search.yahoo.com" }
                                  { refererHost: "duckduckgo.com" }
                                  { refererHost: "www.libhunt.com" }
                                  { refererHost: "gamebanana.com" }
                                  { refererHost: "github.com" }
                                ]
                              }
                            ]
                          }
                          limit: 1000
                          orderBy: [sum_visits_DESC]
                        ) {
                          count
                          sum {
                            visits
                          }
                          dimensions {
                            path: requestPath
                          }
                        }
                        topWeekDiscovery: rumPageloadEventsAdaptiveGroups(
                          filter: {
                            AND: [
                              { date_geq: "${weekAgo}" }
                              { bot: 0 }
                              { requestPath_like: "/huds/page%/" }
                              { refererHost: "" }
                            ]
                          }
                          limit: 1000
                          orderBy: [sum_visits_DESC]
                        ) {
                          count
                          sum {
                            visits
                          }
                          dimensions {
                            path: requestPath
                          }
                        }
                        topWeekSocial: rumPageloadEventsAdaptiveGroups(
                          filter: {
                            AND: [
                              { date_geq: "${weekAgo}" }
                              { bot: 0 }
                              { requestPath_like: "/huds/page%/" }
                              {
                                OR: [
                                  { refererHost_like: "%instagram.com" }
                                  { refererHost_like: "%facebook.%" }
                                  { refererHost: "www.youtube.%" }
                                  { refererHost: "www.reddit.com" }
                                  { refererHost: "steamcommunity.com" }
                                  { refererHost: "t.co" }
                                ]
                              }
                            ]
                          }
                          limit: 1000
                          orderBy: [sum_visits_DESC]
                        ) {
                          count
                          sum {
                            visits
                          }
                          dimensions {
                            path: requestPath
                          }
                        }
                        topWeek: rumPageloadEventsAdaptiveGroups(
                          filter: {
                            AND: [
                              { date_geq: "${weekAgo}" }
                              { bot: 0 }
                              { requestPath_like: "/huds/page%/" }
                            ]
                          }
                          limit: 1000
                          orderBy: [sum_visits_DESC]
                        ) {
                          count
                          sum {
                            visits
                          }
                          dimensions {
                            path: requestPath
                          }
                        }
                        topDay: rumPageloadEventsAdaptiveGroups(
                          filter: {
                            AND: [
                              { datetime_gt: "${dayAgo}" }
                              { bot: 0 }
                              { requestPath_like: "/huds/page%/" }
                            ]
                          }
                          limit: 1000
                          orderBy: [sum_visits_DESC]
                        ) {
                          count
                          sum {
                            visits
                          }
                          dimensions {
                            path: requestPath
                          }
                        }
                      }
                    }
                  }`,
          }),
        },
      );
      const popularityData = await popularityQuery.json();
      const metrics = popularityData.data.viewer.accounts[0];
      if (import.meta.env.COMFIG_API_KEY) {
        const allHuds = await fetchHuds(true);
        const downloadStatPromises: Promise<any>[] = [];
        const headers = {
          Authorization: `Bearer ${import.meta.env.COMFIG_API_KEY}`,
        };
        for (const hud of allHuds) {
          const id = hud.id;
          const downloadApiRes = fetch(
            `${import.meta.env.COMFIG_WORKER_URL ?? "https://worker.comfig.app/"}api/huds/download/get`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                id,
              }),
            },
          )
            .then((res) => res.json())
            .then((body) => ({
              id,
              count: body.count,
            }));
          downloadStatPromises.push(downloadApiRes);
        }
        const downloadStats = await Promise.all(downloadStatPromises);
        metrics.downloads = downloadStats;
      }
      logPopularity("TOP MONTH");
      for (const metric of metrics.topMonth) {
        const hudId = metric.dimensions.path.split("/")[3];
        const monthlyVisits = metric.sum.visits;
        const monthlyViews = metric.count;
        const viewCap = monthlyVisits * monthlyVisits;
        let viewActivity = 0;
        if (viewCap > 0) {
          const activityMultCap = 2.666;
          const activityBoost = 1.25;
          viewActivity = Math.min(
            Math.min(viewCap, monthlyViews) / monthlyVisits,
            activityMultCap,
          );
          viewActivity /= activityMultCap;
          if (viewActivity < 1) {
            viewActivity = 1;
          } else {
            //viewActivity *= viewActivity;
            viewActivity *= activityBoost;
          }
        }
        const activityProportion = 0.8;
        const totalViewDegradation = 0.125;
        popularityLookup[hudId] = Math.round(
          totalViewDegradation *
            (metric.sum.visits * (1 - activityProportion) +
              metric.sum.visits * activityProportion * viewActivity),
        );
        logPopularity(hudId, popularityLookup[hudId], popularityLookup[hudId]);
        if (popularityLookup[hudId] > maxHype) {
          maxHype = popularityLookup[hudId];
        }
      }
      if (metrics.downloads) {
        logPopularity("TOP DOWNLOADS");
        let totalDownloads = 0;
        let downloadedHuds = 0;
        for (const metric of metrics.downloads) {
          if (metric.count < 1) {
            continue;
          }
          totalDownloads += metric.count;
          downloadedHuds++;
        }
        const downloadPot = 100 * downloadedHuds;
        for (const metric of metrics.downloads) {
          if (metric.count < 1) {
            continue;
          }
          const hudId = metric.id;
          popularityLookup[hudId] =
            (popularityLookup[hudId] ?? 0) +
            Math.round((metric.count / totalDownloads) * downloadPot);
          logPopularity(
            hudId,
            Math.round((metric.count / totalDownloads) * downloadPot),
            popularityLookup[hudId],
          );
          if (popularityLookup[hudId] > maxHype) {
            maxHype = popularityLookup[hudId];
          }
        }
      }
      logPopularity("TOP SEARCH");
      for (const metric of metrics.topWeekSearch) {
        const hudId = metric.dimensions.path.split("/")[3];
        popularityLookup[hudId] =
          (popularityLookup[hudId] ?? 0) + metric.sum.visits * 4;
        logPopularity(hudId, metric.sum.visits * 4, popularityLookup[hudId]);
        if (popularityLookup[hudId] > maxHype) {
          maxHype = popularityLookup[hudId];
        }
      }
      logPopularity("TOP SOCIAL");
      for (const metric of metrics.topWeekSocial) {
        const hudId = metric.dimensions.path.split("/")[3];
        popularityLookup[hudId] =
          (popularityLookup[hudId] ?? 0) + metric.sum.visits * 4;
        logPopularity(hudId, metric.sum.visits * 4, popularityLookup[hudId]);
        if (popularityLookup[hudId] > maxHype) {
          maxHype = popularityLookup[hudId];
        }
      }
      logPopularity("TOP DISCOVERY");
      for (const metric of metrics.topWeekDiscovery) {
        const hudId = metric.dimensions.path.split("/")[3];
        popularityLookup[hudId] =
          (popularityLookup[hudId] ?? 0) + metric.sum.visits;
        logPopularity(hudId, metric.sum.visits, popularityLookup[hudId]);
        if (popularityLookup[hudId] > maxHype) {
          maxHype = popularityLookup[hudId];
        }
      }
      logPopularity("TOP WEEK");
      for (const metric of metrics.topWeek) {
        const hudId = metric.dimensions.path.split("/")[3];
        const popularity = popularityLookup[hudId] ?? 0;
        popularityLookup[hudId] =
          popularity +
          Math.round(
            metric.sum.visits *
              0.25 *
              Math.max(1 - popularity / (maxHype + 1), 1 / 3),
          );
        logPopularity(
          hudId,
          Math.round(
            metric.sum.visits *
              0.25 *
              Math.max(1 - popularity / (maxHype + 1), 1 / 3),
          ),
          popularityLookup[hudId],
        );
        if (popularityLookup[hudId] > maxHype) {
          maxHype = popularityLookup[hudId];
        }
      }
      logPopularity("TOP DAY");
      for (const metric of metrics.topDay) {
        const hudId = metric.dimensions.path.split("/")[3];
        const popularity = popularityLookup[hudId] ?? 0;
        popularityLookup[hudId] =
          popularity +
          Math.round(
            metric.sum.visits *
              5 *
              Math.pow(Math.max(1 - popularity / (maxHype + 1), 1 / 2), 2),
          );
        logPopularity(
          hudId,
          Math.round(
            metric.sum.visits *
              5 *
              Math.pow(Math.max(1 - popularity / (maxHype + 1), 1 / 2), 2),
          ),
          metric.sum.visits,
          popularityLookup[hudId],
        );
        if (popularityLookup[hudId] > maxHype) {
          maxHype = popularityLookup[hudId];
        }
      }
    }
  }
  return popularityLookup;
}

export async function getMaxHype() {
  if (!popularityLookup) {
    await getPopularity();
  }
  return maxHype;
}
