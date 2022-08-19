import { useMemo, useState } from 'react';
import { Button, Tab, Row, Col, Nav, FormSelect } from 'react-bootstrap';
import useItemStore from '../../store/items';
import useHydration from '../../utils/useHydration';

function calculateItemSlots(playerClass, items) {
  let slots = {};
  let slotNames = [];
  let usedItems = new Set();

  function addItemToSlot(item) {
    const slot = getNormalizedSlotName(item);
    if (!(slot in slots)) {
      slots[slot] = [];
    }
    slots[slot].push(item);
    if (!slot) {
      slotNames.push(slot);
    }
  }

  for (const item of stockItems[playerClass]) {
    usedItems.add(item);
    addItemToSlot(items[item]);
  }

  for (const item of Object.values(items)) {
    if (usedItems.has(item.classname)) {
      continue;
    }
    addItemToSlot(item);
  }

  for (const slot of slotToIndex) {
    if (slots[slot]) {
      slotNames.push(slot);
    }
  }

  const firstKey = `${playerClass}-${slots[slotNames[0]][0].classname}`;

  //console.log(slots[slotNames[0]][0]);

  return [slots, slotNames, firstKey];
}

function calculateCrosshairs(items) {
  let cardLookup = [];
  let crosshairs = {};
  let itemClasses = Object.values(items);
  let isDefault = itemClasses.length === 1 && itemClasses[0].classname === "default";
  if (isDefault) {
    crosshairs = {"Per Weapon": null};
  }

  for (const packName of Object.keys(crosshairPacks)) {
    const packIndex = cardLookup.length;
    cardLookup.push(packName);
    const pack = crosshairPacks[packName];
    for (const x of Object.keys(pack)) {
      let crosshair = pack[x];
      crosshairs[crosshair.name] = {
        crosshair,
        packIndex
      }
    }
  }

  let defaultCrosshairs = {};

  if (isDefault) {
    defaultCrosshairs = {default: "Per Weapon"};
  } else {
    for (const item of itemClasses) {
      if (!item.TextureData) {
        continue;
      }
      let crosshair = item.TextureData.crosshair;
      const crosshairPack = crosshairPacks[crosshair.file];
      const crosshairObj = crosshairPack[`_${crosshair.x}_${crosshair.y}`];
      defaultCrosshairs[item.classname] = crosshairObj.name;
    }
  }

  return [cardLookup, crosshairs, defaultCrosshairs];
}

export default function ItemsInner({ playerClass, items }) {

  let [slots, slotNames, firstKey] = useMemo(() => calculateItemSlots(playerClass, items), [playerClass, items]);

  let [cardLookup, crosshairs, defaultCrosshairs] = useMemo(() => calculateCrosshairs(items), []);

  let [itemStore, setItemStore] = useState({});

  useItemStore.persist.onFinishHydration((state) => {
    setItemStore(state);
  });

  const itemClasses = Object.values(items);

  const selectedCrosshairs = itemStore.crosshairs;

  const [putCrosshair, delCrosshair] = useItemStore((state) => [state.putCrosshair, state.delCrosshair]);

  return (
    <Tab.Container defaultActiveKey={firstKey}>
      <Row>
        <Col sm={3} className={`bg-dark py-2 ${slots[""] ? "d-none" : ""}`}>
          <Nav variant="pills" className="flex-column">
            {slotNames.map(slot => <div key={`${playerClass}-${slot}-nav`}>
              {slot && <><Nav.Item className="pt-2"><small className="fw-semibold">{slot.toUpperCase()}</small></Nav.Item>
              <hr></hr></>}
              {slots[slot].map(item => {
                const itemName = getItemName(item);
                return (
                  <Nav.Item key={`${playerClass}-${item.classname}-item`}>
                    <Nav.Link type="button" eventKey={`${playerClass}-${item.classname}`}>{itemName}</Nav.Link>
                  </Nav.Item>
                )
              })}
            </div>)}
          </Nav>
        </Col>
        <Col sm={9}>
          <Tab.Content>
            {slotNames.map(slot =>
                slots[slot].map(item =>
                  <Tab.Pane key={`${playerClass}-${item.classname}-pane`} eventKey={`${playerClass}-${item.classname}`}>
                    <div className="container py-4">
                      <h3>Crosshairs</h3>
                      <div className="row d-flex align-items-center">
                        <div className="col-3">
                          {selectedCrosshairs && <FormSelect className="bg-dark text-light" defaultValue={selectedCrosshairs?.[item.classname] ?? defaultCrosshairs[item.classname]} autoComplete="off" onChange={((e) => {
                            let select = e.target;
                            let option = select.options[select.selectedIndex];
                            let value = option.value;
                            if (value === defaultCrosshairs[item.classname]) {
                              delCrosshair(item.classname);
                            } else {
                              putCrosshair(item.classname, value);
                            }
                          })}>
                            {Object.keys(crosshairs).map(x => <option key={`${playerClass}-${item.classname}-crosshair-${x}`} value={x}>{`${x}${x === defaultCrosshairs[item.classname] && itemClasses[0].classname !== "default" ? " (Default)" : ""}`}</option>)}
                          </FormSelect>}
                        </div>
                        <div className="col-sm-9">
                        </div>
                      </div>
                      {item.SoundData && (
                        <h3 className="pt-4">Sound</h3>
                      )}
                      {item.MuzzleFlashParticleEffect && (
                        <h3 className="pt-4">Muzzle Flash</h3>
                      )}
                      {item.BrassModel && (
                        <h3 className="pt-4">Shell Ejection</h3>
                      )}
                      {item.TracerEffect && (
                        <h3 className="pt-4">Tracer</h3>
                      )}
                      {item.ExplosionEffect && (
                        <h3 className="pt-4">Explosion Effect</h3>
                      )}
                    </div>
                  </Tab.Pane>
                )
            )}
          </Tab.Content>
        </Col>
      </Row>
    </Tab.Container>
  )
}