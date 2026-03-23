// ── INIT SUPABASE ──────────────────────────────────────────────────────────
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

let currentUser = null;
let currentSection = 'todo';

// ── AUTH ───────────────────────────────────────────────────────────────────
async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = 'Sign in';

  if (error) {
    errEl.textContent = error.message;
    errEl.style.display = 'block';
    return;
  }
  currentUser = data.user;
  showDashboard();
}

async function handleSignup() {
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl    = document.getElementById('signup-error');
  const btn      = document.getElementById('signup-btn');

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Creating account…';

  const { data, error } = await db.auth.signUp({ email, password });

  btn.disabled = false;
  btn.textContent = 'Create account';

  if (error) {
    errEl.textContent = error.message;
    errEl.style.display = 'block';
    return;
  }

  // If email confirmation is disabled in Supabase, user is logged in immediately
  if (data.user && data.session) {
    currentUser = data.user;
    showDashboard();
  } else {
    errEl.style.background = '#f0fff4';
    errEl.style.borderColor = '#b2dfdb';
    errEl.style.color = '#1b5e20';
    errEl.textContent = 'Account created! Check your email to confirm, then sign in.';
    errEl.style.display = 'block';
  }
}

async function handleSignOut() {
  await db.auth.signOut();
  currentUser = null;
  document.getElementById('dashboard').style.display = 'none';
  showLogin();
}

function showLogin() {
  document.getElementById('signup-screen').style.display = 'none';
  document.getElementById('login-screen').style.display  = 'flex';
}

function showSignup() {
  document.getElementById('login-screen').style.display  = 'none';
  document.getElementById('signup-screen').style.display = 'flex';
}

function showDashboard() {
  document.getElementById('login-screen').style.display  = 'none';
  document.getElementById('signup-screen').style.display = 'none';
  document.getElementById('dashboard').style.display     = 'block';
  document.getElementById('user-email-display').textContent = currentUser.email;
  loadDailyMsg();
  loadSection(currentSection);
}

// ── BOOT: check existing session ──────────────────────────────────────────
(async () => {
  const { data } = await db.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    showDashboard();
  }
})();

// ── NAVIGATION ─────────────────────────────────────────────────────────────
function nav(sec) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelector(`[onclick="nav('${sec}')"]`).classList.add('active');
  document.getElementById('sec-' + sec).classList.add('active');
  currentSection = sec;
  loadSection(sec);
}

// ── LOADING STATE ──────────────────────────────────────────────────────────
function setLoading(on) {
  const el = document.getElementById('loading-overlay');
  el.classList.toggle('visible', on);
}

// ── HELPERS ────────────────────────────────────────────────────────────────
function v(id)   { return document.getElementById(id); }
function val(id) { return v(id) ? v(id).value.trim() : ''; }
function clr(...ids) { ids.forEach(id => { if (v(id)) v(id).value = ''; }); }
function badge(cls, label) { return `<span class="badge badge-${cls}">${label}</span>`; }
function delBtn(fn) { return `<button class="del-btn" onclick="${fn}">✕</button>`; }
function uid() { return currentUser.id; }

// ── SUPABASE CRUD ──────────────────────────────────────────────────────────
async function dbInsert(table, row) {
  const { error } = await db.from(table).insert({ ...row, user_id: uid() });
  if (error) alert('Save error: ' + error.message);
}

async function dbDelete(table, id) {
  const { error } = await db.from(table).delete().eq('id', id).eq('user_id', uid());
  if (error) alert('Delete error: ' + error.message);
}

async function dbUpdate(table, id, fields) {
  const { error } = await db.from(table).update(fields).eq('id', id).eq('user_id', uid());
  if (error) alert('Update error: ' + error.message);
}

async function dbSelect(table, order = 'created_at') {
  const { data, error } = await db.from(table).select('*')
    .eq('user_id', uid()).order(order, { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

// ── SECTION LOADER ─────────────────────────────────────────────────────────
async function loadSection(sec) {
  setLoading(true);
  try {
    switch (sec) {
      case 'todo':        return await renderTodo();
      case 'books':       return await renderBooks();
      case 'travel':      return await renderTravel();
      case 'subs':        return await renderSubs();
      case 'restaurants': return await renderRestaurants();
      case 'budget':      return await renderBudget();
      case 'car':         return await renderCar();
      case 'videos':      return await renderVideos();
      case 'groceries':   return await renderGroceries();
      case 'workout':     return await renderWorkout();
    }
  } finally {
    setLoading(false);
  }
}

// ── ADD ITEM DISPATCHER ────────────────────────────────────────────────────
async function addItem(sec) {
  switch (sec) {
    case 'todo':        return await addTodo();
    case 'books':       return await addBook();
    case 'travel':      return await addTravel();
    case 'subs':        return await addSub();
    case 'restaurants': return await addRestaurant();
    case 'budget':      return await addBudget();
    case 'car':         return await addCar();
    case 'videos':      return await addVideo();
    case 'groceries':   return await addGrocery();
    case 'workout':     return await addWorkout();
  }
}

// ── DAILY MESSAGE ──────────────────────────────────────────────────────────
async function loadDailyMsg() {
  const { data } = await db.from('daily_message').select('message').eq('user_id', uid()).single();
  if (data) v('daily-msg').value = data.message || '';
}

async function saveDailyMsg() {
  const message = v('daily-msg').value;
  await db.from('daily_message').upsert({ user_id: uid(), message, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

// ── TO-DO ──────────────────────────────────────────────────────────────────
async function addTodo() {
  const text = val('todo-task'); if (!text) return;
  await dbInsert('todos', {
    text,
    priority:   val('todo-pri') || 'Medium',
    category:   val('todo-cat'),
    due_date:   v('todo-due').value || null,
    status:     val('todo-status') || 'To do',
    note:       val('todo-note'),
    done: false
  });
  v('todo-task').value = '';
  v('todo-cat').value  = '';
  v('todo-due').value  = '';
  v('todo-note').value = '';
  await renderTodo();
}

async function toggleTodo(id, done) {
  await dbUpdate('todos', id, { done: !done, status: !done ? 'Done' : 'To do' });
  await renderTodo();
}

async function deleteTodo(id) {
  await dbDelete('todos', id);
  await renderTodo();
}

async function renderTodo() {
  const rows = await dbSelect('todos', 'created_at');
  const el = v('todo-list');
  if (!rows.length) {
    el.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--lb-200)">No tasks yet</td></tr>`;
    return;
  }
  const priClass = { 'High': 'priority-high', 'Medium': 'priority-medium', 'Low': 'priority-low' };
  const stClass  = { 'Done': 'status-done', 'In progress': 'status-progress', 'To do': 'status-todo' };
  el.innerHTML = rows.map(t => `
    <tr class="${t.done ? 'done-row' : ''}">
      <td style="display:flex;align-items:center;gap:8px">
        <input class="check" type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo('${t.id}', ${t.done})">
        ${esc(t.text)}
      </td>
      <td class="${priClass[t.priority] || ''}">${esc(t.priority || '')}</td>
      <td>${esc(t.category || '')}</td>
      <td>${t.due_date || ''}</td>
      <td class="${stClass[t.status] || ''}">${esc(t.status || '')}</td>
      <td>${esc(t.note || '')}</td>
      <td>${delBtn(`deleteTodo('${t.id}')`)}</td>
    </tr>`).join('');
}

// ── BOOKS ──────────────────────────────────────────────────────────────────
async function addBook() {
  const title = val('books-title'); if (!title) return;
  await dbInsert('books', { title, author: val('books-author'), status: val('books-status') });
  clr('books-title', 'books-author');
  await renderBooks();
}

async function toggleBook(id, status) {
  await dbUpdate('books', id, { status: status === 'read' ? 'unread' : 'read' });
  await renderBooks();
}

async function deleteBook(id) { await dbDelete('books', id); await renderBooks(); }

async function renderBooks() {
  const rows = await dbSelect('books', 'title');
  const el = v('books-list');
  if (!rows.length) { el.innerHTML = '<div class="empty">No books yet</div>'; return; }
  el.innerHTML = rows.map(b => `
    <div class="item-row">
      <input class="check" type="checkbox" ${b.status === 'read' ? 'checked' : ''} onchange="toggleBook('${b.id}', '${b.status}')">
      <span class="item-text ${b.status === 'read' ? 'done' : ''}">${esc(b.title)}${b.author ? ` <span style="font-size:11px;color:#adb5bd">by ${esc(b.author)}</span>` : ''}</span>
      ${badge(b.status, b.status === 'read' ? 'Read' : 'To read')}
      ${delBtn(`deleteBook('${b.id}')`)}
    </div>`).join('');
}

// ── TRAVEL ─────────────────────────────────────────────────────────────────
async function addTravel() {
  const city = val('travel-city'); if (!city) return;
  await dbInsert('travel', { city, country: val('travel-country'), status: val('travel-status') });
  clr('travel-city', 'travel-country');
  await renderTravel();
}

async function toggleTravel(id, status) {
  await dbUpdate('travel', id, { status: status === 'visited' ? 'wish' : 'visited' });
  await renderTravel();
}

async function deleteTravel(id) { await dbDelete('travel', id); await renderTravel(); }

async function renderTravel() {
  const rows = await dbSelect('travel', 'city');
  const el = v('travel-list');
  if (!rows.length) { el.innerHTML = '<div class="empty">No destinations yet</div>'; return; }
  el.innerHTML = rows.map(c => `
    <div class="item-row">
      <input class="check" type="checkbox" ${c.status === 'visited' ? 'checked' : ''} onchange="toggleTravel('${c.id}', '${c.status}')">
      <span class="item-text ${c.status === 'visited' ? 'done' : ''}">${esc(c.city)}${c.country ? ` <span style="font-size:11px;color:#adb5bd">${esc(c.country)}</span>` : ''}</span>
      ${badge(c.status === 'visited' ? 'visited' : 'wish', c.status === 'visited' ? 'Visited' : 'Wish list')}
      ${delBtn(`deleteTravel('${c.id}')`)}
    </div>`).join('');
}

// ── SUBSCRIPTIONS ──────────────────────────────────────────────────────────
async function addSub() {
  const name = val('subs-name'); if (!name) return;
  await dbInsert('subscriptions', { name, cost: parseFloat(v('subs-cost').value) || 0, status: val('subs-status') });
  clr('subs-name', 'subs-cost');
  await renderSubs();
}

async function toggleSub(id, status) {
  await dbUpdate('subscriptions', id, { status: status === 'active' ? 'paused' : 'active' });
  await renderSubs();
}

async function deleteSub(id) { await dbDelete('subscriptions', id); await renderSubs(); }

async function renderSubs() {
  const rows = await dbSelect('subscriptions', 'name');
  const el = v('subs-list');
  const total = rows.filter(s => s.status === 'active').reduce((a, s) => a + (s.cost || 0), 0);
  v('subs-total').textContent = rows.length ? `Active monthly total: $${total.toFixed(2)}` : '';
  if (!rows.length) { el.innerHTML = '<div class="empty">No subscriptions yet</div>'; return; }
  el.innerHTML = rows.map(s => `
    <div class="item-row">
      <span class="item-text">${esc(s.name)}</span>
      <span class="item-meta">$${(s.cost || 0).toFixed(2)}/mo</span>
      <span class="badge badge-${s.status}" style="cursor:pointer" onclick="toggleSub('${s.id}', '${s.status}')">${s.status === 'active' ? 'Active' : 'Paused'}</span>
      ${delBtn(`deleteSub('${s.id}')`)}
    </div>`).join('');
}

// ── RESTAURANTS ────────────────────────────────────────────────────────────
async function addRestaurant() {
  const name = val('restaurants-name'); if (!name) return;
  await dbInsert('restaurants', { name, cuisine: val('restaurants-cuisine'), status: val('restaurants-status') });
  clr('restaurants-name', 'restaurants-cuisine');
  await renderRestaurants();
}

async function toggleRestaurant(id, status) {
  await dbUpdate('restaurants', id, { status: status === 'tried' ? 'want' : 'tried' });
  await renderRestaurants();
}

async function deleteRestaurant(id) { await dbDelete('restaurants', id); await renderRestaurants(); }

async function renderRestaurants() {
  const rows = await dbSelect('restaurants', 'name');
  const el = v('restaurants-list');
  if (!rows.length) { el.innerHTML = '<div class="empty">No restaurants yet</div>'; return; }
  el.innerHTML = rows.map(r => `
    <div class="item-row">
      <input class="check" type="checkbox" ${r.status === 'tried' ? 'checked' : ''} onchange="toggleRestaurant('${r.id}', '${r.status}')">
      <span class="item-text ${r.status === 'tried' ? 'done' : ''}">${esc(r.name)}${r.cuisine ? ` <span style="font-size:11px;color:#adb5bd">${esc(r.cuisine)}</span>` : ''}</span>
      ${badge(r.status === 'tried' ? 'tried' : 'want', r.status === 'tried' ? 'Tried' : 'Want to try')}
      ${delBtn(`deleteRestaurant('${r.id}')`)}
    </div>`).join('');
}

// ── BUDGET ─────────────────────────────────────────────────────────────────
async function addBudget() {
  const label = val('budget-label');
  const amount = parseFloat(v('budget-amount').value);
  if (!label || isNaN(amount)) return;
  await dbInsert('budget', { label, amount, type: val('budget-type'), category: val('budget-category'), entry_date: new Date().toISOString().slice(0, 10) });
  clr('budget-label', 'budget-amount', 'budget-category');
  await renderBudget();
}

async function deleteBudget(id) { await dbDelete('budget', id); await renderBudget(); }

async function renderBudget() {
  const rows = await dbSelect('budget', 'entry_date');
  const el = v('budget-list');
  const income  = rows.filter(b => b.type === 'income').reduce((a, b) => a + b.amount, 0);
  const expense = rows.filter(b => b.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const bal = income - expense;
  v('b-income').textContent  = '$' + income.toFixed(2);
  v('b-expense').textContent = '$' + expense.toFixed(2);
  v('b-balance').textContent = (bal >= 0 ? '$' : '-$') + Math.abs(bal).toFixed(2);
  v('b-balance').style.color = bal >= 0 ? 'var(--lb-800)' : 'var(--red)';
  const pct = income > 0 ? Math.min(100, Math.round(expense / income * 100)) : 0;
  v('b-bar').style.width = pct + '%';
  v('b-bar').className = 'progress-fill' + (pct > 90 ? ' over' : '');
  v('b-pct').textContent = pct + '% of income spent';
  if (!rows.length) { el.innerHTML = '<div class="empty">No entries yet</div>'; return; }
  el.innerHTML = rows.map(b => `
    <div class="item-row">
      <span class="item-text">${esc(b.label)}${b.category ? ` <span style="font-size:11px;color:#adb5bd">${esc(b.category)}</span>` : ''}</span>
      <span class="item-meta">${b.entry_date || ''}</span>
      <span style="font-size:13px;font-weight:500;color:${b.type === 'income' ? 'var(--green)' : 'var(--red)'}">${b.type === 'income' ? '+' : '-'}$${b.amount.toFixed(2)}</span>
      ${delBtn(`deleteBudget('${b.id}')`)}
    </div>`).join('');
}

// ── CAR MAINTENANCE ────────────────────────────────────────────────────────
async function addCar() {
  const task = val('car-task'); if (!task) return;
  await dbInsert('car_maintenance', { task, service_date: v('car-date').value || null, mileage: parseInt(v('car-miles').value) || null, status: val('car-status') });
  clr('car-task', 'car-miles');
  v('car-date').value = '';
  await renderCar();
}

async function toggleCar(id, status) {
  await dbUpdate('car_maintenance', id, { status: status === 'done' ? 'pending' : 'done' });
  await renderCar();
}

async function deleteCar(id) { await dbDelete('car_maintenance', id); await renderCar(); }

async function renderCar() {
  const rows = await dbSelect('car_maintenance', 'service_date');
  const el = v('car-list');
  if (!rows.length) { el.innerHTML = '<div class="empty">No maintenance tasks yet</div>'; return; }
  el.innerHTML = rows.map(c => `
    <div class="item-row">
      <input class="check" type="checkbox" ${c.status === 'done' ? 'checked' : ''} onchange="toggleCar('${c.id}', '${c.status}')">
      <span class="item-text ${c.status === 'done' ? 'done' : ''}">${esc(c.task)}</span>
      ${c.service_date ? `<span class="item-meta">${c.service_date}</span>` : ''}
      ${c.mileage ? `<span class="item-meta">${c.mileage.toLocaleString()} mi</span>` : ''}
      ${badge(c.status, c.status === 'overdue' ? 'Overdue' : c.status === 'done' ? 'Done' : 'Pending')}
      ${delBtn(`deleteCar('${c.id}')`)}
    </div>`).join('');
}

// ── VIDEOS ─────────────────────────────────────────────────────────────────
async function addVideo() {
  const title = val('videos-title'); if (!title) return;
  await dbInsert('videos', { title, source: val('videos-source'), status: val('videos-status') });
  clr('videos-title', 'videos-source');
  await renderVideos();
}

async function toggleVideo(id, status) {
  await dbUpdate('videos', id, { status: status === 'done' ? 'todo' : 'done' });
  await renderVideos();
}

async function deleteVideo(id) { await dbDelete('videos', id); await renderVideos(); }

async function renderVideos() {
  const rows = await dbSelect('videos', 'title');
  const el = v('videos-list');
  if (!rows.length) { el.innerHTML = '<div class="empty">No videos yet</div>'; return; }
  el.innerHTML = rows.map(vd => `
    <div class="item-row">
      <input class="check" type="checkbox" ${vd.status === 'done' ? 'checked' : ''} onchange="toggleVideo('${vd.id}', '${vd.status}')">
      <span class="item-text ${vd.status === 'done' ? 'done' : ''}">${esc(vd.title)}${vd.source ? ` <span style="font-size:11px;color:#adb5bd">${esc(vd.source)}</span>` : ''}</span>
      ${badge(vd.status, vd.status === 'done' ? 'Watched' : vd.status === 'watching' ? 'Watching' : 'To watch')}
      ${delBtn(`deleteVideo('${vd.id}')`)}
    </div>`).join('');
}

// ── GROCERIES ──────────────────────────────────────────────────────────────
async function addGrocery() {
  const item = val('groceries-item'); if (!item) return;
  await dbInsert('groceries', { item, qty: val('groceries-qty'), status: val('groceries-status') });
  clr('groceries-item', 'groceries-qty');
  await renderGroceries();
}

async function toggleGrocery(id, status) {
  await dbUpdate('groceries', id, { status: status === 'bought' ? 'need' : 'bought' });
  await renderGroceries();
}

async function deleteGrocery(id) { await dbDelete('groceries', id); await renderGroceries(); }

async function clearBought() {
  const rows = await dbSelect('groceries');
  const bought = rows.filter(g => g.status === 'bought');
  await Promise.all(bought.map(g => dbDelete('groceries', g.id)));
  await renderGroceries();
}

async function renderGroceries() {
  const rows = await dbSelect('groceries', 'item');
  const el = v('groceries-list');
  if (!rows.length) { el.innerHTML = '<div class="empty">List is empty</div>'; return; }
  el.innerHTML = rows.map(g => `
    <div class="item-row">
      <input class="check" type="checkbox" ${g.status === 'bought' ? 'checked' : ''} onchange="toggleGrocery('${g.id}', '${g.status}')">
      <span class="item-text ${g.status === 'bought' ? 'done' : ''}">${esc(g.item)}${g.qty ? ` <span style="font-size:11px;color:#adb5bd">× ${esc(g.qty)}</span>` : ''}</span>
      ${badge(g.status === 'bought' ? 'bought' : 'need', g.status === 'bought' ? 'Bought' : 'Need')}
      ${delBtn(`deleteGrocery('${g.id}')`)}
    </div>`).join('');
}

// ── WORKOUT ────────────────────────────────────────────────────────────────
async function addWorkout() {
  const type = val('workout-type'); if (!type) return;
  await dbInsert('workouts', { type, workout_date: v('workout-date').value || new Date().toISOString().slice(0, 10), duration_min: parseInt(v('workout-duration').value) || 0, notes: val('workout-notes') });
  clr('workout-type', 'workout-notes');
  v('workout-date').value = '';
  v('workout-duration').value = '';
  await renderWorkout();
}

async function deleteWorkout(id) { await dbDelete('workouts', id); await renderWorkout(); }

async function renderWorkout() {
  const rows = await dbSelect('workouts', 'workout_date');
  const statsEl = v('workout-stats');
  const el = v('workout-list');
  const total = rows.reduce((a, w) => a + (w.duration_min || 0), 0);
  const thisMonth = rows.filter(w => {
    try { return new Date(w.workout_date).getMonth() === new Date().getMonth(); } catch { return false; }
  }).length;
  statsEl.innerHTML = `
    <div class="stat-card"><div class="stat-num">${rows.length}</div><div class="stat-lbl">Total sessions</div></div>
    <div class="stat-card"><div class="stat-num">${thisMonth}</div><div class="stat-lbl">This month</div></div>
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-lbl">Total minutes</div></div>`;
  if (!rows.length) { el.innerHTML = '<div class="empty">No workouts logged yet</div>'; return; }
  el.innerHTML = rows.map(w => `
    <div class="workout-card">
      <div class="workout-date">${w.workout_date || ''}</div>
      <div class="workout-type">${esc(w.type)}</div>
      <div class="workout-detail">${w.duration_min ? w.duration_min + ' min' : ''}${w.notes ? ' · ' + esc(w.notes) : ''}</div>
      <button class="del-btn" onclick="deleteWorkout('${w.id}')" style="margin-top:6px">✕ Remove</button>
    </div>`).join('');
}

// ── XSS GUARD ──────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
