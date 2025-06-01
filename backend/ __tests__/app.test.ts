import request from "supertest";
import app from "../src/app";

describe("PetSwipe Backend", () => {
  it("GET /ping → returns { pong: true }", async () => {
    const res = await request(app).get("/ping");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pong: true });
  });

  it("GET /api-docs.json → returns valid OpenAPI JSON", async () => {
    const res = await request(app).get("/api-docs.json");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toHaveProperty("openapi", "3.0.0");
    expect(res.body.info).toHaveProperty("title", "PetSwipe API Documentation");
    expect(res.body).toHaveProperty("paths");
  });

  it("GET /docs → returns HTML containing Swagger UI", async () => {
    const res = await request(app).get("/docs");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/SwaggerUIBundle/);
    expect(res.text).toMatch(/<div id="swagger-ui"><\/div>/);
  });
});
