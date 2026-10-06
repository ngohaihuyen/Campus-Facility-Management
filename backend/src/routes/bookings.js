// src/routes/bookings.js   ->   /api/bookings
// Make a booking, see my bookings, cancel a booking.
// ALL booking rules are in this file.

const express = require('express');
const { query, transaction } = require('../db');
const { httpError, requireLogin, requireRole } = require('../middleware');
const { SLOTS, isSlot } = require('../slots');
const { RULES, PRIORITY } = require('../rules');   // change the rules in src/rules.js

const router = express.Router();
router.use(requireLogin);

// ---------------- Helpers ----------------
function isRealDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 && date.getDate() === d; // rejects 2026-02-30
}

// Checks everything that does not need the database. Throws a 400 error if something is wrong.
function checkBookingInput(body) {
  const facilityId = Number(body.facilityId);
  const bookingDate = String(body.bookingDate || '');
  const startTime = String(body.startTime || '');
  const endTime = String(body.endTime || '');
  const purpose = String(body.purpose || '').trim();

  if (!Number.isInteger(facilityId)) throw httpError(400, 'facilityId is required.');
  if (!isRealDate(bookingDate)) throw httpError(400, 'bookingDate must look like 2026-09-20.');

  // One booking = exactly one 30-minute slot (07:01-07:30, 07:31-08:00, ...)
  if (!isSlot(startTime, endTime)) {
    throw httpError(400, `Choose one time slot, for example ${SLOTS[0].start}-${SLOTS[0].end}.`);
  }

  const start = new Date(`${bookingDate}T${startTime}`); // local time
  const lastDay = new Date();
  lastDay.setDate(lastDay.getDate() + RULES.maxDaysAhead);
  if (start <= new Date()) throw httpError(400, 'The start time must be in the future.');
  if (start > lastDay) throw httpError(400, `You can book at most ${RULES.maxDaysAhead} days ahead.`);

  // The purpose is required (minutes 2.4). The admin checks whether it is a valid reason.
  if (purpose.length < RULES.minPurposeLength) {
    throw httpError(400, 'Please enter the purpose of the booking, e.g. "Group study for the database exam".');
  }

  return { facilityId, bookingDate, startTime, endTime, purpose };
}

// ---------------- Routes ----------------

// POST /api/bookings
// Body: { "facilityId": 1, "bookingDate": "2026-09-20", "startTime": "10:00",
//         "endTime": "12:00", "purpose": "Group study for the database exam" }
router.post('/', requireRole('STUDENT', 'TEACHER', 'STAFF'), async (req, res) => {
  const input = checkBookingInput(req.body);
  const user = req.user;

  // One transaction: all steps succeed together, or nothing is saved.
  const result = await transaction(async (q) => {
    // Step 1. Read the room and LOCK it (FOR UPDATE).
    // If two people book the same room at the same moment, the second one waits here
    // until the first one is finished. That is how we prevent double booking.
    const rooms = await q(
      `SELECT id, status, category_id, allowed_roles FROM facilities
       WHERE id = :facilityId AND status <> 'HIDDEN'
       FOR UPDATE`,
      input,
    );
    const room = rooms[0];
    if (!room) throw httpError(404, 'Facility not found.');
    if (room.status !== 'AVAILABLE') throw httpError(409, 'This room is not available right now.');

    // Step 2. Is this user's role allowed to book this room? (minutes 2.12)
    // The room can have its own rule; if it has none, the room type decides.
    let allowedRoles = room.allowed_roles;
    if (!allowedRoles) {
      const categories = await q(
        'SELECT allowed_roles FROM facility_categories WHERE id = :categoryId',
        { categoryId: room.category_id },
      );
      allowedRoles = categories[0].allowed_roles;
    }
    if (!allowedRoles.split(',').includes(user.role)) {
      throw httpError(403, `This room can only be booked by: ${allowedRoles.split(',').join(', ')}.`);
    }

    // Step 3. Find bookings that overlap with mine (minutes 2.2 and 2.3).
    // Overlap = the other booking starts before mine ends AND ends after mine starts.
    // We use < and > (not <= and >=), so 11:00-12:00 and 12:00-14:00 do NOT overlap.
    const clashes = await q(
      `SELECT b.id, b.start_time, b.end_time, u.role,
              TIMESTAMP(b.booking_date, b.start_time) > NOW() + INTERVAL :hours HOUR AS starts_later
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.facility_id = :facilityId
         AND b.booking_date = :bookingDate
         AND b.status IN ('PENDING', 'APPROVED')
         AND b.start_time < :endTime
         AND b.end_time   > :startTime`,
      { ...input, hours: RULES.replaceAfterHours },
    );

    // Step 4. Priority rule (minutes 2.11).
    // I may take the slot only if EVERY clashing booking belongs to a lower role
    // and starts more than 24 hours from now. Otherwise: choose another time.
    const myPriority = PRIORITY[user.role];
    const canReplaceAll = clashes.every((c) => PRIORITY[c.role] < myPriority && c.starts_later);
    if (clashes.length > 0 && !canReplaceAll) {
      const times = clashes.map((c) => `${c.start_time.slice(0, 5)}-${c.end_time.slice(0, 5)}`);
      throw httpError(409, `This room is already booked at ${times.join(', ')}. Please choose another time.`);
    }

    // Step 5. Save my booking. It always starts as PENDING (waiting for the admin).
    const inserted = await q(
      `INSERT INTO bookings (user_id, facility_id, booking_date, start_time, end_time, purpose)
       VALUES (:userId, :facilityId, :bookingDate, :startTime, :endTime, :purpose)`,
      { ...input, userId: user.id },
    );

    // Step 6. Cancel the lower-priority bookings I replaced (only happens in the priority case)
    for (const c of clashes) {
      await q(
        `UPDATE bookings SET status = 'CANCELLED', admin_note = :note WHERE id = :id`,
        { id: c.id, note: `Replaced by a ${user.role.toLowerCase()} booking (#${inserted.insertId})` },
      );
    }

    return { id: inserted.insertId, replacedBookings: clashes.length };
  });

  res.status(201).json({
    ...result,
    status: 'PENDING',
    message: 'Booking request sent. Please wait for admin approval.',
  });
});

// GET /api/bookings/summary   -> the numbers and lists for the user dashboard
router.get('/summary', async (req, res) => {
  const userId = req.user.id;

  // The three numbers at the top of the dashboard
  const counts = await query(
    `SELECT
       SUM(status IN ('PENDING','APPROVED')
           AND TIMESTAMP(booking_date, start_time) > NOW())          AS upcoming,
       SUM(MONTH(created_at) = MONTH(NOW())
           AND YEAR(created_at) = YEAR(NOW()))                       AS this_month,
       SUM(status = 'PENDING')                                       AS pending
     FROM bookings WHERE user_id = :userId`,
    { userId },
  );

  // My next bookings
  const upcoming = await query(
    `SELECT b.id, f.name AS room, f.location, b.booking_date, b.start_time, b.end_time, b.status
     FROM bookings b
     JOIN facilities f ON f.id = b.facility_id
     WHERE b.user_id = :userId
       AND b.status IN ('PENDING', 'APPROVED')
       AND TIMESTAMP(b.booking_date, b.start_time) > NOW()
     ORDER BY b.booking_date, b.start_time
     LIMIT 3`,
    { userId },
  );

  // Rooms I may book, most booked first ("Popular facilities")
  const popular = await query(
    `SELECT f.id, f.name, f.capacity, f.image_url, c.name AS category, COUNT(b.id) AS times_booked
     FROM facilities f
     JOIN facility_categories c ON c.id = f.category_id
     LEFT JOIN bookings b ON b.facility_id = f.id
     WHERE f.status = 'AVAILABLE'
       AND FIND_IN_SET(:role, COALESCE(f.allowed_roles, c.allowed_roles)) > 0
     GROUP BY f.id
     ORDER BY times_booked DESC, f.name
     LIMIT 2`,
    { role: req.user.role },
  );

  // What happened to my bookings lately
  const activity = await query(
    `SELECT b.id, f.name AS room, b.status, b.admin_note, b.created_at
     FROM bookings b
     JOIN facilities f ON f.id = b.facility_id
     WHERE b.user_id = :userId
     ORDER BY b.created_at DESC, b.id DESC
     LIMIT 4`,
    { userId },
  );

  res.json({
    upcomingCount: Number(counts[0].upcoming || 0),
    thisMonthCount: Number(counts[0].this_month || 0),
    pendingCount: Number(counts[0].pending || 0),
    upcoming,
    popular,
    activity,
  });
});

// GET /api/bookings/my            -> all my bookings (my booking history)
// GET /api/bookings/my?status=PENDING
router.get('/my', async (req, res) => {
  const bookings = await query(
    `SELECT b.id, f.name AS room, f.location, b.booking_date, b.start_time, b.end_time,
            b.purpose, b.status, b.admin_note, b.created_at
     FROM bookings b
     JOIN facilities f ON f.id = b.facility_id
     WHERE b.user_id = :userId
       AND (:status IS NULL OR b.status = :status)
     ORDER BY b.booking_date DESC, b.start_time DESC`,
    { userId: req.user.id, status: req.query.status || null },
  );
  res.json(bookings);
});

// PATCH /api/bookings/12/cancel
// Body (optional): { "reason": "Our group changed the day" }
router.patch('/:id/cancel', async (req, res) => {
  const reason = String(req.body.reason || '').trim() || 'Cancelled by the user';

  // One UPDATE with all the conditions: it only changes the row if cancelling is allowed
  const result = await query(
    `UPDATE bookings
     SET status = 'CANCELLED', admin_note = :reason
     WHERE id = :id
       AND user_id = :userId                                -- only my own booking
       AND status IN ('PENDING', 'APPROVED')                -- not already rejected/cancelled
       AND TIMESTAMP(booking_date, start_time) > NOW()      -- not started yet`,
    { id: req.params.id, userId: req.user.id, reason },
  );

  if (result.affectedRows === 0) {
    throw httpError(400, 'This booking cannot be cancelled (not yours, already started, or already closed).');
  }
  res.json({ message: 'Booking cancelled.' });
});

module.exports = router;
