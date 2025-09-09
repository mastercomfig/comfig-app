import { useCallback, useEffect, useState } from "react";

import useQuickplayStore from "@store/quickplay";

import ServerFinder from "./ServerFinder";

export function MatchGroupSelector({ hash }) {
  const quickplayStore = useQuickplayStore((state) => state);
  const [index, setIndex] = useState(0);
  const [init, setInit] = useState(false);
  const [playNowText, setPlayNowText] = useState("PLAY NOW!");

  const handleSelect = useCallback(
    (selectedIndex: number, fromCarousel: boolean = false) => {
      if (quickplayStore.searching) {
        return;
      }
      setInit(true);
      setIndex(selectedIndex);
      quickplayStore.setMatchGroup(
        quickplayStore.availableMatchGroups[selectedIndex]?.code,
      );
      if (!fromCarousel && quickplayStore.carousel) {
        quickplayStore.carousel.to(selectedIndex);
      }
    },
    [quickplayStore.availableMatchGroups, quickplayStore.searching],
  );

  const startSearching = useCallback(
    (variant: number) => {
      if (quickplayStore.searching) {
        return;
      }
      quickplayStore.setSearching(variant);
      quickplayStore.setFound(0);
    },
    [quickplayStore.searching],
  );

  // Handle available match groups shifting
  useEffect(() => {
    const newIndex = quickplayStore.availableMatchGroups.findIndex(
      (k) => k.code === quickplayStore.matchGroup,
    );
    if (newIndex === index) {
      return;
    }
    handleSelect(newIndex);
  }, [quickplayStore.availableMatchGroups]);

  useEffect(() => {
    if (!init) {
      return;
    }
    const urlparms = new URLSearchParams(window.location.search);
    const gm = urlparms.get("gm");
    if (gm) {
      let gamemodes: string[] = [];
      if (gm === "any") {
        gamemodes = [
          "payload",
          "koth",
          "attack_defense",
          "ctf",
          "capture_point",
          "payload_race",
        ];
      } else {
        gamemodes = gm.split(",").filter((mode) => mode);
      }
      quickplayStore.setGamemodes(gamemodes);
    }
    if (urlparms.get("autostart") === "1") {
      startSearching(1);
    }
    if (urlparms.get("autostart") === "2") {
      quickplayStore.toggleCustomizing();
    }
    if (urlparms.get("autostart") === "3") {
      startSearching(2);
    }
  }, [init]);

  useEffect(() => {
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent;
      const text = customEvent.detail.imFeelingLucky
        ? "TRY AGAIN"
        : "PLAY NOW!";
      setPlayNowText(text);
    };
    document.addEventListener("finished-searching", listener);
    return () => {
      document.removeEventListener("finished-searching", listener);
    };
  }, []);

  useEffect(() => {
    const listener = (event: Event) => {
      handleSelect(event.to, true);
    };
    const carouselEl = document.getElementById("quickplayMatchGroups");
    if (carouselEl) {
      carouselEl.addEventListener("slide.bs.carousel", listener);
    }
    return () => {
      carouselEl?.removeEventListener("slide.bs.carousel", listener);
    };
  }, [quickplayStore.availableMatchGroups]);

  const matchGroups = quickplayStore.availableMatchGroups;

  return (
    <div className="align-middle text-center">
      <div
        id="quickplayMatchGroups"
        className="carousel slide carousel-fade quickplay-section quickplay-carousel p-4"
      >
        <ServerFinder hash={hash} />
        <div
          id="quickplayCarouselIndicators"
          className="carousel-indicators carousel-hidable d-none"
        >
          {matchGroups.map((resource, index) => (
            <button
              type="button"
              data-bs-target="#quickplayMatchGroups"
              data-bs-slide-to={index}
              className={`${index == 0 ? "active" : ""}`}
              aria-current="true"
              aria-label={`Slide ${index + 1} ${resource}`}
              key={resource.code}
            />
          ))}
        </div>
        <div id="quickplayCarouselInner" className="carousel-inner">
          {matchGroups.map((resource, index) => {
            return (
              <div
                className={`carousel-item h-100 d-flex flex-column ${index == 0 ? "active" : ""}`}
                key={resource.code}
              >
                <div
                  className="flex-grow-1"
                  style={{
                    backgroundImage: `url('${resource.img}')`,
                    backgroundPosition: "center",
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    height: "100%",
                  }}
                >
                  <h2
                    className="display-2"
                    style={{
                      color: "#4b3c2d",
                      fontWeight: 700,
                      letterSpacing: "0.2rem",
                      textShadow: "#4b3c2d 0 0 1px",
                    }}
                  >
                    {resource.name}
                  </h2>
                </div>
                <div
                  style={{
                    color: "#2b2f32",
                  }}
                >
                  <p
                    id="gm-desc"
                    className="lead mb-0"
                    style={{
                      fontSize: "2.5rem",
                    }}
                  >
                    <strong>{resource.description}</strong>
                  </p>
                  <div
                    className="text-danger-emphasis"
                    style={{
                      fontSize: "1.2rem",
                    }}
                  >
                    {resource.skill === 0 && (
                      <p className="m-0">Recommended For All Skill Levels</p>
                    )}
                    {resource.skill === 1 && (
                      <p className="m-0">Recommended For Advanced Players</p>
                    )}
                    {resource.skill === 2 && (
                      <p className="m-0">Recommended For Expert Players</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {matchGroups.length > 1 && (
          <>
            <button
              className={`carousel-control-prev carousel-hidable ${quickplayStore.searching ? "d-none" : ""}`}
              type="button"
              data-bs-target="#quickplayMatchGroups"
              data-bs-slide="prev"
            >
              <span
                className="carousel-control-prev-icon carousel-dark-buttons"
                aria-hidden="true"
              />
              <span className="visually-hidden">Previous</span>
            </button>
            <button
              className={`carousel-control-next carousel-hidable ${quickplayStore.searching ? "d-none" : ""}`}
              type="button"
              data-bs-target="#quickplayMatchGroups"
              data-bs-slide="next"
            >
              <span
                className="carousel-control-next-icon carousel-dark-buttons"
                aria-hidden="true"
              />
              <span className="visually-hidden">Next</span>
            </button>
          </>
        )}
      </div>
      <div className="row g-0">
        <div className="col">
          <button
            className="btn btn-success w-100"
            style={{
              fontSize: "2.5rem",
              fontWeight: 800,
              boxShadow: "0 -5px 5px 2px inset #0d5e1b",
            }}
            disabled={!!quickplayStore.searching || quickplayStore.showServers}
            onClick={() => {
              startSearching(1);
            }}
          >
            {quickplayStore.showServers ? "PLAY NOW!" : playNowText}
          </button>
        </div>
        <div className="col-auto">
          <button
            className="btn btn-info w-100"
            style={{
              fontSize: "2.5rem",
              fontWeight: 600,
              boxShadow: "0 -5px 5px 2px inset #5e0d4c",
            }}
            disabled={!!quickplayStore.searching}
            onClick={() => {
              startSearching(2);
            }}
          >
            <span className="fas fa-list fa-fw m-1"></span>
          </button>
        </div>
      </div>
    </div>
  );
}
