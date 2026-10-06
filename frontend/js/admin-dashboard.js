// js/admin-dashboard.js - numbers, the newest bookings and the approval queue

const user = requireLogin('ADMIN');

document.getElementById('icoFacilities').innerHTML = icon('building', 18);
document.getElementById('icoToday').innerHTML = icon('calendar', 18);
document.getElementById('icoPending').innerHTML = icon('clock', 18);
document.getElementById('icoUsers').innerHTML = icon('users', 18);

function recentRow(b) {
  const actions = b.status === 'PENDING'
    ? `<div class="actions">
         <button class="btn btn-green btn-sm" data-approve="${b.id}">Approve</button>
         <button class="btn btn-danger-text btn-sm" data-reject="${b.id}">Deny</button>
       </div>`
    : '<span class="muted">No action needed</span>';
  return `
    <tr>
      <td><b>${esc(b.user_name)}</b><span class="sub">${esc(b.role.charAt(0) + b.role.slice(1).toLowerCase())}</span></td>
      <td>${esc(b.room)}</td>
      <td>${esc(shortDate(b.booking_date))}<span class="sub">${hhmm(b.start_time)} – ${hhmm(b.end_time)}</span></td>
      <td>${badge(b.status)}</td>
      <td>${actions}</td>
    </tr>`;
}

function queueRow(b) {
  return `
    <div class="card queue-row" style="margin-bottom:10px">
      <span class="avatar">${icon('person', 18)}</span>
      <div>
        <b>${esc(b.user_name)}</b> <span class="muted">(${esc(b.email)})</span>
        <div class="sub">${esc(b.room)} · ${esc(shortDate(b.booking_date))}, ${hhmm(b.start_time)} – ${hhmm(b.end_time)}</div>
        <div class="sub"><i>Reason: ${esc(b.purpose)}</i></div>
      </div>
      <div class="actions" style="margin-left:auto">
        <button class="btn btn-green btn-sm" data-approve="${b.id}">Approve Reservation</button>
        <button class="btn btn-danger-text btn-sm" data-reject="${b.id}">Reject</button>
      </div>
    </div>`;
}

async function load() {
  try {
    const data = await api('GET', '/admin/summary');
    document.getElementById('facilityCount').textContent = data.facilityCount;
    document.getElementById('todayCount').textContent = data.todayCount;
    document.getElementById('pendingCount').textContent = data.pendingCount;
    document.getElementById('userCount').textContent = data.userCount;

    document.getElementById('recent').innerHTML = data.recent.length
      ? data.recent.map(recentRow).join('')
      : '<tr><td colspan="5" class="empty">No bookings yet.</td></tr>';

    document.getElementById('queue').innerHTML = data.queue.length
      ? data.queue.map(queueRow).join('')
      : '<div class="card empty">Nothing is waiting for approval.</div>';
  } catch (err) {
    showMessage('message', err.message);
  }
}

// Approve / reject straight from the dashboard
document.querySelector('.admin-body').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-approve], [data-reject]');
  if (!button) return;

  let body = { status: 'APPROVED' };
  if (button.dataset.reject) {
    const note = prompt('Why are you rejecting this booking?');
    if (note === null) return;
    body = { status: 'REJECTED', note };
  }
  try {
    const id = button.dataset.approve || button.dataset.reject;
    const result = await api('PATCH', `/admin/bookings/${id}`, body);
    showMessage('message', result.message, 'success');
    load();
  } catch (err) {
    showMessage('message', err.message);
  }
});

if (user) load();
