import test from "node:test";
import assert from "node:assert/strict";
import { TaskValidationError, assertValidTaskInput, isStoredTaskValid, isValidDateOnly, isValidIsoDate, normalizeTask, validateTaskInput } from "./taskValidation.js";
import { sampleTasks } from "../data/sampleTasks.js";

test("validates full and partial task input", () => {
  assert.equal(validateTaskInput({ title: "Valid", priority: "high", status: "todo" }).isValid, true);
  assert.equal(validateTaskInput({ title: "" }).errors.title, "Title is required.");
  assert.equal(validateTaskInput({ priority: "urgent" }, { partial: true }).isValid, false);
  assert.equal(validateTaskInput({ title: "Changed" }, { partial: true }).isValid, true);
  assert.throws(() => assertValidTaskInput({ title: "x", priority: "low", status: "todo" }), TaskValidationError);
});

test("validates calendar dates, ISO timestamps, and complete stored tasks", () => {
  assert.equal(isValidDateOnly("2024-02-29"), true);
  assert.equal(isValidDateOnly("2023-02-29"), false);
  assert.equal(isValidIsoDate("2026-07-15T09:00:00.000Z"), true);
  assert.equal(isValidIsoDate("not-a-date"), false);
  assert.equal(isStoredTaskValid(sampleTasks[0]), true);
  assert.equal(isStoredTaskValid({ ...sampleTasks[0], status: "blocked" }), false);
});

test("normalization returns a copy and trims text", () => {
  const input = { title: "  Work  ", description: " text ", assignee: " Sam " };
  assert.deepEqual(normalizeTask(input), { title: "Work", description: "text", assignee: "Sam" });
  assert.equal(input.title, "  Work  ");
});
