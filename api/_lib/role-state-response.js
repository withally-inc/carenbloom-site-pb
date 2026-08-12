import { resolveRoleState } from "./role-state.js";

export const ROLE_STATE_CACHE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function resolveAll(serverNow, roles) {
  return roles.map((role) => ({ role, state: resolveRoleState(serverNow, role) }));
}

function projectListedRole({ role, state }) {
  return {
    slug: role.slug,
    title: role.title,
    locationType: role.locationType,
    careerGroup: role.careerGroup,
    careerOrder: role.careerOrder,
    state,
  };
}

function nextCollectionBoundary(serverNow, resolvedRoles, openRoles) {
  const boundaries = [
    ...resolvedRoles.map(({ state }) => Date.parse(state.nextRefreshAt)),
    ...openRoles.map(({ state }) => Date.parse(state.effectiveClosesAt)),
  ].filter((instant) => Number.isFinite(instant) && instant > serverNow.getTime());
  return boundaries.length > 0 ? new Date(Math.min(...boundaries)).toISOString() : null;
}

function summarizeOpenRoles(resolvedRoles) {
  const openRoles = resolvedRoles.filter(({ state }) => state.isOpen);
  const groupCounts = {};
  for (const { role } of openRoles) {
    if (!role.careerGroup) continue;
    groupCounts[role.careerGroup] = (groupCounts[role.careerGroup] || 0) + 1;
  }
  return { openRoles, groupCounts };
}

export function resolveRoleStateResponse({ serverNow: serverNowInput, roles, slug }) {
  const serverNow = new Date(serverNowInput);
  const serverNowIso = serverNow.toISOString();
  const resolvedRoles = resolveAll(serverNow, roles);
  const { openRoles, groupCounts } = summarizeOpenRoles(resolvedRoles);

  if (!slug) {
    return {
      statusCode: 200,
      payload: {
        status: "ok",
        serverNow: serverNowIso,
        openRoleCount: openRoles.length,
        groupCounts,
        nextBoundaryAt: nextCollectionBoundary(serverNow, resolvedRoles, openRoles),
        roles: openRoles.map(projectListedRole),
      },
    };
  }

  const resolvedRole = resolvedRoles.find(({ role }) => role.slug === slug);
  if (!resolvedRole) {
    return {
      statusCode: 200,
      payload: {
        status: "unknown",
        serverNow: serverNowIso,
        openRoleCount: openRoles.length,
        groupCounts,
      },
    };
  }

  return {
    statusCode: 200,
    payload: {
      status: resolvedRole.state.isOpen ? "open" : "closed",
      serverNow: serverNowIso,
      openRoleCount: openRoles.length,
      groupCounts,
      role: resolvedRole.role,
      state: resolvedRole.state,
    },
  };
}
