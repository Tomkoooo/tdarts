import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI_ATLAS!;
const client = new MongoClient(uri);

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to ensure a single instance.
  let globalClient = global as any;
  if (!globalClient._mongoClientPromise) {
    globalClient._mongoClientPromise = client.connect();
  }
  clientPromise = globalClient._mongoClientPromise;
} else {
  // In production mode, use a normal promise.
  clientPromise = client.connect();
}

export default clientPromise;