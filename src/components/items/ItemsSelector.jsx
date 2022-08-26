import { useState } from 'react';
import { FormSelect } from "react-bootstrap";

export default function ItemsSelector({
  playerClass,
  selection,
  options,
  defaultValue,
  classname,
  delItem,
  setItem,
  isDefaultWeapon,
  type,
  previewPath,
  previews,
  previewClass,
  previewImgClass
}) {
  let [selected, setSelected] = useState(selection ?? defaultValue);

  return (
    <div className="row">
      <div className="col-3">
        <FormSelect
          className="bg-dark text-light"
          defaultValue={selection ?? defaultValue}
          autoComplete="off"
          onChange={(e) => {
            let select = e.target;
            let option = select.options[select.selectedIndex];
            let value = option.value;
            setSelected(value);
            if (value === defaultValue) {
              delItem(classname);
            } else {
              setItem(classname, value);
            }
          }}
        >
          {Object.keys(options).map((x) => (
            <option
              key={`${playerClass}-${classname}-${type}-${x}`}
              value={x}
            >{x === defaultValue && isDefaultWeapon ? "Per Weapon" : `${options[x]}${
              x === defaultValue && !isDefaultWeapon ? " (Default)" : ""
            }`}</option>
          ))}
        </FormSelect>
      </div>
      {(selected !== defaultValue || !isDefaultWeapon) && (<div className={`col-9 preview-container ${previewClass}`}>
        {previews && previews[selected] && (<img className={previewImgClass} src={`${previewPath}${previews[selected]}`}></img>)}
      </div>)}
    </div>
  );
}

ItemsSelector.defaultProps = {
  previewClass: ""
}
