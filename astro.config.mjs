import { defineConfig } from "astro/config";
import crypto from "crypto";
import fs from "fs";
import url from "url";

import react from "@astrojs/react";
import { VitePWA } from "vite-plugin-pwa";

const pwaOptions = {
  registerType: "autoUpdate",
  includeAssets: ["favicon.ico"],
  manifest: {
    name: "mastercomfig",
    short_name: "mastercomfig",
    categories: ["games", "utilities", "personalization"],
    lang: "en-US",
    dir: "ltr",
    orientation: "any",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "maskable",
      },
      {
        src: "/android-chrome-512x512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
      {
        src: "/img/mastercomfig_logo_192x.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/img/mastercomfig_logo_512x.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
    ],
    start_url: "/app?source=pwa",
    background_color: "#212121",
    display: "standalone",
    scope: "/",
    theme_color: "#009688",
    description: "Manage your mastercomfig installation",
  },
  devOptions: {
    enabled: process.env.SW_DEV === "true",
    /* when using generateSW the PWA plugin will switch to classic */
    type: "module",
  },
};

let pwaPlugin;

let pwa = {
  name: "@astrojs/pwa",
  hooks: {
    "astro:config:setup": ({ config, updateConfig }) => {
      updateConfig({
        vite: {
          plugins: [VitePWA(pwaOptions)],
        },
      });
    },
    "astro:config:done": ({ config }) => {
      const plugins = config.vite.plugins ?? [];
      for (const p of plugins) {
        if (Array.isArray(p)) {
          pwaPlugin = p.find(
            (p1) => p1 && !Array.isArray(p1) && p1.name === "vite-plugin-pwa"
          );
          break;
        }
      }
    },
    "astro:build:done": async ({ dir, routes }) => {
      const api = pwaPlugin?.api;
      if (routes && api && !api.disabled) {
        // todo@userquin: rn we only add the static pages, we should exclude dynamic routes
        const addRoutes = await Promise.all(
          routes
            .filter((r) => r.type === "page" && r.pathname && r.distURL)
            .map(
              (r) =>
                new Promise((resolve, reject) => {
                  let url = r.pathname;
                  let path = r.distURL;
                  const cHash = crypto.createHash("MD5");
                  const stream = fs.createReadStream(path);
                  stream.on("error", (err) => {
                    reject(err);
                  });
                  stream.on("data", (chunk) => {
                    cHash.update(chunk);
                  });
                  stream.on("end", () => {
                    return resolve({
                      url,
                      revision: `${cHash.digest("hex")}`,
                    });
                  });
                })
            )
        );
        api.extendManifestEntries((manifestEntries) => {
          manifestEntries.push(...addRoutes);
          return manifestEntries;
        });
        // generate the manifest.webmanifest file
        api.generateBundle();
        // regenerate the sw
        await api.generateSW();
      }
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: "https://mastercomfig.com",
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        "~bootstrap": url.fileURLToPath(
          new URL("./node_modules/bootstrap", import.meta.url)
        ),
        "~bootswatch": url.fileURLToPath(
          new URL("./node_modules/bootswatch", import.meta.url)
        ),
      },
    },
  },
});
