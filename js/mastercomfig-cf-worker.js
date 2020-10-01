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
  if (
    contentType.includes("application/json") ||
    contentType.includes("text/plain") ||
    contentType.includes("application/text")
  ) {
    return await response.json();
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

// Return JSON with 1 hour cache
const resHeaders = {
  headers: {
    "Content-Type": "application/json;charset=UTF-8",
    "Cache-Control": "max-age=3600",
    "Access-Control-Allow-Origin": "https://mastercomfig.com",
  },
};

async function handleRequest(request) {
  // Attempt cached version, else request
  //let version = await MASTERCOMFIG.get("mastercomfig-version")
  let version = null;
  let resObj = {};
  if (version == null) {
    try {
      // Fetch from GitHub
      const responses = await Promise.all([
        fetch(
          "https://api.github.com/repos/mastercomfig/mastercomfig/releases/latest",
          reqGHAPIHeaders
        ),
        fetch(
          "https://raw.githubusercontent.com/mastercomfig/mastercomfig/develop/data/modules.json",
          reqGHRawHeaders
        ),
      ]);
      // Get JSON response
      const results = await Promise.all([
        gatherResponse(responses[0]),
        gatherResponse(responses[1]),
      ]);
      // Get GitHub data
      let data = results[0];
      // Get tag name for version
      let tag_name = data.tag_name;
      if (tag_name) {
        // Remove the v prefix some releases have
        version = tag_name.indexOf("v") === 0 ? tag_name.substr(1) : tag_name;
        // Cache it for 1 hour
        await MASTERCOMFIG.put("mastercomfig-version", version, {
          expirationTtl: 3600,
        });
      }
      if (results[1]) {
        resObj.m = results[1];
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Return data
  resObj.v = version;
  const resBody = JSON.stringify(resObj);
  return new Response(resBody, resHeaders);
}
