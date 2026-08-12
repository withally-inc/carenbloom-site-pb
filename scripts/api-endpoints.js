const PRODUCTION_API_ORIGIN = "https://carenbloom-site-pb.vercel.app";
export const CLOUDFLARE_PRODUCTION_HOSTS = new Set(["carenbloom.com", "www.carenbloom.com"]);

function resolveApplicationEndpoint(apiPath, override, location) {
  if (typeof override === "string" && override) return override;
  return CLOUDFLARE_PRODUCTION_HOSTS.has(location?.hostname) ? `${PRODUCTION_API_ORIGIN}${apiPath}` : apiPath;
}

export function resolveRoleStateEndpoint(location, globals = globalThis) {
  const override = globals?.CB_ROLE_STATE_ENDPOINT;
  return typeof override === "string" && override ? override : "/api/role-state";
}

export function resolveApplicationsEndpoint(location = window.location, globals = window) {
  return resolveApplicationEndpoint("/api/applications", globals?.CB_TALENTS_ENDPOINT, location);
}

export function roleStateUrl(slug) {
  const endpoint = resolveRoleStateEndpoint();
  return slug ? `${endpoint}?role=${encodeURIComponent(slug)}` : endpoint;
}

async function fetchWithRetry(url, options, fetchImpl, retries = 2, delayMs = 1500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (options.signal?.aborted) {
      throw options.signal.reason || new DOMException("The operation was aborted.", "AbortError");
    }
    try {
      const response = await fetchImpl(url, options);
      if (response.ok || attempt === retries) return response;
    } catch (error) {
      if (attempt === retries) throw error;
    }
    await new Promise((resolve, reject) => {
      let timer;
      const onAbort = () => {
        clearTimeout(timer);
        reject(options.signal.reason || new DOMException("The operation was aborted.", "AbortError"));
      };
      if (options.signal?.aborted) {
        onAbort();
        return;
      }
      timer = setTimeout(() => {
        options.signal?.removeEventListener("abort", onAbort);
        resolve();
      }, delayMs);
      options.signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
}

export function fetchRoleState(slug, fetchImpl = fetch, { signal } = {}) {
  return fetchWithRetry(roleStateUrl(slug), {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  }, fetchImpl);
}
