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

router.get("/buildings", async (req, res) => {
  const { cameraLat, cameraLng } = req.query;
  try {
    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=[out:json];(way["building"](around:1200,${cameraLat},${cameraLng}););out body;>;out skel qt;`
    );
    const data = await response.json();

    const buildings = data.elements
      .filter((el) => el.type === "way")
      .map((way) => {
        const coordinates = way.nodes.map((id) => {
          const node = data.elements.find(
            (el) => el.type === "node" && el.id === id
          );
          return [node.lon, node.lat];
        });

        if (
          coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
          coordinates[0][1] !== coordinates[coordinates.length - 1][1]
        ) {
          coordinates.push(coordinates[0]);
        }

        const name = way.tags["name"] || "Unknown"; // Extract the name tag, default to 'Unknown' if not present
        const height = way.tags["building:levels"]
          ? parseInt(way.tags["building:levels"], 10) * 3
          : 10; // 10 meters or 3 meters per level

        return {
          name,
          polygon: coordinates,
          height,
        };
      });

    res.json(buildings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = router;
