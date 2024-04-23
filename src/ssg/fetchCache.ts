const apiCache = {};

export async function fetchCache(...args) {
  if (import.meta.env.PROD) {
    return fetch(...args).then((res) => res.json());
  }
  const key = JSON.stringify(args);
  if (apiCache[key] && apiCache[key].expires > Date.now()) {
    return apiCache[key].data;
  }
  const res = await fetch(...args);
  if (res.status >= 500) {
    const text = await res.text();
    throw Error(text);
  }
  if (res.status >= 400) {
    const text = await res.text();
    console.error(text);
    return null;
  }
  const json = await res.json();
  apiCache[key] = {};
  apiCache[key].data = json;
  apiCache[key].expires = Date.now() + 1000 * 60 * 5;
  return json;
}

export async function fetchCacheText(...args) {
  if (import.meta.env.PROD) {
    return fetch(...args).then((res) => res.text());
  }
  const key = JSON.stringify(args);
  if (apiCache[key] && apiCache[key].expires > Date.now()) {
    return apiCache[key].data;
  }
  const res = await fetch(...args);
  if (res.status >= 500) {
    const text = await res.text();
    throw Error(text);
  }
  if (res.status >= 400) {
    const text = await res.text();
    console.error(text);
    return null;
  }
  const text = await res.text();
  apiCache[key] = {};
  apiCache[key].data = text;
  apiCache[key].expires = Date.now() + 1000 * 60 * 5;
  return text;
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 10000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal,
  });
  clearTimeout(id);
  return response;
}

export async function fetchCacheTextWithTimeout(resource, options = {}) {
  if (import.meta.env.PROD) {
    try {
      const response = await fetchWithTimeout(resource, options);
      if (response.ok) {
        return response.text();
      }
    } catch {
      // Ignored
    }
    return null;
  }
  const key = JSON.stringify(arguments);
  if (apiCache[key] && apiCache[key].expires > Date.now()) {
    return apiCache[key].data;
  }
  let text = null;
  try {
    const res = await fetchWithTimeout(resource, options);
    if (res.ok) {
      text = await res.text();
    } else {
      if (res.status >= 500) {
        const text = await res.text();
        throw Error(text);
      }
      if (res.status >= 400) {
        const text = await res.text();
        console.error(text);
        return null;
      }
    }
  } catch {
    // Ignored
  }
  apiCache[key] = {};
  apiCache[key].data = text;
  apiCache[key].expires = Date.now() + 1000 * 60 * 5;
  return text;
}
