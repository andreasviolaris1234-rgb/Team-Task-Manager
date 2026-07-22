import test from "node:test";
import assert from "node:assert/strict";
import { countTasksByPriority, countTasksByStatus, getCompletionPercentage, getOverdueTasks, getTaskStatistics, getUpcomingTasks } from "./taskStatistics.js";

const tasks = [
  { id: "1", status: "todo", priority: "high", dueDate: "2026-07-19" },
  { id: "2", status: "in-progress", priority: "medium", dueDate: "2026-07-22" },
  { id: "3", status: "done", priority: "low", dueDate: "2026-07-18" },
  { id: "4", status: "done", priority: "medium", dueDate: null },
];

test("counts status and priority and rounds completion percentage", () => {
  assert.deepEqual(countTasksByStatus(tasks), { todo: 1, "in-progress": 1, done: 2 });
  assert.deepEqual(countTasksByPriority(tasks), { low: 1, medium: 2, high: 1 });
  assert.equal(getCompletionPercentage(tasks), 50);
  assert.equal(getCompletionPercentage([]), 0);
});

test("finds overdue and upcoming tasks using a fixed date", () => {
  assert.deepEqual(getOverdueTasks(tasks, "2026-07-21").map(({ id }) => id), ["1"]);
  assert.deepEqual(getUpcomingTasks(tasks, 2, "2026-07-21").map(({ id }) => id), ["2"]);
});

test("statistics do not mutate input and invalid input is safe", () => {
  const snapshot = structuredClone(tasks);
  assert.deepEqual(getTaskStatistics(tasks, "2026-07-21"), { total: 4, todo: 1, inProgress: 1, done: 2, lowPriority: 1, mediumPriority: 2, highPriority: 1, overdue: 1, completedPercentage: 50 });
  assert.deepEqual(tasks, snapshot);
  assert.equal(getTaskStatistics(null).total, 0);
});
