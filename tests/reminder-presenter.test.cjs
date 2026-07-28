const assert = require("node:assert/strict");
const Presenter = require("../reminder-presenter.js");

assert.equal(Presenter.getReminderPlacement(390), "mobile-top");
assert.equal(Presenter.getReminderPlacement(700), "mobile-top");
assert.equal(Presenter.getReminderPlacement(701), "desktop-bottom-left");
assert.equal(Presenter.shouldUseSystemNotification("visible"), false);
assert.equal(Presenter.shouldUseSystemNotification("hidden"), true);
assert.equal(Presenter.shouldDismissFromSwipe(200, 155), true);
assert.equal(Presenter.shouldDismissFromSwipe(200, 180), false);
assert.equal(Presenter.shouldDismissFromSwipe(200, 245), false);

console.log("Reminder presenter: all tests passed");
