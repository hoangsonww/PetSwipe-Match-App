/* eslint-env jest */
/* global expect, jest, describe, test */

const { createMocks } = require("node-mocks-http");
const handler = require("../pages/api/chat-proxy").default;

/* ------------------------------------------------------------------ */
/* helper – create mocked Next req / res                              */
/* ------------------------------------------------------------------ */
function mockReqRes(opts = {}) {
  const { req, res } = createMocks({
    method: opts.method ?? "POST",
    url: "/api/chat",
    headers: opts.headers ?? {},
    body: opts.body ?? {},
  });
  return { req, res };
}

/* ------------------------------------------------------------------ */
/* tests                                                              */
/* ------------------------------------------------------------------ */
describe("pages/api/chat → proxy to backend", () => {
  afterEach(() => {
    jest.resetAllMocks();
    delete global.fetch; // remove our stub between tests
  });

  /* ---------- GET not allowed ---------- */
  test("responds 405 on non-POST", async () => {
    const { req, res } = mockReqRes({ method: "GET" });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getHeaders().allow).toBe("POST");
    expect(res._getData()).toBe("Method Not Allowed");
  });

  /* ---------- happy path proxy ---------- */
  test("forwards POST & pipes status / json back", async () => {
    /* stub `global.fetch` -> pretend backend replied 200 {reply:"ok"} */
    global.fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ reply: "ok" }),
      }),
    );

    const body = { message: "hi" };
    const { req, res } = mockReqRes({
      method: "POST",
      body,
      headers: { authorization: "Bearer test.jwt" },
    });
    await handler(req, res);

    /* upstream called with correct url, headers, body */
    expect(global.fetch).toHaveBeenCalledWith(
      "https://petswipe-backend-api.vercel.app/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test.jwt",
        }),
        body: JSON.stringify(body),
      }),
    );

    /* response piped back verbatim */
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ reply: "ok" });
  });

  /* ---------- upstream failure ---------- */
  test("returns 502 when backend unreachable", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("boom")));

    const { req, res } = mockReqRes({
      method: "POST",
      body: { message: "anything" },
      headers: { authorization: "" },
    });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(502);
    expect(res._getJSONData()).toEqual({
      message: "Failed to reach PetSwipe backend",
    });
  });
});
