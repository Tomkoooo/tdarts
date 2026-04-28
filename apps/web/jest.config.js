const sharedMapper = {
  '^@tdarts/core/subscription-paywall$':
    '<rootDir>/../../packages/core/src/lib/subscription-paywall.ts',
  '^@tdarts/core/subscription-tiers$':
    '<rootDir>/../../packages/core/src/lib/subscription-tiers.ts',
  '^@tdarts/core$': '<rootDir>/../../packages/core/src/index.ts',
  '^@tdarts/services$': '<rootDir>/../../packages/services/src/index.ts',
  '^@/database/services/(.*)$': '<rootDir>/../../packages/services/src/$1',
  '^@/database/models/(.*)$': '<rootDir>/../../packages/core/src/models/$1',
  '^@/interface/(.*)$': '<rootDir>/../../packages/core/src/interfaces/$1',
  '^@/lib/mongoose$': '<rootDir>/../../packages/core/src/lib/mongoose.ts',
  '^@/lib/mailer$': '<rootDir>/../../packages/core/src/lib/mailer.ts',
  '^@/lib/email-layout$': '<rootDir>/../../packages/core/src/lib/email-layout.ts',
  '^@/lib/email-resend$': '<rootDir>/../../packages/core/src/lib/email-resend.ts',
  '^@/lib/events$': '<rootDir>/../../packages/core/src/lib/events.ts',
  '^@/lib/date-time$': '<rootDir>/../../packages/core/src/lib/date-time.ts',
  '^@/lib/club-location-completeness$':
    '<rootDir>/../../packages/core/src/lib/club-location-completeness.ts',
  '^@/lib/leaguePointSystems$': '<rootDir>/../../packages/core/src/lib/leaguePointSystems.ts',
  '^@/lib/utils$': '<rootDir>/../../packages/core/src/lib/utils.ts',
  '^@/middleware/errorHandle$': '<rootDir>/src/middleware/errorHandle.ts',
  '^@/(.*)$': '<rootDir>/src/$1',
};

module.exports = {
  testTimeout: 15000,
  modulePathIgnorePatterns: ['<rootDir>/.next/standalone'],
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
      testMatch: ['<rootDir>/src/tests/**/*.test.ts', '<rootDir>/src/tests/**/*.test.tsx'],
      testPathIgnorePatterns: ['<rootDir>/src/tests/realtime/useRealTimeUpdates.test.tsx'],
      moduleNameMapper: sharedMapper,
    },
    {
      displayName: 'jsdom',
      preset: 'ts-jest',
      testEnvironment: 'jest-environment-jsdom',
      roots: ['<rootDir>/src'],
      setupFilesAfterEnv: [],
      testMatch: ['<rootDir>/src/tests/realtime/useRealTimeUpdates.test.tsx'],
      moduleNameMapper: sharedMapper,
    },
  ],
};
