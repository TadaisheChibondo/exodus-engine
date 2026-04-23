import { Model } from "@nozbe/watermelondb";
import { field, text } from "@nozbe/watermelondb/decorators";

export default class Skill extends Model {
  static table = "skills";

  @text("name") name!: string;
  @field("level") level!: number;
  @field("xp") xp!: number;
  @field("max_xp") max_xp!: number;
  @text("color") color!: string;
  @text("icon") icon!: string;
  @text("ai_blueprint") aiBlueprint?: string;
}
