import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const cached: MongooseCache = (global as any).mongoose || { conn: null, promise: null };

if (!(global as any).mongoose) {
  (global as any).mongoose = cached;
}

export async function connectMongo() {
  if (cached.conn) {
    console.log('Using existing MongoDB connection');
    return cached.conn;
  }

  // Check if there's an active connection
  if (mongoose.connection.readyState === 1) {
    console.log('Reusing active MongoDB connection');
    cached.conn = mongoose;
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined');
    throw new Error('MONGODB_URI is not defined');
  }

  if (!cached.promise) {
    console.log('Connecting to:', process.env.MONGODB_URI);
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        dbName: process.env.MONGODB_DB_NAME || 'tdarts_v2_test',
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      .then((mongooseInstance) => {
        console.log('MongoDB connected via Mongoose');
        return mongooseInstance;
      })
      .catch((error) => {
        console.error('Mongoose connection error:', error);
        cached.conn = null;
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error('MongoDB connection failed:', error);
    throw new Error('Failed to connect to MongoDB');
  }
}