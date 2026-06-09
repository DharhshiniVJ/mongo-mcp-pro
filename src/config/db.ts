import { MongoClient, Db } from "mongodb";
import { appConfig } from "./env.js";

const clients = new Map<string, MongoClient>();
const dbs = new Map<string, Db>();

export async function getDbForEnv(envName: string): Promise<Db> {
  const existingDb = dbs.get(envName);
  if (existingDb) return existingDb;

  const envConfig = appConfig.environments[envName];
  if (!envConfig) {
    throw new Error(`Environment '${envName}' is not defined in environments.yaml`);
  }

  const client = new MongoClient(envConfig.mongoUri);
  await client.connect();
  clients.set(envName, client);

  const db = client.db(envConfig.dbName);
  dbs.set(envName, db);

  return db;
}

export async function getDb(): Promise<Db> {
  return getDbForEnv(appConfig.default);
}

export async function closeDb(): Promise<void> {
  for (const client of clients.values()) {
    await client.close();
  }
  clients.clear();
  dbs.clear();
}