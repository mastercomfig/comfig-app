addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

/**
 * gatherResponse awaits and returns a response body as JSON.
 * @param {Response} response
 */
async function gatherResponse(response) {
  const { headers } = response;
  const contentType = headers.get("content-type");
  if (contentType.includes("application/json")) {
    return await response.json();
  } else if (
    contentType.includes("text/plain") ||
    contentType.includes("application/text")
  ) {
    return await response.text();
  } else {
    throw new Error("Unexpected content type");
  }
}

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

// Return JSON with 30 minute cache
const resHeaders = {
  headers: {
    "Content-Type": "application/json;charset=UTF-8",
    "Cache-Control": "max-age=1800",
    "Access-Control-Allow-Origin": "https://mastercomfig.com",
  },
};

const cacheOpt = {
  expirationTtl: 7200,
};

addEventListener("scheduled", (event) => {
  event.waitUntil(updateData());
});

async function updateData() {
  try {
    // Fetch from GitHub
    const responses = await Promise.all([
      fetch(
        "https://api.github.com/repos/mastercomfig/mastercomfig/releases/latest",
        reqGHAPIHeaders
      ),
      fetch(
        "https://raw.githubusercontent.com/mastercomfig/mastercomfig/release/data/modules.json",
        reqGHRawHeaders
      ),
      fetch(
        "https://raw.githubusercontent.com/mastercomfig/mastercomfig/release/data/preset_modules.json",
        reqGHRawHeaders
      ),
    ]);
    // Get JSON response
    const results = await Promise.all([
      gatherResponse(responses[0]),
      gatherResponse(responses[1]),
      gatherResponse(responses[2]),
    ]);
    // Get GitHub data
    let data = results[0];
    if (data) {
      // Get tag name for version
      let tag_name = data.tag_name;
      if (tag_name) {
        // Remove the v prefix some releases have
        version = tag_name.indexOf("v") === 0 ? tag_name.substr(1) : tag_name;
        // Cache it
        await MASTERCOMFIG.put("mastercomfig-version", version, cacheOpt);
      }
    }
    // Get modules data
    if (results[1]) {
      // Cache it
      await MASTERCOMFIG.put("mastercomfig-modules", results[1], cacheOpt);
    }
    // Get preset modules data
    if (results[2]) {
      // Cache it
      await MASTERCOMFIG.put(
        "mastercomfig-preset-modules",
        results[2],
        cacheOpt
      );
    }
  } catch (error) {
    console.error(error);
  }
}

async function handleRequest(request) {
  // Attempt cached
  let v = await MASTERCOMFIG.get("mastercomfig-version");
  let m = await MASTERCOMFIG.get("mastercomfig-modules");
  let p = await MASTERCOMFIG.get("mastercomfig-preset-modules");
  if (!v || !m || !p) {
    await updateData();
    v = await MASTERCOMFIG.get("mastercomfig-version");
    m = await MASTERCOMFIG.get("mastercomfig-modules");
    p = await MASTERCOMFIG.get("mastercomfig-preset-modules");
  }
  m = JSON.parse(m);
  p = JSON.parse(p);
  let resObj = {
    v,
    m,
    p,
  };
  const resBody = JSON.stringify(resObj);
  return new Response(resBody, resHeaders);
}
