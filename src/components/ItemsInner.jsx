import Tab from 'react-bootstrap/Tab';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Nav from 'react-bootstrap/Nav';

export default function ItemsInner({playerClass, items, slotToIndex, getNormalizedSlotName, getItemName}) {
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

  return (
    <Tab.Container>
      <Row>
        <Col sm={3}>
          <Nav variant="pills" className="flex-column">
            {slotNames.map(slot => <>
              <Nav.Item><small>{slot}</small></Nav.Item>
              {slots[slot].map(item => {
                const itemName = getItemName(item);
                return (
                  <Nav.Item>
                    <Nav.Link eventKey={`${playerClass}-${item.classname}`}>{itemName}</Nav.Link>
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
                      <p>Test</p>
                    </Tab.Pane>
                )}
            </>)}
          </Tab.Content>
        </Col>
      </Row>
    </Tab.Container>
  )
}