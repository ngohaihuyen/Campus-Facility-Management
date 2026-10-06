// src/middleware.js
// Small functions that run before (or after) the route handlers.

const jwt = require('jsonwebtoken');
const { query } = require('./db');

// Make an error that carries an HTTP status code.
// Example: throw httpError(404, 'Facility not found.');
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Only logged-in users can pass. Puts the user into req.user.
// The request must have the header:  Authorization: Bearer <token>
async function requireLogin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) throw httpError(401, 'Please log in first.');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw httpError(401, 'Your login has expired. Please log in again.');
  }

  // Read the user from the database again, so a locked account is blocked right away
  const users = await query(
    'SELECT id, name, email, role, is_active FROM users WHERE id = :id',
    { id: payload.userId },
  );
  const user = users[0];
  if (!user) throw httpError(401, 'Account not found.');
  if (!user.is_active) throw httpError(403, 'Your account is locked.');

  req.user = user; // { id, name, email, role, is_active }
  next();
}

// Only the listed roles can pass. Use it after requireLogin.
// Example: router.use(requireLogin, requireRole('ADMIN'));
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw httpError(403, 'You do not have permission to do this.');
    }
    next();
  };
}

// Every error ends up here and is sent back as JSON: { "message": "..." }
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  // Common MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'This value already exists.' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ message: 'An id you sent does not exist.' });
  }
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.code === 'WARN_DATA_TRUNCATED') {
    return res.status(400).json({ message: 'Some data is not valid.' });
  }

  console.error(err); // unexpected error: details are shown in the terminal only
  res.status(500).json({ message: 'Server error. Please try again.' });
}

module.exports = { httpError, requireLogin, requireRole, errorHandler };
