import { useState } from "react";

export default function ServerList({
  servers,
  mapToThumbnail,
  setShowServers,
  connectToServer,
  calcPingColor,
  finishSearch,
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
              <div className="flex-shrink-0">
                <img
                  className="object-fit-cover"
                  src={mapToThumbnail[server.map]}
                  alt={server.map}
                  style={{ width: "10rem", height: "10rem" }}
                />
              </div>
              <div className="flex-grow-1 ms-3">
                <h3
                  className="mb-1 mt-2"
                  style={{ fontWeight: 800, letterSpacing: "0.1rem" }}
                >
                  {server.name}{" "}
                  <span
                    className={`fas fa-signal text-${calcPingColor(server)}`}
                  ></span>
                </h3>
                <h4
                  className="mb-0 mt-1"
                  style={{ fontWeight: 500, letterSpacing: "0.1rem" }}
                >
                  <strong>Map:</strong> {server.map}
                </h4>
                <h4
                  className="mb-0 mt-1"
                  style={{ fontWeight: 500, letterSpacing: "0.1rem" }}
                >
                  <span>
                    <strong>Players:</strong> {server.players}
                  </span>
                </h4>
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
