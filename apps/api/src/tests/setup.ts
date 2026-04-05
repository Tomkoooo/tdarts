// Test environment setup for packages/api

// Tier 1 credentials for tests
process.env.API_MOBILE_CLIENT_ID = 'test-client-id';
process.env.API_MOBILE_CLIENT_SECRET = 'test-client-secret';
process.env.API_INTEGRATION_KEYS = 'test-integration-key';
process.env.API_DEV_BYPASS_SECRET = 'test-dev-bypass';

// Shared secrets
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long';
process.env.MONGODB_URI = 'mongodb://localhost:27017/tdarts_test';
process.env.NODE_ENV = 'test';

// Suppress telemetry in tests
process.env.DISABLE_API_TELEMETRY = 'true';
