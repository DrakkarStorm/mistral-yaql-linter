/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  moduleNameMapper: {
    '^vscode$': '<rootDir>/test/__mocks__/vscode.ts'
  },
  roots: ['<rootDir>/test'],
  testEnvironment: "node",
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        // Configuration ts-jest
        tsconfig: 'tsconfig.json',
      },
    ],
  },
};