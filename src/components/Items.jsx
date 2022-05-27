import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import SSRProvider from 'react-bootstrap/SSRProvider';
import ItemsInner from './ItemsInner';

export default function Items({ itemUsedBy, slotToIndex, items, getNormalizedSlotName, getItemName }) {
  const playerClasses = Object.keys(itemUsedBy);
  return (
  <SSRProvider>
    <Tabs>
      {playerClasses.map(playerClass => 
        <Tab key={playerClass} eventKey={playerClass} title={playerClass[0].toUpperCase() + playerClass.slice(1)}>
          <ItemsInner playerClass={playerClass} items={itemUsedBy[playerClass].map(i => i in items ? items[i] : null).filter(i => i !== null)} slotToIndex={slotToIndex} getNormalizedSlotName={getNormalizedSlotName} getItemName={getItemName} />
        </Tab>
      )}
    </Tabs>
  </SSRProvider>
  );
}
