import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { database } from "../database";

// 🚀 Import the new Visor
import SkillVisor from "../components/SkillVisor";

export default function SkillTree() {
  const insets = useSafeAreaInsets();
  const [skills, setSkills] = useState<any[]>([]);

  // 🚀 Track which skill is currently being inspected
  const [activeSkill, setActiveSkill] = useState<any>(null);

  const loadSkills = async () => {
    const skillsCollection = await database.get("skills").query().fetch();
    const rawSkills: any[] = skillsCollection.map((s) => s._raw);
    rawSkills.sort((a, b) => b.level - a.level);
    setSkills(rawSkills);
  };

  useFocusEffect(
    useCallback(() => {
      loadSkills();
    }, []),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>SKILL TREE</Text>
        <Text style={styles.subtitle}>Progression mapping online.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {skills.length > 0 ? (
          skills.map((skill) => {
            const progressPct = Math.min((skill.xp / skill.max_xp) * 100, 100);

            return (
              // 🚀 Wrapped the card in a TouchableOpacity to trigger the Visor
              <TouchableOpacity
                key={skill.id}
                activeOpacity={0.8}
                onPress={() => setActiveSkill(skill)}
              >
                <View style={[styles.card, { borderLeftColor: skill.color }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.nameRow}>
                      <Text style={styles.icon}>{skill.icon}</Text>
                      <View>
                        <Text style={styles.skillName}>{skill.name}</Text>
                        <Text
                          style={[styles.levelText, { color: skill.color }]}
                        >
                          LEVEL {skill.level}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.xpText}>
                      {skill.xp} /{" "}
                      <Text style={styles.maxXpText}>{skill.max_xp} XP</Text>
                    </Text>
                  </View>

                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        {
                          backgroundColor: skill.color,
                          width: `${progressPct}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No active skills detected.</Text>
        )}
      </ScrollView>

      {/* 🚀 Render the Visor if a skill is selected */}
      {activeSkill && (
        <SkillVisor
          skill={activeSkill}
          onClose={() => setActiveSkill(null)}
          onUpdate={loadSkills}
        />
      )}
    </View>
  );
}

// Keep your existing StyleSheet exactly as it was
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
    color: "#00e5b0",
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { fontSize: 24 },
  skillName: {
    color: "#dde3f0",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  levelText: { fontSize: 12, fontWeight: "900", marginTop: 4 },
  xpText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  maxXpText: { color: "rgba(255,255,255,0.3)" },
  track: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4 },
  emptyText: {
    color: "rgba(255,255,255,0.3)",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 40,
  },
});
