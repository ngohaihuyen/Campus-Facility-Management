// js/account.js - show my profile and change my password
// Used by account.html (student/teacher/staff) and admin-settings.html (admin).

const user = requireLogin(...ACCOUNT_ROLES);

async function loadProfile() {
  const me = await api('GET', '/auth/me');
  document.getElementById('name').textContent = me.name;
  document.getElementById('email').textContent = me.email;
  document.getElementById('role').innerHTML = `<span class="badge badge-active">${esc(me.role)}</span>`;
}

document.getElementById('passwordForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const newPassword = document.getElementById('newPassword').value;

  if (newPassword !== document.getElementById('confirmPassword').value) {
    showMessage('message', 'The two new passwords are not the same.');
    return;
  }

  try {
    const data = await api('PUT', '/auth/password', {
      currentPassword: document.getElementById('currentPassword').value,
      newPassword,
    });
    showMessage('message', data.message, 'success');
    event.target.reset();
  } catch (err) {
    showMessage('message', err.message);
  }
});

if (user) loadProfile();
