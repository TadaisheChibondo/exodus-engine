import {
  schemaMigrations,
  createTable,
  addColumns,
} from "@nozbe/watermelondb/Schema/migrations";

export default schemaMigrations({
  migrations: [
    {
      toVersion: 8,
      steps: [
        addColumns({
          table: "skills",
          columns: [{ name: "ai_blueprint", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 7,
      steps: [
        addColumns({
          table: "tasks",
          columns: [{ name: "completed_at", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: "tasks",
          columns: [
            { name: "linked_ids", type: "string", isOptional: true },
            { name: "linked_quest_ids", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: "quests",
          columns: [
            { name: "total_tasks", type: "number", isOptional: true },
            { name: "completed_tasks", type: "number", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: "tasks",
          columns: [
            { name: "linked_quest_id", type: "string", isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: "tasks",
          columns: [{ name: "target_need", type: "string", isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 2,
      steps: [
        createTable({
          name: "quests",
          columns: [
            { name: "title", type: "string" },
            { name: "description", type: "string", isOptional: true },
            { name: "xp_reward", type: "number" },
            { name: "status", type: "string" },
            { name: "linked_skill_id", type: "string", isOptional: true },
          ],
        }),
      ],
    },
  ],
});
