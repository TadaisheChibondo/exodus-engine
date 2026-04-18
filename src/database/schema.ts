import { appSchema, tableSchema } from "@nozbe/watermelondb";

export default appSchema({
  version: 6,
  tables: [
    tableSchema({
      name: "skills",
      columns: [
        { name: "name", type: "string" },
        { name: "level", type: "number" },
        { name: "xp", type: "number" },
        { name: "max_xp", type: "number" },
        { name: "color", type: "string" },
        { name: "icon", type: "string" },
      ],
    }),
    tableSchema({
      name: "goals",
      columns: [
        { name: "name", type: "string" },
        { name: "progress", type: "number" },
        { name: "reward", type: "number" },
        { name: "skill_link", type: "string", isOptional: true },
        { name: "is_completed", type: "boolean" },
      ],
    }),
    tableSchema({
      name: "tasks",
      columns: [
        { name: "name", type: "string" },
        { name: "task_type", type: "string" },
        { name: "xp", type: "number" },
        { name: "linked_ids", type: "string" },
        { name: "color", type: "string" },
        { name: "is_urgent", type: "boolean" },
        { name: "status", type: "string" },
        // 👇 ADD THIS NEW COLUMN
        { name: "target_need", type: "string", isOptional: true },
        { name: "linked_quest_ids", type: "string", isOptional: true },
      ],
    }),
    tableSchema({
      name: "quests",
      columns: [
        { name: "title", type: "string" },
        { name: "description", type: "string", isOptional: true },
        { name: "xp_reward", type: "number" },
        { name: "status", type: "string" },
        { name: "linked_skill_id", type: "string", isOptional: true },
        // 👇 ADD THESE TWO NEW COLUMNS
        { name: "total_tasks", type: "number", isOptional: true },
        { name: "completed_tasks", type: "number", isOptional: true },
      ],
    }),
  ],
});
