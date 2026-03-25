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
    const fn={home:renderHome,todo:renderTodo,books:renderBooks,travel:renderTravel,subs:renderSubs,restaurants:renderRestaurants,budget:renderBudget,car:renderCar,videos:renderVideos,groceries:renderGroceries,workout:renderWorkout};
    if(fn[sec])await fn[sec]();
  } finally { setLoading(false); }
}
async function addItem(sec) {
  const fn={todo:addTodo,books:addBook,travel:addTravel,subs:addSub,restaurants:addRestaurant,budget:addBudget,car:addCar,videos:addVideo,groceries:addGrocery,workout:addWorkout};
  if(fn[sec])await fn[sec]();
}

// ── BADGES ────────────────────────────────────────────────────────────────
async function loadAllBadges() {
  const tables={todo:'todos',books:'books',videos:'videos',restaurants:'restaurants',travel:'travel',groceries:'groceries',subs:'subscriptions',budget:'budget',car:'car_maintenance',workout:'workouts'};
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

// ── HOME SCREEN ───────────────────────────────────────────────────────────
async function renderHome() {
  // Fetch all data in parallel
  const [todos, books, videos, subs, budget, car, workouts, groceries, travel, restaurants] = await Promise.all([
    dbSelect('todos','created_at'), dbSelect('books','title'), dbSelect('videos','title'),
    dbSelect('subscriptions','name'), dbSelect('budget','entry_date'), dbSelect('car_maintenance','service_date'),
    dbSelect('workouts','workout_date'), dbSelect('groceries','item'), dbSelect('travel','city'), dbSelect('restaurants','name')
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
      <div class="home-stat-label">Active subscriptions</div>
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
    <div class="home-stat" onclick="nav('workout')">
      <div class="home-stat-icon">💪</div>
      <div class="home-stat-num">${workouts.filter(w=>{try{return new Date(w.workout_date).getMonth()===new Date().getMonth();}catch{return false;}}).length}</div>
      <div class="home-stat-label">Workouts this month</div>
      <div class="home-stat-sub">${workouts.reduce((a,w)=>a+(w.duration_min||0),0)} total minutes logged</div>
    </div>`;

  // Tasks due soon
  const dueSoon = todos.filter(t=>!t.done&&t.due_date).sort((a,b)=>new Date(a.due_date)-new Date(b.due_date)).slice(0,5);
  document.getElementById('home-tasks').innerHTML = dueSoon.length ? dueSoon.map(t=>`
    <div class="home-item">
      <div class="home-item-left"><span class="home-item-name">${esc(t.text)}</span></div>
      <div class="home-item-right" style="color:${isOverdue(t.due_date)?'var(--red)':'var(--lb-600)'}">${isOverdue(t.due_date)?'⚠ ':''} ${t.due_date}</div>
    </div>`).join('') : '<div class="home-empty">No upcoming tasks</div>';

  // Recent workouts
  const recentW = workouts.slice(0,5);
  document.getElementById('home-workouts').innerHTML = recentW.length ? recentW.map(w=>`
    <div class="home-item">
      <div class="home-item-left"><span class="home-item-name">${esc(w.type)}${w.workout_category?' · '+esc(w.workout_category):''}</span></div>
      <div class="home-item-right">${w.duration_min?w.duration_min+' min':''} ${w.workout_date||''}</div>
    </div>`).join('') : '<div class="home-empty">No workouts logged yet</div>';

  // Car maintenance
  const pendingCar = car.filter(c=>c.status!=='Done').slice(0,5);
  document.getElementById('home-car').innerHTML = pendingCar.length ? pendingCar.map(c=>`
    <div class="home-item">
      <div class="home-item-left"><span class="home-item-name">${esc(c.task)}</span></div>
      <div class="home-item-right" style="color:${c.status==='Overdue'?'var(--red)':'var(--lb-600)'}">${esc(c.status)}</div>
    </div>`).join('') : '<div class="home-empty">All caught up! ✓</div>';

  // Subscriptions
  const upcomingSubs = activeSubs.slice(0,5);
  document.getElementById('home-subs').innerHTML = upcomingSubs.length ? upcomingSubs.map(s=>`
    <div class="home-item">
      <div class="home-item-left"><span class="home-item-name">${esc(s.name)}</span></div>
      <div class="home-item-right">$${(s.cost||0).toFixed(2)}/mo${s.billing_date?' · day '+s.billing_date:''}</div>
    </div>`).join('') : '<div class="home-empty">No active subscriptions</div>';
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
      <td class="${priC[t.priority]||''}">${esc(t.priority||'')}</td>
      <td>${esc(t.category||'')}</td>
      <td class="${isOverdue(t.due_date)&&!t.done?'overdue-date':''}">${t.due_date||''}${isOverdue(t.due_date)&&!t.done?' ⚠':''}</td>
      <td class="${stC[t.status]||''}">${esc(t.status||'')}</td>
      <td>${esc(t.note||'')}</td>
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
      <td>${esc(b.author||'')}</td>
      <td>${esc(b.category||'')}</td>
      <td class="${stC[b.status]||''}">${esc(b.status||'')}</td>
      <td>${delBtn(`deleteBook('${b.id}')`)}</td>
    </tr>`).join('');
  initDrag('books');
}

// ── VIDEOS ────────────────────────────────────────────────────────────────
async function addVideo() {
  const title=val('videos-title'); if(!title)return;
  await dbInsert('videos',{title,category:val('videos-category'),source:val('videos-source'),status:val('videos-status')});
  clr('videos-title','videos-source'); await renderVideos();
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
      <td>${esc(vd.category||'')}</td>
      <td>${esc(vd.source||'')}</td>
      <td class="${stC[vd.status]||''}">${esc(vd.status||'')}</td>
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
      <td>${esc(r.cuisine||'')}</td>
      <td>${esc(r.location||'')}</td>
      <td>${esc(r.price_range||'')}</td>
      <td>${esc(r.rating||'')}</td>
      <td class="${stC[r.status]||''}">${esc(r.status||'')}</td>
      <td>${esc(r.notes||'')}</td>
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
      <td>${esc(c.country||'')}</td>
      <td>${esc(c.continent||'')}</td>
      <td>${esc(c.trip_type||'')}</td>
      <td class="${stC[c.status]||''}">${esc(c.status||'')}</td>
      <td>${esc(c.notes||'')}</td>
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
      <td>${esc(g.qty||'')}</td>
      <td>${esc(g.store||'')}</td>
      <td class="${g.status==='bought'?'status-done':'status-todo'}">${g.status==='bought'?'Bought':'Need to buy'}</td>
      <td>${delBtn(`deleteGrocery('${g.id}')`)}</td>
    </tr>`).join('');
  initDrag('groceries');
}

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
async function addSub() {
  const name=val('subs-name'); if(!name)return;
  await dbInsert('subscriptions',{name,cost:parseFloat(v('subs-cost').value)||0,billing_date:parseInt(v('subs-billing').value)||null,status:val('subs-status')});
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
  if(!rows.length){el.innerHTML=`<tr><td colspan="7" class="empty">No subscriptions yet</td></tr>`;return;}
  el.innerHTML=rows.map(s=>`
    <tr data-id="${s.id}" class="${s.status==='paused'?'done-row':''}">
      ${dragHandle()}
      <td>${esc(s.name)}</td>
      <td>$${(s.cost||0).toFixed(2)}/mo</td>
      <td>$${((s.cost||0)*12).toFixed(2)}/yr</td>
      <td>${s.billing_date?'Day '+s.billing_date:''}</td>
      <td class="${s.status==='active'?'status-done':'status-todo'}" style="cursor:pointer" onclick="toggleSub('${s.id}','${s.status}')">${s.status==='active'?'Active':'Paused'}</td>
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
      <td>${esc(b.label)}</td>
      <td>${esc(b.category||'')}</td>
      <td>${b.entry_date||''}</td>
      <td>${b.type==='income'?'Income':'Expense'}</td>
      <td style="font-weight:500;color:${b.type==='income'?'var(--green)':'var(--red)'}">${b.type==='income'?'+':'-'}$${b.amount.toFixed(2)}</td>
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
      <td>${esc(c.car_type||'')}</td>
      <td>${c.service_date||''}</td>
      <td>${c.mileage?c.mileage.toLocaleString()+' mi':''}</td>
      <td>${c.cost?'$'+Number(c.cost).toFixed(2):''}</td>
      <td class="${stC[c.status]||''}">${esc(c.status||'')}</td>
      <td>${esc(c.notes||'')}</td>
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
