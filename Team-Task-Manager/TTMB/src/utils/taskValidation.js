import { DEFAULT_PRIORITY, DEFAULT_STATUS, TASK_PRIORITIES, TASK_STATUSES } from "../constants/taskOptions.js";

export class TaskValidationError extends Error {
  constructor(errors) {
    super("Task validation failed.");
    this.name = "TaskValidationError";
    this.errors = { ...errors };
  }
}

export const generateTaskId = () => globalThis.crypto?.randomUUID?.()
  ?? `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function isValidDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidIsoDate(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value;
}

export function normalizeTask(task = {}) {
  const normalized = { ...task };
  if (typeof normalized.title === "string") normalized.title = normalized.title.trim();
  if (typeof normalized.description === "string") normalized.description = normalized.description.trim();
  if (typeof normalized.assignee === "string") normalized.assignee = normalized.assignee.trim();
  return normalized;
}

export function validateTaskInput(task, { partial = false } = {}) {
  const errors = {};
  if (!task || typeof task !== "object" || Array.isArray(task)) return { isValid: false, errors: { task: "Task must be an object." } };
  const has = (key) => Object.hasOwn(task, key);
  const required = (key) => !partial || has(key);
  if (required("title")) {
    if (typeof task.title !== "string" || !task.title.trim()) errors.title = "Title is required.";
    else if (task.title.trim().length < 2) errors.title = "Title must contain at least 2 characters.";
    else if (task.title.trim().length > 120) errors.title = "Title must not exceed 120 characters.";
  }
  if (has("description") && (typeof task.description !== "string" || task.description.length > 1000)) errors.description = "Description must be a string of at most 1000 characters.";
  if (required("priority") && !TASK_PRIORITIES.includes(task.priority)) errors.priority = "Priority must be low, medium or high.";
  if (required("status") && !TASK_STATUSES.includes(task.status)) errors.status = "Status must be todo, in-progress or done.";
  if (has("assignee") && typeof task.assignee !== "string") errors.assignee = "Assignee must be a string.";
  if (has("dueDate") && task.dueDate !== null && !isValidDateOnly(task.dueDate)) errors.dueDate = "Due date must be null or use YYYY-MM-DD.";
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function assertValidTaskInput(task, options) {
  const result = validateTaskInput(task, options);
  if (!result.isValid) throw new TaskValidationError(result.errors);
  return true;
}

export function isStoredTaskValid(task) {
  if (!task || typeof task !== "object" || Array.isArray(task)) return false;
  const keys = ["id", "title", "description", "priority", "status", "assignee", "dueDate", "createdAt", "updatedAt"];
  if (!keys.every((key) => Object.hasOwn(task, key))) return false;
  return typeof task.id === "string" && task.id.trim() !== ""
    && typeof task.description === "string" && typeof task.assignee === "string"
    && validateTaskInput(task).isValid && isValidIsoDate(task.createdAt) && isValidIsoDate(task.updatedAt);
}

export function applyTaskDefaults(task) {
  return { description: "", priority: DEFAULT_PRIORITY, status: DEFAULT_STATUS, assignee: "", dueDate: null, ...task };
}
