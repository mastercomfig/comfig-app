import { parse } from "vdf-parser";

const classes = [
  "scout",
  "soldier",
  "pyro",
  "demoman",
  "heavy",
  "engineer",
  "medic",
  "sniper",
  "spy",
];

const crosshairPacks = {
  "default": {
    "default": {
      name: "Default",
      preview: null,
    }
  },
  "sprites/crosshairs": {
    _64_64: {
      pos: ["64", "64"],
      name: "Large Circle",
      size: "64",
      preview: "circle_large.svg",
    },
    _32_32: {
      pos: ["32", "32"],
      name: "Circle",
      size: "32",
      preview: "circle.svg",
    },
    _64_0: {
      pos: ["64", "0"],
      name: "Sniper",
      size: "32",
      preview: "sniper.png",
    },
    "_64_-1": {
      pos: ["64", "-1"],
      name: "Sniper Center Fix",
      size: "32",
      preview: "sniper.png",
    },
    _0_64: {
      pos: ["0", "64"],
      name: "Medic Cross",
      size: "32",
      preview: "mediccross.png",
    },
    _0_0: {
      pos: ["0", "0"],
      name: "Brackets",
      size: "32",
      preview: "brackets.svg",
    },
    _0_48: {
      pos: ["0", "48"],
      name: "None",
      size: "24",
      preview: null,
    },
  },
  "crosshair1": {
    _0_0: {
      name: "Crosshair Dot"
    }
  },
  "crosshair1OL": {
    _0_0: {
      name: "Crosshair Dot (Outlined)"
    }
  },
  "crosshair2": {
    _0_0: {
      name: "Half Crosshair Dot"
    }
  },
  "crosshair2OL": {
    _0_0: {
      name: "Half Crosshair Dot (Outlined)"
    }
  },
  "crosshair3": {
    _0_0: {
      name: "Solid Circle"
    }
  },
  "crosshair3OL": {
    _0_0: {
      name: "Solid Circle (Outlined)"
    }
  },
  "crosshair5": {
    _0_0: {
      name: "Dot"
    }
  },
  "crosshair5OL": {
    _0_0: {
      name: "Dot (Outlined)"
    }
  },
  "crosshair6": {
    _0_0: {
      name: "Crosshair Gap"
    }
  },
  "crosshair6OL": {
    _0_0: {
      name: "Crosshair Gap (Outlined)"
    }
  },
  "crosshair6circle": {
    _0_0: {
      name: "Crosshair Gap (Circled)"
    }
  },
  "crosshair6circleOL": {
    _0_0: {
      name: "Crosshair Gap (Circled, Outlined)"
    }
  },
  "crosshair7": {
    _0_0: {
      name: "Plus"
    }
  },
  "crosshair7OL": {
    _0_0: {
      name: "Plus (Outlined)"
    }
  },
  "bigcrosshair7": {
    _0_0: {
      name: "Large Plus"
    }
  },
  "bigcrosshair7OL": {
    _0_0: {
      name: "Large Plus (Outlined)"
    }
  },
  "smallcrosshair7": {
    _0_0: {
      name: "Small Plus"
    }
  },
  "smallcrosshair7OL": {
    _0_0: {
      name: "Small Plus (Outlined)"
    }
  },
  "smallcrosshair7circle": {
    _0_0: {
      name: "Small Plus (Circled)"
    }
  },
  "smallcrosshair7circleOL": {
    _0_0: {
      name: "Small Plus (Circled, Outlined)"
    }
  },
  "fatcross": {
    _0_0: {
      name: "Thick Plus"
    }
  },
  "fatcrossOL": {
    _0_0: {
      name: "Thick Plus (Outlined)"
    }
  },
  "fatcross": {
    _0_0: {
      name: "Thick Plus"
    }
  },
  "fatcrossOL": {
    _0_0: {
      name: "Thick Plus (Outlined)"
    }
  },
  "fatcross": {
    _0_0: {
      name: "Thick Plus"
    }
  },
  "fatcrossOL": {
    _0_0: {
      name: "Thick Plus (Outlined)"
    }
  },
  "fatcrosscircle": {
    _0_0: {
      name: "Thick Plus (Circled)"
    }
  },
  "fatcrosscircleOL": {
    _0_0: {
      name: "Thick Plus (Circled, Outlined)"
    }
  },
  "mediccrossbig": {
    _0_0: {
      name: "Large Medic Cross"
    }
  },
  "opencross": {
    _0_0: {
      name: "Open Plus"
    }
  },
  "opencrossOL": {
    _0_0: {
      name: "Open Plus (Outlined)"
    }
  },
  "seeker": {
    _0_0: {
      name: "Seeker"
    }
  },
  "seekerOL": {
    _0_0: {
      name: "Seeker (Outlined)"
    }
  },
  "sniperbig": {
    _0_0: {
      name: "Large Sniper"
    }
  },
  "sniperbigOL": {
    _0_0: {
      name: "Large Sniper (Outlined)"
    }
  },
  "snipercircle": {
    _0_0: {
      name: "Sniper (Circled)"
    }
  },
  "snipercircleOL": {
    _0_0: {
      name: "Large Sniper (Circled, Outlined)"
    }
  },
  "sniperOL": {
    _0_0: {
      name: "Sniper (Outlined)"
    }
  },
  "thalashseeker": {
    _0_0: {
      name: "Thalash's Seeker"
    }
  },
  "yzwings": {
    _0_0: {
      name: "yz50's Wings"
    }
  },
  "tob_rocketcross": {
    _0_0: {
      name: "Circle Cross"
    }
  },
  "tob_wingscross": {
    _0_0: {
      name: "Wings Cross"
    }
  },
  "tob_wingsdot": {
    _0_0: {
      name: "Wings Dot"
    }
  },
  "xhairshadowdefault": {
    _0_0: {
      name: "Shadowed Brackets"
    }
  },
  "xhairshadowdots": {
    _0_0: {
      name: "Shadowed Dots"
    }
  },
  "xhairshadowplus": {
    _0_0: {
      name: "Shadowed Plus"
    }
  },
  "xhairshadowpluss": {
    _0_0: {
      name: "Shadowed Small Plus"
    }
  },
  "cpma_1": {
    _0_0: {
      name: "CPMA 1",
      size: "32"
    }
  },
  "cpma_2": {
    _0_0: {
      name: "CPMA 2",
      size: "32"
    }
  },
  "cpma_2": {
    _0_0: {
      name: "CPMA 2",
      size: "32"
    }
  },
  "cpma_3": {
    _0_0: {
      name: "CPMA 3",
      size: "32"
    }
  },
  "cpma_4": {
    _0_0: {
      name: "CPMA 4",
      size: "32"
    }
  },
  "cpma_6": {
    _0_0: {
      name: "CPMA 6",
      size: "32"
    }
  },
  "cpma_7": {
    _0_0: {
      name: "CPMA 7",
      size: "32"
    }
  },
  "cpma_8": {
    _0_0: {
      name: "CPMA 8",
      size: "32"
    }
  },
  "cpma_9": {
    _0_0: {
      name: "CPMA 9",
      size: "32"
    }
  },
  "cpma_10": {
    _0_0: {
      name: "CPMA 10",
      size: "32"
    }
  },
  "cpma_11": {
    _0_0: {
      name: "CPMA 11"
    }
  },
  "cpma_12": {
    _0_0: {
      name: "CPMA 12"
    }
  },
  "cpma_13": {
    _0_0: {
      name: "CPMA 13"
    }
  },
  "cpma_14": {
    _0_0: {
      name: "CPMA 15"
    }
  },
  "cpma_15": {
    _0_0: {
      name: "CPMA 15"
    }
  },
  "cpma_16": {
    _0_0: {
      name: "CPMA 16"
    }
  },
  "cpma_17": {
    _0_0: {
      name: "CPMA 17"
    }
  },
  "cpma_18": {
    _0_0: {
      name: "CPMA 18"
    }
  },
  "cpma_19": {
    _0_0: {
      name: "CPMA 19"
    }
  },
  "ql_1": {
    _0_0: {
      name: "Quake 1"
    }
  },
  "ql_2": {
    _0_0: {
      name: "Quake 2"
    }
  },
  "ql_3": {
    _0_0: {
      name: "Quake 3"
    }
  },
  "ql_4": {
    _0_0: {
      name: "Quake 4"
    }
  },
  "ql_5": {
    _0_0: {
      name: "Quake 5"
    }
  },
  "ql_6": {
    _0_0: {
      name: "Quake 6",
      size: "32"
    }
  },
  "ql_7": {
    _0_0: {
      name: "Quake 7"
    }
  },
  "ql_8": {
    _0_0: {
      name: "Quake 8"
    }
  },
  "ql_9": {
    _0_0: {
      name: "Quake 9"
    }
  },
  "ql_10": {
    _0_0: {
      name: "Quake 10"
    }
  },
  "ql_11": {
    _0_0: {
      name: "Quake 11"
    }
  },
  "ql_12": {
    _0_0: {
      name: "Quake 12"
    }
  },
  "ql_13": {
    _0_0: {
      name: "Quake 13"
    }
  },
  "ql_14": {
    _0_0: {
      name: "Quake 14"
    }
  },
  "ql_15": {
    _0_0: {
      name: "Quake 15"
    }
  },
  "ql_16": {
    _0_0: {
      name: "Quake 16"
    }
  },
  "ql_17": {
    _0_0: {
      name: "Quake 17"
    }
  },
  "ql_18": {
    _0_0: {
      name: "Quake 18"
    }
  },
  "ql_19": {
    _0_0: {
      name: "Quake 19"
    }
  },
};

const crosshairPackGroups = {
  "Valve": ["default", "sprites/crosshairs"],
  "Leth": ["crosshair1", "crosshair1OL", "crosshair2", "crosshair2OL", "crosshair3", "crosshair3OL", "crosshair5", "crosshair5OL", "crosshair5circle", "crossshair5circleOL", "crosshair6", "crosshair6OL", "crosshair6circle", "crosshair6circleOL", "crosshair7", "crosshair7OL", "bigcrosshair7", "bigcrosshair7OL", "smallcrosshair7", "smallcrosshair7OL", "smallcrosshair7circle", "smallcrosshair7circleOL", "fatcross", "fatcrossOL", "fatcrosscircle", "fatcrosscircleOL", "mediccrossbig", "opencross", "opencrossOL", "seeker", "seekerOL", "sniperbig", "sniperbigOL", "snipercircle", "snipercircleOL", "sniperOL", "thalashseeker", "yzwings"],
  "Tob": ["tob_rocketcross", "tob_wingscross", "tob_wingsdot"],
  "wavesui": ["xhairshadowdefault", "xhairshadowdots", "xhairshadowplus", "xhairshadowpluss", "xhairshadowrocketsthick"],
  "CPMA": ["cpma_1", "cpma_2", "cpma_3", "cpma_4", "cpma_5", "cpma_6", "cpma_7", "cpma_8", "cpma_9", "cpma_10", "cpma_11", "cpma_12", "cpma_13", "cpma_14", "cpma_15", "cpma_16", "cpma_17", "cpma_18", "cpma_19"],
  "Quake": ["ql_1", "ql_2", "ql_3", "ql_4", "ql_5", "ql_6", "ql_7", "ql_8", "ql_9", "ql_10", "ql_11", "ql_12", "ql_13", "ql_14", "ql_15", "ql_16", "ql_17", "ql_18", "ql_19"]
}

let resourceCache = {};
let language = "English";
let languageCache = {};

async function getGameResourceFile(path) {
  if (resourceCache[path]) {
    return resourceCache[path];
  }
  let response = await fetch(
    `https://raw.githubusercontent.com/SteamDatabase/GameTracking-TF2/efd8e5d79c690b33675c41227c33754fbf3e5800/${path}`
  );
  let content = await response.text();
  content = parse(content);
  // kind of a hack, but works for now
  if (content.fWeaponData) {
    content.WeaponData = content.fWeaponData;
    delete content.fWeaponData;
  }
  if (path.includes("tf_weapon")) {
    let parents = path.split("/");
    content.WeaponData.classname = parents[parents.length - 1].split(".")[0];
  }
  resourceCache[path] = content;
  return content;
}

async function getGameResourceDir(path) {
  let headers = {
    "User-Agent": "comfig app",
    Accept: "application/vnd.github.v3+json",
  };

  if (import.meta.env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${import.meta.env.GITHUB_TOKEN}`
  }

  let response = await fetch(
    `https://api.github.com/repos/SteamDatabase/GameTracking-TF2/contents/${path}?ref=efd8e5d79c690b33675c41227c33754fbf3e5800`, {
      headers,
    }
  );
  let contents = await response.json();
  let result = [];
  for (const file of contents) {
    if (file.type === "file") {
      result.push(file.path);
    } else if (file.type === "symlink") {
      result.push(file.target);
    }
  }
  return result;
}

function getLocalization(key) {
  if (Array.isArray(key)) {
    let result = [];
    for (const k of key) {
      result.push(getLocalization(k));
    }
    return result.join(", ");
  }
  if (!key.startsWith("#")) {
    return key;
  }
  try {
    return globalThis.languageCache[language][key.substring(1)];
  } catch (err) {
    console.log(err);
    return key;
  }
}

const blockedItems = [
  "tf_weapon_invis",
  "tf_weapon_objectselection",
  "tf_weapon_parachute",
];

// TODO: really should use item schema API for this
const itemUsedBy = {
  scout: [
    "tf_weapon_bat",
    "tf_weapon_bat_fish",
    "tf_weapon_bat_giftwrap",
    "tf_weapon_bat_wood",
    "tf_weapon_cleaver",
    "tf_weapon_handgun_scout_primary",
    "tf_weapon_handgun_scout_secondary",
    "tf_weapon_jar_milk",
    "tf_weapon_lunchbox_drink",
    "tf_weapon_pep_brawler_blaster",
    "tf_weapon_pistol_scout",
    "tf_weapon_scattergun",
    "tf_weapon_soda_popper",
  ],
  soldier: [
    "tf_weapon_buff_item",
    "tf_weapon_katana",
    "tf_weapon_parachute_secondary",
    "tf_weapon_particle_cannon",
    "tf_weapon_raygun",
    "tf_weapon_rocketlauncher",
    "tf_weapon_rocketlauncher_airstrike",
    "tf_weapon_rocketlauncher_directhit",
    "tf_weapon_shotgun_soldier",
    "tf_weapon_shovel",
  ],
  pyro: [
    "tf_weapon_breakable_sign",
    "tf_weapon_fireaxe",
    "tf_weapon_flamethrower",
    "tf_weapon_flaregun",
    "tf_weapon_flaregun_revenge",
    "tf_weapon_jar_gas",
    "tf_weapon_rocketlauncher_fireball",
    "tf_weapon_rocketpack",
    "tf_weapon_shotgun_pyro",
    "tf_weapon_slap",
  ],
  demoman: [
    "tf_weapon_bottle",
    "tf_weapon_cannon",
    "tf_weapon_grenadelauncher",
    "tf_weapon_katana",
    "tf_weapon_parachute_primary",
    "tf_weapon_pipebomblauncher",
    "tf_weapon_stickbomb",
    "tf_weapon_sword",
  ],
  heavy: [
    "tf_weapon_fists",
    "tf_weapon_lunchbox",
    "tf_weapon_minigun",
    "tf_weapon_shotgun_hwg",
  ],
  engineer: [
    "tf_weapon_builder",
    "tf_weapon_drg_pomson",
    "tf_weapon_laser_pointer",
    "tf_weapon_mechanical_arm",
    "tf_weapon_pda_engineer_build",
    "tf_weapon_pda_engineer_destroy",
    "tf_weapon_pistol",
    "tf_weapon_robot_arm",
    "tf_weapon_sentry_revenge",
    "tf_weapon_shotgun_building_rescue",
    "tf_weapon_shotgun_primary",
    "tf_weapon_wrench",
  ],
  medic: [
    "tf_weapon_bonesaw",
    "tf_weapon_crossbow",
    "tf_weapon_medigun",
    "tf_weapon_syringegun_medic",
  ],
  sniper: [
    "tf_weapon_charged_smg",
    "tf_weapon_club",
    "tf_weapon_compound_bow",
    "tf_weapon_jar",
    "tf_weapon_smg",
    "tf_weapon_sniperrifle",
    "tf_weapon_sniperrifle_classic",
    "tf_weapon_sniperrifle_decap",
  ],
  spy: [
    "tf_weapon_knife",
    "tf_weapon_pda_spy",
    "tf_weapon_revolver",
    "tf_weapon_sapper",
  ],
  "All-Class": [
    "tf_weapon_grapplinghook",
    "tf_weapon_spellbook",
    "tf_weapon_passtime_gun",
  ],
};

// TODO: really should use item schema API for this
const classNameToName = {
  tf_weapon_bat: [
    "#TF_Weapon_Bat",
    "#TF_CandyCane",
    "#TF_BostonBasher",
    "#TF_Unique_RiftFireMace",
    "#TF_Gunbai",
    "#TF_Atomizer",
  ],
  tf_weapon_bat_fish: "#TF_TheHolyMackerel",
  tf_weapon_bat_giftwrap: "#TF_BallBuster",
  tf_weapon_bat_wood: "#TF_Unique_Achievement_Bat",
  tf_weapon_bottle: [
    "#TF_Weapon_Bottle",
    "#TF_ScottishHandshake",
    "#TF_Unique_Makeshiftclub",
  ],
  tf_weapon_bonesaw: [
    "#TF_Weapon_Bonesaw",
    "#TF_Unique_Achievement_Bonesaw1",
    "#TF_Unique_BattleSaw",
    "#TF_Amputator",
    "#TF_SolemnVow",
  ],
  tf_weapon_breakable_sign: "#TF_SD_Sign",
  tf_weapon_buff_item: [
    "#TF_Unique_Achievement_SoldierBuff",
    "#TF_TheBattalionsBackup",
    "#TF_SoldierSashimono",
  ],
  tf_weapon_builder: "Toolbox",
  tf_weapon_charged_smg: "#TF_Pro_SMG",
  tf_weapon_cleaver: "#TF_SD_Cleaver",
  tf_weapon_club: [
    "#TF_Weapon_Club",
    "#TF_Unique_TribalmanKukri",
    "#TF_TheBushwacka",
    "#TF_Shahanshah",
  ],
  //tf_weapon_compound_bow: ["#TF_Unique_Achievement_CompoundBow", "#TF_FortifiedCompound"],
  tf_weapon_compound_bow: "#TF_Unique_Achievement_CompoundBow",
  tf_weapon_crossbow: "#TF_CrusadersCrossbow",
  tf_weapon_drg_pomson: "#TF_Pomson",
  tf_weapon_fireaxe: [
    "#TF_Weapon_FireAxe",
    "#TF_Unique_Achievement_FireAxe1",
    "#TF_Unique_SledgeHammer",
    "#TF_ThePowerjack",
    "#TF_BackScratcher",
    "#TF_Unique_RiftFireAxe",
    "#TF_Mailbox",
    "#TF_RFAHammer",
    "#TF_ThirdDegree",
    "#TF_Lollichop",
  ],
  //tf_weapon_fists: ["#TF_Weapon_Fists", "#TF_Unique_Achievement_Fists", "#TF_Unique_Gloves_of_Running_Urgently", "#TF_WarriorsSpirit", "#TF_FistsOfSteel", "#TF_EvictionNotice", "#TF_Apocofists", "#TF_MasculineMittens", "#TF_Weapon_BreadBite"],
  tf_weapon_fists: "Fists and Gloves",
  //tf_weapon_flamethrower: ["#TF_Weapon_FlameThrower", "#TF_Unique_Achievement_Flamethrower", "#TF_TheDegreaser", "#TF_Phlogistinator", "#TF_Rainblower"],
  /*tf_weapon_flaregun: [
    "#TF_Weapon_FlareGun",
    "#TF_Weapon_Flaregun_Detonator",
    "#TF_ScorchShot",
  ],*/
  tf_weapon_flaregun: "Flare Guns",
  tf_weapon_flaregun_revenge: "#TF_ManMelter",
  tf_weapon_grenadelauncher: [
    "#TF_Weapon_GrenadeLauncher",
    "#TF_LochNLoad",
    "#TF_Weapon_Iron_bomber",
  ],
  tf_weapon_handgun_scout_primary: "#TF_TheShortstop",
  tf_weapon_handgun_scout_secondary: ["#TF_Winger", "#TF_Weapon_PEP_Pistol"],
  //tf_weapon_invis: ["#TF_Weapon_Watch", "#TF_Unique_Achievement_FeignWatch", "#TF_Unique_Achievement_CloakWatch", "#TF_TTG_Watch", "#TF_HM_Watch"],
  tf_weapon_jar: "#TF_Unique_Achievement_Jar",
  tf_weapon_jar_gas: "#TF_GasPasser",
  tf_weapon_jar_milk: "#TF_MadMilk",
  tf_weapon_katana: "#TF_SoldierKatana",
  //tf_weapon_knife: ["#TF_Weapon_Knife", "#TF_EternalReward", "#TF_Kunai", "#TF_BigEarner", "#TF_VoodooPin", "#TF_SharpDresser", "#TF_SpyCicle", "#TF_BlackRose"],
  tf_weapon_laser_pointer: "#TF_Unique_Achievement_Laser_Pointer",
  /*tf_weapon_lunchbox: [
    "#TF_Unique_Achievement_LunchBox",
    "#TF_Unique_Lunchbox_Chocolate",
    "#TF_BuffaloSteak",
    "#TF_SpaceChem_Fishcake",
    "#TF_Robot_Sandvich",
    "#TF_Unique_Lunchbox_Banana",
  ],*/
  tf_weapon_lunchbox: "Lunchbox Consumables",
  tf_weapon_lunchbox_drink: [
    "#TF_Unique_Achievement_EnergyDrink",
    "#TF_Unique_EnergyDrink_CritCola",
  ],
  tf_weapon_mechanical_arm: "#TF_DEX_Pistol",
  //tf_weapon_medigun: ["#TF_Weapon_Medigun", "#TF_Unique_Achievement_Medigun1", "#TF_Unique_MediGun_QuickFix", "#TF_Unique_MediGun_Resist"],
  //tf_weapon_minigun: ["#TF_Weapon_Minigun", "#TF_Unique_Achievement_Minigun", "#TF_Iron_Curtain", "#TF_GatlingGun", "#TF_Tomislav", "#TF_SD_Minigun"],
  tf_weapon_minigun: "Miniguns",
  //tf_weapon_parachute: "#TF_Weapon_BaseJumper",
  tf_weapon_parachute_primary: "#TF_Weapon_BaseJumper",
  tf_weapon_parachute_secondary: "#TF_Weapon_BaseJumper",
  tf_weapon_particle_cannon: "#TF_CowMangler",
  tf_weapon_passtime_gun: "PASS Time JACK",
  tf_weapon_pda_engineer_build: "#TF_Weapon_PDA_Engineer_Builder",
  tf_weapon_pda_engineer_destroy: "#TF_Weapon_PDA_Engineer_Destroyer",
  tf_weapon_pda_spy: "#TF_Weapon_Disguise_Kit",
  tf_weapon_pep_brawler_blaster: "#TF_Weapon_PEP_Scattergun",
  //tf_weapon_pipebomblauncher: ["#TF_Weapon_PipebombLauncher", "#TF_Unique_Achievement_StickyLauncher", "#TF_Weapon_StickyBomb_Jump"],
  tf_weapon_pipebomblauncher: "#TF_Weapon_PipebombLauncher",
  tf_weapon_raygun: "#TF_RighteousBison",
  //tf_weapon_revolver: ["#TF_Weapon_Revolver", "#TF_Unique_Achievement_Revolver", "#TF_TTG_SamRevolver", "#TF_LEtranger", "#TF_Enforcer", "#TF_DEX_Revolver"],
  tf_weapon_revolver: "#TF_Weapon_Revolver",
  tf_weapon_robot_arm: "#TF_Unique_Robot_Arm",
  tf_weapon_rocketlauncher: [
    "#TF_Weapon_RocketLauncher",
    "#TF_TheBlackBox",
    "#TF_Weapon_RocketLauncher_Jump",
    "#TF_LibertyLauncher",
    "#TF_TheOriginal",
    "#TF_DS_DumpsterDevice",
  ],
  tf_weapon_rocketlauncher_airstrike: "#TF_Weapon_AirStrike",
  tf_weapon_rocketlauncher_directhit: "#TF_Unique_Achievement_RocketLauncher",
  tf_weapon_rocketlauncher_fireball: "#TF_Weapon_DragonsFury",
  tf_weapon_rocketpack: "#TF_ThermalThruster",
  //tf_weapon_sapper: ["#TF_Weapon_Spy_Sapper", "#TF_SD_Sapper", "#TF_Weapon_Ap_Sap", "#TF_Weapon_SnackAttack"],
  tf_weapon_sapper: "#TF_Weapon_Spy_Sapper",
  tf_weapon_scattergun: [
    "#TF_Weapon_Scattergun",
    "#TF_Unique_Achievement_Scattergun_Double",
    "#TF_Weapon_BackScatter",
  ],
  tf_weapon_sentry_revenge: "#TF_Unique_Sentry_Shotgun",
  /*tf_weapon_shotgun_hwg: [
    "#TF_Weapon_Shotgun",
    "#TF_RussianRiot",
    "#TF_Weapon_PanicAttack",
  ],*/
  tf_weapon_shotgun_hwg: "Shotguns",
  tf_weapon_shotgun_primary: [
    "#TF_Weapon_Shotgun",
    "#TF_DEX_Shotgun",
    "#TF_Weapon_PanicAttack",
  ],
  /*tf_weapon_shotgun_pyro: [
    "#TF_Weapon_Shotgun",
    "#TF_ReserveShooter",
    "#TF_Weapon_PanicAttack",
  ],*/
  tf_weapon_shotgun_pyro: "Shotguns",
  /*tf_weapon_shotgun_soldier: [
    "#TF_Weapon_Shotgun",
    "#TF_ReserveShooter",
    "#TF_Weapon_PanicAttack",
  ],*/
  tf_weapon_shotgun_soldier: "Shotguns",
  tf_weapon_shovel: [
    "#TF_Weapon_Shovel",
    "#TF_Unique_Achievement_Pickaxe",
    "#TF_MarketGardener",
    "#TF_DisciplinaryAction",
    "#TF_Unique_Pickaxe_EscapePlan",
    "#TF_Unique_Makeshiftclub",
  ],
  tf_weapon_slap: "#TF_Weapon_HotHand",
  tf_weapon_sniperrifle: [
    "#TF_Weapon_SniperRifle",
    "#TF_SydneySleeper",
    "#TF_DEX_Rifle",
    "#TF_Pro_SniperRifle",
    "#TF_CSGO_AWP",
  ],
  tf_weapon_sniperrifle_classic: "#TF_ClassicSniperRifle",
  tf_weapon_sniperrifle_decap: "#TF_BazaarBargain",
  tf_weapon_soda_popper: "#TF_SodaPopper",
  tf_weapon_spellbook: "#TF_FancySpellbook",
  tf_weapon_stickbomb: "#TF_UllapoolCaber",
  /*tf_weapon_sword: [
    "#TF_Unique_Achievement_Sword",
    "#TF_Unique_BattleAxe",
    "#TF_HalloweenBoss_Axe",
    "#TF_Claidheamohmor",
    "#TF_PersianPersuader",
    "#TF_NineIron",
  ],*/
  tf_weapon_sword: "Swords",
  tf_weapon_syringegun_medic: [
    "#TF_Weapon_SyringeGun",
    "#TF_Unique_Achievement_Syringegun1",
    "#TF_Overdose",
  ],
  //tf_weapon_wrench: ["#TF_Weapon_Wrench", "#TF_Unique_Combat_Wrench", "#TF_Unique_Golden_Wrench", "#TF_Jag", "#TF_Wrenchmotron"],
  tf_weapon_wrench: "#TF_Weapon_Wrench",
};

function getItemName(item) {
  let key = item.printname;
  if (classNameToName[item.classname]) {
    key = classNameToName[item.classname];
  }
  return getLocalization(key);
}

const customItemSlot = {
  tf_weapon_buff_item: "Secondary",
  tf_weapon_compound_bow: "Primary",
  tf_weapon_grapplinghook: "Action Item",
  tf_weapon_jar_gas: "Secondary",
  tf_weapon_parachute_primary: "Primary",
  tf_weapon_parachute_secondary: "Secondary",
  tf_weapon_passtime_gun: "Utility",
  tf_weapon_rocketpack: "Secondary",
  tf_weapon_pda_spy: "PDA",
  tf_weapon_spellbook: "Action Item",
  tf_weapon_builder: "Building",
};

const normalizedSlots = {
  primary: "Primary",
  secondary: "Secondary",
  melee: "Melee",
  item1: "Secondary",
  item2: "Melee",
  pda: "PDA",
  building: "Building",
};

const slotToIndex = [
  "Primary",
  "Secondary",
  "Melee",
  "PDA",
  "Building",
  "Action Item",
  "Utility",
];

const explosionEffects = {
  "default": "Default",
  "ExplosionCore_sapperdestroyed": "Sapper Destroyed",
  "muzzle_minigun_starflash01": "Minigun Muzzle Flash",
  "eotl_pyro_pool_explosion_flash": "Pyro Pool Explosion",
  "electrocuted_red_flash": "Electrocuted Red",
  "electrocuted_blue_flash": "Electrocuted Blue",
  "duck_collect_trail_special_red": "Invisible",
};

const explosionPreviews = {
  "default": "default.webp",
  "ExplosionCore_sapperdestroyed": "ExplosionCore_sapperdestroyed.webp",
  "muzzle_minigun_starflash01": "muzzle_minigun_starflash01.webp",
  "eotl_pyro_pool_explosion_flash": "eotl_pyro_pool_explosion_flash.webp",
  "electrocuted_red_flash": "electrocuted_red_flash.webp",
  "electrocuted_blue_flash": "electrocuted_blue_flash.webp",
  "duck_collect_trail_special_red": "duck_collect_trail_special_red.webp",
};

function getNormalizedSlotName(item) {
  if (customItemSlot[item.classname]) {
    return customItemSlot[item.classname];
  }
  let slot = item.WeaponType;
  if (normalizedSlots[slot]) {
    return normalizedSlots[slot];
  }
  return slot;
}

async function getGameResource(path, file, regex) {
  if (regex) {
    let folder = await getGameResourceDir(path);
    let re = new RegExp(file);
    let files = folder.filter((f) => re.test(f));
    let res = [];
    for (const file of files) {
      res.push(await getGameResourceFile(file));
    }
    return res;
  } else {
    return getGameResourceFile(path + file);
  }
}

let items = {
  default: {
    WeaponType: "",
    classname: "default",
    printname: "Default",
    MuzzleFlashParticleEffect: "null",
    BrassModel: "null",
    TracerEffect: "null",
    ExplosionEffect: "null",
    TextureData: {
      crosshair: {
        file: "sprites/crosshairs",
        x: 64,
        y: 64,
      }
    }
  },
};

async function initGameData() {
  const tfItems = await getGameResource(
    "tf/tf2_misc_dir/scripts/",
    "tf_weapon_.*.txt",
    true
  );
  const langRes = await getGameResource(
    "tf/resource/",
    `tf_${language.toLowerCase()}.txt`
  );
  languageCache[langRes.lang.Language] = langRes.lang.Tokens;
  for (const item of tfItems) {
    const data = item.WeaponData;
    if (!blockedItems.includes(data.classname)) {
      items[data.classname] = data;
    }
  }
}

const stockItems = {
  default: [],
  scout: ["tf_weapon_scattergun", "tf_weapon_pistol_scout", "tf_weapon_bat"],
  soldier: ["tf_weapon_rocketlauncher", "tf_weapon_shotgun_soldier", "tf_weapon_shovel"],
  pyro: ["tf_weapon_flamethrower", "tf_weapon_shotgun_pyro", "tf_weapon_fireaxe"],
  demoman: ["tf_weapon_grenadelauncher", "tf_weapon_pipebomblauncher", "tf_weapon_bottle"],
  heavy: ["tf_weapon_minigun", "tf_weapon_shotgun_hwg", "tf_weapon_fists"],
  engineer: ["tf_weapon_shotgun_primary", "tf_weapon_pistol", "tf_weapon_wrench"],
  medic: ["tf_weapon_syringegun_medic", "tf_weapon_medigun", "tf_weapon_bonesaw"],
  sniper: ["tf_weapon_sniperrifle", "tf_weapon_smg", "tf_weapon_club"],
  spy: ["tf_weapon_revolver", "tf_weapon_knife", "tf_weapon_sapper"],
  "All-Class": []
};

const skipExplosionEffect = new Set(["tf_weapon_particle_cannon", "tf_weapon_grapplinghook", "tf_weapon_compound_bow", "tf_weapon_crossbow", "tf_weapon_shotgun_building_rescue", "tf_weapon_rocketlauncher_fireball", "tf_weapon_flaregun", "tf_weapon_flaregun_revenge"]);

const skipMuzzleFlash = new Set(["tf_weapon_drg_pomson", "tf_weapon_mechanical_arm", "tf_weapon_rocketlauncher_fireball", "tf_weapon_minigun"]);

const skipTracer = new Set(["tf_weapon_minigun"]);

globalThis.classes = classes;
globalThis.crosshairPacks = crosshairPacks;
globalThis.crosshairPackGroups = crosshairPackGroups;
globalThis.itemUsedBy = itemUsedBy;
globalThis.slotToIndex = slotToIndex;
globalThis.customItemSlot = customItemSlot;
globalThis.normalizedSlots = normalizedSlots;
globalThis.classNameToName = classNameToName;
globalThis.stockItems = stockItems;
globalThis.getLocalization = getLocalization;
globalThis.getItemName = getItemName;
globalThis.getNormalizedSlotName = getNormalizedSlotName;
globalThis.explosionEffects = explosionEffects;
globalThis.explosionPreviews = explosionPreviews;
globalThis.skipExplosionEffect = skipExplosionEffect;
globalThis.skipMuzzleFlash = skipMuzzleFlash;
globalThis.skipTracer = skipTracer;

export default {
  languageCache,
  items,
  initGameData,
};
