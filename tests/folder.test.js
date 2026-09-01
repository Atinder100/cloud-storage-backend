const request = require("supertest");
const app = require("../server");
const pool = require("../src/config/db");

describe("Folder API", () => {
  let token;
  let folderId;

  const testEmail = `jest_folder_${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";

  beforeAll(async () => {
    // Create a test user
    const signupResponse = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Jest Folder User",
        email: testEmail,
        password: testPassword,
      });

    expect(signupResponse.statusCode).toBe(201);

    token = signupResponse.body.token;
  });

  afterAll(async () => {
    // Delete test folder(s)
    await pool.query(
      "DELETE FROM folders WHERE owner_id = (SELECT id FROM users WHERE email = $1)",
      [testEmail]
    );

    // Delete test user
    await pool.query(
      "DELETE FROM users WHERE email = $1",
      [testEmail]
    );

    await pool.end();
  });

  test("POST /api/folders should create a folder", async () => {
    const response = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Jest Test Folder",
      });

    expect(response.statusCode).toBe(201);

    expect(response.body).toHaveProperty(
      "message",
      "Folder created successfully"
    );

    expect(response.body).toHaveProperty("folder");

    expect(response.body.folder).toHaveProperty(
      "name",
      "Jest Test Folder"
    );

    folderId = response.body.folder.id;
  });

  test("POST /api/folders should reject an empty folder name", async () => {
    const response = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toHaveProperty(
      "message",
      "Folder name is required"
    );
  });

  test("GET /api/folders should return root folders", async () => {
    const response = await request(app)
      .get("/api/folders")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty("folders");
    expect(Array.isArray(response.body.folders)).toBe(true);
  });

  test("GET /api/folders should reject unauthenticated requests", async () => {
    const response = await request(app)
      .get("/api/folders");

    expect(response.statusCode).toBe(401);
  });

  test("POST /api/folders should reject a nonexistent parent folder", async () => {
    const response = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Child Folder",
        parentId: "00000000-0000-0000-0000-000000000000",
      });

    expect(response.statusCode).toBe(404);

    expect(response.body).toHaveProperty(
      "message",
      "Parent folder not found"
    );
  });

  test("PATCH /api/folders/:id should rename the folder", async () => {
    const response = await request(app)
      .patch(`/api/folders/${folderId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Renamed Jest Folder",
      });

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty(
      "message",
      "Folder renamed successfully"
    );

    expect(response.body.folder).toHaveProperty(
      "name",
      "Renamed Jest Folder"
    );
  });

  test("PATCH /api/folders/:id should reject an empty folder name", async () => {
    const response = await request(app)
      .patch(`/api/folders/${folderId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toHaveProperty(
      "message",
      "Folder name is required"
    );
  });

  test("DELETE /api/folders/:id should move the folder to trash", async () => {
    const response = await request(app)
      .delete(`/api/folders/${folderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty(
      "message",
      "Folder moved to trash"
    );

    expect(response.body.folder).toHaveProperty(
      "is_deleted",
      true
    );
  });

  test("DELETE /api/folders/:id should return 404 for an already deleted folder", async () => {
    const response = await request(app)
      .delete(`/api/folders/${folderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);

    expect(response.body).toHaveProperty(
      "message",
      "Folder not found"
    );
  });
});