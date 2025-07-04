/* global jest, describe, test, expect */

/* ---------- light-weight req / res stubs ---------- */
function mockReqRes(headers = {}) {
  const jsonSpy   = jest.fn();
  const res = {
    statusCode : 200,
    status     : jest.fn(function (c) { this.statusCode = c; return this; }),
    json       : jest.fn(function (payload) {                     // capture body
      jsonSpy(payload);
      this.__body = payload;
      return this;
    }),
    header     : jest.fn(),
    cookie     : jest.fn(),
    clearCookie: jest.fn(),
  };
  const req = {
    headers: Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
    ),
    get(key) { return this.headers[key.toLowerCase()]; },
    user: undefined,
  };
  return { req, res, jsonSpy };
}

/* ---------- local mocks ---------- */
// verifyToken → deterministic userId when token === "good.token"
jest.mock('../src/utils/jwt', () => ({
  verifyToken: jest.fn((tok) => {
    if (tok === 'good.token') return { userId: 'u123' };
    throw new Error('bad jwt');
  }),
}));

// mock TypeORM datasource / repository
jest.mock('../src/index', () => ({
  AppDataSource: {
    getRepository: () => ({
      findOneBy: ({ id }) =>
        id === 'u123' ? { id, email: 'ok@test.com' } : null,
    }),
  },
}));

/* ---------- modules under test ---------- */
const { authMiddleware } = require('../src/middlewares/auth');
const { errorHandler   } = require('../src/middlewares/errorHandler');

/* ---------- helpers ---------- */
async function runAuth(headers) {
  const { req, res } = mockReqRes(headers);
  const next = jest.fn();
  await authMiddleware(req, res, next);
  return { req, res, next };
}

/* ---------- tests ---------- */
describe('authMiddleware', () => {
  test('rejects when no token present', async () => {
    const { res, next } = await runAuth();
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(res.__body.message).toMatch(/no token/i);
  });

  test('rejects when token invalid', async () => {
    const { res, next } = await runAuth({ Authorization: 'Bearer bad.token' });
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(res.__body.message).toMatch(/invalid/i);
  });

  test('rejects when user id not found', async () => {
    // temporarily alter verifyToken mock
    const { verifyToken } = require('../src/utils/jwt');
    verifyToken.mockReturnValueOnce({ userId: 'missing' });

    const { res } = await runAuth({ Authorization: 'Bearer good.token' });
    expect(res.statusCode).toBe(401);
    expect(res.__body.message).toMatch(/user not found/i);
  });

  test('passes request & sets req.user when token valid', async () => {
    const { req, next } = await runAuth({ Authorization: 'Bearer good.token' });
    expect(req.user).toEqual({ id: 'u123', email: 'ok@test.com' });
    expect(next).toHaveBeenCalled();
  });
});

describe('errorHandler', () => {
  test('formats unknown errors to 500', () => {
    const { req, res } = mockReqRes();
    const next = jest.fn();

    errorHandler(new Error('boom'), req, res, next);
    expect(res.statusCode).toBe(500);
    expect(res.__body.message).toBe('boom');
  });

  test('supports explicit status codes', () => {
    const err = new Error('nope');
    err.status = 404;
    const { req, res } = mockReqRes();

    errorHandler(err, req, res, jest.fn());
    expect(res.statusCode).toBe(404);
    expect(res.__body.message).toBe('nope');
  });
});
