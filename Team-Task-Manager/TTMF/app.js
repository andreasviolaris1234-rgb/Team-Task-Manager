import { Dashboard } from './components/dashboard.js';
import { tasks as fallbackTasks } from './data/tasks.js';

function normalizeTask(task = {}, index = 0) {
  return {
    id: task.id ?? `task-${index + 1}`,
    title: task.title ?? 'Untitled task',
    description: task.description ?? '',
    priority: task.priority ?? 'medium',
    status: task.status ?? 'todo',
    assignee: task.assignee ?? '',
    dueDate: task.dueDate ?? null,
    createdAt: task.createdAt ?? new Date().toISOString(),
    updatedAt: task.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeTasks(tasks = []) {
  return tasks.map((task, index) => normalizeTask(task, index));
}

const appRoot = document.getElementById('app');
let state = {
  tasks: normalizeTasks(fallbackTasks),
  selectedTask: normalizeTasks(fallbackTasks)[0] ?? null,
  loading: true,
  error: '',
};

function render() {
  if (!appRoot) return;
  appRoot.innerHTML = '';
  appRoot.appendChild(
    Dashboard({
      tasks: state.tasks,
      selectedTask: state.selectedTask,
      loading: state.loading,
      error: state.error,
      onSelectTask: (task) => {
        state.selectedTask = task;
        render();
      },
      onRefresh: async () => {
        await loadTasks();
        render();
      },
    })
  );
}

async function loadTasks() {
  state.loading = true;
  state.error = '';
  render();

  const candidateUrls = [
    '/api/tasks',
    'http://127.0.0.1:3000/api/tasks',
    'http://localhost:3000/api/tasks',
  ];

  let lastError = null;

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Backend responded with an error');
      const payload = await response.json();
      const payloadTasks = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.tasks)
            ? payload.tasks
            : null;

      if (payloadTasks) {
        state.tasks = normalizeTasks(payloadTasks);
        state.selectedTask = state.tasks[0] ?? null;
        state.error = '';
        state.loading = false;
        render();
        return;
      }
      throw new Error('Unexpected task payload');
    } catch (error) {
      lastError = error;
    }
  }

  state.tasks = normalizeTasks(fallbackTasks);
  state.selectedTask = state.tasks[0] ?? null;
  state.error = lastError?.message
    ? 'Backend is unavailable, so sample task data is being shown.'
    : 'Unable to load tasks right now.';
  state.loading = false;
  render();
}

await loadTasks();
render();
