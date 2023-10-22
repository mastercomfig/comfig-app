import { useState } from "react";
import { FormSelect } from "react-bootstrap";
import { components } from "react-select";
import Select from "react-select";

function onMenuOpen() {
  setTimeout(() => {
    const selectedEl = document.getElementsByClassName(
      "MyDropdown__option--is-selected"
    )[0];
    if (selectedEl) {
      selectedEl.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "start",
      });
    }
  }, 15);
}

// React select https://github.com/JedWatson/react-select/issues/2345#issuecomment-843674624
function getSelectStyles(multi, size = "") {
  const suffix = size ? `-${size}` : "";
  const multiplicator = multi ? 2 : 1;
  return {
    control: (provided, { isDisabled, isFocused }) => ({
      ...provided,
      backgroundColor: "#212529",
      borderColor: `var(--bs-select${
        isDisabled ? "-disabled" : isFocused ? "-focus" : ""
      }-border-color)`,
      borderWidth: "var(--bs-select-border-width)",
      lineHeight: "var(--bs-select-line-height)",
      fontSize: `var(--bs-select-font-size${suffix})`,
      fontWeight: "var(--bs-select-font-weight)",
      minHeight: `calc((var(--bs-select-line-height)*var(--bs-select-font-size${suffix})) + (var(--bs-select-padding-y${suffix})*2) + (var(--bs-select-border-width)*2))`,
      ":hover": {
        borderColor: "var(--bs-select-focus-border-color)",
      },
    }),
    singleValue: (
      { marginLeft, marginRight, ...provided },
      { isDisabled }
    ) => ({
      ...provided,
      color: `var(--bs-select${isDisabled ? "-disabled" : ""}-color)`,
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
    input: ({ margin, paddingTop, paddingBottom, ...provided }, state) => ({
      ...provided,
      color: "#fff",
    }),
    option: (provided, state) => ({
      ...provided,
      border: "0",
      zIndex: 3,
    }),
    menu: ({ marginTop, ...provided }, state) => ({
      ...provided,
      backgroundColor: "#212529",
      zIndex: 3,
    }),
    multiValue: (provided, state) => ({
      ...provided,
      margin: `calc(var(--bs-select-padding-y${suffix})/2) calc(var(--bs-select-padding-x${suffix})/2)`,
    }),
    clearIndicator: ({ padding, ...provided }, state) => ({
      ...provided,
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      width: "var(--bs-select-indicator-padding)",
    }),
    multiValueLabel: (
      { padding, paddingLeft, fontSize, ...provided },
      state
    ) => ({
      ...provided,
      padding: `0 var(--bs-select-padding-y${suffix})`,
      whiteSpace: "normal",
    }),
  };
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
    },
  };
}

// TODO: https://stackoverflow.com/questions/29280817/is-there-any-way-to-colorize-a-white-png-image-with-css-only
function getPreviewImage(
  selected,
  previews,
  previewPath,
  previewImgClass,
  previewImgStyle,
  colorize
) {
  let selectedInfo = selected.split(".", 3);
  let selectedName;
  if (selectedInfo.length === 3) {
    selectedName = selectedInfo[1];
  } else {
    selectedName = selectedInfo;
  }
  if (colorize) {
    return (
      previews &&
      previews[selected] !== null && (
        <span
          className="colorMask"
          style={{
            ...previewImgStyle,
            WebkitMaskImage: `url(${previewPath}${
              previews[selected] ?? selectedName + ".png"
            })`,
            maskImage: `url(${previewPath}${
              previews[selected] ?? selectedName + ".png"
            })`,
            backgroundColor: `rgb(${colorize.r} ${colorize.g} ${colorize.b})`,
            opacity: colorize.a,
          }}
        >
          <img
            className={previewImgClass}
            src={`${previewPath}${previews[selected] ?? selectedName + ".png"}`}
          />
        </span>
      )
    );
  }
  return (
    previews &&
    previews[selected] !== null && (
      <img
        className={previewImgClass}
        style={previewImgStyle}
        src={`${previewPath}${previews[selected] ?? selectedName + ".png"}`}
      />
    )
  );
}

export default function ItemsSelector({
  playerClass,
  selection,
  options,
  defaultValue,
  customDefaultDisplay,
  classname,
  delItem,
  setItem,
  isDefaultWeapon,
  type,
  previewPath,
  previews,
  previewClass,
  previewImgClass,
  previewImgStyle,
  useAdvancedSelect,
  groups,
  children,
  colorize,
  hidePreview,
}) {
  let [selected, setSelected] = useState(selection ?? defaultValue);

  let selectOptions = {};

  for (const x of Object.keys(options)) {
    if (!isDefaultWeapon && x === "default") {
      continue;
    }
    let label = options[x];
    if (x === defaultValue) {
      if (customDefaultDisplay) {
        label = customDefaultDisplay;
      } else if (isDefaultWeapon) {
        label = "Per Weapon";
      } else {
        label += " (Default)";
      }
    }
    selectOptions[x] = {
      value: x,
      label,
    };
  }

  let groupedSelectOptions = null;
  if (groups) {
    groupedSelectOptions = {};
    for (const group of Object.keys(groups)) {
      groupedSelectOptions[group] = {
        label: group,
        options: [],
      };
      let groupOptions = groups[group];
      for (const groupOption of groupOptions) {
        if (!isDefaultWeapon && groupOption === "default") {
          continue;
        }
        const pack = crosshairPacks[groupOption];
        if (!pack) {
          continue;
        }
        for (const x of Object.keys(pack)) {
          groupedSelectOptions[group].options.push(
            selectOptions[`${group}.${groupOption}.${x}`]
          );
        }
      }
    }
  }

  return (
    <div className="row">
      <div className={hidePreview ? "col-12" : "col-4"}>
        {(useAdvancedSelect && (
          <Select
            components={{ DropdownIndicator, IndicatorSeparator }}
            theme={getSelectTheme}
            styles={getSelectStyles(false)}
            onMenuOpen={onMenuOpen}
            className={"MyDropdown"}
            classNamePrefix={"MyDropdown"}
            formatOptionLabel={({ value, label }) => (
              <div style={{ display: "flex", alignItems: "center" }}>
                {getPreviewImage(value, previews, previewPath, previewImgClass)}
                <div style={{ marginLeft: "0.5rem" }}>{label}</div>
              </div>
            )}
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
            options={Object.values(groupedSelectOptions ?? selectOptions)}
          />
        )) || (
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
              >
                {x === defaultValue && isDefaultWeapon
                  ? "Per Weapon"
                  : `${options[x]}${
                      x === defaultValue && !isDefaultWeapon ? " (Default)" : ""
                    }`}
              </option>
            ))}
          </FormSelect>
        )}
        {children}
      </div>
      {(selected !== defaultValue || !isDefaultWeapon) && !hidePreview && (
        <div className="col-8">
          <div className={`col-8 preview-container ${previewClass}`}>
            {getPreviewImage(
              selected,
              previews,
              previewPath,
              previewImgClass,
              previewImgStyle,
              colorize
            )}
          </div>
        </div>
      )}
    </div>
  );
}

ItemsSelector.defaultProps = {
  previewClass: "",
};
