import { Tab, Row, Col, Nav} from 'react-bootstrap';

export default function ItemsInner({ playerClass, items }) {
  let slots = {};
  let slotNames = [];

  for (const item of items) {
    const slot = getNormalizedSlotName(item);
    if (!(slot in slots)) {
      slots[slot] = [];
    }
    slots[slot].push(item);
    if (!slot) {
      slotNames.push(slot);
    }
  }

  for (const slot of slotToIndex) {
    if (slots[slot]) {
      slotNames.push(slot);
    }
  }

  const firstKey = `${playerClass}-${slots[slotNames[0]][0].classname}`;

  //console.log(slots[slotNames[0]][0]);

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
                      {item.SoundData && (
                        <h3>Sound</h3>
                      )}
                      {item.MuzzleFlashParticleEffect && (
                        <h3>Muzzle Flash</h3>
                      )}
                      {item.BrassModel && (
                        <h3>Shell Ejection</h3>
                      )}
                      {item.TracerEffect && (
                        <h3>Tracer</h3>
                      )}
                      {item.ExplosionEffect && (
                        <h3>Explosion Effect</h3>
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