// js/my-bookings.js - my booking history, and cancelling a booking

const user = requireLogin('STUDENT', 'TEACHER', 'STAFF');
let status = ''; // '' = all

function row(b) {
  // A booking can only be cancelled while it is PENDING or APPROVED and has not started
  const canCancel = ['PENDING', 'APPROVED'].includes(b.status) && isFuture(b.booking_date, b.start_time);
  return `
    <tr>
      <td><b>${esc(b.room)}</b><span class="sub">${esc(b.location || '-')}</span></td>
      <td>${esc(shortDate(b.booking_date))}</td>
      <td>${hhmm(b.start_time)} – ${hhmm(b.end_time)}</td>
      <td>${esc(b.purpose)}${b.admin_note ? `<span class="sub">Note: ${esc(b.admin_note)}</span>` : ''}</td>
      <td>${badge(b.status)}</td>
      <td>${canCancel
        ? `<button class="btn btn-light btn-sm" data-cancel="${b.id}">Cancel</button>`
        : '<span class="muted">—</span>'}</td>
    </tr>`;
}

async function load() {
  try {
    const bookings = await api('GET', '/bookings/my' + (status ? `?status=${status}` : ''));
    document.getElementById('rows').innerHTML = bookings.length
      ? bookings.map(row).join('')
      : '<tr><td colspan="6" class="empty">Nothing here yet.</td></tr>';
  } catch (err) {
    showMessage('message', err.message);
  }
}

// Status tabs
document.querySelectorAll('.tab-btn').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((t) => t.classList.toggle('active', t === tab));
    status = tab.dataset.status;
    load();
  });
});

// Cancel button
document.getElementById('rows').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-cancel]');
  if (!button) return;

  const reason = prompt('Why are you cancelling? (optional)');
  if (reason === null) return; // the user pressed Cancel in the box
  try {
    const result = await api('PATCH', `/bookings/${button.dataset.cancel}/cancel`, { reason });
    showMessage('message', result.message, 'success');
    load();
  } catch (err) {
    showMessage('message', err.message);
  }
});

if (user) load();
