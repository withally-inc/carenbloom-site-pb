import assert from "node:assert/strict";
import { getClosingPresentation, getWeeklyClosingWindow } from "../scripts/careers-deadline.js";

const mondayHkt = new Date("2026-08-02T16:00:00.000Z");
const mondayWindow = getWeeklyClosingWindow(mondayHkt);

assert.equal(mondayWindow.deadline.toISOString(), "2026-08-16T16:00:00.000Z");
assert.equal(mondayWindow.remainingMs, 14 * 24 * 60 * 60 * 1000);

const sundayBeforeResetHkt = new Date("2026-08-09T15:59:59.000Z");
const sundayWindow = getWeeklyClosingWindow(sundayBeforeResetHkt);
assert.equal(sundayWindow.deadline.toISOString(), "2026-08-16T16:00:00.000Z");
assert.equal(sundayWindow.remainingMs, 7 * 24 * 60 * 60 * 1000 + 1000);

const nextMondayHkt = new Date("2026-08-09T16:00:00.000Z");
const nextMondayWindow = getWeeklyClosingWindow(nextMondayHkt);
assert.equal(nextMondayWindow.deadline.toISOString(), "2026-08-23T16:00:00.000Z");
assert.equal(nextMondayWindow.remainingMs, 14 * 24 * 60 * 60 * 1000);

const utcDateBoundary = getWeeklyClosingWindow(new Date("2026-08-02T23:59:59.000Z"));
assert.equal(utcDateBoundary.deadline.toISOString(), "2026-08-16T16:00:00.000Z");

const monthRollover = getWeeklyClosingWindow(new Date("2026-01-25T16:00:00.000Z"));
assert.equal(monthRollover.deadline.toISOString(), "2026-02-08T16:00:00.000Z");

const yearRollover = getWeeklyClosingWindow(new Date("2026-12-27T16:00:00.000Z"));
assert.equal(yearRollover.deadline.toISOString(), "2027-01-10T16:00:00.000Z");

const roleTitles = ["Chief of Staff", "Video Editor", "Product & Project Manager"];
const presentations = roleTitles.map((title) => getClosingPresentation(mondayHkt, title));
assert.deepEqual(new Set(presentations.map((presentation) => presentation.dateTime)).size, 1);
assert.equal(presentations[0].visibleLabel, "Closes August 17, 2026");
assert.equal(presentations[0].countdown, "14d 0h 0m 0s");
assert.equal(presentations[0].dateTime, "2026-08-16T16:00:00.000Z");
assert.equal(
  presentations[0].applyLabel,
  "Apply for Chief of Staff before applications close August 17, 2026 at 12:00 AM HKT",
);

console.log("weekly HKT closing policy test passed");
