const request = require("supertest");
const app = require("../server");
const pool = require("../src/config/db");

describe("Authentication API", () => {
  const testEmail = `jest_test_${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";
  let token;

  afterAll(async () => {
    // Remove the test user
    await pool.query(
      "DELETE FROM users WHERE email = $1",
      [testEmail]
    );

    await pool.end();
  });

  test("POST /api/auth/signup should create a new user", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Jest Test User",
        email: testEmail,
        password: testPassword,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty(
      "message",
      "Signup successful"
    );
    expect(response.body).toHaveProperty("user");
    expect(response.body).toHaveProperty("token");

    token = response.body.token;
  });

  test("POST /api/auth/login should authenticate the user", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "Login successful"
    );
    expect(response.body).toHaveProperty("user");
    expect(response.body).toHaveProperty("token");

    token = response.body.token;
  });

  test("POST /api/auth/login should reject an incorrect password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: testEmail,
        password: "WrongPassword123!",
      });

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty(
      "message",
      "Invalid email or password"
    );
  });

  test("GET /api/auth/me should reject a request without a token", async () => {
    const response = await request(app)
      .get("/api/auth/me");

    expect(response.statusCode).toBe(401);
  });

  test("GET /api/auth/me should accept a valid token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "You are authenticated"
    );
    expect(response.body).toHaveProperty("user");
  });
});