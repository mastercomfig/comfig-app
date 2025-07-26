import halloweenImg from "@img/gamemodes/halloween.webp";
import jumpImg from "@img/gamemodes/jump.webp";
import mvmImg from "@img/gamemodes/mvm.webp";
import randomImg from "@img/gamemodes/random.webp";
import smissmasImg from "@img/gamemodes/smissmas.webp";
import summerImg from "@img/gamemodes/summer.webp";
import workshopImg from "@img/gamemodes/workshop.webp";

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

export function getDefaultMatchGroupSettings() {
  const availableSettings = {
    pvp: new Set([
      "maxplayers",
      "crits",
      "respawntimes",
      "rtd",
      "classres",
      "nocap",
      "pinglimit",
      "partysize",
      "mapbans",
      "gamemodes",
    ]),
    special_events: new Set([
      "maxplayers",
      "crits",
      "respawntimes",
      "rtd",
      "classres",
      "nocap",
      "pinglimit",
      "partysize",
    ]),
    ws: new Set(["pinglimit", "partysize"]),
    pmvm: new Set(["pinglimit", "partysize"]),
    mge: new Set(["pinglimit", "partysize"]),
    jump: new Set(["pinglimit", "partysize"]),
    surf: new Set(["pinglimit", "partysize"]),
  };
  return availableSettings;
}

export function getDefaultMatchGroups() {
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
