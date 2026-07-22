import { TASK_PRIORITIES, TASK_STATUSES } from "../constants/taskOptions.js";

const list = (tasks) => Array.isArray(tasks) ? tasks : [];
const day = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

export function countTasksByStatus(tasks) {
  const result = Object.fromEntries(TASK_STATUSES.map((value) => [value, 0]));
  for (const task of list(tasks)) if (Object.hasOwn(result, task?.status)) result[task.status]++;
  return result;
}

export function countTasksByPriority(tasks) {
  const result = Object.fromEntries(TASK_PRIORITIES.map((value) => [value, 0]));
  for (const task of list(tasks)) if (Object.hasOwn(result, task?.priority)) result[task.priority]++;
  return result;
}

export function getCompletionPercentage(tasks) {
  const values = list(tasks);
  return values.length ? Math.round(values.filter(({ status }) => status === "done").length * 100 / values.length) : 0;
}

export function getOverdueTasks(tasks, currentDate = new Date()) {
  const today = day(currentDate);
  if (!today) return [];
  return list(tasks).filter((task) => task?.status !== "done" && typeof task?.dueDate === "string" && task.dueDate < today).map((task) => ({ ...task }));
}

export function getUpcomingTasks(tasks, numberOfDays = 7, currentDate = new Date()) {
  const today = day(currentDate);
  if (!today || !Number.isInteger(numberOfDays) || numberOfDays < 0) return [];
  const endDate = new Date(`${today}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + numberOfDays);
  const end = day(endDate);
  return list(tasks).filter((task) => task?.status !== "done" && typeof task?.dueDate === "string" && task.dueDate >= today && task.dueDate <= end).map((task) => ({ ...task }));
}

export function getTaskStatistics(tasks, currentDate = new Date()) {
  const values = list(tasks);
  const status = countTasksByStatus(values);
  const priority = countTasksByPriority(values);
  return {
    total: values.length,
    todo: status.todo,
    inProgress: status["in-progress"],
    done: status.done,
    lowPriority: priority.low,
    mediumPriority: priority.medium,
    highPriority: priority.high,
    overdue: getOverdueTasks(values, currentDate).length,
    completedPercentage: getCompletionPercentage(values),
  };
}
