import { get, set, del } from "idb-keyval";
//import { registerSW } from "virtual:pwa-register";
import { Tab, ScrollSpy } from "bootstrap";
import * as Sentry from "@sentry/browser";
import { stringify } from "vdf-parser";
import { BlobReader, BlobWriter, ZipWriter } from "@zip.js/zip.js";
import mediumHighImg from "@img/presets/medium-high.webp";
import lowImg from "@img/presets/low.webp";
import mediumLowImg from "@img/presets/medium-low.webp";
import mediumImg from "@img/presets/medium.webp";
import ultraImg from "@img/presets/ultra.webp";
import veryLowImg from "@img/presets/very-low.webp";
import highImg from "@img/presets/high.webp";
import noneImg from "@img/presets/none.webp";

let idbKeyval = {
  get,
  set,
  del,
};

async function app() {
  let downloadStatusEl = document.getElementById("download-status");
  if (downloadStatusEl) {
    downloadStatusEl.innerHTML = "";
    downloadStatusEl.classList.remove("download-status-fill");
  }

  let dfirebase = import("firebase/compat/app")
    .then(async (firebase) => {
      await import("firebase/compat/auth");
      await import("firebase/compat/firestore");
      return firebase.default;
    })
    .then((firebase) => {
      const firebaseConfig = {
        apiKey: "AIzaSyBKDPeOgq97k5whdxL_Z94ak9jSfdjXU4E",
        authDomain: "mastercomfig-app.firebaseapp.com",
        projectId: "mastercomfig-app",
        storageBucket: "mastercomfig-app.appspot.com",
        messagingSenderId: "1055009628964",
        appId: "1:1055009628964:web:6ad7954859d843050d49b1",
        measurementId: "G-S0F8JT6ZQE",
      };
      // Initialize Firebase
      firebase.initializeApp(firebaseConfig);
      return firebase;
    });
  let dkeyboard = import("simple-keyboard/build/index.modern.js").then(
    (Keyboard) => Keyboard.default,
  );

  const logLevelToSentrySeverity = {
    warn: "warning",
  };

  function consoleHook(level) {
    const original = console[level].bind(console);
    return function () {
      Sentry.addBreadcrumb(
        {
          category: "console",
          level: logLevelToSentrySeverity[level]
            ? logLevelToSentrySeverity[level]
            : level,
          message: !arguments
            ? "undefined"
            : arguments.length === 1
            ? `${arguments[0]}`
            : `${arguments[0]}: ${Array.prototype.slice
                .call(arguments, 1)
                .join()}`,
        },
        {
          input: [...arguments],
          level,
        },
      );
      original.apply(console, arguments);
    };
  }

  for (const level of ["debug", "info", "warn", "error", "log"]) {
    console[level] = consoleHook(level);
  }

  // convenience format method for string
  String.prototype.format = function () {
    const args = arguments;
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] !== "undefined" ? args[number] : match;
    });
  };

  function isValid(value) {
    return value !== undefined || value !== null;
  }

  // find RegEx
  Array.prototype.query = function (match) {
    let reg = new RegExp(match);

    return this.filter(function (item) {
      return typeof item == "string" && item.match(reg);
    });
  };

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
      return memDB[key];
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
    const bHasModules = Object.keys(selectedModules).length > 0;
    if (bHasModules) {
      await tryDBSet("hasModules", true);
    }
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
  let presets = {
    none: {
      name: "None",
      description:
        "<h4>Special preset which skips setting quality options.</h4>",
    },
    ultra: {
      name: "Ultra",
      description:
        "<h4>Absolute maximum quality, with even the slightest and most performance-intensive quality improvements included.</h4>",
    },
    high: {
      name: "High",
      description:
        "<h4>Enables all graphical features without making them extremely high quality.</h4>",
    },
    "medium-high": {
      name: "Medium High",
      description:
        "<h4>Disables unoptimized features and optimizes the game without making the game look bad.</h4>",
    },
    medium: {
      name: "Medium",
      description:
        "<h4>The maximum performance you can get while enabling a few effects that may give you a slight edge.</h4>",
    },
    "medium-low": {
      name: "Medium Low",
      description:
        "<h4>The maximum performance you can get without making the game too hard to play because of awful visual quality and glitches.</h4>",
    },
    low: {
      name: "Low",
      description:
        "<h4>Maximum performance without caring much about visibility or possible visual glitches.</h4>",
    },
    "very-low": {
      name: "Very Low",
      description:
        "<h4>Negatively affects playability by <strong>a lot</strong> and disables very essential features like HUD elements in desperation for performance.</h4>Not recommended unless the game has such low performance that it is more of a hinderance than not having HUD elements and good player visibility.<br/><strong>BY DOWNLOADING THIS PRESET YOU UNDERSTAND THAT IT <em>REMOVES HUD ELEMENTS AND REDUCES VISIBILITY</em>. IF YOU DON'T WANT THIS <em>USE LOW</em>, THAT'S THE <em>ONLY</em> DIFFERENCE.</strong><br/>",
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
  let recommendedAddons = new Map();

  function setRecommendedAddons(id, values) {
    // don't set non-recommendable addons
    let addons = values.filter(
      (addon) => recommendableAddons.indexOf(addon) !== -1,
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
  let releasesUrl = "https://github.com/mastercomfig/mastercomfig/releases";
  // Release homepage
  let releaseUrl = {
    latest: releasesUrl + "/latest",
    default: releasesUrl + "/{0}",
  };
  let assetsUrl = {
    latest: releasesUrl + "/latest",
    default: releaseUrl.default,
  };
  // Where latest downloads come from
  let downloadUrl = releaseUrl.default + "/download/";
  // Where a specific release's downloads come from
  let releaseDownloadUrl = releasesUrl + "/download/{0}/";
  // Prefix for mastercomfig files
  let mastercomfigFileUrl = "mastercomfig-";
  // Addon extension format string to download
  let addonFileUrl = mastercomfigFileUrl + "{1}-addon.vpk";
  let addonUrl = {
    latest: downloadUrl + addonFileUrl,
    default: releaseDownloadUrl + addonFileUrl,
  };
  // Preset extension format string to download
  let presetFileUrl = mastercomfigFileUrl + "{1}-preset.vpk";
  let presetUrl = {
    latest: downloadUrl + presetFileUrl,
    default: releaseDownloadUrl + presetFileUrl,
  };

  // Current mastercomfig version, comes in from API
  let version = null;
  let latestVersion = null;

  let userVersion = "latest";

  // Current presets modules def
  let presetModulesDef = {};
  // Available module levels
  let availableModuleLevels = {};

  // Defined addons (found through parsing HTML)
  let addons = [];

  // Currently selected preset
  let selectedPreset = null;
  // Currently selected addons
  let selectedAddons = [];
  // Current state of module selections
  let selectedModules = {};
  // Current state of autoexec binds
  let selectedBinds = {};
  // Overlaid bind layers
  let bindLayers = {
    gameoverrides: {},
  };
  // Current state of overrides
  let selectedOverrides = {};
  // Config contents
  let configContentsRaw = {};
  let contentsDefaulter = {
    get: (target, name) => {
      return target.hasOwnProperty(name) ? target[name] : "";
    },
  };
  let configContents = new Proxy(configContentsRaw, contentsDefaulter);

  // Data cache
  let cachedData = null;

  // Overrides for default game action binds
  let customActionMappings = {};

  // Addons which override action mappings
  const addonActionMappings = {
    "null-canceling-movement": {
      "Move Forward": "+mf",
      "Move Back": "+mb",
      "Move Left": "+ml",
      "Move Right": "+mr",
    },
  };

  const bindConfigLayers = {
    gameoverrides: "game_overrides.cfg",
    scout: "scout.cfg",
    soldier: "soldier.cfg",
    pyro: "pyro.cfg",
    demoman: "demoman.cfg",
    heavy: "heavyweapons.cfg",
    engineer: "engineer.cfg",
    medic: "medic.cfg",
    sniper: "sniper.cfg",
    spy: "spy.cfg",
  };

  let storedModules = {};
  await loadModules();

  // Track if multi-download is active
  let downloading = false;

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
    let directInstall = await tryDBGet("enable-direct-install");
    element.innerHTML = element.innerHTML
      .replace("Install", directInstall ? "Installing" : "Downloading")
      .replace("Download", directInstall ? "Installing" : "Downloading")
      .replace(" ", "…");
    // Do the download once clicked
    let urls = await fnGatherUrls();
    // Only download if we have a download
    if (urls.length > 0) {
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

  function requireVersion(major, minor, patch, latest, dev) {
    if (import.meta.env.DEV && cachedData) {
      let debugVersion = "" + major;
      if (minor !== undefined) {
        debugVersion += "." + minor;
      }
      if (patch !== undefined) {
        debugVersion += "." + patch;
      }
      let isSupported = false;
      for (const version of cachedData.v) {
        if (version.startsWith(debugVersion)) {
          isSupported = true;
        }
      }
      if (!isSupported) {
        // Check if even the latest version doesn't support the requirement
        // If so, it's an upcoming version, currently unknown, so we shouldn't throw
        let backupVersion = userVersion;
        userVersion = cachedData.v[0];
        let backupData = cachedData;
        cachedData = null;
        let fatal = requireVersion(major, minor, patch);
        userVersion = backupVersion;
        cachedData = backupData;
        if (fatal) {
          throw new Error("Requiring unsupported version: " + debugVersion);
        } else {
          console.log("Requiring unknown version: " + debugVersion);
        }
      }
    }
    if (userVersion === "dev") {
      return dev === undefined ? true : dev;
    }
    if (userVersion === "latest") {
      return latest === undefined ? true : latest;
    }
    let versions = [major, minor, patch];
    let versionSplit = userVersion.split(".");
    for (let i = 0; i < versions.length; i++) {
      let requiredVersion = versions[i];
      if (!isValid(requiredVersion)) {
        continue;
      }
      let currentVersion = parseInt(versionSplit[i], 10);
      if (currentVersion < requiredVersion) {
        return false;
      }
      if (currentVersion > requiredVersion) {
        return true;
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
      .replace("Installing", gameDirectory ? "Install" : "Download")
      .replace("Downloading", gameDirectory ? "Install" : "Download")
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
    url = url.replace(
      "https://github.com/mastercomfig/mastercomfig/releases",
      "https://api.comfig.app/download",
    );
    return url;
  }

  function getAddonUrl(id, notDirect) {
    return getDownloadUrl(id, false, notDirect);
  }

  function getPresetUrl(notDirect) {
    return getDownloadUrl(selectedPreset, true, notDirect);
  }
  // End download URL helpers

  let pendingObjectURLs = [];

  async function downloadUrls(urls, id, fnGatherUrls) {
    updateDownloadProgress(20, "Downloading files...");
    let downloadFailures = [];
    if (customDirectory) {
      try {
        await Promise.all(
          urls.map((url) => url.blob.catch(() => downloadFailures.push(url))),
        );
        if (downloadFailures.length) {
          throw new Error(
            `Download failures detected: ${downloadFailures
              .map((url) => url.name)
              .join(",")}`,
          );
        } else {
          updateDownloadProgress(100, "Done!");
        }
      } catch (err) {
        console.error(err);
        updateDownloadProgress(
          0,
          (downloadFailures.length > 3
            ? `Failed to download ${downloadFailures.length} files`
            : `Failed to download ${downloadFailures
                .map((url) => url.name)
                .join(", ")}`) + ". Please try again later.",
        );
      }
    } else {
      try {
        let zipWriter = new ZipWriter(new BlobWriter("application/zip"), {
          bufferedWrite: true,
        });
        let wroteFile = false;
        await Promise.all(
          urls.map((url) =>
            Promise.resolve(url.blob)
              .then((blob) => {
                zipWriter.add(url.path, new BlobReader(blob));
                wroteFile = true;
              })
              .catch(() => downloadFailures.push(url)),
          ),
        );
        if (wroteFile) {
          const blobURL = URL.createObjectURL(await zipWriter.close());
          zipWriter = null;
          let link = document.createElement("a");
          link.href = blobURL;
          link.download = "mastercomfig.zip";
          document.body.append(link);
          link.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          link.remove();
          pendingObjectURLs.push(blobURL);
        }
        if (downloadFailures.length) {
          throw new Error(
            `Download failures detected: ${downloadFailures
              .map((url) => url.name)
              .join(",")}`,
          );
        } else {
          updateDownloadProgress(100, "Done!");
        }
      } catch (err) {
        console.error(err);
        updateDownloadProgress(
          0,
          (downloadFailures.length > 3
            ? `Failed to download ${downloadFailures.length} files`
            : `Failed to download ${downloadFailures
                .map((url) => url.name)
                .join(", ")}`) + ". Please try again later.",
        );
      }
    }
    // We're done
    bindDownloadClick(id, fnGatherUrls);
    // Once it's long past our time to download, remove the object URLs
    setTimeout(() => {
      for (const objectURL of pendingObjectURLs) {
        URL.revokeObjectURL(objectURL);
      }
      pendingObjectURLs = [];
    }, 120000);
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
  let overridesDirectory = null;
  let appDirectory = null;
  let comfigCustomDirectory = null;
  let scriptsDirectory = null;
  let materialsDirectory = null;

  let bindDirectInstall = true;

  async function updateDirectInstall() {
    const directInstall = await tryDBGet("enable-direct-install");
    if (!directInstall) {
      getEl("game-folder-container").classList.add("d-none");
      await restoreDirectoryInstructions();
      gameDirectory = null;
      customDirectory = null;
      overridesDirectory = null;
      appDirectory = null;
      comfigCustomDirectory = null;
      scriptsDirectory = null;
      materialsDirectory = null;
      updatePresetDownloadButton();
      return;
    }
    getEl("game-folder-container").classList.remove("d-none");
    if (
      !(await tryDBGet("hide-game-folder-warning")) &&
      getEl("game-folder-warning")
    ) {
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
    updatePresetDownloadButton();
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
    if (
      (await tryDBGet("hide-game-folder-warning")) &&
      getEl("game-folder-warning")
    ) {
      getEl("game-folder-warning").classList.add("d-none");
    }
  }

  let bannedDirectories = new Set([
    "tf",
    "custom",
    "cfg",
    "user",
    "overrides",
    "app",
  ]);
  let silentBannedDirectories = new Set([""]);

  function checkDirectory(directoryHandle) {
    const name = directoryHandle.name;
    let fail = bannedDirectories.has(name);
    if (fail) {
      alert(
        `${name} is not a valid folder. To install to your game, please select the top-level "Team Fortress 2" folder.`,
      );
    } else {
      fail = silentBannedDirectories.has(name);
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
      if (err.toString().includes("aborted")) {
        return;
      }
      console.error("Directory prompt failed:", err);
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
    overridesDirectory = null;
    appDirectory = null;
    getEl("game-folder-text").innerText =
      "No folder chosen, Direct Install not enabled";
    restoreDirectoryInstructions();
    updatePresetDownloadButton();
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
      updatePresetDownloadButton();
      getEl(
        "game-folder-text",
      ).innerText = `${gameDirectory.name} folder chosen, click to change`;
    } catch (err) {
      console.error("Get directory failed:", err);
    }
  }

  async function accessDirectory() {
    if (!window.showDirectoryPicker) {
      return true;
    }
    if (!gameDirectory) {
      return true;
    }
    try {
      if (!(await verifyPermission(gameDirectory, true))) {
        console.log("Directory permission refused");
        return false;
      }
      const tfDirectory = await gameDirectory.getDirectoryHandle("tf", {
        create: true,
      });
      customDirectory = await tfDirectory.getDirectoryHandle("custom", {
        create: true,
      });
      comfigCustomDirectory = await customDirectory.getDirectoryHandle(
        "comfig-custom",
        {
          create: true,
        },
      );
      scriptsDirectory = await comfigCustomDirectory.getDirectoryHandle(
        "scripts",
        {
          create: true,
        },
      );
      const materialsRootDirectory =
        await comfigCustomDirectory.getDirectoryHandle("materials", {
          create: true,
        });
      const vguiDirectory = await materialsRootDirectory.getDirectoryHandle(
        "vgui",
        {
          create: true,
        },
      );
      const replayDirectory = await vguiDirectory.getDirectoryHandle("replay", {
        create: true,
      });
      materialsDirectory = await replayDirectory.getDirectoryHandle(
        "thumbnails",
        {
          create: true,
        },
      );
      const cfgDirectory = await tfDirectory.getDirectoryHandle("cfg", {
        create: true,
      });
      overridesDirectory = await cfgDirectory.getDirectoryHandle("overrides", {
        create: true,
      });
      appDirectory = await cfgDirectory.getDirectoryHandle("app", {
        create: true,
      });
      return true;
    } catch (err) {
      console.error("Get directory failed:", err);
      clearDirectory();
      return true;
    }
  }

  let filesInUse = false;

  let unlinkErrHandler = {
    "could not be found": () => {},
    "state had changed since it was read from disk": () => {
      filesInUse = true;
    },
  };

  async function safeUnlink(name, directory) {
    try {
      await directory.removeEntry(name);
    } catch (err) {
      let errString = err.toString();
      for (const key in unlinkErrHandler) {
        if (errString.includes(key)) {
          unlinkErrHandler[key]();
          return;
        }
      }
      console.error(`Failed deleting ${name}`, err);
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

  function newFile(contents, name, directory) {
    if (contents.length < 1) {
      return null;
    }
    if (directory) {
      return getWritable(name, directory).then((writable) =>
        writable.write(contents).then(() => writable.close()),
      );
    } else {
      const file = new File([contents], name, {
        type: "application/octet-stream",
      });
      return file;
    }
  }

  function wait(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  function checkFetch(response) {
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response;
  }

  function fetchRetry(url, delay, tries, fetchOptions = {}) {
    function onError(err) {
      let triesLeft = tries - 1;
      if (!triesLeft) {
        throw err;
      }
      return wait(delay).then(() =>
        fetchRetry(url, delay * 2, triesLeft, fetchOptions),
      );
    }
    return fetch(url, fetchOptions).then(checkFetch).catch(onError);
  }

  async function writeRemoteFile(url, directory) {
    try {
      let response = fetchRetry(url, 125, 6);
      let name = url.split("/").pop();
      if (directory) {
        const writable = await getWritable(name, directory, true);
        return { name, blob: response.then((r) => r.body.pipeTo(writable)) };
      }
      return { name, blob: response.then((r) => r.blob()) };
    } catch (err) {
      console.error(`Failed fetching ${url}`, err);
      return false;
    }
  }

  function updateDownloadProgress(progress, status) {
    getEl("download-progress-status").innerText = status;
    let progressBar = getEl("download-progress-bar");
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute("aria-valuenow", progress);
  }

  async function getVPKDownloadUrls() {
    // We need permissions for the directory
    if (!(await accessDirectory())) {
      return [];
    }
    let downloads = [];
    getEl("download-progress-bar").classList.remove("d-none");
    updateDownloadProgress(0, "Generating files...");
    let presetUrl = getPresetUrl();
    if (customDirectory) {
      console.log("Using Direct Install.");
      filesInUse = false;
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
      if (filesInUse) {
        alert(
          "Files are in use. Please close TF2 before updating mastercomfig.",
        );
        return downloads;
      }
    } else {
      console.log("Using ZIP download.");
    }
    // Write preset file
    let presetResult = await writeRemoteFile(presetUrl, customDirectory);
    if (presetResult) {
      presetResult.path = `tf/custom/${presetResult.name}`;
      // Then push our preset download
      downloads.push(presetResult);
    } else {
      alert("Failed to download preset file. Please try again later.");
    }
    // Then push all our addon downloads
    for (const selection of selectedAddons) {
      let addonUrl = getAddonUrl(selection);
      let addonResult = await writeRemoteFile(addonUrl, customDirectory);
      if (addonResult) {
        addonResult.path = `tf/custom/${addonResult.name}`;
        downloads.push(addonResult);
      } else {
        alert(
          `Failed to download ${selection} addon file. Please try again later.`,
        );
      }
    }
    // Also handle customizations
    let customURLs = await getCustomDownloadUrls();
    if (!customDirectory) {
      downloads = downloads.concat(customURLs);
    }
    // We downloaded this version, so track it!
    await tryDBSet("lastVersion", version);
    if (cachedData) {
      await handleVersions(cachedData.v);
    }
    // Now queue up all our download promises to download!
    return downloads;
  }

  function newModulesFile() {
    let contents = "";
    for (const moduleName of Object.keys(selectedModules)) {
      let moduleValue = selectedModules[moduleName];
      if (moduleValue) {
        contents += `${moduleName}=${moduleValue}\n`;
      } else {
        contents += `alias ${moduleName}\n`;
      }
    }
    // Get any additional contents
    if (configContentsRaw["modules.cfg"]) {
      contents += configContentsRaw["modules.cfg"];
      delete configContentsRaw["modules.cfg"];
    }
    if (contents.length > 0) {
      return newFile(contents, "modules.cfg", overridesDirectory);
    }
    return null;
  }

  const EMPTY_ACTION_VALUE = "empty";
  const CUSTOM_ACTION_VALUE = "custom";
  const UNBIND_ACTION_VALUE = "unbind";

  async function updateBinds() {
    const bindFields = document.querySelectorAll(".binding-field");

    // Populate our action overrides with the custom action mappings that modifiers have registered.
    let actionOverrides = {};
    for (const namespace of Object.keys(customActionMappings)) {
      for (const action of Object.keys(customActionMappings[namespace])) {
        actionOverrides[action] = customActionMappings[namespace][action];
      }
    }

    // Keep track of command binds & user saved binds
    let actionBinds = {};
    let actionLayerBinds = {};
    selectedBinds = {};
    bindLayers = { gameoverrides: {} };
    // Go through our user created bind fields UI
    for (const bindField of bindFields) {
      // The key name
      let keyInput = bindField.childNodes[0].firstChild.value;
      // The action input
      let actionSelect = bindField.childNodes[1].firstChild.value;
      // The layer input
      let layerName = bindField.dataset.layer;
      if (layerName === "gameoverrides") {
        layerName = "";
      }
      // If the key and action are not empty
      if (keyInput && actionSelect) {
        // Empty action, skip it
        if (actionSelect === EMPTY_ACTION_VALUE) {
          continue;
        }
        let bindCommand = "";
        // Either binding it to a layer, or the main default layer. These are action binds, used for serialization.
        let actionBindObject;
        // If the layer exists, then we're binding to a layer
        if (layerName) {
          // Get the layer. If the layer doesn't exist, create it
          actionBindObject = actionLayerBinds[layerName];
          if (!actionBindObject) {
            // Make a layer object, which maps keys to actions.
            actionLayerBinds[layerName] = {};
            // Assign our action bind object (key -> action)
            actionBindObject = actionLayerBinds[layerName];
          }
        } else {
          // Assign our action bind object (key -> action)
          actionBindObject = actionBinds;
        }
        // If this is a custom command, we can just grab the command input
        if (actionSelect === CUSTOM_ACTION_VALUE) {
          bindCommand = bindField.childNodes[1].lastChild.firstChild.value;
          // Empty command, skip
          if (!bindCommand) {
            continue;
          }
          // Just put the bind command in the action bind directly
          if (actionBindObject[keyInput]) {
            actionBindObject[keyInput].push(bindCommand);
          } else {
            actionBindObject[keyInput] = [bindCommand];
          }
          // Ok now, replace all the quotes from the user with blank
          // TODO: we need to create an exec bind for quoted args with a semicolon for multiple commands
          bindCommand = bindCommand.replaceAll('"', "");
        } else {
          if (actionBindObject[keyInput]) {
            actionBindObject[keyInput].push(actionSelect);
          } else {
            actionBindObject[keyInput] = [actionSelect];
          }
          // Ok now, resolve the action ID to a bind command, checking for overrides if they exist
          bindCommand = actionOverrides[actionSelect]
            ? actionOverrides[actionSelect]
            : actionMappings[actionSelect];
        }
        // Now we create the actual key -> bind command mapping.
        let bindObject;
        // Check if the layer is here, we've been over this already!
        if (layerName) {
          bindObject = bindLayers[layerName];
          if (!bindObject) {
            bindLayers[layerName] = {};
            bindObject = bindLayers[layerName];
          }
        } else {
          bindObject = selectedBinds;
        }
        // Now, we are building a string here.
        if (bindObject[keyInput]) {
          bindObject[keyInput] += `;${bindCommand}`;
        } else {
          bindObject[keyInput] = bindCommand;
        }
      }
    }
    let hasCustomLayers = false;
    let pendingOverrideLayer = {};
    for (const bindLayer of Object.keys(bindLayers)) {
      // We don't need to handle resets for game overrides
      if (bindLayer === "gameoverrides") {
        continue;
      }
      // Check if a default file exists for this layer
      if (!hasCustomLayers && !bindConfigLayers[bindLayer]) {
        hasCustomLayers = true;
      }
      for (const key of Object.keys(bindLayers[bindLayer])) {
        if (pendingOverrideLayer[key]) {
          continue;
        }
        let defaultBind = selectedBinds[key];
        if (defaultBind) {
          // If we have a bind for this key, we need to override it
          pendingOverrideLayer[key] = defaultBind;
        } else {
          // If we don't have a bind, we need to bind on override
          pendingOverrideLayer[key] = UNBIND_ACTION_VALUE;
        }
      }
    }
    // Our pending overrides are just placeholders to make sure layers don't propagate. If we have user set ones, use those.
    let overrides = { ...pendingOverrideLayer, ...bindLayers["gameoverrides"] };
    // If we have custom layers, put them in a new binds config so we don't re-run game overrides when we reset
    if (hasCustomLayers) {
      let contents = getBindsFromBindsObject(overrides);
      if (contents.length > 0) {
        configContents["reset_game_overrides.cfg"] = contents;
      }
    } else {
      bindLayers["gameoverrides"] = overrides;
    }
    let customOverrideFiles = [];
    let customLayers = [];
    // Populate other files with binds
    for (const bindLayer of Object.keys(bindLayers)) {
      let fileName = bindConfigLayers[bindLayer];
      let contents = getBindsFromBindsObject(bindLayers[bindLayer]);
      if (contents.length < 1) {
        continue;
      }
      if (!fileName) {
        fileName = `layer_${bindLayer}.cfg`;
        // On key down, apply layer
        configContents[
          "autoexec.cfg"
        ] += `alias +layer_${bindLayer}"exec app/${fileName}"\n`;
        // On key up, reset binds
        configContents[
          "autoexec.cfg"
        ] += `alias -layer_${bindLayer}"exec app/reset_game_overrides.cfg\n`;
        customLayers.push(bindLayer);
      } else {
        customOverrideFiles.push(fileName);
      }
      let prefix = hasCustomLayers ? "reset_" : "";
      configContents[`${prefix}${fileName}`] += contents;
    }
    if (hasCustomLayers) {
      // Execute reset cfg at the end of game overrides to apply binds
      configContents["game_overrides.cfg"] +=
        "exec app/reset_game_overrides.cfg";
      // Apply class specific layer resets
      for (const fileName of customOverrideFiles) {
        let isClassConfig = fileName !== "game_overrides.cfg";
        for (const layer of customLayers) {
          if (isClassConfig) {
            configContents[
              fileName
            ] += `alias -layer_${layer}"exec app/reset_game_overrides.cfg;exec app/reset_${fileName}"\n`;
          }
          configContents[fileName] += `exec app/reset_${fileName}`;
        }
      }
    }
    await tryDBSet("keybinds", actionBinds);
    await tryDBSet("bindLayers", actionLayerBinds);
  }

  const bindCommandReplacements = {
    "+attack2": ["spec_prev", false],
    "+attack": ["spec_next;cmd boo", false],
    "+jump": ["spec_mode", false],
    //"+duck": "showpanel specmenu", // specmenu seems to do nothing?
    "+strafe": ["spec_autodirector 1", false], // unused, but here for posterity.
    "+taunt": ["cmd stop_taunt", true],
  };

  const commandSeparationRegex = "([\"';s\n\r]+|^|$)";

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
  }

  function handleKeyDownReplacements(bindCommand) {
    // Now add the spec overrides for the binds.
    for (const [key, [value, before]] of Object.entries(
      bindCommandReplacements,
    )) {
      const pattern = new RegExp(
        String.raw`${commandSeparationRegex}(${escapeRegExp(
          key,
        )})${commandSeparationRegex}`,
      );
      bindCommand = before
        ? bindCommand.replace(pattern, `$1${value};$2$3`)
        : bindCommand.replace(pattern, `$1$2;${value}$3`);
    }
    return bindCommand;
  }

  function getBindsFromBindsObject(bindsObject) {
    let contents = "";
    for (const key of Object.keys(bindsObject)) {
      let binding = bindsObject[key];
      if (binding === UNBIND_ACTION_VALUE) {
        contents += `unbind ${key}\n`;
        continue;
      }
      let bindingStr;
      // Should we quote arg, or raw arg?
      let isMultiCommand = binding.indexOf(";") !== -1;
      if (
        typeof binding === "string" &&
        (binding.indexOf(" ") !== -1 || isMultiCommand)
      ) {
        // Handle multi-command binds
        if (isMultiCommand) {
          // If we have keydown commands, we need keydown/keyup aliases
          if (binding.indexOf("+") !== -1) {
            const aliasName = `@${key}`;
            const keyDownBind = handleKeyDownReplacements(binding);
            contents += `alias +${aliasName}"${keyDownBind}"\n`;
            const keyUpBinding = binding.replaceAll("+", "-");
            contents += `alias -${aliasName}"${keyUpBinding}"\n`;
            bindingStr = ` +${aliasName}`;
          } else {
            isMultiCommand = false;
          }
        }
        if (!isMultiCommand) {
          // We can just quote like normal
          // We still need to handle keydown replacements because it's an exact match and we already ruined it by having a space.
          bindingStr = `"${handleKeyDownReplacements(binding)}"`;
        }
      } else {
        // We don't need a keydown replacement since it's an exact single command match.
        bindingStr = ` ${binding}`;
      }
      contents += `bind ${key}${bindingStr}\n`;
    }
    return contents;
  }

  function newAutoexecFile() {
    let contents = "";
    // Binds
    contents += getBindsFromBindsObject(selectedBinds);
    // Commands
    for (const cvar of Object.keys(selectedOverrides)) {
      contents += `${cvar} ${selectedOverrides[cvar]}\n`;
    }
    // Get any additional contents
    if (configContentsRaw["autoexec.cfg"]) {
      contents += configContentsRaw["autoexec.cfg"];
      delete configContentsRaw["autoexec.cfg"];
    }
    if (contents.length > 0) {
      return newFile(contents, "autoexec.cfg", appDirectory);
    }
    return null;
  }

  // TODO: repurpose this for the new object
  function getObjectFilePromise(file) {
    try {
      return Promise.resolve({
        url: URL.createObjectURL(file),
        name: file.name,
        isObject: true,
      });
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async function getCustomDownloadUrls() {
    // We downloaded the custom settings, so the user wants it!
    await saveModules();
    // We need permissions for the directory
    await accessDirectory();
    let downloads = [];
    // Update binds
    await updateBinds();
    // Create the modules.cfg file
    let modulesFile = newModulesFile();
    if (modulesFile) {
      downloads.push({
        name: "modules.cfg",
        path: "tf/cfg/overrides/modules.cfg",
        blob: modulesFile,
      });
    } else if (overridesDirectory) {
      // TODO: we should instead read in the existing modules.cfg and set selections
      // Avoid deleting a user's modules if they have not used the modules.cfg customizer
      let hasModules = await tryDBGet("hasModules");
      if (hasModules) {
        // Delete modules file if empty
        try {
          overridesDirectory.removeEntry("modules.cfg");
        } catch (err) {}
      }
    }
    // Clear out old scripts directory
    if (scriptsDirectory) {
      for await (const key of scriptsDirectory.keys()) {
        scriptsDirectory.removeEntry(key);
      }
    }
    // Clear out old materials directory
    if (materialsDirectory) {
      for await (const key of materialsDirectory.keys()) {
        materialsDirectory.removeEntry(key);
      }
    }
    if (globalThis.items) {
      let { default: useItemStore } = await import("../store/items.js");
      const itemsState = useItemStore.getState();
      const crosshairs = itemsState.crosshairs;
      const crosshairColors = itemsState.crosshairColors;
      const crosshairScales = itemsState.crosshairScales;
      const zoomCrosshairs = itemsState.zoomCrosshairs;
      const muzzleflashes = itemsState.muzzleflashes;
      const brassmodels = itemsState.brassmodels;
      const tracers = itemsState.tracers;
      const selectedExplosionEffects = itemsState.explosioneffects;
      const selectedPlayerExplosions = itemsState.playerexplosions;
      let items = structuredClone(globalThis.items);
      delete items.default;
      let itemsToDownload = new Set();
      let crosshairsToDownload = new Set();
      const crosshairTargetBase = "vgui/replay/thumbnails/";
      const crosshairTarget = `tf/custom/comfig-custom/materials/${crosshairTargetBase}`;
      let crosshairPacks = globalThis.crosshairPacks;
      const crosshairColorCount = Object.keys(crosshairColors).length;
      if (crosshairColorCount > 0) {
        function addColor(target, color) {
          configContents[target] += `cl_crosshair_red ${Math.round(color.r)};`;
          configContents[target] += `cl_crosshair_green ${Math.round(
            color.g,
          )};`;
          configContents[target] += `cl_crosshair_blue ${Math.round(color.b)};`;
          configContents[target] += `cl_crosshairalpha ${Math.round(
            (color.a ?? 1) * 255,
          )}\n`;
        }
        // If any color is set, we need to use color mode 5
        configContents["autoexec.cfg"] += "cl_crosshaircolor 5\n";
        let defaultColor = crosshairColors["default"];
        let defaultFile = "game_overrides.cfg";
        // If only specified a default color, use autoexec
        if (crosshairColorCount == 1 && defaultColor) {
          defaultFile = "autoexec.cfg";
        }
        defaultColor = defaultColor ?? { r: 200, g: 200, b: 200, a: 0.784 };
        addColor(defaultFile, defaultColor);
        for (const playerClass of Object.keys(crosshairColors)) {
          if (playerClass == "default") {
            continue;
          }
          addColor(bindConfigLayers[playerClass], crosshairColors[playerClass]);
        }
      }
      const crosshairScaleCount = Object.keys(crosshairScales).length;
      if (crosshairScaleCount > 0) {
        function addScale(target, scale) {
          configContents[target] += `cl_crosshair_scale ${scale}\n`;
        }
        let defaultScale = crosshairScales["default"];
        let defaultFile = "game_overrides.cfg";
        // If only specified a default scale, use autoexec
        if (crosshairScaleCount == 1 && defaultScale) {
          defaultFile = "autoexec.cfg";
        }
        defaultScale = defaultScale ?? 32;
        addScale(defaultFile, defaultScale);
        for (const playerClass of Object.keys(crosshairScales)) {
          if (playerClass == "default") {
            continue;
          }
          addScale(bindConfigLayers[playerClass], crosshairScales[playerClass]);
        }
      }
      // If there's weapon crosshairs, we need to clear a set crosshair file
      if (Object.keys(crosshairs).length > 0) {
        configContents["autoexec.cfg"] += 'cl_crosshair_file""\ncrosshair 1\n';
      }
      if (crosshairs["default"]) {
        let [crosshairGroup, crosshairFile, crosshairKey] = crosshairs[
          "default"
        ].split(".", 3);
        let crosshairPack = crosshairPacks[crosshairFile];
        let crosshairInfo = crosshairPack[crosshairKey] ?? crosshairPack;
        for (const classname of Object.keys(items)) {
          let item = items[classname];
          let itemCrosshair = item.TextureData.crosshair;
          if (crosshairFile.indexOf("/") === -1) {
            itemCrosshair.file = `${crosshairTargetBase}${crosshairFile}`;
            crosshairsToDownload.add(crosshairFile);
          } else {
            itemCrosshair.file = crosshairFile;
          }
          itemCrosshair.x = crosshairInfo.pos?.[0] ?? "0";
          itemCrosshair.y = crosshairInfo.pos?.[1] ?? "0";
          itemCrosshair.width = crosshairInfo.size ?? "64";
          itemCrosshair.height = crosshairInfo.size ?? "64";
          itemsToDownload.add(classname);
        }
      } else {
        for (const classname of Object.keys(crosshairs)) {
          let [crosshairGroup, crosshairFile, crosshairKey] = crosshairs[
            classname
          ].split(".", 3);
          let crosshairPack = crosshairPacks[crosshairFile];
          let crosshairInfo = crosshairPack[crosshairKey];
          let item = items[classname];
          let itemCrosshair = item.TextureData.crosshair;
          if (crosshairFile.indexOf("/") === -1) {
            itemCrosshair.file = `${crosshairTargetBase}${crosshairFile}`;
            crosshairsToDownload.add(crosshairFile);
          } else {
            itemCrosshair.file = crosshairFile;
          }
          itemCrosshair.x = crosshairInfo.pos?.[0] ?? "0";
          itemCrosshair.y = crosshairInfo.pos?.[1] ?? "0";
          itemCrosshair.width = crosshairInfo.size ?? "64";
          itemCrosshair.height = crosshairInfo.size ?? "64";
          itemsToDownload.add(classname);
        }
      }
      for (const classname of Object.keys(zoomCrosshairs)) {
        let [crosshairGroup, crosshairFile, crosshairKey] = zoomCrosshairs[
          classname
        ].split(".", 3);
        let crosshairPack = crosshairPacks[crosshairFile];
        let crosshairInfo = crosshairPack[crosshairKey];
        let item = items[classname];
        let itemCrosshair = item.TextureData.zoom;
        if (!itemCrosshair) {
          itemCrosshair = item.TextureData.zoom = {};
        }
        if (crosshairFile.indexOf("/") === -1) {
          itemCrosshair.file = `${crosshairTargetBase}${crosshairFile}`;
          crosshairsToDownload.add(crosshairFile);
        } else {
          itemCrosshair.file = crosshairFile;
        }
        itemCrosshair.x = crosshairInfo.pos?.[0] ?? "0";
        itemCrosshair.y = crosshairInfo.pos?.[1] ?? "0";
        itemCrosshair.width = crosshairInfo.size ?? "64";
        itemCrosshair.height = crosshairInfo.size ?? "64";
        itemsToDownload.add(classname);
      }
      if (muzzleflashes.has("default")) {
        for (const classname of Object.keys(items)) {
          if (skipMuzzleFlash.has(classname)) {
            continue;
          }
          let item = items[classname];
          if (!item.MuzzleFlashParticleEffect) {
            continue;
          }
          item.MuzzleFlashParticleEffect = "";
          itemsToDownload.add(classname);
        }
      } else {
        for (const classname of Array.from(muzzleflashes)) {
          if (skipMuzzleFlash.has(classname)) {
            continue;
          }
          let item = items[classname];
          item.MuzzleFlashParticleEffect = "";
          itemsToDownload.add(classname);
        }
      }
      if (brassmodels.has("default")) {
        for (const classname of Object.keys(items)) {
          let item = items[classname];
          if (!item.BrassModel) {
            continue;
          }
          item.BrassModel = "";
          itemsToDownload.add(classname);
        }
      } else {
        for (const classname of Array.from(brassmodels)) {
          let item = items[classname];
          item.BrassModel = "";
          itemsToDownload.add(classname);
        }
      }
      if (tracers.has("default")) {
        for (const classname of Object.keys(items)) {
          if (skipTracer.has(classname)) {
            continue;
          }
          let item = items[classname];
          if (!item.TracerEffect) {
            continue;
          }
          item.TracerEffect = "";
          itemsToDownload.add(classname);
        }
      } else {
        for (const classname of Array.from(tracers)) {
          if (skipTracer.has(classname)) {
            continue;
          }
          let item = items[classname];
          item.TracerEffect = "";
          itemsToDownload.add(classname);
        }
      }
      if (selectedExplosionEffects["default"]) {
        let effect = selectedExplosionEffects["default"];
        for (const classname of Object.keys(items)) {
          if (skipExplosionEffect.has(classname)) {
            continue;
          }
          let item = items[classname];
          if (!item.ExplosionEffect) {
            continue;
          }
          item.ExplosionEffect = effect;
          item.ExplosionPlayerEffect = effect;
          item.ExplosionWaterEffect = effect;
          itemsToDownload.add(classname);
        }
      } else {
        for (const classname of Object.keys(selectedExplosionEffects)) {
          if (skipExplosionEffect.has(classname)) {
            continue;
          }
          let item = items[classname];
          let effect = selectedExplosionEffects[classname];
          if (!item.ExplosionEffect) {
            continue;
          }
          item.ExplosionEffect = effect;
          item.ExplosionPlayerEffect = effect;
          item.ExplosionWaterEffect = effect;
          itemsToDownload.add(classname);
        }
      }
      if (selectedPlayerExplosions["default"]) {
        let effect = selectedPlayerExplosions["default"];
        for (const classname of Object.keys(items)) {
          if (skipExplosionEffect.has(classname)) {
            continue;
          }
          let item = items[classname];
          if (!item.ExplosionEffect) {
            continue;
          }
          item.ExplosionPlayerEffect = effect;
          itemsToDownload.add(classname);
        }
      } else {
        for (const classname of Object.keys(selectedPlayerExplosions)) {
          if (skipExplosionEffect.has(classname)) {
            continue;
          }
          let item = items[classname];
          let effect = selectedPlayerExplosions[classname];
          if (!item.ExplosionEffect) {
            continue;
          }
          item.ExplosionPlayerEffect = effect;
          itemsToDownload.add(classname);
        }
      }
      for (const classname of Array.from(itemsToDownload)) {
        let fileName = `${classname}.txt`;
        let item = { WeaponData: items[classname] };
        let contents = stringify(item, { pretty: true });
        let file = newFile(contents, fileName, scriptsDirectory);
        if (!file) {
          continue;
        }
        downloads.push({
          name: fileName,
          path: `tf/custom/comfig-custom/scripts/${fileName}`,
          blob: file,
        });
      }
      const crosshairExtensions = [".vtf", ".vmt"];
      let crosshairSrcBase = `/assets/app/crosshairs/`;
      let hasAlerted = false;
      for (const crosshairFile of Array.from(crosshairsToDownload)) {
        for (const ext of crosshairExtensions) {
          let src = `${crosshairSrcBase}${crosshairFile}${ext}`;
          let crosshairResult = await writeRemoteFile(src, materialsDirectory);
          if (crosshairResult) {
            let dst = `${crosshairTarget}${crosshairFile}${ext}`;
            crosshairResult.path = dst;
            downloads.push(crosshairResult);
          } else if (!hasAlerted) {
            hasAlerted = true;
            alert("Failed to download crosshair file. Please try again later.");
          }
        }
      }
    }
    // Clear out old app directory
    if (appDirectory) {
      for await (const key of appDirectory.keys()) {
        appDirectory.removeEntry(key);
      }
    }
    // Create the autoexec.cfg file
    let autoexecFile = newAutoexecFile();
    if (autoexecFile) {
      downloads.push({
        name: "autoexec.cfg",
        path: "tf/cfg/app/autoexec.cfg",
        blob: autoexecFile,
      });
    }
    for (const fileName of Object.keys(configContentsRaw)) {
      let contents = configContentsRaw[fileName];
      if (contents.length > 0) {
        let file = newFile(contents, fileName, appDirectory);
        if (!file) {
          continue;
        }
        downloads.push({
          name: fileName,
          path: `tf/cfg/app/${fileName}`,
          blob: file,
        });
      }
    }
    return downloads;
  }

  // update addon state based on checked
  async function updateAddon(el) {
    await setAddon(el.id, !el.classList.contains("active"));
  }

  let addonHandler = {
    "null-canceling-movement": {
      enabled: () => {
        if (document.querySelectorAll(".binding-field").length <= 1) {
          return;
        }
        for (const actions of Object.keys(
          addonActionMappings["null-canceling-movement"],
        )) {
          // TODO: add default bindings if user doesn't have any
        }
      },
    },
  };

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
      addonHandler[id]?.enabled?.();
    } else {
      // Filter out the addon if it's there
      selectedAddons = selectedAddons.filter((selection) => selection !== id);
      // Delete any binds associated with this addon
      if (customActionMappings[id]) {
        delete customActionMappings[id];
      }
      addonHandler[id]?.disabled?.();
    }
    // Make sure the UI reflects the selected state
    getEl(id).classList.toggle("active", checked);
  }

  function updateDocsLinks(version) {
    for (const el of document.querySelectorAll(".docs-link")) {
      el.href = `https://docs.comfig.app/${version}/${el.dataset.url}/`;
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
          sendApiRequest();
          updateDocsLinks("page");
        }
      } else {
        let tag = `https://api.comfig.app/?t=${userVersion}`;
        sendApiRequest(tag);
        updateDocsLinks(userVersion);
      }
    }
  }

  function updatePresetDownloadButton() {
    let presetInfo = presets[selectedPreset];
    if (!downloading) {
      let icon = "cloud-download";
      let text = `Download mastercomfig (${presetInfo.name} preset, addons and customizations)`;
      if (gameDirectory) {
        text = `Install mastercomfig (${presetInfo.name} preset, addons and customizations)`;
        icon = "download";
      }
      getEl(
        "vpk-dl",
      ).innerHTML = `<span class="fas fa-${icon} fa-fw"></span> ${text} `; // update download text
    }
  }

  const presetImg = {
    "medium-high": mediumHighImg,
    low: lowImg,
    "medium-low": mediumLowImg,
    medium: mediumImg,
    ultra: ultraImg,
    "very-low": veryLowImg,
    high: highImg,
    none: noneImg,
  };

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
    new Tab(getEl(selectedPreset)).show(); // visually display as active in tabs menu bar
    let presetImage = getEl("preset-image");
    presetImage.src = presetImg[selectedPreset].src;
    presetImage.alt = `${presetInfo.name} preset screenshot`;
    getEl("preset-description").innerHTML = presetInfo.description;
    getEl("vpk-dl").removeAttribute("href"); // we don't need the static download anymore
    updatePresetDownloadButton();
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
    if (userValue && availableModuleLevels[name].has(userValue)) {
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
  function createInputElement(type, className) {
    let inputElement = document.createElement("input");
    inputElement.autocomplete = "off";
    inputElement.classList.add(className);
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
    let undoCol = document.createElement("div");
    undoCol.classList.add("col");
    let undoLink = document.createElement("a");
    undoLink.href = "#";
    undoLink.id = `undo-${name}`;
    undoLink.classList.add("align-middle");
    undoLink.addEventListener("click", (e) => {
      e.preventDefault();
      setModule(name, getBuiltinModuleDefault(name));
    });
    let value = getModuleDefault(name);
    let configDefault = getBuiltinModuleDefault(name);
    if (value === configDefault) {
      undoLink.classList.add("d-none");
    }
    let undoIcon = document.createElement("span");
    undoIcon.classList.add("fa", "fa-undo", "fa-fw");
    undoLink.append(undoIcon);
    undoCol.append(undoLink);
    row.append(undoCol);
    return [row, col, undoLink];
  }

  // Create a dropdown select input
  function handleModuleInputSelect(name, values) {
    let [inputOuter, inputContainer, inputUndo] = createInputContainer(name);
    // Create the element
    let selectElement = document.createElement("select");
    selectElement.autocomplete = "off";
    selectElement.classList.add(
      "form-select",
      "form-select-sm",
      "bg-dark",
      "text-light",
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
    let configDefault = getDefaultValueFromName(
      values,
      getBuiltinModuleDefault(name),
    );
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
  function handleModuleInputButtonGroup(name, values) {}

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
    valueIndicator.classList.add("form-range-value");
    // Set default value
    let defaultSelection = values[defaultValue];
    if (typeof defaultSelection === "object") {
      valueIndicator.innerText = properCaseOrDisplayModuleName(
        defaultSelection,
        defaultSelection.value,
      );
    } else {
      valueIndicator.innerText = capitalize(defaultSelection);
    }
    // Event listener for undoing
    let configDefault = getDefaultValueFromName(
      values,
      getBuiltinModuleDefault(name),
    );
    inputUndo.addEventListener("click", () => {
      rangeElement.value = configDefault;
      let configDefaultSelection = values[configDefault];
      if (typeof configDefaultSelection === "object") {
        valueIndicator.innerText = properCaseOrDisplayModuleName(
          configDefaultSelection,
          configDefaultSelection.value,
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
          selected.value,
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
        return handleModuleInputButtonGroup;
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
      `https://docs.comfig.app/${
        userVersion !== "latest" ? userVersion : "page"
      }/customization/modules/#` +
      displayName.replace(/\(|\)/g, "").split(" ").join("-").toLowerCase();
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
      module.values,
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

  let bSetModuleNavActive = true;

  // Handles each module category
  function handleCategory(name, category) {
    // Create category element
    let categoryContainer = document.createElement("div");
    categoryContainer.classList.add("module-category");
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
      },
    );
    categoryNavItem.append(categoryNavLink);
    // If we have a module in this category, show the whole category
    if (bHasModule) {
      return [categoryContainer, categoryNavItem];
    } else {
      return [null, null];
    }
  }

  let customizeCollapse = getEl("customize");
  function isCustomizeVisible() {
    return customizeCollapse.classList.contains("show");
  }

  let scrollSpy = null;

  function initScrollSpy(customizationsCol) {
    if (!customizationsCol) {
      return;
    }

    scrollSpy = new ScrollSpy(customizationsCol, {
      target: getEl("modules-nav"),
      rootMargin: "-5% 0px -95%",
      threshold: [0],
    });
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
    customizationsCol.tabIndex = 0;
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
        modules[module],
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
    resetButton.innerHTML =
      '<span class="fas fa-undo fa-fw"></span> Reset all modules';
    resetButton.classList.add(
      "position-absolute",
      "bottom-0",
      "btn",
      "btn-secondary",
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

    if (scrollSpy) {
      scrollSpy.dispose();
      scrollSpy = null;
    }

    // Init scrollspy if visible
    if (isCustomizeVisible()) {
      initScrollSpy(customizationsCol);
    }
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
        latestVersion,
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

    let lastDownloadedBadge = ["last downloaded", "bg-gray"];

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

  async function handleApiResponse(data) {
    cachedData = data;
    // Get the version
    await handleVersions(cachedData.v);

    // Now get the modules
    presetModulesDef = cachedData.p;
    availableModuleLevels = {};
    for (const category of Object.keys(cachedData.m)) {
      let modules = cachedData.m[category].modules;
      for (const module of modules) {
        let moduleName = module.name;
        for (const level of module.values) {
          let levelValue = level.value ? level.value : level;
          if (moduleName in availableModuleLevels) {
            availableModuleLevels[moduleName].add(levelValue);
          } else {
            availableModuleLevels[moduleName] = new Set([levelValue]);
          }
        }
      }
    }
    handleModulesRoot(cachedData.m);
  }

  async function getApiResponse(url) {
    if (!url) {
      url = `/api/${globalThis.appVersion}.${globalThis.appHash}.cached.json`;
    }
    return fetch(url).then((resp) => resp.json());
  }

  function sendApiRequest(url) {
    getApiResponse(url)
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
    if (downloadStatusEl) {
      downloadStatusEl.innerHTML =
        '<a href="#downloads-section">Skip to downloads</a>';
      downloadStatusEl.classList.add("download-status-fill");
    }
  } else {
    await setPreset("medium-high", true);
  }

  if (getEl("launch-options")) {
    let currentTimeout = null;
    getEl("launch-options").addEventListener("click", () => {
      let target = getEl("launch-options");
      if (currentTimeout !== null) {
        clearTimeout(currentTimeout);
      }
      if (!navigator.clipboard) {
        console.error("Clipboard unsupported.");
        return;
      }
      navigator.clipboard
        .writeText(target.firstElementChild.innerText)
        .then(() => {
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
          range.selectNodeContents(target.firstElementChild);
          selection.removeAllRanges();
          selection.addRange(range);
        });
    });
  }

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
      // We don't init scrollspy until visible
      if (!scrollSpy) {
        initScrollSpy(getEl("modules-controls"));
      }
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

  let blockKeyboard = false;
  let inittedKeyboard = false;

  async function initKeyboard() {
    if (inittedKeyboard) {
      return;
    }

    let Keyboard = await dkeyboard;

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
  });

  document.addEventListener("contextmenu", (e) => {
    if (e) {
      if (blockKeyboard) {
        e.preventDefault();
      }
    } else {
      console.error("Context menu event is null:", e);
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
  });

  document.addEventListener(
    "wheel",
    (e) => {
      if (blockKeyboard && lastBindInput) {
        e.preventDefault();
        lastBindInput.value = e.wheelDelta > 0 ? "MWHEELUP" : "MWHEELDOWN";
        finishBindInput(lastBindInput, true);
        return false;
      }
    },
    {
      passive: false,
    },
  );

  // Capture keyboard input when bindings are shown
  let tabEls = document.querySelectorAll(
    '#customizations a[data-bs-toggle="tab"]',
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
    // HACK: contextmenu fires after input events, so we need to wait a bit
    setTimeout(() => {
      blockKeyboard = false;
    }, 1);
    history.back();
    element.placeholder = "<Unbound>";
    element.classList.add("disabled");
    if (removeInput) {
      lastBindInput = null;
      // input -> col -> row: if this row is the last in the list.
      if (!element.parentNode.parentNode.nextSibling) {
        // display remove button
        element.parentNode.parentNode.childNodes[3].firstChild.classList.remove(
          "d-none",
        );
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
    Jump: "+jump",
    Duck: "+duck",
    "Show scoreboard": "+score",
    Drop: "dropitem",
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
    "Switch console active": "switchconsole",
    "Engineer: Build Sentry": "cmd build 2 0",
    "Engineer: Destroy Sentry": "cmd destroy 2 0",
    "Engineer: Build Dispenser": "cmd build 0 0",
    "Engineer: Destroy Dispenser": "cmd destroy 0 0",
    "Engineer: Build Teleporter Entrance": "cmd build 1 0",
    "Engineer: Destroy Teleporter Entrance": "cmd destroy 1 0",
    "Engineer: Build Teleporter Exit": "cmd build 1 1",
    "Engineer: Destroy Teleporter Exit": "cmd destroy 1 1",
    "Spy: Last Disguise": "lastdisguise",
    "Spy: Toggle Disguise Team": "disguiseteam",
    "Spy: Place Sapper": "cmd build 3 0",
    "Chat message": "say",
    "Team message": "say_team",
    "Party message": "say_party",
    "Voice Menu 1": "voice_menu_1",
    "Voice Menu 2": "voice_menu_2",
    "Voice Menu 3": "voice_menu_3",
    "Change class": "changeclass",
    "Change team": "changeteam",
    "Kill (self)": "cmd kill",
    "Explode (self)": "cmd explode",
    "Open loadout": "open_charinfo_direct",
    "Open Backpack": "open_charinfo_backpack",
    "Open Contracts Drawer": "show_quest_log",
    "Open Matchmaking": "show_matchmaking",
    "Loadout Quickswitch": "+quickswitch",
    "Loadout A": "load_itempreset 0",
    "Loadout B": "load_itempreset 1",
    "Loadout C": "load_itempreset 2",
    "Loadout D": "load_itempreset 3",
    "Action Slot": "+use_action_slot_item",
    Taunts: "+taunt",
    "Weapon Taunt": "cmd taunt",
    "Stop Taunt": "cmd stop_taunt",
    "MvM Canteen or Taunt": "+context_action",
    "Open Map information": "showmapinfo",
    "Show Round information": "+showroundinfo",
    "Call vote": "callvote",
    Inspect: "+inspect",
    "Toggle viewmodel visibility": "toggle r_drawviewmodel",
    "Toggle minimized viewmodels": "toggle tf_use_min_viewmodels",
    "Toggle Ready": "player_ready_toggle",
    Spray: "impulse 201",
    "Take screenshot": "screenshot",
    "Save replay": "save_replay",
    "View/Accept alert": "cl_trigger_first_notification",
    "Remove/Decline alert": "cl_decline_first_notification",
    "Quit Game (prompt)": "quit prompt",
    "Quit Game (no prompt)": "quit",
  };

  const legacyActionMappings = {
    "Use voice communication": "Push to Talk",
    "Contextual Action/Taunt": "MvM Canteen or Taunt",
  };

  const actionNames = Object.keys(actionMappings);

  const bindsList = getEl("binds-list");

  function createBindingField(bindOptions) {
    let keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.classList.add(
      "form-control",
      "form-control-sm",
      "disabled",
      "text-light",
      "bg-dark",
    );
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
      "text-light",
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
      action = legacyActionMappings[action] ?? action;
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
    textInput.classList.add(
      "form-control",
      "form-control-sm",
      "text-light",
      "bg-dark",
    );
    textInput.placeholder = "Type a console command to run";
    textInput.ariaLabel = "Custom command to run";
    inputGroup.append(textInput);
    let undoButton = document.createElement("button");
    undoButton.classList.add("btn", "btn-sm", "btn-outline-secondary");
    undoButton.type = "button";
    undoButton.innerHTML = "<span class='fas fa-undo fa-fw'></span>";
    undoButton.addEventListener("click", () => {
      selectElement.selectedIndex = 0;
      selectElement.dispatchEvent(new Event("input", { bubbles: true }));
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

    let row = document.createElement("div");
    row.classList.add("row", "binding-field");

    let layerCol = inputCol.cloneNode();
    let selectLayer = selectElement.cloneNode();
    // Make sure it's not cloned as invisible
    selectLayer.classList.remove("d-none");
    let index = 0;
    let layer = bindOptions?.layer;
    for (const key of Object.keys(bindConfigLayers)) {
      let optionName;
      if (key == "gameoverrides") {
        optionName = "Default layer";
      } else {
        optionName = capitalize(key);
      }
      let optionElement = document.createElement("option");
      optionElement.value = key;
      optionElement.innerText = optionName;
      selectLayer.append(optionElement);
      if (key === layer) {
        selectLayer.selectedIndex = index;
      }
      index++;
    }
    layerCol.append(selectLayer);

    selectLayer.addEventListener("input", (e) => {
      let select = e.target;
      let value = select.options[select.selectedIndex].value;
      row.dataset.layer = value;
    });

    if (layer) {
      row.dataset.layer = layer;
    }

    let actionCol = inputCol.cloneNode();
    actionCol.append(selectElement);
    actionCol.append(inputGroup);

    let removeBtn = document.createElement("a");
    removeBtn.href = "#";
    removeBtn.onclick = (e) => {
      e.preventDefault();
      row.remove();
    };
    removeBtn.classList.add("fa", "fa-close", "fa-fw");
    if (!bindOptions) {
      removeBtn.classList.add("d-none");
    }
    let removeCol = document.createElement("div");
    removeCol.classList.add("col-1");
    removeCol.append(removeBtn);
    row.append(inputCol, actionCol, layerCol, removeCol);
    bindsList.append(row);
  }

  tryDBGet("keybinds").then((keybinds) => {
    if (keybinds) {
      for (const [key, actions] of Object.entries(keybinds)) {
        if (Array.isArray(actions)) {
          for (const action of actions) {
            createBindingField({ key, action });
          }
        } else {
          createBindingField({ key, action: actions });
        }
      }
    }
  });
  tryDBGet("bindLayers").then((bindLayers) => {
    if (bindLayers) {
      for (const [layer, keybinds] of Object.entries(bindLayers)) {
        for (const [key, actions] of Object.entries(keybinds)) {
          if (Array.isArray(actions)) {
            for (const action of actions) {
              createBindingField({ key, action, layer });
            }
          } else {
            createBindingField({ key, action: actions, layer });
          }
        }
      }
    }
    createBindingField();
  });

  if (import.meta.env.DEV) {
    for (const child of getEl("customizations").children) {
      child.classList.remove("d-none");
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
      if (!deferredPrompt) {
        return;
      }
      // Show the prompt
      deferredPrompt.prompt();
      // hide our user interface that shows our A2HS button
      addBtn.classList.add("d-none");
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

  let ghProvider;
  let ghToken;
  let ghUser;

  async function loginWithGitHub() {
    let firebase = await dfirebase;
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
        console.error("Login failed:", errorCode, errorMessage);
      });
  }

  let firebaseMessaging;

  function messaging() {
    if (!firebaseMessaging) {
      firebaseMessaging = firebase.messaging();
    }
    return firebaseMessaging;
  }

  async function getToken(serviceWorkerRegistration) {
    await dfirebase;
    try {
      messaging().onMessage((payload) => {
        console.log("Message received:", payload);
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

  /*
  function registerServiceWorker() {
    const updateSW = registerSW({
      immediate: true,
      onRegisterError(e) {
        console.error("Error during service worker registration:", e);
      },
      onOfflineReady() {
        console.log("Offline ready");
      },
    });

    updateSW();
  }
  */

  /*
  if ("serviceWorker" in navigator) {
    let bFoundSW = false;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        if (true || registration.active?.scriptURL.endsWith("/service-worker.js")) {
          bFoundSW = true;
          registration.unregister().then(() => {
            registerServiceWorker();
          })
        }
      }

      if (!bFoundSW) {
        registerServiceWorker();
      }
    });
  }
  */

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
window.addEventListener("load", app);
