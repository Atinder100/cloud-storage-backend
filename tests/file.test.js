const request = require("supertest");
const app = require("../server");
const pool = require("../src/config/db");

describe("File API", () => {
  let token;
  let fileId;
  const testEmail = `jest_file_${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";

  beforeAll(async () => {
    // Create a test user
    const signupResponse = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Jest File User",
        email: testEmail,
        password: testPassword,
      });

    expect(signupResponse.statusCode).toBe(201);

    token = signupResponse.body.token;
  });

  afterAll(async () => {
    // Delete test file if one was created
    if (fileId) {
      await pool.query(
        "DELETE FROM files WHERE id = $1",
        [fileId]
      );
    }

    // Delete test user
    await pool.query(
      "DELETE FROM users WHERE email = $1",
      [testEmail]
    );

    await pool.end();
  });

  test("GET /api/files should return paginated files", async () => {
    const response = await request(app)
      .get("/api/files?page=1&limit=10")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty("files");
    expect(response.body).toHaveProperty("pagination");

    expect(response.body.pagination).toHaveProperty("page", 1);
    expect(response.body.pagination).toHaveProperty("limit", 10);
    expect(response.body.pagination).toHaveProperty("total");
  });

  test("GET /api/files should reject unauthenticated requests", async () => {
    const response = await request(app)
      .get("/api/files");

    expect(response.statusCode).toBe(401);
  });

  test("GET /api/files/search should reject an empty search query", async () => {
    const response = await request(app)
      .get("/api/files/search")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(400);

    expect(response.body).toHaveProperty(
      "message",
      "Search query is required"
    );
  });

  test("PATCH /api/files/:id should reject unauthorized access", async () => {
    const response = await request(app)
      .patch("/api/files/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Renamed Test File",
      });

    expect(response.statusCode).toBe(403);
  });

  test("DELETE /api/files/:id should reject unauthorized access", async () => {
    const response = await request(app)
      .delete("/api/files/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
  });

  test("GET /api/files/:id/signed-url should reject unauthorized access", async () => {
    const response = await request(app)
      .get(
        "/api/files/00000000-0000-0000-0000-000000000000/signed-url"
      )
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);
  });
});