import Tab from 'react-bootstrap/cjs/Tab.js';
import Row from 'react-bootstrap/cjs/Row.js';
import Col from 'react-bootstrap/cjs/Col.js';
import Nav from 'react-bootstrap/cjs/Nav.js';

export default function ItemsInner({ playerClass, items }) {
  let slots = {};

  for (const item of items) {
    const slot = getNormalizedSlotName(item);
    if (!(slot in slots)) {
      slots[slot] = [];
    }
    slots[slot].push(item);
  }

  let slotNames = [];

  for (const slot of slotToIndex) {
    if (slots[slot]) {
      slotNames.push(slot);
    }
  }

  const firstKey = `${playerClass}-${slots[slotNames[0]][0].classname}`;

  return (
    <Tab.Container defaultActiveKey={firstKey}>
      <Row>
        <Col sm={3} className="bg-dark py-2">
          <Nav variant="pills" className="flex-column">
            {slotNames.map(slot => <>
              <Nav.Item key={`${playerClass}-${slot}`} className="pt-2"><small class="fw-semibold">{slot.toUpperCase()}</small></Nav.Item>
              <hr></hr>
              {slots[slot].map(item => {
                const itemName = getItemName(item);
                return (
                  <Nav.Item>
                    <Nav.Link type="button" key={`${playerClass}-${item.classname}`} eventKey={`${playerClass}-${item.classname}`}>{itemName}</Nav.Link>
                  </Nav.Item>
                )
              })}
            </>)}
          </Nav>
        </Col>
        <Col sm={9}>
          <Tab.Content>
            {slotNames.map(slot => <>
                {slots[slot].map(item =>
                    <Tab.Pane eventKey={`${playerClass}-${item.classname}`}>
                      <div class="container py-4">
                        <h3>Crosshairs</h3>
                        <h3>Sound</h3>
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
                )}
            </>)}
          </Tab.Content>
        </Col>
      </Row>
    </Tab.Container>
  )
}