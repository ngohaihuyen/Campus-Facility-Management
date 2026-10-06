// js/login.js - sign in, and register (students only)

document.getElementById('brandMark').innerHTML = icon('logo', 18);

// Already logged in? Go straight to the home page.
if (getToken() && getUser()) {
  window.location.href = homePage(getUser());
}

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Switch between the two forms
function showForm(form) {
  hideMessage('message');
  const isLogin = form === 'login';
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  document.getElementById('authTitle').textContent = isLogin ? 'Welcome Back' : 'Create your account';
  document.getElementById('authSubtitle').textContent = isLogin
    ? 'Enter your university email to access your account'
    : 'Students can register with their university email';
  document.title = (isLogin ? 'Log in' : 'Create account') + ' · Campus Facility Booking';
}

document.getElementById('showRegister').addEventListener('click', () => showForm('register'));
document.getElementById('showLogin').addEventListener('click', () => showForm('login'));

// ---------------- Sign in ----------------
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); // stop the browser from reloading the page
  try {
    const data = await api('POST', '/auth/login', {
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value,
    });
    saveLogin(data.token, data.user);
    window.location.href = homePage(data.user);
  } catch (err) {
    showMessage('message', err.message);
  }
});

// ---------------- Register (STUDENT only) ----------------
registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  try {
    await api('POST', '/auth/register', {
      name: document.getElementById('registerName').value,
      email,
      password,
    });
    // Registering worked, so log the new student in right away
    const data = await api('POST', '/auth/login', { email, password });
    saveLogin(data.token, data.user);
    window.location.href = homePage(data.user);
  } catch (err) {
    showMessage('message', err.message);
  }
});
