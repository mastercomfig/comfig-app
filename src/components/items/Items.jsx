import { useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import ItemsInner from "./ItemsInner.jsx";

export default function Items({ items }) {
  const playerClasses = Object.keys(itemUsedBy);

  let [resetKey, setResetKey] = useState(0);

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
                itemUsedBy[playerClass].map((i) => [i, items[i]])
              )}
            />
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
