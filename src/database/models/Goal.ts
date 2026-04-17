import { Model } from "@nozbe/watermelondb";
import { field, text } from "@nozbe/watermelondb/decorators";

export default class Goal extends Model {
  static table = "goals";

  @text("name") name!: string;
  @field("progress") progress!: number;
  @field("reward") reward!: number;
  @text("skill_link") skill_link?: string;
  @field("is_completed") is_completed!: boolean; // Changed to @field
}
