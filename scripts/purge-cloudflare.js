const glob = require("glob");
const https = require('https');

const MAX_CF_URLS = 30;

const headers = {
  "X-Auth-Email": process.env.CF_API_EMAIL,
  Authorization: `Bearer ${process.env.CF_API_KEY}`,
  "Content-Type": "application/json",
};

function purgeOnCloudflare(files) {
  const data = JSON.stringify({
    files: files.map(f => `https://mastercomfig.com/${f}`)
  });
  const options = {
      hostname: "api.cloudflare.com",
      port: 443,
      path: `/client/v4/zones/${process.env.CF_ZONE_ID}/purge_cache`,
      method: "POST",
      headers,
  };
    const req = https.request(options, (res) => {
      res.on('data', (d) => {
        process.stdout.write(d);
      });
    });
    req.write(data);
    req.end();
}

glob("src/pages/*.astro", (err, files) => {
  if (err) {
    console.warn(err);
    return;
  }
  files = files.map(f => {
    if (f.endsWith("index.astro")) {
      return "";
    }
    if (f.endsWith("404.astro")) {
      return "404";
    }
    return `${f.substring(f.lastIndexOf("/") + 1, f.lastIndexOf("."))}/`;
  });
  if (files.length > MAX_CF_URLS) {
    while (files.length) {
      purgeOnCloudflare(files.splice(0, MAX_CF_URLS));
    }
  } else {
    purgeOnCloudflare(files);
  }
});
