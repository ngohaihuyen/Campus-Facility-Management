// src/rules.js
// All booking rules in ONE place, so the room page and the booking API agree.
// The time slots themselves (07:01-07:30, 07:31-08:00, ...) are in src/slots.js

const RULES = {
  maxDaysAhead: 30,       // how far ahead you can book
  minPurposeLength: 10,   // the purpose must be a real sentence
  replaceAfterHours: 24,  // a teacher can take a student's slot only if it starts more than 24h from now
};

// Who wins when two bookings clash (bigger number wins) - meeting minutes 2.11
const PRIORITY = { STUDENT: 1, STAFF: 2, TEACHER: 2 };

// May "myRole" take a slot that "otherRole" has already booked?
// Yes only if my role is higher AND the slot starts more than 24 hours from now.
function canTakeOver(myRole, otherRole, bookingDate, startTime) {
  const start = new Date(`${bookingDate}T${startTime}`);
  const limit = new Date(Date.now() + RULES.replaceAfterHours * 60 * 60 * 1000);
  return PRIORITY[myRole] > PRIORITY[otherRole] && start > limit;
}

module.exports = { RULES, PRIORITY, canTakeOver };
