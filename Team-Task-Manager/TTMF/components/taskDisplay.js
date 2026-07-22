function formatDate(value) {
  if (!value) return 'No due date';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return value;
  return dateValue.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function statusLabel(status) {
  const map = {
    todo: 'To do',
    'in-progress': 'In progress',
    done: 'Done',
  };
  return map[status] ?? status;
}

function priorityLabel(priority) {
  const map = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };
  return map[priority] ?? priority;
}

export function TaskDisplay({ task, selected = false, onSelectTask = () => {} }) {
  const article = document.createElement('article');
  article.className = `task-card${selected ? ' task-card--selected' : ''}`;
  article.dataset.taskId = task.id;
  article.tabIndex = 0;
  article.setAttribute('role', 'button');

  const header = document.createElement('div');
  header.className = 'task-card__header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'task-card__title-wrap';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'task-card__eyebrow';
  eyebrow.textContent = statusLabel(task.status);
  const title = document.createElement('h3');
  title.textContent = task.title || 'Untitled task';
  titleWrap.append(eyebrow, title);

  const badge = document.createElement('span');
  badge.className = `badge badge--${task.priority}`;
  badge.textContent = priorityLabel(task.priority);
  header.append(titleWrap, badge);

  const description = document.createElement('p');
  description.className = 'task-card__description';
  description.textContent = task.description || 'No description provided.';

  const meta = document.createElement('div');
  meta.className = 'task-card__meta';

  const dueChip = document.createElement('span');
  dueChip.className = 'task-card__chip';
  dueChip.textContent = `Due ${formatDate(task.dueDate)}`;

  const assigneeChip = document.createElement('span');
  assigneeChip.className = 'task-card__chip';
  assigneeChip.textContent = task.assignee ? `Assigned to ${task.assignee}` : 'Unassigned';

  meta.append(dueChip, assigneeChip);

  article.append(header, description, meta);
  const selectTask = () => onSelectTask(task);
  article.addEventListener('click', selectTask);
  article.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectTask();
    }
  });
  return article;
}
