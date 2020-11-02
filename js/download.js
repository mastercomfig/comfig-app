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

  function loadModules() {
    let storedModulesStr = storage.getItem("modules");
    if (storedModulesStr) {
      storedModules = JSON.parse(storedModulesStr);
    }
  }

  function saveModules() {
    storage.setItem("modules", JSON.stringify(selectedModules));
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

  // Where all downloads come from
  var downloadUrl =
    "https://github.com/mastercomfig/mastercomfig/releases/latest/download/mastercomfig-";
  // Addon extension format string to download
  var addonUrl = downloadUrl + "{0}-addon.vpk";
  // Preset extension format string to download
  var presetUrl = downloadUrl + "{0}-preset.vpk";

  // Cached elements
  var presetDownload = document.getElementById("preset-dl");
  var modulesRoot = document.getElementById("modules-root");

  // Current mastercomfig version, comes in from API
  var version = null;

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

  var storage = localStorage;

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
      let element = document.getElementById(id);
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
    let element = document.getElementById(id);
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
    return (preset ? presetUrl : addonUrl).format(id);
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
    let element = document.getElementById("custom-dl");
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
    setAddon(id, document.getElementById(id).checked);
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
    document.getElementById(id + "-dl").style.display = checked
      ? "initial"
      : "none";
    document.getElementById(id).checked = checked;
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
    new bootstrap.Tab(document.getElementById(id)).show(); // visually select in tabs menu
    document.getElementById("vpk-dl").removeAttribute("href"); // we don't need the static download anymore
    if (!downloading) {
      document.getElementById(
        "vpk-dl"
      ).innerHTML = `<span class="fa fa-cloud-download fa-fw"></span> Download ${presets[id]} preset and selected addons VPKs ` // update download text
    }
    presetDownload.setAttribute("href", getPresetUrl());
    document.getElementById(
      "preset-dl"
    ).innerHTML = `<span class="fa fa-download fa-fw"></span> Download ${presets[id]} preset VPK` // update preset text
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
  };

  let keypadBindMap = {"+": "KP_PLUS",
    "/": "KP_SLASH",
    "*": "KP_MULTIPLY",
    "-": "KP_MINUS",
    "+": "KP_PLUS",
    "CLEAR": "KP_5",
    "ENTER": "KP_ENTER",
    ".": "KP_DEL"
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
    if (e.key.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
      return "R" + binding;
    }
    if (e.key.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
      if (keypadBindMap.hasOwnProperty(binding)) {
      return keypadBindMap[binding];
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

  function resetCategory(category) {
      Object.keys(modulesDef[category].modules).forEach((setting) => {
          delete selectedModules[setting];
      });
      saveModules();
      handleModulesRoot(modulesDef);
  }

  function resetAllModules() {
      selectedModules = { };
      saveModules();
      handleModulesRoot(modulesDef);
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
    valueIndicator.innerText = capitalize(defaultSelection);
    // Event listener
    rangeElement.addEventListener("input", (e) => {
      let selected = values[e.target.valueAsNumber];
      setModule(name, selected);
      valueIndicator.innerText = capitalize(selected);
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
    moduleDocsLink.setAttribute("rel", "noopener noreferrer");
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
    // Add category reset button
    let resetButton = document.createElement('button');
    resetButton.classList.add("btn");
    resetButton.classList.add("btn-secondary");
    resetButton.textContent = "Reset " + displayName + " to Default";
    resetButton.addEventListener("click", (e) => resetCategory(name));
    categoryContainer.appendChild(resetButton);
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
      document.getElementById("modules-controls").scrollTop = top;
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
    if (!modulesRoot) {
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
    sidebarCol.classList.add("col-4", "d-none");
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

    // Add global reset button
    let resetButton = document.createElement('button');
    resetButton.classList.add("btn");
    resetButton.classList.add("btn-primary");
    resetButton.textContent = "Reset All to Default";
    resetButton.addEventListener("click", resetAllModules);
    customizationsCol.appendChild(resetButton);

    // Add a bit of padding to our overflowed root
    let paddingDiv = document.createElement("div");
    paddingDiv.style.height = "48.75vh";
    customizationsCol.appendChild(paddingDiv);

    // Remove loading
    modulesRoot.innerText = "";

    // Add the columns to root container.
    modulesRoot.appendChild(modulesRow);

    // Init scrollspy
    new bootstrap.ScrollSpy(customizationsCol, {
      target: "#modules-nav"
    });

    // Update after travesing all modules
    updateCustomizationDownload();
  }

  // get latest release, and update page
  fetch("https://mastercomfig.mcoms.workers.dev/")
    .then((resp) => resp.json())
    .then((data) => {
      // Get the version
      version = data.v;
      if (!version) {
        return;
      }
      let versionName =
        version.indexOf("v") === 0 ? version.substr(1) : version; // some releases use the v prefix, ignore it
      // update title with version
      document.getElementById("version").innerText = versionName;

      // Now get the modules we defined in the response data.
      modulesDef = data.m;
      presetModulesDef = data.p;
      handleModulesRoot(modulesDef);
    });

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

  // Track the last version we downloaded, so that updates can be managed
  document.getElementById("preset-dl").addEventListener("click", () => {
    storage.setItem("lastVersion", version);
  });

  // Now, register events for all addons defined in the HTML.
  document.querySelectorAll("input[type='checkbox']").forEach((element) => {
    addons.push(element.id);
    element.addEventListener("input", (e) => {
      updateAddon(e.currentTarget.id);
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

  document.getElementById("modules-toggler").addEventListener("click", (e) => {
    e.currentTarget.classList.toggle("active");
    setTimeout(() => {
      document.getElementById("modules-sidebar").classList.toggle("d-none");
    }, 100);
  })

  let Keyboard = window.SimpleKeyboard.default;

  let myKeyboard = new Keyboard({
    onChange: input => onChange(input),
    onKeyPress: button => onKeyPress(button)
  });


  function onChange(input) {
    document.querySelector(".input").value = input;
    console.log("Input changed", input);
  }


  function onKeyPress(button) {
    console.log("Button pressed", button);
  }
}

(function () {
  app();
})();
