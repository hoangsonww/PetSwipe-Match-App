// a factory so individual tests can swap implementations
function freshRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    findByIds: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v) => v),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoin: () => ({
        where: () => ({
          orderBy: () => ({ getMany: jest.fn().mockResolvedValue([]) }),
        }),
      }),
      where: () => ({ getMany: jest.fn().mockResolvedValue([]) }),
      orderBy: () => ({ getMany: jest.fn().mockResolvedValue([]) }),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };
}
global.__repo = freshRepo;

// Data-source stub
jest.mock("./src/index", () => ({
  AppDataSource: {
    getRepository: () => global.__repo,
  },
}));

// Crypto, JWT & misc utils
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-pw"),
  compare: jest.fn().mockResolvedValue(true),
}));
jest.mock("./src/utils/jwt", () => ({
  generateToken: jest.fn().mockReturnValue("mock-token"),
}));
jest.mock("./src/utils/assignmentHelper", () => ({
  assignPetsToUser: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("./src/utils/chatWithPetswipeAI", () => ({
  chatWithPetswipeAI: jest.fn().mockResolvedValue("🐶 Hello human!"),
}));
jest.mock("./src/utils/supabase", () => ({
  uploadPetPic: jest.fn().mockResolvedValue("https://cdn/pet.jpg"),
  uploadAvatar: jest.fn().mockResolvedValue("https://cdn/avatar.jpg"),
}));
jest.mock("./src/utils/csv", () => ({
  sendCsv: jest.fn((res) => res.send("id,name\n")),
}));

// keep test output clean
jest.spyOn(console, "error").mockImplementation(() => {});
jest.spyOn(console, "log").mockImplementation(() => {});
