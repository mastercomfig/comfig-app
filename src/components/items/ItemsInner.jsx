import { useMemo, useState } from 'react';
import { Tab, Row, Col, Nav, FormSelect, FormCheck } from 'react-bootstrap';
import useItemStore from '../../store/items';

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

  return [slots, slotNames, firstKey];
}

function calculateCrosshairs(items) {
  let crosshairs = {};
  let itemClasses = Object.values(items);
  let isDefault = itemClasses.length === 1 && itemClasses[0].classname === "default";
  if (isDefault) {
    crosshairs = {"default.default": {name: "Per Weapon"}};
  }

  for (const packName of Object.keys(crosshairPacks)) {
    const pack = crosshairPacks[packName];
    for (const x of Object.keys(pack)) {
      let crosshair = pack[x];
      crosshairs[`${packName}.${x}`] = crosshair;
    }
  }

  let defaultCrosshairs = {};

  if (isDefault) {
    defaultCrosshairs = {default: "default.default"};
  } else {
    for (const item of itemClasses) {
      if (!item.TextureData) {
        continue;
      }
      let crosshair = item.TextureData.crosshair;
      const crosshairKey = `_${crosshair.x}_${crosshair.y}`;
      defaultCrosshairs[item.classname] = `${crosshair.file}.${crosshairKey}`;
    }
  }

  return [crosshairs, defaultCrosshairs];
}

export default function ItemsInner({ playerClass, items }) {

  let [slots, slotNames, firstKey] = useMemo(() => calculateItemSlots(playerClass, items), [playerClass, items]);

  let [crosshairs, defaultCrosshairs] = useMemo(() => calculateCrosshairs(items), []);

  let [itemStore, setItemStore] = useState({});

  useItemStore.persist.onFinishHydration((state) => {
    setItemStore(state);
  });

  const itemClasses = Object.values(items);

  const selectedCrosshairs = itemStore.crosshairs;
  const selectedMuzzleFlashes = itemStore.muzzleflashes;
  const selectedBrassModels = itemStore.brassmodels;
  const selectedTracers = itemStore.tracers;
  const selectedExplosion = itemStore.explosioneffects;

  const [
    setCrosshair,
    delCrosshair,
    setMuzzleFlash,
    delMuzzleFlash,
    setBrassModel,
    delBrassModel,
    setTracer,
    delTracer,
    setExplosionEffect,
    delExplosionEffect,
  ] = useItemStore(
    (state) => 
    [
      state.setCrosshair,
      state.delCrosshair,
      state.setMuzzleFlash,
      state.delMuzzleFlash,
      state.setBrassModel,
      state.delBrassModel,
      state.setTracer,
      state.delTracer,
      state.setExplosionEffect,
      state.delExplosionEffect,
  ]);

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
                              setCrosshair(item.classname, value);
                            }
                          })}>
                            {Object.keys(crosshairs).map(x => <option key={`${playerClass}-${item.classname}-crosshair-${x}`} value={x}>{`${crosshairs[x].name}${x === defaultCrosshairs[item.classname] && itemClasses[0].classname !== "default" ? " (Default)" : ""}`}</option>)}
                          </FormSelect>}
                        </div>
                        <div className="col-sm-9">
                        </div>
                      </div>
                      {(item.MuzzleFlashParticleEffect || item.BrassModel || item.TracerEffect) && <h3 className="pt-4">Firing Effects</h3>}
                      {item.MuzzleFlashParticleEffect && selectedMuzzleFlashes && (
                        <FormCheck type="switch" label="Muzzle Flash" defaultChecked={!selectedMuzzleFlashes.has(item.classname)} onChange={((e) => {
                          let check = e.target.checked;
                          if (!check) {
                            setMuzzleFlash(item.classname);
                          } else {
                            delMuzzleFlash(item.classname);
                          }
                        })}></FormCheck>
                      )}
                      {item.BrassModel && selectedBrassModels && (
                        <FormCheck type="switch" label="Shell Ejection" defaultChecked={!selectedBrassModels.has(item.classname)} onChange={((e) => {
                          let check = e.target.checked;
                          if (!check) {
                            setBrassModel(item.classname);
                          } else {
                            delBrassModel(item.classname);
                          }
                        })}></FormCheck>
                      )}
                      {item.TracerEffect && selectedTracers && (
                        <FormCheck type="switch" label="Tracer" defaultChecked={!selectedTracers.has(item.classname)} onChange={((e) => {
                          let check = e.target.checked;
                          if (!check) {
                            setTracer(item.classname);
                          } else {
                            delTracer(item.classname);
                          }
                        })}></FormCheck>
                      )}
                      {item.ExplosionEffect && item.classname !== "tf_weapon_particle_cannon" && (
                        <>
                          <h3 className="pt-4">Explosion Effect</h3>
                          <div className="row d-flex align-items-center">
                            <div className="col-3">
                              {selectedExplosion && <FormSelect className="bg-dark text-light" defaultValue={selectedExplosion?.[item.classname] ?? "default"} autoComplete="off" onChange={((e) => {
                                let select = e.target;
                                let option = select.options[select.selectedIndex];
                                let value = option.value;
                                if (value === "Default") {
                                  delExplosionEffect(item.classname);
                                } else {
                                  setExplosionEffect(item.classname, value);
                                }
                              })}>
                                {Object.keys(explosionEffects).map(x => <option key={`${playerClass}-${item.classname}-explosion-${explosionEffects[x]}`} value={x}>{explosionEffects[x] === "default" && itemClasses[0].classname === "default" ? "Per Weapon" : x}</option>)}
                              </FormSelect>}
                            </div>
                            <div className="col-sm-9">
                            </div>
                          </div>
                        </>
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