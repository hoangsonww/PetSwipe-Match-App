const {
  signup,
  login,
  verifyEmail,
  logout,
} = require("../src/controllers/authController");
const { chatHandler } = require("../src/controllers/chatController");
const {
  assignPets,
  listMatches,
} = require("../src/controllers/matchController");
const { listPets, createPet } = require("../src/controllers/petController");
const {
  recordSwipe,
  listMySwipes,
} = require("../src/controllers/swipeController");
const {
  getProfile,
  uploadAvatarHandler,
} = require("../src/controllers/userController");
const {
  listMyJourneys,
  updateJourney,
  addTask: addJourneyTask,
  deleteTask: deleteJourneyTask,
} = require("../src/controllers/adoptionJourneyController");

// A tiny Express-like response mock
function resMock() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe("Controller sanity suite (JS)", () => {
  beforeEach(() => {
    // brand-new repo for every test
    global.__repo = {
      ...global.__repo, // base fns from jest.setup
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
    };
  });

  /* ---------- AUTH ---------- */

  test("signup → 201 & token cookie", async () => {
    global.__repo.findOne.mockResolvedValue(undefined); // email not in use
    const req = {
      body: { email: "x@y.z", password: "pw123" },
      secure: false,
      headers: {},
    };
    const res = resMock();
    await signup(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.cookie).toHaveBeenCalledWith(
      "token",
      "mock-token",
      expect.any(Object),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ token: "mock-token" }),
    );
  });

  test("login invalid creds → 400", async () => {
    global.__repo.findOne.mockResolvedValue({ password: "hashed-pw-in-db" });
    require("bcryptjs").compare.mockResolvedValue(false); // force invalid
    const req = { body: { email: "x@y.z", password: "bad" } };
    const res = resMock();
    await login(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("verifyEmail missing field → 400", async () => {
    const req = { body: {} };
    const res = resMock();
    await verifyEmail(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("logout clears cookie → 200", () => {
    const res = resMock();
    logout({}, res, () => {});
    expect(res.clearCookie).toHaveBeenCalledWith("token");
  });

  /* ---------- CHAT ---------- */

  test("chat unauthorized → 401", async () => {
    const req = { body: { message: "hi" } }; // no req.user
    const res = resMock();
    await chatHandler(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  /* ---------- MATCHES ---------- */

  test("assignPets missing params → 400", async () => {
    const req = { body: {} };
    const res = resMock();
    await assignPets(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("listMatches happy path → 200 array", async () => {
    global.__repo.find.mockResolvedValue([]);
    const res = resMock();
    await listMatches({}, res, () => {});
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
  });

  /* ---------- PETS ---------- */

  test("listPets (anonymous) returns array", async () => {
    global.__repo.find.mockResolvedValue([{ id: 1 }]);
    const res = resMock();
    await listPets({}, res, () => {});
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  test("createPet missing field → 400", async () => {
    const req = { body: { name: "Buddy" } }; // no type
    const res = resMock();
    await createPet(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  /* ---------- SWIPES ---------- */

  test("recordSwipe unauthenticated → 401", async () => {
    const req = { body: {}, user: undefined };
    const res = resMock();
    await recordSwipe(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("listMySwipes unauthorized → 401", async () => {
    const res = resMock();
    await listMySwipes({}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  /* ---------- USERS ---------- */

  test("getProfile w/out session → 401", () => {
    const res = resMock();
    getProfile({}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("uploadAvatar missing file → 400", async () => {
    const req = { user: {}, file: undefined };
    const res = resMock();
    await uploadAvatarHandler(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  /* ---------- ADOPTION JOURNEYS ---------- */

  test("listMyJourneys unauthorized → 401", async () => {
    const res = resMock();
    await listMyJourneys({}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("updateJourney invalid status → 400", async () => {
    const req = {
      user: { id: "user-123" },
      params: { journeyId: "journey-1" },
      body: { status: "NOT_REAL" },
    };
    const res = resMock();
    await updateJourney(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("addTask missing title → 400", async () => {
    const req = {
      user: { id: "user-123" },
      params: { journeyId: "journey-1" },
      body: {},
    };
    const res = resMock();
    await addJourneyTask(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("deleteTask unauthorized → 401", async () => {
    const res = resMock();
    await deleteJourneyTask({ params: {}, user: undefined }, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
