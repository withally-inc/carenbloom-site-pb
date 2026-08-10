const SITE_URL = process.env.SITE_URL || "https://carenbloom.com";
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL_CNB_RECRUITMENT;

const checks = [];

function log(icon, label, detail) {
  checks.push({ icon, label, detail, failed: icon === "\u274c" });
}

async function checkSiteReachable() {
  try {
    const res = await fetch(`${SITE_URL}/`, { method: "HEAD" });
    log(res.ok ? "\u2705" : "\u274c", "Site reachable", `HTTP ${res.status}`);
  } catch (error) {
    log("\u274c", "Site reachable", error.message);
  }
}

async function checkApplyPages() {
  for (const slug of ["chief-of-staff", "graphic-designer", "video-editor"]) {
    try {
      const res = await fetch(`${SITE_URL}/careers/apply/?role=${slug}`);
      if (res.ok) {
        const html = await res.text();
        log(html.includes('id="application-form"') ? "\u2705" : "\u274c", `Apply page (${slug})`, html.includes('id="application-form"') ? "OK" : "Form missing");
      } else {
        log("\u274c", `Apply page (${slug})`, `HTTP ${res.status}`);
      }
    } catch (error) {
      log("\u274c", `Apply page (${slug})`, error.message);
    }
  }
}

async function checkApplicationAPI() {
  // Send incomplete payload to verify API is responding without creating Notion entries
  const payload = {
    role: "Chief of Staff",
    roleSlug: "chief-of-staff",
    firstName: "HealthCheck",
    lastName: "",
  };

  try {
    const res = await fetch(`https://carenbloom-site-pb.vercel.app/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 400 && data.error?.includes("Missing required field")) {
      log("\u2705", "Application API + Notion", "API responding and validating");
    } else if (res.status === 500) {
      log("\u274c", "Application API + Notion", "Notion token missing or expired");
    } else if (res.status === 502) {
      log("\u274c", "Application API + Notion", data.error || "Notion unreachable");
    } else {
      log("\u274c", "Application API + Notion", `HTTP ${res.status}: ${data.error || "unexpected"}`);
    }
  } catch (error) {
    log("\u274c", "Application API + Notion", error.message);
  }
}

async function sendSlackAlert(failures) {
  if (!SLACK_WEBHOOK || failures.length === 0) return;
  const lines = failures.map((c) => `\u274c *${c.label}*: ${c.detail}`).join("\n");
  const text = `\u26a0\ufe0f *C&B Careers Health Check Failed*\n\n${lines}\n\nCandidates may be unable to apply. <${SITE_URL}/#careers|Check site>`;
  try {
    await fetch(SLACK_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Slack itself is down — nothing we can do
  }
}

export default async function handler(req, res) {
  checks.length = 0;
  await checkSiteReachable();
  await checkApplyPages();
  await checkApplicationAPI();

  const failures = checks.filter((c) => c.failed);
  await sendSlackAlert(failures);

  res.statusCode = failures.length > 0 ? 503 : 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({
    status: failures.length > 0 ? "unhealthy" : "healthy",
    checks: checks.map((c) => ({ status: c.icon, check: c.label, detail: c.detail })),
    timestamp: new Date().toISOString(),
  }));
}
