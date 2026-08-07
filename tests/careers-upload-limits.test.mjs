import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://localhost:49279";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1282, height: 964 } });
let submissionCount = 0;

await page.route("**/api/applications", async (route) => {
  submissionCount += 1;
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, ref: "CB-UPLOAD-LIMIT" }),
  });
});

async function prepareForm() {
  await page.goto(`${baseUrl}/careers/apply/?role=chief-of-staff`, { waitUntil: "networkidle" });
  await page.locator('[name="first_name"]').fill("Ada");
  await page.locator('[name="last_name"]').fill("Lovelace");
  await page.locator('[name="email"]').fill("ada@example.com");
  await page.locator('[name="phone_country_code"]').selectOption("+1");
  await page.locator('[name="phone_number"]').fill("5551234567");
  await page.locator('[name="intro_video_url"]').fill("https://www.loom.com/share/abc123");
  await page.locator('[name="monthly_income_usd"]').fill("12000");
  await page.locator('[name="open_time_zone"][value="US"]').check();
  await page.locator('[name="location"]').selectOption("United States");
  await page.locator('[name="role_question_1"]').fill("Answer one.");
  await page.locator('[name="role_question_2"]').fill("Answer two.");
  await page.locator('[name="role_question_3"]').fill("Answer three.");
}

try {
  await prepareForm();
  await page.locator('[name="resume"]').setInputFiles({
    name: "under-limit.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(4 * 1024 * 1024 - 1),
  });
  await page.locator('.application-form button[type="submit"]').click();
  await page.getByText("Application received. Reference: CB-UPLOAD-LIMIT.").waitFor();
  assert.equal(submissionCount, 1, "a file just under 4 MB should be submitted");

  await prepareForm();
  await page.locator('[name="resume"]').setInputFiles({
    name: "over-limit.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(4 * 1024 * 1024 + 1),
  });
  await page.locator('.application-form button[type="submit"]').click();
  await page.getByText("Each file must be under 4 MB.").waitFor();
  assert.equal(submissionCount, 1, "a file just over 4 MB should not be submitted");

  await prepareForm();
  await page.locator('[name="resume"]').setInputFiles({
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  });
  await page.locator('[name="additional_attachment"]').setInputFiles({
    name: "work-sample.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(2 * 1024 * 1024),
  });
  await page.locator('.application-form button[type="submit"]').click();
  await page.getByText("Your files together are too large. Keep their combined size under 4 MB.").waitFor();
  assert.equal(submissionCount, 1, "two files over the combined limit should not be submitted");
} finally {
  await browser.close();
}

const applicationPayload = {
  role: "Chief of Staff",
  roleSlug: "chief-of-staff",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phoneCountryCode: "+1",
  phoneNumber: "5551234567",
  introVideoUrl: "https://www.loom.com/share/abc123",
  monthlyIncomeUsd: "12000",
  timeZones: ["US"],
  location: "United States",
};

async function postFiles(files) {
  const body = new FormData();
  body.append("payload", JSON.stringify(applicationPayload));
  for (const [name, size] of files) {
    body.append(name, new File([Buffer.alloc(size)], `${name}.pdf`, { type: "application/pdf" }));
  }
  const response = await fetch(`${baseUrl}/api/applications`, { method: "POST", body });
  return { response, result: await response.json() };
}

{
  const { response, result } = await postFiles([["resume", 4 * 1024 * 1024 - 1]]);
  assert.equal(response.status, 200, "the server should accept a file just under 4 MB");
  assert.equal(result.success, true);
}

{
  const { response, result } = await postFiles([["resume", 4 * 1024 * 1024 + 1]]);
  assert.equal(response.status, 400, "the server should reject a file just over 4 MB");
  assert.equal(result.error, "Each file must be under 4 MB.");
}

{
  const { response, result } = await postFiles([
    ["resume", 2 * 1024 * 1024 + 1],
    ["additional_attachment", 2 * 1024 * 1024],
  ]);
  assert.equal(response.status, 400, "the server should reject two files over the combined limit");
  assert.equal(result.error, "Your files together are too large. Keep their combined size under 4 MB.");
}

console.log("careers upload limits test passed");
