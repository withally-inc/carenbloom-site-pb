const ROLE_STATE_API_ORIGIN = "https://carenbloom-site-pb.vercel.app";
const STATIC_ONLY_HOSTS = new Set(["carenbloom.com", "www.carenbloom.com"]);

export function resolveRoleStateEndpoint(location = window.location, globals = window) {
  const override = globals?.CB_ROLE_STATE_ENDPOINT;
  if (typeof override === "string" && override) return override;
  return STATIC_ONLY_HOSTS.has(location?.hostname) ? `${ROLE_STATE_API_ORIGIN}/api/role-state` : "/api/role-state";
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
