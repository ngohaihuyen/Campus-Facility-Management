// src/routes/auth.js   ->   /api/auth
// Register (students only), log in, see my account, change my password.
// Teacher, staff and admin accounts are made by the admin (see routes/admin.js).

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { httpError, requireLogin } = require('../middleware');

const router = express.Router();

function domain() {
  return process.env.EMAIL_DOMAIN || 'usth.edu.vn';
}

// Any university email: letters + (optional) student code + @usth.edu.vn
// Examples: anhnq2410071@usth.edu.vn (student), huydt@usth.edu.vn (teacher)
function emailPattern() {
  return new RegExp(`^[a-z]{2,}[0-9]*@${domain().replace(/\./g, '\\.')}$`);
}

// A STUDENT email must also have the student code (digits) at the end.
// anhnq2410071@usth.edu.vn  ✔      huydt@usth.edu.vn  ✘ (no code)
function studentEmailPattern() {
  return new RegExp(`^[a-z]{2,}[0-9]{4,}@${domain().replace(/\./g, '\\.')}$`);
}

function checkEmail(email) {
  if (!emailPattern().test(email)) {
    throw httpError(400, `Use your university email, for example anhnq2410071@${domain()}`);
  }
  return email;
}

// Used by the register page only
function checkStudentEmail(email) {
  if (!studentEmailPattern().test(email)) {
    throw httpError(400,
      `Only student emails can register, for example anhnq2410071@${domain()} (name + student code). `
      + 'Teacher and staff accounts are made by the admin.');
  }
  return email;
}

function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw httpError(400, 'Password must have at least 8 characters.');
  }
  return password;
}

// POST /api/auth/register
// Body: { "name": "...", "email": "anhnq2410071@usth.edu.vn", "password": "..." }
// Only students register here, and the new account is always a STUDENT.
router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = checkStudentEmail(String(req.body.email || '').trim().toLowerCase());
  const password = checkPassword(req.body.password);

  if (!name) throw httpError(400, 'name is required.');

  const existing = await query('SELECT id FROM users WHERE email = :email', { email });
  if (existing.length > 0) throw httpError(409, 'This email already has an account.');

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (name, email, password, role)
     VALUES (:name, :email, :hashedPassword, 'STUDENT')`,
    { name, email, hashedPassword },
  );

  res.status(201).json({
    id: result.insertId,
    role: 'STUDENT',
    message: 'Account created. You can log in now.',
  });
});

// POST /api/auth/login
// Body: { "email": "antt2410071@usth.edu.vn", "password": "..." }
router.post('/login', async (req, res) => {
  const email = checkEmail(String(req.body.email || '').trim().toLowerCase());
  const password = String(req.body.password || '');

  const users = await query('SELECT * FROM users WHERE email = :email', { email });
  const user = users[0];

  // Same message for "wrong email" and "wrong password", so nobody can guess emails
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw httpError(401, 'Wrong email or password.');
  }
  if (!user.is_active) throw httpError(403, 'Your account is locked.');

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '8h' });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// GET /api/auth/me
router.get('/me', requireLogin, (req, res) => {
  res.json(req.user);
});

// PUT /api/auth/password
// Body: { "currentPassword": "...", "newPassword": "..." }
router.put('/password', requireLogin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  checkPassword(newPassword);

  const users = await query('SELECT password FROM users WHERE id = :id', { id: req.user.id });
  if (!(await bcrypt.compare(String(currentPassword || ''), users[0].password))) {
    throw httpError(400, 'Current password is wrong.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password = :hashedPassword WHERE id = :id',
    { hashedPassword, id: req.user.id });

  res.json({ message: 'Password changed.' });
});

module.exports = { router, checkEmail, checkStudentEmail, checkPassword };
