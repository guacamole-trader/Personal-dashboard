const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);
let currentUser = null, currentSection = 'home', sortState = {};

// ── AUTH ──────────────────────────────────────────────────────────────────
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error'), btn = document.getElementById('login-btn');
  errEl.style.display='none'; btn.disabled=true; btn.textContent='Signing in…';
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  btn.disabled=false; btn.textContent='Sign in';
  if (error) { errEl.textContent=error.message; errEl.style.display='block'; return; }
  currentUser=data.user; showDashboard();
}
async function handleSignup() {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('signup-error'), btn = document.getElementById('signup-btn');
  errEl.style.display='none'; btn.disabled=true; btn.textContent='Creating account…';
  const { data, error } = await db.auth.signUp({ email, password });
  btn.disabled=false; btn.textContent='Create account';
  if (error) { errEl.textContent=error.message; errEl.style.display='block'; return; }
  if (data.user&&data.session) { currentUser=data.user; showDashboard(); }
  else { errEl.style.cssText='background:#f0fff4;border-color:#b2dfdb;color:#1b5e20;display:block'; errEl.textContent='Check your email to confirm, then sign in.'; }
}
async function handleSignOut() { await db.auth.signOut(); currentUser=null; document.getElementById('dashboard').style.display='none'; showLogin(); }
function showLogin() { document.getElementById('signup-screen').style.display='none'; document.getElementById('login-screen').style.display='flex'; }
function showSignup() { document.getElementById('login-screen').style.display='none'; document.getElementById('signup-screen').style.display='flex'; }
function showDashboard() {
  document.getElementById('login-screen').style.display='none';
  document.getElementById('signup-screen').style.display='none';
  document.getElementById('dashboard').style.display='block';
  document.getElementById('user-email-display').textContent=currentUser.email;
  setGreeting(); setDate(); loadDailyMsg(); loadSection(currentSection); loadAllBadges();
  initSidebarDrag();
  restoreSidebarOrder();
}

// ── SIDEBAR DRAG ──────────────────────────────────────────────────────────
function initSidebarDrag() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav || nav._sortable) return;
  nav._sortable = Sortable.create(nav, {
    animation: 150,
    ghostClass: 'drag-ghost',
    chosenClass: 'drag-chosen',
    onEnd: () => {
      const order = Array.from(nav.querySelectorAll('.nav-item[data-sec]')).map(el => el.dataset.sec);
      localStorage.setItem('sidebar-order', JSON.stringify(order));
    }
  });
}

function restoreSidebarOrder() {
  try {
    const saved = localStorage.getItem('sidebar-order');
    if (!saved) return;
    const order = JSON.parse(saved);
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    order.forEach(sec => {
      const item = nav.querySelector(`[data-sec="${sec}"]`);
      if (item) nav.appendChild(item);
    });
  } catch(e) {}
}
(async()=>{ const { data }=await db.auth.getSession(); if(data.session){currentUser=data.session.user;showDashboard();} })();

// ── GREETING & DATE ───────────────────────────────────────────────────────
function setGreeting() {
  const h=new Date().getHours(), g=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  document.getElementById('topbar-greeting').textContent=`${g}, ${currentUser.email.split('@')[0]} 👋`;
}
function setDate() { document.getElementById('topbar-date').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }

// ── DARK MODE ─────────────────────────────────────────────────────────────
function toggleDark() {
  document.body.classList.toggle('dark');
  const isDark=document.body.classList.contains('dark');
  document.getElementById('dark-label').textContent=isDark?'☀️':'🌙';
  localStorage.setItem('dash-dark',isDark?'1':'0');
}
if(localStorage.getItem('dash-dark')==='1'){document.body.classList.add('dark');document.addEventListener('DOMContentLoaded',()=>{const el=document.getElementById('dark-label');if(el)el.textContent='☀️';});}

// ── SIDEBAR ───────────────────────────────────────────────────────────────
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }

// ── NAVIGATION ────────────────────────────────────────────────────────────
function nav(sec) {
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelector(`[onclick="nav('${sec}')"]`).classList.add('active');
  document.getElementById('sec-'+sec).classList.add('active');
  currentSection=sec; loadSection(sec);
}

// ── LOADING ───────────────────────────────────────────────────────────────
function setLoading(on) { const el=document.getElementById('loading-overlay'); if(el)el.classList.toggle('visible',on); }

// ── HELPERS ───────────────────────────────────────────────────────────────
function v(id) { return document.getElementById(id); }
function val(id) { return v(id)?v(id).value.trim():''; }
function clr(...ids) { ids.forEach(id=>{if(v(id))v(id).value='';}); }
function uid() { return currentUser.id; }
function esc(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function delBtn(fn) { return `<button class="del-btn" onclick="${fn}">✕</button>`; }
function today() { return new Date().toISOString().slice(0,10); }
function dragHandle() { return `<td class="drag-handle" title="Drag to reorder">⋮⋮</td>`; }

// ── SUPABASE CRUD ─────────────────────────────────────────────────────────
async function dbInsert(table,row) { const {error}=await db.from(table).insert({...row,user_id:uid()}); if(error)alert('Save error: '+error.message); }
async function dbDelete(table,id) { const {error}=await db.from(table).delete().eq('id',id).eq('user_id',uid()); if(error)alert('Delete error: '+error.message); }
async function dbUpdate(table,id,fields) { const {error}=await db.from(table).update(fields).eq('id',id).eq('user_id',uid()); if(error)alert('Update error: '+error.message); }
async function dbSelect(table,fallbackOrder='created_at') {
  const {data,error}=await db.from(table).select('*').eq('user_id',uid()).order(fallbackOrder,{ascending:false});
  if(error){console.error(error);return[];}
  if(!data||!data.length)return[];
  const hasSortOrder=data.some(r=>r.sort_order!==null&&r.sort_order!==undefined);
  if(!hasSortOrder)return data;
  return [...data].sort((a,b)=>(a.sort_order??999999)-(b.sort_order??999999));
}

// ── SECTION LOADER ────────────────────────────────────────────────────────
async function loadSection(sec) {
  setLoading(true);
  try {
    const fn={home:renderHome,todo:renderTodo,books:renderBooks,travel:renderTravel,subs:renderSubs,restaurants:renderRestaurants,budget:renderBudget,car:renderCar,videos:renderVideos,groceries:renderGroceries,workout:renderWorkout,journal:renderJournal,links:renderLinks};
    if(fn[sec])await fn[sec]();
  } finally { setLoading(false); }
}
async function addItem(sec) {
  const fn={todo:addTodo,books:addBook,travel:addTravel,subs:addSub,restaurants:addRestaurant,budget:addBudget,car:addCar,videos:addVideo,groceries:addGrocery,workout:addWorkout,links:addLink};
  if(fn[sec])await fn[sec]();
}

// ── BADGES ────────────────────────────────────────────────────────────────
async function loadAllBadges() {
  const tables={todo:'todos',books:'books',videos:'videos',restaurants:'restaurants',travel:'travel',groceries:'groceries',subs:'subscriptions',budget:'budget',car:'car_maintenance',workout:'workouts',journal:'journal',links:'links'};
  for(const [sec,table] of Object.entries(tables)){
    const {count}=await db.from(table).select('*',{count:'exact',head:true}).eq('user_id',uid());
    const el=document.getElementById('badge-'+sec); if(el)el.textContent=count||'';
  }
}
function updateBadge(sec,rows){const el=document.getElementById('badge-'+sec);if(el)el.textContent=rows.length||'';}

// ── DAILY MESSAGE ─────────────────────────────────────────────────────────
async function loadDailyMsg() {
  try { const {data}=await db.from('daily_message').select('message').eq('user_id',uid()).single(); if(data&&v('daily-msg'))v('daily-msg').value=data.message||''; } catch(e){}
}
async function saveDailyMsg() {
  const message=v('daily-msg')?v('daily-msg').value:'';
  await db.from('daily_message').upsert({user_id:uid(),message,updated_at:new Date().toISOString()},{onConflict:'user_id'});
}

// ── SEARCH ────────────────────────────────────────────────────────────────
function filterTable(sec) {
  const query=(v('search-'+sec)||{value:''}).value.toLowerCase();
  const tbody=document.querySelector('#table-'+sec+' tbody'); if(!tbody)return;
  Array.from(tbody.rows).forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(query)?'':'none';});
}

// ── SORT ──────────────────────────────────────────────────────────────────
function sortTable(sec,colIdx) {
  const key=sec+'-'+colIdx; sortState[key]=sortState[key]==='asc'?'desc':'asc';
  const asc=sortState[key]==='asc';
  const tbody=document.querySelector('#table-'+sec+' tbody'); if(!tbody)return;
  const rows=Array.from(tbody.rows);
  rows.sort((a,b)=>{
    const at=(a.cells[colIdx]||{}).textContent.trim().toLowerCase();
    const bt=(b.cells[colIdx]||{}).textContent.trim().toLowerCase();
    const an=parseFloat(at),bn=parseFloat(bt);
    if(!isNaN(an)&&!isNaN(bn))return asc?an-bn:bn-an;
    return asc?at.localeCompare(bt):bt.localeCompare(at);
  });
  rows.forEach(r=>tbody.appendChild(r));
}

// ── EXPORT CSV ────────────────────────────────────────────────────────────
function exportCSV(sec) {
  const table=document.getElementById('table-'+sec); if(!table)return;
  const headers=Array.from(table.querySelectorAll('thead tr:first-child th')).map(th=>th.textContent.replace(/[↕]/g,'').trim()).filter(h=>h);
  const lines=[headers.join(',')];
  Array.from(table.querySelectorAll('tbody tr')).forEach(row=>{
    if(row.style.display==='none')return;
    lines.push(Array.from(row.cells).slice(0,headers.length).map(td=>`"${td.textContent.trim().replace(/"/g,'""')}"`).join(','));
  });
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'})); a.download=sec+'-export.csv'; a.click();
}

// ── PROGRESS ──────────────────────────────────────────────────────────────
function setProgress(sec,done,total) {
  const statEl=v(sec+'-stat'),barEl=v(sec+'-bar'); if(!statEl||!barEl)return;
  statEl.textContent=`${done} of ${total} done`; barEl.style.width=(total>0?Math.round(done/total*100):0)+'%';
}

// ── OVERDUE ───────────────────────────────────────────────────────────────
function isOverdue(dateStr){return dateStr&&new Date(dateStr)<new Date(today());}

// ── DRAG ──────────────────────────────────────────────────────────────────
const dragInstances={};
const sectionTables={todo:'todos',books:'books',videos:'videos',restaurants:'restaurants',travel:'travel',groceries:'groceries',subs:'subscriptions',budget:'budget',car:'car_maintenance',workout:'workouts'};
function initDrag(sec) {
  const table=sectionTables[sec]; if(!table)return;
  const tbody=document.querySelector('#table-'+sec+' tbody'); if(!tbody)return;
  if(dragInstances[sec])dragInstances[sec].destroy();
  dragInstances[sec]=Sortable.create(tbody,{animation:150,handle:'.drag-handle',ghostClass:'drag-ghost',chosenClass:'drag-chosen',
    onEnd:async()=>{ const rows=Array.from(tbody.querySelectorAll('tr[data-id]')); await Promise.all(rows.map((row,idx)=>dbUpdate(table,row.dataset.id,{sort_order:idx}))); }
  });
}

// ── INLINE EDITING ────────────────────────────────────────────────────────
// editCell(td, table, id, field, type, options)
// type: 'text' | 'select' | 'date' | 'number'
// options: array of strings for select type
function editCell(td, table, id, field, type, options) {
  if (td.querySelector('input,select')) return; // already editing
  const original = td.dataset.value || td.textContent.trim();
  td.dataset.value = original;

  let input;
  if (type === 'select') {
    input = document.createElement('select');
    input.style.cssText = 'width:100%;font-size:12px;padding:3px 6px;border:0.5px solid var(--lb-400);border-radius:4px;background:var(--white);color:#1a1a1a;outline:none;';
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      if (opt === original) o.selected = true;
      input.appendChild(o);
    });
  } else {
    input = document.createElement('input');
    input.type = type || 'text';
    input.value = original;
    input.style.cssText = 'width:100%;font-size:12px;padding:3px 6px;border:0.5px solid var(--lb-400);border-radius:4px;background:var(--white);color:#1a1a1a;outline:none;';
  }

  const prev = td.innerHTML;
  td.innerHTML = '';
  td.appendChild(input);
  input.focus();
  if (type === 'text') input.select();

  async function save() {
    const newVal = input.value.trim();
    if (newVal === original) { td.innerHTML = prev; return; }
    td.innerHTML = newVal;
    td.dataset.value = newVal;
    const update = {};
    update[field] = type === 'number' ? (parseFloat(newVal) || 0) : (newVal || null);
    await dbUpdate(table, id, update);
    // Reload section to sync all state (progress, badges, status colors)
    await loadSection(currentSection);
  }

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { td.innerHTML = prev; input.removeEventListener('blur', save); }
  });
  if (type === 'select') input.addEventListener('change', () => input.blur());
}

// ── HOME SCREEN ───────────────────────────────────────────────────────────
async function renderHome() {
  // Fetch all data in parallel
  const [todos, books, videos, subs, budget, car, workouts, groceries, travel, restaurants, journal] = await Promise.all([
    dbSelect('todos','created_at'), dbSelect('books','title'), dbSelect('videos','title'),
    dbSelect('subscriptions','name'), dbSelect('budget','entry_date'), dbSelect('car_maintenance','service_date'),
    dbSelect('workouts','workout_date'), dbSelect('groceries','item'), dbSelect('travel','city'), dbSelect('restaurants','name'),
    dbSelect('journal','entry_date')
  ]);

  // Summary cards
  const income = budget.filter(b=>b.type==='income').reduce((a,b)=>a+b.amount,0);
  const expense = budget.filter(b=>b.type==='expense').reduce((a,b)=>a+b.amount,0);
  const activeSubs = subs.filter(s=>s.status==='active');
  const subTotal = activeSubs.reduce((a,s)=>a+(s.cost||0),0);
  const todoDue = todos.filter(t=>!t.done&&isOverdue(t.due_date)).length;
  const carPending = car.filter(c=>c.status==='Pending'||c.status==='Overdue').length;

  document.getElementById('home-grid').innerHTML = `
    <div class="home-stat" onclick="nav('todo')">
      <div class="home-stat-icon">✓</div>
      <div class="home-stat-num">${todos.filter(t=>!t.done).length}</div>
      <div class="home-stat-label">Tasks remaining</div>
      <div class="home-stat-sub">${todoDue>0?`⚠ ${todoDue} overdue`:`${todos.filter(t=>t.done).length} completed`}</div>
    </div>
    <div class="home-stat" onclick="nav('budget')">
      <div class="home-stat-icon">$</div>
      <div class="home-stat-num" style="color:${income-expense>=0?'var(--green)':'var(--red)'}">$${Math.abs(income-expense).toFixed(0)}</div>
      <div class="home-stat-label">Balance</div>
      <div class="home-stat-sub">$${income.toFixed(0)} in · $${expense.toFixed(0)} out</div>
    </div>
    <div class="home-stat" onclick="nav('subs')">
      <div class="home-stat-icon">♻</div>
      <div class="home-stat-num">${activeSubs.length}</div>
      <div class="home-stat-label">Recurrent Payments</div>
      <div class="home-stat-sub">$${subTotal.toFixed(2)}/mo · $${(subTotal*12).toFixed(0)}/yr</div>
    </div>
    <div class="home-stat" onclick="nav('books')">
      <div class="home-stat-icon">📖</div>
      <div class="home-stat-num">${books.filter(b=>b.status==='Reading').length}</div>
      <div class="home-stat-label">Currently reading</div>
      <div class="home-stat-sub">${books.filter(b=>b.status==='Want to read').length} on reading list</div>
    </div>
    <div class="home-stat" onclick="nav('groceries')">
      <div class="home-stat-icon">🛒</div>
      <div class="home-stat-num">${groceries.filter(g=>g.status==='need').length}</div>
      <div class="home-stat-label">Items to buy</div>
      <div class="home-stat-sub">${groceries.filter(g=>g.status==='bought').length} already bought</div>
    </div>
    <div class="home-stat" onclick="nav('travel')">
      <div class="home-stat-icon">✈</div>
      <div class="home-stat-num">${travel.filter(t=>t.status==='Visited').length}</div>
      <div class="home-stat-label">Places visited</div>
      <div class="home-stat-sub">${travel.filter(t=>t.status==='Wish list').length} on wish list</div>
    </div>
    <div class="home-stat" onclick="nav('car')">
      <div class="home-stat-icon">🚗</div>
      <div class="home-stat-num" style="color:${carPending>0?'var(--red)':'var(--green)'}">${carPending}</div>
      <div class="home-stat-label">Car tasks pending</div>
      <div class="home-stat-sub">${car.filter(c=>c.status==='Done').length} completed</div>
    </div>
    <div class="home-stat" onclick="nav('journal')">
      <div class="home-stat-icon">📓</div>
      <div class="home-stat-num">${journal.filter(j=>{ try{return new Date(j.entry_date).getMonth()===new Date().getMonth();}catch{return false;} }).length}</div>
      <div class="home-stat-label">Journal entries this month</div>
      <div class="home-stat-sub">${journal.length} total entries</div>
    </div>`;

  // All tasks
  const allTasks = todos.sort((a,b) => {
    // Sort: overdue first, then by status (To do, In progress, Done), then by due date
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    if (isOverdue(a.due_date) && !isOverdue(b.due_date)) return -1;
    if (!isOverdue(a.due_date) && isOverdue(b.due_date)) return 1;
    if (a.due_date && b.due_date) return new Date(a.due_date)-new Date(b.due_date);
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;
    return 0;
  });
  document.getElementById('home-tasks').innerHTML = `<div class="home-panel-body">${allTasks.length ? allTasks.map(t=>`
    <div class="home-item" style="${t.done?'opacity:0.5':''}">
      <div class="home-item-left">
        <span style="margin-right:6px;color:${t.done?'var(--green)':'var(--lb-400)'}">${t.done?'✓':'○'}</span>
        <span class="home-item-name" style="${t.done?'text-decoration:line-through':''}">${esc(t.text)}</span>
        ${t.priority==='High'?'<span style="font-size:10px;color:var(--red);margin-left:6px">High</span>':''}
      </div>
      <div class="home-item-right" style="color:${isOverdue(t.due_date)&&!t.done?'var(--red)':'var(--lb-600)'}">
        ${isOverdue(t.due_date)&&!t.done?'⚠ ':''}${t.due_date||''}
      </div>
    </div>`).join('') : '<div class="home-empty">No tasks yet</div>'}</div>`;

  // Recent workouts
  const recentW = workouts.slice(0,20);
  document.getElementById('home-workouts').innerHTML = `<div class="home-panel-body">${recentW.length ? recentW.map(w=>`
    <div class="home-item">
      <div class="home-item-left"><span class="home-item-name">${esc(w.type)}${w.workout_category?' · '+esc(w.workout_category):''}</span></div>
      <div class="home-item-right">${w.duration_min?w.duration_min+' min':''} ${w.workout_date||''}</div>
    </div>`).join('') : '<div class="home-empty">No workouts logged yet</div>'}</div>`;

  // Car maintenance
  const pendingCar = car.filter(c=>c.status!=='Done');
  document.getElementById('home-car').innerHTML = `<div class="home-panel-body">${pendingCar.length ? pendingCar.map(c=>`
    <div class="home-item">
      <div class="home-item-left"><span class="home-item-name">${esc(c.task)}</span></div>
      <div class="home-item-right" style="color:${c.status==='Overdue'?'var(--red)':'var(--lb-600)'}">${esc(c.status)}</div>
    </div>`).join('') : '<div class="home-empty">All caught up! ✓</div>'}</div>`;

  // Subscriptions
  document.getElementById('home-subs').innerHTML = `<div class="home-panel-body">${activeSubs.length ? activeSubs.map(s=>`
    <div class="home-item">
      <div class="home-item-left"><span class="home-item-name">${esc(s.name)}</span></div>
      <div class="home-item-right">$${(s.cost||0).toFixed(2)}/mo${s.billing_date?' · day '+s.billing_date:''}</div>
    </div>`).join('') : '<div class="home-empty">No active recurrent payments</div>'}</div>`;
}

// ── TO-DO ─────────────────────────────────────────────────────────────────
async function addTodo() {
  const text=val('todo-task'); if(!text)return;
  await dbInsert('todos',{text,priority:val('todo-pri')||'Medium',category:val('todo-cat'),due_date:v('todo-due').value||null,status:val('todo-status')||'To do',note:val('todo-note'),done:false});
  clr('todo-task','todo-cat','todo-note'); v('todo-due').value=''; await renderTodo();
}
async function toggleTodo(id,done){await dbUpdate('todos',id,{done:!done,status:!done?'Done':'To do'});await renderTodo();}
async function deleteTodo(id){await dbDelete('todos',id);await renderTodo();}
async function renderTodo() {
  const rows=await dbSelect('todos','created_at'); updateBadge('todo',rows); setProgress('todo',rows.filter(r=>r.done).length,rows.length);
  const el=v('todo-list'); if(!el)return;
  if(!rows.length){el.innerHTML=`<tr><td colspan="8" class="empty">No tasks yet</td></tr>`;return;}
  const priC={'High':'priority-high','Medium':'priority-medium','Low':'priority-low'};
  const stC={'Done':'status-done','In progress':'status-progress','To do':'status-todo'};
  el.innerHTML=rows.map(t=>`
    <tr data-id="${t.id}" class="${t.done?'done-row':''}">
      ${dragHandle()}
      <td><div class="cell-check"><input class="check" type="checkbox" ${t.done?'checked':''} onchange="toggleTodo('${t.id}',${t.done})">${esc(t.text)}</div></td>
      <td class="${priC[t.priority]||''}" onclick="editCell(this,'todos','${t.id}','priority','select',['High','Medium','Low'])" title="Click to edit">${esc(t.priority||'')}</td>
      <td onclick="editCell(this,'todos','${t.id}','category','text')" title="Click to edit">${esc(t.category||'')}</td>
      <td class="${isOverdue(t.due_date)&&!t.done?'overdue-date':''}" onclick="editCell(this,'todos','${t.id}','due_date','date')" title="Click to edit">${t.due_date||''}${isOverdue(t.due_date)&&!t.done?' ⚠':''}</td>
      <td class="${stC[t.status]||''}" onclick="editCell(this,'todos','${t.id}','status','select',['To do','In progress','Done'])" title="Click to edit">${esc(t.status||'')}</td>
      <td onclick="editCell(this,'todos','${t.id}','note','text')" title="Click to edit">${esc(t.note||'')}</td>
      <td>${delBtn(`deleteTodo('${t.id}')`)}</td>
    </tr>`).join('');
  initDrag('todo');
}

// ── BOOKS ─────────────────────────────────────────────────────────────────
async function addBook() {
  const title=val('books-title'); if(!title)return;
  await dbInsert('books',{title,author:val('books-author'),category:val('books-category'),status:val('books-status')});
  clr('books-title','books-author'); await renderBooks();
}
async function toggleBook(id,status){await dbUpdate('books',id,{status:status==='Read'?'Want to read':'Read'});await renderBooks();}
async function deleteBook(id){await dbDelete('books',id);await renderBooks();}
async function renderBooks() {
  const rows=await dbSelect('books','title'); updateBadge('books',rows); setProgress('books',rows.filter(r=>r.status==='Read').length,rows.length);
  const el=v('books-list'); if(!el)return;
  if(!rows.length){el.innerHTML=`<tr><td colspan="6" class="empty">No books yet</td></tr>`;return;}
  const stC={'Read':'status-done','Reading':'status-progress','Want to read':'status-todo'};
  el.innerHTML=rows.map(b=>`
    <tr data-id="${b.id}" class="${b.status==='Read'?'done-row':''}">
      ${dragHandle()}
      <td><div class="cell-check"><input class="check" type="checkbox" ${b.status==='Read'?'checked':''} onchange="toggleBook('${b.id}','${b.status}')">${esc(b.title)}</div></td>
      <td onclick="editCell(this,'books','${b.id}','author','text')" title="Click to edit">${esc(b.author||'')}</td>
      <td onclick="editCell(this,'books','${b.id}','category','select',['Health','Personal Growth','Music','Business','Finance','Science','History','Philosophy','Psychology','Biography','Fiction','Self-Help','Spirituality','Technology','Other'])" title="Click to edit">${esc(b.category||'')}</td>
      <td class="${stC[b.status]||''}" onclick="editCell(this,'books','${b.id}','status','select',['Want to read','Reading','Read'])" title="Click to edit">${esc(b.status||'')}</td>
      <td>${delBtn(`deleteBook('${b.id}')`)}</td>
    </tr>`).join('');
  initDrag('books');
}

// ── VIDEOS ────────────────────────────────────────────────────────────────
async function addVideo() {
  const title=val('videos-title'); if(!title)return;
  await dbInsert('videos',{title,category:val('videos-category'),source:val('videos-source'),note:val('videos-note'),status:val('videos-status')});
  clr('videos-title','videos-source','videos-note'); await renderVideos();
}
async function toggleVideo(id,status){await dbUpdate('videos',id,{status:status==='Done'?'To watch':'Done'});await renderVideos();}
async function deleteVideo(id){await dbDelete('videos',id);await renderVideos();}
async function renderVideos() {
  const rows=await dbSelect('videos','title'); updateBadge('videos',rows); setProgress('videos',rows.filter(r=>r.status==='Done').length,rows.length);
  const el=v('videos-list'); if(!el)return;
  if(!rows.length){el.innerHTML=`<tr><td colspan="6" class="empty">No videos yet</td></tr>`;return;}
  const stC={'Done':'status-done','Watching':'status-progress','To watch':'status-todo'};
  el.innerHTML=rows.map(vd=>`
    <tr data-id="${vd.id}" class="${vd.status==='Done'?'done-row':''}">
      ${dragHandle()}
      <td><div class="cell-check"><input class="check" type="checkbox" ${vd.status==='Done'?'checked':''} onchange="toggleVideo('${vd.id}','${vd.status}')">${esc(vd.title)}</div></td>
      <td onclick="editCell(this,'videos','${vd.id}','category','select',['Health','Personal Growth','Music','Technology','Science','Finance','History','Comedy','Motivation','Cooking','Travel','Sports','Documentary','Education','Other'])" title="Click to edit">${esc(vd.category||'')}</td>
      <td onclick="editCell(this,'videos','${vd.id}','source','text')" title="Click to edit">${esc(vd.source||'')}</td>
      <td style="text-align:center">${vd.source?`<a href="${esc(vd.source)}" target="_blank" rel="noopener" style="display:inline-block;padding:3px 10px;background:var(--lb-400);color:#fff;border-radius:var(--radius-sm);font-size:11px;font-weight:500;text-decoration:none" title="Open video">▶ Watch</a>`:'—'}</td>
      <td onclick="editCell(this,'videos','${vd.id}','note','text')" title="Click to edit">${esc(vd.note||'')}</td>
      <td class="${stC[vd.status]||''}" onclick="editCell(this,'videos','${vd.id}','status','select',['To watch','Watching','Done'])" title="Click to edit">${esc(vd.status||'')}</td>
      <td>${delBtn(`deleteVideo('${vd.id}')`)}</td>
    </tr>`).join('');
  initDrag('videos');
}

// ── RESTAURANTS ───────────────────────────────────────────────────────────
async function addRestaurant() {
  const name=val('restaurants-name'); if(!name)return;
  await dbInsert('restaurants',{name,cuisine:val('restaurants-cuisine'),location:val('restaurants-location'),price_range:val('restaurants-price'),rating:val('restaurants-rating'),status:val('restaurants-status'),notes:val('restaurants-notes')});
  clr('restaurants-name','restaurants-location','restaurants-notes'); await renderRestaurants();
}
async function toggleRestaurant(id,status){await dbUpdate('restaurants',id,{status:status==='Tried'?'Want to try':'Tried'});await renderRestaurants();}
async function deleteRestaurant(id){await dbDelete('restaurants',id);await renderRestaurants();}
async function renderRestaurants() {
  const rows=await dbSelect('restaurants','name'); updateBadge('restaurants',rows); setProgress('restaurants',rows.filter(r=>r.status==='Tried'||r.status==='Favorite').length,rows.length);
  const el=v('restaurants-list'); if(!el)return;
  if(!rows.length){el.innerHTML=`<tr><td colspan="9" class="empty">No restaurants yet</td></tr>`;return;}
  const stC={'Favorite':'status-done','Tried':'status-progress','Want to try':'status-todo'};
  el.innerHTML=rows.map(r=>`
    <tr data-id="${r.id}" class="${r.status!=='Want to try'?'done-row':''}">
      ${dragHandle()}
      <td><div class="cell-check"><input class="check" type="checkbox" ${r.status!=='Want to try'?'checked':''} onchange="toggleRestaurant('${r.id}','${r.status}')">${esc(r.name)}</div></td>
      <td onclick="editCell(this,'restaurants','${r.id}','cuisine','select',['American','Italian','Mexican','Japanese','Chinese','Thai','Indian','Mediterranean','French','Greek','Korean','Vietnamese','BBQ','Seafood','Steakhouse','Vegan','Other'])" title="Click to edit">${esc(r.cuisine||'')}</td>
      <td onclick="editCell(this,'restaurants','${r.id}','location','text')" title="Click to edit">${esc(r.location||'')}</td>
      <td onclick="editCell(this,'restaurants','${r.id}','price_range','select',['$','$$','$$$','$$$$'])" title="Click to edit">${esc(r.price_range||'')}</td>
      <td onclick="editCell(this,'restaurants','${r.id}','rating','select',['','⭐','⭐⭐','⭐⭐⭐','⭐⭐⭐⭐','⭐⭐⭐⭐⭐'])" title="Click to edit">${esc(r.rating||'')}</td>
      <td class="${stC[r.status]||''}" onclick="editCell(this,'restaurants','${r.id}','status','select',['Want to try','Tried','Favorite'])" title="Click to edit">${esc(r.status||'')}</td>
      <td onclick="editCell(this,'restaurants','${r.id}','notes','text')" title="Click to edit">${esc(r.notes||'')}</td>
      <td>${delBtn(`deleteRestaurant('${r.id}')`)}</td>
    </tr>`).join('');
  initDrag('restaurants');
}

// ── TRAVEL ────────────────────────────────────────────────────────────────
async function addTravel() {
  const city=val('travel-city'); if(!city)return;
  await dbInsert('travel',{city,country:val('travel-country'),continent:val('travel-continent'),trip_type:val('travel-type'),status:val('travel-status'),notes:val('travel-notes')});
  clr('travel-city','travel-country','travel-notes'); await renderTravel();
}
async function toggleTravel(id,status){await dbUpdate('travel',id,{status:status==='Visited'?'Wish list':'Visited'});await renderTravel();}
async function deleteTravel(id){await dbDelete('travel',id);await renderTravel();}
async function renderTravel() {
  const rows=await dbSelect('travel','city'); updateBadge('travel',rows); setProgress('travel',rows.filter(r=>r.status==='Visited').length,rows.length);
  const el=v('travel-list'); if(!el)return;
  if(!rows.length){el.innerHTML=`<tr><td colspan="8" class="empty">No destinations yet</td></tr>`;return;}
  const stC={'Visited':'status-done','Planned':'status-progress','Wish list':'status-todo'};
  el.innerHTML=rows.map(c=>`
    <tr data-id="${c.id}" class="${c.status==='Visited'?'done-row':''}">
      ${dragHandle()}
      <td><div class="cell-check"><input class="check" type="checkbox" ${c.status==='Visited'?'checked':''} onchange="toggleTravel('${c.id}','${c.status}')">${esc(c.city)}</div></td>
      <td onclick="editCell(this,'travel','${c.id}','country','text')" title="Click to edit">${esc(c.country||'')}</td>
      <td onclick="editCell(this,'travel','${c.id}','continent','select',['North America','South America','Europe','Asia','Africa','Oceania','Middle East','Caribbean'])" title="Click to edit">${esc(c.continent||'')}</td>
      <td onclick="editCell(this,'travel','${c.id}','trip_type','select',['Beach','City','Adventure','Cultural','Nature','Road trip','Cruise','Other'])" title="Click to edit">${esc(c.trip_type||'')}</td>
      <td class="${stC[c.status]||''}" onclick="editCell(this,'travel','${c.id}','status','select',['Wish list','Planned','Visited'])" title="Click to edit">${esc(c.status||'')}</td>
      <td onclick="editCell(this,'travel','${c.id}','notes','text')" title="Click to edit">${esc(c.notes||'')}</td>
      <td>${delBtn(`deleteTravel('${c.id}')`)}</td>
    </tr>`).join('');
  initDrag('travel');
}

// ── GROCERIES ─────────────────────────────────────────────────────────────
async function addGrocery() {
  const item=val('groceries-item'); if(!item)return;
  await dbInsert('groceries',{item,qty:val('groceries-qty'),store:val('groceries-store'),status:val('groceries-status')});
  clr('groceries-item','groceries-qty','groceries-store'); await renderGroceries();
}
async function toggleGrocery(id,status){await dbUpdate('groceries',id,{status:status==='bought'?'need':'bought'});await renderGroceries();}
async function deleteGrocery(id){await dbDelete('groceries',id);await renderGroceries();}
async function clearBought(){const rows=await dbSelect('groceries');await Promise.all(rows.filter(g=>g.status==='bought').map(g=>dbDelete('groceries',g.id)));await renderGroceries();}
async function renderGroceries() {
  const rows=await dbSelect('groceries','item'); updateBadge('groceries',rows);
  const statEl=v('groceries-stat'); if(statEl)statEl.textContent=`${rows.filter(r=>r.status==='bought').length} of ${rows.length} bought`;
  const el=v('groceries-list'); if(!el)return;
  if(!rows.length){el.innerHTML=`<tr><td colspan="6" class="empty">List is empty</td></tr>`;return;}
  el.innerHTML=rows.map(g=>`
    <tr data-id="${g.id}" class="${g.status==='bought'?'done-row':''}">
      ${dragHandle()}
      <td><div class="cell-check"><input class="check" type="checkbox" ${g.status==='bought'?'checked':''} onchange="toggleGrocery('${g.id}','${g.status}')">${esc(g.item)}</div></td>
      <td onclick="editCell(this,'groceries','${g.id}','qty','text')" title="Click to edit">${esc(g.qty||'')}</td>
      <td onclick="editCell(this,'groceries','${g.id}','store','text')" title="Click to edit">${esc(g.store||'')}</td>
      <td class="${g.status==='bought'?'status-done':'status-todo'}" onclick="editCell(this,'groceries','${g.id}','status','select',['need','bought'])" title="Click to edit">${g.status==='bought'?'Bought':'Need to buy'}</td>
      <td>${delBtn(`deleteGrocery('${g.id}')`)}</td>
    </tr>`).join('');
  initDrag('groceries');
}

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
async function addSub() {
  const name=val('subs-name'); if(!name)return;
  await dbInsert('subscriptions',{name,payment_type:val('subs-type'),cost:parseFloat(v('subs-cost').value)||0,billing_date:parseInt(v('subs-billing').value)||null,status:val('subs-status')});
  clr('subs-name','subs-cost','subs-billing'); await renderSubs();
}
async function toggleSub(id,status){await dbUpdate('subscriptions',id,{status:status==='active'?'paused':'active'});await renderSubs();}
async function deleteSub(id){await dbDelete('subscriptions',id);await renderSubs();}
async function renderSubs() {
  const rows=await dbSelect('subscriptions','name'); updateBadge('subs',rows);
  const active=rows.filter(s=>s.status==='active');
  const total=active.reduce((a,s)=>a+(s.cost||0),0);
  const statEl=v('subs-stat'); if(statEl)statEl.textContent=`${active.length} active · $${total.toFixed(2)}/mo`;
  // Summary cards
  const summary=v('subs-summary');
  if(summary)summary.innerHTML=`
    <div class="subs-summary-card"><div class="subs-summary-lbl">Active subscriptions</div><div class="subs-summary-val">${active.length}</div></div>
    <div class="subs-summary-card"><div class="subs-summary-lbl">Monthly total</div><div class="subs-summary-val">$${total.toFixed(2)}</div></div>
    <div class="subs-summary-card"><div class="subs-summary-lbl">Yearly total</div><div class="subs-summary-val">$${(total*12).toFixed(2)}</div></div>`;
  const el=v('subs-list'); if(!el)return;
  if(!rows.length){el.innerHTML=`<tr><td colspan="8" class="empty">No recurrent payments yet</td></tr>`;return;}
  el.innerHTML=rows.map(s=>`
    <tr data-id="${s.id}" class="${s.status==='paused'?'done-row':''}">
      ${dragHandle()}
      <td onclick="editCell(this,'subscriptions','${s.id}','name','text')" title="Click to edit">${esc(s.name)}</td>
      <td onclick="editCell(this,'subscriptions','${s.id}','payment_type','select',['Subscription','Internet / Phone','Soccer / Sports league','Insurance','Rent / Mortgage','Utilities','Gym / Fitness','Streaming','Software / Apps','Loan','Other'])" title="Click to edit">${esc(s.payment_type||'')}</td>
      <td onclick="editCell(this,'subscriptions','${s.id}','cost','number')" title="Click to edit">$${(s.cost||0).toFixed(2)}/mo</td>
      <td>$${((s.cost||0)*12).toFixed(2)}/yr</td>
      <td onclick="editCell(this,'subscriptions','${s.id}','billing_date','number')" title="Click to edit">${s.billing_date?'Day '+s.billing_date:''}</td>
      <td class="${s.status==='active'?'status-done':'status-todo'}" onclick="editCell(this,'subscriptions','${s.id}','status','select',['active','paused'])" title="Click to edit">${s.status==='active'?'Active':'Paused'}</td>
      <td>${delBtn(`deleteSub('${s.id}')`)}</td>
    </tr>`).join('');
  initDrag('subs');
}

// ── BUDGET ────────────────────────────────────────────────────────────────
let budgetChart=null;
async function addBudget() {
  const label=val('budget-label'),amount=parseFloat(v('budget-amount').value);
  if(!label||isNaN(amount))return;
  await dbInsert('budget',{label,amount,type:val('budget-type'),category:val('budget-category'),entry_date:today()});
  clr('budget-label','budget-amount','budget-category'); await renderBudget();
}
async function deleteBudget(id){await dbDelete('budget',id);await renderBudget();}
async function renderBudget() {
  const rows=await dbSelect('budget','entry_date'); updateBadge('budget',rows);
  const income=rows.filter(b=>b.type==='income').reduce((a,b)=>a+b.amount,0);
  const expense=rows.filter(b=>b.type==='expense').reduce((a,b)=>a+b.amount,0);
  const bal=income-expense, pct=income>0?Math.min(100,Math.round(expense/income*100)):0;
  if(v('b-income'))v('b-income').textContent='$'+income.toFixed(2);
  if(v('b-expense'))v('b-expense').textContent='$'+expense.toFixed(2);
  if(v('b-balance')){v('b-balance').textContent=(bal>=0?'$':'-$')+Math.abs(bal).toFixed(2);v('b-balance').style.color=bal>=0?'var(--lb-800)':'var(--red)';}
  if(v('b-bar')){v('b-bar').style.width=pct+'%';v('b-bar').className='progress-fill'+(pct>90?' over':'');}
  if(v('b-pct'))v('b-pct').textContent=pct+'% of income spent';

  // Budget chart — income vs expense by month
  const canvas=v('budget-chart');
  if(canvas&&rows.length){
    const months={};
    rows.forEach(b=>{
      const m=b.entry_date?b.entry_date.slice(0,7):'Unknown';
      if(!months[m])months[m]={income:0,expense:0};
      if(b.type==='income')months[m].income+=b.amount; else months[m].expense+=b.amount;
    });
    const labels=Object.keys(months).sort().slice(-6);
    const incomeData=labels.map(m=>months[m].income);
    const expenseData=labels.map(m=>months[m].expense);
    if(budgetChart)budgetChart.destroy();
    budgetChart=new Chart(canvas,{
      type:'bar',
      data:{labels,datasets:[
        {label:'Income',data:incomeData,backgroundColor:'rgba(59,109,17,0.7)',borderRadius:4},
        {label:'Expenses',data:expenseData,backgroundColor:'rgba(162,45,45,0.7)',borderRadius:4}
      ]},
      options:{responsive:true,plugins:{legend:{position:'top'}},scales:{y:{beginAtZero:true,ticks:{callback:v=>'$'+v}}}}
    });
  }

  const el=v('budget-list'); if(!el)return;
  if(!rows.length){el.innerHTML=`<tr><td colspan="7" class="empty">No entries yet</td></tr>`;return;}
  el.innerHTML=rows.map(b=>`
    <tr data-id="${b.id}">
      ${dragHandle()}
      <td onclick="editCell(this,'budget','${b.id}','label','text')" title="Click to edit">${esc(b.label)}</td>
      <td onclick="editCell(this,'budget','${b.id}','category','text')" title="Click to edit">${esc(b.category||'')}</td>
      <td onclick="editCell(this,'budget','${b.id}','entry_date','date')" title="Click to edit">${b.entry_date||''}</td>
      <td onclick="editCell(this,'budget','${b.id}','type','select',['income','expense'])" title="Click to edit">${b.type==='income'?'Income':'Expense'}</td>
      <td style="font-weight:500;color:${b.type==='income'?'var(--green)':'var(--red)'}" onclick="editCell(this,'budget','${b.id}','amount','number')" title="Click to edit">${b.type==='income'?'+':'-'}$${b.amount.toFixed(2)}</td>
      <td>${delBtn(`deleteBudget('${b.id}')`)}</td>
    </tr>`).join('');
  initDrag('budget');
}

// ── CAR MAINTENANCE ───────────────────────────────────────────────────────
async function addCar() {
  const task=val('car-task'); if(!task)return;
  await dbInsert('car_maintenance',{task,car_type:val('car-type'),service_date:v('car-date').value||null,mileage:parseInt(v('car-miles').value)||null,cost:parseFloat(v('car-cost').value)||null,status:val('car-status'),notes:val('car-notes')});
  clr('car-task','car-notes'); v('car-date').value=''; v('car-miles').value=''; v('car-cost').value='';
  await renderCar();
}
async function toggleCar(id,status){await dbUpdate('car_maintenance',id,{status:status==='Done'?'Pending':'Done'});await renderCar();}
async function deleteCar(id){await dbDelete('car_maintenance',id);await renderCar();}
async function renderCar() {
  const rows=await dbSelect('car_maintenance','service_date'); updateBadge('car',rows); setProgress('car',rows.filter(r=>r.status==='Done').length,rows.length);
  const el=v('car-list'); if(!el)return;
  if(!rows.length){el.innerHTML=`<tr><td colspan="9" class="empty">No maintenance tasks yet</td></tr>`;return;}
  const stC={'Done':'status-done','Overdue':'priority-high','Pending':'status-todo'};
  el.innerHTML=rows.map(c=>`
    <tr data-id="${c.id}" class="${c.status==='Done'?'done-row':''}">
      ${dragHandle()}
      <td><div class="cell-check"><input class="check" type="checkbox" ${c.status==='Done'?'checked':''} onchange="toggleCar('${c.id}','${c.status}')">${esc(c.task)}</div></td>
      <td onclick="editCell(this,'car_maintenance','${c.id}','car_type','select',['Oil change','Tire rotation','Tire replacement','Brake service','Battery','Air filter','Alignment','Transmission','Inspection','Coolant flush','Windshield','AC service','Other'])" title="Click to edit">${esc(c.car_type||'')}</td>
      <td onclick="editCell(this,'car_maintenance','${c.id}','service_date','date')" title="Click to edit">${c.service_date||''}</td>
      <td onclick="editCell(this,'car_maintenance','${c.id}','mileage','number')" title="Click to edit">${c.mileage?c.mileage.toLocaleString()+' mi':''}</td>
      <td onclick="editCell(this,'car_maintenance','${c.id}','cost','number')" title="Click to edit">${c.cost?'$'+Number(c.cost).toFixed(2):''}</td>
      <td class="${stC[c.status]||''}" onclick="editCell(this,'car_maintenance','${c.id}','status','select',['Pending','Done','Overdue'])" title="Click to edit">${esc(c.status||'')}</td>
      <td onclick="editCell(this,'car_maintenance','${c.id}','notes','text')" title="Click to edit">${esc(c.notes||'')}</td>
      <td>${delBtn(`deleteCar('${c.id}')`)}</td>
    </tr>`).join('');
  initDrag('car');
}

// ── WORKOUT ───────────────────────────────────────────────────────────────
async function addWorkout() {
  const type=val('workout-type'); if(!type)return;
  await dbInsert('workouts',{type,workout_category:val('workout-category'),workout_date:v('workout-date').value||today(),duration_min:parseInt(v('workout-duration').value)||0,notes:val('workout-notes')});
  clr('workout-type','workout-notes'); v('workout-date').value=''; v('workout-duration').value='';
  await renderWorkout();
}
async function deleteWorkout(id){await dbDelete('workouts',id);await renderWorkout();}
async function renderWorkout() {
  const rows=await dbSelect('workouts','workout_date'); updateBadge('workout',rows);
  const total=rows.reduce((a,w)=>a+(w.duration_min||0),0);
  const thisMonth=rows.filter(w=>{try{return new Date(w.workout_date).getMonth()===new Date().getMonth();}catch{return false;}}).length;
  // Streak calculation
  const dates=[...new Set(rows.map(w=>w.workout_date).filter(Boolean))].sort().reverse();
  let streak=0; const td=today();
  for(let i=0;i<dates.length;i++){
    const expected=new Date(td); expected.setDate(expected.getDate()-i);
    if(dates[i]===expected.toISOString().slice(0,10))streak++; else break;
  }
  const el=v('workout-list'); if(!el)return;
  if(!rows.length){el.innerHTML=`<tr><td colspan="8" class="empty">No workouts logged yet</td></tr>`;return;}
  el.innerHTML=rows.map(w=>`
    <tr data-id="${w.id}">
      ${dragHandle()}
      <td>${esc(w.type)}</td>
      <td>${esc(w.workout_category||'')}</td>
      <td>${w.workout_date||''}</td>
      <td>${w.duration_min?w.duration_min+' min':''}</td>
      <td></td>
      <td>${esc(w.notes||'')}</td>
      <td>${delBtn(`deleteWorkout('${w.id}')`)}</td>
    </tr>`).join('');
  initDrag('workout');
  if(v('workout-stats'))v('workout-stats').innerHTML=`
    <div class="stat-card"><div class="stat-num">${rows.length}</div><div class="stat-lbl">Total sessions</div></div>
    <div class="stat-card"><div class="stat-num">${thisMonth}</div><div class="stat-lbl">This month</div></div>
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-lbl">Total minutes</div></div>
    <div class="stat-card"><div class="stat-num">${streak}</div><div class="stat-lbl">Day streak 🔥</div></div>`;
}

// ── JOURNAL ───────────────────────────────────────────────────────────────
let editingJournalId = null;

async function addItem_journal() { openJournalForm(); }

function openJournalForm(entry) {
  editingJournalId = entry ? entry.id : null;
  v('journal-form-title').textContent = entry ? 'Edit entry' : 'New entry';
  v('journal-date').value = entry ? entry.entry_date : today();
  v('journal-title').value = entry ? (entry.title || '') : '';
  v('journal-mood').value = entry ? (entry.mood || '🙂 Good') : '🙂 Good';
  v('journal-category').value = entry ? (entry.category || 'Personal') : 'Personal';
  v('journal-entry').value = entry ? (entry.entry || '') : '';
  v('journal-add-form').style.display = 'block';
  v('journal-entry').focus();
  v('journal-add-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeJournalForm() {
  v('journal-add-form').style.display = 'none';
  editingJournalId = null;
}

function addTodayEntry() { openJournalForm(); }

async function saveJournalEntry() {
  const entry_date = v('journal-date').value || today();
  const title = val('journal-title');
  const mood = val('journal-mood');
  const category = val('journal-category');
  const entry = v('journal-entry').value.trim();
  if (!entry && !title) return;

  if (editingJournalId) {
    await dbUpdate('journal', editingJournalId, { entry_date, title, mood, category, entry });
  } else {
    await dbInsert('journal', { entry_date, title, mood, category, entry });
  }
  closeJournalForm();
  await renderJournal();
}

async function deleteJournalEntry(id) {
  if (!confirm('Delete this journal entry?')) return;
  await dbDelete('journal', id);
  await renderJournal();
}

function toggleJournalCard(id) {
  const card = document.querySelector(`.journal-card[data-id="${id}"]`);
  if (card) card.classList.toggle('expanded');
}

function filterJournal() {
  const query = (v('search-journal')||{value:''}).value.toLowerCase();
  document.querySelectorAll('.journal-card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
}

function exportJournalCSV() {
  const cards = document.querySelectorAll('.journal-card');
  const lines = ['"Date","Title","Mood","Category","Entry"'];
  cards.forEach(card => {
    if (card.style.display === 'none') return;
    const date = card.querySelector('.journal-card-date')?.textContent.trim() || '';
    const title = card.querySelector('.journal-card-title')?.textContent.trim() || '';
    const mood = card.querySelector('.journal-card-mood')?.textContent.trim() || '';
    const cat = card.querySelector('.journal-cat-pill')?.textContent.trim() || '';
    const entry = card.querySelector('.journal-card-preview')?.textContent.trim().replace(/"/g,'""') || '';
    lines.push(`"${date}","${title}","${mood}","${cat}","${entry}"`);
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], {type:'text/csv'}));
  a.download = 'journal-export.csv'; a.click();
}

async function renderJournal() {
  const rows = await dbSelect('journal', 'entry_date');
  updateBadge('journal', rows);

  const statEl = v('journal-stat');
  if (statEl) statEl.textContent = `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`;

  // Mood summary
  const moodEl = document.getElementById('journal-mood-summary');
  if (moodEl && rows.length) {
    const moodCount = {};
    rows.forEach(r => { if(r.mood) moodCount[r.mood] = (moodCount[r.mood]||0)+1; });
    const sorted = Object.entries(moodCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
    moodEl.innerHTML = sorted.map(([mood,count])=>
      `<span class="mood-pill">${mood} <strong>${count}</strong></span>`
    ).join('');
  } else if (moodEl) { moodEl.innerHTML = ''; }

  const el = v('journal-list');
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<div class="empty" style="padding:3rem 0">No journal entries yet — click "✏ Write today" to start</div>`;
    return;
  }

  el.innerHTML = rows.map(r => {
    const preview = (r.entry || '').slice(0, 300);
    const dateFormatted = r.entry_date ? new Date(r.entry_date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',year:'numeric',month:'short',day:'numeric'}) : '';
    return `
    <div class="journal-card" data-id="${r.id}" onclick="toggleJournalCard('${r.id}')">
      <div class="journal-card-header">
        <span class="journal-card-date">${dateFormatted}</span>
        <span class="journal-card-title">${esc(r.title || 'Untitled entry')}</span>
        <span class="journal-card-mood">${esc(r.mood || '')}</span>
      </div>
      <div class="journal-card-meta">
        ${r.category ? `<span class="journal-cat-pill">${esc(r.category)}</span>` : ''}
      </div>
      <div class="journal-card-preview">${esc(preview)}${r.entry && r.entry.length > 300 ? '…' : ''}</div>
      <div class="journal-card-actions">
        <button class="journal-edit-btn" onclick="event.stopPropagation();openJournalForm(${JSON.stringify({id:r.id,entry_date:r.entry_date,title:r.title,mood:r.mood,category:r.category,entry:r.entry}).replace(/"/g,'&quot;')})">✏ Edit</button>
        <button class="journal-del-btn" onclick="event.stopPropagation();deleteJournalEntry('${r.id}')">✕ Delete</button>
      </div>
    </div>`;
  }).join('');
}

// ── LINKS ─────────────────────────────────────────────────────────────────
const folderInstances = {};

function openAddFolder() {
  const bar = v('add-folder-bar');
  if (bar) { bar.style.display = 'flex'; v('folder-name-input').focus(); }
}
function closeAddFolder() {
  const bar = v('add-folder-bar');
  if (bar) { bar.style.display = 'none'; clr('folder-name-input'); }
}

async function saveFolder() {
  const name = val('folder-name-input'); if (!name) return;
  await dbInsert('link_folders', { name, collapsed: false });
  closeAddFolder();
  await renderLinks();
}

async function deleteFolder(id) {
  if (!confirm('Delete this folder? Links inside will become ungrouped.')) return;
  await dbUpdate('links', id, { folder_id: null });
  await dbDelete('link_folders', id);
  await renderLinks();
}

async function toggleFolder(id) {
  const body = document.getElementById('folder-body-' + id);
  const icon = document.getElementById('folder-icon-' + id);
  if (!body) return;
  const isHidden = body.classList.contains('hidden');
  body.classList.toggle('hidden', !isHidden);
  if (icon) { icon.classList.toggle('open', !isHidden); icon.classList.toggle('closed', isHidden); }
  // save collapsed state
  const saved = JSON.parse(localStorage.getItem('folder-collapsed') || '{}');
  saved[id] = isHidden ? false : true;
  localStorage.setItem('folder-collapsed', JSON.stringify(saved));
}

async function addLink() {
  const title = val('links-title'); if (!title) return;
  const folder_id = v('links-folder-select') ? (v('links-folder-select').value || null) : null;
  await dbInsert('links', { title, url: val('links-url'), folder_id, category: val('links-category'), note: val('links-note'), status: 'Active' });
  clr('links-title', 'links-url', 'links-note');
  await renderLinks();
}

async function deleteLink(id) { await dbDelete('links', id); await renderLinks(); }

async function editLinkField(id, field, currentVal) {
  const newVal = prompt(`Edit ${field}:`, currentVal || '');
  if (newVal === null) return;
  await dbUpdate('links', id, { [field]: newVal });
  await renderLinks();
}

function filterLinks() {
  const query = val('search-links').toLowerCase();
  document.querySelectorAll('.link-row').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
  document.querySelectorAll('.links-folder').forEach(folder => {
    const visible = Array.from(folder.querySelectorAll('.link-row')).some(r => r.style.display !== 'none');
    folder.style.display = visible ? '' : 'none';
  });
}

function exportLinksCSV() {
  const rows = document.querySelectorAll('.link-row');
  const lines = ['"Title","URL","Category","Note","Folder"'];
  rows.forEach(row => {
    if (row.style.display === 'none') return;
    const title = row.querySelector('.link-title')?.textContent.trim().replace(/"/g,'""') || '';
    const url = row.querySelector('.link-url')?.textContent.trim().replace(/"/g,'""') || '';
    const cat = row.querySelector('.link-cat')?.textContent.trim().replace(/"/g,'""') || '';
    const note = row.querySelector('.link-note')?.textContent.trim().replace(/"/g,'""') || '';
    const folder = row.closest('.links-folder')?.querySelector('.links-folder-name')?.textContent.trim().replace(/"/g,'""') || '';
    lines.push(`"${title}","${url}","${cat}","${note}","${folder}"`);
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], {type:'text/csv'}));
  a.download = 'links-export.csv'; a.click();
}

function initFolderDrag(folderId) {
  const body = document.getElementById('folder-body-' + folderId);
  if (!body) return;
  if (folderInstances[folderId]) folderInstances[folderId].destroy();
  folderInstances[folderId] = Sortable.create(body, {
    animation: 150,
    group: 'links',
    handle: '.link-drag',
    ghostClass: 'drag-ghost',
    chosenClass: 'drag-chosen',
    onEnd: async (evt) => {
      const linkId = evt.item.dataset.id;
      const newFolder = evt.to.dataset.folder || null;
      await dbUpdate('links', linkId, { folder_id: newFolder });
      // update sort order within new folder
      const siblings = Array.from(evt.to.querySelectorAll('.link-row[data-id]'));
      await Promise.all(siblings.map((el, idx) => dbUpdate('links', el.dataset.id, { sort_order: idx })));
    }
  });
}

function initUngroupedDrag() {
  const el = document.getElementById('ungrouped-links');
  if (!el) return;
  if (folderInstances['ungrouped']) folderInstances['ungrouped'].destroy();
  folderInstances['ungrouped'] = Sortable.create(el, {
    animation: 150,
    group: 'links',
    handle: '.link-drag',
    ghostClass: 'drag-ghost',
    onEnd: async (evt) => {
      const linkId = evt.item.dataset.id;
      const newFolder = evt.to.dataset.folder || null;
      await dbUpdate('links', linkId, { folder_id: newFolder });
      const siblings = Array.from(evt.to.querySelectorAll('.link-row[data-id]'));
      await Promise.all(siblings.map((el, idx) => dbUpdate('links', el.dataset.id, { sort_order: idx })));
    }
  });
}

function linkRowHTML(l) {
  return `<div class="link-row" data-id="${l.id}">
    <span class="link-drag">⋮⋮</span>
    <span class="link-title" onclick="editLinkField('${l.id}','title','${esc(l.title)}')" title="Click to edit title">${esc(l.title)}</span>
    <span class="link-url" onclick="editLinkField('${l.id}','url','${esc(l.url||'')}')" title="Click to edit URL">${esc(l.url||'')}</span>
    ${l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener" class="link-open">🔗 Open</a>` : '<span style="color:var(--lb-200);font-size:12px">no url</span>'}
    <span class="link-cat">${esc(l.category||'')}</span>
    <span class="link-note" onclick="editLinkField('${l.id}','note','${esc(l.note||'')}')" title="Click to edit note">${esc(l.note||'') || '<span style="color:var(--lb-200)">+ note</span>'}</span>
    <button class="link-del" onclick="deleteLink('${l.id}')">✕</button>
  </div>`;
}

async function renderLinks() {
  const [links, folders] = await Promise.all([
    dbSelect('links', 'title'),
    dbSelect('link_folders', 'name')
  ]);

  updateBadge('links', links);
  const statEl = v('links-stat');
  if (statEl) statEl.textContent = `${links.length} ${links.length === 1 ? 'link' : 'links'} · ${folders.length} ${folders.length === 1 ? 'folder' : 'folders'}`;

  // Update folder dropdown in add form
  const sel = v('links-folder-select');
  if (sel) {
    const cur = sel.value;
    sel.innerHTML = '<option value="">No folder</option>' + folders.map(f => `<option value="${f.id}" ${cur===f.id?'selected':''}>${esc(f.name)}</option>`).join('');
  }

  const collapsed = JSON.parse(localStorage.getItem('folder-collapsed') || '{}');
  const content = v('links-content');
  if (!content) return;

  let html = '';

  // Folders
  folders.forEach(folder => {
    const folderLinks = links.filter(l => l.folder_id === folder.id);
    const isCollapsed = collapsed[folder.id] === true;
    html += `<div class="links-folder">
      <div class="links-folder-header" onclick="toggleFolder('${folder.id}')">
        <span class="links-folder-icon ${isCollapsed?'closed':'open'}" id="folder-icon-${folder.id}">▾</span>
        <span class="links-folder-name">📁 ${esc(folder.name)}</span>
        <span class="links-folder-count">${folderLinks.length}</span>
        <button class="links-folder-del" onclick="event.stopPropagation();deleteFolder('${folder.id}')" title="Delete folder">✕</button>
      </div>
      <div class="links-folder-body ${isCollapsed?'hidden':''}" id="folder-body-${folder.id}" data-folder="${folder.id}">
        ${folderLinks.length ? folderLinks.map(l => linkRowHTML(l)).join('') : '<div style="padding:10px 14px;font-size:12px;color:var(--lb-200)">No links yet — drag links here or add with this folder selected</div>'}
      </div>
    </div>`;
  });

  // Ungrouped links
  const ungrouped = links.filter(l => !l.folder_id);
  if (ungrouped.length || !folders.length) {
    html += `<div class="links-ungrouped">
      ${folders.length ? '<div class="links-ungrouped-label">Ungrouped</div>' : ''}
      <div id="ungrouped-links" data-folder="">
        ${ungrouped.length ? ungrouped.map(l => linkRowHTML(l)).join('') : '<div style="padding:10px 0;font-size:12px;color:var(--lb-200)">No links yet — add your first bookmark above</div>'}
      </div>
    </div>`;
  }

  content.innerHTML = html;

  // Init drag on all folders and ungrouped
  folders.forEach(f => initFolderDrag(f.id));
  initUngroupedDrag();
}

