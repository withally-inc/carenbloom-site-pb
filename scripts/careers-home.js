import { fetchRoleState } from "./api-endpoints.js";

const FALLBACK_REFRESH_MS = 15 * 60 * 1000;
const MIN_REFRESH_MS = 1000;

const careerGroups = [
  { id: "source-build", index: "01", label: "Source & Build" },
  { id: "launch", index: "02", label: "Launch" },
  { id: "scale", index: "03", label: "Scale" },
  { id: "platform", index: "—", label: "Platform" },
];

function roleRow(role) {
  const row = document.createElement("a");
  row.className = "job-row";
  row.href = `/careers/apply/?role=${encodeURIComponent(role.slug)}`;
  const name = document.createElement("span");
  name.className = "j-name";
  name.textContent = role.title;
  const location = document.createElement("span");
  location.className = "j-loc";
  location.textContent = role.locationType || "Remote";
  row.append(name, location);
  return row;
}

function roleGroup(group, roles, count) {
  const container = document.createElement("div");
  container.className = "job-group";
  const heading = document.createElement("div");
  heading.className = "job-group-head";
  const index = document.createElement("span");
  index.className = "g-index";
  index.textContent = group.index;
  const label = document.createElement("span");
  label.className = "g-name";
  label.textContent = group.label;
  const countChip = document.createElement("span");
  countChip.className = "count-chip";
  countChip.dataset.careerGroupCount = group.id;
  countChip.textContent = String(count);
  heading.append(index, label, countChip);
  container.append(heading, ...roles.map(roleRow));
  return container;
}

// The topbar chip is `flex: none` while the brand lockup is the flexible item, so any count label
// wider than the success one shrinks the Care & Bloom mark instead of the chip at 320px.
function applyCountSurfaces(root, { countLabel, countAccessibleLabel, statusLabel }) {
  root.querySelectorAll("[data-open-role-count]").forEach((element) => {
    element.textContent = countLabel;
    if (countAccessibleLabel) element.setAttribute("aria-label", countAccessibleLabel);
    else element.removeAttribute("aria-label");
  });
  root.querySelectorAll("[data-recruiting-status]").forEach((element) => {
    element.textContent = statusLabel;
  });
}

function statusMessage(text) {
  const message = document.createElement("p");
  message.className = "section-label careers-status";
  message.textContent = text;
  return message;
}

function renderRoleMarks(root, count) {
  const marks = root.querySelector("[data-role-marks]");
  if (!marks) return;
  const positions = Array.from({ length: count }, (_, index) => ({
    x: 5.5 + (index % 4) * 11,
    y: 5.5 + Math.floor(index / 4) * 10.5,
  }));
  const rows = Math.max(3, Math.ceil(count / 4));
  marks.setAttribute("viewBox", `0 0 44 ${(rows - 1) * 10.5 + 11}`);
  marks.replaceChildren(...positions.map(({ x, y }, index) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.classList.add("cb-mark");
    circle.style.setProperty("--i", String(index + 1));
    circle.setAttribute("cx", String(x));
    circle.setAttribute("cy", String(y));
    circle.setAttribute("r", "3.6");
    return circle;
  }));
  marks.setAttribute("aria-label", `${count} open roles, one mark each`);
}

function nextRefreshDelayMs(authoritative) {
  const serverNowMs = Date.parse(authoritative.serverNow);
  const boundaries = [
    Date.parse(authoritative.nextBoundaryAt),
    ...authoritative.roles.flatMap((role) => [
      Date.parse(role.state?.nextRefreshAt),
      Date.parse(role.state?.effectiveClosesAt),
    ]),
  ].filter((instant) => Number.isFinite(instant) && instant > serverNowMs);
  if (!boundaries.length) return FALLBACK_REFRESH_MS;
  return Math.max(MIN_REFRESH_MS, Math.min(...boundaries) - serverNowMs);
}

export async function initCareersHome(root = document, fetchImpl = fetch) {
  const list = root.querySelector("[data-careers-list]");
  const summary = root.querySelector("[data-careers-summary]");
  if (!list || !summary) return;

  try {
    const response = await fetchRoleState(undefined, fetchImpl);
    const authoritative = await response.json();
    if (!response.ok || authoritative.status !== "ok" || !Array.isArray(authoritative.roles)) {
      throw new Error("Role authority request failed.");
    }

    const count = authoritative.openRoleCount;
    applyCountSurfaces(root, {
      countLabel: `Open roles (${count})`,
      statusLabel: count > 0 ? "Actively recruiting" : "No current openings",
    });
    renderRoleMarks(root, count);
    summary.textContent = `(07) Careers · ${count} ${count === 1 ? "role" : "roles"} open`;
    const populatedGroups = careerGroups
      .map((group) => ({
        group,
        roles: authoritative.roles
          .filter((role) => role.careerGroup === group.id)
          .sort((left, right) => left.careerOrder - right.careerOrder),
        count: authoritative.groupCounts?.[group.id] || 0,
      }))
      .filter(({ roles }) => roles.length > 0);
    list.replaceChildren(...(populatedGroups.length
      ? populatedGroups.map(({ group, roles, count }) => roleGroup(group, roles, count))
      : [statusMessage("No current openings.")]));
    list.dataset.careersState = "ready";

    setTimeout(() => window.location.reload(), nextRefreshDelayMs(authoritative));
  } catch {
    applyCountSurfaces(root, {
      countLabel: "Unavailable",
      countAccessibleLabel: "Open roles unavailable",
      statusLabel: "Openings unavailable",
    });
    const marks = root.querySelector("[data-role-marks]");
    if (marks) {
      marks.replaceChildren();
      marks.setAttribute("aria-label", "Open-role count unavailable");
    }
    list.replaceChildren(statusMessage("Current openings are temporarily unavailable."));
    list.dataset.careersState = "unavailable";
    summary.textContent = "(07) Careers · Availability unavailable";
  }
}
