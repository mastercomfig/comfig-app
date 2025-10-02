import crosshairPreviewImg from "@img/app/crosshairs/crosspreview.webp";
import debounce from "lodash/debounce";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Col, Form, FormCheck, Nav, Row, Tab } from "react-bootstrap";
import { type RgbaColor, setNonce } from "react-colorful";

import { getCrosshairPackGroups, getCrosshairPacks } from "@utils/game";
import { getNonce } from "@utils/nonce";

import useItemStore from "@store/items";

import { ColorPickerWrapper } from "./ColorPickerWrapper";
import ItemsSelector from "./ItemsSelector";

const cspNonce = getNonce();

if (cspNonce) {
  setNonce(cspNonce);
}

function calculateItemSlots(playerClass, items) {
  const slots = {};
  const slotNames: string[] = [];
  const usedItems = new Set();

  function addItemToSlot(item) {
    const slot = getNormalizedSlotName(item);
    if (!(slot in slots)) {
      slots[slot] = [];
    }
    slots[slot].push(item);
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

  if (playerClass === "default") {
    slotNames.push("default");
  }

  for (const slot of slotToIndex) {
    if (slots[slot]) {
      slotNames.push(slot);
    }
  }

  const firstKey = `${playerClass}-${slots[slotNames[0]][0].classname}`;

  return [slots, slotNames, firstKey];
}

const defaultColor = { r: 200, g: 200, b: 200, a: 0.78 };

function calculateCrosshairs(items, crosshairPacks, crosshairPackGroups) {
  let crosshairs = {};
  const crosshairPreviews = { "Valve.default.default": null };
  const itemClasses = Object.values(items);
  const isDefault = itemClasses[0].classname === "default";
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
        const crosshair = pack[x];
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
      const crosshair = item.TextureData.crosshair;
      const crosshairKey = `_${crosshair.x}_${crosshair.y}`;
      defaultCrosshairs[item.classname] =
        `Valve.${crosshair.file}.${crosshairKey}`;
    }
  }

  return [crosshairs, defaultCrosshairs, crosshairPreviews];
}

export default function ItemsInner({ playerClass, items, setResetKey = null }) {
  const crosshairPacks = getCrosshairPacks();
  const crosshairPackGroups = getCrosshairPackGroups();

  const [slots, slotNames, firstKey] = useMemo(
    () => calculateItemSlots(playerClass, items),
    [playerClass, items],
  );

  const [crosshairs, defaultCrosshairs, crosshairPreviews] = useMemo(
    () => calculateCrosshairs(items, crosshairPacks, crosshairPackGroups),
    [items, crosshairPacks, crosshairPackGroups],
  );

  const [itemStore, setItemStore] = useState({});

  useEffect(() => {
    let unsubFinishHydration: (() => void) | null = null;

    if (useItemStore.persist.hasHydrated()) {
      setItemStore(useItemStore.getState());
    } else {
      unsubFinishHydration = useItemStore.persist.onFinishHydration((state) => {
        setItemStore(state);
      });
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

  const [liveCrosshairColor, setLiveCrosshairColor] = useState<
    RgbaColor | undefined
  >(undefined);
  const [liveCrosshairScale, setLiveCrosshairScale] = useState<
    number | undefined
  >(undefined);

  const currentCrosshairColor =
    liveCrosshairColor ??
    selectedCrosshairColor ??
    itemStore.crosshairColors?.default ??
    defaultColor;
  const defaultCrosshairColor = useMemo(
    () =>
      selectedCrosshairColor ??
      itemStore.crosshairColors?.default ??
      defaultColor,
    [],
  );
  const defaultCrosshairScale =
    selectedCrosshairScale ?? itemStore.crosshairScales?.default ?? 32;
  const currentCrosshairScale = liveCrosshairScale ?? defaultCrosshairScale;

  const state = useItemStore((state) => state);

  const crosshairColorDebounce = useMemo(
    () =>
      debounce((color) => {
        state.setCrosshairColor(
          playerClass === "All-Class" ? "default" : playerClass,
          color,
        );
      }, 300),
    [],
  );

  const onColorChange = useCallback(
    (color) => {
      setLiveCrosshairColor(color);
      crosshairColorDebounce(color);
    },
    [setLiveCrosshairColor, crosshairColorDebounce],
  );

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
                  <div className="container g-0 py-4">
                    <h3>Crosshairs</h3>
                    {selectedCrosshairs && (
                      <ItemsSelector
                        playerClass={playerClass}
                        selection={selectedCrosshairs?.[item.classname]}
                        options={crosshairs}
                        defaultValue={defaultCrosshairs[item.classname]}
                        classname={item.classname}
                        delItem={state.delCrosshair}
                        setItem={state.setCrosshair}
                        isDefaultWeapon={isDefault}
                        type="crosshair"
                        previewPath="/img/app/crosshairs/preview/"
                        previews={crosshairPreviews}
                        previewClass="crosshair-preview d-flex"
                        previewStyle={{
                          background: `url(${crosshairPreviewImg.src})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
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
                                delItem={state.delZoomCrosshair}
                                setItem={state.setZoomCrosshair}
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
                          value={currentCrosshairScale}
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
                              state.delCrosshairScale(targetClass);
                            } else {
                              state.setCrosshairScale(
                                targetClass,
                                e.target.value,
                              );
                            }
                          }}
                        />
                        <h6>Crosshair Color</h6>
                        <ColorPickerWrapper
                          className="w-100"
                          color={defaultCrosshairColor}
                          onChange={onColorChange}
                        />
                        <Row className="w-100 my-1 g-0">
                          <Col xs={"auto"} className="mx-2">
                            <small className="text-muted h-100 align-bottom">
                              Preview
                            </small>
                          </Col>
                          <Col
                            style={{
                              backgroundColor: "#fff",
                              backgroundImage: `url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill-opacity=".05"><path d="M8 0h8v8H8zM0 8h8v8H0z"/></svg>')`,
                            }}
                          >
                            <div
                              style={{
                                backgroundColor: `rgba(${currentCrosshairColor.r} ${currentCrosshairColor.g} ${currentCrosshairColor.b} / ${currentCrosshairColor.a})`,
                              }}
                              className="w-100 h-100"
                            ></div>
                          </Col>
                          <Col xs="auto">
                            <Button
                              className="w-100"
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                state.delCrosshairColor(
                                  playerClass === "All-Class"
                                    ? "default"
                                    : playerClass,
                                );
                                setLiveCrosshairColor({
                                  r: 200,
                                  g: 200,
                                  b: 200,
                                  a: 0.78,
                                });
                              }}
                            >
                              <span className="fa fa-undo fa-fw"></span>{" "}
                            </Button>
                          </Col>
                        </Row>
                        <Row className="w-100 g-0">
                          <Col>
                            <Form.Control
                              placeholder="Red"
                              value={currentCrosshairColor.r}
                              type="number"
                              min={0}
                              max={255}
                              step={1}
                              onChange={(e) => {
                                const newVal = parseInt(e.target.value);
                                setLiveCrosshairColor((old) => ({
                                  ...currentCrosshairColor,
                                  ...old,
                                  r: newVal,
                                }));
                              }}
                              onBlur={(e) => {
                                const newVal = parseInt(e.target.value);
                                const color = {
                                  ...currentCrosshairColor,
                                  r: newVal,
                                };
                                state.setCrosshairColor(
                                  playerClass === "All-Class"
                                    ? "default"
                                    : playerClass,
                                  color,
                                );
                              }}
                            />
                            <Form.Text>Red</Form.Text>
                          </Col>
                          <Col>
                            <Form.Control
                              placeholder="Green"
                              value={currentCrosshairColor.g}
                              type="number"
                              min={0}
                              max={255}
                              step={1}
                              onChange={(e) => {
                                const newVal = parseInt(e.target.value);
                                setLiveCrosshairColor((old) => ({
                                  ...currentCrosshairColor,
                                  ...old,
                                  g: newVal,
                                }));
                              }}
                              onBlur={(e) => {
                                const newVal = parseInt(e.target.value);
                                const color = {
                                  ...currentCrosshairColor,
                                  g: newVal,
                                };
                                state.setCrosshairColor(
                                  playerClass === "All-Class"
                                    ? "default"
                                    : playerClass,
                                  color,
                                );
                              }}
                            />
                            <Form.Text>Green</Form.Text>
                          </Col>
                          <Col>
                            <Form.Control
                              placeholder="Blue"
                              value={currentCrosshairColor.b}
                              type="number"
                              min={0}
                              max={255}
                              step={1}
                              onChange={(e) => {
                                const newVal = parseInt(e.target.value);
                                setLiveCrosshairColor((old) => ({
                                  ...currentCrosshairColor,
                                  ...old,
                                  b: newVal,
                                }));
                              }}
                              onBlur={(e) => {
                                const newVal = parseInt(e.target.value);
                                const color = {
                                  ...currentCrosshairColor,
                                  b: newVal,
                                };
                                state.setCrosshairColor(
                                  playerClass === "All-Class"
                                    ? "default"
                                    : playerClass,
                                  color,
                                );
                              }}
                            />
                            <Form.Text>Blue</Form.Text>
                          </Col>
                          <Col>
                            <Form.Control
                              placeholder="Alpha"
                              value={currentCrosshairColor.a}
                              type="number"
                              min={0}
                              max={1}
                              step={0.01}
                              onChange={(e) => {
                                const newVal = parseInt(e.target.value);
                                setLiveCrosshairColor((old) => ({
                                  ...currentCrosshairColor,
                                  ...old,
                                  a: newVal,
                                }));
                              }}
                              onBlur={(e) => {
                                const newVal = parseFloat(e.target.value);
                                const color = {
                                  ...currentCrosshairColor,
                                  a: newVal,
                                };
                                state.setCrosshairColor(
                                  playerClass === "All-Class"
                                    ? "default"
                                    : playerClass,
                                  color,
                                );
                              }}
                            />
                            <Form.Text>Alpha</Form.Text>
                          </Col>
                        </Row>
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
                            const check = e.target.checked;
                            if (!check) {
                              state.setMuzzleFlash(item.classname);
                            } else {
                              state.delMuzzleFlash(item.classname);
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
                          const check = e.target.checked;
                          if (!check) {
                            state.setBrassModel(item.classname);
                          } else {
                            state.delBrassModel(item.classname);
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
                            const check = e.target.checked;
                            if (!check) {
                              state.setTracer(item.classname);
                            } else {
                              state.delTracer(item.classname);
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
                              delItem={state.delExplosionEffect}
                              setItem={state.setExplosionEffect}
                              isDefaultWeapon={isDefault}
                              type="explosion"
                              previewPath=""
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
                              delItem={state.delPlayerExplosionEffect}
                              setItem={state.setPlayerExplosionEffect}
                              isDefaultWeapon={isDefault}
                              type="explosion"
                              previewPath=""
                              previews={playerExplosionPreviews}
                              previewImgClass="explosion-preview-img"
                            />
                          )}
                        </>
                      )}
                    {isDefault && (
                      <Button
                        onClick={() => {
                          state.clearAllItems();
                          setItemStore(useItemStore.getState());
                          setResetKey((state) => state + 1);
                        }}
                        variant="danger"
                        className="mt-5"
                      >
                        <span className="fas fa-trash-can fa-fw"></span> Reset
                        all weapons
                      </Button>
                    )}
                  </div>
                </Tab.Pane>
              )),
            )}
          </Tab.Content>
        </Col>
      </Row>
    </Tab.Container>
  );
}
