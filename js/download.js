"use strict";

function app() {
    // convenience format method for string
    String.prototype.format = function() {
      const args = arguments;
      return this.replace(/{(\d+)}/g, function(match, number) {
        return typeof args[number] !== 'undefined' ? args[number] : match;
      });
    };

  var presets = new Map([
      ["ultra", "Ultra"],
      ["high", "High"],
      ["medium-high", "Medium High"],
      ["medium", "Medium"],
      ["medium-low", "Medium Low"],
      ["low", "Low"],
      ["very-low", "Very Low"]
  ]);

  const recommendableAddons = ["no-footsteps", "disable-pyroland", "no-soundscapes", "no-tutorial"];

  var recommendedAddons = new Map();

  function setRecommendedAddons(id, values) {
      // don't set non-recommendable addons
      let addons = values.filter(addon => recommendableAddons.indexOf(addon) !== -1);
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
  setRecommendedAddons("very-low", ["no-footsteps", "disable-pyroland", "no-soundscapes", "no-tutorial"]);

  var downloadUrl = "https://github.com/mastercomfig/mastercomfig/releases/latest/download/mastercomfig-";
  var addonUrl = downloadUrl + "{0}-addon.vpk";
  var presetUrl = downloadUrl + "{0}-preset.vpk";

  var vpkDownload = document.getElementById('vpk-dl');
  var presetDownload = document.getElementById('preset-dl');

  var version = null;

  var addons = ["no-footsteps", "disable-pyroland", "no-soundscapes", "no-tutorial", "null-cancelling-movement", "flat-mouse", "transparent-viewmodels", "lowmem"];
  var selectedPreset = "medium-high";
  var selections = [];

  var storage = localStorage;

  var downloading = false;

  function downloadClickEvent() {
      download();
      document.getElementById('vpk-dl').onclick = null;
      vpkDownload.style.cursor = "not-allowed";
      downloading = true;
      vpkDownload.classList.add("focus");
      document.getElementById('vpk-dl').innerHTML = vpkDownload.innerHTML.replace("Download", "Downloading").replace("VPKs", "VPKs...");
  }

  function bindDownloadClick() {
      document.getElementById('vpk-dl').onclick = downloadClickEvent;
      vpkDownload.style.cursor = "pointer";
      downloading = false;
      vpkDownload.classList.remove("focus");
      document.getElementById('vpk-dl').innerHTML = vpkDownload.innerHTML.replace("Downloading", "Download").replace("VPKs...", "VPKs");
  }

  function getDownloadUrl(id, preset) {
      return (preset ? presetUrl : addonUrl).format(id);
  }

  function getAddonUrl(id) {
      return getDownloadUrl(id, false);
  }

  function getPresetUrl() {
      return getDownloadUrl(selectedPreset, true);
  }

  function downloadUrls(urls) {
      urls[0].then((result) => {
          if (result.url !== "") {
              window.location = result.url;
          }
          if (urls.length > 1) {
              setTimeout(() => {
                  return downloadUrls(urls.slice(1));
              }, 2000);
          } else {
              bindDownloadClick();
          }
      });
  }

  function download() {
      storage.setItem("lastVersion", version);
      var downloads = [Promise.resolve({
          url: ""
      })];
      downloads.push(Promise.resolve({
          url: getPresetUrl()
      }));
      for (const selection of selections) {
          downloads.push(Promise.resolve({
              url: getAddonUrl(selection)
          }));
      }
      return downloadUrls(downloads);
  }

  // update addon state based on checked
  function updateAddon(id) {
    setAddon(id, document.getElementById(id).checked);
  }

  // set addon enabled/disabled
  function setAddon(id, checked) {
    storage.setItem(id, checked);
    checked = storage.getItem(id) === 'true';
    if (checked) {
        if (selections.indexOf(id) === -1) {
            selections.push(id);
        }
    } else {
        selections = selections.filter(selection => selection !== id);
    }
    document.getElementById(id + "-dl").style.display = checked ? "initial" : "none";
    document.getElementById(id).checked = checked;
  }

  function setPreset(id, no_set) {
    storage.setItem('preset', id); // save preset selection
    new bootstrap.Tab(document.getElementById(id)).show(); // visually select in tabs menu
    selectedPreset = id; // save download ID
    vpkDownload.removeAttribute('href'); // we don't need the static download anymore
    if (!downloading) {
        document.getElementById("vpk-dl").innerHTML = '<span class="fa fa-cloud-download fa-fw"></span> Download {0} preset and selected addons VPKs'.format(presets.get(id)); // update download text
    }
    presetDownload.setAttribute('href', getPresetUrl());
    document.getElementById("preset-dl").innerHTML = '<span class="fa fa-download fa-fw"></span> Download {0} preset VPK'.format(presets.get(id)); // update preset text
    // if not loading from storage, set recommended addons
    if (!no_set) {
        // reset all recommendable addons
        recommendableAddons.forEach(function(addon) {
            setAddon(addon, false);
        });
        // set recommended addons
        recommendedAddons.get(id).forEach(function(addon) {
            setAddon(addon, true);
        });
    }
  }

  // get latest release, and update page
  fetch("https://mastercomfig.mcoms.workers.dev/")
  .then(resp => resp.json())
  .then(data => {
    version = data.v;
    if (!version) {
        return;
    }
    let versionName = version.indexOf('v') === 0 ? version.substr(1) : version; // some releases use the v prefix, ignore it
    // update title with version
    document.getElementById("version").innerText = versionName;
  });

  document.querySelectorAll('#presets a').forEach((element) => {
    element.addEventListener('click', (e) => {
      e.preventDefault();
      setPreset(e.currentTarget.id);
    });
  });

  bindDownloadClick();

  document.getElementById('preset-dl').addEventListener('click', () => {
    storage.setItem("lastVersion", version);
  });

  document.querySelectorAll("input[type='checkbox']").forEach((element) => {
    element.addEventListener('input', (e) => {
      updateAddon(e.currentTarget.id);
    });
  });

  // if we have a stored preset, load it
  if (storage.getItem('preset')) {
    setPreset(storage.getItem('preset'), true);
  } else {
    setPreset('medium-high');
  }
  for (const id of addons) {
    if (storage.getItem(id)) {
      setAddon(id, storage.getItem(id))
    } else {
      setAddon(id, false);
    }
  }
}

(function() {
  app();
})();
