import { MongoClient, Db } from "mongodb";
import { appConfig } from "./env.js";

let client: MongoClient | null = null;
let db: Db | null = null;
export async function getDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(appConfig.mongoUri);
  await client.connect();
  db = client.db(appConfig.dbName);

  return db;
}
export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}