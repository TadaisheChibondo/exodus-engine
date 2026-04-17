import { Model } from "@nozbe/watermelondb";
import { field, text } from "@nozbe/watermelondb/decorators";

export default class Quest extends Model {
  static table = "quests";

  @text("title") title!: string;
  @text("description") description?: string;
  @field("xp_reward") xpReward!: number;
  @text("status") status!: string;
  @text("linked_skill_id") linkedSkillId?: string;
  @field("total_tasks") totalTasks!: number;
  @field("completed_tasks") completedTasks!: number;
}
