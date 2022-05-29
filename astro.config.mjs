import { defineConfig } from 'astro/config';

import react from "@astrojs/react";
import { VitePWA } from "vite-plugin-pwa";

const pwaOptions = {
  mode: "development",
  base: "/",
  registerType: "autoUpdate",
  includeAssets: ["favicon.svg"],
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
  workbox: {
    navigateFallback: "/",
    // we don't need the html files: we only need the navigation fallback
    globPatterns: ["**/*.{js,css}"],
  },
  injectManifest: {
    globPatterns: ["**/*.{js,css}"],
  },
  devOptions: {
    enabled: process.env.NO_SW_DEV !== "true",
    /* when using generateSW the PWA plugin will switch to classic */
    type: "module",
    navigateFallback: "app.html",
  },
};

const reload = process.env.NO_RELOAD_SW !== "true";

if (process.env.NO_SW !== "true") {
  pwaOptions.srcDir = "src";
  pwaOptions.filename = "claims-sw.ts";
  pwaOptions.strategies = "injectManifest";
  pwaOptions.manifest.description = "Astro PWA Inject Manifest";
}

let pwaPlugin;

// https://astro.build/config
export default defineConfig({
  site: "https://mastercomfig.com",
  integrations: [
    react(),
    {
      name: "vite-plugin-pwa:astro:hook",
      hooks: {
        "astro:config:done": ({ config }) => {
          const vite = config.vite;
          for (const p of vite.plugins) {
            if (Array.isArray(p)) {
              pwaPlugin = p.find((p1) => p1.name === "vite-plugin-pwa");
              break;
            }
          }
        },
        "astro:build:done": async ({ dir, routes }) => {
          const api = pwaPlugin?.api;
          if (routes && api && !api.isDisabled()) {
            // todo@userquin: rn we only add the static pages, we should exclude dynamic routes
            const addRoutes = await Promise.all(
              routes
                .filter((r) => r.type === "page" && r.pathname && r.distURL)
                .map((r) => {
                  return buildManifestEntry(r.pathname, r.distURL);
                })
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
    },
  ],
  vite: {
    plugins: [VitePWA(pwaOptions)],
  },
});