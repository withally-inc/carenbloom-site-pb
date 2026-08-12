import assert from "node:assert/strict";
import { test } from "node:test";
import { createCloudflareApplicationsHandler } from "../functions/api/applications.js";

const upstreamUrl = "https://carenbloom-site-pb.vercel.app/api/applications";

test("the Cloudflare relay streams the unchanged multipart request and size-limit response", async () => {
  const boundary = "----care-and-bloom-boundary";
  const oversizedFile = Buffer.alloc(4 * 1024 * 1024 + 1, 0x61);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="resume.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
    oversizedFile,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const contentType = `multipart/form-data; boundary=${boundary}`;
  const seen = {};
  const handler = createCloudflareApplicationsHandler({
    fetchImpl: async (request) => {
      seen.url = request.url;
      seen.method = request.method;
      seen.contentType = request.headers.get("content-type");
      seen.origin = request.headers.get("origin");
      seen.body = Buffer.from(await request.arrayBuffer());
      return new Response(JSON.stringify({
        success: false,
        error: "Each file must be under 4 MB.",
      }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Origin": "https://carenbloom.com",
          "Content-Type": "application/json",
          Vary: "Origin",
        },
      });
    },
  });

  const response = await handler({
    request: new Request("https://carenbloom.com/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        Origin: "https://carenbloom.com",
      },
      body,
    }),
  });

  assert.equal(seen.url, upstreamUrl);
  assert.equal(seen.method, "POST");
  assert.equal(seen.contentType, contentType);
  assert.equal(seen.origin, "https://carenbloom.com");
  assert.deepEqual(seen.body, body, "the 4 MiB boundary must remain authoritative at Vercel");
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://carenbloom.com");
  assert.equal(response.headers.get("vary"), "Origin");
  assert.deepEqual(await response.json(), {
    success: false,
    error: "Each file must be under 4 MB.",
  });
});

test("the Cloudflare relay leaves method rejection to the Vercel handler", async () => {
  const handler = createCloudflareApplicationsHandler({
    fetchImpl: async (request) => {
      assert.equal(request.url, upstreamUrl);
      assert.equal(request.method, "GET");
      return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), {
        status: 405,
        headers: {
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Content-Type": "application/json",
          Vary: "Origin",
        },
      });
    },
  });

  const response = await handler({
    request: new Request("https://carenbloom.com/api/applications", {
      headers: { Origin: "https://attacker.example" },
    }),
  });

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("access-control-allow-methods"), "POST, OPTIONS");
  assert.equal(response.headers.get("access-control-allow-headers"), "Content-Type");
  assert.equal(response.headers.get("access-control-allow-origin"), null, "the relay must not widen application CORS");
  assert.equal(response.headers.get("vary"), "Origin");
  assert.deepEqual(await response.json(), { success: false, error: "Method not allowed." });
});
