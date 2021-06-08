"use strict";

function app() {
  // convenience format method for string
  String.prototype.format = function () {
    const args = arguments;
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] !== "undefined" ? args[number] : match;
    });
  };

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.substr(1);
  }

  function getEl(element) {
    return document.getElementById(element);
  }

  function loadModules() {
    let storedModulesStr = storage.getItem("modules");
    if (storedModulesStr) {
      storedModules = JSON.parse(storedModulesStr);
    }
  }

  function saveModules() {
    storage.setItem("modules", JSON.stringify(selectedModules));
  }
  
  function resetModules() {
    storage.removeItem("modules");
    selectedModules = {};
    storedModules = {};
  }

  // convenience proper case for modules
  function properCaseModuleName(name) {
    let split = name.split("_");
    split.forEach((str, index, array) => {
      array[index] = capitalize(str);
    });
    return split.join(" ");
  }

  // convenience proper case name or display for modules
  function properCaseOrDisplayModuleName(module, name) {
    let displayName = module.hasOwnProperty("display")
      ? module.display
      : properCaseModuleName(name ? name : module.name);
    return displayName;
  }

  // Map preset IDs to display names for download
  var presets = {
    ultra: "Ultra",
    high: "High",
    "medium-high": "Medium High",
    medium: "Medium",
    "medium-low": "Medium Low",
    low: "Low",
    "very-low": "Very Low",
  }

  // The only addons we can override when preset switches
  const recommendableAddons = [
    "no-footsteps",
    "disable-pyroland",
    "no-soundscapes",
    "no-tutorial",
  ];

  // Set what addons we recommend for each preset
  var recommendedAddons = new Map();

  function setRecommendedAddons(id, values) {
    // don't set non-recommendable addons
    let addons = values.filter(
      (addon) => recommendableAddons.indexOf(addon) !== -1
    );
    if (addons.length != values.length) {
      console.error("Attempted to set non-recommendable addon!");
    }
    recommendedAddons.set(id, addons);
  }

  setRecommendedAddons("ultra", []);
  setRecommendedAddons("high", []);
  setRecommendedAddons("medium-high", []);
  setRecommendedAddons("medium", []);
  setRecommendedAddons("medium-low", []);
  setRecommendedAddons("low", ["disable-pyroland", "no-soundscapes"]);
  setRecommendedAddons("very-low", [
    "no-footsteps",
    "disable-pyroland",
    "no-soundscapes",
    "no-tutorial",
  ]);
  // End preset -> recommended addon mapping

  // Base release URL
  var releasesUrl = "https://github.com/mastercomfig/mastercomfig/releases";
  // Release homepage
  var releaseUrl = {
    "latest": releasesUrl + "/latest",
    "default": releasesUrl + "/{0}",
  };
  var assetsUrl = {
    "latest": releasesUrl + "/latest",
    "default": releaseUrl.default,
  }
  // Where latest downloads come from
  var downloadUrl = releaseUrl.default + "/download/mastercomfig-";
  // Where a specific release's downloads come from
  var releaseDownloadUrl = releasesUrl + "/download/{0}/mastercomfig-";
  // Addon extension format string to download
  var addonUrl = {
    "latest": downloadUrl + "{1}-addon.vpk",
    "default": releaseDownloadUrl + "{1}-addon.vpk",
  };
  // Preset extension format string to download
  var presetUrl = {
    "latest": downloadUrl + "{1}-preset.vpk",
    "default": releaseDownloadUrl + "{1}-preset.vpk",
  };  

  // Current mastercomfig version, comes in from API
  var version = null;
  var latestVersion = null;

  var userVersion = "latest";

  // Current modules def
  var modulesDef = {};
  // Current presets modules def
  var presetModulesDef = {};

  // Defined addons (found through parsing HTML)
  var addons = [];

  // Currently selected preset
  var selectedPreset = "medium-high";
  // Currently selected addons
  var selectedAddons = [];
  // Current state of module selections
  var selectedModules = {};
  // Current state of binds
  var selectedBinds = {};
  // Current state of overrides
  var selectedOverrides = {};

  const storage = localStorage;

  // Data cache
  let cachedData = null;

  var storedModules = {};
  loadModules();

  // Track if multi-download is active
  var downloading = false;

  // Once user clicks to multi-download, we download and swap our behavior to in-progress
  function downloadClickEvent(id, fnGatherUrls) {
    // Do the download once clicked
    let urls = fnGatherUrls();
    // Only download if we have a download
    if (urls.length > 1) {
      downloadUrls(urls, id, fnGatherUrls);
      let element = getEl(id);
      element.onclick = null; // Ignore clicks
      downloading = true; // Still retain in-progress even after switching preset
      // Indicate not useable/in-progress
      element.style.cursor = "not-allowed";
      element.classList.add("focus");
      element.innerHTML = element.innerHTML
        .replace("Download", "Downloading")
        .replace(" ", "…");
    }
  }

  // This is what we do when multi-download is ready (init or after finish)
  function bindDownloadClick(id, fnGatherUrls) {
    // Reregister that we can respond to a click
    let element = getEl(id);
    element.onclick = () => downloadClickEvent(id, fnGatherUrls);
    downloading = false; // Unlock updating preset test with new download
    // Restore downloadable style
    element.style.cursor = "pointer";
    element.classList.remove("focus");
    element.innerHTML = element.innerHTML
      .replace("Downloading", "Download")
      .replace("…", " ");
  }

  // Helper functions to format download URLs
  function getDownloadUrl(id, preset) {
    let urlOptions = preset ? presetUrl : addonUrl;
    let url;
    if (urlOptions.hasOwnProperty(userVersion)) {
      url = urlOptions[userVersion];
    } else {
      url = urlOptions.default;
    }
    return url.format(userVersion, id);
  }

  function getAddonUrl(id) {
    return getDownloadUrl(id, false);
  }

  function getPresetUrl() {
    return getDownloadUrl(selectedPreset, true);
  }
  // End download URL helpers

  let pendingObjectURLs = [];

  function downloadUrls(urls, id, fnGatherUrls) {
    // Take the top URL promise and resolve it.
    urls[0].then((result) => {
      // If not empty, make the browser download it.
      if (result.url !== "") {
        if (result.isObject) {
          let link = document.createElement("a");
          link.href = result.url;
          link.download = result.name;
          document.body.appendChild(link);
          link.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );
          link.remove();
          pendingObjectURLs.push(result.url);
        } else {
          window.location = result.url;
        }
      }
      if (urls.length > 1) {
        setTimeout(() => {
          // Queue up the rest of the download promise stack
          return downloadUrls(urls.slice(1), id, fnGatherUrls);
        }, 2000);
      } else {
        // We've gotten to the last in the download stack, so we're done
        bindDownloadClick(id, fnGatherUrls);
        // Once it's long past our time to download, remove the object URLs
        setTimeout(() => {
          for (const objectURL of pendingObjectURLs) {
            URL.revokeObjectURL(objectURL);
          }
          pendingObjectURLs = [];
        }, 120000);
      }
    });
  }

  function getVPKDownloadUrls() {
    // We downloaded this version, so track it!
    storage.setItem("lastVersion", version);
    // First push an empty download because browsers like that for some reason.
    var downloads = [
      Promise.resolve({
        url: "",
      }),
    ];
    // Then push our preset download
    downloads.push(
      Promise.resolve({
        url: getPresetUrl(),
      })
    );
    // Then push all our addon downloads
    for (const selection of selectedAddons) {
      downloads.push(
        Promise.resolve({
          url: getAddonUrl(selection),
        })
      );
    }
    // Now queue up all our download promises to download!
    return downloads;
  }

  function newFile(contents, name) {
    if (contents.length < 1) {
      return null;
    }
    let file = new File([contents], name, {
      type: "application/octet-stream",
    });
    return file;
  }

  function newModulesFile() {
    let contents = "";
    for (const moduleName of Object.keys(selectedModules)) {
      contents += `${moduleName}=${selectedModules[moduleName]}\n`;
    }
    if (contents.length > 0) {
      return newFile(contents, "modules.cfg");
    }
    return null;
  }

  function newAutoexecFile() {
    let contents = "";
    for (const key of Object.keys(selectedBinds)) {
      let binding = selectedBinds[key];
      let bindingStr;
      // Should we quote arg, or raw arg?
      if (typeof binding === "string" && bindingStr.indexOf(" ") !== -1) {
        bindingStr = `"${binding}"`;
      } else {
        bindingStr = ` ${binding}`;
      }
      contents += `bind ${key}${bindingStr}\n`;
    }
    for (const cvar of Object.keys(selectedOverrides)) {
      contents += `${cvar} ${selectedOverrides[cvar]}\n`;
    }
    if (contents.length > 0) {
      return newFile(contents, "autoexec.cfg");
    }
    return null;
  }

  function getObjectFilePromise(file) {
    return Promise.resolve({
          url: URL.createObjectURL(file),
          name: file.name,
          isObject: true,
        });
  }

  function getCustomDownloadUrls() {
    // We downloaded the custom settings, so the user wants it!
    saveModules();
    // First push an empty download because browsers like that for some reason.
    var downloads = [
      Promise.resolve({
        url: "",
      }),
    ];
    // Create the modules.cfg file
    let modulesFile = newModulesFile();
    if (modulesFile) {
      downloads.push(
        getObjectFilePromise(modulesFile)
      );
    }
    let autoexecFile = newAutoexecFile();
    if (autoexecFile) {
      downloads.push(
        getObjectFilePromise(autoexecFile)
      );
    }
    return downloads;
  }

  function updateCustomizationDownload() {
    let element = getEl("custom-dl");
    let bHasSelection = Object.keys(selectedModules).length > 0;
    if (bHasSelection) {
      element.classList.remove("disabled", "text-light");
      element.style.cursor = "pointer";
      element.innerHTML = element.innerHTML.replace("No customizations to download", "Download customizations");
    } else {
      element.classList.add("disabled", "text-light");
      element.style.cursor = "not-allowed";
      element.innerHTML = element.innerHTML.replace("Download customizations", "No customizations to download");
    }
  }

  // update addon state based on checked
  function updateAddon(id) {
    setAddon(id, !getEl(id).classList.contains("active"));
  }

  // set addon enabled/disabled
  function setAddon(id, checked) {
    // Update our storage with the value
    storage.setItem(id, checked);
    // Use the storage state
    checked = storage.getItem(id) === "true";
    if (checked) {
      // If checked, add it in if its not there already
      if (selectedAddons.indexOf(id) === -1) {
        selectedAddons.push(id);
      }
    } else {
      // Filter out the addon if it's there
      selectedAddons = selectedAddons.filter((selection) => selection !== id);
    }
    // Make sure the UI reflects the selected state
    getEl(id + "-dl").style.display = checked
      ? "initial"
      : "none";
    getEl(id).classList.toggle("active", checked);
  }

  function setUserVersion(userVer) {
    if (userVer === "Dev build") {
      userVer = "dev";
    }
    userVersion = userVer;
    if (userVer === "latest") {
      userVer = latestVersion;
    }
    version = userVer;
    getEl("preset-dl").href = getPresetUrl();
    for (const id of addons) {
      getEl(id + "-dl").href = getAddonUrl(id);
    }
    getEl("version").innerText = userVer;
    let url;
    if (releaseUrl.hasOwnProperty(userVersion)) {
      url = releaseUrl[userVersion];
    } else {
      url = releaseUrl.default.format(userVersion);
    }
    getEl("changelog-link").href = url;
    let assetUrl;
    if (assetsUrl.hasOwnProperty(userVersion)) {
      assetUrl = assetsUrl[userVersion];
    } else {
      assetUrl = assetsUrl.default.format(userVersion);
    }
    getEl("assets-link").href = assetUrl;
  }

  function setPreset(id, no_set) {
    selectedPreset = id; // save download ID
    if (!no_set) {
      storage.setItem("preset", id); // save preset selection

      // If we change preset after modules UI is initialized
      // we have to redraw the modules UI with the new preset's
      // defaults. however, we need to also make sure that the user's
      // current selections are preserved, so save them off here too,
      // and store them as we normally would during a page load
      if (modulesDef) {
        saveModules();
        loadModules();
        handleModulesRoot(modulesDef);
      }
    }
    new bootstrap.Tab(getEl(id)).show(); // visually select in tabs menu
    getEl("vpk-dl").removeAttribute("href"); // we don't need the static download anymore
    if (!downloading) {
      getEl(
        "vpk-dl"
      ).innerHTML = `<span class="fa fa-cloud-download fa-fw"></span> Download ${presets[id]} preset and selected addons` // update download text
    }
    getEl("preset-dl").setAttribute("href", getPresetUrl());
    getEl(
      "preset-dl"
    ).innerHTML = `<span class="fa fa-download fa-fw"></span> Download ${presets[id]} preset` // update preset text
    // if not loading from storage, set recommended addons
    if (!no_set) {
      // reset all recommendable addons
      recommendableAddons.forEach(function (addon) {
        setAddon(addon, false);
      });
      // set recommended addons
      recommendedAddons.get(id).forEach(function (addon) {
        setAddon(addon, true);
      });
    }
  }

  let keyBindMap = {
    PAUSE: "NUMLOCK",
    INSERT: "INS",
    DELETE: "DEL",
    PAGEUP: "PGUP",
    PAGEDOWN: "PGDN",
    " ": "SPACE",
    ";": 'SEMICOLON'
  };

  let keypadBindMap = {
    "/": "SLASH",
    "*": "MULTIPLY",
    "-": "MINUS",
    "+": "PLUS",
    "5": "5",
    "CLEAR": "5",
    "ENTER": "ENTER",
    ".": "DEL",
    "0": "INS",
    "7": "HOME",
    "8": "ARROWUP",
    "9": "PAGEUP",
    "4": "ARROWLEFT",
    "6": "ARROWRIGHT",
    "1": "END",
    "2": "ARROWDOWN",
    "3": "PAGEDOWN"
  };

  let simpleKeypadMap = {
    "DIVIDE": "/",
    "MULTIPLY": "*",
    "SUBTRACT": "-",
    "ADD": "+",
    "5": "CLEAR",
    "DECIMAL": "."
  };

  function bindingToBind(binding) {
    if (keyBindMap.hasOwnProperty(binding)) {
      return keyBindMap[binding];
    }
    if (binding.startsWith("ARROW")) {
      return binding.substring(5) + "ARROW";
    }
    return binding;
  }

  function keyEventToKeyBind(e) {
    let binding = e.key.toUpperCase();
    // Shift, alt, ctrl on the right side
    if (e.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
      return "R" + binding;
    }
    if (e.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
      if (keypadBindMap.hasOwnProperty(binding)) {
        binding = keypadBindMap[binding];
      }
      return "KP_" + bindingToBind(binding);
    }
    return bindingToBind(binding);
  }

  function simpleKeyboardKeyToKeyBind(key) {
    let binding = key.toUpperCase();
    if (binding.startsWith("{")) {
      binding = binding.substr(1, binding.length - 2);
    }
    let numpadKeyword = "NUMPAD";
    if (binding.startsWith(numpadKeyword)) {
      binding = binding.substr(numpadKeyword.length, binding.length - 1);
      if (simpleKeypadMap.hasOwnProperty(binding)) {
        binding = simpleKeypadMap[binding];
      }
      if (keypadBindMap.hasOwnProperty(binding)) {
        binding = keypadBindMap[binding];
      }
      return "KP_" + bindingToBind(binding);
    }
    return bindingToBind(binding);
  }

  function getBuiltinModuleDefault(name) {
    let modulePresets = presetModulesDef[name];
    if (modulePresets) {
      let presetValue = modulePresets[selectedPreset];
      if (presetValue) {
        return presetValue;
      }
      return modulePresets.default;
    }
    return null;
  }

  function getModuleDefault(name) {
    // User storage can only contain non-builtin-defaults
    let userValue = storedModules[name];
    if (userValue) {
      selectedModules[name] = userValue;
      return userValue;
    }
    return getBuiltinModuleDefault(name);
  }

  function setModule(name, value) {
    let defaultValue = getBuiltinModuleDefault(name);
    if (defaultValue === value) {
      if (selectedModules.hasOwnProperty(name)) {
        delete selectedModules[name];
      }
    } else {
      selectedModules[name] = value;
    }
    updateCustomizationDownload();
  }

  function getDefaultValueFromName(values, name) {
    let defaultValue = 0;
    for (let i = 0; i < values.length; i++) {
      let value = values[i];
      if (value === name || value.value === name) {
        defaultValue = i;
      }
    }
    return defaultValue;
  }

  // Convenience method for creating form input elements
  function createInputElement(type, clazz) {
    let inputElement = document.createElement("input");
    inputElement.classList.add(clazz);
    inputElement.setAttribute("type", type);
    return inputElement;
  }

  // Convenience method for creating input containers
  function createInputContainer() {
    let row = document.createElement("div");
    row.classList.add("row");
    let col = document.createElement("div");
    col.classList.add("col-sm-5");
    row.appendChild(col);
    return [row, col];
  }

  // Create a dropdown select input
  function handleModuleInputSelect(name, values) {
    let [inputOuter, inputContainer] = createInputContainer();
    // Create the element
    let selectElement = document.createElement("select");
    selectElement.classList.add(
      "form-select",
      "form-select-sm",
      "bg-dark",
      "text-light"
    );
    let defaultValue = getModuleDefault(name);
    // Add the values
    values.forEach((value) => {
      // Create the option element
      let optionElement = document.createElement("option");
      optionElement.setAttribute("value", value.value);
      if (value.value === defaultValue) {
        optionElement.setAttribute("selected", "true");
      }
      // Name the value
      let displayName = properCaseOrDisplayModuleName(value, value.value);
      optionElement.innerText = displayName;
      selectElement.appendChild(optionElement);
    });
    // Event listener
    selectElement.addEventListener("input", (e) => {
      let select = e.target;
      let value = select.options[select.selectedIndex].value;
      setModule(name, value);
    });
    inputContainer.appendChild(selectElement);
    return inputOuter;
  }

  // Create a switch/toggle input
  function handleModuleInputSwitch(name, values) {
    let [inputOuter, inputContainer] = createInputContainer();
    // Create the switch element
    let switchContainer = document.createElement("div");
    switchContainer.classList.add("form-check", "form-switch");
    let switchElement = createInputElement("checkbox", "form-check-input");
    switchElement.setAttribute("value", "");
    switchContainer.appendChild(switchElement);
    // Set default value
    let defaultValue = getDefaultValueFromName(values, getModuleDefault(name));
    if (defaultValue) {
      switchElement.setAttribute("checked", "true");
    }
    // Event listener
    switchContainer.addEventListener("input", (e) => {
      let selected = values[e.target.checked ? 1 : 0];
      setModule(name, selected.value);
    });
    inputContainer.appendChild(switchContainer);
    return inputOuter;
  }

  // TODO: we can just use select for now, but for usability, this should be implemented in the future
  function handleModuleInputGroup(name, values) {}

  // Creates a range slider
  function handleModuleInputSlider(name, values) {
    let [inputOuter, inputContainer] = createInputContainer();
    // Create the range element
    let rangeElement = createInputElement("range", "form-range");
    let defaultValue = getDefaultValueFromName(values, getModuleDefault(name));
    rangeElement.setAttribute("value", defaultValue);
    rangeElement.setAttribute("min", 0);
    rangeElement.setAttribute("max", values.length - 1);
    // Create the value indicator (shows what value in the range is selected)
    let valueIndicator = document.createElement("span");
    // Set default value
    let defaultSelection = values[defaultValue];
    if (typeof defaultSelection === "object") {
      valueIndicator.innerText = properCaseOrDisplayModuleName(defaultSelection, defaultSelection.value);;
    } else {
      valueIndicator.innerText = capitalize(defaultSelection);
    }
    // Event listener
    rangeElement.addEventListener("input", (e) => {
      let selected = values[e.target.valueAsNumber];
      if (typeof defaultSelection === "object") {
        setModule(name, selected.value);
        valueIndicator.innerText = properCaseOrDisplayModuleName(selected, selected.value);;
      } else {
        setModule(name, selected);
        valueIndicator.innerText = capitalize(selected);
      }
    });
    inputContainer.appendChild(rangeElement);
    inputContainer.appendChild(valueIndicator);
    return inputOuter;
  }

  // Returns the function to use to create the element
  function moduleInputFactory(type) {
    switch (type) {
      case "select":
        return handleModuleInputSelect;
      case "switch":
        return handleModuleInputSwitch;
      case "group":
        return handleModuleInputGroup;
      case "slider":
        return handleModuleInputSlider;
      default:
        return null;
    }
  }

  // Uses the factory to create the element
  function handleModuleInput(type, name, values) {
    if (values) {
      let fnModuleInput = moduleInputFactory(type);
      if (fnModuleInput) {
        return fnModuleInput(name, values);
      }
    }
    return null;
  }

  // Handle each module
  function handleModule(module) {
    // Create element
    let moduleContainer = document.createElement("div");
    moduleContainer.classList.add("row");
    moduleContainer.id = module.name + "-module-input-cont";
    // Create module title
    let moduleTitle = document.createElement("h6");
    moduleTitle.classList.add("module-title");
    let displayName = properCaseOrDisplayModuleName(module);
    moduleTitle.innerText = displayName;
    moduleContainer.appendChild(moduleTitle);
    // Create a link to module documentation
    let moduleDocsLink = document.createElement("a");
    moduleDocsLink.setAttribute(
      "href",
      "https://docs.mastercomfig.com/page/customization/modules/#" +
        displayName.split(" ").join("-").toLowerCase()
    );
    moduleDocsLink.setAttribute("target", "_blank");
    let modulesDocsIcon = document.createElement("span");
    modulesDocsIcon.classList.add("fa", "fa-book", "fa-fw");
    modulesDocsIcon.setAttribute("aria-hidden", "true");
    moduleDocsLink.appendChild(modulesDocsIcon);
    moduleDocsLink.innerHTML = " " + moduleDocsLink.innerHTML;
    moduleTitle.appendChild(moduleDocsLink);
    // Create the module's input control
    let moduleInputType = module.hasOwnProperty("type")
      ? module.type
      : "select";
    let moduleInput = handleModuleInput(
      moduleInputType,
      module.name,
      module.values
    );
    // If we could create an input control, show it to our parent
    if (moduleInput) {
      moduleContainer.appendChild(moduleInput);
      return moduleContainer;
    } else {
      return null;
    }
  }

  // Function to accurately calculate scroll position because scrollTop is busted...
  function getRelativePos(elm){
    var pPos = elm.parentNode.getBoundingClientRect(), // parent pos
        cPos = elm.getBoundingClientRect(), // target pos
        pos = {};

    pos.top    = cPos.top    - pPos.top + elm.parentNode.scrollTop,
    pos.right  = cPos.right  - pPos.right,
    pos.bottom = cPos.bottom - pPos.bottom,
    pos.left   = cPos.left   - pPos.left;

    return pos;
  }

  var bSetModuleNavActive = true;

  // Handles each module category
  function handleCategory(name, category) {
    // Create category element
    let categoryContainer = document.createElement("div");
    let id = "module-cont-" + name;
    categoryContainer.id = id;
    // Create category title
    let categoryTitle = document.createElement("h4");
    categoryTitle.classList.add("module-category-title");
    let displayName = properCaseOrDisplayModuleName(category, name);
    categoryTitle.innerText = displayName;
    categoryContainer.appendChild(categoryTitle);
    // Traverse modules to add
    let bHasModule = false;
    category.modules.forEach((module) => {
      let moduleElement = handleModule(module);
      if (moduleElement) {
        bHasModule = true;
        categoryContainer.appendChild(moduleElement);
      }
    });
    let categoryNavItem = document.createElement("li");
    categoryNavItem.classList.add("nav-item");
    let categoryNavLink = document.createElement("a");
    categoryNavLink.classList.add("nav-link");
    if (bSetModuleNavActive) {
      categoryNavLink.classList.add("active");
      bSetModuleNavActive = false;
    }
    categoryNavLink.innerText = displayName;
    categoryNavLink.href = `#${id}`;
    categoryNavLink.addEventListener("click", (e) => {
      let top = getRelativePos(categoryContainer).top;
      getEl("modules-controls").scrollTop = top;
      e.preventDefault();
    }, {
      passive: false
    })
    categoryNavItem.appendChild(categoryNavLink);
    // If we have a module in this category, show the whole category
    if (bHasModule) {
      return [categoryContainer, categoryNavItem];
    } else {
      return [null, null];
    }
  }

  function handleModulesRoot(modules) {
    if (!getEl("modules-root")) {
      return;
    }

    // Create row for columns
    let modulesRow = document.createElement("div");
    modulesRow.classList.add("row");

    // Create column for all the customization controls
    let customizationsCol = document.createElement("div");
    customizationsCol.id = "modules-controls";
    customizationsCol.classList.add("col-8", "inset-box");
    modulesRow.appendChild(customizationsCol);

    // Create column for the sidebar
    let sidebarCol = document.createElement("div");
    sidebarCol.classList.add("col-4", "position-relative");
    sidebarCol.id = "modules-sidebar";
    let sidebarNav = document.createElement("ul");
    sidebarNav.classList.add("nav", "flex-column", "nav-pills", "fixed-inner");
    sidebarNav.id = "modules-nav";
    sidebarCol.appendChild(sidebarNav);
    modulesRow.appendChild(sidebarCol);

    // For each module category, create its element and add it to the columns.
    Object.keys(modules).forEach((module) => {
      let [moduleCategoryElement, moduleCategoryNavLink] = handleCategory(module, modules[module]);
      if (moduleCategoryElement) {
        customizationsCol.appendChild(moduleCategoryElement);
      }
      if (moduleCategoryNavLink) {
        sidebarNav.appendChild(moduleCategoryNavLink);
      }
    });
    
    let resetButton = document.createElement("button");
    resetButton.innerText = "Reset all customizations";
    resetButton.classList.add("position-absolute", "bottom-0", "btn", "btn-secondary");
    resetButton.style.marginBottom = "0.5rem";
    resetButton.addEventListener("click", (e) => {
      e.preventDefault();
      resetModules();
      handleModulesRoot(modules);
    });
    sidebarCol.append(resetButton);

    // Add a bit of padding to our overflowed root
    let paddingDiv = document.createElement("div");
    paddingDiv.style.height = "48.75vh";
    customizationsCol.appendChild(paddingDiv);

    // Remove loading
    getEl("modules-root").innerText = "";

    // Add the columns to root container.
    getEl("modules-root").appendChild(modulesRow);

    // Init scrollspy
    new bootstrap.ScrollSpy(customizationsCol, {
      target: "#modules-nav"
    });

    // Update after travesing all modules
    updateCustomizationDownload();
  }

  function addVersion(ver, dropdown, badge) {
    let versionListItem = document.createElement("li");
    let dropdownItem = document.createElement("a");
    dropdownItem.classList.add("dropdown-item");
    dropdownItem.href = "#";
    dropdownItem.addEventListener("click", (event) => {
      setUserVersion(ver);
      event.preventDefault();
    });
    dropdownItem.innerText = ver === "latest" ? latestVersion : ver;
    if (badge) {
      dropdownItem.innerText += " ";
      let itemBadge = document.createElement("span");
      itemBadge.innerText = badge[0];
      itemBadge.classList.add("badge", badge[1]);
      dropdownItem.append(itemBadge);
    }
    versionListItem.append(dropdownItem);
    dropdown.append(versionListItem);
  }

  function addDropdownDivider(dropdown) {
    let dividerListItem = document.createElement("li");
    let dropdownDivider = document.createElement("hr");
    dropdownDivider.classList.add("dropdown-divider");
    dividerListItem.append(dropdownDivider);
    dropdown.append(dividerListItem);
  }

  function handleVersions(versions) {
    if (!versions) {
      return;
    }

    let lastVersion = storage.getItem("lastVersion");
    let foundVersion = false;

    // set latest version
    latestVersion = versions.shift();
    setUserVersion("latest");

    releaseUrl.dev = "https://github.com/mastercomfig/mastercomfig/compare/{0}...develop".format(latestVersion);

    let versionDropdown = getEl("versionDropdownMenu");

    let latestBadge;
    if (latestVersion === lastVersion)
    {
      latestBadge = ["up to date", "bg-teal"];
      foundVersion = true;
    } else {
      latestBadge = ["latest", "bg-teal"];
    }

    getEl("up-to-date-mark").classList.toggle("d-none", !foundVersion);

    addVersion("latest", versionDropdown, latestBadge);

    let lastDownloadedBadge = ["last downloaded", "bg-secondary"];

    for (const thisVersion of versions) {
      let badge;
      if (!foundVersion && thisVersion === lastVersion) {
        badge = lastDownloadedBadge;
        foundVersion = true;
      } else {
        badge = null;
      }
      addVersion(thisVersion, versionDropdown, badge);
    }

    if (lastVersion && !foundVersion) {
      addDropdownDivider(versionDropdown);
      addVersion(lastVersion, versionDropdown, lastDownloadedBadge);
    }

    addDropdownDivider(versionDropdown);

    addVersion("Dev build", versionDropdown, ["alpha", "bg-danger"]);

    getEl("versionDropdown").classList.add("ready");
  }

  const isLocalHost = window.location.hostname === 'localhost' ||
  // [::1] is the IPv6 localhost address.
  window.location.hostname === '[::1]' ||
  // 127.0.0.1/8 is considered localhost for IPv4.
  window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  );

  // get latest release, and update page
  fetch(
    (isLocalHost ? "https://cors-anywhere.herokuapp.com/": "") + "https://mastercomfig.mcoms.workers.dev/?v=2"
  )
    .then((resp) => resp.json())
    .then((data) => {
      cachedData = data;
      // Get the version
      handleVersions(data.v);

      // Now get the modules
      modulesDef = data.m;
      presetModulesDef = data.p;
      handleModulesRoot(modulesDef);
    }).catch((err) => console.error("Failed to get download data:", err));

  // Register event for all presets defined in the HTML.
  document.querySelectorAll("#presets a").forEach((element) => {
    element.addEventListener("click", (e) => {
      e.preventDefault();
      setPreset(e.currentTarget.id);
    });
  });

  // Bind the download button with our multi-downloader
  bindDownloadClick("vpk-dl", getVPKDownloadUrls);

  // Bind the customizations button with our multi-downloader
  bindDownloadClick("custom-dl", getCustomDownloadUrls);

  // After binding, we need to update the text
  updateCustomizationDownload();

  // Now, register events for all addons defined in the HTML.
  document.querySelectorAll(".addon-card").forEach((element) => {
    addons.push(element.id);
    element.addEventListener("click", (e) => {
      updateAddon(e.currentTarget.id);
      e.preventDefault();
    });
  });

  // If we have a stored preset, select it
  if (storage.getItem("preset")) {
    setPreset(storage.getItem("preset"), true);
  } else {
    setPreset("medium-high", true);
  }

  // For all defined addons, check if we have it stored
  for (const id of addons) {
    if (storage.getItem(id)) {
      setAddon(id, storage.getItem(id));
    } else {
      setAddon(id, false);
    }
  }

  getEl("customize-toggler").addEventListener("click", (e) => {
    e.currentTarget.classList.toggle("active");
  })

  let commonKeyboardOptions = {
    onKeyPress: button => onKeyPress(button),
    theme: "hg-theme-default simple-keyboard custom-kb-theme",
    physicalKeyboardHighlight: true,
    syncInstanceInputs: true,
    mergeDisplay: true,
  };

  const Keyboard = window.SimpleKeyboard.default;

  let keyboard = new Keyboard(".simple-keyboard-main", {
    ...commonKeyboardOptions,
    /**
     * Layout by:
     * Sterling Butters (https://github.com/SterlingButters)
     */
    layout: {
      default: [
        "{escape} {f1} {f2} {f3} {f4} {f5} {f6} {f7} {f8} {f9} {f10} {f11} {f12}",
        "` 1 2 3 4 5 6 7 8 9 0 - = {backspace}",
        "{tab} q w e r t y u i o p [ ] \\",
        "{capslock} a s d f g h j k l ; ' {enter}",
        "{shiftleft} z x c v b n m , . / {shiftright}",
        "{controlleft} {altleft} {space} {altright} {controlright}"
      ]
    },
    display: {
      "{escape}": "esc",
      "{tab}": "tab ⇥",
      "{backspace}": "backspace ⌫",
      "{enter}": "enter ↵",
      "{capslock}": "caps lock ⇪",
      "{shiftleft}": "shift ⇧",
      "{shiftright}": "shift ⇧",
      "{controlleft}": "ctrl",
      "{controlright}": "ctrl",
      "{altleft}": "alt",
      "{altright}": "alt",
      "{metaleft}": "⊞",
      "{metaright}": "⊞"
    }
  });

  let keyboardControlPad = new Keyboard(".simple-keyboard-control", {
    ...commonKeyboardOptions,
    layout: {
      default: [
      "{scrolllock} {pause}",
      "{insert} {home} {pageup}",
      "{delete} {end} {pagedown}"
      ]
    }
  });
  
  let keyboardArrows = new Keyboard(".simple-keyboard-arrows", {
    ...commonKeyboardOptions,
    layout: {
      default: ["{arrowup}", "{arrowleft} {arrowdown} {arrowright}"]
    }
  });
  
  let keyboardNumPad = new Keyboard(".simple-keyboard-numpad", {
    ...commonKeyboardOptions,
    layout: {
      default: [
        "{numpaddivide} {numpadmultiply}",
        "{numpad7} {numpad8} {numpad9}",
        "{numpad4} {numpad5} {numpad6}",
        "{numpad1} {numpad2} {numpad3}",
        "{numpad0} {numpaddecimal}"
      ]
    }
  });
  
  let keyboardNumPadEnd = new Keyboard(".simple-keyboard-numpadEnd", {
    ...commonKeyboardOptions,
    layout: {
      default: ["{numpadsubtract}", "{numpadadd}", "{numpadenter}"]
    }
  });
  
  function onKeyPress(button) {
    if (!getEl("keyboardInput")) {
      return;
    }
    getEl("keyboardInput").value = simpleKeyboardKeyToKeyBind(button);
    console.log("Button pressed", simpleKeyboardKeyToKeyBind(button));
  }

  var blockKeyboard = false;

  document.addEventListener("keydown", event => {
    // Disabling keyboard input, as some keys (like F5) make the browser lose focus.
    // If you're like to re-enable it, comment the next line and uncomment the following ones
    if (blockKeyboard && getEl("keyboardInput")) {
      getEl("keyboardInput").value = keyEventToKeyBind(event);
      event.preventDefault();
    }
  });

  // Capture keyboard input when bindings are shown
  var tabEls = document.querySelectorAll('#customizations a[data-bs-toggle="tab"]')
  for (const tabEl of tabEls) {
    tabEl.addEventListener("shown.bs.tab", event => {
      blockKeyboard = event.target.id === "bindings";
    });
  }

  function finishBindInput(event) {
    event.currentTarget.removeAttribute("id");
    event.currentTarget.setAttribute("value", "");
    event.currentTarget.setAttribute("placeholder", "<Unbound>");
  }

  var bindingFields = document.querySelectorAll("#binds-list .form-control")
  for (const bindField of bindingFields) {
    bindField.addEventListener("focus", event => {
      event.currentTarget.id = "keyboardInput";
      event.currentTarget.setAttribute("value", "");
      event.currentTarget.setAttribute("placeholder", "<Press key to bind>");
    });
    bindField.addEventListener("blur", finishBindInput);
    bindField.addEventListener("input", event => {
      finishBindInput(event);
      event.preventDefault();
    });
  }

  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can add to home screen
    let addBtn = getEl("install-link");
    addBtn.classList.remove("d-none");
  
    addBtn.addEventListener('click', (e) => {
      // hide our user interface that shows our A2HS button
      addBtn.classList.add("d-none");
      // Show the prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
          } else {
            console.log('User dismissed the A2HS prompt');
          }
          deferredPrompt = null;
        });
    });
  });

  window.addEventListener("load", () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js");
    }
  });
}

(function () {
  app();
})();
