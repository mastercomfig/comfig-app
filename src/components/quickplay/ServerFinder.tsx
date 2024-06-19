import { useEffect, useMemo, useState } from "react";

import { MAX_PLAYER_OPTIONS, getMaxPlayerIndex } from "@utils/quickplay";

import useQuickplayStore from "@store/quickplay";

const REJOIN_COOLDOWN = 300 * 1000;
const REJOIN_PENALTY = 1.05;

const BASE_SCORE = 6.025;

const PING_LOW_SCORE = 0.9;
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

function lerp(inA, inB, outA, outB, x) {
  return outA + ((outB - outA) * (x - inA)) / (inB - inA);
}

export default function ServerFinder() {
  const quickplayStore = useQuickplayStore((state) => state);

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

  const [schema, setSchema] = useState({});
  const mapToGamemode = schema.map_gamemodes;

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
    if (quickplayStore.mapbans.has(server.map)) {
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
    if (quickplayStore.pingmode === 1) {
      if (server.players > 0) {
        userScore += pingScore;
      }
    }

    userScore += -getRecentPenalty(server.addr);

    return userScore;
  };

  const scoreServerForTotal = (server) => {
    const userScore = scoreServerForUser(server);
    const totalScore = server.score + userScore;
    if (server.score > BASE_SCORE) {
      return Math.max(BASE_SCORE, totalScore);
    }
    return totalScore;
  };

  const filterGoodServers = (score) => {
    return score > 1.0;
  };

  const [progress, setProgress] = useState(0);
  const [servers, setServers] = useState<Array<any>>([]);
  const [filteredServers, setFilteredServers] = useState<Array<any>>([]);
  const [gamemodePop, setGamemodePop] = useState<Record<string, number>>({});
  const [allFiltered, setAllFiltered] = useState(false);

  useEffect(() => {
    if (!quickplayStore.searching) {
      return;
    }
    setProgress(2);
    const start = performance.now();
    let ping = 0;
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState > 0) {
        xhr.onreadystatechange = null;
        ping = performance.now() - start;
        ping *= 2;
        fetch("https://worker.comfig.app/api/quickplay/list", {
          method: "POST",
          body: JSON.stringify({
            ping,
          }),
        })
          .then((res) => res.json())
          .then((data) => setServers(data))
          .then(() => setProgress(20));
      }
    };

    xhr.open("POST", "https://worker.comfig.app/api/quickplay/hello");
    xhr.send();

    setGamemodePop({});
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
    if (filtered === servers.length) {
      setAllFiltered(true);
    }
  }, [
    servers,
    quickplayStore.maxPlayerCap,
    quickplayStore.gamemode,
    quickplayStore.blocklist,
    quickplayStore.pinglimit,
  ]);

  function finishSearch() {
    quickplayStore.setSearching(0);
    //setServers([]);
    setFilteredServers([]);
    setAllFiltered(false);
    setProgress(0);
    const carouselEl = document.getElementById("quickplayGamemodes");
    const event = new Event("finished-searching");
    if (carouselEl) {
      carouselEl.dispatchEvent(event);
    }
  }

  useEffect(() => {
    if (!allFiltered) {
      return;
    }

    if (filteredServers.length < 1) {
      quickplayStore.setFound(-1);
      finishSearch();
      return;
    }

    filteredServers.sort((a, b) => b.score - a.score);

    const server = filteredServers[0];
    const parms = new URLSearchParams(window.location.search);
    if (parms.get("noconnect") !== "1") {
      window.location.href = `steam://connect/${server.addr}`;
    }
    touchRecentServer(server.addr);
    console.log("Joining", server.addr, server.steamid, server.name);
    quickplayStore.setLastServer(server);
    quickplayStore.setFound(1);
    console.log("servers", servers);
    console.log("filtered", filteredServers);
    console.log(
      "recent",
      Object.keys(quickplayStore.recentServers).map((s) => [
        s,
        -getRecentPenalty(s),
      ]),
    );
    finishSearch();
  }, [allFiltered]);

  const maxPlayerIndex = useMemo(() => {
    return getMaxPlayerIndex(quickplayStore.maxPlayerCap);
  }, [quickplayStore.maxPlayerCap]);

  const pingColor = useMemo(() => {
    if (!quickplayStore.lastServer) {
      return;
    }
    const okPingThreshold = (quickplayStore.pinglimit + PING_MED) / 2;
    const ping = quickplayStore.lastServer.ping;
    if (ping >= BAD_PING_THRESHOLD) {
      return "danger";
    }
    if (ping >= okPingThreshold) {
      return "warning";
    }
    return "success";
  }, [quickplayStore.lastServer, quickplayStore.pinglimit]);

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
        style={{ width: "100%", height: "100%" }}
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
            <h4 style={{ fontWeight: 500 }}>Roll the Dice</h4>
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
          <div className="col-auto">
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
          <div className="col-3">
            <h4 style={{ fontWeight: 500 }}>Ping</h4>
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
                Strict regional matchmaking
              </label>
            </div>
          </div>
          <div className="col-auto">
            <h4 style={{ fontWeight: 500 }}>Blocks/Bans</h4>
            <button
              className="btn btn-danger btn-sm mb-2"
              onClick={() => {
                quickplayStore.setFound(0);
                quickplayStore.clearBlocklist();
              }}
            >
              <span className="fas fa-trash-can"></span> Clear blocked servers
            </button>
            <br />
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                quickplayStore.setFound(0);
                quickplayStore.clearBlocklist();
              }}
            >
              <span className="fas fa-trash-can"></span> Clear map bans
            </button>
          </div>
        </div>
      </div>

      <div
        className={`position-absolute z-3 top-50 start-50 translate-middle${quickplayStore.searching ? "" : " d-none"}`}
        style={{
          width: "95%",
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
        }}
      >
        <div className="bg-dark py-4 px-5" style={{}}>
          <h3
            className="mb-1 mt-1"
            style={{ fontWeight: 800, letterSpacing: "0.1rem" }}
          >
            No servers found to join. Please adjust your options or clear your
            server blocks.
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
        className={`position-absolute z-3 top-50 start-50 translate-middle${quickplayStore.found === 1 ? "" : " d-none"}`}
        style={{
          width: "95%",
        }}
      >
        <div className="bg-dark py-4 px-5" style={{}}>
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
            <span className={`fas fa-signal text-${pingColor}`}></span>
          </h3>
          <h4
            className="mb-0 mt-1"
            style={{ fontWeight: 500, letterSpacing: "0.1rem" }}
          >
            <strong>Map:</strong> {quickplayStore.lastServer?.map}{" "}
            <button
              className="btn btn-danger btn-sm align-text-bottom"
              onClick={() => {
                quickplayStore.addMapBan(quickplayStore.lastServer.map);
                quickplayStore.setFound(0);
              }}
            >
              <span className="fas fa-ban"></span> Ban map
            </button>
          </h4>
          <h4
            className="mb-0 mt-1"
            style={{ fontWeight: 500, letterSpacing: "0.1rem" }}
          >
            {quickplayStore.lastServer?.players === 0 &&
              "This server has no players. Please wait around a minute for others to join through quickplay matchmaking before requeuing."}
            {quickplayStore.lastServer?.players > 0 && (
              <span>
                <strong>Players:</strong> {quickplayStore.lastServer?.players}
              </span>
            )}
          </h4>
          <small>
            Problem auto connecting?{" "}
            <button
              className="btn btn-sm btn-link m-0 p-0 align-baseline"
              onClick={() => {
                if (!navigator.clipboard) {
                  console.error("Clipboard unsupported for connect string.");
                  return;
                }
                navigator.clipboard.writeText(
                  `connect ${quickplayStore.lastServer.addr} quickplay_1`,
                );
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
