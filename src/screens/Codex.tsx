import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Codex() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>THE CODEX | By Tadaishe</Text>
        <Text style={styles.subtitle}>
          Engine documentation and operating parameters.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION: THE CORE LOOP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I. THE CORE LOOP</Text>
          <Text style={styles.paragraph}>
            The Exodus Engine is a real-time gamified productivity environment.
            Your life is divided into Actionable Tasks, Macro Quests, and
            Disciplines (Skills). Completing tasks grants Experience Points (XP)
            which cascade up to level your Disciplines.
          </Text>
        </View>

        {/* SECTION: THE PLUMBOB */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>II. THE PLUMBOB & TIME-DELTA</Text>
          <Text style={styles.paragraph}>
            Your status is tracked by the Plumbob, a dynamic physics entity that
            reacts to your aggregate Needs. The engine runs a continuous
            "Time-Delta" heartbeat. Over time, your Needs naturally decay. You
            must actively complete tasks to replenish them.
          </Text>

          <View style={styles.ruleCard}>
            <Text style={[styles.ruleText, { color: "#00e5b0" }]}>
              ● OPTIMAL (Avg. {">"} 65)
            </Text>
            <Text style={styles.ruleSubtext}>
              Systems nominal. Steady breathing.
            </Text>
          </View>
          <View style={styles.ruleCard}>
            <Text style={[styles.ruleText, { color: "#f5d060" }]}>
              ● WARNING (Avg. {">"} 35)
            </Text>
            <Text style={styles.ruleSubtext}>
              Elevated heart rate. Needs require attention.
            </Text>
          </View>
          <View style={styles.ruleCard}>
            <Text style={[styles.ruleText, { color: "#ff4444" }]}>
              ● CRITICAL (Avg. {"<"} 35)
            </Text>
            <Text style={styles.ruleSubtext}>
              System failure imminent. Immediate action required.
            </Text>
          </View>
        </View>

        {/* SECTION: THE FOUR NEEDS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>III. SYSTEM NEEDS</Text>
          <Text style={styles.paragraph}>
            Every task you spawn must be linked to a specific Need. Swiping a
            task to completion will heal that specific sector of your state
            machine.
          </Text>

          <View style={[styles.needCard, { borderLeftColor: "#00e5b0" }]}>
            <Text style={styles.needTitle}>🌙 RESTORATION</Text>
            <Text style={styles.needDesc}>
              Sleep, meditation, active recovery, and deep rest.
            </Text>
          </View>
          <View style={[styles.needCard, { borderLeftColor: "#f5d060" }]}>
            <Text style={styles.needTitle}>⚡ VITALITY</Text>
            <Text style={styles.needDesc}>
              Physical exercise, nutrition, hydration, and movement.
            </Text>
          </View>
          <View style={[styles.needCard, { borderLeftColor: "#ff7070" }]}>
            <Text style={styles.needTitle}>👥 CONNECTIVITY</Text>
            <Text style={styles.needDesc}>
              Social interactions, networking, family, and relationships.
            </Text>
          </View>
          <View style={[styles.needCard, { borderLeftColor: "#bd70ff" }]}>
            <Text style={styles.needTitle}>💡 STIMULATION</Text>
            <Text style={styles.needDesc}>
              Deep work, coding, chess, reading, and problem-solving.
            </Text>
          </View>
        </View>

        <Text style={styles.footerText}>EXODUS ENGINE v2.0.0 // ONLINE</Text>
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
  title: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 3 },
  subtitle: {
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
    fontSize: 12,
    letterSpacing: 1,
  },
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 40 },
  sectionTitle: {
    color: "#4488ff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },
  paragraph: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  ruleCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  ruleText: { fontSize: 14, fontWeight: "900", letterSpacing: 1 },
  ruleSubtext: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 },
  needCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  needTitle: {
    color: "#dde3f0",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },
  needDesc: { color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 20 },
  footerText: {
    color: "rgba(255,255,255,0.2)",
    textAlign: "center",
    marginTop: 20,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
