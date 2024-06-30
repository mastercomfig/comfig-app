import * as Sentry from "@sentry/browser";
import { useEffect, useMemo, useRef, useState } from "react";

import { filterString } from "@utils/filter";
import { MAX_PLAYER_OPTIONS, getMaxPlayerIndex } from "@utils/quickplay";

import useQuickplayStore from "@store/quickplay";

import HelpTooltip from "@components/HelpTooltip";

import MapBans from "./MapBans";
import PingDisplay from "./PingDisplay";
import ServerList from "./ServerList";

const REJOIN_COOLDOWN = 300 * 1000;
const REJOIN_PENALTY = 1.225;

const PING_LOW_SCORE = 0.9;
const PING_MIN = 24.0;
const PING_MED = 150.0;
const PING_MED_SCORE = 0.0;
const PING_HIGH = 300.0;
const PING_HIGH_SCORE = -1.0;

const MIN_PING = 25.0;
const MAX_PING = PING_MED - 1;

const BAD_PING_THRESHOLD = (PING_MED + PING_HIGH) / 2;

const TAG_PREFS = ["crits", "respawntimes", "beta", "rtd"];

const gamemodeToPrefix = {
  attack_defense: "cp",
  powerup: "ctf",
  passtime: "pass",
  special_events: "",
  halloween: "",
  christmas: "",
};

const SERVER_HEADROOM = 1;
const FULL_PLAYERS = 24;

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

let satisfactionTimer: NodeJS.Timeout | null = null;
const SATISFACTION_TIME = 8 * 60 * 1000;

const DISALLOWED_GAMEMODES_IN_ANY = new Set([
  "arena",
  "rd",
  "passtime",
  "powerup",
]);
const DISALLOWED_MAP_PREFIXES_IN_ANY = new Set(["arena", "vsh", "zi", "rd"]);
const DISALLOWED_MAPS_IN_ANY = new Set(["cp_degrootkeep"]);
const DISALLOWED_GAMETYPES_IN_ANY = [
  "passtime",
  "powerup",
  "rd",
  "arena",
  "medieval",
];

const MAP_BAN_INDICES = [0, 1, 2, 3, 4, 5];

function lerp(inA, inB, outA, outB, x) {
  return outA + ((outB - outA) * (x - inA)) / (inB - inA);
}

function fastClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default function ServerFinder() {
  const quickplayStore = useQuickplayStore((state) => state);

  const mapbans = useMemo(() => {
    return new Set(quickplayStore.mapbanlist.slice(0, 5));
  }, [quickplayStore.mapbanlist]);

  const getRecentPenalty = (address) => {
    let penalty = 0.0;
    const lastTime = quickplayStore.recentServers[address];
    if (lastTime) {
      const elapsed = new Date().getTime() - lastTime;
      if (elapsed <= REJOIN_COOLDOWN) {
        const age = elapsed;
        const ageScore = age / REJOIN_COOLDOWN;
        penalty = (1.0 - ageScore) * REJOIN_PENALTY;
        penalty *= penalty;
      } else {
        quickplayStore.removeRecentServer(address);
      }
    }
    return penalty;
  };

  const touchRecentServer = (address) => {
    quickplayStore.setRecentServer(address, new Date().getTime());
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
    } else if (pref === "rtd") {
      if (v === 0) {
        mustNot("rtd");
      } else if (v === 1) {
        must("rtd");
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

  const filterServerTags = (tags: Set<string>) => {
    for (const pref of TAG_PREFS) {
      if (!checkTagPref(pref, tags)) {
        return false;
      }
    }
    return true;
  };

  const [schema, setSchema] = useState<any>(undefined);
  const mapToGamemode = schema?.map_gamemodes ?? {};
  const mapToThumbnail = schema?.map_thumbnails ?? {};

  const allMaps = useMemo(() => {
    return Object.keys(mapToGamemode).map((m, i) => ({ id: i, name: m }));
  }, [schema]);

  const [mapBanIndex, setMapBanIndex] = useState(-1);
  const [showServers, setShowServers] = useState(false);

  useEffect(() => {
    fetch("https://worker.comfig.app/api/schema/get", {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => setSchema(data));
  }, []);

  const filterServerForGamemode = (server, tags: Set<string>) => {
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
    } else {
      const mapGamemode = mapToGamemode[server.map];
      if (DISALLOWED_GAMEMODES_IN_ANY.has(mapGamemode)) {
        return false;
      }
      if (DISALLOWED_MAPS_IN_ANY.has(server.map)) {
        return false;
      }
      const mapPrefix = server.map.split("_")[0];
      if (DISALLOWED_MAP_PREFIXES_IN_ANY.has(mapPrefix)) {
        return false;
      }
      for (const tag of DISALLOWED_GAMETYPES_IN_ANY) {
        if (tags.has(tag)) {
          return false;
        }
      }
    }
    return true;
  };

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
    const tags = new Set(server.gametype) as Set<string>;
    // Check the tags
    if (!filterServerTags(tags)) {
      return false;
    }
    // Check for RTD in name if RTD is disabled
    if (quickplayStore.rtd === 0) {
      if (server.name.toLowerCase().indexOf("rtd") >= 0) {
        return false;
      }
    }
    if (!filterServerForGamemode(server, tags)) {
      return false;
    }
    if (quickplayStore.blocklist.has(server.steamid)) {
      return false;
    }
    if (mapbans.has(server.map)) {
      return false;
    }

    return true;
  };

  const scoreServerForUser = (server) => {
    let userScore = 0.0;
    const ping = server.ping;
    const PING_LOW = quickplayStore.pinglimit;
    let pingScore = 0;
    if (ping <= PING_MIN) {
      pingScore += 1.0;
    } else if (ping < PING_LOW) {
      pingScore += lerp(PING_MIN, PING_LOW, 1.0, PING_LOW_SCORE, ping);
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
    if (quickplayStore.pingmode === 1) {
      if (server.players > 0) {
        userScore += pingScore;
      }
    }

    userScore += -getRecentPenalty(server.addr);

    return userScore;
  };

  const toNearestEven = (num) => {
    return 2 * Math.round(num / 2.0);
  };

  const scoreServerByPlayers = (humans, maxPlayers, partySize) => {
    const newHumans = humans + partySize;
    const newTotalPlayers = newHumans;

    const realMaxPlayers = maxPlayers;
    if (newTotalPlayers + SERVER_HEADROOM > realMaxPlayers) {
      return -100;
    }

    if (maxPlayers > FULL_PLAYERS) {
      maxPlayers = FULL_PLAYERS - partySize;
    }

    if (humans === 0) {
      return -0.3;
    }

    const countLow = toNearestEven(maxPlayers / 3);
    const countIdeal = toNearestEven(maxPlayers * 0.72);

    const scoreLow = 0.1;
    const scoreIdeal = 1.6;
    const scoreFuller = 0.2;

    if (newHumans <= countLow) {
      return lerp(0, countLow, 0.0, scoreLow, newHumans);
    } else if (newHumans <= countIdeal) {
      return lerp(countLow, countIdeal, scoreLow, scoreIdeal, newHumans);
    } else if (newHumans <= maxPlayers) {
      return lerp(countIdeal, maxPlayers, scoreIdeal, scoreFuller, newHumans);
    } else {
      return lerp(maxPlayers, realMaxPlayers, scoreFuller, scoreLow, newHumans);
    }
  };

  const scoreServer = (server) => {
    const partySize = quickplayStore.partysize;
    if (partySize <= 1) {
      return 0.0;
    }
    const humans = server.players;
    const maxPlayers = server.max_players;
    const defaultScore = scoreServerByPlayers(humans, maxPlayers, 1);
    const newScore = scoreServerByPlayers(humans, maxPlayers, partySize);
    return newScore - defaultScore;
  };

  const scoreServerForTotal = (server) => {
    const userScore = scoreServerForUser(server);
    const totalScore = server.score + userScore;
    return totalScore + scoreServer(server);
  };

  const filterGoodServers = (score) => {
    return score > 1.0;
  };

  const [progress, setProgress] = useState(0);
  const cachedServersRef = useRef<Array<any>>([]);
  const pingRef = useRef(-1);
  const untilRef = useRef(0);
  const [servers, setServers] = useState<Array<any>>([]);
  const [filteredServers, setFilteredServers] = useState<Array<any>>([]);
  const [gamemodePop, setGamemodePop] = useState<Record<string, number>>({});
  const [allFiltered, setAllFiltered] = useState(false);

  async function queryServerList() {
    const now = new Date().getTime();
    if (untilRef.current > now) {
      setServers(cachedServersRef.current);
      // HACK: refresh servers array
      cachedServersRef.current = fastClone(cachedServersRef.current);
      if (quickplayStore.searching) {
        setProgress(20);
      }
      return;
    }
    fetch("https://worker.comfig.app/api/quickplay/list", {
      method: "POST",
      body: JSON.stringify({
        ping: pingRef.current,
        version: 2,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setServers(data.servers);
        // HACK: refresh servers array
        cachedServersRef.current = fastClone(data.servers);
        untilRef.current = data.until;
      })
      .then(() => {
        if (quickplayStore.searching) {
          setProgress(20);
        }
      });
  }

  function markSatisfaction() {
    Sentry.metrics.increment("custom.servers.satisfaction_found", 1, {
      tags: {
        maxPlayerCap: getMaxPlayerIndex(quickplayStore.maxPlayerCap),
        gamemode: quickplayStore.gamemode,
        respawntimes: quickplayStore.respawntimes,
        crits: quickplayStore.crits,
        rtd: quickplayStore.rtd,
        partysize: quickplayStore.partysize,
        pingmode: quickplayStore.pingmode,
      },
    });
    Sentry.metrics.distribution(
      "custom.servers.satisfaction_find_count",
      quickplayStore.findCount,
      {
        tags: {
          maxPlayerCap: getMaxPlayerIndex(quickplayStore.maxPlayerCap),
          gamemode: quickplayStore.gamemode,
          respawntimes: quickplayStore.respawntimes,
          crits: quickplayStore.crits,
          rtd: quickplayStore.rtd,
          partysize: quickplayStore.partysize,
          pingmode: quickplayStore.pingmode,
        },
      },
    );
    const now = new Date().getTime();
    Sentry.metrics.distribution(
      "custom.servers.server_satisfaction_find_time",
      (now - quickplayStore.foundTime) / 1000,
      {
        unit: "second",
      },
    );
    quickplayStore.setFindCount(0);
  }

  useEffect(() => {
    // Query ping, then query list
    const start = performance.now();
    let ping = 0;
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState > 0) {
        xhr.onreadystatechange = null;
        ping = performance.now() - start;
        ping *= 2;
        pingRef.current = ping;
        queryServerList();
      }
    };

    xhr.open("POST", "https://worker.comfig.app/api/quickplay/hello");
    xhr.send();

    setGamemodePop({});

    // revisiting site
    const foundTime = quickplayStore.foundTime;
    if (foundTime > 0) {
      const now = new Date().getTime();
      if (now - foundTime > SATISFACTION_TIME) {
        markSatisfaction();
        quickplayStore.setFoundTime(0);
      }
    }
  }, []);

  useEffect(() => {
    if (!quickplayStore.searching) {
      return;
    }
    setProgress(2);

    queryServerList();
  }, [quickplayStore.searching]);

  useEffect(() => {
    if (servers.length < 1) {
      return;
    }
    const gm = quickplayStore.gamemode;
    if (gamemodePop[gm] !== undefined) {
      return;
    }
    let players = 0;
    for (const server of servers) {
      const tags = new Set(server.gametype) as Set<string>;
      if (!filterServerForGamemode(server, tags)) {
        continue;
      }
      players += server.players;
    }
    setGamemodePop({
      ...gamemodePop,
      [gm]: players,
    });
  }, [servers, quickplayStore.gamemode]);

  useEffect(() => {
    if (!quickplayStore.searching) {
      return;
    }
    if (servers.length < 1) {
      return;
    }
    if (!schema) {
      return;
    }
    setProgress(20);
    const copiedServers = fastClone(servers);
    const scoredServers = [];
    for (const server of copiedServers) {
      server.score = scoreServerForTotal(server);
      server.name = filterString(server.name);
      // If we're in the server list, we can choose to connect to a server with only one slot left
      if (
        quickplayStore.searching === 2 &&
        server.score < -50 &&
        server.players < server.max_players
      ) {
        server.score += 100;
      }
      scoredServers.push(server);
      setProgress(20 + (30 * scoredServers.length) / servers.length);
    }
    const finalServers = [];
    let filtered = 0;
    for (const server of scoredServers) {
      const pct = (finalServers.length + filtered) / servers.length;
      setProgress(50 + 50 * pct);
      if (quickplayStore.searching === 1 && !filterGoodServers(server.score)) {
        filtered += 1;
        continue;
      }
      if (!filterServer(server)) {
        filtered += 1;
        continue;
      }
      finalServers.push(server);
      const curServers = fastClone(finalServers);
      setTimeout(
        () => {
          const pct = (curServers.length + filtered) / servers.length;
          if (pct === 1) {
            setAllFiltered(true);
            setFilteredServers(
              curServers.toSorted((a, b) => b.score - a.score),
            );
          } else {
            setFilteredServers(curServers);
          }
        },
        5 + 300 * pct,
      );
    }
    if (filtered === servers.length) {
      setAllFiltered(true);
    }
  }, [
    servers,
    schema,
    quickplayStore.maxPlayerCap,
    quickplayStore.gamemode,
    quickplayStore.blocklist,
    quickplayStore.pinglimit,
  ]);

  function finishSearch(imFeelingLucky) {
    quickplayStore.setSearching(0);
    //setServers([]);
    setFilteredServers([]);
    setAllFiltered(false);
    setProgress(0);
    const carouselEl = document.getElementById("quickplayGamemodes");
    const event = new Event("finished-searching");
    event.imFeelingLucky = imFeelingLucky;
    if (carouselEl) {
      carouselEl.dispatchEvent(event);
    }
  }

  function copyConnect(imFeelingLucky) {
    if (!navigator.clipboard) {
      console.error("Clipboard unsupported for connect string.");
      return;
    }
    const connectStr = imFeelingLucky ? "quickplay" : "quickpick";
    navigator.clipboard.writeText(
      `connect ${quickplayStore.lastServer.addr} ${connectStr}_${quickplayStore.sessionCount ?? 1}`,
    );
  }

  function connectToServer(server, imFeelingLucky: boolean) {
    quickplayStore.setLastServer(server);

    const parms = new URLSearchParams(window.location.search);
    const connectStr = imFeelingLucky ? "quickplay" : "quickpick";

    quickplayStore.setFound(imFeelingLucky ? 1 : 2);

    if (!parms.has("noconnect")) {
      setTimeout(() => {
        if (useQuickplayStore.getState().found < 1) {
          return;
        }
        window.location.href = `steam://connect/${server.addr}/${connectStr}${quickplayStore.sessionCount ?? 1}`;
      }, 1000);
    }

    touchRecentServer(server.addr);

    const now = new Date().getTime();

    if (imFeelingLucky) {
      if (satisfactionTimer) {
        clearTimeout(satisfactionTimer);
      }
      satisfactionTimer = setTimeout(markSatisfaction, SATISFACTION_TIME);
      if (quickplayStore.foundTime > 0) {
        if (now - quickplayStore.foundTime > SATISFACTION_TIME) {
          // revisiting site
          markSatisfaction();
        } else {
          Sentry.metrics.distribution(
            "custom.servers.server_refind_time_sec",
            (now - quickplayStore.foundTime) / 1000,
            {
              unit: "second",
            },
          );
          Sentry.metrics.increment("custom.servers.server_refind", 1, {
            tags: {
              maxPlayerCap: getMaxPlayerIndex(quickplayStore.maxPlayerCap),
              gamemode: quickplayStore.gamemode,
              respawntimes: quickplayStore.respawntimes,
              crits: quickplayStore.crits,
              rtd: quickplayStore.rtd,
              partysize: quickplayStore.partysize,
              pingmode: quickplayStore.pingmode,
            },
          });
        }
      }
    }

    Sentry.metrics.increment("custom.servers.found", 1, {
      tags: {
        maxPlayerCap: getMaxPlayerIndex(quickplayStore.maxPlayerCap),
        gamemode: quickplayStore.gamemode,
        respawntimes: quickplayStore.respawntimes,
        crits: quickplayStore.crits,
        rtd: quickplayStore.rtd,
        partysize: quickplayStore.partysize,
        pingmode: quickplayStore.pingmode,
        searchmode: imFeelingLucky ? 1 : 2,
      },
    });
    Sentry.metrics.distribution("custom.servers.ping", server.ping, {
      tags: {
        pingmode: quickplayStore.pingmode,
        pinglimit: quickplayStore.pinglimit,
        searchmode: imFeelingLucky ? 1 : 2,
      },
      unit: "millisecond",
    });
    Sentry.metrics.distribution(
      "custom.user.pinglimit",
      quickplayStore.pinglimit,
      {
        tags: {
          pingmode: quickplayStore.pingmode,
          ping: server.ping,
          searchmode: imFeelingLucky ? 1 : 2,
        },
        unit: "millisecond",
      },
    );
    Sentry.metrics.distribution("custom.servers.players", server.players, {
      tags: {
        searchmode: imFeelingLucky ? 1 : 2,
      },
    });

    quickplayStore.setSessionCount(quickplayStore.sessionCount + 1);

    if (imFeelingLucky) {
      quickplayStore.setFindCount(quickplayStore.findCount + 1);
      quickplayStore.setFoundTime(now);
      Sentry.metrics.distribution(
        "custom.servers.total_eligible",
        filteredServers.length,
        {
          tags: {
            maxPlayerCap: getMaxPlayerIndex(quickplayStore.maxPlayerCap),
            gamemode: quickplayStore.gamemode,
            respawntimes: quickplayStore.respawntimes,
            crits: quickplayStore.crits,
            rtd: quickplayStore.rtd,
            partysize: quickplayStore.partysize,
            pingmode: quickplayStore.pingmode,
          },
        },
      );
      const goodServers = filteredServers.filter(
        (server) => server.players > 0 && server.ping <= 75,
      );
      Sentry.metrics.distribution(
        "custom.servers.total_good",
        goodServers.length,
        {
          tags: {
            maxPlayerCap: getMaxPlayerIndex(quickplayStore.maxPlayerCap),
            gamemode: quickplayStore.gamemode,
            respawntimes: quickplayStore.respawntimes,
            crits: quickplayStore.crits,
            rtd: quickplayStore.rtd,
            partysize: quickplayStore.partysize,
            pingmode: quickplayStore.pingmode,
          },
        },
      );

      Sentry.metrics.distribution(
        "custom.user.server_blocks_count",
        quickplayStore.blocklist.size,
      );
    }

    finishSearch(imFeelingLucky);

    if (imFeelingLucky) {
      if (parms.has("autoclose")) {
        setTimeout(() => {
          window.close();
        }, 6 * 60);
      }
    }
  }

  useEffect(() => {
    if (!allFiltered) {
      return;
    }

    if (filteredServers.length < 1) {
      quickplayStore.setFound(-1);
      finishSearch(quickplayStore.searching === 1);
      Sentry.metrics.increment("no_servers_found", 1, {
        tags: {
          maxPlayerCap: getMaxPlayerIndex(quickplayStore.maxPlayerCap),
          gamemode: quickplayStore.gamemode,
          respawntimes: quickplayStore.respawntimes,
          crits: quickplayStore.crits,
          rtd: quickplayStore.rtd,
          partysize: quickplayStore.partysize,
        },
      });
      return;
    }

    console.log("all servers:", servers);
    console.log("user selection:", filteredServers);

    if (quickplayStore.searching === 2) {
      setShowServers(true);
      quickplayStore.setSearching(0);
      return;
    }

    const server = fastClone(filteredServers[0]);
    connectToServer(server, true);
  }, [allFiltered]);

  const maxPlayerIndex = useMemo(() => {
    return getMaxPlayerIndex(quickplayStore.maxPlayerCap);
  }, [quickplayStore.maxPlayerCap]);

  const calcPingColor = useMemo(() => {
    return (ping) => {
      const okPingThreshold = (quickplayStore.pinglimit + PING_MED) / 2;
      if (ping >= BAD_PING_THRESHOLD) {
        return "danger";
      }
      if (ping >= okPingThreshold) {
        return "warning";
      }
      return "success";
    };
  }, [quickplayStore.pinglimit]);

  // Look, I know this is bad. I'll split it into components later.
  return (
    <>
      <div
        className={`position-absolute text-start z-2 top-0 end-0 text-info py-2 px-3`}
      >
        {gamemodePop[quickplayStore.gamemode] !== undefined && (
          <p className="lead fw-bold">
            {gamemodePop[quickplayStore.gamemode]}{" "}
            {gamemodePop[quickplayStore.gamemode] === 1 ? "player" : "players"}{" "}
            globally
          </p>
        )}
      </div>
      <div
        className={`position-absolute text-start z-2 top-50 start-50 translate-middle bg-dark-subtle p-5${quickplayStore.customizing ? "" : " d-none"}`}
        style={{ width: "100.1%", height: "100%", overflowY: "auto" }}
      >
        <h3 className="display-6 text-center" style={{ fontWeight: 600 }}>
          ADVANCED OPTIONS
        </h3>
        <div className="row mt-4">
          <div className="col-auto">
            <h4 style={{ fontWeight: 500 }}>Server capacity</h4>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="server-capacity"
                id="server-capacity-0"
                checked={maxPlayerIndex === 0}
                onClick={() =>
                  quickplayStore.setMaxPlayerCap(MAX_PLAYER_OPTIONS[0])
                }
              />
              <label className="form-check-label" htmlFor="server-capacity-0">
                24 players
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="server-capacity"
                id="server-capacity-1"
                checked={maxPlayerIndex === 1}
                onClick={() =>
                  quickplayStore.setMaxPlayerCap(MAX_PLAYER_OPTIONS[1])
                }
              />
              <label className="form-check-label" htmlFor="server-capacity-1">
                24-32 players
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="server-capacity"
                id="server-capacity-2"
                checked={maxPlayerIndex === 2}
                onClick={() =>
                  quickplayStore.setMaxPlayerCap(MAX_PLAYER_OPTIONS[2])
                }
              />
              <label className="form-check-label" htmlFor="server-capacity-2">
                18-32 players
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="server-capacity"
                id="server-capacity-3"
                checked={maxPlayerIndex === 3}
                onClick={() =>
                  quickplayStore.setMaxPlayerCap(MAX_PLAYER_OPTIONS[3])
                }
              />
              <label className="form-check-label" htmlFor="server-capacity-3">
                64-100 players
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="server-capacity"
                id="server-capacity-any"
                checked={maxPlayerIndex === 4}
                onClick={() =>
                  quickplayStore.setMaxPlayerCap(MAX_PLAYER_OPTIONS[4])
                }
              />
              <label className="form-check-label" htmlFor="server-capacity-any">
                Don't care
              </label>
            </div>
          </div>
          <div className="col-auto">
            <h4 style={{ fontWeight: 500 }}>Random crits</h4>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="random-crits"
                id="random-crits-0"
                checked={quickplayStore.crits === 0}
                onClick={() => quickplayStore.setCrits(0)}
              />
              <label className="form-check-label" htmlFor="random-crits-0">
                Enabled
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="random-crits"
                id="random-crits-1"
                checked={quickplayStore.crits === 1}
                onClick={() => quickplayStore.setCrits(1)}
              />
              <label className="form-check-label" htmlFor="random-crits-1">
                Disabled
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="random-crits"
                id="random-crits-any"
                checked={quickplayStore.crits === -1}
                onClick={() => quickplayStore.setCrits(-1)}
              />
              <label className="form-check-label" htmlFor="random-crits-any">
                Don't care
              </label>
            </div>
          </div>
          <div className="col-auto">
            <h4 style={{ fontWeight: 500 }}>Respawn times</h4>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="respawn-times"
                id="respawn-times-0"
                checked={quickplayStore.respawntimes === 0}
                onClick={() => quickplayStore.setRespawnTimes(0)}
              />
              <label className="form-check-label" htmlFor="respawn-times-0">
                Default respawn times
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="respawn-times"
                id="respawn-times-1"
                checked={quickplayStore.respawntimes === 1}
                onClick={() => quickplayStore.setRespawnTimes(1)}
              />
              <label className="form-check-label" htmlFor="respawn-times-1">
                Instant respawn
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="respawn-times"
                id="respawn-times-any"
                checked={quickplayStore.respawntimes === -1}
                onClick={() => quickplayStore.setRespawnTimes(-1)}
              />
              <label className="form-check-label" htmlFor="respawn-times-any">
                Don't care
              </label>
            </div>
          </div>
          <div className="col-auto">
            <h4 style={{ fontWeight: 500 }}>
              RTD{" "}
              <HelpTooltip
                id="rtd-help"
                title="Roll the Dice. A common mod on some casual servers where players can apply a random effect to themselves every so often. You can change this setting to 'Don't care' to expand the server search pool."
              />
            </h4>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="rtd"
                id="rtd-0"
                checked={quickplayStore.rtd === 0}
                onClick={() => quickplayStore.setRtd(0)}
              />
              <label className="form-check-label" htmlFor="rtd-0">
                Disabled
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="rtd"
                id="rtd-1"
                checked={quickplayStore.rtd === 1}
                onClick={() => quickplayStore.setRtd(1)}
              />
              <label className="form-check-label" htmlFor="rtd-1">
                Enabled
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="rtd"
                id="rtd-any"
                checked={quickplayStore.rtd === -1}
                onClick={() => quickplayStore.setRtd(-1)}
              />
              <label className="form-check-label" htmlFor="rtd-any">
                Don't care
              </label>
            </div>
          </div>
          <div className="col-auto d-none">
            <h4 style={{ fontWeight: 500 }}>Beta maps</h4>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="beta-maps"
                id="beta-maps-0"
                checked={quickplayStore.beta === 0}
                onClick={() => quickplayStore.setBeta(0)}
              />
              <label className="form-check-label" htmlFor="beta-maps-0">
                Play released maps
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="beta-maps"
                id="beta-maps-1"
                checked={quickplayStore.beta === 1}
                onClick={() => quickplayStore.setBeta(1)}
              />
              <label className="form-check-label" htmlFor="beta-maps-1">
                Play beta maps
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                readOnly
                name="beta-maps"
                id="beta-maps-any"
                checked={quickplayStore.beta === -1}
                onClick={() => quickplayStore.setBeta(-1)}
              />
              <label className="form-check-label" htmlFor="beta-maps-any">
                Don't care
              </label>
            </div>
          </div>
        </div>
        <br />
        <div className="row">
          <div className="col-md-4">
            <h4 style={{ fontWeight: 500 }}>
              Ping Preference{" "}
              <HelpTooltip
                id="ping-help"
                title="The maximum ping before starting to derank servers for too high ping. This is more effective in some lower populated regions when Strict regional matchmaking is selected."
              />
            </h4>
            <input
              type="range"
              className="form-range"
              value={quickplayStore.pinglimit}
              onChange={(e) =>
                quickplayStore.setPingLimit(parseInt(e.target.value, 10))
              }
              min={MIN_PING}
              max={MAX_PING}
              id="ping-range"
            ></input>
            <label htmlFor="ping-range" className="form-label">
              {quickplayStore.pinglimit}ms
            </label>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={quickplayStore.pingmode}
                onChange={(e) =>
                  quickplayStore.setPingMode(e.target.checked ? 1 : 0)
                }
                id="ping-mode-check"
              />
              <label className="form-check-label" htmlFor="ping-mode-check">
                Strict regional matchmaking{" "}
                <HelpTooltip
                  id="regional-matchmaking-help"
                  title="Strongly prefer servers close to you than far away servers with players."
                />
              </label>
            </div>
          </div>
          <div className="col-md-3">
            <h4 style={{ fontWeight: 500 }}>
              Party Size{" "}
              <HelpTooltip
                id="party-size-help"
                title="Find a server which can fit a party of this size. You queue with this option, and then others in your party can join you once you have joined a server."
              />
            </h4>
            <input
              type="range"
              className="form-range"
              value={quickplayStore.partysize}
              onChange={(e) =>
                quickplayStore.setPartySize(parseInt(e.target.value, 10))
              }
              min={1}
              max={6}
              id="ping-range"
            ></input>
            <label htmlFor="ping-range" className="form-label">
              {quickplayStore.partysize}{" "}
              {quickplayStore.partysize === 1 ? "player" : "players"}
            </label>
          </div>
          <div className="col-auto">
            <h4 style={{ fontWeight: 500 }}>Blocks</h4>
            <p>
              You have {quickplayStore.blocklist.size}{" "}
              {quickplayStore.blocklist.size === 1 ? "server" : "servers"}{" "}
              blocked.
            </p>
            <button
              className="btn btn-danger btn-sm mb-2"
              disabled={quickplayStore.blocklist.size === 0}
              onClick={() => {
                quickplayStore.setFound(0);
                quickplayStore.clearBlocklist();
              }}
            >
              <span className="fas fa-trash-can"></span> Clear blocked servers
            </button>
          </div>
        </div>
        <br />
        <h4 style={{ fontWeight: 500 }}>Map Bans</h4>
        <div className="row g-4">
          {MAP_BAN_INDICES.map((i) => {
            if (quickplayStore.mapbanlist.length <= i) {
              return (
                <div className="col-2" key={i}>
                  <div
                    className="bg-dark px-4 py-3 text-center display-6 d-flex align-items-center justify-content-center"
                    style={{
                      height: "5rem",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setMapBanIndex(i);
                    }}
                  >
                    <span className="fas fa-ban text-body-secondary"></span>
                  </div>
                </div>
              );
            }
            const mapName = quickplayStore.mapbanlist[i];
            return (
              <div className="col-2" key={i}>
                <div
                  className="bg-dark px-4 py-3 text-center d-flex align-items-center justify-content-center position-relative"
                  style={{
                    backgroundImage: `url('${mapToThumbnail[mapName]}')`,
                    backgroundSize: "cover",
                    height: "5rem",
                    textShadow:
                      "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                    cursor: "pointer",
                    wordBreak: "break-all",
                  }}
                  onClick={(e) => {
                    if (e.target.classList.contains("map-ban-remove")) {
                      return;
                    }
                    setMapBanIndex(i);
                  }}
                >
                  <span className="text-light fw-bold">{mapName}</span>
                  <span
                    className="position-absolute top-0 start-100 translate-middle fas fa-circle-xmark map-ban-remove"
                    onClick={() => {
                      quickplayStore.delMapBan(i);
                    }}
                  ></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className={`position-absolute z-3 top-50 start-50 translate-middle${mapBanIndex >= 0 ? "" : " d-none"}`}
        style={{
          width: "95%",
          height: "95%",
        }}
      >
        {allMaps.length && (
          <MapBans
            maps={allMaps}
            mapbans={mapbans}
            index={mapBanIndex}
            mapToThumbnail={mapToThumbnail}
            addMapBan={quickplayStore.addMapBan}
            setMapBanIndex={setMapBanIndex}
          />
        )}
      </div>

      <div
        className={`position-absolute z-3 top-50 start-50 translate-middle${showServers ? "" : " d-none"}`}
        style={{
          width: "95%",
          height: "95%",
        }}
      >
        <ServerList
          servers={filteredServers}
          mapToThumbnail={mapToThumbnail}
          setShowServers={setShowServers}
          connectToServer={connectToServer}
          calcPingColor={calcPingColor}
          finishSearch={finishSearch}
        />
      </div>

      <div
        className={`position-absolute z-3 top-50 start-50 translate-middle${quickplayStore.searching ? "" : " d-none"}`}
        style={{
          width: "95%",
          maxHeight: "95%",
        }}
      >
        <div className="bg-dark p-1 px-5 h-100 w-100">
          <h3
            className="mb-3 mt-4"
            style={{ fontWeight: 800, letterSpacing: "0.1rem" }}
          >
            {quickplayStore.searching === 1 &&
              "SEARCHING FOR THE BEST AVAILABLE SERVER"}
            {quickplayStore.searching === 2 && "SEARCHING FOR SERVERS…"}
          </h3>
          <div
            className="progress mb-3"
            role="progressbar"
            aria-label="Server search progress"
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
        </div>
      </div>

      <div
        className={`position-absolute z-3 top-50 start-50 translate-middle${quickplayStore.found === -1 ? "" : " d-none"}`}
        style={{
          width: "95%",
          maxHeight: "95%",
        }}
      >
        <div className="bg-dark py-4 px-5 h-100 w-100">
          <h3
            className="mb-1 mt-1"
            style={{ fontWeight: 800, letterSpacing: "0.1rem" }}
          >
            No servers found to join. Please adjust your options or clear your
            server blocks and map bans.
          </h3>
          <hr />
          <div
            className="btn-group"
            role="group"
            aria-label="Server list options"
          >
            <button
              className="btn btn-danger"
              onClick={() => {
                quickplayStore.setFound(0);
                quickplayStore.clearBlocklist();
              }}
            >
              <span className="fas fa-trash-can"></span> Clear blocks
            </button>
            <button
              className="btn btn-dark"
              onClick={() => {
                quickplayStore.setFound(0);
              }}
            >
              <span className="fas fa-circle-xmark"></span> Close
            </button>
          </div>
        </div>
      </div>

      <div
        className={`position-absolute z-3 top-50 start-50 translate-middle${quickplayStore.found > 0 ? "" : " d-none"}`}
        style={{
          width: "95%",
          maxHeight: "95%",
        }}
      >
        <div className="bg-dark py-4 px-5 h-100 w-100">
          <h4
            className="mb-0 mt-1"
            style={{ fontWeight: 500, letterSpacing: "0.1rem" }}
          >
            YOU'RE ON YOUR WAY TO…
          </h4>
          <h3
            className="mb-1 mt-2"
            style={{ fontWeight: 800, letterSpacing: "0.1rem" }}
          >
            {quickplayStore.lastServer?.name}{" "}
            <PingDisplay
              ping={quickplayStore.lastServer?.ping}
              calcPingColor={calcPingColor}
            />
          </h3>
          <h4
            className="mb-0 mt-1"
            style={{ fontWeight: 500, letterSpacing: "0.1rem" }}
          >
            <strong>Map</strong>: {quickplayStore.lastServer?.map}{" "}
          </h4>
          <h4
            className="mb-0 mt-1"
            style={{ fontWeight: 500, letterSpacing: "0.1rem" }}
          >
            {quickplayStore.lastServer?.players === 0 &&
              quickplayStore.found !== 2 && (
                <>
                  This server has no players. Please{" "}
                  <strong>wait around a few minutes</strong> for others to join
                  through quickplay matchmaking before requeuing to{" "}
                  <strong>help us populate more servers</strong>!
                </>
              )}
            {(quickplayStore.lastServer?.players > 0 ||
              quickplayStore.found === 2) && (
              <span>
                <strong>Players</strong>: {quickplayStore.lastServer?.players} /
                {quickplayStore.lastServer?.max_players}
              </span>
            )}
          </h4>
          {quickplayStore.lastServer?.players > 0 &&
            quickplayStore.lastServer?.players <= 8 &&
            quickplayStore.found !== 2 && (
              <h5 className="mb-0 mt-1">
                This server has a low number of players. Please{" "}
                <strong>wait around a few minutes</strong> for others to join
                through quickplay matchmaking before requeuing to{" "}
                <strong>help us populate more servers</strong>!
              </h5>
            )}
          <small>
            Problem auto connecting?{" "}
            <button
              className="btn btn-sm btn-link m-0 p-0 align-baseline"
              onClick={() => {
                copyConnect(quickplayStore.searching === 1);
              }}
            >
              Copy connect command
            </button>
          </small>
          <hr />
          <h4
            className="mb-3 mt-3"
            style={{ fontWeight: 500, letterSpacing: "0.1rem" }}
          >
            Did you like this server?
          </h4>
          <div className="btn-group" role="group" aria-label="Server options">
            <button
              className="btn btn-danger"
              onClick={() => {
                quickplayStore.addBlocklist(quickplayStore.lastServer.steamid);
                quickplayStore.setFound(0);
                Sentry.metrics.increment("custom.servers.server_block", 1);
                Sentry.metrics.distribution(
                  "custom.servers.server_block_time_sec",
                  (new Date().getTime() - quickplayStore.foundTime) / 1000,
                  {
                    unit: "second",
                  },
                );
                if (satisfactionTimer) {
                  clearTimeout(satisfactionTimer);
                }
              }}
            >
              <span className="fas fa-ban"></span> No, block it
            </button>
            <button
              className="btn btn-dark"
              onClick={() => {
                quickplayStore.setFound(0);
              }}
            >
              <span className="far fa-circle-xmark"></span> Don't care
            </button>
            <button
              className="btn btn-success"
              onClick={() => {
                quickplayStore.addFavorite(quickplayStore.lastServer.steamid);
                quickplayStore.setFound(0);
                Sentry.metrics.increment("custom.servers.server_fav", 1);
                Sentry.metrics.distribution(
                  "custom.servers.server_fav_time",
                  (new Date().getTime() - quickplayStore.foundTime) / 1000,
                  {
                    unit: "second",
                  },
                );
                if (satisfactionTimer) {
                  clearTimeout(satisfactionTimer);
                }
              }}
            >
              <span className="fas fa-star"></span> Yes, favorite it
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
