import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { database } from "../database";
import { generateSkillBlueprint } from "../services/gemini";
import { Q } from "@nozbe/watermelondb";

interface SkillVisorProps {
  skill: any;
  onClose: () => void;
  // ✅ FIX: onUpdate now receives the refreshed raw skill object so SkillTree
  // can update activeSkill and keep the skill prop in sync. Without this, after
  // saving a blueprint the SkillVisor still holds the old stale _raw object;
  // any re-render of SkillTree resets the local blueprint state back to null.
  onUpdate: (refreshedSkill?: any) => void;
}

export default function SkillVisor({
  skill,
  onClose,
  onUpdate,
}: SkillVisorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [blueprint, setBlueprint] = useState<any>(null);

  // Parse the blueprint whenever the skill blueprint string changes
  useEffect(() => {
    if (skill.ai_blueprint) {
      try {
        setBlueprint(JSON.parse(skill.ai_blueprint));
      } catch (e) {
        console.error("Failed to parse blueprint JSON", e);
        setBlueprint(null);
      }
    } else {
      setBlueprint(null);
    }
  }, [skill.ai_blueprint]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const generatedData = await generateSkillBlueprint(skill.name);
      if (!generatedData) {
        throw new Error("AI returned no blueprint data.");
      }

      // Save it permanently to the skill in WatermelonDB
      await database.write(async () => {
        const skillRecord: any = await database.get("skills").find(skill.id);
        await skillRecord.update((s: any) => {
          s.aiBlueprint = JSON.stringify(generatedData);
        });
      });
      setBlueprint(generatedData);

      const refreshed: any = await database.get("skills").find(skill.id);
      onUpdate(refreshed._raw);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      console.error("Neural link failed:", message, error);
      Alert.alert("Neural Link Failed", message || "Unknown error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteSkill = async () => {
    Alert.alert(
      "Delete Skill",
      `Are you sure you want to delete "${skill.name}"? This will also remove all related goals and tasks.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await database.write(async () => {
                // Delete related goals
                const goalsCollection = database.get("goals");
                const relatedGoals = await goalsCollection
                  .query(Q.where("skill_link", skill.id))
                  .fetch();
                await Promise.all(
                  relatedGoals.map((goal: any) => goal.destroyPermanently()),
                );

                // Delete related tasks (assuming linkedIds contains skill ID)
                const tasksCollection = database.get("tasks");
                const allTasks = await tasksCollection.query().fetch();
                const relatedTasks = allTasks.filter(
                  (task: any) =>
                    task.linkedIds && task.linkedIds.includes(skill.id),
                );
                await Promise.all(
                  relatedTasks.map((task: any) => task.destroyPermanently()),
                );

                // Delete the skill
                const skillRecord = await database.get("skills").find(skill.id);
                await skillRecord.destroyPermanently();
              });

              Alert.alert("Skill Deleted", `"${skill.name}" has been removed.`);
              onClose();
              onUpdate();
            } catch (error) {
              console.error("Error deleting skill:", error);
              Alert.alert("Error", "Failed to delete skill. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleSpawnActivity = async (activity: any) => {
    await database.write(async () => {
      await database.get("tasks").create((task: any) => {
        task.name = `[${skill.name}] ${activity.name}`;
        task.xp = activity.xp;
        task.color = skill.color;
        task.status = "pending";
        task.linkedIds = skill.id;
        task.targetNeed = activity.recommended_need || "stimulation"; // ✅ camelCase
      });
    });

    Alert.alert(
      "Activity Injected",
      `"${activity.name}" added to Action Queue.`,
    );
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.visorContainer, { borderColor: skill.color }]}>
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: skill.color }]}>
                {skill.name.toUpperCase()}
              </Text>
              <Text style={styles.subtitle}>NEURAL MAPPING VISOR</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                onPress={handleDeleteSkill}
                style={styles.deleteBtn}
              >
                <Text style={styles.deleteText}>🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>X</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CONTENT */}
          <View style={styles.content}>
            {isGenerating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={skill.color} />
                <Text style={styles.loadingText}>Synthesizing Roadmap...</Text>
              </View>
            ) : blueprint ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.rulesText}>
                  {blueprint.progression_rules}
                </Text>

                {blueprint.roadmap.map((level: any, index: number) => (
                  <View key={index} style={styles.levelBlock}>
                    <View style={styles.levelHeader}>
                      <Text style={[styles.levelTitle, { color: skill.color }]}>
                        LEVEL {level.level}: {level.milestone.toUpperCase()}
                      </Text>
                    </View>

                    {level.activities.map((activity: any, actIndex: number) => (
                      <View key={actIndex} style={styles.activityCard}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <Text style={styles.activityName}>
                            {activity.name}
                          </Text>
                          <Text
                            style={[styles.activityXp, { color: skill.color }]}
                          >
                            +{activity.xp} XP •{" "}
                            {activity.recommended_need.toUpperCase()}
                          </Text>
                        </View>

                        {/* THE MAGIC INJECTION BUTTON */}
                        <TouchableOpacity
                          style={[
                            styles.spawnBtn,
                            {
                              backgroundColor: skill.color + "20",
                              borderColor: skill.color,
                            },
                          ]}
                          onPress={() => handleSpawnActivity(activity)}
                        >
                          <Text
                            style={[
                              styles.spawnBtnText,
                              { color: skill.color },
                            ]}
                          >
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No blueprint found for this skill.
                </Text>
                <TouchableOpacity
                  style={[styles.generateBtn, { backgroundColor: skill.color }]}
                  onPress={handleGenerate}
                >
                  <Text style={styles.generateBtnText}>
                    INITIATE NEURAL LINK
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  visorContainer: {
    backgroundColor: "#0a0d16",
    height: "85%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteBtn: {
    padding: 10,
    marginRight: 10,
  },
  deleteText: {
    fontSize: 16,
  },
  title: { fontSize: 22, fontWeight: "900", letterSpacing: 2 },
  subtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 4,
  },
  closeBtn: { padding: 10 },
  closeText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  content: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "700",
  },
  rulesText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    lineHeight: 20,
    fontStyle: "italic",
    marginBottom: 24,
  },
  levelBlock: { marginBottom: 24 },
  levelHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingBottom: 8,
    marginBottom: 12,
  },
  levelTitle: { fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  activityCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activityName: {
    color: "#dde3f0",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  activityXp: { fontSize: 10, fontWeight: "800", fontFamily: "monospace" },
  spawnBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  spawnBtnText: { fontSize: 20, fontWeight: "300", marginTop: -2 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "rgba(255,255,255,0.4)", marginBottom: 20 },
  generateBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  generateBtnText: { color: "#000", fontWeight: "900", letterSpacing: 1 },
});
