/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.json',
    }],
    'node_modules/uuid/.+\\.js$': ['ts-jest', {
      tsconfig: './tsconfig.json',
      useESM: false,
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globalSetup: '<rootDir>/jest.setup.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setupAfterEnv.js'],
  transformIgnorePatterns: [
    '/node_modules/(?!uuid)',
  ],
  testTimeout: 30000,
  rootDir: '.',
};

module.exports = config; 