// tests/database.test.js
const pool = require("../config/database");

describe("Database Connection", () => {
  it("should connect to the database successfully", async () => {
    const client = await pool.connect();
    expect(client).not.toBeNull();
    client.release();
  });

  afterAll(() => {
    pool.end();
  });
});
