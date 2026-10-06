// js/common.js
// Shared code used by every page: calling the API, login state, navigation, small helpers.

// ---------------- Login state (saved in the browser) ----------------
function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

function saveLogin(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// The first page a user sees after logging in
function homePage(user) {
  return user.role === 'ADMIN' ? 'admin-dashboard.html' : 'dashboard.html';
}

// ---------------- Calling the backend ----------------
// Example: const rooms = await api('GET', '/facilities');
//          await api('POST', '/bookings', { facilityId: 1, ... });
async function api(method, url, body) {
  const options = { method, headers: {} };

  const token = getToken();
  if (token) options.headers.Authorization = `Bearer ${token}`;

  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch('/api' + url, options);
  const data = await response.json().catch(() => ({}));

  // Token missing or expired -> go back to the login page
  if (response.status === 401 && token) {
    logout();
  }
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
}

// ---------------- Icons (small inline pictures) ----------------
const ICONS = {
  logo: '<path d="M4 21h16M6 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16M9 8h2M13 8h2M9 12h2M13 12h2M10 21v-4h4v4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 21v-4h4v4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M17 20a6 6 0 0 0-2-4.5"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.6l1.3 2.2 2.5-.5.4 2.5 2.3 1.1-1.3 2.2 1.3 2.2-2.3 1.1-.4 2.5-2.5-.5L12 21.4l-1.3-2.2-2.5.5-.4-2.5-2.3-1.1L6.8 12 5.5 9.8l2.3-1.1.4-2.5 2.5.5z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trend: '<path d="M3 17l6-6 4 4 7-7"/><path d="M14 8h6v6"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  bell: '<path d="M18 16V11a6 6 0 1 0-12 0v5l-2 3h16z"/><path d="M10 22h4"/>',
  pencil: '<path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  upload: '<path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
};

// icon('calendar') -> an <svg> string. size and extra CSS class are optional.
function icon(name, size = 18, className = '') {
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="1.7"
     stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

// ---------------- Page protection + navigation ----------------
// Call at the top of every page (except login).
// Returns the user, or null if the page is redirecting.
function requireLogin(...allowedRoles) {
  const user = getUser();
  if (!getToken() || !user) {
    window.location.href = 'login.html';
    return null;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    window.location.href = homePage(user);
    return null;
  }
  if (user.role === 'ADMIN') renderAdminNav(user);
  else renderUserNav(user);
  return user;
}

function currentPage() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  return page === 'room.html' ? 'rooms.html' : page; // a room page belongs to "Facilities"
}

// Top bar for students, teachers and staff
function renderUserNav(user) {
  const links = [
    ['dashboard.html', 'Dashboard'],
    ['rooms.html', 'Facilities'],
    ['my-bookings.html', 'My Bookings'],
  ];
  const page = currentPage();

  document.getElementById('nav').innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="dashboard.html">
        <span class="brand-mark">${icon('logo', 18)}</span> Campus Facility Booking
      </a>
      <nav class="nav-links">
        ${links.map(([href, text]) =>
          `<a href="${href}" class="${href === page ? 'active' : ''}">${text}</a>`).join('')}
      </nav>
      <div class="nav-user">
        <a class="who" href="account.html">
          <b>${esc(user.name)}</b>
          <small>${esc(user.role.charAt(0) + user.role.slice(1).toLowerCase())}</small>
        </a>
        <button class="btn btn-light btn-sm" onclick="logout()">Log out</button>
      </div>
    </div>`;
}

// Dark sidebar + white page header for the admin
function renderAdminNav(user) {
  const links = [
    ['admin-dashboard.html', 'Dashboard', 'grid'],
    ['admin-rooms.html', 'Facilities', 'building'],
    ['admin-bookings.html', 'Bookings', 'calendar'],
    ['admin-users.html', 'Users', 'users'],
    ['admin-settings.html', 'Settings', 'gear'],
  ];
  const page = currentPage();

  document.getElementById('nav').innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="admin-dashboard.html">
        <span class="brand-mark">${icon('logo', 18)}</span> CFB Admin
      </a>
      <nav>
        ${links.map(([href, text, ico]) =>
          `<a href="${href}" class="${href === page ? 'active' : ''}">${icon(ico, 17)}${text}</a>`).join('')}
      </nav>
    </aside>`;

  // The white bar above the page content
  const header = document.getElementById('pageHeader');
  if (header) {
    header.innerHTML = `
      <h1>${esc(header.dataset.title || '')}</h1>
      <div class="header-right">
        ${header.dataset.action || ''}
        <span class="who-badge">${esc(user.role)}</span>
        <button class="btn btn-light btn-sm" onclick="logout()">Log out</button>
      </div>`;
  }
}

// ---------------- Small helpers ----------------

// Make text safe to put inside HTML (stops users from injecting HTML/JS)
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

// Show a message box. type = 'error' | 'success' | 'info'
function showMessage(elementId, text, type = 'error') {
  const box = document.getElementById(elementId);
  box.className = `message ${type}`;
  box.textContent = text;
  box.hidden = false;
}

function hideMessage(elementId) {
  document.getElementById(elementId).hidden = true;
}

// Coloured label for a status, e.g. PENDING -> "PENDING" in orange
function badge(status) {
  return `<span class="badge badge-${status.toLowerCase()}">${esc(status)}</span>`;
}

// A picture for a room. If the link does not load, a plain placeholder is shown.
const NO_PHOTO = 'img/room-placeholder.svg';

function roomImage(room, className = 'room-photo') {
  const src = room.image_url || NO_PHOTO;
  return `<img class="${className}" src="${esc(src)}" alt="${esc(room.name)}"
     loading="lazy" onerror="this.onerror=null; this.src='${NO_PHOTO}'">`;
}

// "10:00:00" -> "10:00"
function hhmm(time) {
  return time ? time.slice(0, 5) : '';
}

// "2026-09-20" -> "Sun, 20 Sep 2026"
function prettyDate(dateText) {
  const [y, m, d] = dateText.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

// "2026-09-20" -> "Sep 20, 2026"
function shortDate(dateText) {
  const [y, m, d] = dateText.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US',
    { day: 'numeric', month: 'short', year: 'numeric' });
}

// Today + n days as "YYYY-MM-DD"
function dayFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Is this booking still in the future?
function isFuture(bookingDate, startTime) {
  return new Date(`${bookingDate}T${hhmm(startTime)}`) > new Date();
}

// "2 hours ago", "Yesterday", ...
function timeAgo(dateTimeText) {
  const then = new Date(String(dateTimeText).replace(' ', 'T'));
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} hours ago`;
  if (minutes < 60 * 48) return 'Yesterday';
  return `${Math.round(minutes / (60 * 24))} days ago`;
}

// ---------------- Modal windows (the pop-up boxes in the design) ----------------
function openModal(id) {
  document.getElementById(id).hidden = false;
  document.body.classList.add('modal-open');
}

function closeModal(id) {
  document.getElementById(id).hidden = true;
  document.body.classList.remove('modal-open');
}
