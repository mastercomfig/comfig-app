import Tabs from 'react-bootstrap/cjs/Tabs.js';
import Tab from 'react-bootstrap/cjs/Tab.js';
import SSRProvider from 'react-bootstrap/cjs/SSRProvider.js';
import ItemsInner from './ItemsInner';

export default function Items({ items }) {
  const playerClasses = Object.keys(itemUsedBy);
  return (
  <div className="items-root">
    <SSRProvider>
      <Tabs>
        {playerClasses.map(playerClass => 
          <Tab key={playerClass} eventKey={playerClass} title={playerClass[0].toUpperCase() + playerClass.slice(1)}>
            <ItemsInner playerClass={playerClass} items={itemUsedBy[playerClass].map(i => items[i])}  />
          </Tab>
        )}
      </Tabs>
    </SSRProvider>
  </div>
  );
}
