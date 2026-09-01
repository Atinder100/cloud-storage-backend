const request = require("supertest");
const app = require("../server");
const pool = require("../src/config/db");

describe("Health API", () => {
  test("GET /api/health should return database status", async () => {
    const response = await request(app)
      .get("/api/health");

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("database", "connected");
    expect(response.body).toHaveProperty("time");
  });

  afterAll(async () => {
    await pool.end();
  });
});