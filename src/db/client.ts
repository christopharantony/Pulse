import 'server-only';
import { MongoClient, type Db, type Collection } from 'mongodb';
import { serverEnv } from '@/lib/env.server';
import type { User } from '@/types/user';
import type { Session } from '@/types/session';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(serverEnv.MONGODB_URI);
  return client.connect();
}

// Lazily created on first use (not at module import time) so merely importing this module —
// e.g. when Next.js collects route data at build time — never triggers a real DB connection.
let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === 'development') {
    // Reuse the connection across Next.js dev HMR reloads.
    global._mongoClientPromise ??= createClientPromise();
    return global._mongoClientPromise;
  }
  clientPromise ??= createClientPromise();
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(serverEnv.DATABASE_NAME);
}

export async function getUsersCollection(): Promise<Collection<User>> {
  const db = await getDb();
  return db.collection<User>('users');
}

export async function getSessionsCollection(): Promise<Collection<Session>> {
  const db = await getDb();
  return db.collection<Session>('sessions');
}

export async function ensureIndexes(): Promise<void> {
  const users = await getUsersCollection();
  const sessions = await getSessionsCollection();

  await users.createIndex({ email: 1 }, { unique: true });
  // Extension point: once OAuth is added, index { provider: 1, providerId: 1 } unique + sparse.

  await sessions.createIndex({ refreshTokenHash: 1 }, { unique: true });
  await sessions.createIndex({ userId: 1 });
  // TTL index: Mongo auto-deletes a session doc once its expiresAt is in the past.
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
