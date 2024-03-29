import { useEffect, useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import ItemsInner from "./ItemsInner.tsx";
import "@utils/game.ts";

export default function Items({ hash }) {
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    (async () => {
      const gameDataResp = await fetch(`/gameData/${hash}.cached.json`);
      const gameData = await gameDataResp.json();
      globalThis.items = gameData.items;
      globalThis.languageCache = gameData.languageCache;
      setResetKey((resetKey) => resetKey + 1);
    })();
  }, [hash]);

  if (!globalThis.items) {
    return <></>;
  }

  const playerClasses = Object.keys(globalThis.itemUsedBy);

  return (
    <div className="items-root">
      <Tabs defaultActiveKey="default" transition={false}>
        <Tab eventKey="default" title="Default">
          <ItemsInner
            key={resetKey}
            playerClass="default"
            items={{ default: globalThis.items["default"] }}
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
                globalThis.itemUsedBy[playerClass].map((i) => [
                  i,
                  globalThis.items[i],
                ]),
              )}
            />
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
