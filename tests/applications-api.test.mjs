import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import handler, { _private, createApplicationsHandler } from "../api/applications.js";
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

async function runHandler(
  body,
  env = {},
  fetchImpl = async () => ({ ok: true, text: async () => "{}" }),
  handlerImpl = handler,
) {
  const oldEnv = { ...process.env };
  const oldFetch = global.fetch;
  process.env = { ...oldEnv, ...env };
  global.fetch = fetchImpl;
  const res = makeRes();
  try {
    await handlerImpl(makeReq(body), res);
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
      resume: { arrayBuffer() {}, size: 4 * 1024 * 1024 - 1, name: "under-limit-resume.pdf" },
    },
  })).error,
  undefined,
  "a file just under the per-file limit should be accepted"
);
assert.equal(
  _private.validatePayload(samplePayload({
    files: {
      resume: { arrayBuffer() {}, size: 4 * 1024 * 1024 + 1, name: "over-limit-resume.pdf" },
    },
  })).error,
  "Each file must be under 4 MB.",
  "a file just over the per-file limit should be rejected"
);
assert.equal(
  _private.validatePayload(samplePayload({
    files: {
      resume: { arrayBuffer() {}, size: 2 * 1024 * 1024 + 1, name: "resume.pdf" },
      additionalAttachment: { arrayBuffer() {}, size: 2 * 1024 * 1024, name: "work-sample.pdf" },
    },
  })).error,
  "Your files together are too large. Keep their combined size under 4 MB.",
  "two individually valid files over the combined limit should be rejected"
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

{
  const factualClose = "2026-08-12T10:00:00.000Z";
  const closingRoles = careerRoles.map((role) => role.slug === "chief-of-staff" ? { ...role, closesAt: factualClose } : role);
  const justBeforeHandler = createApplicationsHandler({
    now: () => new Date("2026-08-12T09:59:59.999Z"),
    roles: closingRoles,
  });
  const { res, json } = await runHandler(
    samplePayload({ datePosted: "1900-01-01", validThrough: "2999-01-01T00:00:00.000Z", isOpen: false }),
    { NOTION_INTAKE_DRY_RUN: "1" },
    undefined,
    justBeforeHandler,
  );
  assert.equal(res.statusCode, 200, "an otherwise valid application is accepted immediately before factual close");
  assert.equal(json.success, true);
}

{
  const authoritativeNow = "2026-08-12T09:00:00.000Z";
  const authoritativeHandler = createApplicationsHandler({ now: () => new Date(authoritativeNow) });
  const notionCalls = [];
  const { res } = await runHandler(
    samplePayload({ submittedAt: "1900-01-01T00:00:00.000Z", datePosted: "2999-01-01", isOpen: true }),
    { NOTION_KEY: "secret_test", NOTION_CB_TALENTS_DB_ID: "target-db" },
    async (url, options) => {
      notionCalls.push({ url, body: options.body ? JSON.parse(options.body) : null });
      return { ok: true, text: async () => JSON.stringify({ id: "notion-page-id" }) };
    },
    authoritativeHandler,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(notionCalls.length, 1);
  assert.equal(
    notionCalls[0].body.properties["Applied At"].date.start,
    authoritativeNow,
    "the server instant must replace every client-supplied date before Notion",
  );
}

for (const serverNow of ["2026-08-12T10:00:00.000Z", "2026-08-12T10:00:00.001Z"]) {
  const factualClose = "2026-08-12T10:00:00.000Z";
  const closingRoles = careerRoles.map((role) => role.slug === "chief-of-staff" ? { ...role, closesAt: factualClose } : role);
  const closedHandler = createApplicationsHandler({ now: () => new Date(serverNow), roles: closingRoles });
  const notionCalls = [];
  const { res, json } = await runHandler(
    samplePayload({ datePosted: "2999-01-01", validThrough: "2999-02-01T00:00:00.000Z", isOpen: true }),
    { NOTION_KEY: "secret_test" },
    async (...args) => {
      notionCalls.push(args);
      return { ok: true, text: async () => "{}" };
    },
    closedHandler,
  );
  assert.equal(res.statusCode, 410, `${serverNow} should reject the closed role`);
  assert.equal(json.success, false);
  assert.equal(json.error, "This role is closed.");
  assert.equal(notionCalls.length, 0, "a closed role must perform no Notion activity");
}

{
  const filledRoles = careerRoles.map((role) => role.slug === "chief-of-staff" ? { ...role, status: "filled" } : role);
  const filledHandler = createApplicationsHandler({ now: () => new Date("2026-08-12T09:00:00.000Z"), roles: filledRoles });
  const notionCalls = [];
  const { res } = await runHandler(
    samplePayload({ isOpen: true }),
    { NOTION_KEY: "secret_test" },
    async (...args) => {
      notionCalls.push(args);
      return { ok: true, text: async () => "{}" };
    },
    filledHandler,
  );
  assert.equal(res.statusCode, 410);
  assert.equal(notionCalls.length, 0);
}

async function preflight(origin) {
  const req = makeReq(undefined, "OPTIONS");
  req.headers = origin ? { origin } : {};
  const res = makeRes();
  await handler(req, res);
  return res;
}

for (const origin of ["https://carenbloom.com", "https://www.carenbloom.com"]) {
  const res = await preflight(origin);
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers["Access-Control-Allow-Origin"], origin);
  assert.equal(res.headers["Access-Control-Allow-Methods"], "POST, OPTIONS");
  assert.equal(res.headers.Vary, "Origin");
}

for (const origin of ["https://carenbloom.com.attacker.test", "http://carenbloom.com", undefined]) {
  const res = await preflight(origin);
  assert.equal(res.headers["Access-Control-Allow-Origin"], undefined, `${origin} must not be allowed to submit applications`);
  assert.equal(res.headers.Vary, "Origin");
}

console.log("applications api test passed");
