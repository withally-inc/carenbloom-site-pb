import assert from "node:assert/strict";
import { resolveRoleState } from "../api/_lib/role-state.js";

const openRole = { slug: "test-role", title: "Test Role" };
const DAY_MS = 24 * 60 * 60 * 1000;

const cases = [
  {
    name: "Sunday 23:59:59 HKT retains the preceding Monday window",
    now: "2026-08-09T15:59:59.000Z",
    windowStart: "2026-08-02T16:00:00.000Z",
    datePosted: "2026-08-03",
    validThrough: "2026-08-16T16:00:00.000Z",
    nextRefreshAt: "2026-08-09T16:00:00.000Z",
  },
  {
    name: "Monday 00:00:00 HKT begins the new window",
    now: "2026-08-09T16:00:00.000Z",
    windowStart: "2026-08-09T16:00:00.000Z",
    datePosted: "2026-08-10",
    validThrough: "2026-08-23T16:00:00.000Z",
    nextRefreshAt: "2026-08-16T16:00:00.000Z",
  },
  {
    name: "UTC midnight after the HKT boundary does not refresh again",
    now: "2026-08-10T00:00:00.000Z",
    windowStart: "2026-08-09T16:00:00.000Z",
    datePosted: "2026-08-10",
    validThrough: "2026-08-23T16:00:00.000Z",
    nextRefreshAt: "2026-08-16T16:00:00.000Z",
  },
  {
    name: "the following Monday advances exactly seven days",
    now: "2026-08-16T16:00:00.000Z",
    windowStart: "2026-08-16T16:00:00.000Z",
    datePosted: "2026-08-17",
    validThrough: "2026-08-30T16:00:00.000Z",
    nextRefreshAt: "2026-08-23T16:00:00.000Z",
  },
  {
    name: "a second successive Monday advances another seven days",
    now: "2026-08-23T16:00:00.000Z",
    windowStart: "2026-08-23T16:00:00.000Z",
    datePosted: "2026-08-24",
    validThrough: "2026-09-06T16:00:00.000Z",
    nextRefreshAt: "2026-08-30T16:00:00.000Z",
  },
  {
    name: "month rollover retains the HKT Monday calendar date",
    now: "2026-01-25T16:00:00.000Z",
    windowStart: "2026-01-25T16:00:00.000Z",
    datePosted: "2026-01-26",
    validThrough: "2026-02-08T16:00:00.000Z",
    nextRefreshAt: "2026-02-01T16:00:00.000Z",
  },
  {
    name: "year rollover retains the HKT Monday calendar date",
    now: "2026-12-27T16:00:00.000Z",
    windowStart: "2026-12-27T16:00:00.000Z",
    datePosted: "2026-12-28",
    validThrough: "2027-01-10T16:00:00.000Z",
    nextRefreshAt: "2027-01-03T16:00:00.000Z",
  },
];

for (const testCase of cases) {
  const state = resolveRoleState(testCase.now, openRole);
  assert.equal(state.windowStart, testCase.windowStart, testCase.name);
  assert.equal(state.datePosted, testCase.datePosted, testCase.name);
  assert.equal(state.defaultClosesAt, testCase.validThrough, testCase.name);
  assert.equal(state.effectiveClosesAt, testCase.validThrough, testCase.name);
  assert.equal(state.validThrough, testCase.validThrough, testCase.name);
  assert.equal(state.nextRefreshAt, testCase.nextRefreshAt, testCase.name);
  assert.equal(state.isOpen, true, testCase.name);
  assert.equal(Date.parse(state.defaultClosesAt) - Date.parse(state.windowStart), 14 * DAY_MS, testCase.name);
}

const monday = "2026-08-09T16:00:00.000Z";
const mondayPresentation = resolveRoleState(monday, openRole);
assert.equal(mondayPresentation.visibleCloseDate, "August 24, 2026");
assert.equal(mondayPresentation.visibleCloseLabel, "Closes August 24, 2026");
assert.equal(
  mondayPresentation.applyLabel,
  "Apply for Test Role before applications close August 24, 2026 at 12:00 AM HKT",
);
const earlyClose = "2026-08-12T10:00:00.000Z";
const beforeEarlyClose = resolveRoleState("2026-08-12T09:59:59.999Z", { ...openRole, closesAt: earlyClose });
assert.equal(beforeEarlyClose.defaultClosesAt, "2026-08-23T16:00:00.000Z");
assert.equal(beforeEarlyClose.effectiveClosesAt, earlyClose);
assert.equal(beforeEarlyClose.validThrough, earlyClose);
assert.equal(beforeEarlyClose.isOpen, true);

const atEarlyClose = resolveRoleState(earlyClose, { ...openRole, closesAt: earlyClose });
assert.equal(atEarlyClose.isOpen, false, "the exact factual close instant is closed");

const afterDefaultClose = resolveRoleState(monday, { ...openRole, closesAt: "2026-08-30T16:00:00.000Z" });
assert.equal(afterDefaultClose.effectiveClosesAt, "2026-08-23T16:00:00.000Z", "the default wins over a later factual close");

for (const status of ["inactive", "filled"]) {
  const state = resolveRoleState(monday, { ...openRole, status });
  assert.equal(state.isOpen, false, `${status} closes immediately`);
  assert.equal(state.validThrough, "2026-08-23T16:00:00.000Z");
}

assert.throws(() => resolveRoleState("not-a-date", openRole), /valid authoritative server instant/i);
assert.throws(() => resolveRoleState(monday, null), /canonical role/i);
assert.throws(
  () => resolveRoleState(monday, { ...openRole, closesAt: "not-a-date" }),
  /absolute closesAt instant/i,
);

console.log("server-authoritative HKT role-state policy test passed");
