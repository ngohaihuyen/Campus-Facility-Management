// js/dashboard.js - the home page for students, teachers and staff

const user = requireLogin('STUDENT', 'TEACHER', 'STAFF');

// Small pictures in the three stat cards
document.getElementById('icoUpcoming').innerHTML = icon('calendar', 18);
document.getElementById('icoMonth').innerHTML = icon('trend', 18);
document.getElementById('icoPending').innerHTML = icon('clock', 18);

// "Find a space" jumps to the Facilities page with the text already searched
document.getElementById('quickSearch').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    window.location.href = 'rooms.html?search=' + encodeURIComponent(event.target.value);
  }
});

// One row in "My Upcoming Bookings"
function upcomingRow(b) {
  return `
    <div class="card booking-row" style="margin-bottom:10px">
      <div>
        <b>${esc(b.room)}</b>
        <div class="meta">
          <span>${icon('calendar', 14)}${shortDate(b.booking_date)}</span>
          <span>${icon('clock', 14)}${hhmm(b.start_time)}–${hhmm(b.end_time)}</span>
          <span>${icon('pin', 14)}${esc(b.location || '-')}</span>
        </div>
      </div>
      <span style="margin-left:auto">${badge(b.status)}</span>
    </div>`;
}

// One room in "Popular Facilities"
function popularRow(room) {
  return `
    <div class="mini">
      ${roomImage(room)}
      <div>
        <b>${esc(room.name)}</b>
        <div class="sub">${esc(room.category)} · ${esc(room.capacity ?? '?')} people</div>
        <a href="room.html?id=${room.id}">Book Now →</a>
      </div>
    </div>`;
}

// One line in "Recent Activity"
function activityRow(b) {
  const colour = { APPROVED: 'var(--green)', PENDING: 'var(--amber)',
                   REJECTED: 'var(--red)', CANCELLED: '#9ca3af' }[b.status];
  const what = {
    PENDING: `Booked '${b.room}'`,
    APPROVED: `Admin approved '${b.room}' reservation`,
    REJECTED: `Booking for '${b.room}' was rejected`,
    CANCELLED: `Cancelled booking for '${b.room}'`,
  }[b.status];
  return `
    <div class="activity">
      <span class="dot" style="background:${colour}"></span>
      <div>
        <div>${esc(what)}</div>
        <div class="sub muted" style="font-size:12px">
          ${esc(b.status.charAt(0) + b.status.slice(1).toLowerCase())}${b.admin_note ? ' · ' + esc(b.admin_note) : ''}
        </div>
      </div>
      <span class="when">${esc(timeAgo(b.created_at))}</span>
    </div>`;
}

async function load() {
  try {
    const data = await api('GET', '/bookings/summary');

    document.getElementById('upcomingCount').textContent = data.upcomingCount;
    document.getElementById('monthCount').textContent = data.thisMonthCount;
    document.getElementById('pendingCount').textContent = data.pendingCount;

    document.getElementById('upcoming').innerHTML = data.upcoming.length
      ? data.upcoming.map(upcomingRow).join('')
      : '<div class="card empty">No upcoming bookings. Open <a href="rooms.html">Facilities</a> to book a room.</div>';

    document.getElementById('popular').innerHTML = data.popular.map(popularRow).join('')
      || '<p class="muted">No rooms yet.</p>';

    document.getElementById('activity').innerHTML = data.activity.map(activityRow).join('')
      || '<p class="muted" style="margin:0">Nothing has happened yet.</p>';
  } catch (err) {
    showMessage('message', err.message);
  }
}

if (user) {
  document.getElementById('welcome').textContent = `Welcome back, ${user.name}!`;
  document.getElementById('today').textContent =
    'Today is ' + new Date().toLocaleDateString('en-US',
      { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    + '. Here is your facility booking.';
  load();
}
