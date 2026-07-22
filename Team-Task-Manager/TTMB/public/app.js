import { api } from "./apiClient.js";

const $ = (selector) => document.querySelector(selector);
const state = { user: null, tasks: [], registerMode: false };
const statuses = [["todo","To do"],["in-progress","In progress"],["done","Done"]];

function showAuth() { $("#auth-view").hidden = false; $("#app-view").hidden = true; }
async function enterApp(user) { state.user = user; $("#user-name").textContent = user.name; $("#auth-view").hidden = true; $("#app-view").hidden = false; await load(); }

async function load() {
  try {
    const query = new URLSearchParams();
    if ($("#search").value) query.set("q", $("#search").value);
    if ($("#status-filter").value) query.set("status", $("#status-filter").value);
    if ($("#priority-filter").value) query.set("priority", $("#priority-filter").value);
    [state.tasks] = await Promise.all([api(`/api/tasks?${query}`)]);
    render();
  } catch (error) { notice(error.message); }
}

function render() {
  const done = state.tasks.filter((task) => task.status === "done").length;
  $("#stats").innerHTML = [[state.tasks.length,"Total tasks"],[state.tasks.filter(t=>t.status==="todo").length,"To do"],[state.tasks.filter(t=>t.status==="in-progress").length,"In progress"],[state.tasks.length ? Math.round(done/state.tasks.length*100)+"%" : "0%","Completed"]].map(([value,label])=>`<article class="stat"><strong>${value}</strong><span>${label}</span></article>`).join("");
  $("#board").innerHTML = statuses.map(([status,label]) => { const tasks=state.tasks.filter(task=>task.status===status); return `<section class="column"><div class="column-head"><h3>${label}</h3><span class="count">${tasks.length}</span></div>${tasks.map(taskCard).join("") || '<p class="empty">No tasks here.</p>'}</section>`; }).join("");
}

function escapeHtml(value="") { const node=document.createElement("div"); node.textContent=value; return node.innerHTML; }
function taskCard(task) { return `<article class="task" data-id="${task.id}"><div class="task-meta"><span class="badge ${task.priority}">${task.priority}</span><small>${task.dueDate || "No due date"}</small></div><h4>${escapeHtml(task.title)}</h4>${task.description?`<p>${escapeHtml(task.description)}</p>`:""}<div class="task-actions"><button data-action="move">Move</button><button data-action="edit">Edit</button><button data-action="delete">Delete</button></div></article>`; }
function notice(message) { $("#notice").textContent=message; $("#notice").hidden=!message; }
function setAuthMode(registerMode) { state.registerMode=registerMode;$("#name-field").hidden=!registerMode;$("#name").required=registerMode;$("#auth-title").textContent=registerMode?"Create account":"Sign in";$("#auth-toggle").textContent=registerMode?"Already have an account?":"Create an account";$("#password").autocomplete=registerMode?"new-password":"current-password";$("#password").type="password";$("#password").value="";$("#toggle-password").textContent="Show";$("#auth-error").hidden=true;}
function bindPasswordToggle(buttonSelector,inputSelector){$(buttonSelector).addEventListener("click",()=>{const input=$(inputSelector);const visible=input.type==="text";input.type=visible?"password":"text";$(buttonSelector).textContent=visible?"Show":"Hide";$(buttonSelector).setAttribute("aria-pressed",String(!visible));$(buttonSelector).setAttribute("aria-label",visible?"Show password":"Hide password");});}

function openTask(task = {}) { $("#task-form").reset(); $("#task-id").value=task.id||""; $("#task-form-title").textContent=task.id?"Edit task":"New task"; $("#title").value=task.title||""; $("#description").value=task.description||""; $("#priority").value=task.priority||"medium"; $("#status").value=task.status||"todo"; $("#assignee").value=task.assignee||""; $("#due-date").value=task.dueDate||""; $("#task-error").hidden=true; $("#task-dialog").showModal(); }

$("#auth-toggle").addEventListener("click",()=>setAuthMode(!state.registerMode));
bindPasswordToggle("#toggle-password","#password");bindPasswordToggle("#toggle-new-password","#new-password");
$("#forgot-password").addEventListener("click",()=>{$("#reset-form").reset();$("#reset-email").value=$("#email").value;$("#reset-message").hidden=true;$("#reset-dialog").showModal();});
$("#close-reset").addEventListener("click",()=>$("#reset-dialog").close()); $("#cancel-reset").addEventListener("click",()=>$("#reset-dialog").close());
$("#request-reset").addEventListener("click",async()=>{try{const data=await api("/api/auth/forgot-password",{method:"POST",body:JSON.stringify({email:$("#reset-email").value})});if(data.resetToken)$("#reset-token").value=data.resetToken;$("#reset-message").textContent=data.resetToken?"Reset token created and filled in below.":data.message;$("#reset-message").hidden=false;}catch(error){$("#reset-message").textContent=error.message;$("#reset-message").hidden=false;}});
$("#reset-form").addEventListener("submit",async event=>{event.preventDefault();try{const data=await api("/api/auth/reset-password",{method:"POST",body:JSON.stringify({token:$("#reset-token").value,password:$("#new-password").value})});$("#reset-dialog").close();$("#email").value=$("#reset-email").value;$("#password").value="";$("#auth-error").textContent=data.message+" You can now sign in.";$("#auth-error").hidden=false;}catch(error){$("#reset-message").textContent=error.message;$("#reset-message").hidden=false;}});
$("#auth-form").addEventListener("submit",async event=>{event.preventDefault();try{const body={email:$("#email").value,password:$("#password").value,...(state.registerMode?{name:$("#name").value}:{})};const data=await api(state.registerMode?"/api/auth/register":"/api/auth/login",{method:"POST",body:JSON.stringify(body)});await enterApp(data.user);}catch(error){if(state.registerMode&&error.message.includes("already exists")){setAuthMode(false);$("#auth-error").textContent="This account already exists. Enter its password to sign in.";}else{$("#auth-error").textContent=error.message;}$("#auth-error").hidden=false;}});
$("#logout").addEventListener("click",async()=>{try{await api("/api/auth/logout",{method:"POST"});}finally{state.user=null;showAuth();}});
$("#new-task").addEventListener("click",()=>openTask());
$("#close-dialog").addEventListener("click",()=>$("#task-dialog").close()); $("#cancel-dialog").addEventListener("click",()=>$("#task-dialog").close());
$("#task-form").addEventListener("submit",async event=>{event.preventDefault();const id=$("#task-id").value;const body={title:$("#title").value,description:$("#description").value,priority:$("#priority").value,status:$("#status").value,assignee:$("#assignee").value,dueDate:$("#due-date").value||null};try{await api(id?`/api/tasks/${id}`:"/api/tasks",{method:id?"PATCH":"POST",body:JSON.stringify(body)});$("#task-dialog").close();await load();}catch(error){$("#task-error").textContent=error.message;$("#task-error").hidden=false;}});
$("#board").addEventListener("click",async event=>{const action=event.target.dataset.action;if(!action)return;const id=event.target.closest(".task").dataset.id;const task=state.tasks.find(item=>item.id===id);try{if(action==="edit")return openTask(task);if(action==="delete"&&confirm(`Delete “${task.title}”?`))await api(`/api/tasks/${id}`,{method:"DELETE"});if(action==="move"){const index=statuses.findIndex(([value])=>value===task.status);await api(`/api/tasks/${id}/status`,{method:"PATCH",body:JSON.stringify({status:statuses[(index+1)%statuses.length][0]})});}await load();}catch(error){notice(error.message);}});
let timer; $("#search").addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(load,250)}); $("#status-filter").addEventListener("change",load); $("#priority-filter").addEventListener("change",load);

api("/api/auth/me").then(enterApp).catch(showAuth);
