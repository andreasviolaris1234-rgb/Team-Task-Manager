import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { sampleTasks } from "../data/sampleTasks.js";
import { applyTaskDefaults, assertValidTaskInput, generateTaskId, isStoredTaskValid, normalizeTask } from "../utils/taskValidation.js";

const copy = (value) => structuredClone(value);

export class TaskRepository {
  constructor(filePath, options = {}) {
    this.filePath = filePath;
    this.now = options.now ?? (() => new Date());
    this.createId = options.createId ?? generateTaskId;
    this.mutationQueue = Promise.resolve();
  }

  async initialize() {
    try { return await this.all(); }
    catch { await this.#write(copy(sampleTasks)); return copy(sampleTasks); }
  }

  async #read() {
    const tasks = JSON.parse(await readFile(this.filePath, "utf8"));
    const unique = Array.isArray(tasks) && new Set(tasks.map((task) => task?.id)).size === tasks.length;
    if (!unique || !tasks.every(isStoredTaskValid)) throw new Error("The task database is invalid.");
    return tasks;
  }

  async #write(tasks) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(tasks, null, 2)}\n`, "utf8");
    await rename(temporary, this.filePath);
  }

  #mutate(operation) {
    const next = this.mutationQueue.then(async () => operation(await this.#read()));
    this.mutationQueue = next.then(() => undefined, () => undefined);
    return next;
  }

  async all(filters = {}, ownerId = null) {
    let tasks = await this.#read();
    if (ownerId) tasks = tasks.filter((task) => task.ownerId === ownerId);
    if (filters.status) tasks = tasks.filter((task) => task.status === filters.status);
    if (filters.priority) tasks = tasks.filter((task) => task.priority === filters.priority);
    if (filters.assignee) tasks = tasks.filter((task) => task.assignee.toLowerCase() === filters.assignee.toLowerCase());
    if (filters.q) {
      const query = filters.q.toLowerCase();
      tasks = tasks.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(query));
    }
    return copy(tasks);
  }

  async find(taskId, ownerId = null) {
    return copy((await this.#read()).find((task) => task.id === taskId && (!ownerId || task.ownerId === ownerId)) ?? null);
  }

  create(input, ownerId = null) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Task input must be an object.");
    for (const field of ["id", "createdAt", "updatedAt"]) if (Object.hasOwn(input, field)) throw new Error(`${field} is generated automatically.`);
    const normalized = normalizeTask(applyTaskDefaults(input));
    assertValidTaskInput(normalized);
    return this.#mutate(async (tasks) => {
      let id;
      do { id = this.createId(); } while (tasks.some((task) => task.id === id));
      const timestamp = this.now().toISOString();
      const created = { ...normalized, id, ...(ownerId ? { ownerId } : {}), createdAt: timestamp, updatedAt: timestamp };
      await this.#write([...tasks, created]);
      return copy(created);
    });
  }

  update(taskId, updates, ownerId = null) {
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) throw new TypeError("Updates must be an object.");
    if (Object.hasOwn(updates, "id") && updates.id !== taskId) throw new Error("Task ID cannot be changed.");
    if (Object.hasOwn(updates, "createdAt")) throw new Error("createdAt cannot be changed.");
    if (Object.hasOwn(updates, "ownerId")) throw new Error("ownerId cannot be changed.");
    return this.#mutate(async (tasks) => {
      const index = tasks.findIndex((task) => task.id === taskId && (!ownerId || task.ownerId === ownerId));
      if (index < 0) return null;
      const updated = normalizeTask({ ...tasks[index], ...updates, id: taskId, createdAt: tasks[index].createdAt, updatedAt: this.now().toISOString() });
      assertValidTaskInput(updated);
      tasks[index] = updated;
      await this.#write(tasks);
      return copy(updated);
    });
  }

  delete(taskId, ownerId = null) {
    return this.#mutate(async (tasks) => {
      const index = tasks.findIndex((task) => task.id === taskId && (!ownerId || task.ownerId === ownerId));
      if (index < 0) return null;
      const [deleted] = tasks.splice(index, 1);
      await this.#write(tasks);
      return copy(deleted);
    });
  }

  reset(ownerId = null) {
    return this.#mutate(async (tasks) => {
      if (!ownerId) { const samples = copy(sampleTasks); await this.#write(samples); return copy(samples); }
      const retained = tasks.filter((task) => task.ownerId !== ownerId);
      const samples = copy(sampleTasks).map((task) => ({ ...task, id: randomTaskId(task.id), ownerId }));
      await this.#write([...retained, ...samples]);
      return copy(samples);
    });
  }
}

function randomTaskId(base) {
  return `${base}-${generateTaskId()}`;
}
