import { useMemo } from "react";

import { getMaxPlayerIndex } from "@utils/quickplay";

import useQuickplayStore from "@store/quickplay";

const MAX_PLAYERS_STATUS = ["24", "24-32", "18-32", "64-100", "At least 18"];
const RESPAWN_STATUS = [
  "Default respawn times",
  "Instant respawn",
  "Any respawn times",
];
const CRIT_STATUS = ["", "No"];
const BETA_STATUS = ["No beta maps", "Only beta maps"];
const RTD_STATUS = ["", "Only RTD"];

const GAMEMODE_STATUS_LOOKUP = {
  any: "Any game mode",
  payload: "Payload",
  koth: "King of the Hill",
  attack_defense: "Attack / Defense",
  ctf: "Capture the Flag",
  capture_point: "Capture Points",
  payload_race: "Payload Race",
  alternative: "Misc",
  arena: "Arena",
};

function genPrefString(
  pref: string,
  status: number,
  statusLookup: Array<string>,
  fullStatus: boolean = false,
) {
  let statusSummary = "Any";
  if (status >= 0) {
    statusSummary = statusLookup[status];
    if (fullStatus) {
      pref = "";
    }
  }
  if (!statusSummary) {
    pref = pref.charAt(0).toUpperCase() + pref.substring(1);
    return pref;
  }
  if (!pref) {
    return statusSummary;
  }
  return `${statusSummary} ${pref}`;
}

function genMaxPlayerString(setting) {
  const status = getMaxPlayerIndex(setting);
  return genPrefString("players", status, MAX_PLAYERS_STATUS);
}

export default function CustomizeButton() {
  const quickplayStore = useQuickplayStore((state) => state);

  const prefString = useMemo(() => {
    const maxPlayerStatus = genMaxPlayerString(quickplayStore.maxPlayerCap);
    const critStatus = genPrefString(
      "random crits",
      quickplayStore.crits,
      CRIT_STATUS,
    );
    const respawnStatus = genPrefString(
      "respawn times",
      quickplayStore.respawntimes,
      RESPAWN_STATUS,
      true,
    );
    const rtdStatus = genPrefString(
      "RTD",
      quickplayStore.rtd,
      RTD_STATUS,
      true,
    );
    const betaStatus = genPrefString(
      "map status",
      quickplayStore.beta,
      BETA_STATUS,
      true,
    );
    const strings = [
      GAMEMODE_STATUS_LOOKUP[quickplayStore.gamemode],
      maxPlayerStatus,
      critStatus,
      respawnStatus,
      rtdStatus,
    ].filter((s) => s);
    return strings.join("; ");
  }, [
    quickplayStore.maxPlayerCap,
    quickplayStore.gamemode,
    quickplayStore.respawntimes,
    quickplayStore.crits,
    quickplayStore.beta,
    quickplayStore.rtd,
  ]);

  return (
    <div>
      <button
        id="quickplay-settings"
        className="btn btn-lg btn-dark me-3"
        onClick={() => {
          quickplayStore.toggleCustomizing();
        }}
      >
        <span className="fas fa-gear"></span>
      </button>
      {prefString}
    </div>
  );
}
