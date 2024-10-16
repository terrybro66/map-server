const express = require("express");
const cors = require("cors");
const app = express();
const pool = require("./config/database.js");

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

const port = process.env.PORT || 5001;
app.listen(port, () => console.log(`Server is running on port ${port}`));
