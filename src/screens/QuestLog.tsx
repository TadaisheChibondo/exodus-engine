import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { database } from "../database";

export default function QuestLog() {
  const insets = useSafeAreaInsets();
  const [quests, setQuests] = useState<any[]>([]);

  // 1. Fetch Quests (Tasks are no longer needed here! Massive memory save.)
  const loadData = async () => {
    const questCollection = await database.get("quests").query().fetch();
    setQuests(
      questCollection
        .map((q) => q._raw)
        .filter((quest) => quest.status !== "completed"),
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  // 2. Handle Quest Deletion
  const handleDelete = (questId: string) => {
    Alert.alert(
      "ABORT QUEST",
      "Are you sure you want to delete this macro-objective? This action cannot be reversed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await database.write(async () => {
              const questToDestroy = await database.get("quests").find(questId);
              await questToDestroy.destroyPermanently();
            });
            loadData();
          },
        },
      ],
    );
  };

  // 3. Handle Manual Quest Completion (Override)
  const handleComplete = async (questRaw: any) => {
    await database.write(async () => {
      const questToUpdate: any = await database.get("quests").find(questRaw.id);

      await questToUpdate.update((q: any) => {
        q.status = "completed";
        q.completedTasks = q.totalTasks; // Sync the bar to 100%
      });

      // Award remaining massive XP bounty if manually forced
      if (questRaw.linked_skill_id) {
        try {
          const skillToUpdate: any = await database
            .get("skills")
            .find(questRaw.linked_skill_id);
          await skillToUpdate.update((skill: any) => {
            let currentXp = skill.xp + questRaw.xp_reward;
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
        } catch (error) {
          console.log("Skill not found for quest completion.");
        }
      }
    });

    loadData();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>QUEST LOG</Text>
        <Text style={styles.subtitle}>Macro-objective tracking online.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {quests.length > 0 ? (
          quests.map((quest) => {
            // THE NEW PROGRESS BAR LOGIC (Reading directly from the DB columns)
            const totalTasks = quest.total_tasks || 1;
            const completedTasks = quest.completed_tasks || 0;
            const progressPct = Math.min(
              (completedTasks / totalTasks) * 100,
              100,
            );
            const isCompleted = quest.status === "completed";

            return (
              <View
                key={quest.id}
                style={[
                  styles.card,
                  isCompleted && { borderLeftColor: "#00e5b0", opacity: 0.6 },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text
                    style={[
                      styles.questTitle,
                      isCompleted && {
                        textDecorationLine: "line-through",
                        color: "rgba(255,255,255,0.4)",
                      },
                    ]}
                  >
                    {quest.title}
                  </Text>
                  <Text
                    style={[
                      styles.xpBadge,
                      isCompleted && {
                        backgroundColor: "rgba(0,229,176,0.1)",
                        color: "#00e5b0",
                      },
                    ]}
                  >
                    +{quest.xp_reward} XP
                  </Text>
                </View>

                {quest.description ? (
                  <Text style={styles.description}>{quest.description}</Text>
                ) : null}

                {/* THE PROGRESS BAR */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>SUB-ROUTINES</Text>
                    <Text style={styles.progressText}>
                      {completedTasks} / {totalTasks}
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${progressPct}%` }]} />
                  </View>
                </View>

                <View style={styles.footer}>
                  <TouchableOpacity onPress={() => handleDelete(quest.id)}>
                    <Text style={styles.deleteText}>DELETE</Text>
                  </TouchableOpacity>

                  {!isCompleted && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleComplete(quest)}
                    >
                      <Text style={styles.actionText}>FORCE COMPLETE</Text>
                    </TouchableOpacity>
                  )}
                  {isCompleted && (
                    <Text style={styles.completedText}>ACCOMPLISHED</Text>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>
            No active quests. The horizon is clear.
            {"\n\n"}
            <Text style={styles.emptyTextSmall}>
              Completed quests are archived in the Codex.
            </Text>
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07090f" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  title: {
    color: "#bd70ff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 3,
  },
  subtitle: {
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
    fontSize: 12,
    letterSpacing: 1,
  },
  scrollContent: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderLeftWidth: 4,
    borderLeftColor: "#bd70ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  questTitle: {
    color: "#dde3f0",
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
    paddingRight: 10,
    lineHeight: 22,
  },
  xpBadge: {
    color: "#bd70ff",
    fontFamily: "monospace",
    fontWeight: "700",
    fontSize: 12,
    backgroundColor: "rgba(189, 112, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  description: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 10,
    borderRadius: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  progressText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  track: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: "#bd70ff", borderRadius: 3 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 12,
  },
  deleteText: {
    color: "#ff4444",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    opacity: 0.8,
  },
  actionBtn: {
    backgroundColor: "#bd70ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  completedText: {
    color: "#00e5b0",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  emptyText: {
    color: "rgba(255,255,255,0.3)",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 40,
  },
  emptyTextSmall: {
    fontSize: 11,
    color: "rgba(255,255,255,0.2)",
    fontStyle: "italic",
  },
});
