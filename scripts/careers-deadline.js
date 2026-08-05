const DAY_MS = 24 * 60 * 60 * 1000;
export const CAREERS_TIME_ZONE = "Asia/Hong_Kong";

const zonedPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAREERS_TIME_ZONE,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const closingDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CAREERS_TIME_ZONE,
  month: "long",
  day: "numeric",
  year: "numeric",
});

const weekdayIndex = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function getZonedParts(date) {
  return Object.fromEntries(zonedPartsFormatter.formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, part.value]));
}

function getTimeZoneOffsetMs(date) {
  const parts = getZonedParts(date);
  const representedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return representedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function zonedMidnightToInstant(year, month, day) {
  const utcCalendarDate = new Date(Date.UTC(year, month - 1, day));
  const normalizedUtcMidnight = Date.UTC(
    utcCalendarDate.getUTCFullYear(),
    utcCalendarDate.getUTCMonth(),
    utcCalendarDate.getUTCDate(),
  );
  const guess = new Date(normalizedUtcMidnight);
  return new Date(normalizedUtcMidnight - getTimeZoneOffsetMs(guess));
}

export function getWeeklyClosingWindow(nowInput) {
  const now = new Date(nowInput);
  if (Number.isNaN(now.getTime())) throw new RangeError("A valid current time is required.");

  const parts = getZonedParts(now);
  const reset = zonedMidnightToInstant(
    Number(parts.year),
    Number(parts.month),
    Number(parts.day) - weekdayIndex[parts.weekday],
  );
  const deadline = new Date(reset.getTime() + 14 * DAY_MS);

  return {
    reset,
    deadline,
    remainingMs: deadline.getTime() - now.getTime(),
  };
}

function formatCountdown(remainingMs) {
  const totalSeconds = Math.floor(Math.max(0, remainingMs) / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export function getClosingPresentation(nowInput, roleTitle) {
  const window = getWeeklyClosingWindow(nowInput);
  const visibleDate = closingDateFormatter.format(window.deadline);

  return {
    ...window,
    visibleDate,
    visibleLabel: `Closes ${visibleDate}`,
    countdown: formatCountdown(window.remainingMs),
    dateTime: window.deadline.toISOString(),
    applyLabel: `Apply for ${roleTitle} before applications close ${visibleDate} at 12:00 AM HKT`,
  };
}
