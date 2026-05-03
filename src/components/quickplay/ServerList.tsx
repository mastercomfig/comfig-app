import { useState } from "react";

import PingDisplay from "./PingDisplay";

const TAG_DISPLAY_REMAP: Record<string, string | null> = {
  ctf: null,
  cp: null,
  koth: null,
  payload: null,
  passtime: null,
  sd: null,
  rd: null,
  tc: null,
  misc: null,
  increased_maxplayers: null,
};

export default function ServerList({
  servers,
  mapToThumbnail,
  setShowServers,
  connectToServer,
  calcPingColor,
  finishSearch,
  classicMode,
}) {
  const [selectedServer, setSelectedServer] = useState<any>(undefined);

  return (
    <div className="bg-dark py-4 px-5 h-100 w-100">
      <h3 className="display-3 text-center fw-bold">Search Results</h3>
      <div
        className="g-4 bg-body text-start"
        style={{
          overflowY: "auto",
          height: "calc(100% - 10rem)",
        }}
      >
        {servers.map((server) => (
          <div
            key={server.addr}
            className={`quickpick-server-item${server.addr === selectedServer?.addr ? " active" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => {
              setSelectedServer(server);
            }}
          >
            <div className="d-flex py-2">
              {mapToThumbnail[server.map] && (
                <div className="flex-shrink-0">
                  <img
                    className="object-fit-cover"
                    src={mapToThumbnail[server.map]}
                    alt={server.map}
                    style={{ width: "10rem", height: "10rem" }}
                    crossOrigin=""
                    loading="lazy"
                  />
                </div>
              )}
              <div className="flex-grow-1 ms-3">
                <h3
                  className="mb-1 mt-2"
                  style={{ fontWeight: 800, letterSpacing: "0.1rem" }}
                >
                  {server.name}{" "}
                  <PingDisplay
                    ping={server.ping}
                    calcPingColor={calcPingColor}
                  />
                </h3>
                <h4
                  className="mb-0 mt-1"
                  style={{ fontWeight: 500, letterSpacing: "0.1rem" }}
                >
                  <strong>Map</strong>: {server.map}
                </h4>
                <h4
                  className="mb-0 mt-1"
                  style={{ fontWeight: 500, letterSpacing: "0.1rem" }}
                >
                  <span>
                    <strong>Players</strong>: {server.players} /{" "}
                    {server.max_players}
                  </span>
                </h4>
                {(() => {
                  if (server.gametype.length < 1 || classicMode) return null;

                  const displayTags = server.gametype
                    .map((tag: string) => TAG_DISPLAY_REMAP[tag] !== undefined ? TAG_DISPLAY_REMAP[tag] : tag)
                    .filter((tag: string | null) => tag !== null);

                  if (displayTags.length === 0) return null;

                  return (
                    <div className="mt-2">
                      {displayTags.map((tag: string) => (
                        <span key={tag} className="badge bg-secondary me-1">
                          {tag}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <hr className="m-0" />
          </div>
        ))}
      </div>
      <br />
      <div className="text-end">
        <button
          className="btn btn-light btn-lg fw-bold px-5 py-3 me-1"
          disabled={!selectedServer}
          onClick={() => {
            setShowServers(false);
            connectToServer(selectedServer, false);
          }}
        >
          Connect
        </button>
        <button
          className="btn btn-light btn-lg fw-bold px-5 py-3"
          onClick={() => {
            setShowServers(false);
            finishSearch(false);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
