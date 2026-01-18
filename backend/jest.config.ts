import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.spec.ts', '<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { target: 'ES2020', module: 'commonjs' } }],
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/core/security/**/*.ts',
    'src/core/validation/**/*.ts',
    'src/modules/user/domain/entities/**/*.ts',
    'src/modules/desks/**/*.ts',
    '!**/*.spec.ts',
  ],
  coverageDirectory: '<rootDir>/coverage-unit',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

export default config;
