import { applyBrowserCors } from "./_lib/cors.js";
import { resolveRoleState } from "./_lib/role-state.js";
import { careerRoles } from "../scripts/careers-roles.js";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function setAuthoritativeHeaders(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  applyBrowserCors(req, res, "GET, OPTIONS");
}

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

export function createRoleStateHandler({ now = () => new Date(), roles = careerRoles } = {}) {
  return async function roleStateHandler(req, res) {
    setAuthoritativeHeaders(req, res);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET, OPTIONS");
      sendJson(res, 405, { status: "error", error: "Method not allowed." });
      return;
    }

    const serverNow = new Date(now());
    const serverNowIso = serverNow.toISOString();
    const resolvedRoles = resolveAll(serverNow, roles);
    const { openRoles, groupCounts } = summarizeOpenRoles(resolvedRoles);
    const requestUrl = new URL(req.url || "/api/role-state", `http://${req.headers?.host || "localhost"}`);
    const slug = requestUrl.searchParams.get("role");

    if (!slug) {
      sendJson(res, 200, {
        status: "ok",
        serverNow: serverNowIso,
        openRoleCount: openRoles.length,
        groupCounts,
        nextBoundaryAt: nextCollectionBoundary(serverNow, resolvedRoles, openRoles),
        roles: openRoles.map(projectListedRole),
      });
      return;
    }

    const resolvedRole = resolvedRoles.find(({ role }) => role.slug === slug);
    if (!resolvedRole) {
      sendJson(res, 200, {
        status: "unknown",
        serverNow: serverNowIso,
        openRoleCount: openRoles.length,
        groupCounts,
      });
      return;
    }

    sendJson(res, 200, {
      status: resolvedRole.state.isOpen ? "open" : "closed",
      serverNow: serverNowIso,
      openRoleCount: openRoles.length,
      groupCounts,
      role: resolvedRole.role,
      state: resolvedRole.state,
    });
  };
}

export default createRoleStateHandler();
