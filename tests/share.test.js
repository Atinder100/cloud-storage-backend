const request = require("supertest");
const app = require("../server");
const pool = require("../src/config/db");

describe("Sharing API", () => {
  let ownerToken;
  let ownerId;

  let granteeToken;
  let granteeId;

  let fileId;
  let shareId;

  const ownerEmail = `jest_share_owner_${Date.now()}@example.com`;
  const granteeEmail = `jest_share_grantee_${Date.now()}@example.com`;

  const password = "TestPassword123!";

  beforeAll(async () => {
    // Create owner user
    const ownerSignup = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Jest Share Owner",
        email: ownerEmail,
        password,
      });

    expect(ownerSignup.statusCode).toBe(201);

    ownerToken = ownerSignup.body.token;
    ownerId = ownerSignup.body.user.id;

    // Create grantee user
    const granteeSignup = await request(app)
      .post("/api/auth/signup")
      .send({
        name: "Jest Share Grantee",
        email: granteeEmail,
        password,
      });

    expect(granteeSignup.statusCode).toBe(201);

    granteeToken = granteeSignup.body.token;
    granteeId = granteeSignup.body.user.id;

    // Create a test file directly in PostgreSQL.
    // This avoids uploading a real file to Supabase.
    const fileResult = await pool.query(
      `INSERT INTO files (
        name,
        mime_type,
        size_bytes,
        storage_key,
        owner_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [
        "Jest Share Test File.txt",
        "text/plain",
        100,
        `jest-share-${Date.now()}.txt`,
        ownerId,
      ]
    );

    fileId = fileResult.rows[0].id;
  });

  afterAll(async () => {
    // Delete shares created during tests
    if (shareId) {
      await pool.query(
        "DELETE FROM shares WHERE id = $1",
        [shareId]
      );
    }

    // Delete test file
    if (fileId) {
      await pool.query(
        "DELETE FROM files WHERE id = $1",
        [fileId]
      );
    }

    // Delete test users
    await pool.query(
      "DELETE FROM users WHERE id IN ($1, $2)",
      [ownerId, granteeId]
    );

    await pool.end();
  });

  test("POST /api/shares should share a file with another user", async () => {
    const response = await request(app)
      .post("/api/shares")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        resourceId: fileId,
        resourceType: "file",
        granteeUserId: granteeId,
        role: "viewer",
      });

    expect(response.statusCode).toBe(201);

    expect(response.body).toHaveProperty(
      "message",
      "Resource shared successfully"
    );

    expect(response.body).toHaveProperty("share");
    expect(response.body).toHaveProperty("user");

    expect(response.body.share).toHaveProperty(
      "resource_id",
      fileId
    );

    expect(response.body.share).toHaveProperty(
      "grantee_user_id",
      granteeId
    );

    expect(response.body.share).toHaveProperty(
      "role",
      "viewer"
    );

    shareId = response.body.share.id;
  });

  test("POST /api/shares should update an existing share instead of creating a duplicate", async () => {
    const response = await request(app)
      .post("/api/shares")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        resourceId: fileId,
        resourceType: "file",
        granteeUserId: granteeId,
        role: "editor",
      });

    expect(response.statusCode).toBe(201);

    expect(response.body.share).toHaveProperty(
      "id",
      shareId
    );

    expect(response.body.share).toHaveProperty(
      "role",
      "editor"
    );
  });

  test("POST /api/shares should reject sharing with yourself", async () => {
    const response = await request(app)
      .post("/api/shares")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        resourceId: fileId,
        resourceType: "file",
        granteeUserId: ownerId,
        role: "viewer",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toHaveProperty(
      "message",
      "You cannot share a resource with yourself"
    );
  });

  test("POST /api/shares should reject an invalid role", async () => {
    const response = await request(app)
      .post("/api/shares")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        resourceId: fileId,
        resourceType: "file",
        granteeUserId: granteeId,
        role: "admin",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toHaveProperty(
      "message",
      "Invalid role"
    );
  });

  test("POST /api/shares should reject an invalid resource type", async () => {
    const response = await request(app)
      .post("/api/shares")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        resourceId: fileId,
        resourceType: "invalid",
        granteeUserId: granteeId,
        role: "viewer",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toHaveProperty(
      "message",
      "Invalid resource type"
    );
  });

  test("POST /api/shares should reject a missing resource ID", async () => {
    const response = await request(app)
      .post("/api/shares")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        resourceType: "file",
        granteeUserId: granteeId,
        role: "viewer",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toHaveProperty(
      "message",
      "Resource ID and grantee user ID are required"
    );
  });

  test("POST /api/shares should reject a nonexistent target user", async () => {
    const response = await request(app)
      .post("/api/shares")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        resourceId: fileId,
        resourceType: "file",
        granteeUserId: "00000000-0000-0000-0000-000000000000",
        role: "viewer",
      });

    expect(response.statusCode).toBe(404);

    expect(response.body).toHaveProperty(
      "message",
      "User to share with not found"
    );
  });

  test("POST /api/shares should reject unauthenticated requests", async () => {
    const response = await request(app)
      .post("/api/shares")
      .send({
        resourceId: fileId,
        resourceType: "file",
        granteeUserId: granteeId,
        role: "viewer",
      });

    expect(response.statusCode).toBe(401);
  });

  test("POST /api/shares/link should create a shareable link", async () => {
    const response = await request(app)
      .post("/api/shares/link")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        resourceId: fileId,
        resourceType: "file",
        role: "viewer",
      });

    expect(response.statusCode).toBe(201);

    expect(response.body).toHaveProperty(
      "message",
      "Shareable link created successfully"
    );

    expect(response.body).toHaveProperty("share");
    expect(response.body).toHaveProperty("shareUrl");

    expect(response.body.share).toHaveProperty(
      "resource_id",
      fileId
    );

    expect(response.body.share).toHaveProperty(
      "resource_type",
      "file"
    );

    expect(response.body.share).toHaveProperty(
      "role",
      "viewer"
    );

    expect(response.body.share.token).toBeTruthy();
    expect(response.body.shareUrl).toContain(
      response.body.share.token
    );
  });

  test("POST /api/shares/link should reject an invalid role", async () => {
    const response = await request(app)
      .post("/api/shares/link")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        resourceId: fileId,
        resourceType: "file",
        role: "admin",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body).toHaveProperty(
      "message",
      "Invalid role"
    );
  });

  test("POST /api/shares/link should reject a nonexistent resource", async () => {
    const response = await request(app)
      .post("/api/shares/link")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        resourceId: "00000000-0000-0000-0000-000000000000",
        resourceType: "file",
        role: "viewer",
      });

    expect(response.statusCode).toBe(404);

    expect(response.body).toHaveProperty(
      "message",
      "file not found"
    );
  });

  test("POST /api/shares/link should reject unauthenticated requests", async () => {
    const response = await request(app)
      .post("/api/shares/link")
      .send({
        resourceId: fileId,
        resourceType: "file",
        role: "viewer",
      });

    expect(response.statusCode).toBe(401);
  });
});