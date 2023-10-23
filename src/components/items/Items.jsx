import { useEffect, useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import ItemsInner from "./ItemsInner.jsx";
import "@utils/game.js";

export default function Items({ hash }) {
  let [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    (async () => {
      const gameDataResp = await fetch(`/gameData/${hash}.cached.json`);
      const gameData = await gameDataResp.json();
      globalThis.items = gameData.items;
      globalThis.languageCache = gameData.languageCache;
      setResetKey((resetKey) => resetKey + 1);
    })();
  }, []);

  if (!globalThis.items) {
    return <></>;
  }

  const playerClasses = Object.keys(itemUsedBy);

  return (
    <div className="items-root">
      <Tabs defaultActiveKey="default" transition={false}>
        <Tab eventKey="default" title="Default">
          <ItemsInner
            key={resetKey}
            playerClass="default"
            items={{ default: items["default"] }}
            setResetKey={setResetKey}
          />
        </Tab>
        {playerClasses.map((playerClass) => (
          <Tab
            key={`${playerClass}-tab`}
            eventKey={playerClass}
            title={playerClass[0].toUpperCase() + playerClass.slice(1)}
          >
            <ItemsInner
              key={resetKey}
              playerClass={playerClass}
              items={Object.fromEntries(
                itemUsedBy[playerClass].map((i) => [i, items[i]]),
              )}
            />
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
