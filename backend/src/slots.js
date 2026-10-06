// src/slots.js
// The day is cut into 30-minute slots:
//   07:01-07:30, 07:31-08:00, 08:01-08:30, ... , 20:31-21:00
// A booking is exactly ONE slot, so two bookings can never overlap.

const OPEN_HOUR = 7;    // first slot starts at 07:01
const CLOSE_HOUR = 21;  // last slot ends at 21:00
const SLOT_MINUTES = 30;

// 421 -> "07:01"
function toTime(minutesOfDay) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(minutesOfDay / 60))}:${pad(minutesOfDay % 60)}`;
}

// "07:01" -> 421
function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Build the list of slots once, when the server starts
const SLOTS = [];
for (let start = OPEN_HOUR * 60; start < CLOSE_HOUR * 60; start += SLOT_MINUTES) {
  SLOTS.push({
    start: toTime(start + 1),              // 07:01
    end: toTime(start + SLOT_MINUTES),     // 07:30
  });
}

// Is this exactly one of our slots?
function isSlot(startTime, endTime) {
  return SLOTS.some((s) => s.start === startTime && s.end === endTime);
}

module.exports = { SLOTS, OPEN_HOUR, CLOSE_HOUR, SLOT_MINUTES, isSlot, toTime, toMinutes };
