// src/server.js  -  START HERE
// Loads the settings, sets up Express, connects the routes and starts the server.

const path = require('path');

// Read backend/.env before anything else
const env = require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
if (env.error) {
  console.error('No .env file found in the backend folder.');
  console.error('Create it first:  copy .env.example .env   (macOS/Linux: cp .env.example .env)');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
const { errorHandler } = require('./middleware');

const app = express();
app.use(cors());           // allow the frontend to call this API
app.use(express.json());   // read JSON request bodies
app.use((req, res, next) => { req.body = req.body || {}; next(); }); // requests without a body

// ---- Frontend: serve the HTML/CSS/JS files in the /frontend folder ----
// Open http://localhost:3000 in the browser to use the website.
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// ---- Routes ----
app.get('/api', (req, res) => res.json({
  message: 'This is the API. Open the website at / instead.',
  website: '/',
  health: '/api/health',
}));
app.get('/api/health', (req, res) => res.json({ message: 'API is running' }));
app.use('/api/auth', require('./routes/auth').router);      // login, my account
app.use('/api/facilities', require('./routes/facilities')); // browse rooms
app.use('/api/bookings', require('./routes/bookings'));     // book, my bookings, cancel
app.use('/api/admin', require('./routes/admin'));           // admin only

// Unknown URL
app.use((req, res) => {
  res.status(404).json({ message: `Not found: ${req.method} ${req.originalUrl}` });
});

// Error handler must be the LAST app.use()
app.use(errorHandler);

// ---- Start: check the database first, then listen ----
const PORT = process.env.PORT || 3000;

pool.query('SELECT 1')
  .then(() => {
    console.log('Connected to MySQL');
    app.listen(PORT, () => {
      console.log(`Website:  http://localhost:${PORT}`);
      console.log(`API:      http://localhost:${PORT}/api`);
    });
  })
  .catch((err) => {
    console.error('Cannot connect to MySQL:', err.message);
    console.error(`(trying ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}, database ${process.env.DB_NAME})`);

    // Tips for the most common problems
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('-> Wrong DB_USER or DB_PASSWORD in .env.');
      console.error('   Use the same password you type to log in to MySQL Workbench, then SAVE .env (Ctrl+S).');
      console.error('   XAMPP: root has no password, so leave it empty:  DB_PASSWORD=');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('-> MySQL is not running. Start the MySQL80 service (or MySQL in XAMPP).');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('-> The database does not exist yet. Run database/01_create_database.sql first.');
    }
    console.error('After fixing .env, save it: the server restarts by itself.');
    process.exit(1);
  });
