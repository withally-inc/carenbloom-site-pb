const PRODUCTION_API_ORIGIN = "https://carenbloom-site-pb.vercel.app";
export const CLOUDFLARE_PRODUCTION_HOSTS = new Set(["carenbloom.com", "www.carenbloom.com"]);

function resolveEndpoint(apiPath, override, location) {
  if (typeof override === "string" && override) return override;
  return CLOUDFLARE_PRODUCTION_HOSTS.has(location?.hostname) ? `${PRODUCTION_API_ORIGIN}${apiPath}` : apiPath;
}

export function resolveRoleStateEndpoint(location = window.location, globals = window) {
  return resolveEndpoint("/api/role-state", globals?.CB_ROLE_STATE_ENDPOINT, location);
}

export function resolveApplicationsEndpoint(location = window.location, globals = window) {
  return resolveEndpoint("/api/applications", globals?.CB_TALENTS_ENDPOINT, location);
}

export function roleStateUrl(slug) {
  const endpoint = resolveRoleStateEndpoint();
  return slug ? `${endpoint}?role=${encodeURIComponent(slug)}` : endpoint;
}

async function fetchWithRetry(url, options, fetchImpl, retries = 2, delayMs = 1500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchImpl(url, options);
      if (response.ok || attempt === retries) return response;
    } catch (error) {
      if (attempt === retries) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export function fetchRoleState(slug, fetchImpl = fetch) {
  return fetchWithRetry(roleStateUrl(slug), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  }, fetchImpl);
}
