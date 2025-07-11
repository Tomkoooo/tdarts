import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

// Load .env file
dotenv.config({ path: '<rootDir>/.env' });

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
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
      console.log('MongoMemoryServer stopped');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
});