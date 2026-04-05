/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/trpc/routers/**/*.ts',
    'src/trpc/middleware/**/*.ts',
    'src/trpc/errors/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 70,
      functions: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    // Strip .js extensions for ts-jest (TS sources use .js in imports for ESM compatibility)
    '^(.*)\\.js$': '$1',
    // Workspace package paths (apps/api is 2 levels deep from repo root)
    '^@tdarts/core$': '<rootDir>/../../packages/core/src/index.ts',
    '^@tdarts/services$': '<rootDir>/../../packages/services/src/index.ts',
    '^@tdarts/schemas$': '<rootDir>/../../packages/schemas/src/index.ts',
    // ESM-only packages — mock superjson with a simple passthrough
    '^superjson$': '<rootDir>/src/tests/__mocks__/superjson.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
        diagnostics: { ignoreCodes: ['TS151001'] },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(superjson|@trpc)/)',
  ],
  setupFiles: ['<rootDir>/src/tests/setup.ts'],
};

module.exports = config;
