-- 03_useful_queries.sql
-- Queries for checking your data while you test the API.
-- In MySQL Workbench: click inside ONE query and press Ctrl+Enter.

USE FacilityBookingDB;

-- All bookings, newest first
SELECT b.id, u.name AS user_name, f.name AS room, b.booking_date,
       b.start_time, b.end_time, b.purpose, b.status, b.admin_note, b.created_at
FROM bookings b
JOIN users u      ON u.id = b.user_id
JOIN facilities f ON f.id = b.facility_id
ORDER BY b.id DESC;

-- Users and roles
SELECT id, name, email, role, is_active FROM users;

-- Which roles may book each room type
SELECT name, allowed_roles FROM facility_categories;

-- Overlapping bookings (this must return NO rows)
SELECT a.id, b.id AS overlaps_with, a.facility_id, a.booking_date
FROM bookings a
JOIN bookings b
  ON  a.facility_id  = b.facility_id
  AND a.booking_date = b.booking_date
  AND a.id < b.id
  AND a.start_time < b.end_time
  AND a.end_time   > b.start_time
WHERE a.status IN ('PENDING', 'APPROVED')
  AND b.status IN ('PENDING', 'APPROVED');

-- Delete all bookings to test again (remove the -- first)
-- SET SQL_SAFE_UPDATES = 0;
-- DELETE FROM bookings;
-- SET SQL_SAFE_UPDATES = 1;
