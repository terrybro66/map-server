require("dotenv").config(); // Load environment variables from .env file
const express = require("express");
const cors = require("cors");
const app = express();
const pool = require("./config/database.js");
const apiRoutes = require("./routes/api");

app.use(express.json());
app.use(
  cors({
    origin: "https://datakraft.co.uk",
  })
);

app.use("/api", apiRoutes);

const port = process.env.PORT || 5001;
const host = "0.0.0.0"; // Bind to 0.0.0.0 to accept connections from any IP address

app.listen(port, host, () =>
  console.log(`Server is running on http://${host}:${port}`)
);
