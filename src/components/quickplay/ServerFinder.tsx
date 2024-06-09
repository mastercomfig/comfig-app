import useQuickplayStore from "@store/quickplay";

const REJOIN_COOLDOWN = 300 * 1000;
const REJOIN_PENALTY = 1.0;

const SERVER_HEADROOM = 1;
const PLAYER_COUNT_SCORE = 1.5;

const PING_LOW = 50.0;
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

const APP_ID = 440;
const APP_NAME = "tf";
const APP_FULL_NAME = "Team Fortress";

const TAGS_DISALLOWED = [
  "friendlyfire",
  "highlander",
  "noquickplay",
  "trade",
  "dmgspread",
];
const TAG_PREFS = ["crits", "respawntimes", "beta"];
const INCREASED_MAXPLAYERS = "increased_maxplayers";

const knownMaps = new Set();
const mapToGamemode = {};

const gamemodeToTag = {
  pl: "payload",
  plr: "payload",
  koth: "cp",
  ad: "cp",
  pass: "passtime",
};

const gamemodeToPrefix = {
  ad: "cp",
  powerup: "ctf",
};

const MISC_GAMEMODES = ["arena", "pass", "pd", "rd", "sd", "tc", "vsh", "zi"];

// No forced MOTD or popups
// No gameplay advantages
// No reserved slot kicks
// No content modifications
// No non-default gamemodes
// No class limits
// No granting economy items
const quickplayBanned = new Set();

function lerp(inA, inB, outA, outB, x) {
  return outA + ((outB - outA) * (x - inA)) / (inB - inA);
}

export default function ServerFinder() {
  const quickplayStore = useQuickplayStore((state) => state);

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
    // There's some tags we never want to see in a quickplay server.
    for (const disallowed of TAGS_DISALLOWED) {
      if (tags.has(disallowed)) {
        return false;
      }
    }
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
    const gamemode =
      gamemodeToTag[quickplayStore.gamemode] ?? quickplayStore.gamemode;
    if (gamemode !== "any" && !tags.has(gamemode)) {
      return false;
    }
    return true;
  };

  const idealPingToServer = (serverAddress) => {
    // geodesic calculation from coordinator (based on IPs)
    return 1.0;
  };

  const pingToCoordinator = () => {
    // ping to coordinator - expected ping to coordinator
    return 1.0;
  };

  const coordinatorPing = (address) => {
    // ping to server - expected ping to server
    return 1.0;
  };

  const getExpectedPing = (address) => {
    return (
      idealPingToServer(address) +
      pingToCoordinator() +
      coordinatorPing(address)
    );
  };

  // \appid\440\gamedir\tf\secure\1\dedicated\1\full\1\ngametype\friendlyfire,highlander,noquickplay,trade,dmgspread\steamblocking\1\nor\1\white\1
  const filterServer = (server) => {
    // We filter by AppID, Secure, Dedicated, Non-Full, and gamedir in the list query.
    // But, let's make sure here.
    if (server.app_id !== APP_ID) {
      return false;
    }
    if (!server.secure) {
      return false;
    }
    if (!server.dedicated) {
      return false;
    }
    if (server.num_players >= server.max_players) {
      return false;
    }
    if (server.gamedir !== APP_NAME) {
      return false;
    }
    // Now let's start the server secondary filters.
    // Make sure game description has not been modified.
    if (server.game_description !== APP_FULL_NAME) {
      return false;
    }
    // TODO: actually verify steam ID
    if (!server.steamid) {
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
    // Check for known maps
    if (!knownMaps.has(server.map)) {
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
        if (expectedGamemode === "misc") {
          if (MISC_GAMEMODES.indexOf(mapPrefix) === -1) {
            return false;
          }
        } else {
          const expectedPrefix =
            gamemodeToPrefix[expectedGamemode] ?? expectedGamemode;
          if (mapPrefix !== expectedPrefix) {
            return false;
          }
        }
      }
    }
    if (quickplayStore.blocklist.has(server.steamid)) {
      return false;
    }
    if (quickplayBanned.has(server.steamid)) {
      return false;
    }
    if (quickplayStore.pinglimit > 0) {
      const expectedPing = getExpectedPing(server.addr);
      if (expectedPing > quickplayStore.pinglimit) {
        return false;
      }
    }

    return true;
  };

  const getServerReputation = (steamid) => {
    return 0.0;
  };

  const scoreServer = (server) => {
    const maxPlayers = server.max_players;
    const players = server.num_players;
    const bots = server.bots;
    const newPlayers = players + 1;
    const totalNewPlayers = newPlayers + bots;

    // If server is full, we want to direct players to fill up other servers and not contest joins to full servers.
    if (totalNewPlayers + SERVER_HEADROOM > maxPlayers) {
      return -100.0;
    }

    const countLow = maxPlayers / 3;
    const countIdeal = (maxPlayers * 5) / 6;

    const scoreLow = 0.2;
    const scoreIdeal = PLAYER_COUNT_SCORE;

    if (newPlayers <= countLow) {
      return lerp(0, countLow, 0.0, scoreLow, newPlayers);
    } else if (newPlayers <= countIdeal) {
      return lerp(countLow, countIdeal, scoreLow, scoreIdeal, newPlayers);
    } else {
      return lerp(countIdeal, maxPlayers, scoreIdeal, scoreLow, newPlayers);
    }
  };

  const scoreServerForUser = (server) => {
    let userScore = 0.0;
    const ping = getExpectedPing(server);
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
  };

  const scoreServerForTotal = (server) => {
    const serverScore =
      scoreServer(server) + getServerReputation(server.steamid) + 6;
    const userScore = scoreServerForUser(server);
    return serverScore + userScore;
  };

  const filterGoodServers = (score) => {
    return score > 1.0;
  };
}
