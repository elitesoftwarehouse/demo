import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.tsx', '<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.tsx', '<rootDir>/src/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { target: 'ES2020', module: 'commonjs', jsx: 'react-jsx' } }],
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
};

export default config;
