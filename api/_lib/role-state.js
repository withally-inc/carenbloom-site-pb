const DAY_MS = 24 * 60 * 60 * 1000;
const HKT_OFFSET_MS = 8 * 60 * 60 * 1000;
const CLOSED_STATUSES = new Set(["inactive", "filled"]);
const closeDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Hong_Kong",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const closeTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Hong_Kong",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function toInstant(value, message) {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) throw new RangeError(message);
  return instant;
}

function datePostedFor(windowStartMs) {
  return new Date(windowStartMs + HKT_OFFSET_MS).toISOString().slice(0, 10);
}

export function resolveRoleState(serverNowInput, role) {
  const serverNow = toInstant(serverNowInput, "A valid authoritative server instant is required.");
  if (!role || typeof role !== "object" || !role.slug) throw new TypeError("A canonical role is required.");

  const hktCalendar = new Date(serverNow.getTime() + HKT_OFFSET_MS);
  const daysSinceMonday = (hktCalendar.getUTCDay() + 6) % 7;
  const hktCalendarMidnight = Date.UTC(
    hktCalendar.getUTCFullYear(),
    hktCalendar.getUTCMonth(),
    hktCalendar.getUTCDate(),
  );
  const windowStartMs = hktCalendarMidnight - HKT_OFFSET_MS - daysSinceMonday * DAY_MS;
  const defaultClosesAtMs = windowStartMs + 14 * DAY_MS;
  let effectiveClosesAtMs = defaultClosesAtMs;

  if (role.closesAt !== undefined) {
    if (typeof role.closesAt !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(role.closesAt)) {
      throw new RangeError("Role closesAt must be a valid absolute closesAt instant.");
    }
    const factualClose = toInstant(role.closesAt, "Role closesAt must be a valid absolute closesAt instant.");
    effectiveClosesAtMs = Math.min(defaultClosesAtMs, factualClose.getTime());
  }

  const windowStart = new Date(windowStartMs).toISOString();
  const effectiveClosesAt = new Date(effectiveClosesAtMs).toISOString();
  const effectiveCloseInstant = new Date(effectiveClosesAtMs);
  const visibleCloseDate = closeDateFormatter.format(effectiveCloseInstant);
  const visibleCloseTime = closeTimeFormatter.format(effectiveCloseInstant);
  const lifecycleStatus = typeof role.status === "string" ? role.status.toLowerCase() : "open";

  return {
    windowStart,
    datePosted: datePostedFor(windowStartMs),
    defaultClosesAt: new Date(defaultClosesAtMs).toISOString(),
    effectiveClosesAt,
    validThrough: effectiveClosesAt,
    nextRefreshAt: new Date(windowStartMs + 7 * DAY_MS).toISOString(),
    visibleCloseDate,
    visibleCloseLabel: `Closes ${visibleCloseDate}`,
    applyLabel: `Apply for ${role.title} before applications close ${visibleCloseDate} at ${visibleCloseTime} HKT`,
    isOpen: !CLOSED_STATUSES.has(lifecycleStatus) && serverNow.getTime() < effectiveClosesAtMs,
  };
}
