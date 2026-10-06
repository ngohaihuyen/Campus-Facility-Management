// js/admin-users.js - create accounts, change roles and lock/unlock accounts

const user = requireLogin('ADMIN');
const ROLES = ['STUDENT', 'TEACHER', 'STAFF', 'ADMIN'];

document.getElementById('searchIcon').innerHTML = icon('search', 16);
const searchInput = document.getElementById('search');
const roleFilter = document.getElementById('roleFilter');

async function loadUsers() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
  if (roleFilter.value) params.set('role', roleFilter.value);

  try {
    const users = await api('GET', `/admin/users?${params}`);
    document.getElementById('rows').innerHTML = users.map((u) => {
      const isMe = u.id === user.id;
      return `
        <tr>
          <td class="muted">${String(u.id).padStart(2, '0')}</td>
          <td>
            <div class="mini" style="padding:0;border:0">
              <span class="avatar">${icon('person', 17)}</span>
              <div><b>${esc(u.name)}</b><span class="sub">${esc(u.email)}</span></div>
            </div>
          </td>
          <td>
            <select data-role="${u.id}" ${isMe ? 'disabled' : ''}>
              ${ROLES.map((r) => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </td>
          <td>${u.is_active ? badge('ACTIVE') : badge('INACTIVE')}</td>
          <td class="muted">${esc(u.created_at.slice(0, 10))}</td>
          <td>
            ${isMe ? '<span class="muted">You</span>' : `
              <button class="btn btn-sm ${u.is_active ? 'btn-light' : 'btn-green'}"
                      data-lock="${u.id}" data-active="${u.is_active ? 'false' : 'true'}">
                ${u.is_active ? 'Lock' : 'Unlock'}
              </button>`}
          </td>
        </tr>`;
    }).join('') || '<tr><td colspan="6" class="empty">No users found.</td></tr>';
  } catch (err) {
    showMessage('message', err.message);
  }
}

// Change role
document.getElementById('rows').addEventListener('change', async (event) => {
  const select = event.target.closest('[data-role]');
  if (!select) return;
  try {
    await api('PATCH', `/admin/users/${select.dataset.role}`, { role: select.value });
    showMessage('message', `Role changed to ${select.value}.`, 'success');
  } catch (err) {
    showMessage('message', err.message);
  }
  loadUsers();
});

// Lock / unlock
document.getElementById('rows').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-lock]');
  if (!button) return;
  try {
    await api('PATCH', `/admin/users/${button.dataset.lock}`, { isActive: button.dataset.active === 'true' });
    showMessage('message', button.dataset.active === 'true' ? 'Account unlocked.' : 'Account locked.', 'success');
    loadUsers();
  } catch (err) {
    showMessage('message', err.message);
  }
});

// Create a new account
document.getElementById('userForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('POST', '/admin/users', {
      name: document.getElementById('newName').value,
      email: document.getElementById('newEmail').value,
      password: document.getElementById('newPassword').value,
      role: document.getElementById('newRole').value,
    });
    showMessage('message', `${data.message} (id ${data.id})`, 'success');
    event.target.reset();
    closeModal('userModal');
    loadUsers();
  } catch (err) {
    showMessage('message', err.message);
  }
});

let typingTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(loadUsers, 300);
});
roleFilter.addEventListener('change', loadUsers);

if (user) loadUsers();
