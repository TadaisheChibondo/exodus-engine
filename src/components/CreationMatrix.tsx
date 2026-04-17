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
} from "react-native";
import Animated, {
  SlideInDown,
  SlideOutDown,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { database } from "../database";
import { Q } from "@nozbe/watermelondb";
import Quest from "../database/models/Quest";
import Task from "../database/models/Task";

interface CreationMatrixProps {
  skills: any[];
  onClose: () => void;
  onSpawn: () => void;
}

export default function CreationMatrix({
  skills,
  onClose,
  onSpawn,
}: CreationMatrixProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"task" | "skill" | "quest">(
    "task",
  );

  // TASK State
  const [taskName, setTaskName] = useState("");
  const [taskXp, setTaskXp] = useState("50");
  const [taskSkillId, setTaskSkillId] = useState<string | null>(null);
  const [taskNeed, setTaskNeed] = useState<
    "restoration" | "vitality" | "connectivity" | "stimulation"
  >("vitality");
  const [taskUrgent, setTaskUrgent] = useState(false);
  const [taskQuestId, setTaskQuestId] = useState<string | null>(null);

  // SKILL State
  const [skillName, setSkillName] = useState("");
  const [skillIcon, setSkillIcon] = useState("⚔️");
  const [skillColor, setSkillColor] = useState("#00e5b0");

  // QUEST State
  const [questTotalTasks, setQuestTotalTasks] = useState("5");
  const [questTitle, setQuestTitle] = useState("");
  const [questDesc, setQuestDesc] = useState("");
  const [questXp, setQuestXp] = useState("5000");
  const [questSkillId, setQuestSkillId] = useState<string | null>(null);

  // Data State (Loaded dynamically on mount)
  const [availableQuests, setAvailableQuests] = useState<any[]>([]);

  const THEME_COLORS = ["#00e5b0", "#f5d060", "#ff4444", "#bd70ff", "#4488ff"];

  // Fetch active quests when the matrix opens so you can link tasks to them
  const loadMatrixData = async () => {
    const allQuests = await database.get("quests").query().fetch() as Quest[];
    const available = [];

    for (const quest of allQuests) {
      if (quest.status !== "active") continue;

      // Count linked tasks
      const linkedTasks = await database
        .get("tasks")
        .query(Q.where("linked_quest_id", quest.id))
        .fetch() as Task[];

      // Only include quests that can accept more tasks
      if (linkedTasks.length < quest.totalTasks) {
        available.push(quest._raw);
      }
    }

    setAvailableQuests(available);
  };

  useEffect(() => {
    loadMatrixData();
  }, []);

  const handleSpawn = async () => {
    Keyboard.dismiss();

    await database.write(async () => {
      if (activeTab === "task") {
        if (!taskName.trim()) return;

        // Check if quest can accept more tasks
        if (taskQuestId) {
          const quest = await database.get("quests").find(taskQuestId) as Quest;
          const linkedTasks = await database
            .get("tasks")
            .query(Q.where("linked_quest_id", taskQuestId))
            .fetch() as Task[];

          if (linkedTasks.length >= quest.totalTasks) {
            console.log("Quest already has maximum tasks linked");
            return; // Don't create the task
          }
        }

        const newTask = await database.get("tasks").create((task: any) => {
          task.name = taskName;
          task.taskType = taskSkillId ? "skill" : "goal";
          task.xp = parseInt(taskXp) || 10;
          task.linkedId = taskSkillId || "general";
          task.color =
            skills.find((s) => s.id === taskSkillId)?.color || "#f5d060";
          task.isUrgent = taskUrgent;
          task.status = "pending";
          task.targetNeed = taskNeed;
          task.linkedQuestId = taskQuestId; // 🔗 The new V4 Link!
          console.log("Creating task with quest link:", {
            taskName,
            taskQuestId,
            allFields: task,
          });
        }) as Task;

        // Verify the data was saved
        console.log(
          "Task created with ID:",
          newTask.id,
          "Quest ID:",
          newTask.linkedQuestId,
        );

        // Reload available quests since we may have filled one up
        await loadMatrixData();
      } else if (activeTab === "skill") {
        if (!skillName.trim()) return;
        await database.get("skills").create((skill: any) => {
          skill.name = skillName;
          skill.icon = skillIcon;
          skill.color = skillColor;
          skill.level = 1;
          skill.xp = 0;
          skill.max_xp = 1000;
        });
      } else if (activeTab === "quest") {
        if (!questTitle.trim()) return;
        await database.get("quests").create((quest: any) => {
          quest.title = questTitle;
          quest.description = questDesc;
          quest.xpReward = parseInt(questXp) || 1000;
          quest.linkedSkillId = questSkillId;
          quest.status = "active";
          quest.totalTasks = parseInt(questTotalTasks) || 1;
          quest.completedTasks = 0;
        });
      }
    });

    onSpawn();
    onClose();
  };

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
        {/* TOP TABS */}
        <View style={styles.tabContainer}>
          {["task", "skill", "quest"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.formContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* ================= TASK FORM ================= */}
          {activeTab === "task" && (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Task Designation..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={taskName}
                onChangeText={setTaskName}
                autoFocus
              />

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>XP REWARD</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={taskXp}
                    onChangeText={setTaskXp}
                  />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>URGENCY PROTOCOL</Text>
                  <TouchableOpacity
                    style={[
                      styles.urgentBtn,
                      taskUrgent && styles.urgentBtnActive,
                    ]}
                    onPress={() => setTaskUrgent(!taskUrgent)}
                  >
                    <Text
                      style={[
                        styles.urgentText,
                        taskUrgent && styles.urgentTextActive,
                      ]}
                    >
                      {taskUrgent ? "⚠ URGENT" : "STANDARD"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>TARGET NEED</Text>
              <View style={styles.chipRow}>
                {["restoration", "vitality", "connectivity", "stimulation"].map(
                  (need) => (
                    <TouchableOpacity
                      key={need}
                      style={[
                        styles.chip,
                        taskNeed === need && styles.chipActive,
                      ]}
                      onPress={() => setTaskNeed(need as any)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          taskNeed === need && styles.chipTextActive,
                        ]}
                      >
                        {need.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>

              <Text style={styles.label}>LINK TO SKILL (Optional)</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !taskSkillId && styles.chipActive]}
                  onPress={() => setTaskSkillId(null)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      !taskSkillId && styles.chipTextActive,
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {skills.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.chip,
                      taskSkillId === s.id && {
                        borderColor: s.color,
                        backgroundColor: s.color + "20",
                      },
                    ]}
                    onPress={() => setTaskSkillId(s.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        taskSkillId === s.id && { color: s.color },
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>LINK TO QUEST (Optional)</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !taskQuestId && styles.chipActive]}
                  onPress={() => setTaskQuestId(null)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      !taskQuestId && styles.chipTextActive,
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {availableQuests
                  .filter((q) => q.status === "active")
                  .map((q) => (
                    <TouchableOpacity
                      key={q.id}
                      style={[
                        styles.chip,
                        taskQuestId === q.id && {
                          borderColor: "#bd70ff",
                          backgroundColor: "rgba(189,112,255,0.1)",
                        },
                      ]}
                      onPress={() => setTaskQuestId(q.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          taskQuestId === q.id && { color: "#bd70ff" },
                        ]}
                      >
                        {q.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          )}
          {/* ================= SKILL FORM ================= */}
          {activeTab === "skill" && (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Discipline Name (e.g. Muay Thai)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={skillName}
                onChangeText={setSkillName}
                autoFocus
              />

              <Text style={styles.label}>ICON (EMOJI)</Text>
              <TextInput
                style={styles.input}
                placeholder="⚔️"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={skillIcon}
                onChangeText={setSkillIcon}
                maxLength={2}
              />

              <Text style={styles.label}>THEME COLOR</Text>
              <View style={styles.colorRow}>
                {THEME_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      skillColor === color && styles.colorCircleActive,
                    ]}
                    onPress={() => setSkillColor(color)}
                  />
                ))}
              </View>
            </View>
          )}
          {/* ================= QUEST FORM ================= */}
          {activeTab === "quest" && (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Macro-Objective Title"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={questTitle}
                onChangeText={setQuestTitle}
                autoFocus
              />

              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                placeholder="Description / Parameters"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={questDesc}
                onChangeText={setQuestDesc}
                multiline
              />

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>XP BOUNTY</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={questXp}
                    onChangeText={setQuestXp}
                  />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>TOTAL TASKS</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={questTotalTasks}
                    onChangeText={setQuestTotalTasks}
                  />
                </View>
              </View>

              <Text style={styles.label}>LINK TO SKILL (Optional)</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !questSkillId && styles.chipActive]}
                  onPress={() => setQuestSkillId(null)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      !questSkillId && styles.chipTextActive,
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {skills.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.chip,
                      questSkillId === s.id && {
                        borderColor: s.color,
                        backgroundColor: s.color + "20",
                      },
                    ]}
                    onPress={() => setQuestSkillId(s.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        questSkillId === s.id && { color: s.color },
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <TouchableOpacity style={styles.spawnBtn} onPress={handleSpawn}>
            <Text style={styles.spawnText}>
              INITIALIZE {activeTab.toUpperCase()}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} /> {/* Bottom Padding */}
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
    height: "75%",
    backgroundColor: "#0c0f1a",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  tabBtnActive: { backgroundColor: "rgba(255,255,255,0.1)" },
  tabText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tabTextActive: { color: "#00e5b0" },
  formContainer: { flex: 1 },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    color: "#fff",
    padding: 16,
    fontSize: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  row: { flexDirection: "row", gap: 16, marginBottom: 10 },
  half: { flex: 1 },
  label: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  urgentBtn: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  urgentBtnActive: {
    backgroundColor: "rgba(255,68,68,0.1)",
    borderColor: "#ff4444",
  },
  urgentText: {
    color: "rgba(255,255,255,0.5)",
    fontWeight: "700",
    fontSize: 12,
  },
  urgentTextActive: { color: "#ff4444" },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  chipActive: {
    borderColor: "#f5d060",
    backgroundColor: "rgba(245,208,96,0.1)",
  },
  chipText: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "800" },
  chipTextActive: { color: "#f5d060" },
  colorRow: { flexDirection: "row", gap: 15, marginBottom: 30 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, opacity: 0.4 },
  colorCircleActive: { opacity: 1, borderWidth: 2, borderColor: "#fff" },
  spawnBtn: {
    backgroundColor: "#00e5b0",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  spawnText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
});
