import { OverlayTrigger, Tooltip } from "react-bootstrap";

export default function HelpTooltip({ id, title }) {
  return (
    <OverlayTrigger
      placement="auto"
      overlay={<Tooltip id={id}>{title}</Tooltip>}
    >
      <span className="far fa-circle-question"></span>
    </OverlayTrigger>
  );
}
