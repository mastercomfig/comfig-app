"use strict";

function app() {
  // convenience format method for string
  String.prototype.format = function () {
    const args = arguments;
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] !== "undefined" ? args[number] : match;
    });
  };

  // convenience proper case for modules
  function properCaseModuleName(name) {
    let split = name.split("_");
    split.forEach((str, index, array) => {
      array[index] = str.charAt(0).toUpperCase() + str.substr(1);
    });
    return split.join(" ");
  }

  // convenience proper case name or display for modules
  function properCaseOrDisplayModuleName(module, name) {
    console.log(module);
    console.log(name);
    let displayName = module.hasOwnProperty("display")
      ? module.display
      : properCaseModuleName(name ? name : module.name);
    return displayName;
  }

  // Map preset IDs to display names for download
  var presets = new Map([
    ["ultra", "Ultra"],
    ["high", "High"],
    ["medium-high", "Medium High"],
    ["medium", "Medium"],
    ["medium-low", "Medium Low"],
    ["low", "Low"],
    ["very-low", "Very Low"],
  ]);

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
  var vpkDownload = document.getElementById("vpk-dl");
  var presetDownload = document.getElementById("preset-dl");
  var modulesRoot = document.getElementById("modules-root");

  // Current mastercomfig version, comes in from API
  var version = null;

  // Defined addons (found through parsing HTML)
  var addons = [];

  // Currently selected preset
  var selectedPreset = "medium-high";
  // Currently selected addons
  var selections = [];

  var storage = localStorage;

  // Track if multi-download is active
  var downloading = false;

  // Once user clicks to multi-download, we download and swap our behavior to in-progress
  function downloadClickEvent() {
    // Do the download once clicked
    download();
    document.getElementById("vpk-dl").onclick = null; // Ignore clicks
    downloading = true; // Still retain in-progress even after switching preset
    // Indicate not useable/in-progress
    vpkDownload.style.cursor = "not-allowed";
    vpkDownload.classList.add("focus");
    document.getElementById("vpk-dl").innerHTML = vpkDownload.innerHTML
      .replace("Download", "Downloading")
      .replace("VPKs", "VPKs...");
  }

  // This is what we do when multi-download is ready (init or after finish)
  function bindDownloadClick() {
    // Reregister that we can respond to a click
    document.getElementById("vpk-dl").onclick = downloadClickEvent;
    downloading = false; // Unlock updating preset test with new download
    // Restore downloadable style
    vpkDownload.style.cursor = "pointer";
    vpkDownload.classList.remove("focus");
    document.getElementById("vpk-dl").innerHTML = vpkDownload.innerHTML
      .replace("Downloading", "Download")
      .replace("VPKs...", "VPKs");
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

  function downloadUrls(urls) {
    // Take the top URL promise and resolve it.
    urls[0].then((result) => {
      // If not empty, make the browser download it.
      if (result.url !== "") {
        window.location = result.url;
      }
      if (urls.length > 1) {
        setTimeout(() => {
          // Queue up the rest of the download promise stack
          return downloadUrls(urls.slice(1));
        }, 2000);
      } else {
        // We've gotten to the last in the download stack, so we're done
        bindDownloadClick();
      }
    });
  }

  function download() {
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
    for (const selection of selections) {
      downloads.push(
        Promise.resolve({
          url: getAddonUrl(selection),
        })
      );
    }
    // Now queue up all our download promises to download!
    return downloadUrls(downloads);
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
      if (selections.indexOf(id) === -1) {
        selections.push(id);
      }
    } else {
      // Filter out the addon if it's there
      selections = selections.filter((selection) => selection !== id);
    }
    // Make sure the UI reflects the selected state
    document.getElementById(id + "-dl").style.display = checked
      ? "initial"
      : "none";
    document.getElementById(id).checked = checked;
  }

  function setPreset(id, no_set) {
    storage.setItem("preset", id); // save preset selection
    new bootstrap.Tab(document.getElementById(id)).show(); // visually select in tabs menu
    selectedPreset = id; // save download ID
    vpkDownload.removeAttribute("href"); // we don't need the static download anymore
    if (!downloading) {
      document.getElementById(
        "vpk-dl"
      ).innerHTML = '<span class="fa fa-cloud-download fa-fw"></span> Download {0} preset and selected addons VPKs'.format(
        presets.get(id)
      ); // update download text
    }
    presetDownload.setAttribute("href", getPresetUrl());
    document.getElementById(
      "preset-dl"
    ).innerHTML = '<span class="fa fa-download fa-fw"></span> Download {0} preset VPK'.format(
      presets.get(id)
    ); // update preset text
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

  // Convenience method for creating form input elements
  function createInputElement(type, clazz) {
    let inputElement = document.createElement("input");
    inputElement.classList.add(clazz);
    inputElement.setAttribute("type", type);
    return inputElement;
  }

  // Create a dropdown select input
  function handleModuleInputSelect(values) {
    // Create the element
    let selectElement = document.createElement("select");
    selectElement.classList.add("form-select");
    // Add the values
    values.forEach((value) => {
      // Create the option element
      let optionElement = document.createElement("option");
      optionElement.setAttribute("value", value.value);
      // Name the value
      let displayName = properCaseOrDisplayModuleName(value, value.value);
      optionElement.innerText = displayName;
      selectElement.appendChild(optionElement);
    });
    return selectElement;
  }

  // Create a switch/toggle input
  function handleModuleInputSwitch(values) {
    let switchElement = createInputElement("checkbox", "form-check-input");
    switchElement.setAttribute("value", "");
    return switchElement;
  }

  // TODO: we can just use select for now, but for ease of use, this should be implemented in the future
  function handleModuleInputGroup(values) {}

  // Creates a range slider
  function handleModuleInputSlider(values) {
    let rangeElement = createInputElement("range", "form-range");
    rangeElement.setAttribute("min", 1);
    rangeElement.setAttribute("max", values.length);
    return rangeElement;
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
  function handleModuleInput(type, values) {
    if (values) {
      let fnModuleInput = moduleInputFactory(type);
      if (fnModuleInput) {
        return fnModuleInput(values);
      }
    }
    return null;
  }

  // Handle each module
  function handleModule(module) {
    // Create element
    let moduleContainer = document.createElement("div");
    moduleContainer.id = module.name + "-module-input-cont";
    // Create module title
    let moduleTitle = document.createElement("h6");
    let displayName = properCaseOrDisplayModuleName(module);
    moduleTitle.innerText = displayName;
    moduleContainer.appendChild(moduleTitle);
    // Create the module's input control
    let moduleInputType = module.hasOwnProperty("type")
      ? module.type
      : "select";
    let moduleInput = handleModuleInput(moduleInputType, module.values);
    // If we could create an input control, show it to our parent
    if (moduleInput) {
      moduleContainer.appendChild(moduleInput);
      return moduleContainer;
    } else {
      return null;
    }
  }

  // Handles each module category
  function handleCategory(name, category) {
    // Create category element
    let categoryContainer = document.createElement("div");
    categoryContainer.id = "module-cont-" + name;
    // Create category title
    let categoryTitle = document.createElement("h4");
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
    // If we have a module in this category, show the whole category
    if (bHasModule) {
      return categoryContainer;
    } else {
      return null;
    }
  }

  function handleModulesRoot(modules) {
    if (!modulesRoot) {
      return;
    }

    // Remove loading
    modulesRoot.innerText = "";

    // For each module category, create its element and add it to the main modules container.
    Object.keys(modules).forEach((module) => {
      let moduleCategoryElement = handleCategory(module, modules[module]);
      if (moduleCategoryElement) {
        modulesRoot.appendChild(moduleCategoryElement);
      }
    });
  }

  // get latest release, and update page
  fetch(
    "https://cors-anywhere.herokuapp.com/https://mastercomfig.mcoms.workers.dev/"
  )
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
      modules = data.m;
      handleModulesRoot(modules);
    });

  // Register event for all presets defined in the HTML.
  document.querySelectorAll("#presets a").forEach((element) => {
    element.addEventListener("click", (e) => {
      e.preventDefault();
      setPreset(e.currentTarget.id);
    });
  });

  // Bind the download button with our multi-downloader
  bindDownloadClick();

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
    setPreset("medium-high");
  }

  // For all defined addons, check if we have it stored
  for (const id of addons) {
    if (storage.getItem(id)) {
      setAddon(id, storage.getItem(id));
    } else {
      setAddon(id, false);
    }
  }
}

(function () {
  app();
})();
