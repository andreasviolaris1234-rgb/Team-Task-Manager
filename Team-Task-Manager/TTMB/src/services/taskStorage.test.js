import test, { beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { TASK_STORAGE_KEY } from "../constants/taskOptions.js";
import { sampleTasks } from "../data/sampleTasks.js";
import { TaskValidationError } from "../utils/taskValidation.js";
import { addTask, clearTasks, deleteTask, getAllTasks, getTaskById, initializeTasks, loadTasks, moveTask, resetTasks, saveTasks, updateTask } from "./taskStorage.js";

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.has(key) ? this.#values.get(key) : null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });
after(() => { delete globalThis.localStorage; });

test("initializes samples without overwriting valid saved data", () => {
  assert.equal(initializeTasks().length, 6);
  const existing = [{ ...sampleTasks[0], title: "My task" }];
  saveTasks(existing);
  assert.deepEqual(initializeTasks(), existing);
});

test("loads/saves safe copies and recovers corrupted or invalid data", () => {
  const saved = saveTasks(sampleTasks);
  saved[0].title = "mutated";
  assert.notEqual(loadTasks()[0].title, "mutated");
  localStorage.setItem(TASK_STORAGE_KEY, "{broken");
  assert.equal(loadTasks().length, 6);
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify({ nope: true }));
  assert.equal(loadTasks().length, 6);
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify([{ ...sampleTasks[0], status: "bad" }]));
  assert.equal(loadTasks().length, 6);
  assert.throws(() => saveTasks([sampleTasks[0], sampleTasks[0]]), /unique IDs/);
});

test("adds tasks with defaults, generated identity, and timestamps", () => {
  initializeTasks();
  const created = addTask({ title: "Connect board" });
  assert.equal(created.priority, "medium");
  assert.equal(created.status, "todo");
  assert.ok(created.id);
  assert.ok(Date.parse(created.createdAt));
  assert.equal(created.updatedAt, created.createdAt);
  assert.equal(getTaskById(created.id).title, "Connect board");
  assert.throws(() => addTask({ title: "" }), TaskValidationError);
  assert.throws(() => addTask({ title: "Bad priority", priority: "urgent" }), TaskValidationError);
  assert.throws(() => addTask({ title: "Bad status", status: "blocked" }), TaskValidationError);
});

test("updates, moves, finds, and deletes consistently", () => {
  initializeTasks();
  const original = getAllTasks()[0];
  const updated = updateTask(original.id, { title: "Updated title" });
  assert.equal(updated.id, original.id);
  assert.equal(updated.createdAt, original.createdAt);
  assert.notEqual(updated.updatedAt, original.updatedAt);
  assert.equal(moveTask(original.id, "done").status, "done");
  assert.throws(() => moveTask(original.id, "blocked"), /Status/);
  assert.throws(() => updateTask("missing", { title: "No task" }), /not found/);
  assert.equal(getTaskById("missing"), null);
  assert.equal(deleteTask(original.id).id, original.id);
  assert.equal(deleteTask(original.id), null);
});

test("clear/reset work and storage failures are useful", () => {
  initializeTasks();
  assert.equal(clearTasks(), true);
  assert.equal(localStorage.getItem(TASK_STORAGE_KEY), null);
  assert.equal(resetTasks().length, 6);
  globalThis.localStorage = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  assert.equal(loadTasks().length, 6);
  assert.throws(() => saveTasks(sampleTasks), /Unable to save/);
  delete globalThis.localStorage;
  assert.equal(loadTasks().length, 6);
  assert.throws(() => saveTasks(sampleTasks), /unavailable/);
});
