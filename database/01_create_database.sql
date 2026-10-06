-- 01_create_database.sql
-- Creates the database and its 4 tables: users, facility_categories, facilities, bookings.
-- Lines marked "-- added" are small additions to the team's original schema,
-- needed for decisions from the 07 Sep 2026 meeting.
-- WARNING: running this file again deletes all tables and their data.

CREATE DATABASE IF NOT EXISTS FacilityBookingDB
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE FacilityBookingDB;

-- added: lets you run this file again (child tables are dropped first)
DROP TABLE IF EXISTS bookings, facilities, facility_categories, users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,                  -- bcrypt hash, never the real password
    role ENUM('STUDENT', 'TEACHER', 'STAFF', 'ADMIN') NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,         -- added: FALSE = account locked by admin
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE facility_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    -- added: which roles may book this type of room (e.g. Teacher Meeting Room -> 'TEACHER')
    allowed_roles SET('STUDENT', 'TEACHER', 'STAFF') NOT NULL DEFAULT 'STUDENT,TEACHER,STAFF'
);

CREATE TABLE facilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    capacity INT CHECK (capacity > 0 AND capacity <= 300),   -- added: 1..300 people
    description VARCHAR(255),
    equipment VARCHAR(255),
    image_url VARCHAR(500),                                  -- added: photo shown on the room card
    -- added: roles allowed for THIS room. NULL = use the room type's allowed_roles.
    allowed_roles SET('STUDENT', 'TEACHER', 'STAFF') NULL DEFAULT NULL,
    -- added 'HIDDEN': a deleted room is hidden, so its old bookings are kept
    status ENUM('AVAILABLE', 'UNAVAILABLE', 'HIDDEN') DEFAULT 'AVAILABLE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_facility_category
        FOREIGN KEY (category_id)
        REFERENCES facility_categories(id)
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    facility_id INT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    -- added 'CANCELLED': the user cancelled, a teacher took the slot, or the room was closed
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') DEFAULT 'PENDING',
    admin_note VARCHAR(255),                         -- added: reason for reject / cancel
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,   -- keeps hour, minute and second

    CONSTRAINT fk_booking_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_booking_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id),

    CONSTRAINT chk_booking_time CHECK (end_time > start_time),     -- added

    INDEX idx_booking_room_day (facility_id, booking_date)         -- added: faster overlap check
);
