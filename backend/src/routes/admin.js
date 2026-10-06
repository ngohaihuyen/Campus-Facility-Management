// src/routes/admin.js   ->   /api/admin
// Admin only: review bookings, manage facilities, manage users.

const express = require('express');
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../db');
const { httpError, requireLogin, requireRole } = require('../middleware');
const { checkEmail, checkPassword } = require('./auth');

const ROLES = ['STUDENT', 'TEACHER', 'STAFF', 'ADMIN'];

const router = express.Router();
router.use(requireLogin, requireRole('ADMIN'));

/* =========================== DASHBOARD =========================== */

// GET /api/admin/summary   -> the numbers and lists for the admin dashboard
router.get('/summary', async (req, res) => {
  const counts = await query(
    `SELECT
       (SELECT COUNT(*) FROM facilities WHERE status <> 'HIDDEN')                AS facilities,
       (SELECT COUNT(*) FROM bookings WHERE booking_date = CURDATE()
                                        AND status IN ('PENDING','APPROVED'))    AS today,
       (SELECT COUNT(*) FROM bookings WHERE status = 'PENDING')                  AS pending,
       (SELECT COUNT(*) FROM users WHERE is_active = TRUE)                       AS users`,
  );

  const recent = await query(
    `SELECT b.id, u.name AS user_name, u.role, f.name AS room,
            b.booking_date, b.start_time, b.end_time, b.status
     FROM bookings b
     JOIN users u      ON u.id = b.user_id
     JOIN facilities f ON f.id = b.facility_id
     ORDER BY b.created_at DESC, b.id DESC
     LIMIT 5`,
  );

  const queue = await query(
    `SELECT b.id, u.name AS user_name, u.email, u.role, f.name AS room,
            b.booking_date, b.start_time, b.end_time, b.purpose
     FROM bookings b
     JOIN users u      ON u.id = b.user_id
     JOIN facilities f ON f.id = b.facility_id
     WHERE b.status = 'PENDING'
     ORDER BY b.booking_date, b.start_time
     LIMIT 5`,
  );

  res.json({
    facilityCount: counts[0].facilities,
    todayCount: counts[0].today,
    pendingCount: counts[0].pending,
    userCount: counts[0].users,
    recent,
    queue,
  });
});

/* =========================== MANAGE BOOKINGS =========================== */

// GET /api/admin/bookings                     -> booking history of all users
// GET /api/admin/bookings?status=PENDING      -> requests waiting for review
// GET /api/admin/bookings?facilityId=1&date=2026-09-20
router.get('/bookings', async (req, res) => {
  const bookings = await query(
    `SELECT b.id, u.name AS user_name, u.email, u.role, f.name AS room,
            b.booking_date, b.start_time, b.end_time, b.purpose,
            b.status, b.admin_note, b.created_at
     FROM bookings b
     JOIN users u      ON u.id = b.user_id
     JOIN facilities f ON f.id = b.facility_id
     WHERE (:status     IS NULL OR b.status = :status)
       AND (:facilityId IS NULL OR b.facility_id = :facilityId)
       AND (:date       IS NULL OR b.booking_date = :date)
     ORDER BY b.created_at DESC, b.id DESC`,
    {
      status: req.query.status || null,
      facilityId: req.query.facilityId || null,
      date: req.query.date || null,
    },
  );
  res.json(bookings);
});

// PATCH /api/admin/bookings/12
// Body: { "status": "APPROVED" }  or  { "status": "REJECTED", "note": "Room is used for an exam" }
router.patch('/bookings/:id', async (req, res) => {
  const { status } = req.body;
  const note = String(req.body.note || '').trim() || null;

  if (status !== 'APPROVED' && status !== 'REJECTED') {
    throw httpError(400, 'status must be "APPROVED" or "REJECTED".');
  }
  if (status === 'REJECTED' && !note) {
    throw httpError(400, 'Please write a reason when rejecting.');
  }

  // Only a PENDING booking can be reviewed
  const result = await query(
    `UPDATE bookings SET status = :status, admin_note = :note
     WHERE id = :id AND status = 'PENDING'`,
    { id: req.params.id, status, note },
  );

  if (result.affectedRows === 0) {
    const rows = await query('SELECT status FROM bookings WHERE id = :id', { id: req.params.id });
    if (rows.length === 0) throw httpError(404, 'Booking not found.');
    throw httpError(409, `This booking is already ${rows[0].status}.`);
  }
  res.json({ message: `Booking ${status.toLowerCase()}.` });
});

/* =========================== MANAGE FACILITIES =========================== */

const MAX_CAPACITY = 300;

function checkFacilityInput(body) {
  // allowedRoles: ["TEACHER"] -> only teachers may book this room
  //               [] or missing -> the room follows its room type
  const roles = Array.isArray(body.allowedRoles) ? body.allowedRoles : [];
  for (const role of roles) {
    if (!['STUDENT', 'TEACHER', 'STAFF'].includes(role)) {
      throw httpError(400, 'allowedRoles can only contain STUDENT, TEACHER or STAFF.');
    }
  }

  const facility = {
    categoryId: Number(body.categoryId),
    name: String(body.name || '').trim(),
    location: body.location || null,
    capacity: body.capacity === '' || body.capacity === undefined || body.capacity === null
      ? null : Number(body.capacity),
    description: body.description || null,
    equipment: body.equipment || null,
    imageUrl: String(body.imageUrl || '').trim() || null,
    allowedRoles: roles.length > 0 ? roles.join(',') : null,
  };

  if (!facility.name) throw httpError(400, 'name is required.');
  if (!Number.isInteger(facility.categoryId)) throw httpError(400, 'categoryId is required.');
  if (facility.capacity !== null
      && (!Number.isInteger(facility.capacity) || facility.capacity < 1 || facility.capacity > MAX_CAPACITY)) {
    throw httpError(400, `capacity must be a whole number from 1 to ${MAX_CAPACITY}.`);
  }
  return facility;
}

// POST /api/admin/facilities
// Body: { "categoryId": 1, "name": "Study Room A103", "location": "...",
//         "capacity": 10, "description": "...", "equipment": "..." }
router.post('/facilities', async (req, res) => {
  const facility = checkFacilityInput(req.body);
  const result = await query(
    `INSERT INTO facilities (category_id, name, location, capacity, description, equipment,
                             image_url, allowed_roles)
     VALUES (:categoryId, :name, :location, :capacity, :description, :equipment,
             :imageUrl, :allowedRoles)`,
    facility,
  );
  res.status(201).json({ id: result.insertId, message: 'Facility added.' });
});

// PUT /api/admin/facilities/8   (same body as POST)
router.put('/facilities/:id', async (req, res) => {
  const facility = checkFacilityInput(req.body);
  const result = await query(
    `UPDATE facilities
     SET category_id = :categoryId, name = :name, location = :location,
         capacity = :capacity, description = :description, equipment = :equipment,
         image_url = :imageUrl, allowed_roles = :allowedRoles
     WHERE id = :id AND status <> 'HIDDEN'`,
    { ...facility, id: req.params.id },
  );
  if (result.affectedRows === 0) throw httpError(404, 'Facility not found.');
  res.json({ message: 'Facility updated.' });
});

// Change a room's status. When a room closes, its future bookings are cancelled,
// so nobody arrives at a closed room.
async function changeRoomStatus(id, status) {
  return transaction(async (q) => {
    const room = await q(
      "UPDATE facilities SET status = :status WHERE id = :id AND status <> 'HIDDEN'",
      { id, status },
    );
    if (room.affectedRows === 0) throw httpError(404, 'Facility not found.');
    if (status === 'AVAILABLE') return 0;

    const cancelled = await q(
      `UPDATE bookings
       SET status = 'CANCELLED', admin_note = :note
       WHERE facility_id = :id
         AND status IN ('PENDING', 'APPROVED')
         AND TIMESTAMP(booking_date, start_time) > NOW()`,
      { id, note: status === 'HIDDEN' ? 'The room was removed.' : 'The room is not available.' },
    );
    return cancelled.affectedRows;
  });
}

// PATCH /api/admin/facilities/5/status
// Body: { "status": "AVAILABLE" }  or  { "status": "UNAVAILABLE" }
router.patch('/facilities/:id/status', async (req, res) => {
  const { status } = req.body;
  if (status !== 'AVAILABLE' && status !== 'UNAVAILABLE') {
    throw httpError(400, 'status must be "AVAILABLE" or "UNAVAILABLE".');
  }
  const cancelledBookings = await changeRoomStatus(req.params.id, status);
  res.json({ message: `Room is now ${status}.`, cancelledBookings });
});

// DELETE /api/admin/facilities/8
// The room is hidden (status HIDDEN), not really deleted, so its old bookings stay.
router.delete('/facilities/:id', async (req, res) => {
  const cancelledBookings = await changeRoomStatus(req.params.id, 'HIDDEN');
  res.json({ message: 'Facility removed.', cancelledBookings });
});

/* =========================== MANAGE USERS =========================== */

// POST /api/admin/users
// Body: { "name": "...", "email": "anhnq2410071@usth.edu.vn", "password": "...", "role": "STUDENT" }
// There is no public registration, so the admin creates every account here.
router.post('/users', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = checkEmail(String(req.body.email || '').trim().toLowerCase());
  const password = checkPassword(req.body.password);
  const role = req.body.role;

  if (!name) throw httpError(400, 'name is required.');
  if (!ROLES.includes(role)) throw httpError(400, `role must be one of: ${ROLES.join(', ')}.`);

  const existing = await query('SELECT id FROM users WHERE email = :email', { email });
  if (existing.length > 0) throw httpError(409, 'This email already has an account.');

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (name, email, password, role)
     VALUES (:name, :email, :hashedPassword, :role)`,
    { name, email, hashedPassword, role },
  );
  res.status(201).json({ id: result.insertId, message: 'Account created.' });
});

// GET /api/admin/users?search=an&role=STUDENT
router.get('/users', async (req, res) => {
  const users = await query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users
     WHERE (:search IS NULL OR name LIKE CONCAT('%', :search, '%')
                            OR email LIKE CONCAT('%', :search, '%'))
       AND (:role IS NULL OR role = :role)
     ORDER BY id`,
    { search: req.query.search || null, role: req.query.role || null },
  );
  res.json(users);
});

// PATCH /api/admin/users/5
// Body: { "role": "STAFF" }  and/or  { "isActive": false }
// Admins only change the role or lock/unlock an account (minutes 2.6).
router.patch('/users/:id', async (req, res) => {
  const role = req.body.role ?? null;
  const isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : null;

  if (Number(req.params.id) === req.user.id) {
    throw httpError(400, 'You cannot change your own account here.');
  }
  if (role === null && isActive === null) throw httpError(400, 'Send role and/or isActive.');
  if (role !== null && !ROLES.includes(role)) {
    throw httpError(400, `role must be one of: ${ROLES.join(', ')}.`);
  }

  const result = await query(
    `UPDATE users
     SET role      = COALESCE(:role, role),           -- keep the old value if not sent
         is_active = COALESCE(:isActive, is_active)
     WHERE id = :id`,
    { id: req.params.id, role, isActive },
  );
  if (result.affectedRows === 0) throw httpError(404, 'User not found.');
  res.json({ message: 'User updated.' });
});

module.exports = router;
