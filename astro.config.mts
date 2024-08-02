import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import { shield } from "@kindspells/astro-shield";
import sentry from "@sentry/astro";
import AstroPWA from "@vite-pwa/astro";
import type { AstroIntegration } from "astro";
import { defineConfig, envField } from "astro/config";
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
      const sriHashes = await import("./generated/sriHashes.mjs");
      const headersFilePath = resolve(rootDir, "public", "_headers");
      let headersFile = fs.readFileSync(headersFilePath, {
        encoding: "utf-8",
      });
      const scriptSrcHashes = `'${sriHashes.inlineScriptHashes.join("' '")}'`;
      headersFile = headersFile.replace(
        "{{SCRIPT_SRC_HASHES}}",
        scriptSrcHashes,
      );
      // Not ideal, but protects against non-targeted attacks. We don't really have options for non-dynamic content.
      const srcNonce = `'nonce-${nonce}'`;
      headersFile = headersFile.replaceAll("{{SRC_NONCE}}", srcNonce);
      const styleSrcElementHashes = `'${sriHashes.inlineStyleHashes.join("' '")}'`;
      headersFile = headersFile.replace(
        "{{STYLE_SRC_ELEM_HASHES}}",
        styleSrcElementHashes,
      );
      const headersFileWritePath = resolve(rootDir, "dist", "_headers");
      fs.writeFileSync(headersFileWritePath, headersFile);
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
    tailwind({
      applyBaseStyles: false,
      nesting: true,
    }),
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
    astroCSPHashExporter,
    sitemap(),
  ],
  image: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "teamwork.tf",
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
  },
  prefetch: false,
  experimental: {
    directRenderScript: true,
    clientPrerender: true,
    globalRoutePriority: true,
    contentCollectionCache: true,
    env: {
      schema: {
        NONCE: envField.string({
          context: "server",
          access: "secret",
          default: nonce,
        }),
      },
    },
  },
});
