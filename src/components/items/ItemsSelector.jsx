import { useState } from 'react';
import { FormSelect } from "react-bootstrap";
import { components } from "react-select";
import Select from "react-select";

// React select https://github.com/JedWatson/react-select/issues/2345#issuecomment-843674624
function getSelectStyles(multi, size='') {
	const suffix = size ? `-${size}` : '';
	const multiplicator = multi ? 2 : 1;
	return {
		control: (provided, { isDisabled, isFocused }) => ({
			...provided,
			backgroundColor: "#212529",
			borderColor: `var(--bs-select${isDisabled ? '-disabled' : (isFocused ? '-focus' : '')}-border-color)`,
			borderWidth: "var(--bs-select-border-width)",
			lineHeight: "var(--bs-select-line-height)",
			fontSize: `var(--bs-select-font-size${suffix})`,
			fontWeight: "var(--bs-select-font-weight)",
			minHeight: `calc((var(--bs-select-line-height)*var(--bs-select-font-size${suffix})) + (var(--bs-select-padding-y${suffix})*2) + (var(--bs-select-border-width)*2))`,
			':hover': {
				borderColor: "var(--bs-select-focus-border-color)",
			},
		}),
		singleValue: ({marginLeft, marginRight, ...provided}, { isDisabled }) => ({
			...provided,
			color: `var(--bs-select${isDisabled ? '-disabled' : ''}-color)`,
		}),
		valueContainer: (provided, state) => ({
			...provided,
			backgroundColor: "#212529",
			padding: `calc(var(--bs-select-padding-y${suffix})/${multiplicator}) calc(var(--bs-select-padding-x${suffix})/${multiplicator})`,
		}),
		dropdownIndicator: (provided, state) => ({
			height: "100%",
			width: "var(--bs-select-indicator-padding)",
			backgroundImage: "var(--bs-select-indicator)",
			backgroundRepeat: "no-repeat",
			backgroundPosition: `right var(--bs-select-padding-x) center`,
			backgroundSize: "var(--bs-select-bg-size)",			
		}),
		input: ({margin, paddingTop, paddingBottom, ...provided}, state) => ({
			...provided,
      color: "#fff"
		}),
		option: (provided, state) => ({
      ...provided,
      border: "0",
    }),
		menu: ({marginTop, ...provided}, state) => ({
			...provided,
			backgroundColor: "#212529",
		}),
		multiValue: (provided, state) => ({
			...provided,
			margin: `calc(var(--bs-select-padding-y${suffix})/2) calc(var(--bs-select-padding-x${suffix})/2)`,
		}),
		clearIndicator: ({padding, ...provided}, state) => ({
			...provided,
			alignItems: "center",
			justifyContent: "center",
			height: "100%",
			width: "var(--bs-select-indicator-padding)"
		}),
		multiValueLabel: ({padding, paddingLeft, fontSize, ...provided}, state) => ({
			...provided,
			padding: `0 var(--bs-select-padding-y${suffix})`,
			whiteSpace: "normal"
		})
	}
}

function IndicatorSeparator() {
	return null;
}

function DropdownIndicator(props) {
	return (
		<components.DropdownIndicator {...props}>
			<span></span>
		</components.DropdownIndicator>
	);
}

function getSelectTheme(theme) {
	return {
		...theme,
		borderRadius: "var(--bs-select-border-radius)",
		colors: {
			...theme.colors,
			primary: "var(--bs-primary)",
      primary25: "#212121",
			danger: "var(--bs-danger)",
		}
	}
}

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
  previewImgClass,
  useGroups
}) {
  let [selected, setSelected] = useState(selection ?? defaultValue);

  let selectedInfo = selected.split(".", 3);
  let selectedName;
  if (selectedInfo.length === 3) {
    selectedName = selectedInfo[1];
  } else {
    selectedName = selectedInfo;
  }

  let selectOptions = {};

  for (const x of Object.keys(options)) {
    selectOptions[x] = {
      value: x,
      label: x === defaultValue && isDefaultWeapon ? "Per Weapon" : `${options[x]}${
        x === defaultValue && !isDefaultWeapon ? " (Default)" : ""
      }`
    };
  }

  return (
    <div className="row">
      <div className="col-3">
        {(useGroups && (<Select
          components={{ DropdownIndicator, IndicatorSeparator }}
          theme={getSelectTheme}
          styles={getSelectStyles(false)}
          defaultValue={selectOptions[selection ?? defaultValue]}
          autoComplete="off"
          onChange={(option) => {
            let value = option.value;
            setSelected(value);
            if (value === defaultValue) {
              delItem(classname);
            } else {
              setItem(classname, value);
            }
          }}
          options={Object.values(selectOptions)}/>)) || (<FormSelect
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
        </FormSelect>)}
      </div>
      {(selected !== defaultValue || !isDefaultWeapon) && (<div className={`col-9 preview-container ${previewClass}`}>
        {previews && previews[selected] !== null && (<img className={previewImgClass} src={`${previewPath}${previews[selected] ?? (selectedName + ".png")}`}></img>)}
      </div>)}
    </div>
  );
}

ItemsSelector.defaultProps = {
  previewClass: ""
}
