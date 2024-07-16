import { useCallback, useState } from "react";
import { RgbaColorPicker } from "react-colorful";

export function ColorPickerWrapper({ className, color, onChange }) {
  const [myColor, setMyColor] = useState(color);
  const fullChangeUpdate = useCallback(
    (color) => {
      setMyColor(color);
      onChange(color);
    },
    [setMyColor, onChange],
  );

  return (
    <RgbaColorPicker
      className={className}
      color={myColor}
      onChange={fullChangeUpdate}
    />
  );
}
