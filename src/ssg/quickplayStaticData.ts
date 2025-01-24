import jumpImg from "@img/gamemodes/jump1.webp";
import mvmImg from "@img/gamemodes/mvm.webp";
import randomImg from "@img/gamemodes/random.webp";
import workshopImg from "@img/gamemodes/workshop.webp";


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
      name: "Start Playing",
      code: "pvp",
      description: "We'll match you into the best casual game we can find.",
      skill: 0,
      img: randomImg.src,
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
      name: "Jump",
      code: "jump",
      description:
        "Use your blast jumping skills to navigate through tutorials and courses.",
      skill: 2,
      img: jumpImg.src,
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