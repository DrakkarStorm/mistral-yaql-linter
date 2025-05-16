const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest',
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
        // Configuration ts-jest
        tsconfig: 'tsconfig.json',
      },
    ], ...tsJestTransformCfg,
  },
};