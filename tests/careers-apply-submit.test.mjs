import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://localhost:49279";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1282, height: 964 } });
let capturedPayload = null;
let capturedContentType = null;
let capturedPostBody = null;
let capturedSubmissionUrl = null;
let submissionCount = 0;
// Hold the response open on an explicit signal instead of a fixed timer so the "disabled while
// pending" assertion below cannot race a short delay that has already elapsed under load.
let releaseSubmission;
const submissionPending = new Promise((resolve) => {
  releaseSubmission = resolve;
});

await page.route("**/api/applications", async (route) => {
  submissionCount += 1;
  capturedSubmissionUrl = route.request().url();
  capturedContentType = route.request().headers()["content-type"];
  capturedPostBody = route.request().postData() || "";
  const payloadMatch = capturedPostBody.match(/name="payload"\r\n\r\n([\s\S]*?)\r\n------/);
  capturedPayload = payloadMatch ? JSON.parse(payloadMatch[1]) : JSON.parse(capturedPostBody);
  await submissionPending;
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, ref: "CB-PLAYWRIGHT" }),
  });
});

await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "networkidle" });
await page.locator('[name="first_name"]').fill("Ada");
await page.locator('[name="last_name"]').fill("Lovelace");
await page.locator('[name="email"]').fill("ada@example.com");
await page.locator('[name="phone_country_code"]').selectOption("+1");
await page.locator('[name="phone_number"]').fill("5551234567");
await page.locator('[name="linkedin"]').fill("https://linkedin.com/in/ada");
await page.locator('[name="resume"]').setInputFiles({
  name: "cb-resume.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("resume"),
});
await page.locator('[name="intro_video_url"]').fill("https://www.loom.com/share/abc123");
await page.locator('[name="monthly_income_usd"]').fill("12000");
await page.locator('[name="open_time_zone"][value="US"]').check();
await page.locator('[name="open_time_zone"][value="Europe"]').check();
await page.locator('[name="location"]').selectOption("United States");
await page.locator('[name="role_question_1"]').fill("Answer one.");
await page.locator('[name="role_question_2"]').fill("Answer two.");
await page.locator('[name="role_question_3"]').fill("Answer three.");
await page.locator('.application-form button[type="submit"]').click();
await page.locator('.application-form button[type="submit"]').evaluate((button) => {
  if (!button.disabled) throw new Error("Submit button should be disabled while the request is pending.");
});
releaseSubmission();
await page.getByText("Application received. Reference: CB-PLAYWRIGHT.").waitFor();
await page.locator('.application-form button[type="submit"]').evaluate((button) => {
  if (button.disabled) throw new Error("Submit button should be enabled after submit completes.");
});

assert.equal(submissionCount, 1);
assert.equal(
  capturedSubmissionUrl,
  `${baseUrl}/api/applications`,
  "a locally served page must submit to the function it is served by, not to the production project",
);
assert.equal(capturedPayload.role, "Chief of Staff");
assert.match(capturedContentType, /^multipart\/form-data; boundary=/);
assert.match(capturedPostBody, /name="resume"; filename="cb-resume\.pdf"/);
assert.equal(capturedPayload.roleSlug, "chief-of-staff");
assert.equal(capturedPayload.firstName, "Ada");
assert.equal(capturedPayload.resume, "cb-resume.pdf");
assert.equal(capturedPayload.introVideoUrl, "https://www.loom.com/share/abc123");
assert.equal(capturedPayload.introVideoRequired, true);
assert.equal(capturedPayload.monthlyIncomeUsd, "12000");
assert.deepEqual(capturedPayload.timeZones, ["US", "Europe"]);
assert.equal(capturedPayload.location, "United States");
assert.equal(capturedPayload.questions.length, 3);
assert.equal(capturedPayload.questions[0].answer, "Answer one.");
assert.match(capturedPayload.questions[0].question, /complex cross-functional initiative/);

await page.goto(`${baseUrl}/careers/apply/?role=video-editor`, { waitUntil: "networkidle" });
await page.locator('[name="intro_video_url"]').evaluate((input) => {
  if (!input.required) throw new Error("Intro video should be required for video editor.");
});
await page.locator('[data-intro-video-label]').evaluate((label) => {
  if (label.textContent !== "Intro video*") throw new Error("Intro video label should show required state.");
});

await browser.close();
console.log("careers apply submit test passed");
