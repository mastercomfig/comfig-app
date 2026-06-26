import adImg from "@img/gamemodes/ad.webp";
import arenaImg from "@img/gamemodes/arena.webp";
import cpImg from "@img/gamemodes/cp.webp";
import ctfImg from "@img/gamemodes/ctf.webp";
import kothImg from "@img/gamemodes/koth.webp";
import payloadImg from "@img/gamemodes/pl.webp";
import plrImg from "@img/gamemodes/plr.webp";
import miscImg from "@img/gamemodes/sd.webp";
import halloweenImg from "@img/gamemodes/halloween.webp";
import jumpImg from "@img/gamemodes/jump.webp";
import mvmImg from "@img/gamemodes/mvm.webp";
import randomImg from "@img/gamemodes/random.webp";
import smissmasImg from "@img/gamemodes/smissmas.webp";
import summerImg from "@img/gamemodes/summer.webp";
import workshopImg from "@img/gamemodes/workshop.webp";

export const coreGamemodes = {
  payload: {
    name: "Payload",
    code: "payload",
    description: "BLU pushes the cart down the track. RED need to stop them.",
    detail:
      "BLU team wins by escorting the payload cart to the enemy base. Stand near the payload to make it move.\n\nRED team wins by preventing the payload cart from reaching the heart of their base.\n\nEnemies can block the payload by getting close to it.",
    skill: 0,
    img: payloadImg,
  },
  koth: {
    name: "King of the Hill",
    code: "koth",
    description: "One team must control a single point until time runs out.",
    detail:
      "Capture the Control Point and defend it until your team's timer runs out.\n\nThe Control Point cannot be captured while locked.\n\nIf the enemy team captures the Control Point, your team's timer will pause until you recapture the point.",
    skill: 0,
    img: kothImg,
  },
  attack_defense: {
    name: "Attack / Defense",
    code: "attack_defense",
    description: "BLU wins by capturing all points. RED wins by stopping them.",
    detail:
      "BLU team wins by capturing the Control Points on each stage before the time runs out.\n\nRED team wins by preventing all the points from being captured.",
    skill: 1,
    img: adImg,
  },
  ctf: {
    name: "Capture the Flag",
    code: "ctf",
    description: "And by flag we mean a glowing briefcase.",
    detail:
      "To win a point, steal the enemy's intelligence briefcase and return it to your base.\n\nYou should also prevent the opposing team from taking your intelligence briefcase to their base.",
    skill: 1,
    img: ctfImg,
  },
  capture_point: {
    name: "Capture Points",
    code: "capture_point",
    description: "Capture all points to win.",
    detail:
      "To win, each team must own all Control Points.\n\nSome Control Points will be locked until others are captured.",
    skill: 1,
    img: cpImg,
  },
  payload_race: {
    name: "Payload Race",
    code: "payload_race",
    description: "Two teams. Two bombs. Two tracks. Hilarity ensues.",
    detail:
      "Escort your payload cart to the finish line before the opposing team can deliver theirs.\n\nStand near the cart to make it move.",
    skill: 1,
    img: plrImg,
  },
};

export const coreGameModeCodes = Object.keys(coreGamemodes);

export const casualGameModes = {
  ...coreGamemodes,
  alternative: {
    name: "Misc",
    code: "alternative",
    description: "Game modes that don't fit into one of the other categories.",
    detail:
      "Select this option to play game modes like Territorial Control, Special Delivery, Medieval, and Player Destruction.",
    skill: 2,
    img: miscImg,
  },
};

export const baseGamemodes = {
  ...casualGameModes,
  arena: {
    name: "Arena",
    code: "arena",
    description: "Quick rounds. No respawns. It's like Counter-Strike!",
    detail:
      "Arena is a fast-paced game mode with no respawns. Be the last team standing to win!\n\nAfter a set amount of time, a control point will become available to capture to win the round without hunting down the entire enemy team.",
    skill: 2,
    img: arenaImg,
  },
};

export const baseGamemodeSet = new Set(Object.keys(baseGamemodes));

export const classicGameModes = {
  payload: {
    name: "Payload",
    code: "payload",
    description: "BLU pushes the cart down the track. RED need to stop them.",
    detail:
      "BLU team wins by escorting the payload cart to the enemy base. Stand near the payload to make it move.\n\nRED team wins by preventing the payload cart from reaching the heart of their base.\n\nEnemies can block the payload by getting close to it.",
    skill: 0,
    img: payloadImg,
  },
  koth: {
    name: "King of the Hill",
    code: "koth",
    description: "One team must control a single point until time runs out.",
    detail:
      "Capture the Control Point and defend it until your team's timer runs out.\n\nThe Control Point cannot be captured while locked.\n\nIf the enemy team captures the Control Point, your team's timer will pause until you recapture the point.",
    skill: 0,
    img: kothImg,
  },
  attack_defense: {
    name: "Attack / Defense",
    code: "attack_defense",
    description: "BLU wins by capturing all points. RED wins by stopping them.",
    detail:
      "BLU team wins by capturing the Control Points on each stage before the time runs out.\n\nRED team wins by preventing all the points from being captured.",
    skill: 0,
    img: adImg,
  },
  payload_race: {
    name: "Payload Race",
    code: "payload_race",
    description: "Two teams. Two bombs. Two tracks. Hilarity ensues.",
    detail:
      "Escort your payload cart to the finish line before the opposing team can deliver theirs.\n\nStand near the cart to make it move.",
    skill: 1,
    img: plrImg,
  },
  capture_point: {
    name: "Capture Points",
    code: "capture_point",
    description: "Capture all points to win.",
    detail:
      "To win, each team must own all Control Points.\n\nSome Control Points will be locked until others are captured.",
    skill: 1,
    img: cpImg,
  },
  ctf: {
    name: "Capture the Flag",
    code: "ctf",
    description: "And by flag we mean a glowing briefcase.",
    detail:
      "To win a point, steal the enemy's intelligence briefcase and return it to your base.\n\nYou should also prevent the opposing team from taking your intelligence briefcase to their base.",
    skill: 1,
    img: ctfImg,
  },
  alternative: {
    name: "Misc",
    code: "alternative",
    description: "Game modes that don't fit into one of the other categories.",
    detail:
      "Select this option to play game modes like Territorial Control, Special Delivery, Medieval, and Player Destruction.",
    skill: 1,
    img: miscImg,
  },
  random: {
    name: "Random",
    code: "random",
    description: "We'll match you into the best game we can find.",
    detail:
      "We'll match you into the best game we can find, regardless of the game type.",
    skill: 1,
    img: randomImg,
  },
};

export const classicGameModeSet = new Set(Object.keys(classicGameModes));
export const classicGameModeSearchAll = Object.keys(classicGameModes).filter(
  (code) => code !== "random",
);

export const classicMaps = new Set([
  "cp_dustbowl",
  "cp_egypt_final",
  "cp_gorge",
  "cp_gravelpit",
  "cp_junction_final",
  "cp_mountainlab",
  "cp_steel",
  "cp_snowplow",
  "cp_5gorge",
  "cp_badlands",
  "cp_coldfront",
  "cp_fastlane",
  "cp_freight_final1",
  "cp_granary",
  "cp_well",
  "cp_yukon_final",
  "cp_foundry",
  "cp_gullywash_final1",
  "cp_process_final",
  "cp_standin_final",
  "cp_snakewater_final1",
  "cp_powerhouse",
  "cp_vanguard",
  "cp_sunshine",
  "cp_metalworks",
  "ctf_2fort",
  "ctf_doublecross",
  "ctf_sawmill",
  "ctf_turbine",
  "ctf_well",
  "ctf_2fort_invasion",
  "ctf_landfall",
  "koth_badlands",
  "koth_harvest_final",
  "koth_lakeside_final",
  "koth_nucleus",
  "koth_sawmill",
  "koth_viaduct",
  "koth_king",
  "koth_suijin",
  "koth_probed",
  "koth_highpass",
  "pl_badwater",
  "pl_frontier_final",
  "pl_goldrush",
  "pl_hoodoo_final",
  "pl_thundermountain",
  "pl_upward",
  "pl_barnblitz",
  "pl_borneo",
  "pl_snowycoast",
  "pl_swiftwater_final1",
  "plr_hightower",
  "plr_pipeline",
  "plr_nightfall_final",
  "sd_doomsday",
  "tc_hydro",
  "pd_watergate",
  "cp_degrootkeep",
  "rd_asteroid",
  "pl_cactuscanyon",
  "ctf_gorge",
  "ctf_thundermountain",
  "ctf_hellfire",
  "pass_brickyard",
  "pass_timbertown",
  "pass_district",
]);

const holidayToImg = {
  summer: summerImg,
  halloween: halloweenImg,
  christmas: smissmasImg,
};

function getHolidayImg(holiday: string) {
  const img = holidayToImg[holiday];
  if (!img) {
    return randomImg.src;
  }
  return img.src;
}

export function getSpecialEventDesc() {
  const date = new Date();
  const month = date.getMonth() + 1;
  // TODO: this should come from the API.
  let name = "Special Event";
  let description = "Play the currently featured maps.";
  let skill = 0;
  let holiday = "update";
  if (month == 10) {
    holiday = "halloween";
    name = "Halloween";
    description = "Tour the featured Halloween maps.";
  } else if (month == 12 || month == 1) {
    holiday = "christmas";
    name = "Smissmas";
    description = "Tour the featured Smissmas maps.";
  } else if (month >= 5 && month <= 8) {
    holiday = "summer";
    name = "Summer";
    description = "Tour the featured Summer maps.";
  }
  const img = getHolidayImg(holiday);
  return {
    name,
    code: "special_events",
    description,
    skill,
    img,
    active: true,
  };
}

export function getDefaultMatchGroupSettings(classicMode: boolean = false) {
  let minSettings: string[];
  if (classicMode) {
    minSettings = [];
  } else {
    minSettings = ["pinglimit", "partysize"];
  }

  let baseSettings: string[];
  if (classicMode) {
    baseSettings = ["maxplayers", "crits", "respawntimes", "dmgspread", "beta"];
  } else {
    baseSettings = [
      "maxplayers",
      "crits",
      "respawntimes",
      "rtd",
      "classres",
      "nocap",
    ];
  }

  const pvpSettings = new Set([
    ...baseSettings,
    ...minSettings,
    "mapbans",
    "gamemodes",
  ]);

  const minSettingsSet = new Set(minSettings);

  let availableSettings;

  if (classicMode) {
    const classicSettings = new Set([...minSettings, ...baseSettings]);
    availableSettings = {
      special_events: classicSettings,
      random: classicSettings,
    };
    for (const key of Object.keys(baseGamemodes)) {
      availableSettings[key] = classicSettings;
    }
  } else {
    availableSettings = {
      pvp: pvpSettings,
      special_events: new Set([...baseSettings, ...minSettings]),
      ws: minSettingsSet,
      pmvm: minSettingsSet,
      mge: minSettingsSet,
      jump: minSettingsSet,
      surf: minSettingsSet,
    };
  }

  return availableSettings;
}

export function getDefaultMatchGroups(classicMode: boolean = false) {
  if (classicMode) {
    return [
      ...Object.values(classicGameModes).map((gm: any) => ({
        ...gm,
        img: gm.img.src,
        active: true,
      })),
    ];
  }

  const matchGroups = [
    {
      name: "Casual",
      code: "pvp",
      description: "We'll match you into the best casual game we can find.",
      skill: 0,
      img: randomImg.src,
      active: true,
    },
    {
      name: "Workshop Maps",
      code: "ws",
      description: "Test out and rate the latest maps from the community.",
      skill: 1,
      img: workshopImg.src,
    },
    {
      name: "Potato MvM",
      code: "pmvm",
      description:
        "Fight against murderous robots with custom upgrades and maps!",
      skill: 1,
      img: mvmImg.src,
    },
    {
      name: "MGE",
      code: "mge",
      description: "Settle who's best in this first-to-20, 1v1 arena format.",
      skill: 2,
      img: randomImg.src,
    },
    {
      name: "Jump / Surf",
      code: "jump",
      description:
        "Use your movement skills to navigate through tutorials and courses.",
      skill: 2,
      img: jumpImg.src,
      active: true,
    },
    {
      name: "Surf",
      code: "surf",
      description:
        "Slide through a series of ramps and obstacles to complete each course.",
      skill: 2,
      img: randomImg.src,
    },
  ];
  return matchGroups;
}
