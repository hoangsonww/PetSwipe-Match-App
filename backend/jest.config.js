/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest', // transpile the *.ts controllers on-the-fly
  testEnvironment: 'node',
  verbose: true,
  setupFiles: ['<rootDir>/jest.setup.js'],
  roots: ['<rootDir>/tests'],
};
