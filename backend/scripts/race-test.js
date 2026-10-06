// scripts/race-test.js
// Sends 10 booking requests for the SAME room and time at the SAME moment.
// Correct result: exactly 1 request succeeds (201) and 9 are refused (409).
// Run it while the server is running:   npm run test:race

const API = 'http://localhost:3000/api';

async function login(email) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password@123' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed for ${email}: ${data.message}`);
  return data.token;
}

async function main() {
  const tokens = [
    await login('antt2410071@usth.edu.vn'),
    await login('binhlm2410072@usth.edu.vn'),
  ];

  // The day 5 days from today, as "YYYY-MM-DD"
  const d = new Date();
  d.setDate(d.getDate() + 5);
  const bookingDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Create 10 requests and send them all at once
  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push(fetch(`${API}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[i % 2]}` },
      body: JSON.stringify({
        facilityId: 2,
        bookingDate,
        startTime: '15:01',   // one 30-minute slot
        endTime: '15:30',
        purpose: `Race test request number ${i + 1}`,
      }),
    }));
  }
  const responses = await Promise.all(requests);

  const codes = responses.map((r) => r.status);
  console.log('Status codes:', codes.join(' '));
  const saved = codes.filter((c) => c === 201).length;
  console.log(saved === 1 ? 'PASS: only one booking was saved' : `FAIL: ${saved} bookings were saved`);
  console.log(`(Before running again, cancel or delete the booking for room 2 on ${bookingDate}.)`);
}

main().catch((err) => console.error(err.message));
