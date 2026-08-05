import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import handler, { _private } from "../api/applications.js";
import { careerRoles } from "../scripts/careers-roles.js";

function samplePayload(overrides = {}) {
  return {
    role: "Chief of Staff",
    roleSlug: "chief-of-staff",
    firstName: "Ada",
    lastName: "Lovelace",
    name: "Ada Lovelace",
    email: "Ada@Example.com",
    phoneCountryCode: "+1",
    phoneNumber: "5551234567",
    linkedIn: "https://linkedin.com/in/ada",
    resume: "ada-resume.pdf",
    introVideoUrl: "https://www.loom.com/share/abc123",
    additionalAttachment: "ada-case-study.pdf",
    monthlyIncomeUsd: "12000",
    timeZones: ["US"],
    location: "New York, NY",
    url: "https://careandbloom.com/talents/apply/?role=chief-of-staff",
    submittedAt: "2026-06-08T12:00:00.000Z",
    questions: [
      { question: "Prompt one?", answer: "Answer one." },
      { question: "Prompt two?", answer: "Answer two." },
      { question: "Prompt three?", answer: "Answer three." },
    ],
    ...overrides,
  };
}

function makeReq(body, method = "POST") {
  const req = new EventEmitter();
  req.method = method;
  req.body = body;
  req[Symbol.asyncIterator] = async function* () {};
  return req;
}

function makeMultipartReq(formData, method = "POST") {
  const req = new EventEmitter();
  req.method = method;
  req.headers = {};
  req.body = formData;
  req[Symbol.asyncIterator] = async function* () {};
  return req;
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(value = "") {
      this.body += value;
    },
  };
}

async function runHandler(body, env = {}, fetchImpl = async () => ({ ok: true, text: async () => "{}" })) {
  const oldEnv = { ...process.env };
  const oldFetch = global.fetch;
  process.env = { ...oldEnv, ...env };
  global.fetch = fetchImpl;
  const res = makeRes();
  try {
    await handler(makeReq(body), res);
    return { res, json: JSON.parse(res.body) };
  } finally {
    process.env = oldEnv;
    global.fetch = oldFetch;
  }
}

async function runMultipartHandler(formData, env = {}, fetchImpl = async () => ({ ok: true, text: async () => "{}" })) {
  const oldEnv = { ...process.env };
  const oldFetch = global.fetch;
  process.env = { ...oldEnv, ...env };
  global.fetch = fetchImpl;
  const res = makeRes();
  try {
    await handler(makeMultipartReq(formData), res);
    return { res, json: JSON.parse(res.body) };
  } finally {
    process.env = oldEnv;
    global.fetch = oldFetch;
  }
}

assert.equal(_private.validatePayload(samplePayload({ email: "bad" })).error, "Enter a valid email address.");
assert.equal(_private.validatePayload(samplePayload({ monthlyIncomeUsd: "12k" })).error, "Monthly income must be numbers only.");
assert.equal(_private.validatePayload(samplePayload({ timeZones: ["Mars"] })).error, "Choose a valid time zone.");
assert.equal(_private.validatePayload(samplePayload({ introVideoUrl: "not-a-url" })).error, "Enter a valid intro video URL.");
assert.equal(_private.validatePayload(samplePayload({ roleSlug: "video-editor", introVideoUrl: "" })).error, "Intro video is required for this role.");
assert.equal(_private.validatePayload(samplePayload({ roleSlug: "chief-of-staff", introVideoUrl: "" })).error, "Intro video is required for this role.");
assert.equal(_private.validatePayload(samplePayload({ roleSlug: "entrepreneur-in-residence", introVideoUrl: "" })).error, "Intro video is required for this role.");
assert.equal(
  _private.validatePayload(samplePayload({ roleSlug: "social-media-strategist", introVideoUrl: "", introVideoRequired: false })).error,
  "Intro video is required for this role.",
  "a client-supplied flag must not relax the canonical role requirement"
);
assert.equal(_private.validatePayload(samplePayload({ roleSlug: "social-media-manager" })).error, "Unknown role.");
for (const role of careerRoles) {
  assert.equal(
    _private.validatePayload(samplePayload({ role: role.title, roleSlug: role.slug, introVideoUrl: "" })).error,
    role.introVideoRequired ? "Intro video is required for this role." : undefined,
    `${role.slug} intro video enforcement should follow canonical role data`
  );
}
assert.equal(_private.validatePayload(samplePayload({ questions: [{ question: "One", answer: "" }] })).error, "Missing required answer: role question 1");
assert.equal(
  _private.validatePayload(samplePayload({
    files: {
      resume: { arrayBuffer() {}, size: 8 * 1024 * 1024 + 1, name: "huge-resume.pdf" },
    },
  })).error,
  "Keep file uploads under 8 MB each."
);

{
  const { res, json } = await runHandler(samplePayload(), { NOTION_INTAKE_DRY_RUN: "1" });
  assert.equal(res.statusCode, 200);
  assert.equal(json.success, true);
  assert.equal(json.dryRun, true);
  assert.match(json.ref, /^CB-/);
}

{
  const calls = [];
  const { res, json } = await runHandler(
    samplePayload({ applicationRef: "CB-TEST" }),
    { NOTION_KEY: "secret_test", NOTION_CB_TALENTS_DB_ID: "target-db" },
    async (url, options) => {
      calls.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
      return { ok: true, text: async () => JSON.stringify({ id: "notion-page-id" }) };
    }
  );
  assert.equal(res.statusCode, 200);
  assert.equal(json.success, true);
  assert.equal(json.notionPageId, "notion-page-id");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.parent.database_id, "target-db");
  assert.equal(calls[0].body.applicationRef, undefined);
  assert.equal(calls[0].body.properties["Application Ref"].rich_text[0].text.content, "CB-TEST");
  assert.equal(calls[0].body.properties["Intro Video"].url, "https://www.loom.com/share/abc123");
  assert.deepEqual(calls[0].body.properties["Time Zone"].multi_select.map((item) => item.name), ["US"]);
  assert.equal(calls[0].body.properties["Question 1"].rich_text[0].text.content, "Prompt one?");
  assert.equal(calls[0].body.properties["Answer 1"].rich_text[0].text.content, "Answer one.");
}

{
  const calls = [];
  const formData = new FormData();
  formData.append("payload", JSON.stringify(samplePayload({ applicationRef: "CB-FILES" })));
  formData.append("resume", new File(["resume bytes"], "ada-resume.pdf", { type: "application/pdf" }));
  formData.append("additional_attachment", new File(["case study"], "ada-case-study.pdf", { type: "application/pdf" }));
  const { res, json } = await runMultipartHandler(
    formData,
    { NOTION_KEY: "secret_test", NOTION_CB_TALENTS_DB_ID: "target-db" },
    async (url, options) => {
      calls.push({ url, options, body: options.body instanceof FormData ? options.body : options.body ? JSON.parse(options.body) : null });
      if (url.endsWith("/file_uploads")) {
        const index = calls.filter((call) => call.url.endsWith("/file_uploads")).length;
        return { ok: true, text: async () => JSON.stringify({ id: `upload-${index}`, upload_url: `https://api.notion.com/v1/file_uploads/upload-${index}/send`, status: "pending" }) };
      }
      if (url.includes("/file_uploads/") && url.endsWith("/send")) {
        return { ok: true, text: async () => JSON.stringify({ status: "uploaded" }) };
      }
      return { ok: true, text: async () => JSON.stringify({ id: "notion-page-id" }) };
    }
  );
  assert.equal(res.statusCode, 200);
  assert.equal(json.success, true);
  assert.equal(calls[0].url.endsWith("/file_uploads"), true);
  assert.equal(calls[1].url.endsWith("/file_uploads"), true);
  assert.equal(calls.filter((call) => call.url.endsWith("/file_uploads")).length, 2);
  assert.equal(calls.filter((call) => call.url.includes("/file_uploads/") && call.url.endsWith("/send")).length, 2);
  const pageCall = calls.at(-1);
  assert.equal(pageCall.body.properties.Resume.files[0].type, "file_upload");
  assert.equal(pageCall.body.properties.Resume.files[0].file_upload.id, "upload-1");
  assert.equal(pageCall.body.properties["Additional Attachment"].files[0].file_upload.id, "upload-2");
}

console.log("applications api test passed");
