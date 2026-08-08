import assert from "assert";
import {
  TIMER_STATE_STORAGE_KEY,
  normalizeTimerState,
  loadTimerState,
  saveTimerState
} from "../src/domain/timer-state.js";

const options = {
  minimumFocusMinutes: 1,
  maximumFocusMinutes: 180,
  defaultFocusMinutes: 25,
  minimumBreakMinutes: 1,
  maximumBreakMinutes: 60,
  defaultBreakMinutes: 5,
  minimumLongBreakMinutes: 1,
  maximumLongBreakMinutes: 60,
  defaultLongBreakMinutes: 15,
  minimumFocusesPerLongBreak: 2,
  maximumFocusesPerLongBreak: 6,
  defaultFocusesPerLongBreak: 4
};

function createStorage(initialValue) {
  let value = initialValue;
  let removed = false;

  return {
    getItem: function () {
      return removed ? null : value;
    },
    setItem: function (key, nextValue) {
      assert.strictEqual(key, TIMER_STATE_STORAGE_KEY);
      value = nextValue;
      removed = false;
    },
    removeItem: function () {
      removed = true;
    },
    wasRemoved: function () {
      return removed;
    },
    value: function () {
      return value;
    }
  };
}

assert.strictEqual(normalizeTimerState(null, options), null);
assert.deepStrictEqual(
  normalizeTimerState({
    phase: "invalid",
    selectedMinutes: 999,
    breakMinutes: 0,
    remainingSeconds: 999999,
    selectedPlanId: 12,
    isRunning: true,
    endAt: null
  }, options),
  {
    phase: "focus",
    selectedMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    focusesPerLongBreak: 4,
    completedFocusesInCycle: 0,
    isLongBreak: false,
    remainingSeconds: 1500,
    selectedPlanId: "12",
    isRunning: false,
    endAt: null,
    completionRecorded: false,
    autoStartBreak: false,
    autoStartFocus: false
  }
);

const pausedStorage = createStorage(JSON.stringify({
  phase: "break",
  selectedMinutes: 45,
  breakMinutes: 10,
  longBreakMinutes: 20,
  completedFocusesInCycle: 3,
  isLongBreak: true,
  remainingSeconds: 900,
  selectedPlanId: "3",
  isRunning: false,
  endAt: null,
  completionRecorded: true,
  autoStartBreak: true,
  autoStartFocus: false
}));
const pausedResult = loadTimerState(pausedStorage, options, 100000);
assert.strictEqual(pausedResult.timer.remainingSeconds, 900);
assert.strictEqual(pausedResult.timer.phase, "break");
assert.strictEqual(pausedResult.timer.isLongBreak, true);
assert.strictEqual(pausedResult.timer.focusesPerLongBreak, 4);
assert.strictEqual(pausedResult.timer.completedFocusesInCycle, 3);
assert.strictEqual(pausedResult.timer.autoStartBreak, true);
assert.strictEqual(pausedResult.timer.autoStartFocus, false);
assert.strictEqual(pausedResult.expired, false);

const runningStorage = createStorage(JSON.stringify({
  phase: "focus",
  selectedMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  completedFocusesInCycle: 2,
  isLongBreak: false,
  remainingSeconds: 1000,
  selectedPlanId: "",
  isRunning: true,
  endAt: 125000,
  completionRecorded: false
}));
const runningResult = loadTimerState(runningStorage, options, 100000);
assert.strictEqual(runningResult.timer.remainingSeconds, 25);
assert.strictEqual(runningResult.timer.isRunning, true);

const expiredResult = loadTimerState(runningStorage, options, 130000);
assert.strictEqual(expiredResult.timer.remainingSeconds, 0);
assert.strictEqual(expiredResult.timer.isRunning, false);
assert.strictEqual(expiredResult.expired, true);

const clockRollbackResult = loadTimerState(
  runningStorage,
  options,
  -10000000
);
assert.strictEqual(clockRollbackResult.timer.remainingSeconds, 1500);

const corruptStorage = createStorage("{not valid json");
const corruptResult = loadTimerState(corruptStorage, options, 100000);
assert.strictEqual(corruptResult.timer, null);
assert.strictEqual(corruptResult.recovered, true);
assert.strictEqual(corruptStorage.wasRemoved(), true);

const writableStorage = createStorage(null);
const saveResult = saveTimerState(writableStorage, pausedResult.timer);
assert.strictEqual(saveResult.ok, true);
assert.strictEqual(
  JSON.parse(writableStorage.value()).remainingSeconds,
  900
);
assert.strictEqual(
  JSON.parse(writableStorage.value()).autoStartBreak,
  true
);
assert.strictEqual(
  JSON.parse(writableStorage.value()).longBreakMinutes,
  20
);
assert.strictEqual(
  JSON.parse(writableStorage.value()).focusesPerLongBreak,
  4
);

const customCycle = normalizeTimerState({
  phase: "focus",
  selectedMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  focusesPerLongBreak: 6,
  completedFocusesInCycle: 5,
  remainingSeconds: 1500
}, options);
assert.strictEqual(customCycle.focusesPerLongBreak, 6);
assert.strictEqual(customCycle.completedFocusesInCycle, 5);

const invalidCycle = normalizeTimerState({
  phase: "focus",
  selectedMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  completedFocusesInCycle: 4,
  remainingSeconds: 1500
}, options);
assert.strictEqual(invalidCycle.completedFocusesInCycle, 0);

assert.strictEqual(
  saveTimerState({
    setItem: function () {
      throw new Error("Quota exceeded.");
    }
  }, pausedResult.timer).ok,
  false
);

console.log("Timer state tools: all tests passed");
