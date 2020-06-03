// This is deployed to CloudFlare workers

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const reqHeaders = {
    headers: {
        'Authorization': btoa('Basic ' + GH_USERNAME + ':' + GH_PASSWORD),
        'User-Agent': 'mastercomfig-worker',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json;charset=UTF-8',
    },
  }

  // Attempt cached version, else request
  let version = await MASTERCOMFIG.get("mastercomfig-version")
  if (version == null) {
    try {
        // Fetch from GitHub
        const response = await fetch("https://api.github.com/repos/mastercomfig/mastercomfig/releases/latest", reqHeaders)
        // Get JSON response
        const data = await response.json()
        // Get tag name for version
        let tag_name = data.tag_name
        if (tag_name) {
            // Remove the v prefix some releases have
            version = tag_name.indexOf('v') === 0 ? tag_name.substr(1) : tag_name
            // Cache it for 12 hours
            await MASTERCOMFIG.put("mastercomfig-version", version, {
                expirationTtl: 43200
            })
        }
    } catch (error) {
        console.error(error);
    }
  }

  // Return JSON with 12 hour cache
  const resHeaders = {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Cache-Control': 'max-age=43200',
      'Access-Control-Allow-Origin': 'https://mastercomfig.com',
    },
  }

  // Return version
  const resBody = JSON.stringify({v: version})
  return new Response(resBody, resHeaders)
}
