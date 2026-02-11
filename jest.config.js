/** @type {import('jest').Config} */
module.exports = {
  // Point preset to backend's ts-jest since dependencies are installed there
  preset: '<rootDir>/backend/node_modules/ts-jest',
  testEnvironment: 'node',
  transform: {
    // Use frontend tsconfig (with JSX) for TSX files
    '^.+\\.tsx$': [
      '<rootDir>/backend/node_modules/ts-jest',
      { tsconfig: 'frontend/tsconfig.json' },
    ],
    // Use backend tsconfig for plain TS files (backend code/tests)
    '^.+\\.ts$': [
      '<rootDir>/backend/node_modules/ts-jest',
      { tsconfig: 'backend/tsconfig.json' },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Resolve modules also from backend/node_modules where devDependencies are installed
  moduleDirectories: ['node_modules', '<rootDir>/backend/node_modules'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  roots: ['<rootDir>/backend/src', '<rootDir>/frontend/src'],
  clearMocks: true,
};
