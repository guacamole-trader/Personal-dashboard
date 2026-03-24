const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

let currentUser = null;
let currentSection = 'todo';
let sortState = {};
let cachedRows = {};

// ── MOBILE HELPERS (defined first so they are available everywhere) ────────
function isMobile() { return window.innerWidth <= 768; }
function syncMobDarkBtn() {
  const isDark = document.body.classList.contains('dark');
  const btn = document.getElementById('mob-dark-btn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}
function mobNavSync(sec) {
  document.querySelectorAll('.mob-nav-item').forEach(n => n.classList.remove('active'));
  const mobItem = document.querySelector(`.mob-nav-item[onclick="nav('${sec}')"]`);
  if (mobItem) mobItem.classList.add('active');
  renderMobCards(sec);
}
function mobShowExtras() {
  setGreeting();
  renderMobCards(currentSection);
}

// ── AUTH ──────────────────────────────────────────────────────────────────
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  errEl.style.display = 'none'; btn.disabled = true; btn.textContent = 'Signing in…';
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Sign in';
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  currentUser = data.user; showDashboard();
}

async function handleSignup() {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('signup-error');
  const btn = document.getElementById('signup-btn');
  errEl.style.display = 'none'; btn.disabled = true; btn.textContent = 'Creating account…';
  const { data, error } = await db.auth.signUp({ email, password });
  btn.disabled = false; btn.textContent = 'Create account';
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  if (data.user && data.session) { currentUser = data.user; showDashboard(); }
  else {
    errEl.style.cssText = 'background:#f0fff4;border-color:#b2dfdb;color:#1b5e20;display:block';
    errEl.textContent = 'Account created! Check your email to confirm, then sign in.';
  }
}

async function handleSignOut() {
  await db.auth.signOut(); currentUser = null;
  document.getElementById('dashboard').style.display = 'none'; showLogin();
}
function showLogin() { document.getElementById('signup-screen').style.display='none'; document.getElementById('login-screen').style.display='flex'; }
function showSignup() { document.getElementById('login-screen').style.display='none'; document.getElementById('signup-screen').style.display='flex'; }

function showDashboard() {
  document.getElementById('login-screen').style.display='none';
  document.getElementById('signup-screen').style.display='none';
  document.getElementById('dashboard').style.display='block';
  const emailEl = document.getElementById('user-email-display');
  if (emailEl) emailEl.textContent = currentUser.email;
  setGreeting(); setDate(); loadDailyMsg(); loadSection(currentSection); loadAllBadges();
  if (isMobile()) mobShowExtras();
}

(async () => {
  const { data } = await db.auth.getSession();
  if (data.session) { currentUser = data.session.user; showDashboard(); }
})();

// ── GREETING & DATE ───────────────────────────────────────────────────────
function getGreetingText() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const name = currentUser.email.split('@')[0];
  return `${g}, ${name} 👋`;
}
function setGreeting() {
  const el = document.getElementById('topbar-greeting');
  if (el) el.textContent = getGreetingText();
  const mob = document.getElementById('mob-greeting');
  if (mob) mob.textContent = getGreetingText();
}
function setDate() {
  const d = new Date();
  const str = d.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const el = document.getElementById('topbar-date');
  if (el) el.textContent = str;
}

// ── DARK MODE ─────────────────────────────────────────────────────────────
function toggleDark() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  const lbl = document.getElementById('dark-label');
  if (lbl) lbl.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('dash-dark', isDark ? '1' : '0');
  syncMobDarkBtn();
}
if (localStorage.getItem('dash-dark') === '1') {
  document.body.classList.add('dark');
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('dark-label');
    if (el) el.textContent = '☀️';
    syncMobDarkBtn();
  });
}

// ── SIDEBAR COLLAPSE ──────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ── NAVIGATION ────────────────────────────────────────────────────────────
function nav(sec) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelector(`[onclick="nav('${sec}')"]`).classList.add('active');
  document.getElementById('sec-' + sec).classList.add('active');
  currentSection = sec;
  loadSection(sec);
  if (isMobile()) mobNavSync(sec);
}

// ── LOADING ───────────────────────────────────────────────────────────────
function setLoading(on) {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.toggle('visible', on);
}

// ── HELPERS ───────────────────────────────────────────────────────────────
function v(id) { return document.getElementById(id); }
function val(id) { return v(id) ? v(id).value.trim() : ''; }
function clr(...ids) { ids.forEach(id => { if (v(id)) v(id).value = ''; }); }
function uid() { return currentUser.id; }
function esc(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function delBtn(fn) { return `<button class="del-btn" onclick="${fn}">✕</button>`; }
function today() { return new Date().toISOString().slice(0,10); }

// ── SUPABASE CRUD ─────────────────────────────────────────────────────────
async function dbInsert(table, row) { const { error } = await db.from(table).insert({...row, user_id: uid()}); if(error) alert('Save error: '+error.message); }
async function dbDelete(table, id) { const { error } = await db.from(table).delete().eq('id',id).eq('user_id',uid()); if(error) alert('Delete error: '+error.message); }
async function dbUpdate(table, id, fields) { const { error } = await db.from(table).update(fields).eq('id',id).eq('user_id',uid()); if(error) alert('Update error: '+error.message); }
async function dbSelect(table, fallbackOrder='created_at') {
  const { data, error } = await db.from(table).select('*').eq('user_id',uid()).order('sort_order',{ascending:true, nullsFirst:false}).order(fallbackOrder, {ascending:false});
  if (error) {
    const { data: d2, error: e2 } = await db.from(table).select('*').eq('user_id',uid()).order(fallbackOrder,{ascending:false});
    if (e2) { console.error(e2); return []; }
    return d2 || [];
  }
  const hasOrder = data && data.some(r => r.sort_order !== null && r.sort_order !== undefined);
  if (!hasOrder) {
    const { data: d3 } = await db.from(table).select('*').eq('user_id',uid()).order(fallbackOrder,{ascending:false});
    return d3 || [];
  }
  return data || [];
}

// ── SECTION LOADER ────────────────────────────────────────────────────────
async function loadSection(sec) {
  setLoading(true);
  try {
    const fn = { todo:renderTodo, books:renderBooks, travel:renderTravel, subs:renderSubs, restaurants:renderRestaurants, budget:renderBudget, car:renderCar, videos:renderVideos, groceries:renderGroceries, workout:renderWorkout };
    if (fn[sec]) await fn[sec]();
  } finally { setLoading(false); }
}

async function addItem(sec) {
  const fn = { todo:addTodo, books:addBook, travel:addTravel, subs:addSub, restaurants:addRestaurant, budget:addBudget, car:addCar, videos:addVideo, groceries:addGrocery, workout:addWorkout };
  if (fn[sec]) await fn[sec]();
}

// ── BADGES (row counts) ───────────────────────────────────────────────────
async function loadAllBadges() {
  const tables = { todo:'todos', books:'books', videos:'videos', restaurants:'restaurants', travel:'travel', groceries:'groceries', subs:'subscriptions', budget:'budget', car:'car_maintenance', workout:'workouts' };
  for (const [sec, table] of Object.entries(tables)) {
    const { count } = await db.from(table).select('*', {count:'exact',head:true}).eq('user_id', uid());
    const el = document.getElementById('badge-'+sec);
    if (el) el.textContent = count || '';
  }
}
function updateBadge(sec, rows) {
  const el = document.getElementById('badge-'+sec);
  if (el) el.textContent = rows.length || '';
}

// ── DAILY MESSAGE ─────────────────────────────────────────────────────────
async function loadDailyMsg() {
  try {
    const { data } = await db.from('daily_message').select('message').eq('user_id',uid()).single();
    const msg = data ? (data.message || '') : '';
    const desk = document.getElementById('daily-msg');
    const mob  = document.getElementById('mob-daily-msg');
    if (desk) desk.value = msg;
    if (mob)  mob.value  = msg;
  } catch(e) {}
}
async function saveDailyMsg() {
  const desk = document.getElementById('daily-msg');
  const message = desk ? desk.value : '';
  await db.from('daily_message').upsert({ user_id:uid(), message, updated_at:new Date().toISOString() }, { onConflict:'user_id' });
}

// ── SEARCH / FILTER ───────────────────────────────────────────────────────
function filterTable(sec) {
  const query = (v('search-'+sec)||{value:''}).value.toLowerCase();
  const tbody = document.querySelector('#table-'+sec+' tbody');
  if (!tbody) return;
  Array.from(tbody.rows).forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query) ? '' : 'none';
  });
}

// ── SORT COLUMNS ──────────────────────────────────────────────────────────
function sortTable(sec, colIdx) {
  const key = sec+'-'+colIdx;
  sortState[key] = sortState[key] === 'asc' ? 'desc' : 'asc';
  const asc = sortState[key] === 'asc';
  const tbody = document.querySelector('#table-'+sec+' tbody');
  if (!tbody) return;
  const rows = Array.from(tbody.rows);
  rows.sort((a, b) => {
    const at = (a.cells[colIdx]||{}).textContent.trim().toLowerCase();
    const bt = (b.cells[colIdx]||{}).textContent.trim().toLowerCase();
    const an = parseFloat(at), bn = parseFloat(bt);
    if (!isNaN(an) && !isNaN(bn)) return asc ? an-bn : bn-an;
    return asc ? at.localeCompare(bt) : bt.localeCompare(at);
  });
  rows.forEach(r => tbody.appendChild(r));
}

// ── EXPORT CSV ────────────────────────────────────────────────────────────
function exportCSV(sec) {
  const table = document.getElementById('table-'+sec);
  if (!table) return;
  const headers = Array.from(table.querySelectorAll('thead tr:first-child th')).map(th => th.textContent.replace(/[↕]/g,'').trim()).filter(h=>h);
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const lines = [headers.join(',')];
  rows.forEach(row => {
    if (row.style.display === 'none') return;
    const cells = Array.from(row.cells).slice(0, headers.length).map(td => {
      const t = td.textContent.trim().replace(/"/g,'""');
      return `"${t}"`;
    });
    lines.push(cells.join(','));
  });
  const blob = new Blob([lines.join('\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = sec+'-export.csv'; a.click();
}

// ── DRAG TO REORDER ───────────────────────────────────────────────────────
const dragInstances = {};

const sectionTables = {
  todo:        'todos',
  books:       'books',
  videos:      'videos',
  restaurants: 'restaurants',
  travel:      'travel',
  groceries:   'groceries',
  subs:        'subscriptions',
  budget:      'budget',
  car:         'car_maintenance',
  workout:     null
};

function initDrag(sec) {
  const table = sectionTables[sec];
  if (!table) return;
  const tbody = document.querySelector('#table-'+sec+' tbody');
  if (!tbody) return;

  if (dragInstances[sec]) dragInstances[sec].destroy();

  dragInstances[sec] = Sortable.create(tbody, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'drag-ghost',
    chosenClass: 'drag-chosen',
    onEnd: async function(evt) {
      const rows = Array.from(tbody.querySelectorAll('tr[data-id]'));
      const updates = rows.map((row, idx) => ({
        id: row.dataset.id,
        sort_order: idx
      }));
      await Promise.all(updates.map(u =>
        dbUpdate(table, u.id, { sort_order: u.sort_order })
      ));
      rows.forEach((row, idx) => {
        row.style.background = '';
        const even = idx % 2 === 1;
        row.style.background = even ? '#f4f8fd' : '';
      });
    }
  });
}

function dragHandle() {
  return `<td class="drag-handle" title="Drag to reorder">⋮⋮</td>`;
}
function setProgress(sec, done, total) {
  const statEl = v(sec+'-stat');
  const barEl = v(sec+'-bar');
  if (!statEl || !barEl) return;
  const pct = total > 0 ? Math.round(done/total*100) : 0;
  statEl.textContent = `${done} of ${total} done`;
  barEl.style.width = pct+'%';
}

// ── OVERDUE CHECK ─────────────────────────────────────────────────────────
function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(today());
}

// ── TO-DO ─────────────────────────────────────────────────────────────────
async function addTodo() {
  const text = val('todo-task'); if (!text) return;
  await dbInsert('todos', { text, priority:val('todo-pri')||'Medium', category:val('todo-cat'), due_date:v('todo-due').value||null, status:val('todo-status')||'To do', note:val('todo-note'), done:false });
  clr('todo-task','todo-cat','todo-note'); v('todo-due').value='';
  await renderTodo();
}
async function toggleTodo(id, done) { await dbUpdate('todos',id,{done:!done, status:!done?'Done':'To do'}); await renderTodo(); }
async function deleteTodo(id) { await dbDelete('todos',id); await renderTodo(); }
async function renderTodo() {
  const rows = await dbSelect('todos','created_at');
  updateBadge('todo', rows);
  setProgress('todo', rows.filter(r=>r.done).length, rows.length);
  const el = v('todo-list');
  if (!rows.length) { el.innerHTML=`<tr><td colspan="8" class="empty">No tasks yet</td></tr>`; return; }
  const priC = {'High':'priority-high','Medium':'priority-medium','Low':'priority-low'};
  const stC = {'Done':'status-done','In progress':'status-progress','To do':'status-todo'};
  el.innerHTML = rows.map(t => `
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
  const title = val('books-title'); if (!title) return;
  await dbInsert('books',{title, author:val('books-author'), category:val('books-category'), status:val('books-status')});
  clr('books-title','books-author'); await renderBooks();
}
async function toggleBook(id, status) { await dbUpdate('books',id,{status:status==='Read'?'Want to read':'Read'}); await renderBooks(); }
async function deleteBook(id) { await dbDelete('books',id); await renderBooks(); }
async function renderBooks() {
  const rows = await dbSelect('books','title');
  updateBadge('books', rows);
  setProgress('books', rows.filter(r=>r.status==='Read').length, rows.length);
  const el = v('books-list');
  if (!rows.length) { el.innerHTML=`<tr><td colspan="6" class="empty">No books yet</td></tr>`; return; }
  const stC = {'Read':'status-done','Reading':'status-progress','Want to read':'status-todo'};
  el.innerHTML = rows.map(b => `
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
  const title = val('videos-title'); if (!title) return;
  await dbInsert('videos',{title, category:val('videos-category'), source:val('videos-source'), status:val('videos-status')});
  clr('videos-title','videos-source'); await renderVideos();
}
async function toggleVideo(id, status) { await dbUpdate('videos',id,{status:status==='Done'?'To watch':'Done'}); await renderVideos(); }
async function deleteVideo(id) { await dbDelete('videos',id); await renderVideos(); }
async function renderVideos() {
  const rows = await dbSelect('videos','title');
  updateBadge('videos', rows);
  setProgress('videos', rows.filter(r=>r.status==='Done').length, rows.length);
  const el = v('videos-list');
  if (!rows.length) { el.innerHTML=`<tr><td colspan="6" class="empty">No videos yet</td></tr>`; return; }
  const stC = {'Done':'status-done','Watching':'status-progress','To watch':'status-todo'};
  el.innerHTML = rows.map(vd => `
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
  const name = val('restaurants-name'); if (!name) return;
  await dbInsert('restaurants',{name, cuisine:val('restaurants-cuisine'), location:val('restaurants-location'), price_range:val('restaurants-price'), rating:val('restaurants-rating'), status:val('restaurants-status'), notes:val('restaurants-notes')});
  clr('restaurants-name','restaurants-location','restaurants-notes'); await renderRestaurants();
}
async function toggleRestaurant(id, status) { await dbUpdate('restaurants',id,{status:status==='Tried'?'Want to try':'Tried'}); await renderRestaurants(); }
async function deleteRestaurant(id) { await dbDelete('restaurants',id); await renderRestaurants(); }
async function renderRestaurants() {
  const rows = await dbSelect('restaurants','name');
  updateBadge('restaurants', rows);
  setProgress('restaurants', rows.filter(r=>r.status==='Tried'||r.status==='Favorite').length, rows.length);
  const el = v('restaurants-list');
  if (!rows.length) { el.innerHTML=`<tr><td colspan="9" class="empty">No restaurants yet</td></tr>`; return; }
  const stC = {'Favorite':'status-done','Tried':'status-progress','Want to try':'status-todo'};
  el.innerHTML = rows.map(r => `
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
  const city = val('travel-city'); if (!city) return;
  await dbInsert('travel',{city, country:val('travel-country'), continent:val('travel-continent'), trip_type:val('travel-type'), status:val('travel-status'), notes:val('travel-notes')});
  clr('travel-city','travel-country','travel-notes'); await renderTravel();
}
async function toggleTravel(id, status) { await dbUpdate('travel',id,{status:status==='Visited'?'Wish list':'Visited'}); await renderTravel(); }
async function deleteTravel(id) { await dbDelete('travel',id); await renderTravel(); }
async function renderTravel() {
  const rows = await dbSelect('travel','city');
  updateBadge('travel', rows);
  setProgress('travel', rows.filter(r=>r.status==='Visited').length, rows.length);
  const el = v('travel-list');
  if (!rows.length) { el.innerHTML=`<tr><td colspan="8" class="empty">No destinations yet</td></tr>`; return; }
  const stC = {'Visited':'status-done','Planned':'status-progress','Wish list':'status-todo'};
  el.innerHTML = rows.map(c => `
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
  const item = val('groceries-item'); if (!item) return;
  await dbInsert('groceries',{item, qty:val('groceries-qty'), status:val('groceries-status')});
  clr('groceries-item','groceries-qty'); await renderGroceries();
}
async function toggleGrocery(id, status) { await dbUpdate('groceries',id,{status:status==='bought'?'need':'bought'}); await renderGroceries(); }
async function deleteGrocery(id) { await dbDelete('groceries',id); await renderGroceries(); }
async function clearBought() {
  const rows = await dbSelect('groceries');
  await Promise.all(rows.filter(g=>g.status==='bought').map(g=>dbDelete('groceries',g.id)));
  await renderGroceries();
}
async function renderGroceries() {
  const rows = await dbSelect('groceries','item');
  updateBadge('groceries', rows);
  const bought = rows.filter(r=>r.status==='bought').length;
  const statEl = v('groceries-stat');
  if (statEl) statEl.textContent = `${bought} of ${rows.length} bought`;
  const el = v('groceries-list');
  if (!rows.length) { el.innerHTML=`<tr><td colspan="5" class="empty">List is empty</td></tr>`; return; }
  el.innerHTML = rows.map(g => `
    <tr data-id="${g.id}" class="${g.status==='bought'?'done-row':''}">
      ${dragHandle()}
      <td><div class="cell-check"><input class="check" type="checkbox" ${g.status==='bought'?'checked':''} onchange="toggleGrocery('${g.id}','${g.status}')">${esc(g.item)}</div></td>
      <td>${esc(g.qty||'')}</td>
      <td class="${g.status==='bought'?'status-done':'status-todo'}">${g.status==='bought'?'Bought':'Need to buy'}</td>
      <td>${delBtn(`deleteGrocery('${g.id}')`)}</td>
    </tr>`).join('');
  initDrag('groceries');
}

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
async function addSub() {
  const name = val('subs-name'); if (!name) return;
  await dbInsert('subscriptions',{name, cost:parseFloat(v('subs-cost').value)||0, status:val('subs-status')});
  clr('subs-name','subs-cost'); await renderSubs();
}
async function toggleSub(id, status) { await dbUpdate('subscriptions',id,{status:status==='active'?'paused':'active'}); await renderSubs(); }
async function deleteSub(id) { await dbDelete('subscriptions',id); await renderSubs(); }
async function renderSubs() {
  const rows = await dbSelect('subscriptions','name');
  updateBadge('subs', rows);
  const total = rows.filter(s=>s.status==='active').reduce((a,s)=>a+(s.cost||0),0);
  const statEl = v('subs-stat');
  if (statEl) statEl.textContent = `${rows.filter(s=>s.status==='active').length} active · $${total.toFixed(2)}/mo`;
  const el = v('subs-list');
  if (!rows.length) { el.innerHTML=`<tr><td colspan="5" class="empty">No subscriptions yet</td></tr>`; return; }
  el.innerHTML = rows.map(s => `
    <tr data-id="${s.id}" class="${s.status==='paused'?'done-row':''}">
      ${dragHandle()}
      <td>${esc(s.name)}</td>
      <td>$${(s.cost||0).toFixed(2)}/mo</td>
      <td class="${s.status==='active'?'status-done':'status-todo'}" style="cursor:pointer" onclick="toggleSub('${s.id}','${s.status}')">${s.status==='active'?'Active':'Paused'}</td>
      <td>${delBtn(`deleteSub('${s.id}')`)}</td>
    </tr>`).join('');
  initDrag('subs');
}

// ── BUDGET ────────────────────────────────────────────────────────────────
async function addBudget() {
  const label = val('budget-label');
  const amount = parseFloat(v('budget-amount').value);
  if (!label||isNaN(amount)) return;
  await dbInsert('budget',{label, amount, type:val('budget-type'), category:val('budget-category'), entry_date:today()});
  clr('budget-label','budget-amount','budget-category'); await renderBudget();
}
async function deleteBudget(id) { await dbDelete('budget',id); await renderBudget(); }
async function renderBudget() {
  const rows = await dbSelect('budget','entry_date');
  updateBadge('budget', rows);
  const income = rows.filter(b=>b.type==='income').reduce((a,b)=>a+b.amount,0);
  const expense = rows.filter(b=>b.type==='expense').reduce((a,b)=>a+b.amount,0);
  const bal = income-expense;
  v('b-income').textContent='$'+income.toFixed(2);
  v('b-expense').textContent='$'+expense.toFixed(2);
  v('b-balance').textContent=(bal>=0?'$':'-$')+Math.abs(bal).toFixed(2);
  v('b-balance').style.color = bal>=0?'var(--lb-800)':'var(--red)';
  const pct = income>0?Math.min(100,Math.round(expense/income*100)):0;
  v('b-bar').style.width=pct+'%';
  v('b-bar').className='progress-fill'+(pct>90?' over':'');
  v('b-pct').textContent=pct+'% of income spent';
  const el = v('budget-list');
  if (!rows.length) { el.innerHTML=`<tr><td colspan="6" class="empty">No entries yet</td></tr>`; return; }
  el.innerHTML = rows.map(b => `
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
  const task = val('car-task'); if (!task) return;
  await dbInsert('car_maintenance',{task, car_type:val('car-type'), service_date:v('car-date').value||null, mileage:parseInt(v('car-miles').value)||null, cost:parseFloat(v('car-cost').value)||null, status:val('car-status'), notes:val('car-notes')});
  clr('car-task','car-notes'); v('car-date').value=''; v('car-miles').value=''; v('car-cost').value='';
  await renderCar();
}
async function toggleCar(id, status) { await dbUpdate('car_maintenance',id,{status:status==='Done'?'Pending':'Done'}); await renderCar(); }
async function deleteCar(id) { await dbDelete('car_maintenance',id); await renderCar(); }
async function renderCar() {
  const rows = await dbSelect('car_maintenance','service_date');
  updateBadge('car', rows);
  setProgress('car', rows.filter(r=>r.status==='Done').length, rows.length);
  const el = v('car-list');
  if (!rows.length) { el.innerHTML=`<tr><td colspan="8" class="empty">No maintenance tasks yet</td></tr>`; return; }
  const stC = {'Done':'status-done','Overdue':'priority-high','Pending':'status-todo'};
  el.innerHTML = rows.map(c => `
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
  const type = val('workout-type'); if (!type) return;
  await dbInsert('workouts',{type, workout_date:v('workout-date').value||today(), duration_min:parseInt(v('workout-duration').value)||0, notes:val('workout-notes')});
  clr('workout-type','workout-notes'); v('workout-date').value=''; v('workout-duration').value='';
  await renderWorkout();
}
async function deleteWorkout(id) { await dbDelete('workouts',id); await renderWorkout(); }
async function renderWorkout() {
  const rows = await dbSelect('workouts','workout_date');
  updateBadge('workout', rows);
  const total = rows.reduce((a,w)=>a+(w.duration_min||0),0);
  const thisMonth = rows.filter(w=>{ try{return new Date(w.workout_date).getMonth()===new Date().getMonth();}catch{return false;} }).length;
  v('workout-stats').innerHTML = `
    <div class="stat-card"><div class="stat-num">${rows.length}</div><div class="stat-lbl">Total sessions</div></div>
    <div class="stat-card"><div class="stat-num">${thisMonth}</div><div class="stat-lbl">This month</div></div>
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-lbl">Total minutes</div></div>`;
  const el = v('workout-list');
  if (!rows.length) { el.innerHTML='<div class="empty">No workouts logged yet</div>'; return; }
  el.innerHTML = rows.map(w=>`
    <div class="workout-card">
      <div class="workout-date">${w.workout_date||''}</div>
      <div class="workout-type">${esc(w.type)}</div>
      <div class="workout-detail">${w.duration_min?w.duration_min+' min':''}${w.notes?' · '+esc(w.notes):''}</div>
      <button class="del-btn" onclick="deleteWorkout('${w.id}')" style="margin-top:6px">✕ Remove</button>
    </div>`).join('');
}

// ══════════════════════════════════════════════════════════════
//  MOBILE LAYER
// ══════════════════════════════════════════════════════════════

// ── MOBILE LAYER ──────────────────────────────────────────────
async function saveMobDailyMsg() {
  const message = (document.getElementById('mob-daily-msg')||{value:''}).value;
  await db.from('daily_message').upsert({ user_id: uid(), message, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

// ── DARK MODE SYNC (defined at top of file) ───────────────────

// ── RENDER MOBILE CARDS ───────────────────────────────────────
async function renderMobCards(sec) {
  const el = document.getElementById('mob-'+sec+'-cards');
  if (!el) return;

  const table = sectionTables[sec];
  if (!table && sec !== 'workout') { el.innerHTML = ''; return; }

  let rows = [];
  try { rows = await dbSelect(table || 'workouts'); } catch(e) { return; }

  if (!rows.length) {
    el.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--lb-200);font-size:13px">Nothing here yet — tap + to add</div>`;
    return;
  }

  el.innerHTML = rows.map(row => mobCardHTML(sec, row)).join('');
}

function mobCardHTML(sec, row) {
  const id = row.id;
  switch(sec) {
    case 'todo': {
      const over = isOverdue(row.due_date) && !row.done;
      const priColor = {High:'red',Medium:'amber',Low:'green'}[row.priority]||'';
      return `<div class="mob-card ${row.done?'done-card':''}" data-id="${id}">
        <div class="mob-card-header">
          <input class="check" type="checkbox" ${row.done?'checked':''} onchange="toggleTodo('${id}',${row.done});renderMobCards('todo')">
          <span class="mob-card-title ${row.done?'done':''}">${esc(row.text)}</span>
          <button class="mob-card-del" onclick="deleteTodo('${id}');renderMobCards('todo')">✕</button>
        </div>
        <div class="mob-card-meta">
          ${row.priority?`<span class="mob-pill ${priColor}">${esc(row.priority)}</span>`:''}
          ${row.category?`<span class="mob-pill">${esc(row.category)}</span>`:''}
          ${row.status?`<span class="mob-pill ${row.status==='Done'?'green':row.status==='In progress'?'amber':''}">${esc(row.status)}</span>`:''}
          ${row.due_date?`<span class="mob-pill ${over?'red':''}">${over?'⚠ ':''}${row.due_date}</span>`:''}
        </div>
        ${row.note?`<div class="mob-card-note">${esc(row.note)}</div>`:''}
      </div>`;
    }
    case 'books': {
      const stColor = {Read:'green',Reading:'amber','Want to read':''}[row.status]||'';
      return `<div class="mob-card ${row.status==='Read'?'done-card':''}" data-id="${id}">
        <div class="mob-card-header">
          <input class="check" type="checkbox" ${row.status==='Read'?'checked':''} onchange="toggleBook('${id}','${row.status}');renderMobCards('books')">
          <span class="mob-card-title ${row.status==='Read'?'done':''}">${esc(row.title)}</span>
          <button class="mob-card-del" onclick="deleteBook('${id}');renderMobCards('books')">✕</button>
        </div>
        <div class="mob-card-meta">
          ${row.author?`<span class="mob-pill gray">${esc(row.author)}</span>`:''}
          ${row.category?`<span class="mob-pill">${esc(row.category)}</span>`:''}
          ${row.status?`<span class="mob-pill ${stColor}">${esc(row.status)}</span>`:''}
        </div>
      </div>`;
    }
    case 'videos': {
      const stColor = {Done:'green',Watching:'amber','To watch':''}[row.status]||'';
      return `<div class="mob-card ${row.status==='Done'?'done-card':''}" data-id="${id}">
        <div class="mob-card-header">
          <input class="check" type="checkbox" ${row.status==='Done'?'checked':''} onchange="toggleVideo('${id}','${row.status}');renderMobCards('videos')">
          <span class="mob-card-title ${row.status==='Done'?'done':''}">${esc(row.title)}</span>
          <button class="mob-card-del" onclick="deleteVideo('${id}');renderMobCards('videos')">✕</button>
        </div>
        <div class="mob-card-meta">
          ${row.category?`<span class="mob-pill">${esc(row.category)}</span>`:''}
          ${row.source?`<span class="mob-pill gray">${esc(row.source)}</span>`:''}
          ${row.status?`<span class="mob-pill ${stColor}">${esc(row.status)}</span>`:''}
        </div>
      </div>`;
    }
    case 'restaurants': {
      const stColor = {Favorite:'green',Tried:'amber','Want to try':''}[row.status]||'';
      return `<div class="mob-card" data-id="${id}">
        <div class="mob-card-header">
          <input class="check" type="checkbox" ${row.status!=='Want to try'?'checked':''} onchange="toggleRestaurant('${id}','${row.status}');renderMobCards('restaurants')">
          <span class="mob-card-title">${esc(row.name)}</span>
          <button class="mob-card-del" onclick="deleteRestaurant('${id}');renderMobCards('restaurants')">✕</button>
        </div>
        <div class="mob-card-meta">
          ${row.cuisine?`<span class="mob-pill">${esc(row.cuisine)}</span>`:''}
          ${row.location?`<span class="mob-pill gray">${esc(row.location)}</span>`:''}
          ${row.price_range?`<span class="mob-pill">${esc(row.price_range)}</span>`:''}
          ${row.rating?`<span class="mob-pill">${esc(row.rating)}</span>`:''}
          ${row.status?`<span class="mob-pill ${stColor}">${esc(row.status)}</span>`:''}
        </div>
        ${row.notes?`<div class="mob-card-note">${esc(row.notes)}</div>`:''}
      </div>`;
    }
    case 'travel': {
      const stColor = {Visited:'green',Planned:'amber','Wish list':''}[row.status]||'';
      return `<div class="mob-card ${row.status==='Visited'?'done-card':''}" data-id="${id}">
        <div class="mob-card-header">
          <input class="check" type="checkbox" ${row.status==='Visited'?'checked':''} onchange="toggleTravel('${id}','${row.status}');renderMobCards('travel')">
          <span class="mob-card-title">${esc(row.city)}${row.country?`, ${esc(row.country)}`:''}</span>
          <button class="mob-card-del" onclick="deleteTravel('${id}');renderMobCards('travel')">✕</button>
        </div>
        <div class="mob-card-meta">
          ${row.continent?`<span class="mob-pill">${esc(row.continent)}</span>`:''}
          ${row.trip_type?`<span class="mob-pill gray">${esc(row.trip_type)}</span>`:''}
          ${row.status?`<span class="mob-pill ${stColor}">${esc(row.status)}</span>`:''}
        </div>
        ${row.notes?`<div class="mob-card-note">${esc(row.notes)}</div>`:''}
      </div>`;
    }
    case 'groceries': {
      return `<div class="mob-card ${row.status==='bought'?'done-card':''}" data-id="${id}">
        <div class="mob-card-header">
          <input class="check" type="checkbox" ${row.status==='bought'?'checked':''} onchange="toggleGrocery('${id}','${row.status}');renderMobCards('groceries')">
          <span class="mob-card-title ${row.status==='bought'?'done':''}">${esc(row.item)}${row.qty?` × ${esc(row.qty)}`:''}</span>
          <button class="mob-card-del" onclick="deleteGrocery('${id}');renderMobCards('groceries')">✕</button>
        </div>
        <div class="mob-card-meta">
          <span class="mob-pill ${row.status==='bought'?'green':'amber'}">${row.status==='bought'?'Bought':'Need to buy'}</span>
        </div>
      </div>`;
    }
    case 'subs': {
      return `<div class="mob-card" data-id="${id}">
        <div class="mob-card-header">
          <span class="mob-card-title">${esc(row.name)}</span>
          <button class="mob-card-del" onclick="deleteSub('${id}');renderMobCards('subs')">✕</button>
        </div>
        <div class="mob-card-meta">
          <span class="mob-pill">${'$'+(row.cost||0).toFixed(2)}/mo</span>
          <span class="mob-pill ${row.status==='active'?'green':'gray'}" onclick="toggleSub('${id}','${row.status}');renderMobCards('subs')" style="cursor:pointer">${row.status==='active'?'Active':'Paused'}</span>
        </div>
      </div>`;
    }
    case 'budget': {
      const isInc = row.type==='income';
      return `<div class="mob-card" data-id="${id}">
        <div class="mob-card-header">
          <span class="mob-card-title">${esc(row.label)}</span>
          <span style="font-size:15px;font-weight:600;color:${isInc?'var(--green)':'var(--red)'};margin-left:auto;padding-right:8px">${isInc?'+':'-'}$${row.amount.toFixed(2)}</span>
          <button class="mob-card-del" onclick="deleteBudget('${id}');renderMobCards('budget')">✕</button>
        </div>
        <div class="mob-card-meta">
          ${row.category?`<span class="mob-pill">${esc(row.category)}</span>`:''}
          <span class="mob-pill ${isInc?'green':'red'}">${isInc?'Income':'Expense'}</span>
          ${row.entry_date?`<span class="mob-pill gray">${row.entry_date}</span>`:''}
        </div>
      </div>`;
    }
    case 'car': {
      const stColor = {Done:'green',Overdue:'red',Pending:'amber'}[row.status]||'';
      return `<div class="mob-card ${row.status==='Done'?'done-card':''}" data-id="${id}">
        <div class="mob-card-header">
          <input class="check" type="checkbox" ${row.status==='Done'?'checked':''} onchange="toggleCar('${id}','${row.status}');renderMobCards('car')">
          <span class="mob-card-title">${esc(row.task)}</span>
          <button class="mob-card-del" onclick="deleteCar('${id}');renderMobCards('car')">✕</button>
        </div>
        <div class="mob-card-meta">
          ${row.car_type?`<span class="mob-pill">${esc(row.car_type)}</span>`:''}
          ${row.service_date?`<span class="mob-pill gray">${row.service_date}</span>`:''}
          ${row.mileage?`<span class="mob-pill">${row.mileage.toLocaleString()} mi</span>`:''}
          ${row.cost?`<span class="mob-pill">$${Number(row.cost).toFixed(2)}</span>`:''}
          ${row.status?`<span class="mob-pill ${stColor}">${esc(row.status)}</span>`:''}
        </div>
        ${row.notes?`<div class="mob-card-note">${esc(row.notes)}</div>`:''}
      </div>`;
    }
    case 'workout': {
      return `<div class="mob-card" data-id="${id}">
        <div class="mob-card-header">
          <span class="mob-card-title">${esc(row.type)}</span>
          <button class="mob-card-del" onclick="deleteWorkout('${id}');renderMobCards('workout')">✕</button>
        </div>
        <div class="mob-card-meta">
          ${row.workout_date?`<span class="mob-pill gray">${row.workout_date}</span>`:''}
          ${row.duration_min?`<span class="mob-pill">${row.duration_min} min</span>`:''}
        </div>
        ${row.notes?`<div class="mob-card-note">${esc(row.notes)}</div>`:''}
      </div>`;
    }
    default: return '';
  }
}

// ── MOBILE ADD MODAL ──────────────────────────────────────────
const mobForms = {
  todo: {
    title: 'Add task',
    fields: [
      { id:'m-todo-task', label:'Task', type:'text', placeholder:'What needs to be done?' },
      { id:'m-todo-pri', label:'Priority', type:'select', options:['High','Medium','Low'], default:'Medium' },
      { id:'m-todo-cat', label:'Category', type:'text', placeholder:'e.g. Health, Finance…' },
      { id:'m-todo-due', label:'Due date', type:'date' },
      { id:'m-todo-status', label:'Status', type:'select', options:['To do','In progress','Done'] },
      { id:'m-todo-note', label:'Note', type:'text', placeholder:'Optional note…' },
    ],
    submit: async () => {
      const text = mv('m-todo-task'); if(!text) return;
      await dbInsert('todos',{text, priority:mv('m-todo-pri')||'Medium', category:mv('m-todo-cat'), due_date:document.getElementById('m-todo-due').value||null, status:mv('m-todo-status')||'To do', note:mv('m-todo-note'), done:false});
      closeMobModal(); await renderTodo(); await renderMobCards('todo');
    }
  },
  books: {
    title: 'Add book',
    fields: [
      { id:'m-books-title', label:'Title', type:'text', placeholder:'Book title…' },
      { id:'m-books-author', label:'Author', type:'text', placeholder:'Author name…' },
      { id:'m-books-cat', label:'Category', type:'select', options:['Health','Personal Growth','Music','Business','Finance','Science','History','Philosophy','Psychology','Biography','Fiction','Self-Help','Spirituality','Technology','Other'] },
      { id:'m-books-status', label:'Status', type:'select', options:['Want to read','Reading','Read'] },
    ],
    submit: async () => {
      const title = mv('m-books-title'); if(!title) return;
      await dbInsert('books',{title, author:mv('m-books-author'), category:mv('m-books-cat'), status:mv('m-books-status')});
      closeMobModal(); await renderBooks(); await renderMobCards('books');
    }
  },
  videos: {
    title: 'Add video',
    fields: [
      { id:'m-videos-title', label:'Title', type:'text', placeholder:'Video title…' },
      { id:'m-videos-cat', label:'Category', type:'select', options:['Health','Personal Growth','Music','Technology','Science','Finance','History','Comedy','Motivation','Cooking','Travel','Sports','Documentary','Education','Other'] },
      { id:'m-videos-source', label:'Source', type:'text', placeholder:'YouTube, Netflix…' },
      { id:'m-videos-status', label:'Status', type:'select', options:['To watch','Watching','Done'] },
    ],
    submit: async () => {
      const title = mv('m-videos-title'); if(!title) return;
      await dbInsert('videos',{title, category:mv('m-videos-cat'), source:mv('m-videos-source'), status:mv('m-videos-status')});
      closeMobModal(); await renderVideos(); await renderMobCards('videos');
    }
  },
  restaurants: {
    title: 'Add restaurant',
    fields: [
      { id:'m-rest-name', label:'Name', type:'text', placeholder:'Restaurant name…' },
      { id:'m-rest-cuisine', label:'Cuisine', type:'select', options:['American','Italian','Mexican','Japanese','Chinese','Thai','Indian','Mediterranean','French','Greek','Korean','Vietnamese','BBQ','Seafood','Steakhouse','Vegan','Other'] },
      { id:'m-rest-loc', label:'Location', type:'text', placeholder:'City…' },
      { id:'m-rest-price', label:'Price range', type:'select', options:['$','$$','$$$','$$$$'] },
      { id:'m-rest-rating', label:'Rating', type:'select', options:['','⭐','⭐⭐','⭐⭐⭐','⭐⭐⭐⭐','⭐⭐⭐⭐⭐'] },
      { id:'m-rest-status', label:'Status', type:'select', options:['Want to try','Tried','Favorite'] },
      { id:'m-rest-notes', label:'Notes', type:'text', placeholder:'Optional notes…' },
    ],
    submit: async () => {
      const name = mv('m-rest-name'); if(!name) return;
      await dbInsert('restaurants',{name, cuisine:mv('m-rest-cuisine'), location:mv('m-rest-loc'), price_range:mv('m-rest-price'), rating:mv('m-rest-rating'), status:mv('m-rest-status'), notes:mv('m-rest-notes')});
      closeMobModal(); await renderRestaurants(); await renderMobCards('restaurants');
    }
  },
  travel: {
    title: 'Add destination',
    fields: [
      { id:'m-travel-city', label:'City / Destination', type:'text', placeholder:'City name…' },
      { id:'m-travel-country', label:'Country', type:'text', placeholder:'Country…' },
      { id:'m-travel-continent', label:'Continent', type:'select', options:['North America','South America','Europe','Asia','Africa','Oceania','Middle East','Caribbean'] },
      { id:'m-travel-type', label:'Type', type:'select', options:['Beach','City','Adventure','Cultural','Nature','Road trip','Cruise','Other'] },
      { id:'m-travel-status', label:'Status', type:'select', options:['Wish list','Planned','Visited'] },
      { id:'m-travel-notes', label:'Notes', type:'text', placeholder:'Optional notes…' },
    ],
    submit: async () => {
      const city = mv('m-travel-city'); if(!city) return;
      await dbInsert('travel',{city, country:mv('m-travel-country'), continent:mv('m-travel-continent'), trip_type:mv('m-travel-type'), status:mv('m-travel-status'), notes:mv('m-travel-notes')});
      closeMobModal(); await renderTravel(); await renderMobCards('travel');
    }
  },
  groceries: {
    title: 'Add grocery item',
    fields: [
      { id:'m-groc-item', label:'Item', type:'text', placeholder:'e.g. Milk…' },
      { id:'m-groc-qty', label:'Quantity', type:'text', placeholder:'e.g. 2 gallons…' },
      { id:'m-groc-status', label:'Status', type:'select', options:['need','bought'] },
    ],
    submit: async () => {
      const item = mv('m-groc-item'); if(!item) return;
      await dbInsert('groceries',{item, qty:mv('m-groc-qty'), status:mv('m-groc-status')});
      closeMobModal(); await renderGroceries(); await renderMobCards('groceries');
    }
  },
  subs: {
    title: 'Add subscription',
    fields: [
      { id:'m-subs-name', label:'Service', type:'text', placeholder:'e.g. Netflix…' },
      { id:'m-subs-cost', label:'Cost per month ($)', type:'number', placeholder:'9.99' },
      { id:'m-subs-status', label:'Status', type:'select', options:['active','paused'] },
    ],
    submit: async () => {
      const name = mv('m-subs-name'); if(!name) return;
      await dbInsert('subscriptions',{name, cost:parseFloat(document.getElementById('m-subs-cost').value)||0, status:mv('m-subs-status')});
      closeMobModal(); await renderSubs(); await renderMobCards('subs');
    }
  },
  budget: {
    title: 'Add budget entry',
    fields: [
      { id:'m-bud-label', label:'Description', type:'text', placeholder:'What is this for?' },
      { id:'m-bud-amount', label:'Amount ($)', type:'number', placeholder:'0.00' },
      { id:'m-bud-type', label:'Type', type:'select', options:['expense','income'] },
      { id:'m-bud-cat', label:'Category', type:'text', placeholder:'e.g. Food, Rent…' },
    ],
    submit: async () => {
      const label = mv('m-bud-label');
      const amount = parseFloat(document.getElementById('m-bud-amount').value);
      if(!label||isNaN(amount)) return;
      await dbInsert('budget',{label, amount, type:mv('m-bud-type'), category:mv('m-bud-cat'), entry_date:today()});
      closeMobModal(); await renderBudget(); await renderMobCards('budget');
    }
  },
  car: {
    title: 'Add maintenance task',
    fields: [
      { id:'m-car-task', label:'Task', type:'text', placeholder:'e.g. Oil change…' },
      { id:'m-car-type', label:'Type', type:'select', options:['Oil change','Tire rotation','Tire replacement','Brake service','Battery','Air filter','Alignment','Transmission','Inspection','Coolant flush','Windshield','AC service','Other'] },
      { id:'m-car-date', label:'Date', type:'date' },
      { id:'m-car-miles', label:'Mileage', type:'number', placeholder:'Miles…' },
      { id:'m-car-cost', label:'Cost ($)', type:'number', placeholder:'0.00' },
      { id:'m-car-status', label:'Status', type:'select', options:['Pending','Done','Overdue'] },
      { id:'m-car-notes', label:'Notes', type:'text', placeholder:'Optional notes…' },
    ],
    submit: async () => {
      const task = mv('m-car-task'); if(!task) return;
      await dbInsert('car_maintenance',{task, car_type:mv('m-car-type'), service_date:document.getElementById('m-car-date').value||null, mileage:parseInt(document.getElementById('m-car-miles').value)||null, cost:parseFloat(document.getElementById('m-car-cost').value)||null, status:mv('m-car-status'), notes:mv('m-car-notes')});
      closeMobModal(); await renderCar(); await renderMobCards('car');
    }
  },
  workout: {
    title: 'Log workout',
    fields: [
      { id:'m-wo-type', label:'Activity', type:'text', placeholder:'e.g. Run, Gym, Yoga…' },
      { id:'m-wo-date', label:'Date', type:'date' },
      { id:'m-wo-dur', label:'Duration (minutes)', type:'number', placeholder:'30' },
      { id:'m-wo-notes', label:'Notes', type:'text', placeholder:'Optional notes…' },
    ],
    submit: async () => {
      const type = mv('m-wo-type'); if(!type) return;
      await dbInsert('workouts',{type, workout_date:document.getElementById('m-wo-date').value||today(), duration_min:parseInt(document.getElementById('m-wo-dur').value)||0, notes:mv('m-wo-notes')});
      closeMobModal(); await renderWorkout(); await renderMobCards('workout');
    }
  }
};

function mv(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

function openMobModal() {
  const form = mobForms[currentSection];
  if (!form) return;
  document.getElementById('mob-modal-title').textContent = form.title;
  document.getElementById('mob-modal-body').innerHTML = form.fields.map(f => {
    if (f.type === 'select') {
      const opts = f.options.map(o => `<option value="${o}"${f.default===o?' selected':''}>${o}</option>`).join('');
      return `<div class="mob-field"><label>${f.label}</label><select id="${f.id}">${opts}</select></div>`;
    }
    return `<div class="mob-field"><label>${f.label}</label><input id="${f.id}" type="${f.type}" placeholder="${f.placeholder||''}"></div>`;
  }).join('');
  document.getElementById('mob-modal-submit').onclick = form.submit;
  document.getElementById('mob-modal-overlay').classList.add('open');
}

function closeMobModal(e) {
  if (e && e.target !== document.getElementById('mob-modal-overlay')) return;
  document.getElementById('mob-modal-overlay').classList.remove('open');
}

// sync dark mode btn on init
document.addEventListener('DOMContentLoaded', () => { syncMobDarkBtn(); });
