import { TaskDisplay } from './taskDisplay.js';

function summaryCards(tasks) {
  const totals = {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === 'todo').length,
    'in-progress': tasks.filter((task) => task.status === 'in-progress').length,
    done: tasks.filter((task) => task.status === 'done').length,
  };

  return [
    ['Total tasks', totals.total],
    ['To do', totals.todo],
    ['In progress', totals['in-progress']],
    ['Done', totals.done],
  ];
}

function statusColumns(tasks) {
  return [
    { key: 'todo', label: 'To do', colorClass: 'column--todo' },
    { key: 'in-progress', label: 'In progress', colorClass: 'column--progress' },
    { key: 'done', label: 'Done', colorClass: 'column--done' },
  ].map((column) => ({
    ...column,
    tasks: tasks.filter((task) => task.status === column.key),
  }));
}

export function Dashboard({ tasks = [], selectedTask = null, loading = false, error = '', onSelectTask = () => {}, onRefresh = () => {} }) {
  const section = document.createElement('section');
  section.className = 'dashboard';

  const hero = document.createElement('header');
  hero.className = 'hero';
  const title = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.textContent = 'Team task overview';
  const p = document.createElement('p');
  p.textContent = 'A focused workspace for planning, tracking, and reviewing delivery across the team.';
  title.append(h1, p);

  const actions = document.createElement('div');
  actions.className = 'hero__actions';
  const refreshButton = document.createElement('button');
  refreshButton.className = 'secondary-btn';
  refreshButton.textContent = 'Refresh';
  refreshButton.addEventListener('click', () => onRefresh());
  actions.appendChild(refreshButton);
  hero.append(title, actions);
  section.appendChild(hero);

  const statusBar = document.createElement('div');
  statusBar.className = 'status-bar';
  statusBar.innerHTML = '<span>Live task data model from TTMB</span><span>Priority · Assignee · Due date</span>';
  section.appendChild(statusBar);

  const stats = document.createElement('div');
  stats.className = 'stats-grid';
  summaryCards(tasks).forEach(([label, value]) => {
    const card = document.createElement('article');
    card.className = 'stat-card';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    card.append(strong, span);
    stats.appendChild(card);
  });
  section.appendChild(stats);

  if (loading) {
    const loadingState = document.createElement('div');
    loadingState.className = 'state-card';
    loadingState.textContent = 'Loading tasks...';
    section.appendChild(loadingState);
    return section;
  }

  if (error) {
    const errorState = document.createElement('div');
    errorState.className = 'state-card state-card--error';
    errorState.textContent = error;
    section.appendChild(errorState);
  }

  const board = document.createElement('div');
  board.className = 'dashboard-grid';

  const boardColumns = document.createElement('div');
  boardColumns.className = 'board-columns';
  statusColumns(tasks).forEach((column) => {
    const columnCard = document.createElement('section');
    columnCard.className = `board-column ${column.colorClass}`;
    const columnHeader = document.createElement('div');
    columnHeader.className = 'board-column__header';
    const h3 = document.createElement('h3');
    h3.textContent = column.label;
    const count = document.createElement('span');
    count.textContent = column.tasks.length;
    columnHeader.append(h3, count);

    const taskList = document.createElement('div');
    taskList.className = 'task-list';
    if (column.tasks.length) {
      column.tasks.forEach((task) => {
        taskList.appendChild(TaskDisplay({ task, selected: selectedTask?.id === task.id, onSelectTask }));
      });
    } else {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No tasks in this lane.';
      taskList.appendChild(empty);
    }

    columnCard.append(columnHeader, taskList);
    boardColumns.appendChild(columnCard);
  });

  const detailPanel = document.createElement('aside');
  detailPanel.className = 'panel detail-panel';
  const detailTitle = document.createElement('h2');
  detailTitle.textContent = 'Task details';
  const detailBody = document.createElement('div');
  detailBody.className = 'detail-body';

  const activeTask = tasks.find((task) => task.id === selectedTask?.id) ?? tasks[0] ?? null;

  if (activeTask) {
    const selectedTitle = document.createElement('h3');
    selectedTitle.textContent = activeTask.title || 'Untitled task';
    const selectedDescription = document.createElement('p');
    selectedDescription.className = 'detail-description';
    selectedDescription.textContent = activeTask.description || 'No description provided.';

    const detailMeta = document.createElement('dl');
    detailMeta.className = 'detail-meta';
    [
      ['Status', activeTask.status],
      ['Priority', activeTask.priority],
      ['Assignee', activeTask.assignee || 'Unassigned'],
      ['Due date', activeTask.dueDate || 'No due date'],
      ['Created', activeTask.createdAt],
      ['Updated', activeTask.updatedAt],
    ].forEach(([label, value]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      row.append(dt, dd);
      detailMeta.appendChild(row);
    });
    detailBody.append(selectedTitle, selectedDescription, detailMeta);
  } else {
    detailBody.innerHTML = '<p class="empty-state">Select a task to inspect it.</p>';
  }

  detailPanel.append(detailTitle, detailBody);
  board.append(boardColumns, detailPanel);
  section.appendChild(board);
  return section;
}
