import { useEffect, useState } from "react";

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

const TAG_PREFS = ["crits", "respawntimes", "beta"];

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
  4: "as",
  5: "oc",
  6: "me",
  7: "af",
};

function lerp(inA, inB, outA, outB, x) {
  return outA + ((outB - outA) * (x - inA)) / (inB - inA);
}

export default function ServerFinder() {
  const quickplayStore = useQuickplayStore((state) => state);

  const getRecentPenalty = (address) => {
    let penalty = 0.0;
    const lastTime = quickplayStore.recentServers[address];
    if (lastTime) {
      const elapsed = performance.now() - lastTime;
      if (elapsed <= REJOIN_COOLDOWN) {
        const age = elapsed;
        const ageScore = age / REJOIN_COOLDOWN;
        penalty = (1.0 - ageScore) * REJOIN_PENALTY;
      } else {
        delete quickplayStore.recentServers[address];
      }
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
    const tags = new Set(gametype);
    for (const pref of TAG_PREFS) {
      if (!checkTagPref(pref, tags)) {
        return false;
      }
    }
    return true;
  };

  const [schema, setSchema] = useState({});
  const mapToGamemode = schema.map_gamemodes;

  useEffect(() => {
    fetch("https://worker.comfig.app/api/schema/get", {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => setSchema(data));
  }, []);

  const filterServer = (server) => {
    // Now let's start the server secondary filters.
    const [minCap, maxCap] = quickplayStore.maxPlayerCap;
    // Make sure we have enough player cap.
    if (server.max_players < minCap) {
      return false;
    }
    // Allow for one more player than our cap for SourceTV.
    if (server.max_players > maxCap + 1) {
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

  const scoreServerForUser = (server) => {
    let userScore = 0.0;
    const ping = server.ping;
    const PING_LOW = quickplayStore.pinglimit;
    let pingScore = 0;
    if (ping < PING_LOW) {
      pingScore += lerp(0, PING_LOW, 1.0, PING_LOW_SCORE, ping);
    } else if (ping < PING_MED) {
      pingScore += lerp(
        PING_LOW,
        PING_MED,
        PING_LOW_SCORE,
        PING_MED_SCORE,
        ping,
      );
    } else {
      pingScore += lerp(
        PING_MED,
        PING_HIGH,
        PING_MED_SCORE,
        PING_HIGH_SCORE,
        ping,
      );
    }
    userScore += pingScore;

    // Favor low ping servers with players
    if (server.players > 0) {
      userScore += pingScore;
    }

    userScore = getRecentPenalty(server.addr);

    return userScore;
  };

  const scoreServerForTotal = (server) => {
    const userScore = scoreServerForUser(server);
    return server.score + userScore;
  };

  const filterGoodServers = (score) => {
    return score > 1.0;
  };

  const [progress, setProgress] = useState(0);
  const [servers, setServers] = useState([]);
  const [filteredServers, setFilteredServers] = useState([]);
  const [allFiltered, setAllFiltered] = useState(false);

  useEffect(() => {
    if (!quickplayStore.searching) {
      return;
    }
    setProgress(2);
    fetch("https://worker.comfig.app/api/quickplay/list", {
      method: "POST",
      body: JSON.stringify({
        ping: 0,
      }),
    })
      .then((res) => res.json())
      .then((data) => setServers(data))
      .then(() => setProgress(20));
  }, [quickplayStore.searching]);

  useEffect(() => {
    if (servers.length < 1) {
      return;
    }
    setProgress(20);
    const copiedServers = structuredClone(servers);
    const scoredServers = [];
    for (const server of copiedServers) {
      server.score = scoreServerForTotal(server);
      scoredServers.push(server);
      setProgress(20 + (30 * scoredServers.length) / servers.length);
    }
    const finalServers = [];
    let filtered = 0;
    for (const server of scoredServers) {
      const pct = (finalServers.length + filtered) / servers.length;
      setProgress(50 + 50 * pct);
      if (!filterGoodServers(server.score)) {
        filtered += 1;
        continue;
      }
      if (!filterServer(server)) {
        filtered += 1;
        continue;
      }
      finalServers.push(server);
      const curServers = structuredClone(finalServers);
      setTimeout(
        () => {
          setFilteredServers(curServers);
          const pct = (curServers.length + filtered) / servers.length;
          if (pct === 1) {
            setAllFiltered(true);
          }
        },
        5 + 300 * pct,
      );
    }
  }, [
    servers,
    quickplayStore.maxPlayerCap,
    quickplayStore.gamemode,
    quickplayStore.blocklist,
    quickplayStore.pinglimit,
  ]);

  useEffect(() => {
    if (!allFiltered) {
      return;
    }

    if (filteredServers.length < 1) {
      return;
    }

    filteredServers.sort((a, b) => b.score - a.score);

    window.location.href = `steam://connect/${filteredServers[0].addr}`;
    touchRecentServer(filteredServers[0].addr);
    console.log("servers", servers);
    console.log("filtered", filteredServers);
    console.log("recent", Object.keys(quickplayStore.recentServers).map((s) => [s, getRecentPenalty(s)]));
    quickplayStore.setSearching(0);
    setServers([]);
    setFilteredServers([]);
    setAllFiltered(false);
    const carouselEl = document.getElementById("quickplayGamemodes");
    const event = new Event("finished-searching");
    if (carouselEl) {
      carouselEl.dispatchEvent(event);
    }
  }, [allFiltered]);

  return (
    <div
      className={`position-absolute z-3 top-50 start-50 translate-middle${quickplayStore.searching ? "" : " d-none"}`}
      style={{
        width: "93vh",
      }}
    >
      <div className="bg-dark p-1 px-5" style={{}}>
        <h3
          className="mb-3 mt-4"
          style={{ fontWeight: 800, letterSpacing: "0.1rem" }}
        >
          SEARCHING FOR THE BEST AVAILABLE SERVER
        </h3>
        <div
          className="progress mb-3"
          role="progressbar"
          aria-label="Animated striped example"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ height: "2rem" }}
        >
          <div
            className="progress-bar progress-bar-striped progress-bar-animated"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <h5 className="mb-3">
          Game servers meeting search criteria: {filteredServers.length}
        </h5>
        {/*<button className="btn btn-light mb-3 fw-bold">CANCEL</button>*/}
      </div>
    </div>
  );
}
