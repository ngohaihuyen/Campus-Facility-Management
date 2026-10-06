// js/admin-rooms.js - add, edit, open/close and remove rooms

const user = requireLogin('ADMIN');
let rooms = []; // the rooms currently shown in the table

document.getElementById('searchIcon').innerHTML = icon('search', 16);

const form = document.getElementById('roomForm');
const fields = ['roomId', 'name', 'categoryId', 'location', 'capacity',
                'equipment', 'description', 'imageUrl'];
const input = Object.fromEntries(fields.map((id) => [id, document.getElementById(id)]));

async function loadCategories() {
  const categories = await api('GET', '/facilities/categories');
  const options = categories
    .map((c) => `<option value="${c.id}">${esc(c.name)} (${esc(c.allowed_roles)})</option>`).join('');
  input.categoryId.innerHTML = options;
  document.getElementById('categoryFilter').innerHTML =
    '<option value="">All Categories</option>'
    + categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
}

function roomRow(r) {
  const activeBadge = r.status === 'AVAILABLE' ? 'ACTIVE' : 'INACTIVE';
  return `
    <tr>
      <td>
        <div class="mini" style="padding:0;border:0">
          ${roomImage(r)}
          <div><b>${esc(r.name)}</b></div>
        </div>
      </td>
      <td>${esc(r.category)}</td>
      <td>${esc(r.location || '-')}</td>
      <td>${esc(r.capacity ?? '?')} people</td>
      <td>${esc(r.who_can_book.replaceAll(',', ', '))}${r.allowed_roles ? '<span class="sub">room rule</span>' : ''}</td>
      <td>${badge(activeBadge)}</td>
      <td>
        <div class="actions">
          <button class="btn-icon" type="button" data-edit="${r.id}" title="Edit">${icon('pencil', 17)}</button>
          ${r.status === 'AVAILABLE'
            ? `<button class="btn btn-light btn-sm" data-status="UNAVAILABLE" data-id="${r.id}">Close</button>`
            : `<button class="btn btn-green btn-sm" data-status="AVAILABLE" data-id="${r.id}">Open</button>`}
          <button class="btn-icon danger" type="button" data-delete="${r.id}" title="Remove">${icon('trash', 17)}</button>
        </div>
      </td>
    </tr>`;
}

async function loadRooms() {
  try {
    rooms = await api('GET', '/facilities');

    const search = document.getElementById('search').value.trim().toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;

    const shown = rooms.filter((r) =>
      (!search || `${r.name} ${r.location} ${r.equipment}`.toLowerCase().includes(search))
      && (!category || String(r.category_id) === category)
      && (!status || r.status === status));

    document.getElementById('rows').innerHTML = shown.length
      ? shown.map(roomRow).join('')
      : '<tr><td colspan="7" class="empty">No facility matches your filters.</td></tr>';
  } catch (err) {
    showMessage('message', err.message);
  }
}

for (const id of ['search', 'categoryFilter', 'statusFilter']) {
  document.getElementById(id).addEventListener('input', loadRooms);
}

// ---------------- The add / edit box ----------------
function getRoleBoxes() {
  return [...document.querySelectorAll('.roleBox')].filter((b) => b.checked).map((b) => b.value);
}

function setRoleBoxes(rolesText) {
  const roles = rolesText ? rolesText.split(',') : [];
  document.querySelectorAll('.roleBox').forEach((b) => { b.checked = roles.includes(b.value); });
}

function openAddForm() {
  form.reset();
  setRoleBoxes('');
  input.roomId.value = '';
  document.getElementById('formTitle').textContent = 'Add New Facility';
  document.getElementById('saveButton').textContent = 'Save Facility';
  openModal('roomModal');
}

function openEditForm(id) {
  const room = rooms.find((r) => r.id === Number(id));
  if (!room) return;
  input.roomId.value = room.id;
  input.name.value = room.name;
  input.categoryId.value = room.category_id;
  input.location.value = room.location ?? '';
  input.capacity.value = room.capacity ?? '';
  input.equipment.value = room.equipment ?? '';
  input.description.value = room.description ?? '';
  input.imageUrl.value = room.image_url ?? '';
  setRoleBoxes(room.allowed_roles || '');
  document.getElementById('formTitle').textContent = `Edit ${room.name}`;
  document.getElementById('saveButton').textContent = 'Save changes';
  openModal('roomModal');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = {
    name: input.name.value,
    categoryId: Number(input.categoryId.value),
    location: input.location.value,
    capacity: input.capacity.value ? Number(input.capacity.value) : null,
    equipment: input.equipment.value,
    description: input.description.value,
    imageUrl: input.imageUrl.value,
    allowedRoles: getRoleBoxes(), // [] = follow the room type
  };
  try {
    if (input.roomId.value) {
      await api('PUT', `/admin/facilities/${input.roomId.value}`, body);
      showMessage('message', 'Room updated.', 'success');
    } else {
      await api('POST', '/admin/facilities', body);
      showMessage('message', 'Room added.', 'success');
    }
    closeModal('roomModal');
    loadRooms();
  } catch (err) {
    showMessage('message', err.message);
  }
});

// ---------------- Buttons in the table ----------------
document.getElementById('rows').addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  try {
    if (button.dataset.edit) {
      openEditForm(button.dataset.edit);
    } else if (button.dataset.status) {
      const result = await api('PATCH', `/admin/facilities/${button.dataset.id}/status`,
        { status: button.dataset.status });
      showMessage('message', `${result.message} Cancelled bookings: ${result.cancelledBookings}.`, 'success');
      loadRooms();
    } else if (button.dataset.delete) {
      const result = await api('DELETE', `/admin/facilities/${button.dataset.delete}`);
      showMessage('message', `${result.message} Cancelled bookings: ${result.cancelledBookings}.`, 'success');
      loadRooms();
    }
  } catch (err) {
    showMessage('message', err.message);
  }
});

if (user) loadCategories().then(loadRooms);
