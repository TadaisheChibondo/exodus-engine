import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { database } from "../database";
import { useEngineStore } from "../store/useEngineStore";
import { Q } from "@nozbe/watermelondb";
import Animated, { LinearTransition } from "react-native-reanimated";

// Components
import Plumbob from "../components/Plumbob";
import NeedBar from "../components/NeedBar";
import SkillRing from "../components/SkillRing";
import TaskCard from "../components/TaskCard";
import CreationMatrix from "../components/CreationMatrix";

type NeedKey = "restoration" | "vitality" | "connectivity" | "stimulation";

export default function Dashboard() {
  const insets = useSafeAreaInsets();

  // 1. Volatile State (Zustand)
  const needs = useEngineStore((state) => state.needs);
  const plumbobStatus = useEngineStore((state) => state.getPlumbobStatus());
  const modifyNeed = useEngineStore((state) => state.modifyNeed);

  // 2. Persistent State (WatermelonDB)
  const [skills, setSkills] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // 3. UI State for the Modal
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);

  // 4. Load Data from Database
  const loadData = async () => {
    const skillsCollection = await database.get("skills").query().fetch();
    const pendingTasksCollection = await database
      .get("tasks")
      .query(Q.where("status", "pending"))
      .fetch();

    setSkills(skillsCollection.map((s) => s._raw));
    setTasks(pendingTasksCollection.map((t) => t._raw));
  };

  useEffect(() => {
    loadData();
  }, []);

  // 5. Handle Task Actions (with RPG Math)
  const handleTaskComplete = async (taskId: string) => {
    // ─── STEP 1: Read ALL fields BEFORE any write ─────────────────────────────
    // Critical rule: never access model fields after calling .update().
    // WatermelonDB marks the record dirty and field reads become unreliable.
    const taskRecord: any = await database.get("tasks").find(taskId);

    // Debug: Log the raw data to see what fields exist
    console.log("Task Record Raw:", taskRecord._raw);

    const taskXp: number = taskRecord.xp;
    const targetNeed: string = taskRecord.targetNeed || "restoration";
    const linkedId: string = taskRecord.linkedId;
    const linkedQuestId: string | undefined = taskRecord.linkedQuestId;
    const needBoost = Math.max(1, Math.floor(taskXp / 10));

    console.log(
      "Completing task:",
      taskRecord.name,
      "linked to quest:",
      linkedQuestId,
      "| raw linked_quest_id:",
      taskRecord._raw.linked_quest_id,
    );

    // ─── STEP 2: Single DB write transaction ──────────────────────────────────
    await database.write(async () => {
      // 2a. Mark task as completed
      await taskRecord.update((task: any) => {
        task.status = "completed";
      });

      // 2b. Quest Progression — only if this task was linked to a quest
      if (linkedQuestId) {
        console.log("Updating quest:", linkedQuestId);
        try {
          const questRecord: any = await database
            .get("quests")
            .find(linkedQuestId);

          // Read quest fields BEFORE updating (same principle)
          const questLinkedSkillId: string | undefined =
            questRecord.linkedSkillId || questRecord.linked_skill_id;
          const totalTasks: number =
            questRecord.totalTasks || questRecord.total_tasks;
          const xpReward: number =
            questRecord.xpReward || questRecord.xp_reward || 0;
          const proportionalXp: number = Math.floor(xpReward / totalTasks);
          const currentCompleted: number =
            questRecord.completedTasks || questRecord.completed_tasks || 0;
          const newCompleted = currentCompleted + 1;

          // Increment counter and auto-complete if all tasks done
          await questRecord.update((q: any) => {
            q.completedTasks = newCompleted;
            if (newCompleted >= totalTasks) {
              q.status = "completed";
            }
          });
          console.log(
            "Quest updated: completed_tasks =",
            newCompleted,
            "total =",
            totalTasks,
          );

          // Award proportional XP into the quest's linked skill
          if (questLinkedSkillId && proportionalXp > 0) {
            try {
              const questSkill: any = await database
                .get("skills")
                .find(questLinkedSkillId);

              await questSkill.update((skill: any) => {
                let currentXp = skill.xp + proportionalXp;
                let currentLevel = skill.level;
                let currentMaxXp = skill.max_xp;

                while (currentXp >= currentMaxXp) {
                  currentXp -= currentMaxXp;
                  currentLevel += 1;
                  currentMaxXp = Math.floor(currentMaxXp * 1.2);
                }

                skill.xp = currentXp;
                skill.level = currentLevel;
                skill.max_xp = currentMaxXp;
              });
            } catch {
              console.log("Quest skill not found, skipping XP cascade.");
            }
          }
        } catch (error) {
          console.log(
            "Quest record not found, skipping quest progression.",
            error,
          );
        }
      }

      // 2c. Standard Task → Skill Progression (independent of quest logic)
      if (linkedId && linkedId !== "general") {
        try {
          const taskSkill: any = await database.get("skills").find(linkedId);

          await taskSkill.update((skill: any) => {
            let currentXp = skill.xp + taskXp;
            let currentLevel = skill.level;
            let currentMaxXp = skill.max_xp;

            while (currentXp >= currentMaxXp) {
              currentXp -= currentMaxXp;
              currentLevel += 1;
              currentMaxXp = Math.floor(currentMaxXp * 1.2);
            }

            skill.xp = currentXp;
            skill.level = currentLevel;
            skill.max_xp = currentMaxXp;
          });
        } catch {
          console.log("Task skill not found, skipping standard progression.");
        }
      }
    });

    // ─── STEP 3: Zustand update AFTER DB write completes ─────────────────────
    // modifyNeed is a React state setter — calling it inside database.write()
    // triggers a re-render mid-transaction which can cause subtle race conditions.
    modifyNeed(targetNeed as NeedKey, needBoost);

    loadData();
  };

  const handleTaskCancel = async (taskId: string) => {
    await database.write(async () => {
      const taskToUpdate = await database.get("tasks").find(taskId);
      await taskToUpdate.update((task: any) => {
        task.status = "canceled";
      });
    });

    // Penalty after write, same pattern
    modifyNeed("vitality", -10);

    loadData();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER: Plumbob & Needs */}
      <View style={styles.header}>
        <View style={styles.plumbobWrapper}>
          <Plumbob status={plumbobStatus} />
        </View>
        <View style={styles.needsMatrix}>
          <NeedBar
            cfg={{ label: "RESTORE", icon: "🌙", color: "#00e5b0" }}
            value={needs.restoration}
            onPress={() => {}}
          />
          <NeedBar
            cfg={{ label: "VITALITY", icon: "⚡", color: "#f5d060" }}
            value={needs.vitality}
            onPress={() => {}}
          />
          <NeedBar
            cfg={{ label: "CONNECT", icon: "👥", color: "#ff7070" }}
            value={needs.connectivity}
            onPress={() => {}}
          />
          <NeedBar
            cfg={{ label: "STIMULUS", icon: "💡", color: "#bd70ff" }}
            value={needs.stimulation}
            onPress={() => {}}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* SKILLS RING SECTION */}
        <Text style={styles.sectionTitle}>ACTIVE SKILLS</Text>
        <View style={styles.skillsGrid}>
          {skills.length > 0 ? (
            skills.map((skill) => (
              <View key={skill.id} style={styles.skillItem}>
                <SkillRing skill={skill} size={70} strokeWidth={6} />
                <Text style={styles.skillName}>{skill.name}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No skills loaded yet. Time to grind.
            </Text>
          )}
        </View>

        {/* ACTION QUEUE */}
        <Text style={styles.sectionTitle}>ACTION QUEUE</Text>
        <Animated.View layout={LinearTransition} style={styles.queueContainer}>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleTaskComplete}
                onCancel={handleTaskCancel}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>
              Queue is empty. You are at peace.
            </Text>
          )}
        </Animated.View>
      </ScrollView>

      {/* THE FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => setIsMatrixOpen(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* THE CREATION MATRIX MODAL */}
      {isMatrixOpen && (
        <CreationMatrix
          skills={skills}
          onClose={() => setIsMatrixOpen(false)}
          onSpawn={loadData}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07090f" },
  header: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  plumbobWrapper: { justifyContent: "center", marginRight: 20 },
  needsMatrix: { flex: 1, gap: 8 },
  content: { flex: 1, padding: 20 },
  sectionTitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 15,
    marginTop: 10,
  },
  skillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 40,
  },
  skillItem: { alignItems: "center", width: 80 },
  skillName: {
    color: "#dde3f0",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  queueContainer: {
    gap: 12,
    paddingBottom: 20,
  },
  emptyText: {
    color: "rgba(255,255,255,0.3)",
    fontStyle: "italic",
    fontSize: 13,
  },
  fab: {
    position: "absolute",
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00e5b0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00e5b0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    color: "#000",
    fontSize: 32,
    fontWeight: "300",
    marginTop: -4,
  },
});
