import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NAV_FLOAT_ENTER,
  NAV_FLOAT_EXIT,
  navFloatState,
} from "../nav-float.js";

test("the bar stays inline at and below the enter threshold", () => {
  assert.equal(navFloatState(0, false), false);
  assert.equal(navFloatState(NAV_FLOAT_ENTER, false), false);
  assert.equal(navFloatState(NAV_FLOAT_ENTER + 1, false), true);
});

test("hysteresis holds the floating state through the dead zone", () => {
  assert.equal(navFloatState(NAV_FLOAT_ENTER, true), true, "entered bar must not unfloat at the enter line");
  assert.equal(navFloatState(NAV_FLOAT_EXIT + 1, true), true);
  assert.equal(navFloatState(NAV_FLOAT_EXIT, true), false, "the bar only re-docks below the exit line");
  assert.equal(navFloatState(0, true), false);
});

test("the two thresholds never overlap, so the state cannot thrash", () => {
  assert.ok(NAV_FLOAT_EXIT < NAV_FLOAT_ENTER);
});

test("hostile scroll values resolve to the safe docked state", () => {
  assert.equal(navFloatState(Number.NaN, false), false);
  assert.equal(navFloatState(Number.NaN, true), false);
  assert.equal(navFloatState(-500, false), false);
  // the repo's scroll-math convention (hero-scroll.js clampProgress): non-finite -> 0
  assert.equal(navFloatState(Number.POSITIVE_INFINITY, false), false);
});
