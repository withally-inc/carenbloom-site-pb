import { ROLE_STATE_CACHE_HEADERS, resolveRoleStateResponse } from "../../api/_lib/role-state-response.js";
import { careerRoles } from "../../scripts/careers-roles.js";

function jsonResponse(status, payload, headers) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders });
}

export function createCloudflareRoleStateHandler({ now = () => new Date(), roles = careerRoles } = {}) {
  return async function cloudflareRoleStateHandler({ request }) {
    const headers = new Headers(ROLE_STATE_CACHE_HEADERS);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "GET") {
      headers.set("Allow", "GET, OPTIONS");
      return jsonResponse(405, { status: "error", error: "Method not allowed." }, headers);
    }

    const requestUrl = new URL(request.url);
    const { statusCode, payload } = resolveRoleStateResponse({
      serverNow: now(),
      roles,
      slug: requestUrl.searchParams.get("role"),
    });
    return jsonResponse(statusCode, payload, headers);
  };
}

export const onRequest = createCloudflareRoleStateHandler();
