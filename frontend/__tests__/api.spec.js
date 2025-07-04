/* global describe, test, expect, beforeEach, jest */
process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'; // baseURL under test

/* ---------- axios mock -------------------------------------------------- */
const mockPost = jest.fn();
const mockGet  = jest.fn();
const mockPut  = jest.fn();

let reqInterceptor;
let resInterceptor;

jest.mock('axios', () => {
  const inst = {
    post: mockPost,
    get : mockGet,
    put : mockPut,
    // request / response interceptors just stash the callbacks
    interceptors: {
      request : { use: (fn) => (reqInterceptor = fn) },
      response: { use: (fn) => (resInterceptor = fn) },
    },
  };
  return {
    default: { create: jest.fn(() => inst) },
    create : jest.fn(() => inst),
  };
});

/* ---------- import AFTER mocks are in place ---------------------------- */
const {
  api,
  authApi,
  petApi,
  userApi,
  matchApi,
  swipeApi,
} = require('../lib/api');

/* ---------- helpers ---------------------------------------------------- */
beforeEach(() => {
  mockPost.mockReset().mockResolvedValue({ data: {}, headers: {} });
  mockGet .mockReset().mockResolvedValue({ data: [] });
  mockPut .mockReset().mockResolvedValue({ data: {} });
  localStorage.clear();
});

/* ---------- tests ------------------------------------------------------ */
describe('axios instance', () => {
  test('is configured with baseURL & credentials', () => {
    // axios.create is called once in module body
    const { create } = require('axios');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://api.example.com',
        withCredentials: true,
      }),
    );
  });

  test('request interceptor adds Bearer token', () => {
    localStorage.setItem('jwt', 'my.jwt.token');
    const cfg = { headers: {} };
    const out = reqInterceptor(cfg); // simulate axios internals
    expect(out.headers.Authorization).toBe('Bearer my.jwt.token');
  });

  test('response interceptor stores new token', () => {
    const res = { headers: { authorization: 'Bearer new.jwt' }, data: {} };
    resInterceptor(res);
    expect(localStorage.getItem('jwt')).toBe('new.jwt');
  });
});

describe('authApi helpers', () => {
  test('signup POSTs to /auth/signup & persists token', async () => {
    mockPost.mockResolvedValueOnce({ data: { token: 'fresh.jwt' }, headers: {} });
    await authApi.signup({ email: 'x@y.z', password: 'pw' });

    expect(mockPost).toHaveBeenCalledWith('/auth/signup', {
      email: 'x@y.z',
      password: 'pw',
    });
    expect(localStorage.getItem('jwt')).toBe('fresh.jwt');
  });

  test('logout clears localStorage token', async () => {
    localStorage.setItem('jwt', 'old.jwt');
    await authApi.logout();
    expect(localStorage.getItem('jwt')).toBeNull();
    expect(mockPost).toHaveBeenCalledWith('/auth/logout');
  });
});

describe('other API surfaces – smoke checks', () => {
  test('petApi.listPets GETs /pets', async () => {
    await petApi.listPets();
    expect(mockGet).toHaveBeenCalledWith('/pets');
  });

  test('userApi.getProfile GETs /users/me', async () => {
    await userApi.getProfile();
    expect(mockGet).toHaveBeenCalledWith('/users/me');
  });

  test('matchApi.listMatches GETs /matches', async () => {
    await matchApi.listMatches();
    expect(mockGet).toHaveBeenCalledWith('/matches');
  });

  test('swipeApi.recordSwipe POSTs body & echoes result', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'swipe1' }, headers: {} });
    const out = await swipeApi.recordSwipe('pet-1', true);
    expect(mockPost).toHaveBeenCalledWith('/swipes', { petId: 'pet-1', liked: true });
    expect(out).toEqual({ id: 'swipe1' });
  });
});
