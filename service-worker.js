/*
Copyright 2015, 2019, 2020, 2021 Google LLC. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

// Incrementing OFFLINE_VERSION will kick off the install event and force
// previously cached resources to be updated from the network.
const OFFLINE_VERSION = 1;
const CACHE_NAME = "offline-v" + OFFLINE_VERSION;

const OFFLINE_FILES = [
  "/app",
  "/css/main.css",
  "/css/app.css",
  "/favicon.ico",
  "/js/app.js",
  "/img/mastercomfig_logo_192x.png",
  "/img/mastercomfig_logo_512x.png",
  "/img/mastercomfig_logo_transparent_i.svg",
  "/img/presets/ultra.png",
  "/img/presets/high.png",
  "/img/presets/medium-high.png",
  "/img/presets/medium.png",
  "/img/presets/medium-low.png",
  "/img/presets/low.png",
  "/img/presets/very-low.png",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.0.1/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/font-awesome@4/css/font-awesome.min.css",
  "https://cdn.jsdelivr.net/npm/simple-keyboard@latest/build/css/index.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.0.1/dist/js/bootstrap.bundle.min.js",
  "https://cdn.jsdelivr.net/npm/simple-keyboard@latest/build/index.min.js",
];

self.addEventListener("install", (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Setting {cache: 'reload'} in the new request will ensure that the
      // response isn't fulfilled from the HTTP cache; i.e., it will be from
      // the network.
      console.log('[Service Worker] Caching all: app shell and content');
      for (const url of OFFLINE_FILES) {
        await cache.add(new Request(url, { cache: "reload" }));
      }
    })()
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload if it's supported.
      // See https://developers.google.com/web/updates/2017/02/navigation-preload
      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.enable();
      }
    })()
  );

  // Tell the active service worker to take control of the page immediately.
  self.clients.claim();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keyList) => {
    Promise.all(keyList.map((key) => {
      if (key === CACHE_NAME) { return; }
      caches.delete(key);
    }))
  }));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      try {
        // First, try to use the navigation preload response if it's supported.
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
          return preloadResponse;
        }

        // Always try the network first.
        const networkResponse = await fetch(event.request);
        if (event.request.method === "GET") {
          const cache = await caches.open(CACHE_NAME);
          console.log(`[Service Worker] Caching new resource: ${event.request.url}`);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // catch is only triggered if an exception is thrown, which is likely
        // due to a network error.
        // If fetch() returns a valid HTTP response with a response code in
        // the 4xx or 5xx range, the catch() will NOT be called.
        console.log("Fetch failed; returning offline page instead.", error);

        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        console.log(`[Service Worker] Fetching resource: ${event.request.url}`);
        return cachedResponse;
      }
    })()
  );

  // If our if() condition is false, then this fetch handler won't intercept the
  // request. If there are any other fetch handlers registered, they will get a
  // chance to call event.respondWith(). If no fetch handlers call
  // event.respondWith(), the request will be handled by the browser as if there
  // were no service worker involvement.
});
