/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/__tests__/**/*.test.(ts|js)'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/security/**/*.ts',
    'src/modules/users/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
};
