import { MongoClient, Db } from 'mongodb';

interface MongoClientCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

// Cache the MongoDB client across hot-reloads in development
const globalWithMongo = global as typeof globalThis & {
  _mongoClientCache?: MongoClientCache;
};

if (!globalWithMongo._mongoClientCache) {
  globalWithMongo._mongoClientCache = { client: null, promise: null };
}

const cached = globalWithMongo._mongoClientCache;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  // Validate at call-time (not module load) so build doesn't fail without env vars
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? 'ai_chat';

  if (!uri) {
    throw new Error('MONGODB_URI is not defined. Add it to .env.local');
  }

  if (cached.client) {
    return { client: cached.client, db: cached.client.db(dbName) };
  }

  if (!cached.promise) {
    cached.promise = MongoClient.connect(uri, { maxPoolSize: 10 }).then((client) => {
      cached.client = client;
      return client;
    });
  }

  const client = await cached.promise;
  return { client, db: client.db(dbName) };
}
