addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

/**
 * gatherResponse awaits and returns a response body as JSON.
 * @param {Response} response
 */
async function gatherResponse(response) {
  return await response.json();
}

// Cloudflare supports the GET, POST, HEAD, and OPTIONS methods from any origin,
// and allow any header on requests. These headers must be present
// on all responses to all CORS preflight requests. In practice, this means
// all responses to OPTIONS requests.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const optionsRes = {
  headers: {
    Allow: "GET, HEAD, POST, OPTIONS",
  },
};

const reqHeaders = {
  headers: {
    "User-Agent": "mastercomfig-worker",
  },
};

const reqGHAPIHeaders = {
  headers: {
    Authorization: btoa("Basic " + GH_USERNAME + ":" + GH_PASSWORD),
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json;charset=UTF-8",
    ...reqHeaders.headers,
  },
};

const reqGHRawHeaders = {
  headers: {
    Accept: "application/text",
    "Content-Type": "application/text;charset=UTF-8",
    ...reqHeaders.headers,
  },
};

const reqGHReleaseHeaders = {
  headers: {
    Accept: "application/octet-stream",
    ...reqHeaders.headers,
  },
};

const resCommonHeaders = {
  headers: {
    "Cache-Control": "max-age=86400",
    "Access-Control-Allow-Origin": "*",
  },
};

// Return JSON with 24 hour cache
const resHeaders = {
  headers: {
    "Content-Type": "application/json;charset=UTF-8",
    ...resCommonHeaders.headers,
  },
};

const resAssetHeaders = {
  headers: {
    "Content-Type": "application/octet-stream",
    ...resCommonHeaders.headers,
  },
};

// Return octet stream with 1 year cache
const resAssetHeadersSuccess = {
  headers: {
    "Content-Type": "application/octet-stream",
    ...resCommonHeaders.headers,
    "Cache-Control": "max-age=31536000,immutable",
  },
};

const deniedOptions = {
  status: 405,
};

const cacheOpt = {
  expirationTtl: 86400,
};

function stringify(data) {
  return JSON.stringify(data);
}

function getVersion(data) {
  // Get tag name for version
  let tag_name = data.tag_name;
  let version = null;
  if (tag_name) {
    // Remove the v prefix some releases have
    version = tag_name.indexOf("v") === 0 ? tag_name.substr(1) : tag_name;
  }
  return version;
}

function getVersions(data) {
  let limit = Math.min(5, data.length);
  let versions = [];
  for (let i = 0; i < limit; i++) {
    let version = data[i];
    if (version.prerelease || version.draft) {
      limit = Math.min(limit + 1, data.length);
    } else {
      let parsedVersion = getVersion(version);
      if (parsedVersion) {
        versions.push(parsedVersion);
      }
    }
  }
  return versions.length < 1 ? null : stringify(versions);
}

function getVersionedKey(key, version) {
  if (!version) {
    version = 2;
  }
  return key + "-" + version;
}

const rv = [
  "https://api.github.com/repos/mastercomfig/mastercomfig/releases",
  reqGHAPIHeaders,
  getVersionedKey("mastercomfig-version"),
  getVersions,
];
const rm = [
  "https://raw.githubusercontent.com/mastercomfig/mastercomfig/release/data/modules.json",
  reqGHRawHeaders,
  "mastercomfig-modules",
  stringify,
];
const rp = [
  "https://raw.githubusercontent.com/mastercomfig/mastercomfig/release/data/preset_modules.json",
  reqGHRawHeaders,
  "mastercomfig-preset-modules",
  stringify,
];

async function forceUpdate(version) {
  let updated = await updateData([rv, rm, rp]);
  let resBody =
    '{"v":' +
    updated[0] +
    "," +
    '"m":' +
    updated[1] +
    "," +
    '"p":' +
    updated[2] +
    "}";
  await storeData(
    getVersionedKey("mastercomfig-api-response", version),
    resBody,
  );
}

addEventListener("scheduled", (event) => {
  event.waitUntil(forceUpdate(2));
});

async function storeData(key, value) {
  return MASTERCOMFIG.put(key, value, cacheOpt);
}

async function noop() {
  return null;
}

async function updateData(requests) {
  let data = [];
  try {
    // Fetch
    let pr = [];
    let hasValidRequest = false;
    requests.forEach((r) => {
      if (r) {
        hasValidRequest = true;
        pr.push(fetch(r[0], r[1]));
      } else {
        pr.push(noop());
      }
    });
    if (!hasValidRequest) {
      return data;
    }
    data.fill(null, pr.length);
    const responses = await Promise.all(pr);
    // Parse response
    let pg = [];
    responses.forEach((r) => {
      if (r && r.ok) {
        pg.push(gatherResponse(r));
      } else {
        pg.push(noop());
      }
    });
    // Store and return results
    const results = await Promise.all(pg);
    for (let i = 0; i < results.length; i++) {
      if (!requests[i]) {
        continue;
      }
      let r = results[i];
      let value = null;
      if (r) {
        value = requests[i][3] ? requests[i][3](r) : r;
      }
      if (requests[i][2]) {
        if (value) {
          await storeData(requests[i][2], value);
        } else {
          value = await MASTERCOMFIG.get(requests[i][2]);
        }
      }
      data[i] = value;
    }
  } catch (error) {
    console.error(error);
  } finally {
    return data;
  }
}

function constructDataResponse(updated, version, v, m, p) {
  if (updated[0]) {
    v = updated[0];
  }
  if (updated[1]) {
    m = updated[1];
  }
  if (updated[2]) {
    p = updated[2];
  }
  let resBody = '{"v":' + v + "," + '"m":' + m + "," + '"p":' + p + "}";
  return resBody;
}

const webhookPathname = "/" + GH_WEBHOOK_ID;

const validNames = new Set([
  "mastercomfig-ultra-preset.vpk",
  "mastercomfig-high-preset.vpk",
  "mastercomfig-medium-high-preset.vpk",
  "mastercomfig-medium-preset.vpk",
  "mastercomfig-medium-low-preset.vpk",
  "mastercomfig-low-preset.vpk",
  "mastercomfig-very-low-preset.vpk",
  "mastercomfig-none-preset.vpk",
  "mastercomfig-null-canceling-movement-addon.vpk",
  "mastercomfig-opengl-addon.vpk",
  "mastercomfig-flat-mouse-addon.vpk",
  "mastercomfig-no-tutorial-addon.vpk",
  "mastercomfig-disable-pyroland-addon.vpk",
  "mastercomfig-no-footsteps-addon.vpk",
  "mastercomfig-no-soundscapes-addon.vpk",
  "mastercomfig-transparent-viewmodels-addon.vpk",
  "mastercomfig-lowmem-addon.vpk",
]);

const downloadLength = "/download".length;
const downloadSlashLength = downloadLength + 1;

function handleOptions(request) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  const headers = request.headers;
  if (
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null &&
    headers.get("Access-Control-Request-Headers") !== null
  ) {
    // Handle CORS pre-flight request.
    // If you want to check or reject the requested method + headers
    // you can do that here.
    const respHeaders = {
      ...corsHeaders,
      // Allow all future content Request headers to go back to browser
      // such as Authorization (Bearer) or X-Client-Name-Version
      "Access-Control-Allow-Headers": request.headers.get(
        "Access-Control-Request-Headers",
      ),
    };

    return new Response(null, {
      headers: respHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, optionsRes);
  }
}

async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }
  if (request.method === "GET" || request.method == "POST") {
    const url = new URL(request.url);
    //let version = url.searchParams.get("v") ?? 2;
    let version = 2;
    let tag = url.searchParams.get("t");
    if (tag && (tag.includes("..") || tag.includes("/") || tag === ".")) {
      tag = null;
    }
    if (url.pathname === webhookPathname) {
      await forceUpdate(version);
    }
    if (url.pathname.startsWith("/download")) {
      let downloadUrl = url.pathname.substring(downloadLength);
      let isDevDownload = downloadUrl.startsWith("/download/dev/");
      let validDownload =
        isDevDownload || downloadUrl.startsWith("/latest/download/");
      if (!validDownload && downloadUrl.startsWith("/download/")) {
        let versionString = downloadUrl.substring(downloadSlashLength);
        let slashPos = versionString.indexOf("/");
        if (slashPos !== -1) {
          versionString = versionString.substring(0, slashPos);
          let v = await MASTERCOMFIG.get(
            getVersionedKey("mastercomfig-version", 2),
          );
          let versions = JSON.parse(v);
          validDownload = versions.includes(versionString);
        }
      }
      if (validDownload) {
        if (!url.pathname.includes("..")) {
          let name = downloadUrl.split("/").pop();
          if (validNames.has(name)) {
            let response = await fetch(
              "https://github.com/mastercomfig/mastercomfig/releases" +
                downloadUrl,
              reqGHReleaseHeaders,
            );
            const resHeaders = response.ok
              ? resAssetHeadersSuccess
              : resAssetHeaders;
            let { readable, writable } = new TransformStream();
            response.body.pipeTo(writable);
            return new Response(readable, {
              status: response.status,
              ...resHeaders,
            });
          }
        }
      }
    }
    // Get custom tag
    if (tag) {
      let v = await MASTERCOMFIG.get(
        getVersionedKey("mastercomfig-version", version),
      );
      let modules = [
        `https://raw.githubusercontent.com/mastercomfig/mastercomfig/${tag}/data/modules.json`,
        reqGHRawHeaders,
        null,
        stringify,
      ];
      let presets = [
        `https://raw.githubusercontent.com/mastercomfig/mastercomfig/${tag}/data/preset_modules.json`,
        reqGHRawHeaders,
        null,
        stringify,
      ];
      let updated = await updateData([v ? null : rv, modules, presets]);
      let resBody = constructDataResponse(updated, version, v);
      return new Response(resBody, resHeaders);
    }
    // Attempt cached
    let resBody = await MASTERCOMFIG.get(
      getVersionedKey("mastercomfig-api-response", version),
    );
    resBody = null;
    if (!resBody) {
      let v = await MASTERCOMFIG.get(
        getVersionedKey("mastercomfig-version", version),
      );
      let m = await MASTERCOMFIG.get("mastercomfig-modules");
      let p = await MASTERCOMFIG.get("mastercomfig-preset-modules");
      let updated = await updateData([
        v ? null : rv,
        m ? null : rm,
        p ? null : rp,
      ]);
      resBody = constructDataResponse(updated, version, v, m, p);
      await storeData(
        getVersionedKey("mastercomfig-api-response", version),
        resBody,
      );
    }
    return new Response(resBody, resHeaders);
  }
  return new Response(null, deniedOptions);
}
