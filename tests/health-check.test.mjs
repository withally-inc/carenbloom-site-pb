import assert from "node:assert/strict";
import { test } from "node:test";
import { APPLICATION_HEALTH_URL, probeApplicationAPI } from "../api/health.js";

function recordingFetch(response) {
  const seen = {};
  const fetchImpl = async (url, init) => {
    seen.url = url;
    seen.method = init.method;
    seen.contentType = init.headers["Content-Type"];
    seen.payload = JSON.parse(init.body);
    if (response instanceof Error) throw response;
    return response;
  };
  return { seen, fetchImpl };
}

test("the application health check probes the same-origin production route, never Vercel directly", async () => {
  assert.equal(APPLICATION_HEALTH_URL, "https://carenbloom.com/api/applications");
  assert.ok(!APPLICATION_HEALTH_URL.includes("vercel.app"), "the cron must exercise the applicant-facing relay");

  const { seen, fetchImpl } = recordingFetch(new Response(JSON.stringify({
    success: false,
    error: "Missing required field: lastName",
  }), { status: 400, headers: { "Content-Type": "application/json" } }));

  const entry = await probeApplicationAPI(fetchImpl);

  assert.equal(seen.url, APPLICATION_HEALTH_URL);
  assert.equal(seen.method, "POST");
  assert.equal(seen.contentType, "application/json");
  assert.deepEqual(entry, { icon: "✅", label: "Application API + Notion", detail: "API responding and validating" });
});

test("the health check payload stays incomplete so it can never create an applicant record", async () => {
  const { seen, fetchImpl } = recordingFetch(new Response(JSON.stringify({
    success: false,
    error: "Missing required field: lastName",
  }), { status: 400, headers: { "Content-Type": "application/json" } }));

  await probeApplicationAPI(fetchImpl);

  assert.deepEqual(seen.payload, {
    role: "Chief of Staff",
    roleSlug: "chief-of-staff",
    firstName: "HealthCheck",
    lastName: "",
  });
  assert.equal(seen.payload.email, undefined);
  assert.equal(seen.payload.questions, undefined);
});

test("a broken relay fails the health check instead of reporting healthy", async () => {
  const { fetchImpl } = recordingFetch(new Response("<!DOCTYPE html><title>Error 1101</title>", {
    status: 502,
    headers: { "Content-Type": "text/html" },
  }));

  const entry = await probeApplicationAPI(fetchImpl);

  assert.equal(entry.icon, "❌");
  assert.equal(entry.detail, "Notion unreachable");
});

test("a missing relay route fails the health check instead of reporting healthy", async () => {
  const { fetchImpl } = recordingFetch(new Response("<!DOCTYPE html><title>Not found</title>", {
    status: 404,
    headers: { "Content-Type": "text/html" },
  }));

  const entry = await probeApplicationAPI(fetchImpl);

  assert.equal(entry.icon, "❌");
  assert.equal(entry.detail, "HTTP 404: unexpected");
});

test("upstream Notion and transport failures still fail the health check", async () => {
  const missingToken = await probeApplicationAPI(recordingFetch(new Response(JSON.stringify({
    success: false,
    error: "Server misconfigured.",
  }), { status: 500, headers: { "Content-Type": "application/json" } })).fetchImpl);
  assert.deepEqual(missingToken, {
    icon: "❌",
    label: "Application API + Notion",
    detail: "Notion token missing or expired",
  });

  const transport = await probeApplicationAPI(recordingFetch(new TypeError("fetch failed")).fetchImpl);
  assert.deepEqual(transport, {
    icon: "❌",
    label: "Application API + Notion",
    detail: "fetch failed",
  });
});
