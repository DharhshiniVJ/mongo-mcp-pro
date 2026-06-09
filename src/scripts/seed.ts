import { getDbForEnv, closeDb } from "../config/db.js";
import { logger } from "../observability/logger.js";

async function seed() {
  logger.info("Starting database seeding...");

  try {
    // 1. Seed Staging
    logger.info("Connecting to staging environment...");
    const stagingDb = await getDbForEnv("staging");
    const stagingCol = stagingDb.collection("users");
    
    logger.info("Clearing existing users in staging...");
    await stagingCol.deleteMany({});
    
    const stagingUsers = [
      { name: "Staging User 1", email: "user1@staging.local", role: "user" },
      { name: "Staging User 2", email: "user2@staging.local", role: "user" },
      { name: "Staging User 3", email: "user3@staging.local", role: "user" },
      { name: "Staging User 4", email: "user4@staging.local", role: "admin" },
      { name: "Staging User 5", email: "user5@staging.local", role: "guest" },
    ];
    await stagingCol.insertMany(stagingUsers);
    logger.info(`Seeded ${stagingUsers.length} users into Staging.`);

    // 2. Seed Production
    logger.info("Connecting to production environment...");
    const prodDb = await getDbForEnv("production");
    const prodCol = prodDb.collection("users");
    
    logger.info("Clearing existing users in production...");
    await prodCol.deleteMany({});
    
    const prodUsers = [
      { name: "Prod User 1", email: "user1@prod.local", role: "user" },
      { name: "Prod User 2", email: "user2@prod.local", role: "user" },
      { name: "Prod User 3", email: "user3@prod.local", role: "user" },
      { name: "Prod User 4", email: "user4@prod.local", role: "user" },
      { name: "Prod User 5", email: "user5@prod.local", role: "user" },
      { name: "Prod User 6", email: "user6@prod.local", role: "user" },
      { name: "Prod User 7", email: "user7@prod.local", role: "user" },
      { name: "Prod User 8", email: "user8@prod.local", role: "admin" },
      { name: "Prod User 9", email: "user9@prod.local", role: "admin" },
      { name: "Prod User 10", email: "user10@prod.local", role: "guest" },
    ];
    await prodCol.insertMany(prodUsers);
    logger.info(`Seeded ${prodUsers.length} users into Production.`);

    logger.info("Seeding completed successfully!");
  } catch (error) {
    logger.error("Error during seeding", error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

seed();
