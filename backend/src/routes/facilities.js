// src/routes/facilities.js   ->   /api/facilities
// Browse rooms: list, search/filter, details, free times on a day.
// Any logged-in user can use these.

const express = require('express');
const { query } = require('../db');
const { httpError, requireLogin } = require('../middleware');
const { SLOTS } = require('../slots');
const { canTakeOver } = require('../rules');

const router = express.Router();
router.use(requireLogin);

// GET /api/facilities/categories
// (must be above '/:id', otherwise Express reads "categories" as an id)
router.get('/categories', async (req, res) => {
  const categories = await query(
    'SELECT id, name, description, allowed_roles FROM facility_categories ORDER BY name',
  );
  res.json(categories);
});

// GET /api/facilities?search=lab&categoryId=4
router.get('/', async (req, res) => {
  const facilities = await query(
    `SELECT f.id, f.name, f.category_id, c.name AS category, f.location, f.capacity,
            f.equipment, f.description, f.image_url, f.status, f.allowed_roles,
            COALESCE(f.allowed_roles, c.allowed_roles) AS who_can_book,
            FIND_IN_SET(:role, COALESCE(f.allowed_roles, c.allowed_roles)) > 0 AS can_book
     FROM facilities f
     JOIN facility_categories c ON c.id = f.category_id
     WHERE f.status <> 'HIDDEN'
       AND (:search IS NULL OR f.name     LIKE CONCAT('%', :search, '%')
                            OR f.location LIKE CONCAT('%', :search, '%'))
       AND (:categoryId  IS NULL OR f.category_id = :categoryId)
       AND (:minCapacity IS NULL OR f.capacity >= :minCapacity)
       AND (:onlyAvailable IS NULL OR f.status = 'AVAILABLE')
     ORDER BY c.name, f.name`,
    {
      role: req.user.role,
      search: req.query.search || null,          // null = no filter
      categoryId: req.query.categoryId || null,
      minCapacity: req.query.minCapacity || null,
      onlyAvailable: req.query.onlyAvailable === 'true' ? 1 : null,
    },
  );
  res.json(facilities);
});

// GET /api/facilities/5
router.get('/:id', async (req, res) => {
  const rows = await query(
    `SELECT f.*, c.name AS category,
            COALESCE(f.allowed_roles, c.allowed_roles) AS who_can_book
     FROM facilities f
     JOIN facility_categories c ON c.id = f.category_id
     WHERE f.id = :id AND f.status <> 'HIDDEN'`,
    { id: req.params.id },
  );
  if (rows.length === 0) throw httpError(404, 'Facility not found.');
  res.json(rows[0]);
});

// GET /api/facilities/5/availability?date=2026-09-20
// Shows which times are taken (booked / waiting for approval) and which are free.
router.get('/:id/availability', async (req, res) => {
  const date = req.query.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
    throw httpError(400, 'date must look like 2026-09-20.');
  }

  const rooms = await query(
    "SELECT id, name, status FROM facilities WHERE id = :id AND status <> 'HIDDEN'",
    { id: req.params.id },
  );
  if (rooms.length === 0) throw httpError(404, 'Facility not found.');

  const bookings = await query(
    `SELECT b.start_time, b.end_time, b.status, u.role
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     WHERE b.facility_id = :id
       AND b.booking_date = :date
       AND b.status IN ('PENDING', 'APPROVED')
     ORDER BY b.start_time`,
    { id: req.params.id, date },
  );

  // "10:00:00" -> "10:00"
  const takenTimes = bookings.map((b) => ({
    from: b.start_time.slice(0, 5),
    to: b.end_time.slice(0, 5),
    status: b.status === 'APPROVED' ? 'Booked' : 'Waiting for approval',
    role: b.role,
  }));

  // Every 30-minute slot of the day with its status.
  // canTakeOver = the slot is taken, but MY role may take it (teacher over student, minutes 2.11)
  const slots = SLOTS.map((slot) => {
    if (rooms[0].status !== 'AVAILABLE') return { ...slot, status: 'Closed', canTakeOver: false };
    const taken = takenTimes.find((t) => t.from === slot.start);
    if (!taken) return { ...slot, status: 'Free', canTakeOver: false };
    return {
      ...slot,
      status: taken.status,
      canTakeOver: canTakeOver(req.user.role, taken.role, date, slot.start),
    };
  });

  res.json({ facility: rooms[0], date, slots, takenTimes });
});

module.exports = router;
