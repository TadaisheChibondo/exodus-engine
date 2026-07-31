import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Keyboard,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Animated, {
  SlideInDown,
  SlideOutDown,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { database } from "../database";
import { Q } from "@nozbe/watermelondb";
import { generateQuestRoadmap } from "../services/gemini";

interface QuestRoadmapModalProps {
  quest: any;
  onClose: () => void;
}

export default function QuestRoadmapModal({
  quest,
  onClose,
}: QuestRoadmapModalProps) {
  const [backlogTasks, setBacklogTasks] = useState<any[]>([]);
  const [manualTask, setManualTask] = useState("");
  const [manualXp, setManualXp] = useState("50"); // 🚀 Default XP state
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(
    quest.linked_skill_id || null,
  ); // 🚀 Defaults to the quest's skill if it has one
  const [skills, setSkills] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Fetch Backlog Tasks & Skills
  const loadData = async () => {
    // Fetch backlog
    const tasks = await database
      .get("tasks")
      .query(
        Q.and(
          Q.where("linked_quest_ids", Q.like(`%${quest.id}%`)),
          Q.where("status", "backlog"),
        ),
      )
      .fetch();
    setBacklogTasks(tasks.map((t) => t._raw));

    // Fetch skills for the manual selector
    const skillsCollection = await database.get("skills").query().fetch();
    setSkills(skillsCollection.map((s) => s._raw));
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Manual Task Entry
  const handleManualAdd = async () => {
    if (!manualTask.trim()) return;
    Keyboard.dismiss();

    await database.write(async () => {
      await database.get("tasks").create((task: any) => {
        task.name = manualTask;
        task.xp = parseInt(manualXp) || 50;
        task.status = "backlog";
        task.targetNeed = "vitality";
        task.taskType = selectedSkillId ? "skill" : "goal";
        task.linkedQuestIds = quest.id;
        if (selectedSkillId) {
          task.linkedIds = selectedSkillId;
        }
      });
    });

    // Reset input but keep the XP/Skill settings for rapid-fire logging
    setManualTask("");
    loadData();
  };

  // 3. AI Generation
  const handleAIGenerate = async () => {
    Keyboard.dismiss();
    setIsGenerating(true);

    try {
      const roadmap: any = await generateQuestRoadmap(
        quest.title,
        quest.description,
      );

      await database.write(async () => {
        const tasksArray = Array.isArray(roadmap) ? roadmap : roadmap.tasks;

        const newTasks = tasksArray.map((t: any) =>
          database.get("tasks").prepareCreate((task: any) => {
            task.name = t.name;
            task.xp = t.xp;
            task.targetNeed = t.recommended_need;
            task.isUrgent = t.is_urgent;
            task.status = "backlog";
            task.taskType = quest.linked_skill_id ? "skill" : "goal";
            task.linkedQuestIds = quest.id;
            if (quest.linked_skill_id) {
              task.linkedIds = quest.linked_skill_id;
            }
          }),
        );
        await database.batch(...newTasks);
      });

      loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Inject Task to HUD
  const handleInject = async (taskId: string) => {
    await database.write(async () => {
      const taskToUpdate = await database.get("tasks").find(taskId);
      await taskToUpdate.update((task: any) => {
        task.status = "pending";
      });
    });

    loadData();
  };

  const isTyping = manualTask.trim().length > 0;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropPress} onPress={onClose} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(90)}
        exiting={SlideOutDown}
        style={styles.sheet}
      >
        <View style={styles.header}>
          <Text style={styles.questTitle} numberOfLines={1}>
            {quest.title}
          </Text>
          <Text style={styles.questMeta}>BACKLOGGED SUBTASKS</Text>
        </View>

        {/* 🚀 DYNAMIC ACTION BAR */}
        <Animated.View layout={LinearTransition} style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add manual subtask..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={manualTask}
              onChangeText={setManualTask}
              onSubmitEditing={handleManualAdd}
            />

            {/* The Shape-Shifting Button */}
            {isTyping ? (
              <TouchableOpacity style={styles.addBtn} onPress={handleManualAdd}>
                <Text style={styles.addBtnText}>ADD</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.aiBtn, isGenerating && { opacity: 0.5 }]}
                onPress={handleAIGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#07090f" size="small" />
                ) : (
                  <Text style={styles.aiBtnText}>AI MAP</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* 🚀 CONDITIONAL CONFIGURATION PANEL */}
          {isTyping && (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={styles.configPanel}
            >
              <View style={styles.xpWrapper}>
                <Text style={styles.configLabel}>XP:</Text>
                <TextInput
                  style={styles.xpInput}
                  value={manualXp}
                  onChangeText={setManualXp}
                  keyboardType="numeric"
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.skillScroll}
              >
                <TouchableOpacity
                  style={[styles.chip, !selectedSkillId && styles.chipActive]}
                  onPress={() => setSelectedSkillId(null)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      !selectedSkillId && styles.chipTextActive,
                    ]}
                  >
                    No Skill
                  </Text>
                </TouchableOpacity>

                {skills.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.chip,
                      selectedSkillId === s.id && {
                        borderColor: s.color,
                        backgroundColor: s.color + "20",
                      },
                    ]}
                    onPress={() => setSelectedSkillId(s.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedSkillId === s.id && { color: s.color },
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </Animated.View>

        {/* Backlog List */}
        <ScrollView
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {backlogTasks.length === 0 && !isGenerating && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tasks in the backlog.</Text>
              <Text style={styles.emptySubText}>
                Add manually or generate an AI roadmap.
              </Text>
            </View>
          )}

          {backlogTasks.map((task) => (
            <Animated.View
              key={task.id}
              layout={LinearTransition}
              style={styles.taskCard}
            >
              <View style={styles.taskInfo}>
                <Text style={styles.taskName}>{task.name}</Text>
                <Text style={styles.taskMeta}>
                  +{task.xp} XP • {task.target_need?.toUpperCase() || "GOAL"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.injectBtn}
                onPress={() => handleInject(task.id)}
              >
                <Text style={styles.injectText}>INJECT</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  backdropPress: { flex: 1 },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "85%", // Slightly taller to accommodate the new inputs
    backgroundColor: "#0c0f1a",
    borderTopWidth: 1,
    borderTopColor: "rgba(189,112,255,0.3)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  questTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#dde3f0",
    marginBottom: 4,
  },
  questMeta: {
    fontSize: 10,
    fontWeight: "800",
    color: "#bd70ff",
    letterSpacing: 1.5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 14,
    height: 50,
  },
  aiBtn: {
    backgroundColor: "#bd70ff",
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(189, 112, 255, 0.5)",
    minWidth: 80,
  },
  aiBtnText: {
    color: "#07090f",
    fontWeight: "900",
    letterSpacing: 1,
    fontSize: 12,
  },
  addBtn: {
    backgroundColor: "#00e5b0",
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 176, 0.5)",
    minWidth: 80,
  },
  addBtnText: {
    color: "#07090f",
    fontWeight: "900",
    letterSpacing: 1,
    fontSize: 12,
  },
  configPanel: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  xpWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
  },
  configLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "800",
  },
  xpInput: {
    color: "#00e5b0",
    fontWeight: "800",
    fontSize: 12,
    marginLeft: 5,
    width: 40,
    textAlign: "center",
  },
  skillScroll: {
    gap: 8,
    alignItems: "center",
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.02)",
    height: 32,
    justifyContent: "center",
  },
  chipActive: {
    borderColor: "#f5d060",
    backgroundColor: "rgba(245,208,96,0.1)",
  },
  chipText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "800",
  },
  chipTextActive: {
    color: "#f5d060",
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptySubText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  taskInfo: {
    flex: 1,
    paddingRight: 10,
  },
  taskName: {
    color: "#dde3f0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  taskMeta: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "700",
  },
  injectBtn: {
    backgroundColor: "rgba(0, 229, 176, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 176, 0.3)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  injectText: {
    color: "#00e5b0",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
