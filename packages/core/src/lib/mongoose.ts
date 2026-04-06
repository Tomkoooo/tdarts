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
    return cached.conn;
  }

  // Check if there's an active connection
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined');
    throw new Error('MONGODB_URI is not defined');
  }

  if (!cached.promise) {
    const isLoadTest = process.env.LOAD_TEST_MODE === 'true';
    const isDev = process.env.NODE_ENV !== 'production' && !isLoadTest;
    const maxPoolSize = Number(process.env.MONGO_MAX_POOL_SIZE ?? (isLoadTest ? 200 : isDev ? 40 : 75));
    const minPoolSize = Number(process.env.MONGO_MIN_POOL_SIZE ?? (isLoadTest ? 30 : isDev ? 1 : 20));
    const maxConnecting = Number(process.env.MONGO_MAX_CONNECTING ?? (isLoadTest ? 30 : 10));
    const waitQueueTimeoutMS = Number(process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS ?? (isLoadTest ? 60000 : 15000));
    const serverSelectionTimeoutMS = Number(
      process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ?? (isLoadTest ? 10000 : 5000)
    );
    const socketTimeoutMS = Number(process.env.MONGO_SOCKET_TIMEOUT_MS ?? (isLoadTest ? 120000 : 45000));

    if (isLoadTest) {
      console.log(
        `[mongo] load-test pool config: maxPoolSize=${maxPoolSize}, minPoolSize=${minPoolSize}, maxConnecting=${maxConnecting}, waitQueueTimeoutMS=${waitQueueTimeoutMS}, serverSelectionTimeoutMS=${serverSelectionTimeoutMS}, socketTimeoutMS=${socketTimeoutMS}`
      );
    }

    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        dbName: process.env.MONGODB_DB_NAME || 'tdarts_v2_test',
        maxPoolSize,
        minPoolSize,
        maxConnecting,
        waitQueueTimeoutMS,
        serverSelectionTimeoutMS,
        socketTimeoutMS,
      })
      .then((mongooseInstance) => mongooseInstance)
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
