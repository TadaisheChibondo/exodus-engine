import { Model } from "@nozbe/watermelondb";
import { field, text } from "@nozbe/watermelondb/decorators";

export default class Task extends Model {
  static table = "tasks";

  @text("name") name!: string;
  @text("task_type") taskType!: string;
  @field("xp") xp!: number;
  @text("linked_ids") linkedIds!: string;
  @text("color") color!: string;

  // 👇 FIXED: Use @field for booleans!
  @field("is_urgent") isUrgent!: boolean;

  @text("status") status!: string;

  // The Phase B Need Link
  @text("target_need") targetNeed?: string;

  // The Phase C Quest Link
  @text("linked_quest_ids") linkedQuestIds?: string;
}
