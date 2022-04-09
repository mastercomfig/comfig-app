async function app() {
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function loadScriptEx(url, ...dependencies) {
    return Promise.all(dependencies).then(() => loadScript(url));
  }

  function hasDynamicImport() {
    try {
      return new Function("return import('data:text/javascript;base64,Cg==').then(r => true)")();
    } catch(e) {
      return Promise.resolve(false);
    }
  }

  let dfirebase = loadScript("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
  let dfirebaseAuth = loadScriptEx("https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js", dfirebase);
  let dfirebaseMessaging = loadScriptEx("https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js", dfirebase);
  let dSimpleKeyboard = loadScript("https://cdn.jsdelivr.net/npm/simple-keyboard@latest/build/index.modern.js");
  let dVDF = hasDynamicImport().then(() => import("../third_party/js/vdf-parser.js"));

  dfirebase.then(() => {
    const firebaseConfig = {
      apiKey: "AIzaSyBKDPeOgq97k5whdxL_Z94ak9jSfdjXU4E",
      authDomain: "mastercomfig-app.firebaseapp.com",
      projectId: "mastercomfig-app",
      storageBucket: "mastercomfig-app.appspot.com",
      messagingSenderId: "1055009628964",
      appId: "1:1055009628964:web:6ad7954859d843050d49b1",
      measurementId: "G-S0F8JT6ZQE"
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
  });

  if ("Sentry" in window) {
    const logLevelToSentrySeverity = {
      "warn": "warning",
    };

    function consoleHook(level) {
      const original = console[level].bind(console);
      return function() {
        Sentry.addBreadcrumb(
          {
            category: 'console',
            level: logLevelToSentrySeverity[level] ? logLevelToSentrySeverity[level] : level,
            message: !arguments ? "undefined" : arguments.length === 1 ? `${arguments[0]}` : `${arguments[0]}: ${Array.prototype.slice.call(arguments, 1).join()}`
          },
          {
            input: [...arguments],
            level
          }
        );
        original.apply(console, arguments);
      }
    }

    for (const level of ['debug', 'info', 'warn', 'error', 'log']) {
      console[level] = consoleHook(level);
    }
  }

  // convenience format method for string
  String.prototype.format = function() {
    const args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] !== "undefined" ? args[number] : match;
    });
  };

  function isValid(value) {
    return value !== undefined || value !== null;
  }

  // find RegEx
  Array.prototype.query = function(match) {
    let  reg = new RegExp(match);

    return this.filter(function(item){
        return typeof item == 'string' && item.match(reg);
    });
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.substr(1);
  }

  function getEl(element) {
    return document.getElementById(element);
  }

  let memDB = {};

  async function tryDBGet(key) {
    try {
      return await idbKeyval.get(key);
    } catch (err) {
      console.error(err);
      return memDB[key]
    }
  }

  async function tryDBSet(key, value) {
    try {
      await idbKeyval.set(key, value);
    } catch (err) {
      console.error(err);
      memDB[key] = value;
    }
  }

  async function tryDBDelete(key) {
    try {
      await idbKeyval.del(key);
    } catch (err) {
      console.error(err);
      delete memDB[key];
    }
  }

  async function loadModules() {
    let storedModulesDB = await tryDBGet("modules");
    if (storedModulesDB) {
      storedModules = storedModulesDB;
    }
  }

  async function saveModules() {
    await tryDBSet("modules", selectedModules);
  }

  async function resetModules() {
    await tryDBDelete("modules");
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
    none: {
      name: "None",
      description: "<h4>Special preset which skips setting quality options.</h4>",
    },
    ultra: {
      name: "Ultra",
      description: "<h4>Absolute maximum quality, with even the slightest and most performance-intensive quality improvements included.</h4>",
    },
    high: {
      name: "High",
      description: "<h4>Enables all graphical features without making them extremely high quality.</h4>",
    },
    "medium-high": {
      name: "Medium High",
      description: "<h4>Disables unoptimized features and optimizes the game without making the game look bad.</h4>",
    },
    medium: {
      name: "Medium",
      description: "<h4>The maximum performance you can get while enabling a few effects that may give you a slight edge.</h4>",
    },
    "medium-low": {
      name: "Medium Low",
      description: "<h4>The maximum performance you can get without making the game too hard to play because of awful visual quality and glitches.</h4>",
    },
    low: {
      name: "Low",
      description: "<h4>Maximum performance without caring much about visibility or possible visual glitches.</h4>",
    },
    "very-low": {
      name: "Very Low",
      description: "<h4>Negatively affects playability by <strong>a lot</strong> and disables very essential features like HUD elements in desperation for performance.</h4>Not recommended unless the game has such low performance that it is more of a hinderance than not having HUD elements and good player visibility.<br><strong>BY DOWNLOADING THIS PRESET YOU UNDERSTAND THAT IT <em>REMOVES HUD ELEMENTS AND REDUCES VISIBILITY</em>. IF YOU DON'T WANT THIS <em>USE LOW</em>, THAT'S THE <em>ONLY</em> DIFFERENCE.</strong><br>",
    },
  };

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

  setRecommendedAddons("none", []);
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
    latest: releasesUrl + "/latest",
    default: releasesUrl + "/{0}",
  };
  var assetsUrl = {
    latest: releasesUrl + "/latest",
    default: releaseUrl.default,
  };
  // Where latest downloads come from
  var downloadUrl = releaseUrl.default + "/download/";
  // Where a specific release's downloads come from
  var releaseDownloadUrl = releasesUrl + "/download/{0}/";
  // Prefix for mastercomfig files
  var mastercomfigFileUrl = "mastercomfig-";
  // Addon extension format string to download
  var addonFileUrl = mastercomfigFileUrl + "{1}-addon.vpk";
  var addonUrl = {
    latest: downloadUrl + addonFileUrl,
    default: releaseDownloadUrl + addonFileUrl,
  };
  // Preset extension format string to download
  var presetFileUrl = mastercomfigFileUrl + "{1}-preset.vpk";
  var presetUrl = {
    latest: downloadUrl + presetFileUrl,
    default: releaseDownloadUrl + presetFileUrl,
  };

  // Current mastercomfig version, comes in from API
  var version = null;
  var latestVersion = null;

  var userVersion = "latest";

  // Current presets modules def
  var presetModulesDef = {};

  // Defined addons (found through parsing HTML)
  var addons = [];

  // Currently selected preset
  var selectedPreset = null;
  // Currently selected addons
  var selectedAddons = [];
  // Current state of module selections
  var selectedModules = {};
  // Current state of binds
  var selectedBinds = {};
  // Current state of overrides
  var selectedOverrides = {};

  // Data cache
  let cachedData = null;

  // Overrides for default game action binds
  let customActionMappings = {};

  // Addons which overide action mappings
  const addonActionMappings = {
    "null-canceling-movement": {
      "Move Forward": "+mf",
      "Move Back": "+mb",
      "Move Left": "+ml",
      "Move Right": "+mr",
    }
  };

  var storedModules = {};
  await loadModules();

  // Track if multi-download is active
  var downloading = false;

  function disableDownload(element) {
    downloading = true; // Still retain in-progress even after switching preset
    // Indicate not useable/in-progress
    element.style.cursor = "not-allowed";
    element.classList.add("disabled", "text-light");
  }

  function enableDownload(element) {
    downloading = false; // Unlock updating preset test with new download
    // Restore downloadable style
    element.style.cursor = "pointer";
    element.classList.remove("disabled", "text-light");
  }

  // Once user clicks to multi-download, we download and swap our behavior to in-progress
  async function downloadClickEvent(id, fnGatherUrls) {
    // Make sure we block clicks, since onclick state is not managed in offline mode
    if (downloading) {
      return;
    }
    // Mark we have started a download
    let element = getEl(id);
    element.onclick = null; // Ignore clicks
    disableDownload(element);
    element.innerHTML = element.innerHTML
      .replace("Download", "Downloading")
      .replace(" ", "…");
    // Do the download once clicked
    let urls = await fnGatherUrls();
    // Only download if we have a download
    if (urls.length > 1) {
      await downloadUrls(urls, id, fnGatherUrls);
    } else {
      // We've gotten to the last in the download stack, so we're done
      bindDownloadClick(id, fnGatherUrls);
    }
  }

  function handleConnectivityChange(e) {
    let element = getEl("vpk-dl");
    // HACK: we are currently using a hack, by using the "downloading" variable
    // to block downloads and track blocked download state.
    if (navigator.onLine) {
      enableDownload(element);
      element.innerHTML = element.innerHTML.replace("(you are offline)", "");
    } else {
      disableDownload(element);
      element.innerHTML += "(you are offline)";
    }
  }

  function requireVersion(major, minor, patch) {
    if (userVersion !== "latest") {
      let versions = [major, minor, patch];
      let versionSplit = userVersion.split(".");
      for (let i = 0; i < versions.length; i++) {
        let requiredVersion = versions[i];
        if (!isValid(requiredVersion)) {
          continue;
        }
        let currentVersion = versionSplit[i];
        if (currentVersion < requiredVersion) {
          return false;
        }
        if (currentVersion > requiredVersion) {
          return true;
        }
      }
    }
    return true;
  }

  // This is what we do when multi-download is ready (init or after finish)
  function bindDownloadClick(id, fnGatherUrls) {
    // Reregister that we can respond to a click
    let element = getEl(id);
    element.onclick = async () => await downloadClickEvent(id, fnGatherUrls);
    enableDownload(element);
    element.innerHTML = element.innerHTML
      .replace("Downloading", "Download")
      .replace("…", " ");
  }

  // Helper functions to format download URLs
  function getDownloadUrl(id, preset, notDirect) {
    let urlOptions = preset ? presetUrl : addonUrl;
    let url;
    if (urlOptions.hasOwnProperty(userVersion)) {
      url = urlOptions[userVersion];
    } else {
      url = urlOptions.default;
    }
    url = url.format(userVersion, id);
    if (customDirectory && !notDirect) {
      url = url.replace(
        "https://github.com/mastercomfig/mastercomfig/releases",
        "https://mastercomfig.mcoms.workers.dev/download"
      );
    }
    return url;
  }

  function getAddonUrl(id, notDirect) {
    if (id === "null-canceling-movement" && !requireVersion(9, 6)) {
      id = "null-cancelling-movement";
    }
    return getDownloadUrl(id, false, notDirect);
  }

  function getPresetUrl(notDirect) {
    return getDownloadUrl(selectedPreset, true, notDirect);
  }
  // End download URL helpers

  let pendingObjectURLs = [];

  async function downloadUrls(urls, id, fnGatherUrls) {
    // Take the top URL promise and resolve it.
    urls[0].then((result) => {
      // If not empty, make the browser download it.
      if (result.url !== "") {
        if (result.isObject) {
          let link = document.createElement("a");
          link.href = result.url;
          link.download = result.name;
          document.body.append(link);
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

  async function verifyPermission(fileHandle, readWrite) {
    const options = {};
    if (readWrite) {
      options.mode = "readwrite";
    }
    // Check if permission was already granted. If so, return true.
    if ((await fileHandle.queryPermission(options)) === "granted") {
      return true;
    }
    // Request permission. If the user grants permission, return true.
    if ((await fileHandle.requestPermission(options)) === "granted") {
      return true;
    }
    // The user didn't grant permission, so return false.
    return false;
  }

  let gameDirectory = null;
  let customDirectory = null;
  let userDirectory = null;
  let appDirectory = null;

  let bindDirectInstall = true;

  async function updateDirectInstall() {
    const directInstall = await tryDBGet("enable-direct-install");
    if (!directInstall) {
      getEl("game-folder-container").classList.add("d-none");
      await restoreDirectoryInstructions();
      gameDirectory = null;
      customDirectory = null;
      userDirectory = null;
      appDirectory = null;
      return;
    }
    getEl("game-folder-container").classList.remove("d-none");
    if (!(await tryDBGet("hide-game-folder-warning")) && getEl("game-folder-warning")) {
      getEl("game-folder-warning").classList.remove("d-none");
    }
    if (bindDirectInstall) {
      bindDirectInstall = false;
      if (getEl("game-folder-warning-btn")) {
        getEl("game-folder-warning-btn").addEventListener("click", async () => {
          await tryDBSet("hide-game-folder-warning", true);
        });
      }
      getEl("game-folder-group").addEventListener("click", async () => {
        await promptDirectory();
      });
      getEl("game-folder-clear").addEventListener("click", async (e) => {
        e.stopPropagation();
        await clearDirectory();
      });
    }
    await updateDirectory();
  }

  async function clearDirectoryInstructions() {
    let instructionEls = document.querySelectorAll(".instructions-text");
    for (const instructionEl of instructionEls) {
      instructionEl.classList.add("d-none");
    }
  }

  async function restoreDirectoryInstructions() {
    let instructionEls = document.querySelectorAll(".instructions-text");
    for (const instructionEl of instructionEls) {
      instructionEl.classList.remove("d-none");
    }
    if ((await tryDBGet("hide-game-folder-warning")) && getEl("game-folder-warning")) {
      getEl("game-folder-warning").classList.add("d-none");
    }
  }

  let bannedDirectories = ["tf", "custom", "cfg", "user", "app"];
  let silentBannedDirectories = [""];

  function checkDirectory(directoryHandle) {
    const name = directoryHandle.name;
    let fail = bannedDirectories.includes(name);
    if (fail) {
      alert(`${name} is not a valid folder. To install to your game, please select the top-level "Team Fortress 2" folder.`)
    } else {
      fail = silentBannedDirectories.includes(name);
    }
    return !fail;
  }

  async function promptDirectory() {
    if (!window.showDirectoryPicker) {
      return;
    }
    try {
      let directoryHandle = await window.showDirectoryPicker({
        id: "tf2",
        startIn: "desktop",
      });
      if (!directoryHandle) {
        return;
      }
      if (!checkDirectory(directoryHandle)) {
        return;
      }
      await tryDBSet("directory", directoryHandle);
      await updateDirectory();
    } catch (err) {
      console.error("Directory prompt failed", err);
    }
  }

  // TODO: use this in more places, when things error out
  async function clearDirectory() {
    if (!window.showDirectoryPicker) {
      return;
    }
    await tryDBDelete("directory");
    gameDirectory = null;
    customDirectory = null;
    userDirectory = null;
    appDirectory = null;
    getEl(
        "game-folder-text"
    ).innerText = "No folder chosen, Direct Install not enabled";
    restoreDirectoryInstructions();
  }

  async function updateDirectory() {
    if (!window.showDirectoryPicker) {
      return;
    }
    try {
      let directoryHandle = await tryDBGet("directory");
      if (!directoryHandle) {
        return;
      }
      if (!checkDirectory(directoryHandle)) {
        clearDirectory();
        return;
      }
      clearDirectoryInstructions();
      gameDirectory = directoryHandle;
      getEl(
        "game-folder-text"
      ).innerText = `${gameDirectory.name} folder chosen, click to change`;
    } catch (err) {
      console.error("Get directory failed", err);
    }
  }

  async function accessDirectory() {
    if (!window.showDirectoryPicker) {
      return;
    }
    if (!gameDirectory) {
      return;
    }
    try {
      if (!(await verifyPermission(gameDirectory, true))) {
        console.log("Directory permission refused");
        return;
      }
      const tfDirectory = await gameDirectory.getDirectoryHandle("tf", {
        create: true,
      });
      customDirectory = await tfDirectory.getDirectoryHandle("custom", {
        create: true,
      });
      const cfgDirectory = await tfDirectory.getDirectoryHandle("cfg", {
        create: true,
      });
      userDirectory = await cfgDirectory.getDirectoryHandle("user", {
        create: true,
      });
      appDirectory = await cfgDirectory.getDirectoryHandle("app", {
        create: true,
      });
    } catch (err) {
      console.error("Get directory failed", err);
      clearDirectory();
    }
  }

  async function safeUnlink(name, directory) {
    try {
      await directory.removeEntry(name);
    } catch (err) {
      if (!err.toString().includes("could not be found")) {
        console.error(`Failed deleting ${name}`, err); 
      } else {
        if ("Sentry" in window) {
          Sentry.captureException(err);
        }
      }
    }
  }

  async function getWritable(name, directory, skipDelete) {
    if (!directory) {
      return;
    }
    if (!skipDelete) {
      await safeUnlink(name, directory);
    }
    const file = await directory.getFileHandle(name, { create: true });
    const writable = await file.createWritable();
    return writable;
  }

  async function newFile(contents, name, directory) {
    if (contents.length < 1) {
      return null;
    }
    if (directory) {
      const writable = await getWritable(name, directory);
      await writable.write(contents);
      await writable.close();
      return null;
    } else {
      const file = new File([contents], name, {
        type: "application/octet-stream",
      });
      return file;
    }
  }

  async function writeRemoteFile(url, directory) {
    if (!directory) {
      return;
    }
    let name = url.split("/").pop();
    const writable = await getWritable(name, directory, true);
    let response = await fetch(url);
    // TODO: this doesn't like concurrency
    await response.body.pipeTo(writable);
  }

  async function getVPKDownloadUrls() {
    // We need permissions for the directory
    await accessDirectory();
    // First push an empty download because browsers like that for some reason.
    var downloads = [
      Promise.resolve({
        url: "",
      }),
    ];
    let presetUrl = getPresetUrl();
    if (customDirectory) {
      // Clear out all existing files
      let presetKeys = Object.keys(presets);
      for (const preset of presetKeys) {
        let presetFile = presetFileUrl.format(null, preset);
        await safeUnlink(presetFile, customDirectory);
        await safeUnlink(presetFile + ".sound.cache", customDirectory);
      }
      for (const addon of addons) {
        let addonFile = addonFileUrl.format(null, addon);
        await safeUnlink(addonFile, customDirectory);
        await safeUnlink(addonFile + ".sound.cache", customDirectory);
      }
      // Write preset file
      await writeRemoteFile(presetUrl, customDirectory);
    } else {
      // Then push our preset download
      downloads.push(
        Promise.resolve({
          url: presetUrl,
        })
      );
    }
    // Then push all our addon downloads
    for (const selection of selectedAddons) {
      let addonUrl = getAddonUrl(selection);
      if (customDirectory) {
        await writeRemoteFile(addonUrl, customDirectory);
      } else {
        downloads.push(
          Promise.resolve({
            url: addonUrl,
          })
        );
      }
    }
    // Also handle customizations when we are using Direct Install
    if (customDirectory) {
      await getCustomDownloadUrls();
    }
    // We downloaded this version, so track it!
    await tryDBSet("lastVersion", version);
    if (cachedData) {
      await handleVersions(cachedData.v);
    }
    // Now queue up all our download promises to download!
    return downloads;
  }

  async function newModulesFile() {
    let contents = "";
    for (const moduleName of Object.keys(selectedModules)) {
      let moduleValue = selectedModules[moduleName];
      if (moduleValue) {
        contents += `${moduleName}=${moduleValue}\n`;
      } else {
        contents += `alias ${moduleName}\n`;
      }
    }
    if (contents.length > 0) {
      return await newFile(contents, "modules.cfg", userDirectory);
    }
    return null;
  }

  const EMPTY_ACTION_VALUE = "empty";
  const CUSTOM_ACTION_VALUE = "custom";

  async function updateBinds() {
    const bindFields = document.querySelectorAll(".binding-field");

    // Override actions
    let actionOverrides = {};
    for (const namespace of Object.keys(customActionMappings)) {
      for (const action of Object.keys(customActionMappings[namespace])) {
        actionOverrides[action] = customActionMappings[namespace][action];
      }
    }

    // Keep track of command binds & user saved binds
    let actionBinds = {};
    selectedBinds = {};
    for (const bindField of bindFields) {
      let keyInput = bindField.childNodes[0].firstChild.value;
      let actionSelect = bindField.childNodes[1].firstChild.value;
      if (keyInput && actionSelect) {
        if (actionSelect === EMPTY_ACTION_VALUE) {
          continue;
        }
        let bindCommand = "";
        if (actionSelect === CUSTOM_ACTION_VALUE) {
          bindCommand = bindField.childNodes[1].lastChild.firstChild.value;
          actionBinds[keyInput] = bindCommand;
          bindCommand = bindCommand.replaceAll("\"", "");
        } else {
          actionBinds[keyInput] = actionSelect;
          bindCommand = actionOverrides[actionSelect] ? actionOverrides[actionSelect] : actionMappings[actionSelect];
        }
        selectedBinds[keyInput] = bindCommand;
      }
    }
    await tryDBSet("keybinds", actionBinds);
  }

  async function newAutoexecFile() {
    let contents = "";
    // Binds
    await updateBinds();
    for (const key of Object.keys(selectedBinds)) {
      let binding = selectedBinds[key];
      let bindingStr;
      // Should we quote arg, or raw arg?
      if (typeof binding === "string" && binding.indexOf(" ") !== -1) {
        bindingStr = `"${binding}"`;
      } else {
        bindingStr = ` ${binding}`;
      }
      contents += `bind ${key}${bindingStr}\n`;
    }
    // Commands
    for (const cvar of Object.keys(selectedOverrides)) {
      contents += `${cvar} ${selectedOverrides[cvar]}\n`;
    }
    if (contents.length > 0) {
      return await newFile(contents, "autoexec.cfg", appDirectory);
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

  async function getCustomDownloadUrls() {
    // We downloaded the custom settings, so the user wants it!
    await saveModules();
    // We need permissions for the directory
    await accessDirectory();
    // First push an empty download because browsers like that for some reason.
    var downloads = [
      Promise.resolve({
        url: "",
      }),
    ];
    // Create the modules.cfg file
    let modulesFile = await newModulesFile();
    if (modulesFile) {
      downloads.push(getObjectFilePromise(modulesFile));
    }
    let autoexecFile = await newAutoexecFile();
    if (autoexecFile) {
      downloads.push(getObjectFilePromise(autoexecFile));
    }
    return downloads;
  }

  function updateCustomizationDownload() {
    let element = getEl("custom-dl");
    let bHasSelection = Object.keys(selectedModules).length > 0;
    if (bHasSelection) {
      element.classList.remove("disabled", "text-light");
      element.style.cursor = "pointer";
      element.innerHTML = element.innerHTML.replace(
        "No customizations to download",
        "Download customizations"
      );
    } else {
      element.classList.add("disabled", "text-light");
      element.style.cursor = "not-allowed";
      element.innerHTML = element.innerHTML.replace(
        "Download customizations",
        "No customizations to download"
      );
    }
  }

  // update addon state based on checked
  async function updateAddon(el) {
    await setAddon(el.id, !el.classList.contains("active"));
  }

  // set addon enabled/disabled
  async function setAddon(id, checked, fromDB) {
    // Update our DB with the value
    if (!fromDB) {
      await tryDBSet(id, checked);
    }
    if (checked) {
      // If checked, add it in if its not there already
      if (selectedAddons.indexOf(id) === -1) {
        selectedAddons.push(id);
      }
      // Add any binds associated with this addon
      if (addonActionMappings[id]) {
        customActionMappings[id] = addonActionMappings[id];
      }
    } else {
      // Filter out the addon if it's there
      selectedAddons = selectedAddons.filter((selection) => selection !== id);
      // Delete any binds associated with this addon
      if (customActionMappings[id]) {
        delete customActionMappings[id];
      }
    }
    // Make sure the UI reflects the selected state
    getEl(id + "-dl").style.display = checked ? "initial" : "none";
    getEl(id).classList.toggle("active", checked);
  }

  function updateDocsLinks(version) {
    for (const el of document.querySelectorAll(".docs-link")) {
      el.href = `https://docs.mastercomfig.com/${version}/${el.dataset.url}/`;
    }
  }

  function setUserVersion(userVer) {
    if (userVer === "Dev build") {
      userVer = "dev";
    }
    const didChange = userVersion !== userVer;
    userVersion = userVer;
    if (userVer === "latest") {
      userVer = latestVersion;
    }
    version = userVer;
    getEl("preset-dl").href = getPresetUrl(true);
    for (const id of addons) {
      getEl(id + "-dl").href = getAddonUrl(id, true);
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

    if (didChange) {
      if (userVersion === "latest") {
        if (cachedData) {
          handleApiResponse(cachedData);
          updateDocsLinks("page")
        }
      } else {
        let tag = `https://mastercomfig.mcoms.workers.dev/?t=${userVersion}`;
        sendApiRequest(tag);
        updateDocsLinks(userVersion)
      }
    }
  }

  async function setPreset(id, fromDB) {
    if (selectedPreset === id) {
      return;
    }
    selectedPreset = id; // save download ID
    if (!fromDB) {
      await tryDBSet("preset", id);

      // If we change preset after modules UI is initialized
      // we have to redraw the modules UI with the new preset's
      // defaults. however, we need to also make sure that the user's
      // current selections are preserved, so save them off here too,
      // and store them as we normally would during a page load
      if (cachedData) {
        await saveModules();
        await loadModules();
        handleModulesRoot(cachedData.m);
      }
    }
    let presetInfo = presets[selectedPreset];
    new bootstrap.Tab(getEl(selectedPreset)).show(); // visually select in tabs menu
    let presetImage = getEl("preset-image");
    presetImage.src = `/img/presets/${selectedPreset}.webp`;
    presetImage.alt = `${presetInfo.name} preset screenshot`;
    getEl("preset-description").innerHTML = presetInfo.description;
    getEl("vpk-dl").removeAttribute("href"); // we don't need the static download anymore
    if (!downloading) {
      getEl(
        "vpk-dl"
      ).innerHTML = `<span class="fa fa-cloud-download fa-fw"></span> Download ${presetInfo.name} preset and selected addons `; // update download text
    }
    getEl("preset-dl").href = getPresetUrl(true);
    getEl(
      "preset-dl"
    ).innerHTML = `<span class="fa fa-download fa-fw"></span> Download ${presetInfo.name} preset `; // update preset text
    // if not loading from DB, set recommended addons
    if (!fromDB) {
      // reset all recommendable addons
      for (const addon of recommendableAddons) {
        await setAddon(addon, false);
      }
      // set recommended addons
      for (const addon of recommendedAddons.get(selectedPreset)) {
        await setAddon(addon, true);
      }
    }
  }

  let keyBindMap = {
    PAUSE: "NUMLOCK",
    INSERT: "INS",
    DELETE: "DEL",
    PAGEUP: "PGUP",
    PAGEDOWN: "PGDN",
    CONTROL: "CTRL",
    OS: "WIN",
    " ": "SPACE",
    ";": "SEMICOLON",
  };

  let keypadBindMap = {
    "/": "SLASH",
    "*": "MULTIPLY",
    "-": "MINUS",
    "+": "PLUS",
    5: "5",
    CLEAR: "5",
    ENTER: "ENTER",
    ".": "DEL",
    0: "INS",
    7: "HOME",
    8: "ARROWUP",
    9: "PAGEUP",
    4: "ARROWLEFT",
    6: "ARROWRIGHT",
    1: "END",
    2: "ARROWDOWN",
    3: "PAGEDOWN",
  };

  let simpleKeypadMap = {
    DIVIDE: "/",
    MULTIPLY: "*",
    SUBTRACT: "-",
    ADD: "+",
    5: "CLEAR",
    DECIMAL: ".",
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
      return "R" + bindingToBind(binding);
    }
    if (e.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
      if (keypadBindMap.hasOwnProperty(binding)) {
        binding = keypadBindMap[binding];
      }
      return "KP_" + bindingToBind(binding);
    }
    return bindingToBind(binding);
  }

  const numpadKeyword = "NUMPAD";

  function simpleKeyboardKeyToKeyBind(key) {
    let binding = key.toUpperCase();
    if (binding.startsWith("{")) {
      binding = binding.substr(1, binding.length - 2);
    }
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
      if (presetValue === "" || presetValue) {
        return presetValue;
      }
      return modulePresets.default;
    }
    return null;
  }

  function getModuleDefault(name) {
    // DB can only contain non-builtin-defaults
    let userValue = storedModules[name];
    if (userValue) {
      selectedModules[name] = userValue;
      return userValue;
    }
    return getBuiltinModuleDefault(name);
  }

  // Set modules
  function setModule(name, value) {
    let defaultValue = getBuiltinModuleDefault(name);
    if (defaultValue === value) {
      if (selectedModules.hasOwnProperty(name)) {
        delete selectedModules[name];
      }
      updateUndoLink(name, true);
    } else {
      selectedModules[name] = value;
      updateUndoLink(name, false);
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
    inputElement.type = type;
    return inputElement;
  }

  function updateUndoLink(name, isDefault) {
    let undoLink = getEl(`undo-${name}`);
    undoLink.classList.toggle("d-none", isDefault);
  }

  // Convenience method for creating input containers
  function createInputContainer(name) {
    let row = document.createElement("div");
    row.classList.add("row");
    let col = document.createElement("div");
    col.classList.add("col-sm-5");
    row.append(col);
    let undoCol = document.createElement("div")
    undoCol.classList.add("col");
    let undoLink = document.createElement("a");
    undoLink.href = "#";
    undoLink.id = `undo-${name}`;
    undoLink.addEventListener("click", (e) => {
      e.preventDefault();
      setModule(name, getBuiltinModuleDefault(name));
    })
    let value = getModuleDefault(name);
    let configDefault = getBuiltinModuleDefault(name);
    if (value === configDefault) {
      undoLink.classList.add("d-none");
    }
    let undoIcon = document.createElement("span");
    undoIcon.classList.add("fa", "fa-undo", "fa-fw");
    undoLink.append(undoIcon);
    undoCol.append(undoLink)
    row.append(undoCol);
    return [row, col, undoLink];
  }

  // Create a dropdown select input
  function handleModuleInputSelect(name, values) {
    let [inputOuter, inputContainer, inputUndo] = createInputContainer(name);
    // Create the element
    let selectElement = document.createElement("select");
    selectElement.classList.add(
      "form-select",
      "form-select-sm",
      "bg-dark",
      "text-light"
    );
    let defaultValue = getModuleDefault(name);
    let configDefault = getBuiltinModuleDefault(name);
    let defaultIndex = 0;
    // Add the values
    values.forEach((value, index) => {
      // Create the option element
      let optionElement = document.createElement("option");
      optionElement.value = value.value;
      if (value.value === defaultValue) {
        optionElement.selected = true;
      }
      // Find the default index
      if (value.value === configDefault) {
        defaultIndex = index;
      }
      // Name the value
      let displayName = properCaseOrDisplayModuleName(value, value.value);
      optionElement.innerText = displayName;
      selectElement.append(optionElement);
    });
    // Event listener for undoing
    inputUndo.addEventListener("click", () => {
      selectElement.selectedIndex = defaultIndex;
    });
    // Event listener for setting module
    selectElement.addEventListener("input", (e) => {
      let select = e.target;
      let value = select.options[select.selectedIndex].value;
      setModule(name, value);
    });
    inputContainer.append(selectElement);
    return inputOuter;
  }

  // Create a switch/toggle input
  function handleModuleInputSwitch(name, values) {
    let [inputOuter, inputContainer, inputUndo] = createInputContainer(name);
    // Create the switch element
    let switchContainer = document.createElement("div");
    switchContainer.classList.add("form-check", "form-switch");
    let switchElement = createInputElement("checkbox", "form-check-input");
    switchElement.value = "";
    switchContainer.append(switchElement);
    // Set default value
    let defaultValue = getDefaultValueFromName(values, getModuleDefault(name));
    if (defaultValue) {
      switchElement.checked = true;
    }
    // Event listener for undoing
    let configDefault = getDefaultValueFromName(values, getBuiltinModuleDefault(name));
    inputUndo.addEventListener("click", () => {
      switchElement.checked = configDefault;
    });
    // Event listener
    switchContainer.addEventListener("input", (e) => {
      let selected = values[e.target.checked ? 1 : 0];
      setModule(name, selected.value);
    });
    inputContainer.append(switchContainer);
    return inputOuter;
  }

  // TODO: we can just use select for now, but for usability, this should be implemented in the future
  function handleModuleInputGroup(name, values) {}

  // Creates a range slider
  function handleModuleInputSlider(name, values) {
    let [inputOuter, inputContainer, inputUndo] = createInputContainer(name);
    // Create the range element
    let rangeElement = createInputElement("range", "form-range");
    let defaultValue = getDefaultValueFromName(values, getModuleDefault(name));
    rangeElement.value = defaultValue;
    rangeElement.min = 0;
    rangeElement.max = values.length - 1;
    // Create the value indicator (shows what value in the range is selected)
    let valueIndicator = document.createElement("span");
    // Set default value
    let defaultSelection = values[defaultValue];
    if (typeof defaultSelection === "object") {
      valueIndicator.innerText = properCaseOrDisplayModuleName(
        defaultSelection,
        defaultSelection.value
      );
    } else {
      valueIndicator.innerText = capitalize(defaultSelection);
    }
    // Event listener for undoing
    let configDefault = getDefaultValueFromName(values, getBuiltinModuleDefault(name));
    inputUndo.addEventListener("click", () => {
      rangeElement.value = configDefault;
      let configDefaultSelection = values[configDefault];
      if (typeof configDefaultSelection === "object") {
        valueIndicator.innerText = properCaseOrDisplayModuleName(
          configDefaultSelection,
          configDefaultSelection.value
        );
      } else {
        valueIndicator.innerText = capitalize(configDefaultSelection);
      }
    });
    // Event listener
    rangeElement.addEventListener("input", (e) => {
      let selected = values[e.target.valueAsNumber];
      if (typeof defaultSelection === "object") {
        setModule(name, selected.value);
        valueIndicator.innerText = properCaseOrDisplayModuleName(
          selected,
          selected.value
        );
      } else {
        setModule(name, selected);
        valueIndicator.innerText = capitalize(selected);
      }
    });
    inputContainer.append(rangeElement);
    inputContainer.append(valueIndicator);
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
      let defaultValue = getBuiltinModuleDefault(name);
      let newValues;
      if (defaultValue === "") {
        let emptyValue =
          typeof values[0] === "object"
            ? {
                value: "",
                display: "None",
              }
            : "none";
        // Preventing side effects to module values
        newValues = [emptyValue].concat(values);
        emptyValue = newValues.shift();
        newValues.push(emptyValue);
      } else {
        newValues = values;
      }
      let fnModuleInput = moduleInputFactory(type);
      if (fnModuleInput) {
        return fnModuleInput(name, newValues);
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
    moduleContainer.append(moduleTitle);
    // Create a link to module documentation
    let moduleDocsLink = document.createElement("a");
    moduleDocsLink.href =
      `https://docs.mastercomfig.com/${userVersion !== "latest" ? userVersion : "page"}/customization/modules/#` +
      displayName.replaceAll(/\(|\)/g, "").split(" ").join("-").toLowerCase();
    moduleDocsLink.target = "_blank";
    moduleDocsLink.rel = "noopener";
    let modulesDocsIcon = document.createElement("span");
    modulesDocsIcon.classList.add("fa", "fa-book", "fa-fw");
    modulesDocsIcon.ariaHidden = true;
    moduleDocsLink.append(modulesDocsIcon);
    moduleDocsLink.innerHTML = " " + moduleDocsLink.innerHTML;
    moduleTitle.append(moduleDocsLink);
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
      moduleContainer.append(moduleInput);
      return moduleContainer;
    } else {
      return null;
    }
  }

  // Function to accurately calculate scroll position because scrollTop is busted...
  function getRelativePos(elm) {
    let pPos = elm.parentNode.getBoundingClientRect(), // parent pos
      cPos = elm.getBoundingClientRect(), // target pos
      pos = {};

    (pos.top = cPos.top - pPos.top + elm.parentNode.scrollTop),
      (pos.right = cPos.right - pPos.right),
      (pos.bottom = cPos.bottom - pPos.bottom),
      (pos.left = cPos.left - pPos.left);

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
    categoryContainer.append(categoryTitle);
    // Traverse modules to add
    let bHasModule = false;
    for (const module of category.modules) {
      let moduleElement = handleModule(module);
      if (moduleElement) {
        bHasModule = true;
        categoryContainer.append(moduleElement);
      }
    }
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
    categoryNavLink.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        let top = getRelativePos(categoryContainer).top;
        getEl("modules-controls").scrollTop = top - 10;
      },
      {
        passive: false,
      }
    );
    categoryNavItem.append(categoryNavLink);
    // If we have a module in this category, show the whole category
    if (bHasModule) {
      return [categoryContainer, categoryNavItem];
    } else {
      return [null, null];
    }
  }

  let scrollSpy = null;

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
    modulesRow.append(customizationsCol);

    // Create column for the sidebar
    let sidebarCol = document.createElement("div");
    sidebarCol.classList.add("col-4", "position-relative");
    sidebarCol.id = "modules-sidebar";
    let sidebarNav = document.createElement("ul");
    sidebarNav.classList.add("nav", "flex-column", "nav-pills", "fixed-inner");
    sidebarNav.id = "modules-nav";
    sidebarCol.append(sidebarNav);
    modulesRow.append(sidebarCol);

    // For each module category, create its element and add it to the columns.
    Object.keys(modules).forEach((module, index) => {
      let [moduleCategoryElement, moduleCategoryNavLink] = handleCategory(
        module,
        modules[module]
      );
      if (moduleCategoryElement) {
        customizationsCol.append(moduleCategoryElement);
      }
      if (moduleCategoryNavLink) {
        sidebarNav.append(moduleCategoryNavLink);
        if (index === 0) {
          moduleCategoryNavLink.firstChild.classList.add("active");
        }
      }
    });

    let resetButton = document.createElement("button");
    resetButton.innerHTML = '<span class="fa fa-undo fa-fw"></span> Reset all modules';
    resetButton.classList.add(
      "position-absolute",
      "bottom-0",
      "btn",
      "btn-secondary"
    );
    resetButton.style.marginBottom = "0.5rem";
    resetButton.addEventListener("click", async (e) => {
      e.preventDefault();
      await resetModules();
      handleModulesRoot(modules);
    });
    sidebarCol.append(resetButton);

    // Add a bit of padding to our overflowed root
    let paddingDiv = document.createElement("div");
    paddingDiv.style.height = "48.75vh";
    customizationsCol.append(paddingDiv);

    // Remove loading
    getEl("modules-root").innerText = "";

    // Add the columns to root container.
    getEl("modules-root").append(modulesRow);

    // Init scrollspy
    if (scrollSpy) {
      scrollSpy.dispose();
    }
    scrollSpy = new bootstrap.ScrollSpy(customizationsCol, {
      target: "#modules-nav",
      offset: 40,
    });

    // Update after travesing all modules
    updateCustomizationDownload();
  }

  function addVersion(ver, dropdown, badge, disabled) {
    let versionListItem = document.createElement("li");
    let dropdownItem = document.createElement("a");
    dropdownItem.classList.add("dropdown-item");
    if (disabled) {
      dropdownItem.classList.add("disabled");
    } else {
      dropdownItem.href = "#";
      dropdownItem.addEventListener("click", (e) => {
        e.preventDefault();
        setUserVersion(ver);
      });
    }
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

  let setLatestVersion = true;

  async function handleVersions(versions) {
    if (!versions) {
      return;
    }

    versions = JSON.parse(JSON.stringify(versions));

    let lastVersion = await tryDBGet("lastVersion");
    let foundVersion = false;

    latestVersion = versions.shift();

    // set latest version
    if (setLatestVersion) {
      setUserVersion("latest");
      setLatestVersion = false;
    }

    releaseUrl.dev =
      "https://github.com/mastercomfig/mastercomfig/compare/{0}...develop".format(
        latestVersion
      );

    let versionDropdown = getEl("versionDropdownMenu");

    versionDropdown.innerHTML = "";

    let latestBadge;
    if (latestVersion === lastVersion) {
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

    if (lastVersion && !foundVersion && lastVersion !== "dev") {
      addDropdownDivider(versionDropdown);
      addVersion(lastVersion, versionDropdown, lastDownloadedBadge, true);
    }

    addDropdownDivider(versionDropdown);

    addVersion("Dev build", versionDropdown, ["alpha", "bg-danger"]);

    getEl("versionDropdown").classList.add("ready");
  }

  const isLocalHost =
    window.location.hostname === "localhost" ||
    // [::1] is the IPv6 localhost address.
    window.location.hostname === "[::1]" ||
    // 127.0.0.1/8 is considered localhost for IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    );

  async function handleApiResponse(data) {
    cachedData = data;
    // Get the version
    await handleVersions(cachedData.v);

    // Now get the modules
    presetModulesDef = cachedData.p;
    handleModulesRoot(cachedData.m);
  }

  function sendApiRequest(url) {
    fetch(url ? url : "https://mastercomfig.mcoms.workers.dev/?v=2")
      .then((resp) => resp.json())
      .then(async (data) => {
        await handleApiResponse(data);
        if (!url) {
          await tryDBSet("cachedData", cachedData);
        }
      })
      .catch(async (err) => {
        let data = await tryDBGet("cachedData");
        if (data) {
          console.log("Get data failed, falling back to cache:", err);
          await handleApiResponse(data);
        } else {
          console.error("Failed to get download data:", err);
        }
      });
  }

  // If we have a stored preset, select it
  if (await tryDBGet("preset")) {
    await setPreset(await tryDBGet("preset"), true);
  } else {
    await setPreset("medium-high", true);
  }

  let currentTimeout = null;

  getEl("launch-options").addEventListener("click", () => {
    let target = getEl("launch-options");
    if (currentTimeout !== null) {
      clearTimeout(currentTimeout);
    }
    navigator.clipboard.writeText(target.firstChild.innerText)
      .then(() => {
        console.log("Success!");
        let status = target.children[2];
        status.innerText = "Copied!";
        target.classList.add("text-success");
        currentTimeout = setTimeout(() => {
          status.innerText = "Click to copy";
          target.classList.remove("text-success");
        }, 1000);
      })
      .catch(() => {
        console.error("Failed to copy text");
        let status = target.children[2];
        status.innerText = "Please copy manually";
        target.classList.add("text-danger");
        currentTimeout = setTimeout(() => {
          status.innerText = "Click to copy";
          target.classList.remove("text-danger");
        }, 5000);
        let selection = getSelection();
        let range = document.createRange();
        range.selectNodeContents(target.firstChild);
        selection.removeAllRanges();
        selection.addRange(range);
      })
  });

  // get latest release, and update page
  sendApiRequest();

  // Register event for all presets defined in the HTML.
  for (const element of document.querySelectorAll("#presets a")) {
    element.addEventListener("click", async (e) => {
      e.preventDefault();
      await setPreset(e.currentTarget.id);
    });
  }

  // Now, register events for all addons defined in the HTML.
  for (const element of document.querySelectorAll(".addon-card")) {
    addons.push(element.id);
    element.addEventListener("click", async (e) => {
      e.preventDefault();
      await updateAddon(e.currentTarget);
    });
  }

  // Bind the download button with our multi-downloader
  bindDownloadClick("vpk-dl", async () => {
    return await getVPKDownloadUrls();
  });

  // Bind the customizations button with our multi-downloader
  bindDownloadClick("custom-dl", async () => {
    return await getCustomDownloadUrls();
  });

  // After binding, we need to update the text
  updateCustomizationDownload();

  // For all defined addons, check if we have it stored
  for (const id of addons) {
    if (await tryDBGet(id)) {
      await setAddon(id, await tryDBGet(id), true);
    }
  }

  let customizeToggler = getEl("customize-toggler");
  customizeToggler.addEventListener("click", (e) => {
    e.currentTarget.classList.toggle("active");
    if (e.currentTarget.classList.contains("active")) {
      customizeToggler.scrollIntoView({ behavior: "smooth" });
    }
  });

  let lastBindInput = null;

  function onKeyPress(button) {
    if (!lastBindInput) {
      return;
    }
    lastBindInput.value = simpleKeyboardKeyToKeyBind(button);
    finishBindInput(lastBindInput, true);
  }

  let commonKeyboardOptions = {
    onKeyPress: (button) => onKeyPress(button),
    theme: "hg-theme-default simple-keyboard custom-kb-theme",
    physicalKeyboardHighlight: true,
    syncInstanceInputs: true,
    mergeDisplay: true,
  };

  var blockKeyboard = false;
  var inittedKeyboard = false;

  async function initKeyboard() {
    if (inittedKeyboard) {
      return;
    }

    await dSimpleKeyboard;

    const Keyboard = window.SimpleKeyboard.default;

    inittedKeyboard = true;

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
          "{shift} z x c v b n m , . / {rshift}",
          "{ctrl} {lwin} {alt} {space} {ralt} {rwin} {rctrl}",
        ],
      },
      display: {
        "{escape}": "esc",
        "{tab}": "tab ⇥",
        "{backspace}": "backspace ⌫",
        "{enter}": "enter ↵",
        "{capslock}": "caps lock ⇪",
        "{shift}": "shift ⇧",
        "{rshift}": "shift ⇧",
        "{ctrl}": "ctrl",
        "{rctrl}": "ctrl",
        "{alt}": "alt",
        "{ralt}": "alt",
        "{lwin}": "⊞",
        "{rwin}": "⊞",
      },
    });

    let keyboardControlPad = new Keyboard(".simple-keyboard-control", {
      ...commonKeyboardOptions,
      layout: {
        default: [
          "{scrolllock} {pause}",
          "{insert} {home} {pageup}",
          "{delete} {end} {pagedown}",
        ],
      },
    });

    let keyboardArrows = new Keyboard(".simple-keyboard-arrows", {
      ...commonKeyboardOptions,
      layout: {
        default: ["{arrowup}", "{arrowleft} {arrowdown} {arrowright}"],
      },
    });

    let keyboardNumPad = new Keyboard(".simple-keyboard-numpad", {
      ...commonKeyboardOptions,
      layout: {
        default: [
          "{numpaddivide} {numpadmultiply}",
          "{numpad7} {numpad8} {numpad9}",
          "{numpad4} {numpad5} {numpad6}",
          "{numpad1} {numpad2} {numpad3}",
          "{numpad0} {numpaddecimal}",
        ],
      },
    });

    let keyboardNumPadEnd = new Keyboard(".simple-keyboard-numpadEnd", {
      ...commonKeyboardOptions,
      layout: {
        default: ["{numpadsubtract}", "{numpadadd}", "{numpadenter}"],
      },
    });
  }

  document.addEventListener("keydown", (e) => {
    if (blockKeyboard && lastBindInput) {
      e.preventDefault();
      lastBindInput.value = keyEventToKeyBind(e);
      finishBindInput(lastBindInput, true);
    }
  });

  let capturedMouseDown = null;

  document.addEventListener("mousedown", (e) => {
    if (blockKeyboard && lastBindInput) {
      e.preventDefault();
      let button = e.button;
      if (button === 1) {
        button = 2;
      } else if (button === 2) {
        button = 1;
      }
      capturedMouseDown = `MOUSE${button + 1}`;
    }
  })

  document.addEventListener("contextmenu", (e) => {
    if (e) {
      e.preventDefault();
    } else {
      console.error("Context menu event is null: ", e);
    }
    return !blockKeyboard;
  });

  document.addEventListener("mouseup", (e) => {
    if (blockKeyboard && lastBindInput && capturedMouseDown) {
      e.preventDefault();
      lastBindInput.value = capturedMouseDown;
      capturedMouseDown = null;
      finishBindInput(lastBindInput, true);
    }
  })

  document.addEventListener("wheel", (e) => {
    if (blockKeyboard && lastBindInput) {
      e.preventDefault();
      lastBindInput.value = e.wheelDelta > 0 ? "MWHEELUP" : "MWHEELDOWN";
      finishBindInput(lastBindInput, true);
      return false;
    }
  }, {
    passive: false
  });

  // Capture keyboard input when bindings are shown
  var tabEls = document.querySelectorAll(
    '#customizations a[data-bs-toggle="tab"]'
  );
  for (const tabEl of tabEls) {
    tabEl.addEventListener("shown.bs.tab", async (e) => {
      if (e.target.id === "bindings") {
        await initKeyboard();
      } else {
        blockKeyboard = false;
      }
    });
  }

  function finishBindInput(element, removeInput) {
    if (!lastBindInput) {
      return;
    }
    blockKeyboard = false;
    history.back();
    element.placeholder = "<Unbound>";
    element.classList.add("disabled");
    if (removeInput) {
      lastBindInput = null;
      // input -> col -> row: if this row is the last in the list.
      if (!element.parentNode.parentNode.nextSibling) {
        // display remove button
        element.parentNode.parentNode.childNodes[2].firstChild.classList.remove("d-none");
        createBindingField();
      }
      element.blur();
    }
  }

  function bindBindingField(bindField) {
    bindField.addEventListener("focus", (e) => {
      blockKeyboard = true;
      lastBindInput = e.currentTarget;
      e.currentTarget.classList.remove("disabled");
      e.currentTarget.value = "";
      history.pushState(null, document.title, location.href);
      e.currentTarget.placeholder = "<Press key or mouse button to bind>";
    });
    bindField.addEventListener("input", (e) => {
      finishBindInput(e.currentTarget, true);
    });
    bindField.addEventListener("blur", (e) => {
      finishBindInput(e.currentTarget);
    });
  }

  let actionMappings = {
    "Move Forward": "+forward",
    "Move Back": "+back",
    "Move Left": "+moveleft",
    "Move Right": "+moveright",
    "Jump": "+jump",
    "Duck": "+duck",
    "Show scoreboard": "+showscores",
    "Drop": "dropitem",
    "Call MEDIC!": "+helpme",
    "Push to Talk": "+voicerecord",
    "Primary attack": "+attack",
    "Secondary attack": "+attack2",
    "Special attack": "+attack3",
    "Reload weapon": "+reload",
    "Previous weapon": "invprev",
    "Next weapon": "invnext",
    "Last weapon used": "lastinv",
    "Weapon slot 1": "slot1",
    "Weapon slot 2": "slot2",
    "Weapon slot 3": "slot3",
    "Weapon slot 4": "slot4",
    "Weapon slot 5": "slot5",
    "Weapon slot 6": "slot6",
    "Weapon slot 7": "slot7",
    "Weapon slot 8": "slot8",
    "Weapon slot 9": "slot9",
    "Weapon slot 10": "slot10",
    "Toggle console": "toggleconsole",
    "Spy: Last Disguise": "lastdisguise",
    "Spy: Toggle Disguise Team": "disguiseteam",
    "Chat message": "say",
    "Team message": "say_team",
    "Party message": "say_party",
    "Voice Menu 1": "voice_menu_1",
    "Voice Menu 2": "voice_menu_2",
    "Voice Menu 3": "voice_menu_3",
    "Change class": "changeclass",
    "Change team": "changeteam",
    "Kill (self)": "kill",
    "Explode (self)": "explode",
    "Open loadout": "open_charinfo_direct",
    "Open Backpack": "open_charinfo_backpack",
    "Open Contracts Drawer": "show_quest_log",
    "Loadout A": "load_itempreset 0",
    "Loadout B": "load_itempreset 1",
    "Loadout C": "load_itempreset 2",
    "Loadout D": "load_itempreset 3",
    "Action Slot": "+use_action_slot_item",
    "Taunts": "+taunt",
    "Weapon Taunt": "cmd taunt",
    "Stop Taunt": "cmd stop_taunt",
    "Open Map information": "showmapinfo",
    "Inspect": "+inspect",
    "Toggle Ready": "player_ready_toggle",
    "Spray": "impulse 201",
    "View/Accept alert": "cl_trigger_first_notification",
    "Remove/Decline alert": "cl_decline_first_notification"
  };

  const actionNames = Object.keys(actionMappings);

  const bindsList = getEl("binds-list")

  function createBindingField(bindOptions) {
    let keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.classList.add("form-control", "form-control-sm", "disabled", "text-light", "bg-dark");
    keyInput.placeholder = "<Unbound>";
    let key = bindOptions?.key;
    if (key) {
      keyInput.value = key;
    }
    bindBindingField(keyInput);
    let inputCol = document.createElement("div");
    inputCol.classList.add("col");
    inputCol.append(keyInput);
    let selectElement = document.createElement("select");
    selectElement.classList.add(
      "form-select",
      "form-select-sm",
      "bg-dark",
      "text-light"
    );
    // Add empty
    let optionElement = document.createElement("option");
    optionElement.value = EMPTY_ACTION_VALUE;
    optionElement.innerText = "Select a Command";
    selectElement.append(optionElement);
    // Add custom bind
    optionElement = document.createElement("option");
    optionElement.value = CUSTOM_ACTION_VALUE;
    optionElement.innerText = "Custom Command";
    selectElement.append(optionElement);
    let action = bindOptions?.action;
    if (action) {
      action = actionMappings[action] ? action : CUSTOM_ACTION_VALUE;
      if (action === CUSTOM_ACTION_VALUE) {
        selectElement.selectedIndex = 1;
      }
    }
    // Create the option element for each available action
    for (const [index, actionName] of actionNames.entries()) {
      optionElement = document.createElement("option");
      optionElement.value = actionName;
      optionElement.innerText = actionName;
      selectElement.append(optionElement);
      if (actionName === action) {
        selectElement.selectedIndex = index + 2;
      }
    }

    // Make custom command input group
    let inputGroup = document.createElement("div");
    inputGroup.classList.add("input-group", "d-none");
    let textInput = document.createElement("input");
    textInput.type = "text";
    textInput.classList.add("form-control", "form-control-sm", "text-light", "bg-dark");
    textInput.placeholder = "Command to run";
    textInput.ariaLabel = "Custom command to run";
    inputGroup.append(textInput);
    let undoButton = document.createElement("button");
    undoButton.classList.add("btn", "btn-sm", "btn-outline-secondary");
    undoButton.type = "button";
    undoButton.innerHTML = "<span class='fa fa-undo fa-fw'></span>";
    undoButton.addEventListener("click", () => {
      selectElement.selectedIndex = 0;
      selectElement.dispatchEvent(new Event("input", { bubbles: true }))
    });
    inputGroup.append(undoButton);

    // Show text input when Custom is selected
    selectElement.addEventListener("input", (e) => {
      let select = e.target;
      let value = select.options[select.selectedIndex].value;
      let isCustom = value === CUSTOM_ACTION_VALUE;
      inputGroup.classList.toggle("d-none", !isCustom);
      selectElement.classList.toggle("d-none", isCustom);
    });

    if (action === CUSTOM_ACTION_VALUE) {
      textInput.value = bindOptions.action;
      inputGroup.classList.remove("d-none");
      selectElement.classList.add("d-none");
    }

    let actionCol = inputCol.cloneNode();
    actionCol.append(selectElement);
    actionCol.append(inputGroup);
    let row = document.createElement("div");
    row.classList.add("row", "binding-field");
    
    let removeBtn = document.createElement("a");
    removeBtn.href = "#";
    removeBtn.onclick = (e) => {
      e.preventDefault();
      row.remove();
    }
    removeBtn.classList.add("fa", "fa-close", "fa-fw");
    if (!bindOptions) {
      removeBtn.classList.add("d-none");
    }
    let removeCol = document.createElement("div");
    removeCol.classList.add("col-1");
    removeCol.append(removeBtn);
    row.append(inputCol, actionCol, removeCol);
    bindsList.append(row);
  }

  tryDBGet("keybinds").then((keybinds) => {
    if (keybinds) {
      for (const [key, action] of Object.entries(keybinds)) {
        createBindingField({ key, action });
      }
    }
    createBindingField();
  });

  const classes = ["scout", "soldier", "pyro", "demoman", "heavy", "engineer", "medic", "sniper", "spy"];

  const crosshairPacks = {
    "Default": {
      card: "sprites/crosshairs",
      crosshairs: {
        "Large Circle": {
          pos: ["64", "64"],
          size: "64",
        },
        Circle: {
          pos: ["32", "32"],
          size: "32",
        },
        Sniper: {
          pos: ["64", "0"],
          size: "32",
        },
        "Medic Cross": {
          pos: ["0", "64"],
          size: "32",
        },
        Brackets: {
          pos: ["0", "0"],
          size: "32",
        },
        None: {
          pos: ["0", "48"],
          size: "24",
        },
      },
    },
  }

  let resourceCache = {};
  let language = "English";
  let languageCache = {};

  async function getGameResourceFile(path) {
    if (resourceCache[path]) {
      return resourceCache[path]
    }
    let response = await fetch(`https://raw.githubusercontent.com/SteamDatabase/GameTracking-TF2/master/${path}`);
    let content = await response.text();
    let vdf = await dVDF;
    content = vdf.parse(content);
    // kind of a hack, but works for now
    if (content.fWeaponData) {
      content.WeaponData = content.fWeaponData;
      delete content.fWeaponData;
    }
    if (path.includes("tf_weapon")) {
      let parents = path.split("/");
      content.WeaponData.classname = parents[parents.length - 1].split(".")[0];
    }
    resourceCache[path] = content;
    return content;
  }

  async function getGameResourceDir(path) {
    let response = await fetch(`https://api.github.com/repos/SteamDatabase/GameTracking-TF2/contents/${path}`);
    let contents = await response.json();
    let result = [];
    for (const file of contents) {
      if (file.type === "file") {
        result.push(file.path)
      } else if (file.type === "symlink") {
        result.push(file.target);
      }
    }
    return result;
  }

  function getLocalization(key) {
    if (Array.isArray(key)) {
      let result = [];
      for (const k of key) {
        result.push(getLocalization(k));
      }
      return result.join(", ");
    }
    if (!key.startsWith("#")) {
      return key;
    }
    return languageCache[language][key.substring(1)];
  }

  const blockedItems = ["tf_weapon_invis", "tf_weapon_objectselection", "tf_weapon_parachute"];

  const itemUsedBy = {
    scout: ["tf_weapon_bat", "tf_weapon_bat_fish", "tf_weapon_bat_giftwrap", "tf_weapon_bat_wood", "tf_weapon_cleaver", "tf_weapon_handgun_scout_primary", "tf_weapon_handgun_scout_secondary", "tf_weapon_jar_milk", "tf_weapon_lunchbox_drink", "tf_weapon_pep_brawler_blaster", "tf_weapon_pistol_scout", "tf_weapon_scattergun", "tf_weapon_soda_popper"],
    soldier: ["tf_weapon_buff_item", "tf_weapon_katana", "tf_weapon_parachute_secondary", "tf_weapon_particle_cannon", "tf_weapon_raygun", "tf_weapon_rocketlauncher", "tf_weapon_rocketlauncher_airstrike", "tf_weapon_rocketlauncher_directhit", "tf_weapon_shotgun_soldier", "tf_weapon_shovel"],
    pyro: ["tf_weapon_breakable_sign", "tf_weapon_fireaxe", "tf_weapon_flamethrower", "tf_weapon_flaregun", "tf_weapon_flaregun_revenge", "tf_weapon_jar_gas", "tf_weapon_rocketlauncher_fireball", "tf_weapon_rocketpack", "tf_weapon_shotgun_pyro", "tf_weapon_slap"],
    demoman: ["tf_weapon_bottle", "tf_weapon_cannon", "tf_weapon_grenadelauncher", "tf_weapon_katana", "tf_weapon_parachute_primary", "tf_weapon_pipebomblauncher", "tf_weapon_stickbomb", "tf_weapon_sword"],
    heavy: ["tf_weapon_fists", "tf_weapon_lunchbox", "tf_weapon_minigun", "tf_weapon_shotgun_hwg"],
    engineer: ["tf_weapon_builder", "tf_weapon_drg_pomson", "tf_weapon_laser_pointer", "tf_weapon_mechanical_arm", "tf_weapon_pda_engineer_build", "tf_weapon_pda_engineer_destroy", "tf_weapon_pistol", "tf_weapon_robot_arm", "tf_weapon_sentry_revenge", "tf_weapon_shotgun_building_rescue", "tf_weapon_shotgun_primary", "tf_weapon_wrench"],
    medic: ["tf_weapon_bonesaw", "tf_weapon_crossbow", "tf_weapon_medigun", "tf_weapon_syringegun_medic"],
    sniper: ["tf_weapon_charged_smg", "tf_weapon_club", "tf_weapon_compound_bow", "tf_weapon_jar", "tf_weapon_smg", "tf_weapon_sniperrifle", "tf_weapon_sniperrifle_classic", "tf_weapon_sniperrifle_decap"],
    spy: ["tf_weapon_knife", "tf_weapon_pda_spy", "tf_weapon_revolver", "tf_weapon_sapper"],
    all: ["tf_weapon_grapplinghook", "tf_weapon_spellbook", "tf_weapon_passtime_gun"]
  }

  const classNameToName = {
    tf_weapon_bat: ["#TF_Weapon_Bat", "#TF_CandyCane", "#TF_BostonBasher", "#TF_Unique_RiftFireMace", "#TF_Gunbai", "#TF_Atomizer"],
    tf_weapon_bat_fish: "#TF_TheHolyMackerel",
    tf_weapon_bat_giftwrap: "#TF_BallBuster",
    tf_weapon_bat_wood: "#TF_Unique_Achievement_Bat",
    tf_weapon_bottle: ["#TF_Weapon_Bottle", "#TF_ScottishHandshake", "#TF_Unique_Makeshiftclub"],
    tf_weapon_bonesaw: ["#TF_Weapon_Bonesaw", "#TF_Unique_Achievement_Bonesaw1", "#TF_Unique_BattleSaw", "#TF_Amputator", "#TF_SolemnVow"],
    tf_weapon_breakable_sign: "#TF_SD_Sign",
    tf_weapon_buff_item: ["#TF_Unique_Achievement_SoldierBuff", "#TF_TheBattalionsBackup", "#TF_SoldierSashimono"],
    tf_weapon_builder: "Toolbox",
    tf_weapon_charged_smg: "#TF_Pro_SMG",
    tf_weapon_cleaver: "#TF_SD_Cleaver",
    tf_weapon_club: ["#TF_Weapon_Club", "#TF_Unique_TribalmanKukri", "#TF_TheBushwacka", "#TF_Shahanshah"],
    //tf_weapon_compound_bow: ["#TF_Unique_Achievement_CompoundBow", "#TF_FortifiedCompound"],
    tf_weapon_compound_bow: "#TF_Unique_Achievement_CompoundBow",
    tf_weapon_crossbow: "#TF_CrusadersCrossbow",
    tf_weapon_drg_pomson: "#TF_Pomson",
    tf_weapon_fireaxe: ["#TF_Weapon_FireAxe", "#TF_Unique_Achievement_FireAxe1", "#TF_Unique_SledgeHammer", "#TF_ThePowerjack", "#TF_BackScratcher", "#TF_Unique_RiftFireAxe", "#TF_Mailbox", "#TF_RFAHammer", "#TF_ThirdDegree", "#TF_Lollichop"],
    //tf_weapon_fists: ["#TF_Weapon_Fists", "#TF_Unique_Achievement_Fists", "#TF_Unique_Gloves_of_Running_Urgently", "#TF_WarriorsSpirit", "#TF_FistsOfSteel", "#TF_EvictionNotice", "#TF_Apocofists", "#TF_MasculineMittens", "#TF_Weapon_BreadBite"],
    //tf_weapon_flamethrower: ["#TF_Weapon_FlameThrower", "#TF_Unique_Achievement_Flamethrower", "#TF_TheDegreaser", "#TF_Phlogistinator", "#TF_Rainblower"],
    tf_weapon_flaregun: ["#TF_Weapon_Flaregun", "#TF_Weapon_Flaregun_Detonator", "#TF_ScorchShot"],
    tf_weapon_flaregun_revenge: "#TF_ManMelter",
    tf_weapon_grenadelauncher: ["#TF_Weapon_GrenadeLauncher", "#TF_LochNLoad", "#TF_Weapon_Iron_bomber"],
    tf_weapon_handgun_scout_primary: "#TF_TheShortstop",
    tf_weapon_handgun_scout_secondary: ["#TF_Winger", "#TF_Weapon_PEP_Pistol"],
    //tf_weapon_invis: ["#TF_Weapon_Watch", "#TF_Unique_Achievement_FeignWatch", "#TF_Unique_Achievement_CloakWatch", "#TF_TTG_Watch", "#TF_HM_Watch"],
    tf_weapon_jar: "#TF_Unique_Achievement_Jar",
    tf_weapon_jar_gas: "#TF_GasPasser",
    tf_weapon_jar_milk: "#TF_MadMilk",
    tf_weapon_katana: "#TF_SoldierKatana",
    //tf_weapon_knife: ["#TF_Weapon_Knife", "#TF_EternalReward", "#TF_Kunai", "#TF_BigEarner", "#TF_VoodooPin", "#TF_SharpDresser", "#TF_SpyCicle", "#TF_BlackRose"],
    tf_weapon_laser_pointer: "#TF_Unique_Achievement_Laser_Pointer",
    tf_weapon_lunchbox: ["#TF_Unique_Achievement_LunchBox", "#TF_Unique_Lunchbox_Chocolate", "#TF_BuffaloSteak", "#TF_SpaceChem_Fishcake", "#TF_Robot_Sandvich", "#TF_Unique_Lunchbox_Banana"],
    tf_weapon_lunchbox_drink: ["#TF_Unique_Achievement_EnergyDrink", "#TF_Unique_EnergyDrink_CritCola"],
    tf_weapon_mechanical_arm: "#TF_DEX_Pistol",
    //tf_weapon_medigun: ["#TF_Weapon_Medigun", "#TF_Unique_Achievement_Medigun1", "#TF_Unique_MediGun_QuickFix", "#TF_Unique_MediGun_Resist"],
    //tf_weapon_minigun: ["#TF_Weapon_Minigun", "#TF_Unique_Achievement_Minigun", "#TF_Iron_Curtain", "#TF_GatlingGun", "#TF_Tomislav", "#TF_SD_Minigun"],
    //tf_weapon_parachute: "#TF_Weapon_BaseJumper",
    tf_weapon_parachute_primary: "#TF_Weapon_BaseJumper",
    tf_weapon_parachute_secondary: "#TF_Weapon_BaseJumper",
    tf_weapon_particle_cannon: "#TF_CowMangler",
    tf_weapon_passtime_gun: "PASS Time JACK",
    tf_weapon_pda_engineer_build: "#TF_Weapon_PDA_Engineer_Builder",
    tf_weapon_pda_engineer_destroy: "#TF_Weapon_PDA_Engineer_Destroyer",
    tf_weapon_pda_spy: "#TF_Weapon_Disguise_Kit",
    tf_weapon_pep_brawler_blaster: "#TF_Weapon_PEP_Scattergun",
    //tf_weapon_pipebomblauncher: ["#TF_Weapon_PipebombLauncher", "#TF_Unique_Achievement_StickyLauncher", "#TF_Weapon_StickyBomb_Jump"],
    tf_weapon_pipebomblauncher: "#TF_Weapon_PipebombLauncher",
    tf_weapon_raygun: "#TF_RighteousBison",
    //tf_weapon_revolver: ["#TF_Weapon_Revolver", "#TF_Unique_Achievement_Revolver", "#TF_TTG_SamRevolver", "#TF_LEtranger", "#TF_Enforcer", "#TF_DEX_Revolver"],
    tf_weapon_revolver: "#TF_Weapon_Revolver",
    tf_weapon_robot_arm: "#TF_Unique_Robot_Arm",
    tf_weapon_rocketlauncher: ["#TF_Weapon_RocketLauncher", "#TF_TheBlackBox", "#TF_Weapon_RocketLauncher_Jump", "#TF_LibertyLauncher", "#TF_TheOriginal", "#TF_DS_DumpsterDevice"],
    tf_weapon_rocketlauncher_airstrike: "#TF_Weapon_AirStrike",
    tf_weapon_rocketlauncher_directhit: "#TF_Unique_Achievement_RocketLauncher",
    tf_weapon_rocketlauncher_fireball: "#TF_Weapon_DragonsFury",
    tf_weapon_rocketpack: "#TF_ThermalThruster",
    //tf_weapon_sapper: ["#TF_Weapon_Spy_Sapper", "#TF_SD_Sapper", "#TF_Weapon_Ap_Sap", "#TF_Weapon_SnackAttack"],
    tf_weapon_sapper: "#TF_Weapon_Spy_Sapper",
    tf_weapon_scattergun: ["#TF_Weapon_Scattergun", "#TF_Unique_Achievement_Scattergun_Double", "#TF_Weapon_BackScatter"],
    tf_weapon_sentry_revenge: "#TF_Unique_Sentry_Shotgun",
    tf_weapon_shotgun_hwg: ["#TF_Weapon_Shotgun", "#TF_RussianRiot", "#TF_Weapon_PanicAttack"],
    tf_weapon_shotgun_primary: ["#TF_Weapon_Shotgun", "#TF_DEX_Shotgun", "#TF_Weapon_PanicAttack"],
    tf_weapon_shotgun_pyro: ["#TF_Weapon_Shotgun", "#TF_ReserveShooter", "#TF_Weapon_PanicAttack"],
    tf_weapon_shotgun_soldier: ["#TF_Weapon_Shotgun", "#TF_ReserveShooter", "#TF_Weapon_PanicAttack"],
    tf_weapon_shovel: ["#TF_Weapon_Shovel", "#TF_Unique_Achievement_Pickaxe", "#TF_MarketGardener", "#TF_DisciplinaryAction", "#TF_Unique_Pickaxe_EscapePlan", "#TF_Unique_Makeshiftclub"],
    tf_weapon_slap: "#TF_Weapon_HotHand",
    tf_weapon_sniperrifle: ["#TF_Weapon_SniperRifle", "#TF_SydneySleeper", "#TF_DEX_Rifle", "#TF_Pro_SniperRifle", "#TF_CSGO_AWP"],
    tf_weapon_sniperrifle_classic: "#TF_ClassicSniperRifle",
    tf_weapon_sniperrifle_decap: "#TF_BazaarBargain",
    tf_weapon_soda_popper: "#TF_SodaPopper",
    tf_weapon_spellbook: "#TF_FancySpellbook",
    tf_weapon_stickbomb: "#TF_UllapoolCaber",
    tf_weapon_sword: ["#TF_Unique_Achievement_Sword", "#TF_Unique_BattleAxe", "#TF_HalloweenBoss_Axe", "#TF_Claidheamohmor", "#TF_PersianPersuader", "#TF_NineIron"],
    tf_weapon_syringegun_medic: ["#TF_Weapon_SyringeGun", "#TF_Unique_Achievement_Syringegun1", "#TF_Overdose"],
    //tf_weapon_wrench: ["#TF_Weapon_Wrench", "#TF_Unique_Combat_Wrench", "#TF_Unique_Golden_Wrench", "#TF_Jag", "#TF_Wrenchmotron"],
    tf_weapon_wrench: "#TF_Weapon_Wrench",
  }

  function getItemName(weapon) {
    let key = weapon.printname;
    if (classNameToName[weapon.classname]) {
      key = classNameToName[weapon.classname];
    }
    return getLocalization(key);
  }

  const customItemSlot = {
    tf_weapon_buff_item: "Secondary",
    tf_weapon_compound_bow: "Primary",
    tf_weapon_grapplinghook: "Action Item",
    tf_weapon_jar_gas: "Secondary",
    tf_weapon_parachute_primary: "Primary",
    tf_weapon_parachute_secondary: "Secondary",
    tf_weapon_passtime_gun: "Utility",
    tf_weapon_rocketpack: "Secondary",
    tf_weapon_pda_spy: "PDA",
    tf_weapon_spellbook: "Action Item",
    tf_weapon_builder: "Building"
  };

  const normalizedSlots = {
    primary: "Primary",
    secondary: "Secondary",
    melee: "Melee",
    item1: "Secondary",
    item2: "Melee",
    pda: "PDA",
    building: "Building",
  }

  const slotToIndex = [
    "Primary",
    "Secondary",
    "Melee",
    "PDA",
    "Building",
    "Action Item",
    "Utility",
  ]

  function getNormalizedSlotName(weapon) {
    if (customItemSlot[weapon.classname]) {
      return customItemSlot[weapon.classname];
    }
    let slot = weapon.WeaponType;
    if (normalizedSlots[slot]) {
      return normalizedSlots[slot];
    }
    return slot;
  }

  async function getGameResource(path, file, regex) {
    if (regex) {
      let folder = await getGameResourceDir(path);
      let re = new RegExp(file);
      let files = folder.filter((f) => re.test(f));
      console.log(files);
      let res = [];
      for (const file of files) {
        res.push(await getGameResourceFile(file));
      }
      return res;
    } else {
      return getGameResourceFile(path + file);
    }
  }

  let items = {};

  async function initGameData() {
    const tfWeapons = await getGameResource("tf/tf2_misc_dir/scripts/", "tf_weapon_.*\.txt", true);
    const langRes = await getGameResource("tf/resource/", `tf_${language.toLowerCase()}.txt`);
    languageCache[langRes.lang.Language] = langRes.lang.Tokens;
    for (const weapon of tfWeapons) {
      const data = weapon.WeaponData;
      if (!blockedItems.includes(data.classname)){
        items[data.classname] = data;
      }
    }
    let weaponsRoot = getEl("weapons-root");
    weaponsRoot.innerText = "";
    for (const playerclass of Object.keys(itemUsedBy)) {
      let classEl = document.createElement("h4");
      classEl.innerText = playerclass[0].toUpperCase() + playerclass.substring(1);
      weaponsRoot.appendChild(classEl);
      const weaponClasses = itemUsedBy[playerclass];
      let slots = {};
      for (const weaponClass of weaponClasses) {
        const weapon = items[weaponClass];
        if (!weapon) {
          continue;
        }
        let slot = getNormalizedSlotName(weapon);
        if (slots[slot]) {
          slots[slot].push(weapon);
        } else {
          slots[slot] = [weapon];
        }
      }
      for (const slot of slotToIndex) {
        if (!slots[slot]) {
          continue;
        }
        let slotEl = document.createElement("h5");
        slotEl.innerText = slot;
        weaponsRoot.appendChild(slotEl);
        for (const weapon of slots[slot]) {
          let weaponName = getItemName(weapon);
          let weaponEl = document.createElement("p");
          weaponEl.innerHTML = weaponName;
          weaponEl.addEventListener("click", (e) => {
          });
          weaponsRoot.appendChild(weaponEl);
        }
      }
    }
  }

  if (isLocalHost) {
    for (const child of getEl("customizations").children) {
      child.classList.remove("d-none");
    }
    let vdf = await dVDF;
    if (vdf) {
      try {
        initGameData();
      } catch(e) {
        console.log(e);
      }
    }
    
  }

  let deferredPrompt;

  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI to notify the user they can add to home screen
    let addBtn = getEl("install-link");
    addBtn.classList.remove("d-none");

    addBtn.addEventListener("click", (e) => {
      // hide our user interface that shows our A2HS button
      addBtn.classList.add("d-none");
      // Show the prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the A2HS prompt");
        } else {
          console.log("User dismissed the A2HS prompt");
        }
        deferredPrompt = null;
      });
    });
  });

  var ghProvider;
  var ghToken;
  var ghUser;

  async function loginWithGitHub() {
    await dfirebase;
    await dfirebaseAuth;
    if (!ghProvider) {
      ghProvider = new firebase.auth.GithubAuthProvider();
    }
    return firebase
      .auth()
      .signInWithPopup(ghProvider)
      .then((result) => {
        let credential = result.credential;
        ghToken = credential.accessToken;
        ghUser = result.user;
      })
      .catch((err) => {
        // Handle Errors here.
        let errorCode = err.code;
        let errorMessage = err.message;
        console.error("Login failed: ", errorCode, errorMessage);
      });
  }

  var firebaseMessaging;

  function messaging() {
    if (!firebaseMessaging) {
      firebaseMessaging = firebase.messaging();
    }
    return firebaseMessaging;
  }

  async function getToken(serviceWorkerRegistration) {
    await dfirebase;
    await dfirebaseMessaging;
    try {
      messaging().onMessage((payload) => {
        console.log("Message received. ", payload);
      });
      return messaging()
        .getToken({
          vapidKey:
            "BPfZekvCE2KeCCGFTvCtu2J1kW8cXiYS3LxrNK4pAewiw4sYWip92u9LPl4Mlo4dBXogHKEvURve3DUlA_eh1U4",
          serviceWorkerRegistration,
        })
        .then((token) => {
          console.log(token);
        });
    } catch (err) {
      console.error(err);
    }
  }

  function handleNotifications(registration) {
    // Doesn't support
    if (!("Notification" in window)) {
      return;
    }
    // Already subscribed
    if (Notification.permission === "granted") {
      getToken(registration);
      return;
    }
    // Already denied
    if (Notification.permission === "denied") {
      return;
    }
    getEl("subscribe-link").addEventListener("click", () => {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          getToken(registration);
        }
        if (permission !== "default") {
          getEl("subscribe-link").classList.add("d-none");
        }
      });
    });
    //getEl("subscribe-link").classList.remove("d-none");
  }

  window.addEventListener("load", () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("service-worker.js")
        .then((registration) => {
          handleNotifications(registration);
        })
        .catch((err) => {
          console.error("Service worker registration failed:", err);
        });
    }
  });

  window.addEventListener("online", handleConnectivityChange);
  window.addEventListener("offline", handleConnectivityChange);
  if (!navigator.onLine) {
    handleConnectivityChange();
  }

  if (window.showDirectoryPicker) {
    getEl("game-folder-wrapper").classList.remove("d-none");
    let directInstallCheckbox = getEl("direct-install");
    directInstallCheckbox.checked = await tryDBGet("enable-direct-install");
    await updateDirectInstall();
    directInstallCheckbox.addEventListener("input", async (e) => {
      await tryDBSet("enable-direct-install", e.currentTarget.checked);
      await updateDirectInstall();
    });
  }
}
(function() {
  app();
})()
