import path from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

// Monorepo: load root .env (apps/web/src/tests -> ../../../)
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local'), override: true });

let mongoServer: MongoMemoryServer | null = null;

beforeAll(async () => {
  // Set a fallback JWT_SECRET for tests
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

  try {
    // Check if there's an existing connection
    if (mongoose.connection.readyState === 1) {
      console.log('Using existing MongoDB connection for tests');
      return;
    }

    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'tDarts_test',
      },
    });
    process.env.MONGO_URI = mongoServer.getUri();
    process.env.MONGODB_URI = process.env.MONGO_URI;
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected for tests');
  } catch (error) {
    console.error('Failed to initialize MongoMemoryServer:', error);
    throw new Error('Failed to set up test database');
  }
}, 15000);

afterAll(async () => {
  try {
    // Clear telemetry debounce timer and in-process SSE bus listeners so Jest can exit
    // (otherwise "Jest did not exit" until the GitHub job hits its global timeout).
    const [{ ApiTelemetryService }, { eventEmitter }] = await Promise.all([
      import('@tdarts/services'),
      import('@tdarts/core'),
    ]);
    ApiTelemetryService.reset();
    eventEmitter.removeAllListeners();
  } catch (error) {
    console.error('Test runtime cleanup (telemetry / event bus):', error);
  }

  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
      console.log('MongoMemoryServer stopped');
    }
  } catch (error) {
    console.error('Error during MongoDB cleanup:', error);
  }
});