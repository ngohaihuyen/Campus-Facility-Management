// js/room.js - room details, the day's time slots, and the booking form

const user = requireLogin('STUDENT', 'TEACHER', 'STAFF');
const roomId = new URLSearchParams(window.location.search).get('id');

const dateInput = document.getElementById('date');
const slotSelect = document.getElementById('slot');
const purposeInput = document.getElementById('purpose');
const bookButton = document.getElementById('bookButton');

document.getElementById('ruleIcon').innerHTML = icon('clock', 16);

// ---------- Tabs (Description / Equipment / Rules) ----------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    for (const name of ['description', 'equipment', 'rules']) {
      document.getElementById('tab' + name[0].toUpperCase() + name.slice(1)).hidden = name !== tab.dataset.tab;
    }
  });
});

// ---------- Room details ----------
async function loadRoom() {
  try {
    const room = await api('GET', `/facilities/${roomId}`);
    document.title = `${room.name} · Campus Facility Booking`;
    document.getElementById('photo').innerHTML = roomImage(room, 'hero');
    document.getElementById('roomName').textContent = room.name;

    document.getElementById('roomChips').innerHTML = [
      `${icon('pin', 14)}${esc(room.location || '-')}`,
      `${icon('person', 14)}Capacity: ${esc(room.capacity ?? '?')} people`,
      `${icon('building', 14)}Type: ${esc(room.category)}`,
      `${badge(room.status)}`,
      `Can book: ${esc(room.who_can_book.replaceAll(',', ', '))}${room.allowed_roles ? ' (rule for this room)' : ''}`,
    ].map((text) => `<span class="chip">${text}</span>`).join('');

    document.getElementById('tabDescription').innerHTML =
      `<p>${esc(room.description || 'No description for this room yet.')}</p>`;
    document.getElementById('tabEquipment').innerHTML = room.equipment
      ? '<div class="detail-chips">'
        + room.equipment.split(',').map((e) => `<span class="chip">${esc(e.trim())}</span>`).join('')
        + '</div>'
      : '<p>No equipment listed.</p>';

    // Can this user book this room?
    if (!room.who_can_book.split(',').includes(user.role)) {
      disableBooking(`This room can only be booked by: ${room.who_can_book.replaceAll(',', ', ')}.`);
    } else if (room.status !== 'AVAILABLE') {
      disableBooking('This room is not available for booking right now.');
    }
  } catch (err) {
    showMessage('message', err.message);
    disableBooking('Room not found.');
  }
}

function disableBooking(reason) {
  showMessage('bookingMessage', reason, 'info');
  for (const el of [slotSelect, purposeInput, bookButton, dateInput]) el.disabled = true;
}

// ---------- The time slots of the chosen day ----------
async function loadSlots() {
  try {
    const data = await api('GET', `/facilities/${roomId}/availability?date=${dateInput.value}`);

    // The coloured timeline: one small block per slot
    document.getElementById('timeline').innerHTML = data.slots.map((s) => {
      const cls = s.status === 'Free' ? '' : s.status === 'Booked' ? 'taken'
        : s.status === 'Closed' ? 'closed' : 'waiting';
      return `<i class="slot ${cls}" title="${s.start}-${s.end} ${s.status}"></i>`;
    }).join('');

    // The dropdown: free slots can be chosen, taken slots are shown but disabled.
    // A teacher may still choose a slot that a student booked (canTakeOver).
    const chosen = slotSelect.value;
    slotSelect.innerHTML = '<option value="">-- choose a slot --</option>' + data.slots.map((s) => {
      const value = `${s.start}|${s.end}`;
      const canChoose = s.status === 'Free' || s.canTakeOver;
      let label = `${s.start} – ${s.end}`;
      if (s.status !== 'Free') label += s.canTakeOver ? ` (${s.status} – you can take it)` : ` (${s.status})`;
      return `<option value="${value}" ${canChoose ? '' : 'disabled'}
                      ${value === chosen && canChoose ? 'selected' : ''}>${label}</option>`;
    }).join('');

    const free = data.slots.filter((s) => s.status === 'Free').length;
    document.getElementById('freeCount').textContent =
      `${free} of ${data.slots.length} slots are free on this day.`;
    updateSummary();
  } catch (err) {
    showMessage('message', err.message);
  }
}

// ---------- Booking summary ----------
function updateSummary() {
  const [start, end] = slotSelect.value ? slotSelect.value.split('|') : ['', ''];
  document.getElementById('sumDate').textContent = dateInput.value ? shortDate(dateInput.value) : '–';
  document.getElementById('sumSlot').textContent = start ? `${start} – ${end}` : '–';

  // Mark my choice in blue on the timeline
  const index = [...slotSelect.options].findIndex((o) => o.value === slotSelect.value) - 1;
  document.querySelectorAll('#timeline .slot').forEach((block, i) => {
    block.classList.toggle('mine', i === index && index >= 0);
  });
}
slotSelect.addEventListener('change', updateSummary);

// ---------- Send the booking request ----------
document.getElementById('bookingForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessage('bookingMessage');

  const [startTime, endTime] = slotSelect.value.split('|');
  bookButton.disabled = true;
  try {
    const result = await api('POST', '/bookings', {
      facilityId: Number(roomId),
      bookingDate: dateInput.value,
      startTime,
      endTime,
      purpose: purposeInput.value,
    });
    let text = `Booking submitted successfully (booking #${result.id}) for ${startTime}-${endTime}. `
             + 'Awaiting approval from the department administrator.';
    if (result.replacedBookings > 0) {
      text += ` It replaced ${result.replacedBookings} student booking(s).`;
    }
    showMessage('bookingMessage', text, 'success');
    purposeInput.value = '';     // keep the date, so the user sees the slot turn orange
    slotSelect.value = '';
    loadSlots();
  } catch (err) {
    showMessage('bookingMessage', err.message); // e.g. "already booked at 10:01-10:30"
  } finally {
    bookButton.disabled = false;
  }
});

// ---------- Start ----------
if (user) {
  dateInput.min = dayFromToday(0);
  dateInput.max = dayFromToday(30);
  dateInput.value = dayFromToday(1);
  dateInput.addEventListener('change', loadSlots);
  loadRoom();
  loadSlots();
}
