import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import migrations from "./migrations";
import Quest from "./models/Quest";

import schema from "./schema";
import Skill from "./models/Skill";
import Goal from "./models/Goal";
import Task from "./models/Task";

// 1. Initialize the SQLite Adapter
const adapter = new SQLiteAdapter({
  schema,
  migrations, // 👈 Tell SQLite how to upgrade itself
  jsi: true,
});

// 2. Instantiate the Database
export const database = new Database({
  adapter,
  modelClasses: [Skill, Goal, Task, Quest],
});

// DEBUG: Function to nuke the database (development only)
export const clearDatabase = async () => {
  try {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    console.log("Database cleared successfully");
  } catch (error) {
    console.log("Error clearing database:", error);
  }
};
