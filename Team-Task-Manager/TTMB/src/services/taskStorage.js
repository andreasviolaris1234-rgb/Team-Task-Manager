import { TASK_STATUSES, TASK_STORAGE_KEY } from "../constants/taskOptions.js";
import { sampleTasks } from "../data/sampleTasks.js";
import { applyTaskDefaults, assertValidTaskInput, generateTaskId, isStoredTaskValid, normalizeTask } from "../utils/taskValidation.js";

const clone = (value) => typeof structuredClone === "function"
  ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const freshSamples = () => clone(sampleTasks);

function storage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function validTaskArray(value) {
  if (!Array.isArray(value) || !value.every(isStoredTaskValid)) return false;
  return new Set(value.map(({ id }) => id)).size === value.length;
}

/** Loads stored tasks; missing, unreadable, or invalid data recovers to sample tasks. */
export function loadTasks() {
  const target = storage();
  if (!target) return freshSamples();
  try {
    const raw = target.getItem(TASK_STORAGE_KEY);
    if (raw === null) return freshSamples();
    const parsed = JSON.parse(raw);
    return validTaskArray(parsed) ? clone(parsed) : freshSamples();
  } catch { return freshSamples(); }
}

/** Validates and saves a complete task array. */
export function saveTasks(tasks) {
  if (!validTaskArray(tasks)) throw new TypeError("Tasks must be an array of valid tasks with unique IDs.");
  const target = storage();
  if (!target) throw new Error("localStorage is unavailable.");
  const safeTasks = clone(tasks);
  try { target.setItem(TASK_STORAGE_KEY, JSON.stringify(safeTasks)); }
  catch (cause) { throw new Error("Unable to save tasks to localStorage.", { cause }); }
  return clone(safeTasks);
}

/** Preserves valid user data, otherwise stores fresh sample data. */
export function initializeTasks() {
  const target = storage();
  if (!target) return freshSamples();
  try {
    const raw = target.getItem(TASK_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (validTaskArray(parsed)) return clone(parsed);
    }
  } catch { /* recover below */ }
  return saveTasks(freshSamples());
}

export const getAllTasks = () => loadTasks();
export function getTaskById(taskId) { return clone(loadTasks().find(({ id }) => id === taskId) ?? null); }

export function addTask(taskData) {
  if (!taskData || typeof taskData !== "object" || Array.isArray(taskData)) assertValidTaskInput(taskData);
  const input = normalizeTask(applyTaskDefaults(taskData));
  for (const forbidden of ["id", "createdAt", "updatedAt"]) {
    if (Object.hasOwn(taskData, forbidden)) throw new Error(`${forbidden} is generated automatically.`);
  }
  assertValidTaskInput(input);
  const tasks = loadTasks();
  let id;
  do { id = generateTaskId(); } while (tasks.some((task) => task.id === id));
  const now = new Date().toISOString();
  const created = { ...input, id, createdAt: now, updatedAt: now };
  saveTasks([...tasks, created]);
  return clone(created);
}

export function updateTask(taskId, updates) {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) throw new TypeError("Updates must be an object.");
  if (Object.hasOwn(updates, "id") && updates.id !== taskId) throw new Error("Task ID cannot be changed.");
  if (Object.hasOwn(updates, "createdAt")) throw new Error("createdAt cannot be changed.");
  const tasks = loadTasks();
  const index = tasks.findIndex(({ id }) => id === taskId);
  if (index < 0) throw new Error(`Task not found: ${taskId}`);
  const merged = normalizeTask({ ...tasks[index], ...updates, id: taskId, createdAt: tasks[index].createdAt, updatedAt: new Date().toISOString() });
  assertValidTaskInput(merged);
  tasks[index] = merged;
  saveTasks(tasks);
  return clone(merged);
}

export function deleteTask(taskId) {
  const tasks = loadTasks();
  const index = tasks.findIndex(({ id }) => id === taskId);
  if (index < 0) return null;
  const [deleted] = tasks.splice(index, 1);
  saveTasks(tasks);
  return clone(deleted);
}

export function moveTask(taskId, newStatus) {
  if (!TASK_STATUSES.includes(newStatus)) throw new Error("Status must be todo, in-progress or done.");
  return updateTask(taskId, { status: newStatus });
}

export function clearTasks() {
  const target = storage();
  if (!target) return false;
  try { target.removeItem(TASK_STORAGE_KEY); return true; }
  catch (cause) { throw new Error("Unable to clear tasks from localStorage.", { cause }); }
}

export const resetTasks = () => saveTasks(freshSamples());
