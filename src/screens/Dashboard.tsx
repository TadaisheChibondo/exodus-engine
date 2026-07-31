import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { database } from "../database";
import { useEngineStore } from "../store/useEngineStore";
import { Q } from "@nozbe/watermelondb";

// Components
import Plumbob from "../components/Plumbob";
import NeedBar from "../components/NeedBar";
import SkillRing from "../components/SkillRing";
import TaskCard from "../components/TaskCard";
import CreationMatrix from "../components/CreationMatrix";

type NeedKey = "restoration" | "vitality" | "connectivity" | "stimulation";

export default function Dashboard() {
  const insets = useSafeAreaInsets();

  const needs = useEngineStore((state) => state.needs);
  const plumbobStatus = useEngineStore((state) => state.getPlumbobStatus());
  const modifyNeed = useEngineStore((state) => state.modifyNeed);

  const [skills, setSkills] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const loadData = async (): Promise<void> => {
    const skillsCollection = await database.get("skills").query().fetch();
    const pendingTasksCollection = await database
      .get("tasks")
      .query(Q.where("status", "pending"))
      .fetch();

    setSkills(skillsCollection.map((s) => s._raw));

    const sortedTasks = pendingTasksCollection
      .map((t) => t._raw)
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

    setTasks(sortedTasks);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDragEnd = async ({ data: newData }: { data: any[] }) => {
    setTasks(newData);

    await database.write(async () => {
      const updates = [];
      for (let i = 0; i < newData.length; i++) {
        const taskRecord: any = await database.get("tasks").find(newData[i].id);
        updates.push(
          taskRecord.prepareUpdate((t: any) => {
            t.sortOrder = i;
          }),
        );
      }
      await database.batch(...updates);
    });
  };

  const handleTaskComplete = async (taskId: string) => {
    const taskRecord: any = await database.get("tasks").find(taskId);
    const taskXp: number = taskRecord.xp;
    const targetNeed: string = taskRecord.targetNeed || "restoration";
    const linkedIds: string[] = taskRecord.linkedIds
      ? taskRecord.linkedIds.split(",").filter((id: string) => id)
      : [];
    const linkedQuestIds: string[] = taskRecord.linkedQuestIds
      ? taskRecord.linkedQuestIds.split(",").filter((id: string) => id)
      : [];
    const needBoost = Math.max(1, Math.floor(taskXp / 10));

    await database.write(async () => {
      await taskRecord.update((task: any) => {
        task.status = "completed";
        task.completedAt = new Date().toISOString();
      });

      for (const questId of linkedQuestIds) {
        try {
          const questRecord: any = await database.get("quests").find(questId);
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

          await questRecord.update((q: any) => {
            q.completedTasks = newCompleted;
            if (newCompleted >= totalTasks) q.status = "completed";
          });

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
            } catch {}
          }
        } catch (error) {}
      }

      for (const skillId of linkedIds) {
        if (skillId && skillId !== "general") {
          try {
            const taskSkill: any = await database.get("skills").find(skillId);
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
          } catch {}
        }
      }
    });

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
    modifyNeed("vitality", -10);
    loadData();
  };

  const handleTaskEdit = (task: any) => {
    setEditingTask(task);
    setIsMatrixOpen(true);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
    return (
      <TaskCard
        task={item}
        onComplete={handleTaskComplete}
        onCancel={handleTaskCancel}
        onEdit={handleTaskEdit}
        drag={drag}
        isActive={isActive}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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

      <DraggableFlatList
        data={tasks}
        onDragEnd={handleDragEnd}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        // 🚀 THE FIX: Bumped to 180 to clear the custom Tab Bar + FAB height
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 180 }, // <--- CHANGE 120 TO 180 HERE
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
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

            <Text style={styles.sectionTitle}>
              ACTION QUEUE {tasks.length > 0 ? `(${tasks.length})` : ""}
            </Text>

            {tasks.length === 0 && (
              <Text style={styles.emptyText}>
                Queue is empty. You are at peace.
              </Text>
            )}
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => setIsMatrixOpen(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {isMatrixOpen && (
        <CreationMatrix
          skills={skills}
          editingTask={editingTask}
          onClose={() => {
            setIsMatrixOpen(false);
            setEditingTask(null);
          }}
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
  listContent: { padding: 20 }, // Base padding handled in component inline style now
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
