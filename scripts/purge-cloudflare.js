const glob = require("glob");
const https = require('https');

const MAX_CF_URLS = 30;

const API_KEY = process.env.CF_API_KEY;
const API_EMAIL = process.env.CF_API_EMAIL;
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'X-Auth-Email': API_EMAIL,
  'Content-Type': 'application/json',
}

function purgeOnCloudflare(files) {
  const data = JSON.stringify({
    files: files.map(f => `https://mastercomfig.com/${f}`)
  });
  return;
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
  const html_files = files.map(f => `${f.substring(f.lastIndexOf('/') + 1, f.lastIndexOf('.'))}.html`)
  files = files.map(f => f.endsWith("index.astro") ? '' : `${f.substring(f.lastIndexOf('/') + 1, f.lastIndexOf('.'))}`);
  files = files.concat(html_files);
  if (files.length > MAX_CF_URLS) {
    while (files.length) {
      purgeOnCloudflare(files.splice(0, MAX_CF_URLS));
    }
  } else {
    purgeOnCloudflare(files);
  }
});
