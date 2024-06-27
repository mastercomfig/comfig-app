import { useMiniSearch } from "react-minisearch";

const searchOptions = {
  fields: ["name"],
  storeFields: ["name"],
  searchOptions: {
    prefix: true,
    fuzzy: true,
  },
};

export default function MapBans({
  maps,
  mapbans,
  index,
  mapToThumbnail,
  addMapBan,
  setMapBanIndex,
}) {
  const { search, searchResults } = useMiniSearch(maps, searchOptions);

  let mapList = maps;
  if (searchResults?.length) {
    mapList = searchResults;
  }

  return (
    <div className="bg-dark p-1 pb-5 px-5">
      <h3
        className="mb-3 mt-4"
        style={{ fontWeight: 800, letterSpacing: "0.1rem" }}
      >
        SELECT A MAP TO BAN{" "}
        <button
          className="btn btn-dark btn-sm align-text-top"
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
          height: "42rem",
        }}
      >
        {mapList.map((m) => {
          return (
            <div className="col-4" key={m.name}>
              <div
                className="bg-dark px-4 py-3 text-center d-flex align-items-center justify-content-center position-relative"
                style={{
                  backgroundImage: `url('${mapToThumbnail[m.name]}')`,
                  backgroundSize: "cover",
                  height: "10rem",
                  textShadow:
                    "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
                onClick={() => {
                  if (!mapbans.has(m.name)) {
                    addMapBan(m.name, index);
                  }
                  setMapBanIndex(-1);
                }}
              >
                <span className="text-light fw-bold">{m.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
