import { applyBrowserCors } from "./_lib/cors.js";
import { ROLE_STATE_CACHE_HEADERS, resolveRoleStateResponse } from "./_lib/role-state-response.js";
import { careerRoles } from "../scripts/careers-roles.js";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function setAuthoritativeHeaders(req, res) {
  for (const [name, value] of Object.entries(ROLE_STATE_CACHE_HEADERS)) res.setHeader(name, value);
  applyBrowserCors(req, res, "GET, OPTIONS");
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

    const requestUrl = new URL(req.url || "/api/role-state", `http://${req.headers?.host || "localhost"}`);
    const { statusCode, payload } = resolveRoleStateResponse({
      serverNow: now(),
      roles,
      slug: requestUrl.searchParams.get("role"),
    });
    sendJson(res, statusCode, payload);
  };
}

export default createRoleStateHandler();
