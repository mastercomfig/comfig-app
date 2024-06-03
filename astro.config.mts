import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import sentry from "@sentry/astro";
import AstroPWA from "@vite-pwa/astro";
import { defineConfig } from "astro/config";
import url from "url";

// https://astro.build/config
export default defineConfig({
  site: "https://comfig.app",
  integrations: [
    sentry({
      dsn: "https://42c25ee2fb084eb5a832ee92d97057d5@o182209.ingest.us.sentry.io/6265934",
      sourceMapsUploadOptions: {
        org: "mastercoms",
        project: "comfig-app",
        authToken: process.env.SENTRY_AUTH_TOKEN ?? "",
      },
    }),
    react(),
    AstroPWA({
      devOptions: {
        type: "module",
        enabled: true,
      },
      registerType: "autoUpdate",
      workbox: {
        globPatterns: [
          "**/*.{css,js,json,webp,svg,png,ico,woff2,mp4,vtf,vmt}",
          "app/index.html",
          "index.html",
        ],
      },
      includeAssets: ["**/*.{png,xml,ico,svg,webp,mp4,vtf,vmt}"],
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
        display_override: ["standalone", "minimal-ui", "browser"],
        scope: "/",
        theme_color: "#009688",
        description: "Manage your mastercomfig installation",
      },
      experimental: {
        directoryAndTrailingSlashHandler: true,
      },
    }),
    sitemap(),
  ],
  vite: {
    build: {
      sourcemap: true,
    },
    resolve: {
      alias: {
        "~bootstrap": url.fileURLToPath(
          new URL("./node_modules/bootstrap", import.meta.url),
        ),
        "~bootswatch": url.fileURLToPath(
          new URL("./node_modules/bootswatch", import.meta.url),
        ),
      },
    },
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  experimental: {
    directRenderScript: true,
    clientPrerender: true,
    globalRoutePriority: true,
  },
});
