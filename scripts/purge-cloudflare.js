const { globSync } = require("glob");
const https = require("https");

const MAX_CF_URLS = 30;

const headers = {
  "X-Auth-Email": process.env.CF_API_EMAIL,
  Authorization: `Bearer ${process.env.CF_API_KEY}`,
  "Content-Type": "application/json",
};

const hosts = ["mastercomfig.com", "comfig.app"];

function purgeOnCloudflare(pages) {
  const files = pages.flatMap((f) => hosts.map((h) => `https://${h}/${f}`));
  const data = JSON.stringify({
    files,
  });
  const options = {
    hostname: "api.cloudflare.com",
    port: 443,
    path: `/client/v4/zones/${process.env.CF_ZONE_ID}/purge_cache`,
    method: "POST",
    headers,
  };
  const req = https.request(options, (res) => {
    res.on("data", (d) => {
      process.stdout.write(d);
    });
  });
  req.write(data);
  req.end();
}

function main() {
  let files = globSync("src/pages/**/*.astro");
  files = files.flatMap((f) => {
    if (f.endsWith("index.astro")) {
      return [""];
    }
    let base = `${f.substring(f.lastIndexOf("/") + 1, f.lastIndexOf("."))}`;
    return [base, `${base}/`];
  });
  if (files.length > MAX_CF_URLS) {
    while (files.length) {
      purgeOnCloudflare(files.splice(0, MAX_CF_URLS));
    }
  } else {
    purgeOnCloudflare(files);
  }
}

main();
