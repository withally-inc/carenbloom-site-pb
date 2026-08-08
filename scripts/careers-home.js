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

function renderRoleMarks(root, count) {
  const marks = root.querySelector("[data-role-marks]");
  if (!marks) return;
  const positions = Array.from({ length: count }, (_, index) => ({
    x: 5.5 + (index % 4) * 11,
    y: [5.5, 16, 26.5][Math.floor(index / 4)] || 26.5,
  }));
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

export async function initCareersHome(root = document, fetchImpl = fetch) {
  const list = root.querySelector("[data-careers-list]");
  const summary = root.querySelector("[data-careers-summary]");
  if (!list || !summary) return;

  try {
    const response = await fetchImpl("/api/role-state", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const authoritative = await response.json();
    if (!response.ok || authoritative.status !== "ok" || !Array.isArray(authoritative.roles)) {
      throw new Error("Role authority request failed.");
    }

    const count = authoritative.openRoleCount;
    root.querySelectorAll("[data-open-role-count]").forEach((element) => {
      element.textContent = `Open roles (${count})`;
    });
    root.querySelectorAll("[data-recruiting-status]").forEach((element) => {
      element.textContent = count > 0 ? "Actively recruiting" : "No current openings";
    });
    renderRoleMarks(root, count);
    summary.textContent = `(07) Careers · ${count} ${count === 1 ? "role" : "roles"} open`;
    list.replaceChildren(...careerGroups.map((group) => {
      const roles = authoritative.roles
        .filter((role) => role.careerGroup === group.id)
        .sort((left, right) => left.careerOrder - right.careerOrder);
      return roleGroup(group, roles, authoritative.groupCounts?.[group.id] || 0);
    }));
    list.dataset.careersState = "ready";

    const boundaryMs = Math.min(...authoritative.roles.flatMap((role) => [
      Date.parse(role.state.nextRefreshAt),
      Date.parse(role.state.effectiveClosesAt),
    ])) - Date.parse(authoritative.serverNow);
    if (Number.isFinite(boundaryMs)) setTimeout(() => window.location.reload(), Math.max(0, boundaryMs));
  } catch {
    list.replaceChildren();
    const message = document.createElement("p");
    message.className = "section-label careers-status";
    message.textContent = "Current openings are temporarily unavailable.";
    list.append(message);
    list.dataset.careersState = "unavailable";
    summary.textContent = "(07) Careers · Availability unavailable";
  }
}
