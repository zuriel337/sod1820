import test from "node:test";
import assert from "node:assert/strict";
import { ACCOUNT_FLASH_TTL_MS, NEW_PASSWORD_STEP_TTL_MS, armNewPasswordStep, disarmNewPasswordStep, newPasswordStepArmed, setAccountFlash, takeAccountFlash } from "./accountFlowMemory.js";

const fakeStorage = () => { const map = new Map(); return { map, getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) }; };

test("the new-password step is remembered until it is disarmed, and keeps nothing but a timestamp", () => {
  const storage = fakeStorage();
  disarmNewPasswordStep({ storage });
  assert.equal(newPasswordStepArmed({ now: 1000, storage }), false);
  armNewPasswordStep({ now: 1000, storage });
  assert.equal(newPasswordStepArmed({ now: 2000, storage }), true);
  assert.deepEqual([...storage.map.values()].map(value => /^\d+$/.test(value)), [true], "only a numeric timestamp is stored: no code, password or address");
  disarmNewPasswordStep({ storage });
  assert.equal(newPasswordStepArmed({ now: 2000, storage }), false);
  assert.equal(storage.map.size, 0);
});

test("the flag expires so a stale step can never trap anyone, and a clock set far back does not extend it", () => {
  const storage = fakeStorage();
  armNewPasswordStep({ now: 10_000, storage });
  assert.equal(newPasswordStepArmed({ now: 10_000 + NEW_PASSWORD_STEP_TTL_MS, storage }), true);
  assert.equal(newPasswordStepArmed({ now: 10_000 + NEW_PASSWORD_STEP_TTL_MS + 1, storage }), false);
  assert.equal(storage.map.size, 0, "an expired flag is removed");
  armNewPasswordStep({ now: 10_000_000, storage });
  assert.equal(newPasswordStepArmed({ now: 10_000_000 - NEW_PASSWORD_STEP_TTL_MS - 1, storage }), false);
});

test("it survives a component re-mount through the tab storage and works without any storage", () => {
  const storage = fakeStorage();
  armNewPasswordStep({ now: 5000, storage });
  // A re-mounted component reads the same storage.
  assert.equal(newPasswordStepArmed({ now: 6000, storage }), true);
  disarmNewPasswordStep({ storage });
  const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } };
  armNewPasswordStep({ now: 7000, storage: broken });
  assert.equal(newPasswordStepArmed({ now: 7500, storage: broken }), true, "in-memory fallback while storage is denied");
  disarmNewPasswordStep({ storage: broken });
  assert.equal(newPasswordStepArmed({ now: 7500, storage: broken }), false);
});

test("a flash message survives one re-mount, is read exactly once, and expires", () => {
  const storage = fakeStorage();
  assert.equal(takeAccountFlash({ now: 1, storage }), "");
  setAccountFlash("פג תוקף האימות", { now: 1000, storage });
  assert.equal(takeAccountFlash({ now: 2000, storage }), "פג תוקף האימות");
  assert.equal(takeAccountFlash({ now: 2000, storage }), "", "read once");
  assert.equal(storage.map.size, 0);
  setAccountFlash("old", { now: 1000, storage });
  assert.equal(takeAccountFlash({ now: 1000 + ACCOUNT_FLASH_TTL_MS + 1, storage }), "", "expired");
  const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } };
  setAccountFlash("memory only", { now: 5000, storage: broken });
  assert.equal(takeAccountFlash({ now: 5100, storage: broken }), "memory only");
});
