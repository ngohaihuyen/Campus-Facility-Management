// src/db.js
// Connects to MySQL and gives the rest of the app two helpers:
//
//   query(sql, params)
//     SELECT         -> returns an array of rows
//     INSERT/UPDATE  -> returns { insertId, affectedRows }
//
//   transaction(async (q) => { ... })
//     Runs several queries as ONE unit: if anything fails, nothing is saved.

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  namedPlaceholders: true, // write :name in SQL instead of ?
  dateStrings: true,       // dates come back as text, e.g. "2026-09-20"
});

async function query(sql, params = {}) {
  // Values are always sent separately from the SQL text. This prevents SQL injection.
  const [result] = await pool.query(sql, params);
  return result;
}

async function transaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();

    const q = async (sql, params = {}) => {
      const [result] = await connection.query(sql, params);
      return result;
    };
    const result = await work(q);

    await connection.commit();   // save everything
    return result;
  } catch (err) {
    await connection.rollback(); // undo everything
    throw err;
  } finally {
    connection.release();        // give the connection back to the pool
  }
}

module.exports = { pool, query, transaction };
