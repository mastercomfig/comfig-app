import { useMemo } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

export default function PingDisplay({ ping, calcPingColor }) {
  const pingColor = useMemo(() => {
    return calcPingColor(ping);
  }, [ping, calcPingColor]);

  const roundPing = useMemo(() => {
    return Math.round(ping);
  }, [ping]);

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip>Estimated ping: {roundPing}ms</Tooltip>}
    >
      <span className={`fas fa-signal text-${pingColor}`}></span>
    </OverlayTrigger>
  );
}
