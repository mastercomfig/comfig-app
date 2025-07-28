import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { shield } from "@kindspells/astro-shield";
import sentry from "@sentry/astro";
import tailwindcss from "@tailwindcss/vite";
import AstroPWA from "@vite-pwa/astro";
import type { AstroIntegration } from "astro";
import { defineConfig, envField } from "astro/config";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { resolve } from "node:path";

const pwa = AstroPWA({
  devOptions: {
    type: "module",
    enabled: false,
  },
  selfDestroying: true,
  registerType: "autoUpdate",
  workbox: {
    globPatterns: [
      "**/*.{css,js,json,webp,svg,png,ico,woff2,mp4,vtf,vmt,html}",
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
});

const rootDir = new URL(".", import.meta.url).pathname;

const nonce = crypto.randomBytes(16).toString("base64");

const astroCSPHashExporter: AstroIntegration = {
  name: "astro-csp-hash-exporter",
  hooks: {
    "astro:build:done": async () => {
      if (import.meta.env.DEV) {
        return;
      }
      const nonceFileWritePath = resolve(rootDir, "generated", "nonce.txt");
      fs.writeFileSync(nonceFileWritePath, nonce);

      const process = childProcess.fork(
        resolve(rootDir, "scripts", "generate-headers-file.js"),
      );

      return new Promise((resolve, reject) => {
        process.on("error", function (err) {
          if (!err) return;
          reject(err);
        });

        process.on("exit", function (code) {
          const err = code === 0 ? null : new Error("exit code " + code);
          if (!err) resolve();
          reject(err);
        });
      });
    },
  },
};

const astroCSPHashExporterSetup: AstroIntegration = {
  name: "astro-csp-hash-exporter",
  hooks: {
    "astro:config:setup": async ({ updateConfig }) => {
      updateConfig({ integrations: [astroCSPHashExporter] });
    },
  },
};

const modulePath = import.meta.env.DEV
  ? undefined
  : resolve(rootDir, "generated", "sriHashes.mjs");

// https://astro.build/config
export default defineConfig({
  site: "https://comfig.app",
  integrations: [
    react(),
    pwa,
    sentry({
      dsn: "https://42c25ee2fb084eb5a832ee92d97057d5@o182209.ingest.us.sentry.io/6265934",
      sourceMapsUploadOptions: {
        org: "mastercoms",
        project: "comfig-app",
        authToken: process.env.SENTRY_AUTH_TOKEN ?? "",
      },
    }),
    shield({
      sri: {
        hashesModule: modulePath,
      },
    }),
    astroCSPHashExporterSetup,
    sitemap(),
  ],
  image: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "teamwork.tf",
      },
      {
        protocol: "https",
        hostname: "wiki.teamfortress.com",
      },
      {
        protocol: "https",
        hostname: "tf2maps.net",
      },
      {
        protocol: "https",
        hostname: "comp.tf",
      },
      {
        protocol: "https",
        hostname: "steamuserimages-a.akamaihd.net",
      },
    ],
  },
  build: {
    inlineStylesheets: "never",
  },
  vite: {
    build: {
      sourcemap: true,
      assetsInlineLimit: 0,
    },

    html: {
      cspNonce: nonce,
    },

    resolve: {
      alias: {
        "~bootstrap": resolve(rootDir, "node_modules", "bootstrap"),
        "~bootswatch": resolve(rootDir, "node_modules", "bootswatch"),
      },
    },

    plugins: [tailwindcss()],
  },
  prefetch: false,
  env: {
    schema: {
      NONCE: envField.string({
        context: "server",
        access: "secret",
        default: nonce,
      }),
    },
  },
  experimental: {
    clientPrerender: true,
  },
});
