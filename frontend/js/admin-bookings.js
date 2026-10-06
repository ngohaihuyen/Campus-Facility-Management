// js/admin-bookings.js - review booking requests and see the history of all users

const user = requireLogin('ADMIN');
let bookings = [];

async function loadRooms() {
  const rooms = await api('GET', '/facilities');
  document.getElementById('room').innerHTML = '<option value="">All Facilities</option>'
    + rooms.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
}

function row(b, number) {
  let actions = '<span class="muted">—</span>';
  if (b.status === 'PENDING') {
    actions = `<div class="actions">
        <button class="btn btn-green btn-sm" data-approve="${b.id}">Approve</button>
        <button class="btn btn-danger-text btn-sm" data-reject="${b.id}">Reject</button>
      </div>`;
  } else if (b.status === 'APPROVED' && isFuture(b.booking_date, b.start_time)) {
    actions = `<button class="btn btn-light btn-sm" data-reject="${b.id}">Cancel</button>`;
  }
  return `
    <tr data-open="${b.id}">
      <td class="muted">${String(number).padStart(2, '0')}</td>
      <td><b>${esc(b.user_name)}</b><span class="sub">${esc(b.role.charAt(0) + b.role.slice(1).toLowerCase())}</span></td>
      <td>${esc(b.room)}</td>
      <td>${esc(shortDate(b.booking_date))}</td>
      <td>${hhmm(b.start_time)} – ${hhmm(b.end_time)}</td>
      <td>${badge(b.status)}</td>
      <td>${actions}</td>
    </tr>`;
}

async function load() {
  const query = new URLSearchParams();
  if (document.getElementById('status').value) query.set('status', document.getElementById('status').value);
  if (document.getElementById('room').value) query.set('facilityId', document.getElementById('room').value);
  if (document.getElementById('date').value) query.set('date', document.getElementById('date').value);

  try {
    bookings = await api('GET', '/admin/bookings?' + query.toString());

    const search = document.getElementById('searchUser').value.trim().toLowerCase();
    const shown = search
      ? bookings.filter((b) => `${b.user_name} ${b.email}`.toLowerCase().includes(search))
      : bookings;

    document.getElementById('rows').innerHTML = shown.length
      ? shown.map((b, i) => row(b, i + 1)).join('')
      : '<tr><td colspan="7" class="empty">Nothing here.</td></tr>';
  } catch (err) {
    showMessage('message', err.message);
  }
}

for (const id of ['status', 'room', 'date', 'searchUser']) {
  document.getElementById(id).addEventListener('input', load);
}

// ---------------- The details box ----------------
function openDetail(id) {
  const b = bookings.find((x) => x.id === Number(id));
  if (!b) return;

  const line = (label, value) => `<div class="info-line"><span>${label}:</span><b>${esc(value)}</b></div>`;
  document.getElementById('bookingDetail').innerHTML = `
    <div class="queue-row" style="padding:0 0 12px">
      <span class="avatar">${icon('person', 18)}</span>
      <div>
        <b>${esc(b.user_name)}</b>
        <div class="sub">${esc(b.email)} · ${esc(b.role.charAt(0) + b.role.slice(1).toLowerCase())}</div>
      </div>
    </div>
    ${line('Facility', b.room)}
    ${line('Date', prettyDate(b.booking_date))}
    ${line('Time slot', `${hhmm(b.start_time)} – ${hhmm(b.end_time)}`)}
    ${line('Total duration', '30m')}
    ${line('Purpose of reservation', b.purpose)}
    ${b.admin_note ? line('Admin note', b.admin_note) : ''}
    <h3 style="margin-top:14px;color:#06373a">Approval Timeline</h3>
    <div class="step"><span class="mark done">${icon('check', 11)}</span> Request submitted</div>
    <div class="step">
      <span class="mark ${b.status === 'PENDING' ? 'wait' : 'done'}">${icon(b.status === 'PENDING' ? 'clock' : 'check', 11)}</span>
      ${b.status === 'PENDING' ? 'Awaiting department administrator approval'
        : `${esc(b.status.charAt(0) + b.status.slice(1).toLowerCase())} by the administrator`}
    </div>`;

  document.getElementById('bookingActions').innerHTML = b.status === 'PENDING'
    ? `<button class="btn btn-danger-text" data-reject="${b.id}">Reject Booking</button>
       <button class="btn" data-approve="${b.id}">Approve Reservation</button>`
    : `<button class="btn btn-light" type="button" onclick="closeModal('bookingModal')">Close</button>`;

  openModal('bookingModal');
}

// ---------------- Clicks: open the box, approve, reject ----------------
async function review(id, wantApprove) {
  let body = { status: 'APPROVED' };
  if (!wantApprove) {
    const note = prompt('Why are you rejecting this booking?');
    if (note === null) return;
    body = { status: 'REJECTED', note };
  }
  try {
    const result = await api('PATCH', `/admin/bookings/${id}`, body);
    showMessage('message', result.message, 'success');
    closeModal('bookingModal');
    load();
  } catch (err) {
    showMessage('message', err.message);
    closeModal('bookingModal');
  }
}

document.getElementById('rows').addEventListener('click', (event) => {
  const button = event.target.closest('[data-approve], [data-reject]');
  if (button) {
    review(button.dataset.approve || button.dataset.reject, Boolean(button.dataset.approve));
    return;
  }
  const line = event.target.closest('[data-open]');
  if (line) openDetail(line.dataset.open);
});

document.getElementById('bookingActions').addEventListener('click', (event) => {
  const button = event.target.closest('[data-approve], [data-reject]');
  if (button) review(button.dataset.approve || button.dataset.reject, Boolean(button.dataset.approve));
});

if (user) loadRooms().then(load);
