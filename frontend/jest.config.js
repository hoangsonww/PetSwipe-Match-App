/** @type {import('jest').Config} */
module.exports = {
  // jsdom gives us window, localStorage, FormData, etc.
  testEnvironment: "jsdom",
  watchman: false,

  // transpile *.ts / *.tsx on-the-fly
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },

  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  testMatch: ["**/__tests__/**/*.spec.[jt]s?(x)"],
  // completely silent test run – keep the CI log clean
  verbose: false,
};
