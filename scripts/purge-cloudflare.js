var glob = require("glob");

glob("src/pages/*.astro", (err, files) => {
  const options = {
    hostname: "api.cloudflare.com"
    port: 443,
    path: "",
    method: "POST"
  };
});  
