module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: [
      '<rootDir>/__tests__/**/*.{test,spec}.ts', // Matches __tests__/tournament.test.ts
      '<rootDir>/**/*.{test,spec}.ts',          // Matches any test file in the project
    ],
  };