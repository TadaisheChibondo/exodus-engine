import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { database } from "../database";
import { useEngineStore } from "../store/useEngineStore";
import { Q } from "@nozbe/watermelondb";
import { generateCoachFeedback, CoachResponse } from "../services/gemini";

export default function CoachTerminal() {
  const insets = useSafeAreaInsets();
  const needs = useEngineStore((state) => state.needs);

  const [loading, setLoading] = useState(false);
  const [localMath, setLocalMath] = useState<any>(null);
  const [coachInsight, setCoachInsight] = useState<CoachResponse | null>(null);

  const calculateLocalAnalytics = async () => {
    // 1. Fetch skills to calculate total XP and fastest growing
    const skillsCollection = await database.get("skills").query().fetch();
    const activeSkills = skillsCollection.map((s: any) => ({
      name: s._raw.name,
      level: s._raw.level,
      xp: s._raw.xp,
    }));

    let totalXp = 0;
    activeSkills.forEach((s) => {
      totalXp += s.level * 1000 + s.xp; // Approximate historical scaling
    });

    // 2. Fetch recent task history for completion rate
    const totalTasksCount = await database.get("tasks").query().fetchCount();
    const completedTasksCount = await database
      .get("tasks")
      .query(Q.where("status", "completed"))
      .fetchCount();
    const completionRate =
      totalTasksCount > 0
        ? Math.round((completedTasksCount / totalTasksCount) * 100)
        : 100;

    // Determine primary deficit
    const sortedNeeds = Object.entries(needs).sort((a, b) => a[1] - b[1]);
    const primaryDeficit = sortedNeeds[0][0].toUpperCase();

    const statsPayload = {
      needs,
      activeSkills,
      completionRate,
      totalXpEarned: totalXp,
      primaryDeficit,
      completedCount: completedTasksCount,
    };

    setLocalMath(statsPayload);
    return statsPayload;
  };

  const triggerNeuralLink = async () => {
    setLoading(true);
    try {
      const currentAnalytics = await calculateLocalAnalytics();
      const insight = await generateCoachFeedback({
        needs: currentAnalytics.needs,
        activeSkills: currentAnalytics.activeSkills,
        recentTasks: [], // Can filter historical tasks if needed
        completionRate: currentAnalytics.completionRate,
        totalXpEarned: currentAnalytics.totalXpEarned,
      });
      setCoachInsight(insight);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateLocalAnalytics();
  }, [needs]);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      <Text style={styles.title}>COACH TERMINAL</Text>

      {/* HARD LOCAL ANALYTICS MATRIX */}
      {localMath && (
        <View style={styles.matrixContainer}>
          <Text style={styles.sectionLabel}>SYSTEM METRICS</Text>
          <View style={styles.grid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>TOTAL XP RECORDED</Text>
              <Text style={[styles.statValue, { color: "#bd70ff" }]}>
                {localMath.totalXpEarned}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>COMPLETION RATE</Text>
              <Text style={[styles.statValue, { color: "#00e5b0" }]}>
                {localMath.completionRate}%
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>TASKS CLEARED</Text>
              <Text style={styles.statValue}>{localMath.completedCount}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>CRITICAL DEFICIT</Text>
              <Text style={[styles.statValue, { color: "#ff4444" }]}>
                {localMath.primaryDeficit}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* NEURAL LINK ACTIVATOR */}
      <TouchableOpacity
        style={styles.syncButton}
        onPress={triggerNeuralLink}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#07090f" />
        ) : (
          <Text style={styles.syncButtonText}>INITIATE NEURAL SYNAPSIS</Text>
        )}
      </TouchableOpacity>

      {/* AI COACHING ENGINE OUTPUT */}
      {coachInsight && !loading && (
        <View style={styles.insightContainer}>
          {/* SYNERGY CLASS */}
          <View style={styles.synergyCard}>
            <Text style={styles.synergyTag}>ACTIVE CLASS DISCOVERED</Text>
            <Text style={styles.synergyTitle}>{coachInsight.synergyName}</Text>
            <Text style={styles.synergyBody}>
              {coachInsight.synergyDescription}
            </Text>
          </View>

          {/* THE HONEST TRUTH */}
          <Text style={styles.sectionLabel}>TRAJECTORY DIAGNOSTIC</Text>
          <View style={styles.terminalBlock}>
            <Text style={styles.terminalText}>
              {coachInsight.honestOpinion}
            </Text>
          </View>

          {/* 6-MONTH PREDICTIVE SIMULATION */}
          <Text style={styles.sectionLabel}>
            FUTURE TIMELINE SIMULATION (T + 180 DAYS)
          </Text>
          <View style={[styles.terminalBlock, styles.simulationBlock]}>
            <Text style={[styles.terminalText, styles.simulationText]}>
              {coachInsight.sixMonthSimulation}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07090f", padding: 20 },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#dde3f0",
    letterSpacing: 3,
    marginBottom: 25,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 25,
  },
  matrixContainer: { width: "100%" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statBox: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    padding: 16,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    marginBottom: 6,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: "#dde3f0" },
  syncButton: {
    backgroundColor: "#00e5b0",
    width: "100%",
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
    shadowColor: "#00e5b0",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  syncButtonText: {
    color: "#07090f",
    fontWeight: "900",
    letterSpacing: 1.5,
    fontSize: 13,
  },
  insightContainer: { width: "100%" },
  synergyCard: {
    backgroundColor: "rgba(189, 112, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(189, 112, 255, 0.2)",
    padding: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  synergyTag: {
    fontSize: 9,
    fontWeight: "900",
    color: "#bd70ff",
    letterSpacing: 2,
    marginBottom: 4,
  },
  synergyTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#dde3f0",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  synergyBody: {
    fontSize: 13,
    color: "rgba(221, 227, 240, 0.7)",
    lineHeight: 18,
  },
  terminalBlock: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 18,
    borderRadius: 8,
  },
  simulationBlock: { borderLeftWidth: 3, borderLeftColor: "#00e5b0" },
  terminalText: {
    color: "#dde3f0",
    fontSize: 13,
    lineHeight: 22,
    textAlign: "justify",
  },
  simulationText: { color: "rgba(0, 229, 176, 0.9)" },
});
