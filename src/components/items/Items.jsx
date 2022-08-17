import { Tabs, Tab, SSRProvider } from 'react-bootstrap';
import ItemsInner from './ItemsInner.jsx';

export default function Items({ items }) {

  if (import.meta.env.PROD) {
    return <></>
  }

  const playerClasses = Object.keys(itemUsedBy);
  return (
  <div className="items-root">
    <SSRProvider>
      <Tabs defaultActiveKey="scout">
        <Tab eventKey="base" title="Base">
          <ItemsInner playerClass="base" items={[items["default"]]}  />
        </Tab>
        {playerClasses.map(playerClass => 
          <Tab key={`${playerClass}-tab`} eventKey={playerClass} title={playerClass[0].toUpperCase() + playerClass.slice(1)}>
            <ItemsInner playerClass={playerClass} items={itemUsedBy[playerClass].map(i => items[i])} />
          </Tab>
        )}
      </Tabs>
    </SSRProvider>
  </div>
  );
}
