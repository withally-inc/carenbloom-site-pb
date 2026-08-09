const PRODUCTION_API_ORIGIN = "https://carenbloom-site-pb.vercel.app";
const CLOUDFLARE_PRODUCTION_HOSTS = new Set(["carenbloom.com", "www.carenbloom.com"]);

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

export function fetchRoleState(slug, fetchImpl = fetch) {
  return fetchImpl(roleStateUrl(slug), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
}
