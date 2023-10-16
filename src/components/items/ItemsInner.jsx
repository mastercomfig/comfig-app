import { useMemo, useState, useEffect } from "react";
import { Button, Tab, Row, Col, Nav, FormCheck, Form } from "react-bootstrap";
import useItemStore from "@store/items";
import ItemsSelector from "./ItemsSelector";
import pkg from "react-color/lib/Chrome";
const ChromePicker = pkg.default ?? pkg;

const dataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==";

export class ServerCanvas {
  constructor() {
    this.toDataURL = () => dataUrl;
    this.getContext = () => ({
      fillRect: () => {},
      translate: () => {},
    });
  }
}

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
  let crosshairPreviews = { "Valve.default.default": null };
  let itemClasses = Object.values(items);
  let isDefault =
    itemClasses.length === 1 && itemClasses[0].classname === "default";
  if (isDefault) {
    crosshairs = { "Valve.default.default": "Default" };
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
    defaultCrosshairs = { default: "Valve.default.default" };
  } else {
    for (const item of itemClasses) {
      if (!item.TextureData) {
        continue;
      }
      let crosshair = item.TextureData.crosshair;
      const crosshairKey = `_${crosshair.x}_${crosshair.y}`;
      defaultCrosshairs[
        item.classname
      ] = `Valve.${crosshair.file}.${crosshairKey}`;
    }
  }

  return [crosshairs, defaultCrosshairs, crosshairPreviews];
}

export default function ItemsInner({ playerClass, items, setResetKey }) {
  let [slots, slotNames, firstKey] = useMemo(
    () => calculateItemSlots(playerClass, items),
    [playerClass, items]
  );

  let [crosshairs, defaultCrosshairs, crosshairPreviews] = useMemo(
    () => calculateCrosshairs(items),
    []
  );

  let [itemStore, setItemStore] = useState({});

  useEffect(() => {
    let unsubFinishHydration = null;

    if (useItemStore.persist.hasHydrated()) {
      setItemStore(useItemStore.getState());
    } else {
      unsubFinishHydration = useItemStore.persist.onFinishHydration((state) =>
        setItemStore(state)
      );
    }

    return () => {
      if (unsubFinishHydration) {
        unsubFinishHydration();
      }
    };
  }, []);

  const itemClasses = Object.values(items);

  const selectedCrosshairs = itemStore.crosshairs;
  const selectedCrosshairColor = itemStore.crosshairColors?.[playerClass];
  const selectedCrosshairScale = itemStore.crosshairScales?.[playerClass];
  const selectedZoomCrosshairs = itemStore.zoomCrosshairs;
  const selectedMuzzleFlashes = itemStore.muzzleflashes;
  const selectedBrassModels = itemStore.brassmodels;
  const selectedTracers = itemStore.tracers;
  const selectedExplosion = itemStore.explosioneffects;
  const selectedPlayerExplosion = itemStore.playerexplosions;

  const [liveCrosshairColor, setLiveCrosshairColor] = useState(undefined);
  const [liveCrosshairScale, setLiveCrosshairScale] = useState(undefined);

  const currentCrosshairColor = liveCrosshairColor ??
    selectedCrosshairColor ??
    itemStore.crosshairColors?.default ?? { r: 200, g: 200, b: 200, a: 0.784 };
  const defaultCrosshairScale =
    selectedCrosshairScale ?? itemStore.crosshairScales?.default ?? 32;
  const currentCrosshairScale = liveCrosshairScale ?? defaultCrosshairScale;

  const [
    clearAllItems,
    setCrosshair,
    delCrosshair,
    setCrosshairColor,
    delCrosshairColor,
    setCrosshairScale,
    delCrosshairScale,
    setZoomCrosshair,
    delZoomCrosshair,
    setMuzzleFlash,
    delMuzzleFlash,
    setBrassModel,
    delBrassModel,
    setTracer,
    delTracer,
    setExplosionEffect,
    delExplosionEffect,
    setPlayerExplosionEffect,
    delPlayerExplosionEffect,
  ] = useItemStore((state) => [
    state.clearAllItems,
    state.setCrosshair,
    state.delCrosshair,
    state.setCrosshairColor,
    state.delCrosshairColor,
    state.setCrosshairScale,
    state.delCrosshairScale,
    state.setZoomCrosshair,
    state.delZoomCrosshair,
    state.setMuzzleFlash,
    state.delMuzzleFlash,
    state.setBrassModel,
    state.delBrassModel,
    state.setTracer,
    state.delTracer,
    state.setExplosionEffect,
    state.delExplosionEffect,
    state.setPlayerExplosionEffect,
    state.delPlayerExplosionEffect,
  ]);

  const isDefault = itemClasses[0].classname === "default";

  return (
    <Tab.Container defaultActiveKey={firstKey}>
      <Row>
        <Col sm={3} className={`bg-dark py-2 ${slots[""] ? "d-none" : ""}`}>
          <Nav variant="pills" className="flex-column">
            {slotNames.map((slot) => (
              <div key={`${playerClass}-${slot}-nav`}>
                {slot && (
                  <>
                    <Nav.Item className="pt-2">
                      <small className="fw-semibold">
                        {slot.toUpperCase()}
                      </small>
                    </Nav.Item>
                    <hr />
                  </>
                )}
                {slots[slot].map((item) => {
                  const itemName = getItemName(item);
                  return (
                    <Nav.Item key={`${playerClass}-${item.classname}-item`}>
                      <Nav.Link
                        type="button"
                        eventKey={`${playerClass}-${item.classname}`}
                      >
                        {itemName}
                      </Nav.Link>
                    </Nav.Item>
                  );
                })}
              </div>
            ))}
          </Nav>
        </Col>
        <Col sm={9}>
          <Tab.Content>
            {slotNames.map((slot) =>
              slots[slot].map((item) => (
                <Tab.Pane
                  key={`${playerClass}-${item.classname}-pane`}
                  eventKey={`${playerClass}-${item.classname}`}
                >
                  <div className="container py-4">
                    <h3>Crosshairs</h3>
                    {selectedCrosshairs && (
                      <ItemsSelector
                        playerClass={playerClass}
                        selection={selectedCrosshairs?.[item.classname]}
                        options={crosshairs}
                        defaultValue={defaultCrosshairs[item.classname]}
                        classname={item.classname}
                        delItem={delCrosshair}
                        setItem={setCrosshair}
                        isDefaultWeapon={isDefault}
                        type="crosshair"
                        previewPath="/img/app/crosshairs/preview/"
                        previews={crosshairPreviews}
                        previewClass="crosshair-preview d-flex"
                        previewImgClass="crosshair-preview-img"
                        useAdvancedSelect={true}
                        groups={crosshairPackGroups}
                        previewImgStyle={{
                          transform: `scale(${currentCrosshairScale / 32})`,
                        }}
                        colorize={currentCrosshairColor}
                      >
                        {selectedZoomCrosshairs &&
                          zoomable.has(item.classname) && (
                            <>
                              <h5 className="pt-2">Scoped Crosshair</h5>
                              <ItemsSelector
                                playerClass={playerClass}
                                selection={
                                  selectedZoomCrosshairs?.[item.classname]
                                }
                                options={crosshairs}
                                defaultValue={"Valve.default.default"}
                                customDefaultDisplay={"Use weapon crosshair"}
                                classname={item.classname}
                                delItem={delZoomCrosshair}
                                setItem={setZoomCrosshair}
                                isDefaultWeapon={true}
                                type="crosshair"
                                previewPath="/img/app/crosshairs/preview/"
                                previews={crosshairPreviews}
                                previewClass="crosshair-preview d-flex"
                                previewImgClass="crosshair-preview-img"
                                useAdvancedSelect={true}
                                groups={crosshairPackGroups}
                                hidePreview={true}
                              />
                            </>
                          )}
                        <h4 className="pt-2 mb-0">Crosshair Settings</h4>
                        <h6 className="mb-2">
                          <strong>
                            <small>
                              {isDefault || playerClass === "All-Class"
                                ? "ALL CLASSES"
                                : "PER CLASS"}
                            </small>
                          </strong>
                        </h6>
                        <h6>Crosshair Scale: {currentCrosshairScale}</h6>
                        <Form.Range
                          defaultValue={defaultCrosshairScale}
                          min="16"
                          max="64"
                          step="1"
                          onChange={(e) =>
                            setLiveCrosshairScale(e.target.value)
                          }
                          onBlur={(e) => {
                            const isDefault = playerClass === "All-Class";
                            const targetClass = isDefault
                              ? "default"
                              : playerClass;
                            const defaultValue =
                              (isDefault
                                ? undefined
                                : itemStore.crosshairScales?.[playerClass]) ??
                              32;
                            // If we're default, we can't actually reset the value (for now).
                            // Because crosshair scale is archived, so we have no guarantee what the game value is.
                            if (e.target.value === defaultValue && !isDefault) {
                              delCrosshairScale(targetClass);
                            } else {
                              setCrosshairScale(targetClass, e.target.value);
                            }
                          }}
                        />
                        <h6>Crosshair Color</h6>
                        <ChromePicker
                          className="w-100"
                          renderers={{ canvas: ServerCanvas }}
                          color={currentCrosshairColor}
                          onChange={(color) => {
                            setLiveCrosshairColor(color.rgb);
                          }}
                          onChangeComplete={(color) => {
                            setCrosshairColor(
                              playerClass === "All-Class"
                                ? "default"
                                : playerClass,
                              color.rgb
                            );
                          }}
                        />
                        <Button
                          className="w-100"
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            delCrosshairColor(
                              playerClass === "All-Class"
                                ? "default"
                                : playerClass
                            );
                            setLiveCrosshairColor({
                              r: 200,
                              g: 200,
                              b: 200,
                              a: 0.784,
                            });
                          }}
                        >
                          <span className="fa fa-undo fa-fw"></span>{" "}
                          <strong>RESET COLOR</strong>
                        </Button>
                      </ItemsSelector>
                    )}
                    {((item.MuzzleFlashParticleEffect &&
                      !skipMuzzleFlash.has(item.classname)) ||
                      item.BrassModel ||
                      (item.TracerEffect &&
                        !skipTracer.has(item.classname))) && (
                      <h3 className="pt-4">Firing Effects</h3>
                    )}
                    {item.MuzzleFlashParticleEffect &&
                      selectedMuzzleFlashes &&
                      !skipMuzzleFlash.has(item.classname) && (
                        <FormCheck
                          type="switch"
                          label="Muzzle Flash"
                          defaultChecked={
                            !selectedMuzzleFlashes.has(item.classname)
                          }
                          onChange={(e) => {
                            let check = e.target.checked;
                            if (!check) {
                              setMuzzleFlash(item.classname);
                            } else {
                              delMuzzleFlash(item.classname);
                            }
                          }}
                        ></FormCheck>
                      )}
                    {item.BrassModel && selectedBrassModels && (
                      <FormCheck
                        type="switch"
                        label="Shell Ejection"
                        defaultChecked={
                          !selectedBrassModels.has(item.classname)
                        }
                        onChange={(e) => {
                          let check = e.target.checked;
                          if (!check) {
                            setBrassModel(item.classname);
                          } else {
                            delBrassModel(item.classname);
                          }
                        }}
                      ></FormCheck>
                    )}
                    {item.TracerEffect &&
                      selectedTracers &&
                      !skipTracer.has(item.classname) && (
                        <FormCheck
                          type="switch"
                          label="Tracer"
                          defaultChecked={!selectedTracers.has(item.classname)}
                          onChange={(e) => {
                            let check = e.target.checked;
                            if (!check) {
                              setTracer(item.classname);
                            } else {
                              delTracer(item.classname);
                            }
                          }}
                        ></FormCheck>
                      )}
                    {item.ExplosionEffect &&
                      !skipExplosionEffect.has(item.classname) && (
                        <>
                          <h3 className="pt-4">Explosion Effect</h3>
                          {selectedExplosion && (
                            <ItemsSelector
                              playerClass={playerClass}
                              selection={selectedExplosion?.[item.classname]}
                              options={explosionEffects}
                              defaultValue="default"
                              classname={item.classname}
                              delItem={delExplosionEffect}
                              setItem={setExplosionEffect}
                              isDefaultWeapon={isDefault}
                              type="explosion"
                              previewPath="/img/app/explosions/"
                              previews={explosionPreviews}
                              previewImgClass="explosion-preview-img"
                            />
                          )}
                        </>
                      )}
                    {item.ExplosionEffect &&
                      !skipExplosionEffect.has(item.classname) && (
                        <>
                          <h3 className="pt-4">Player Hit Explosion Effect</h3>
                          {selectedPlayerExplosion && (
                            <ItemsSelector
                              playerClass={playerClass}
                              selection={
                                selectedPlayerExplosion?.[item.classname]
                              }
                              options={playerExplosionEffects}
                              defaultValue="default"
                              classname={item.classname}
                              delItem={delPlayerExplosionEffect}
                              setItem={setPlayerExplosionEffect}
                              isDefaultWeapon={isDefault}
                              type="explosion"
                              previewPath="/img/app/explosions/"
                              previews={playerExplosionPreviews}
                              previewImgClass="explosion-preview-img"
                            />
                          )}
                        </>
                      )}
                    {isDefault && (
                      <Button
                        onClick={() => {
                          clearAllItems();
                          setItemStore(useItemStore.getState());
                          setResetKey((state) => state + 1);
                        }}
                        variant="danger"
                        className="mt-5"
                      >
                        <span className="fas fa-undo fa-fw"></span> Reset all
                        weapons
                      </Button>
                    )}
                  </div>
                </Tab.Pane>
              ))
            )}
          </Tab.Content>
        </Col>
      </Row>
    </Tab.Container>
  );
}
