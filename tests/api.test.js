// tests/api.test.js
const request = require("supertest");
const express = require("express");
const apiRoutes = require("../routes/api");
const pool = require("../config/database");

const app = express();
app.use("/api", apiRoutes);

jest.mock("../config/database", () => {
  const { Pool } = require("pg");
  const pool = new Pool();
  pool.query = jest.fn();
  return pool;
});

describe("API Endpoints", () => {
  afterAll(() => {
    pool.end();
  });

  it("should return all names from points_of_interest", async () => {
    const mockNames = [{ name: "Building 1" }, { name: "Building 2" }];
    pool.query.mockResolvedValue({ rows: mockNames });

    const res = await request(app).get("/api/names");
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockNames);
  });

  it("should handle database errors gracefully", async () => {
    pool.query.mockRejectedValue(new Error("Database error"));

    const res = await request(app).get("/api/names");
    expect(res.statusCode).toEqual(500);
    expect(res.body).toEqual({ error: "Internal Server Error" });
  });
});
