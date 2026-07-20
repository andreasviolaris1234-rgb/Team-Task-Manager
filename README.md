Team Task Manager
A simple task-management application created by three interns using React, JavaScript, CSS, and browser localStorage.
The application allows users to create, edit, delete, assign, search, filter, and organise tasks.
This is a beginner-friendly project. It does not use a server, Express, an external API, or an external database.
Project Goal
The purpose of this project is to practise:
React components
JavaScript functions
Forms and input validation
Managing application state
Saving data with localStorage
Git and GitHub collaboration
Working with separate branches
Combining code created by multiple developers
Technologies
React
JavaScript
CSS
Vite
Browser localStorage
Git
GitHub
Main Features
The application should allow users to:
View all tasks
Create a new task
Edit an existing task
Delete a task
Assign a task to a team member
Set a task priority
Set a task status
Add a deadline
Search for tasks
Filter tasks
Sort tasks
View task statistics
Keep tasks saved after refreshing the browser
Task Information
Each task contains:
{
  id: "task-001",
  title: "Create homepage",
  description: "Create the main homepage layout",
  assignedTo: "Intern 1",
  priority: "High",
  status: "In Progress",
  deadline: "2026-07-30",
  createdAt: "2026-07-20"
}
Priority Options
Low
Medium
High
Status Options
To Do
In Progress
Completed
Project Structure
team-task-manager/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── TaskCard.jsx
│   │   ├── TaskColumn.jsx
│   │   ├── TaskForm.jsx
│   │   ├── TaskFilters.jsx
│   │   ├── SearchBar.jsx
│   │   ├── SortSelector.jsx
│   │   └── DeleteConfirmation.jsx
│   │
│   ├── pages/
│   │   └── Dashboard.jsx
│   │
│   ├── services/
│   │   └── taskStorage.js
│   │
│   ├── utils/
│   │   ├── taskStatistics.js
│   │   └── taskValidation.js
│   │
│   ├── data/
│   │   └── sampleTasks.js
│   │
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
│
├── public/
├── package.json
└── README.md
Data Storage
The application does not use a server or an external database.
Tasks are stored inside the browser using localStorage.
This means:
Tasks remain saved after refreshing the page.
Tasks are available only on the same browser and device.
Clearing browser storage will remove the saved tasks.
Different users or devices will not share the same task list.
The localStorage functions are stored inside:
src/services/taskStorage.js
Required Data Functions
getTasks();
saveTasks(tasks);
addTask(task);
updateTask(taskId, updatedTask);
deleteTask(taskId);
changeTaskStatus(taskId, newStatus);
getTaskById(taskId);
getTaskStatistics(tasks);
React components should use these functions instead of accessing localStorage directly.
Team Responsibilities
Intern 1 — Dashboard and Task Display
Intern 1 is responsible for the main application layout and task display.
Main responsibilities:
Create the navigation bar
Create the dashboard
Create task status columns
Display tasks as cards
Display task counters
Display task information
Highlight overdue tasks
Display an empty-task message
Make the layout responsive
Display task statistics
Suggested components:
Navbar
Dashboard
TaskColumn
TaskCard
EmptyState
Statistics
Suggested branch:
task-dashboard
Intern 2 — Forms and User Actions
Intern 2 is responsible for task forms and user interactions.
Main responsibilities:
Create the Add Task form
Create the Edit Task form
Add form validation
Create delete confirmation
Create task search
Create task filters
Create task sorting
Display success messages
Display error messages
Connect buttons and forms to the data functions
Suggested components:
TaskForm
EditTaskForm
DeleteConfirmation
SearchBar
TaskFilters
SortSelector
NotificationMessage
Suggested branch:
task-forms
Intern 3 — Data Logic and localStorage
Intern 3 is responsible for the data-management part of the project.
This is the first development section that should be completed.
Main responsibilities:
Define the task structure
Create sample task data
Create localStorage functions
Create task statistics functions
Create task validation functions
Generate unique task IDs
Handle missing or invalid saved data
Test all task-management functions
Suggested files:
src/services/taskStorage.js
src/data/sampleTasks.js
src/utils/taskStatistics.js
src/utils/taskValidation.js
Suggested branch:
task-storage
Development Order
Stage 1 — Planning
All three interns should agree on:
The task structure
Property names
Priority options
Status options
Application layout
Component names
Branch names
Coding conventions
Stage 2 — Intern 3 Starts First
Intern 3 creates:
The task structure
Sample task data
localStorage setup
Task-management functions
Statistics functions
Validation functions
Intern 3 should test that tasks can be:
Loaded
Saved
Added
Updated
Deleted
Found by ID
Moved to another status
After testing, Intern 3 should push the changes to GitHub.
Stage 3 — Interns 1 and 2 Begin
After the data functions are available:
Intern 1 begins the dashboard and task-display components.
Intern 2 begins the forms, search, filters, and task actions.
Both interns should use the task structure and functions created by Intern 3.
They should not create separate versions of the same localStorage functions.
Stage 4 — Integration
The team should connect the application in this order:
Load tasks using getTasks().
Display tasks on the dashboard.
Connect the Add Task form to addTask().
Connect the Edit Task form to updateTask().
Connect the Delete button to deleteTask().
Connect status changes to changeTaskStatus().
Refresh the dashboard after every change.
Connect the statistics section.
Connect search, filters, and sorting.
Stage 5 — Testing
The team should test:
Adding a valid task
Submitting an empty title
Editing a task
Deleting a task
Cancelling a deletion
Changing task status
Refreshing the browser
Searching for tasks
Applying filters
Clearing filters
Sorting tasks
Displaying overdue tasks
Displaying an empty task list
Handling invalid localStorage data
Stage 6 — Final Improvements
After all required features work:
Improve the visual design
Improve the mobile layout
Remove duplicated code
Remove unused files
Improve variable names
Improve error messages
Add useful code comments
Add screenshots to the README
Confirm that the setup instructions work
Installation
1. Clone the Repository
git clone REPOSITORY_URL
2. Open the Project Folder
cd team-task-manager
3. Install Dependencies
npm install
4. Start the Development Server
npm run dev
5. Open the Application
Open the local address displayed in the terminal.
It will usually look similar to:
http://localhost:5173
The development server is only used to run the React application locally. The project does not contain a backend server.
Git Workflow
Each intern should work on a separate branch.
Create a Branch
git checkout -b branch-name
Check Changed Files
git status
Add Changes
git add .
Commit Changes
git commit -m "Describe the completed change"
Push the Branch
git push origin branch-name
After pushing, create a Pull Request on GitHub.
Another team member should review the changes before merging them into the main branch.
Suggested Branches
main
task-storage
task-dashboard
task-forms
The main branch should contain stable and reviewed code.
Interns should not develop new features directly inside the main branch.
Commit Message Examples
Use clear commit messages that describe the change.
Good examples:
Create task card component
Add localStorage save function
Add task form validation
Create priority filter
Connect delete button to storage function
Fix overdue task display
Improve mobile dashboard layout
Avoid unclear messages such as:
changes
update
stuff
fix
final
Coding Guidelines
Use clear variable names.
Use clear function names.
Keep components small.
Avoid placing the whole application inside App.jsx.
Avoid duplicated functions.
Keep data logic outside visual components.
Do not access localStorage from every component.
Use the functions inside taskStorage.js.
Validate information before saving it.
Test changes before pushing them.
Do not remove another intern’s code without discussing it.
Resolve merge conflicts carefully.
Form Validation
The task form should follow these rules:
The task title is required.
The assigned person is required.
The priority is required.
The status is required.
The deadline must be a valid date.
The description should have a character limit.
Empty values should not be saved.
Invalid information should display a clear message.
Task Statistics
The application should calculate:
Total tasks
To Do tasks
In Progress tasks
Completed tasks
Overdue tasks
High-priority tasks
Completion percentage
Example completion percentage calculation:
const completionPercentage =
  totalTasks === 0
    ? 0
    : Math.round((completedTasks / totalTasks) * 100);
Required Features Before Completion
The project is considered complete when users can:
Add a task
View the task
Edit the task
Delete the task
Change its status
Refresh the browser without losing it
Search for tasks
Filter tasks
Sort tasks
View task statistics
Use the application on desktop and mobile
Optional Features
These features should only be added after the required features work correctly:
Dark mode
Drag-and-drop task movement
Task categories
Progress bar
Completed-task archive
Reset all tasks button
Export tasks as JSON
Import tasks from JSON
Task notes
Confirmation before clearing all tasks
Known Limitations
Because this project uses localStorage:
There are no user accounts.
There is no shared online database.
Tasks cannot be shared between devices.
Data is saved only in the current browser.
Clearing browser data removes the tasks.
The application is not intended for production use.
Contributors
Intern 1 — Dashboard and task display
Intern 2 — Forms and user interactions
Intern 3 — Data logic and localStorage
Project Status
Development in progress.
 
