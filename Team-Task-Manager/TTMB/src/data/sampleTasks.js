const samples = [
  ["sample-prepare-brief", "Prepare project brief", "Agree on scope and milestones.", "high", "todo", "Intern 1", "2026-07-28", "2026-07-15T09:00:00.000Z"],
  ["sample-review-copy", "Review interface copy", "Check labels and empty states.", "low", "todo", "", null, "2026-07-16T10:00:00.000Z"],
  ["sample-build-board", "Build task board", "Implement the three status columns.", "high", "in-progress", "Intern 1", "2026-07-30", "2026-07-17T11:00:00.000Z"],
  ["sample-storage-layer", "Create storage layer", "Add validation and local persistence.", "medium", "in-progress", "Intern 3", null, "2026-07-18T12:00:00.000Z"],
  ["sample-wireframes", "Approve wireframes", "Confirm the initial responsive layout.", "medium", "done", "Intern 2", "2026-07-20", "2026-07-12T08:00:00.000Z"],
  ["sample-repository", "Create repository", "Set up the shared project repository.", "low", "done", "", null, "2026-07-10T07:00:00.000Z"],
];

export const sampleTasks = Object.freeze(samples.map(([id, title, description, priority, status, assignee, dueDate, createdAt]) => Object.freeze({
  id, title, description, priority, status, assignee, dueDate, createdAt,
  updatedAt: createdAt,
})));
