import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:49279";
const roles = [
  ["chief-of-staff", "Chief of Staff", "On-site, Hong Kong"],
  ["graphic-designer", "Graphic Designer", "Remote"],
  ["video-editor", "Video Editor", "Remote"],
  ["product-marketing-lead", "Product Marketing Lead", "Remote"],
  ["social-media-strategist", "Social Media Strategist", "Remote"],
  ["head-of-performance-marketing", "Head of Performance Marketing", "On-site, Hong Kong"],
  ["creative-strategist-performance-marketing", "Creative Strategist, Performance Marketing", "Remote"],
  ["product-project-manager", "Product & Project Manager", "On-site, Shenzhen, China"],
  ["growth-lead-mobile-apps", "Growth Lead, Mobile Apps", "Remote"],
  ["entrepreneur-in-residence", "Entrepreneur-in-Residence", "Remote"],
  ["ai-native-product-manager-apps", "AI-Native Product Manager, Apps", "Remote"],
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

async function readRole(slug) {
  const response = await page.goto(`${baseUrl}/careers/apply/?role=${slug}`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, `${slug} should render`);
  return page.evaluate(() => {
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((node) => JSON.parse(node.textContent || "{}"))
      .find((entry) => entry["@type"] === "JobPosting");
    return {
      title: document.querySelector("[data-role-title]")?.textContent?.trim(),
      heroLocation: document.querySelector(".role-hero .role-location")?.textContent?.trim(),
      detailLocation: document.querySelector(".role-meta dd")?.textContent?.trim(),
      description: document.querySelector('meta[name="description"]')?.content,
      openGraphDescription: document.querySelector('meta[property="og:description"]')?.content,
      jsonLd,
    };
  });
}

for (const [slug, title, location] of roles) {
  const result = await readRole(slug);
  const expectedDescription = `${title} — ${location} at Care & Bloom.`;
  assert.equal(result.title, title, `${slug} should render distinct role data`);
  assert.equal(result.heroLocation, location, `${slug} hero location should use canonical role data`);
  assert.equal(result.detailLocation, location, `${slug} accessible role details should agree with the hero`);
  assert.equal(result.description, expectedDescription, `${slug} meta description should agree with the visible location`);
  assert.equal(result.openGraphDescription, expectedDescription, `${slug} Open Graph description should agree with the visible location`);

  if (location === "Remote") {
    assert.equal(result.jsonLd.jobLocationType, "TELECOMMUTE", `${slug} should use remote JobPosting semantics`);
    assert.deepEqual(result.jsonLd.applicantLocationRequirements, { "@type": "Country", name: "Remote" });
    assert.equal("jobLocation" in result.jsonLd, false, `${slug} should not claim a physical location`);
  } else {
    assert.equal(result.jsonLd.jobLocation?.address?.addressLocality, location, `${slug} structured location should preserve the exact canonical location`);
    assert.equal("jobLocationType" in result.jsonLd, false, `${slug} should not use remote-only JobPosting semantics`);
    assert.equal("applicantLocationRequirements" in result.jsonLd, false, `${slug} should not claim remote applicant semantics`);
  }
}

await browser.close();
console.log("role location metadata tests passed");
