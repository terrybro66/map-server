// routes/api.js
const express = require("express");
const router = express.Router();
const pool = require("../config/database");

router.get("/pos", async (req, res) => {
  try {
    const result = await pool.query(`
        SELECT name, ST_AsText(location) AS location
        FROM points_of_interest
      `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = router;
