import { interpolateRdYlGn } from "d3-scale-chromatic";
import { useMemo } from "react";
import { useMiniSearch } from "react-minisearch";

import { expOut } from "@utils/math";

const searchOptions = {
  fields: ["name"],
  storeFields: ["name"],
  searchOptions: {
    prefix: true,
    fuzzy: true,
  },
};

const MAX_POP = 87;

function getPopulationPct(pop: number) {
  if (pop >= MAX_POP) {
    pop = 1.0;
  } else {
    pop /= MAX_POP;
  }
  return pop;
}

function getPopulationColor(pop: number) {
  return interpolateRdYlGn(expOut(getPopulationPct(pop)));
}

export default function MapBans({
  mapPop,
  maps,
  mapbans,
  index,
  mapToThumbnail,
  addMapBan,
  setMapBanIndex,
}) {
  const sortedMaps = useMemo(() => {
    return maps.toSorted((a, b) => {
      const pop = (mapPop[b] ?? 0) - (mapPop[a] ?? 0);
      if (pop !== 0) {
        return pop;
      }
      return a.localeCompare(b);
    });
  }, [maps, mapPop]);

  const { search, searchResults } = useMiniSearch(sortedMaps, searchOptions);

  let mapList = sortedMaps;
  if (searchResults?.length) {
    mapList = searchResults;
  }

  return (
    <div className="bg-dark p-1 pb-5 px-5 h-100 w-100">
      <h3
        className="mb-3 mt-4"
        style={{ fontWeight: 800, letterSpacing: "0.1rem" }}
      >
        SELECT A MAP TO BAN{" "}
        <button
          className="btn btn-danger btn-sm align-text-top"
          onClick={() => {
            setMapBanIndex(-1);
          }}
        >
          <span className="fas fa-x fa-fw"></span> Cancel
        </button>
      </h3>
      <div role="search">
        <input
          className="form-control"
          type="search"
          placeholder="Search"
          aria-label="Search"
          onChange={(e) => {
            search(e.target.value);
          }}
        />
      </div>
      <br />
      <br />
      <div
        className="row g-4"
        style={{
          overflowY: "auto",
          height: "calc(100% - 7rem)",
        }}
      >
        {mapList.map((m) => {
          return (
            <div className="col-4" key={m.name}>
              <div
                className="bg-dark px-4 py-3 text-center d-flex flex-column align-items-center justify-content-center position-relative"
                style={{
                  backgroundImage: `url('${mapToThumbnail[m.name]}')`,
                  backgroundSize: "cover",
                  height: "10rem",
                  textShadow:
                    "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                  cursor: "pointer",
                  fontSize: "1rem",
                  wordBreak: "break-all",
                }}
                onClick={() => {
                  if (!mapbans.has(m.name)) {
                    addMapBan(m.name, index);
                  }
                  setMapBanIndex(-1);
                }}
              >
                <span className="text-light fw-bold">{m.name}</span>
                <span
                  className="text-light"
                  style={{
                    backgroundColor: getPopulationColor(mapPop[m.name] ?? 0),
                    minWidth: "fit-content",
                    width: `${Math.round(getPopulationPct(mapPop[m.name] ?? 0) * 100)}%`,
                  }}
                >
                  {mapPop[m.name] ?? 0}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
