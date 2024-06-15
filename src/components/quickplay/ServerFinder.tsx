import useQuickplayStore from "@store/quickplay";

const REJOIN_COOLDOWN = 300 * 1000;
const REJOIN_PENALTY = 1.0;

const PING_LOW_SCORE = 0.9;
const PING_MED = 150.0;
const PING_MED_SCORE = 0.0;
const PING_HIGH = 300.0;
const PING_HIGH_SCORE = -1.0;

const MIN_PLAYER_CAP = 18;
// At least A, and at most B.
const MAX_PLAYER_OPTIONS = [
  [24, 24], // Default
  [MIN_PLAYER_CAP, 32], // Any normal
  [64, 100], // Any large
  [MIN_PLAYER_CAP, 100], // Don't care
];

const APP_FULL_NAME = "Team Fortress";

const TAG_PREFS = ["crits", "respawntimes", "beta"];
const INCREASED_MAXPLAYERS = "increased_maxplayers";

const gamemodeToPrefix = {
  attack_defense: "cp",
  powerup: "ctf",
  passtime: "pass",
  special_events: "",
  halloween: "",
  christmas: "",
};

const MISC_GAMEMODES = ["arena", "pass", "pd", "rd", "sd", "tc", "vsh", "zi"];

const REGIONS = {
  0: "na",
  1: "na",
  2: "sa",
  3: "eu",
  4: "asia",
  5: "oce",
  6: "me",
  7: "afr",
};

function lerp(inA, inB, outA, outB, x) {
  return outA + ((outB - outA) * (x - inA)) / (inB - inA);
}

export default function ServerFinder() {
  const quickplayStore = useQuickplayStore((state) => state);

  let servers = [];
  let mapToGamemode = {};
  let serverPings = {};
  let playerRegion = 255;

  const getRecentPenalty = (address) => {
    let penalty = 0.0;
    const lastTime = quickplayStore.recentServers[address];
    if (lastTime) {
      const age = Math.min(REJOIN_COOLDOWN, performance.now() - lastTime);
      const ageScore = age / REJOIN_COOLDOWN;
      penalty = (1.0 - ageScore) * REJOIN_PENALTY;
    }
    return penalty;
  };

  const touchRecentServer = (address) => {
    quickplayStore.setRecentServer(address, performance.now());
  };

  const updateMaxPlayers = (option) => {
    quickplayStore.setMaxPlayerCap(MAX_PLAYER_OPTIONS[option]);
  };

  const updatePingLimit = (option) => {
    quickplayStore.setPingLimit(option);
  };

  const checkTagPref = (pref, tags: Set<string>) => {
    const v = quickplayStore[pref];
    // -1 is don't care
    if (v === -1) {
      return true;
    }
    const mustHave: Array<string> = [];
    const mustNotHave: Array<string> = [];
    function must(tag: string) {
      mustHave.push(tag);
    }
    function mustNot(tag: string) {
      mustNotHave.push(tag);
    }
    // 0 is default, 1 is changed
    if (pref === "respawntimes") {
      if (v === 0) {
        mustNot("respawntimes");
        mustNot("norespawntime");
      } else if (v === 1) {
        must("norespawntime");
      }
    } else if (pref === "crits") {
      if (v === 0) {
        mustNot("nocrits");
      } else if (v === 1) {
        must("nocrits");
      }
    } else if (pref === "beta") {
      if (v === 0) {
        mustNot("beta");
      } else if (v === 1) {
        must("beta");
      }
    }
    if (mustHave.length < 1 && mustNotHave.length < 1) {
      console.error("Unexpected tag pref!", pref, v);
      return true;
    }
    for (const has of mustHave) {
      if (!tags.has(has)) {
        return false;
      }
    }
    for (const notHas of mustNotHave) {
      if (tags.has(notHas)) {
        return false;
      }
    }
    return true;
  };

  const filterServerTags = (gametype: string) => {
    const tags = new Set(gametype.split(","));
    // Just a quick check for if tags match the max player expectations.
    if (quickplayStore.maxPlayerCap === MAX_PLAYER_OPTIONS[0]) {
      if (tags.has(INCREASED_MAXPLAYERS)) {
        return false;
      }
    } else if (quickplayStore.maxPlayerCap === MAX_PLAYER_OPTIONS[2]) {
      if (!tags.has(INCREASED_MAXPLAYERS)) {
        return false;
      }
    }
    for (const pref of TAG_PREFS) {
      if (!checkTagPref(pref, tags)) {
        return false;
      }
    }
    return true;
  };

  const getExpectedPing = (address) => {
    return serverPings[address];
  };

  const filterServer = (server) => {
    // Now let's start the server secondary filters.
    // Make sure game description has not been modified.
    if (server.game_description !== APP_FULL_NAME) {
      return false;
    }
    const [minCap, maxCap] = quickplayStore.maxPlayerCap;
    // Make sure we have enough player cap.
    if (server.max_players < minCap) {
      return false;
    }
    // Allow for one more player than our cap for SourceTV.
    if (server.max_players >= maxCap + 1) {
      return false;
    }
    // Check the tags
    if (!filterServerTags(server.gametype)) {
      return false;
    }
    const expectedGamemode = quickplayStore.gamemode;
    if (expectedGamemode !== "any") {
      const mapGamemode = mapToGamemode[server.map];
      if (mapGamemode) {
        if (mapGamemode !== expectedGamemode) {
          return false;
        }
      } else {
        const mapPrefix = server.map.split("_")[0];
        if (expectedGamemode === "alternative") {
          if (MISC_GAMEMODES.indexOf(mapPrefix) === -1) {
            return false;
          }
        } else {
          const expectedPrefix =
            gamemodeToPrefix[expectedGamemode] ?? expectedGamemode;
          if (expectedPrefix && mapPrefix !== expectedPrefix) {
            return false;
          }
        }
      }
    }
    if (quickplayStore.blocklist.has(server.steamid)) {
      return false;
    }

    return true;
  };

  const getPingForScoring = (server) => {
    if (playerRegion != 255 && server.region != 255) {
      if (REGIONS[playerRegion] !== REGIONS[server.region]) {
        return PING_HIGH;
      }
    }
    return getExpectedPing(server);
  };

  const scoreServerForUser = (server) => {
    let userScore = 0.0;
    const ping = getPingForScoring(server);
    const PING_LOW = quickplayStore.pinglimit;
    if (ping < PING_LOW) {
      userScore += lerp(0, PING_LOW, 1.0, PING_LOW_SCORE, ping);
    } else if (ping < PING_MED) {
      userScore += lerp(
        PING_LOW,
        PING_MED,
        PING_LOW_SCORE,
        PING_MED_SCORE,
        ping,
      );
    } else {
      userScore += lerp(
        PING_MED,
        PING_HIGH,
        PING_MED_SCORE,
        PING_HIGH_SCORE,
        ping,
      );
    }

    userScore -= getRecentPenalty(server.addr);

    return userScore;
  };

  const scoreServerForTotal = (server) => {
    const userScore = scoreServerForUser(server);
    return server.score + userScore;
  };

  const filterGoodServers = (score) => {
    return score > 1.0;
  };
}
