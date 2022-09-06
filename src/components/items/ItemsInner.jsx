import { useMemo, useState, useEffect } from 'react';
import { Tab, Row, Col, Nav, FormCheck } from 'react-bootstrap';
import useItemStore from '../../store/items';
import ItemsSelector from './ItemsSelector';

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
  let crosshairPreviews = {"Valve.default.default": null};
  let itemClasses = Object.values(items);
  let isDefault = itemClasses.length === 1 && itemClasses[0].classname === "default";
  if (isDefault) {
    crosshairs = {"Valve.default.default": "Default"};
  }

  for (const packGroup of Object.keys(crosshairPackGroups)) {
    for (const packName of crosshairPackGroups[packGroup]) {
      const pack = crosshairPacks[packName];
      if (!pack) {
        continue;
      }
      for (const x of Object.keys(pack)) {
        let crosshair = pack[x];
        crosshairs[`${packGroup}.${packName}.${x}`] = crosshair.name;
        crosshairPreviews[`${packGroup}.${packName}.${x}`] = crosshair.preview;
      }
    }
  }

  let defaultCrosshairs = {};

  if (isDefault) {
    defaultCrosshairs = {default: "Valve.default.default"};
  } else {
    for (const item of itemClasses) {
      if (!item.TextureData) {
        continue;
      }
      let crosshair = item.TextureData.crosshair;
      const crosshairKey = `_${crosshair.x}_${crosshair.y}`;
      defaultCrosshairs[item.classname] = `Valve.${crosshair.file}.${crosshairKey}`;
    }
  }

  return [crosshairs, defaultCrosshairs, crosshairPreviews];
}

export default function ItemsInner({ playerClass, items }) {

  let [slots, slotNames, firstKey] = useMemo(() => calculateItemSlots(playerClass, items), [playerClass, items]);

  let [crosshairs, defaultCrosshairs, crosshairPreviews] = useMemo(() => calculateCrosshairs(items), []);

  let [itemStore, setItemStore] = useState({});

  useEffect(() => {
    if (itemStore.crosshairs) {
      return;
    }
    if (useItemStore.persist.hasHydrated()) {
      setItemStore(useItemStore.getState());
    }
    useItemStore.persist.onFinishHydration((state) => setItemStore(state));
  }, []);

  if (useItemStore.persist.hasHydrated()) {
    setItemStore(useItemStore.getState());
  } else {
    useItemStore.persist.onFinishHydration((state) => setItemStore(state));
  }

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
                      {selectedCrosshairs 
                      && (<ItemsSelector
                          playerClass={playerClass}
                          selection={selectedCrosshairs?.[item.classname]}
                          options={crosshairs}
                          defaultValue={defaultCrosshairs[item.classname]}
                          classname={item.classname}
                          delItem={delCrosshair}
                          setItem={setCrosshair}
                          isDefaultWeapon={itemClasses[0].classname === "default"}
                          type="crosshair"
                          previewPath="/img/app/crosshairs/preview/"
                          previews={crosshairPreviews}
                          previewClass="crosshair-preview d-flex"
                          previewImgClass="crosshair-preview-img"
                          useAdvancedSelect={true}
                          groups={crosshairPackGroups}
                      />)}
                      {(item.MuzzleFlashParticleEffect && !skipMuzzleFlash.has(item.classname) || item.BrassModel || item.TracerEffect && !skipTracer.has(item.classname)) && <h3 className="pt-4">Firing Effects</h3>}
                      {item.MuzzleFlashParticleEffect && selectedMuzzleFlashes && !skipMuzzleFlash.has(item.classname) && (
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
                      {item.TracerEffect && selectedTracers && !skipTracer.has(item.classname) && (
                        <FormCheck type="switch" label="Tracer" defaultChecked={!selectedTracers.has(item.classname)} onChange={((e) => {
                          let check = e.target.checked;
                          if (!check) {
                            setTracer(item.classname);
                          } else {
                            delTracer(item.classname);
                          }
                        })}></FormCheck>
                      )}
                      {item.ExplosionEffect && !skipExplosionEffect.has(item.classname) && (
                        <>
                          <h3 className="pt-4">Explosion Effect</h3>
                          {selectedExplosion 
                            && (<ItemsSelector
                                playerClass={playerClass}
                                selection={selectedExplosion?.[item.classname]}
                                options={explosionEffects}
                                defaultValue="default"
                                classname={item.classname}
                                delItem={delExplosionEffect}
                                setItem={setExplosionEffect}
                                isDefaultWeapon={itemClasses[0].classname === "default"}
                                type="explosion"
                                previewPath="/img/app/explosions/"
                                previews={explosionPreviews}
                                previewImgClass="explosion-preview-img"
                            />)}
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