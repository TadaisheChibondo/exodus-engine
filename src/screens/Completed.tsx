import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { database } from "../database";
import { Q } from "@nozbe/watermelondb";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  FadeInDown,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Flip Card ───────────────────────────────────────────────────────────────
function FlipCard({
  front,
  back,
  index,
}: {
  front: React.ReactNode;
  back: React.ReactNode;
  index: number;
}) {
  const rotation = useSharedValue(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    if (isFlipped) {
      rotation.value = withSpring(0, { damping: 14, stiffness: 120 });
    } else {
      rotation.value = withSpring(180, { damping: 14, stiffness: 120 });
    }
    setIsFlipped((prev) => !prev);
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      {
        rotateY: `${interpolate(
          rotation.value,
          [0, 180],
          [0, 180],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
    backfaceVisibility: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      {
        rotateY: `${interpolate(
          rotation.value,
          [0, 180],
          [180, 360],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
    backfaceVisibility: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80)
        .duration(400)
        .springify()
        .damping(14)}
      style={styles.flipCardOuter}
    >
      <TouchableOpacity
        onPress={handleFlip}
        activeOpacity={1}
        style={styles.flipCardInner}
      >
        <Animated.View style={[styles.flipSide, frontStyle]}>
          {front}
        </Animated.View>
        <Animated.View style={[styles.flipSide, backStyle]}>
          {back}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Task Card — Front (green) ────────────────────────────────────────────────
function TaskCardFront({ task }: { task: any }) {
  return (
    <View style={[styles.cardFace, styles.taskFront]}>
      <View style={styles.cardTopRow}>
        <Text style={styles.taskXpBadge}>+{task.xp} XP</Text>
        <Text style={styles.tapHint}>TAP ↻</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={3}>
        {task.name}
      </Text>
      <View style={styles.cardFooter}>
        <View style={[styles.statusDot, { backgroundColor: "#00e5b0" }]} />
        <Text style={[styles.statusText, { color: "#00e5b0" }]}>DONE</Text>
      </View>
    </View>
  );
}

// ─── Task Card — Back (blue, shows skill) ────────────────────────────────────
function TaskCardBack({
  task,
  skillsMap,
}: {
  task: any;
  skillsMap: Record<string, string>;
}) {
  // Handle the new comma-separated linked_ids field (or fallback to old single linked_id)
  let linkedSkillId: string | null = null;

  if (task.linked_ids) {
    // New format: comma-separated string, get the first one
    const ids = task.linked_ids.split(",").filter((id: string) => id.trim());
    linkedSkillId = ids.length > 0 ? ids[0] : null;
  } else if (task.linked_id || task.linkedId) {
    // Old format: single ID
    linkedSkillId = task.linked_id ?? task.linkedId;
  }

  const skillName = linkedSkillId
    ? (skillsMap[linkedSkillId] ?? "Unknown Skill")
    : null;

  return (
    <View style={[styles.cardFace, styles.taskBack]}>
      <Text style={[styles.backLabel, { color: "#3d9bff99" }]}>
        TASK DETAILS
      </Text>
      <Text style={styles.backTitle} numberOfLines={2}>
        {task.name}
      </Text>
      <View
        style={[
          styles.backDivider,
          { backgroundColor: "rgba(61,155,255,0.2)" },
        ]}
      />

      <View style={styles.backRow}>
        <Text style={styles.backKey}>XP EARNED</Text>
        <Text style={[styles.backVal, { color: "#3d9bff" }]}>+{task.xp}</Text>
      </View>

      {/* ── Skill Link — the important one ── */}
      <View style={styles.backRow}>
        <Text style={styles.backKey}>SKILL</Text>
        {skillName ? (
          <View style={styles.skillChip}>
            <Text
              style={[styles.skillChipText, { color: "#3d9bff" }]}
              numberOfLines={1}
            >
              {skillName}
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.backVal,
              { color: "rgba(255,255,255,0.25)", fontStyle: "italic" },
            ]}
          >
            General
          </Text>
        )}
      </View>

      <View style={styles.backRow}>
        <Text style={styles.backKey}>TYPE</Text>
        <Text style={styles.backVal}>
          {(task.task_type ?? "GENERAL").toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

// ─── Quest Card — Front (purple) ─────────────────────────────────────────────
function QuestCardFront({ quest }: { quest: any }) {
  const total = quest.total_tasks || 1;
  const completed = quest.completed_tasks || 0;
  const pct = Math.min((completed / total) * 100, 100);

  return (
    <View style={[styles.cardFace, styles.questFront]}>
      <View style={styles.cardTopRow}>
        <Text style={styles.questXpBadge}>+{quest.xp_reward} XP</Text>
        <Text style={styles.tapHint}>TAP ↻</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={3}>
        {quest.title}
      </Text>
      <View style={styles.miniProgressWrap}>
        <View style={styles.miniTrack}>
          <View
            style={[
              styles.miniFill,
              { width: `${pct}%`, backgroundColor: "#bd70ff" },
            ]}
          />
        </View>
        <Text style={styles.miniPct}>{Math.round(pct)}%</Text>
      </View>
      <View style={styles.cardFooter}>
        <View style={[styles.statusDot, { backgroundColor: "#bd70ff" }]} />
        <Text style={[styles.statusText, { color: "#bd70ff" }]}>COMPLETE</Text>
      </View>
    </View>
  );
}

// ─── Quest Card — Back (amber/gold, shows skill) ──────────────────────────────
function QuestCardBack({
  quest,
  skillsMap,
}: {
  quest: any;
  skillsMap: Record<string, string>;
}) {
  const linkedSkillId = quest.linked_skill_id ?? quest.linkedSkillId ?? null;
  const skillName = linkedSkillId
    ? (skillsMap[linkedSkillId] ?? "Unknown Skill")
    : null;

  return (
    <View style={[styles.cardFace, styles.questBack]}>
      <Text style={[styles.backLabel, { color: "#f5d06099" }]}>
        QUEST REPORT
      </Text>
      <Text style={styles.backTitle} numberOfLines={2}>
        {quest.title}
      </Text>
      <View
        style={[
          styles.backDivider,
          { backgroundColor: "rgba(245,208,96,0.2)" },
        ]}
      />

      <View style={styles.backRow}>
        <Text style={styles.backKey}>BOUNTY</Text>
        <Text style={[styles.backVal, { color: "#f5d060" }]}>
          +{quest.xp_reward} XP
        </Text>
      </View>

      <View style={styles.backRow}>
        <Text style={styles.backKey}>SUB-TASKS</Text>
        <Text style={[styles.backVal, { color: "#f5d060" }]}>
          {quest.completed_tasks ?? 0} / {quest.total_tasks ?? "?"}
        </Text>
      </View>

      {/* ── Skill Link ── */}
      <View style={styles.backRow}>
        <Text style={styles.backKey}>SKILL</Text>
        {skillName ? (
          <View
            style={[
              styles.skillChip,
              {
                backgroundColor: "rgba(245,208,96,0.12)",
                borderColor: "rgba(245,208,96,0.3)",
              },
            ]}
          >
            <Text
              style={[styles.skillChipText, { color: "#f5d060" }]}
              numberOfLines={1}
            >
              {skillName}
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.backVal,
              { color: "rgba(255,255,255,0.25)", fontStyle: "italic" },
            ]}
          >
            None linked
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({
  label,
  value,
  color,
  index,
}: {
  label: string;
  value: string | number;
  color: string;
  index: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(350)}
      style={[styles.statPill, { borderColor: color + "40" }]}
    >
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Completed() {
  const insets = useSafeAreaInsets();
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [completedQuests, setCompletedQuests] = useState<any[]>([]);
  const [skillsMap, setSkillsMap] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"tasks" | "quests">("tasks");
  const tabIndicator = useSharedValue(0);

  const loadData = async () => {
    const skillsCollection = await database.get("skills").query().fetch();
    const map: Record<string, string> = {};
    skillsCollection.forEach((s: any) => {
      map[s.id] = s._raw.name;
    });
    setSkillsMap(map);

    const tasks = await database
      .get("tasks")
      .query(Q.where("status", "completed"))
      .fetch();
    setCompletedTasks(tasks.map((t) => t._raw));

    const quests = await database
      .get("quests")
      .query(Q.where("status", "completed"))
      .fetch();
    setCompletedQuests(quests.map((q) => q._raw));
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const totalXp =
    completedTasks.reduce((sum, t) => sum + (t.xp || 0), 0) +
    completedQuests.reduce((sum, q) => sum + (q.xp_reward || 0), 0);

  const switchTab = (tab: "tasks" | "quests") => {
    setActiveTab(tab);
    tabIndicator.value = withTiming(tab === "tasks" ? 0 : 1, { duration: 220 });
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          tabIndicator.value,
          [0, 1],
          [0, SCREEN_WIDTH / 2 - 40],
        ),
      },
    ],
    backgroundColor: tabIndicator.value < 0.5 ? "#3d9bff" : "#bd70ff",
  }));

  const currentItems = activeTab === "tasks" ? completedTasks : completedQuests;
  const rows: any[][] = [];
  for (let i = 0; i < currentItems.length; i += 2) {
    rows.push(currentItems.slice(i, i + 2));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <Text style={styles.headerTitle}>ARCHIVE</Text>
        <Text style={styles.headerSub}>
          Tap any card to reveal full details.
        </Text>
      </Animated.View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatPill
          label="TOTAL XP"
          value={totalXp.toLocaleString()}
          color="#00e5b0"
          index={0}
        />
        <StatPill
          label="TASKS"
          value={completedTasks.length}
          color="#3d9bff"
          index={1}
        />
        <StatPill
          label="QUESTS"
          value={completedQuests.length}
          color="#bd70ff"
          index={2}
        />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => switchTab("tasks")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "tasks" && styles.tabTextActive,
            ]}
          >
            TASKS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => switchTab("quests")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "quests" && styles.tabTextActive,
            ]}
          >
            QUESTS
          </Text>
        </TouchableOpacity>
        <View style={styles.tabTrack}>
          <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
        </View>
      </View>

      {/* Grid */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {currentItems.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.emptyState}
          >
            <Text style={styles.emptyIcon}>
              {activeTab === "tasks" ? "⬡" : "◎"}
            </Text>
            <Text style={styles.emptyTitle}>Nothing here yet.</Text>
            <Text style={styles.emptyBody}>
              {activeTab === "tasks"
                ? "Complete tasks from the Action Queue to see them archived here."
                : "Finish all sub-tasks in a quest or force-complete it to log it here."}
            </Text>
          </Animated.View>
        ) : (
          rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.cardRow}>
              {row.map((item, colIdx) => {
                const cardIndex = rowIdx * 2 + colIdx;
                return activeTab === "tasks" ? (
                  <FlipCard
                    key={item.id}
                    index={cardIndex}
                    front={<TaskCardFront task={item} />}
                    back={<TaskCardBack task={item} skillsMap={skillsMap} />}
                  />
                ) : (
                  <FlipCard
                    key={item.id}
                    index={cardIndex}
                    front={<QuestCardFront quest={item} />}
                    back={<QuestCardBack quest={item} skillsMap={skillsMap} />}
                  />
                );
              })}
              {row.length === 1 && <View style={styles.flipCardOuter} />}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07090f" },

  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  headerTitle: {
    color: "#dde3f0",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 4,
    marginBottom: 3,
  },
  headerSub: { color: "rgba(255,255,255,0.3)", fontSize: 12, letterSpacing: 1 },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statValue: { fontSize: 18, fontWeight: "900" },
  statLabel: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 2,
  },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    position: "relative",
  },
  tabBtn: { flex: 1, paddingBottom: 10, alignItems: "center" },
  tabText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  tabTextActive: { color: "#dde3f0" },
  tabTrack: { position: "absolute", bottom: -1, left: 0, right: 0, height: 2 },
  tabIndicator: { width: "50%", height: 2, borderRadius: 1 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
  cardRow: { flexDirection: "row", gap: 12, marginBottom: 12 },

  flipCardOuter: { flex: 1, height: 185 },
  flipCardInner: { flex: 1, height: 185, position: "relative" },
  flipSide: { borderRadius: 12, overflow: "hidden" },
  cardFace: { flex: 1, padding: 14, justifyContent: "space-between" },

  // ── Task front: dark green tint ──
  taskFront: {
    backgroundColor: "rgba(0,229,176,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,229,176,0.2)",
    borderRadius: 12,
  },
  // ── Task back: blue tint — visually distinct ──
  taskBack: {
    backgroundColor: "rgba(61,155,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(61,155,255,0.3)",
    borderRadius: 12,
  },

  // ── Quest front: purple tint ──
  questFront: {
    backgroundColor: "rgba(189,112,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(189,112,255,0.2)",
    borderRadius: 12,
  },
  // ── Quest back: amber/gold tint — visually distinct ──
  questBack: {
    backgroundColor: "rgba(245,208,96,0.06)",
    borderWidth: 1,
    borderColor: "rgba(245,208,96,0.28)",
    borderRadius: 12,
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  taskXpBadge: { color: "#00e5b0", fontSize: 11, fontWeight: "800" },
  questXpBadge: { color: "#bd70ff", fontSize: 11, fontWeight: "800" },
  tapHint: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardTitle: {
    color: "#dde3f0",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    flex: 1,
    paddingVertical: 6,
  },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },

  miniProgressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 4,
  },
  miniTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 2,
    overflow: "hidden",
  },
  miniFill: { height: "100%", borderRadius: 2 },
  miniPct: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 9,
    fontWeight: "700",
    width: 28,
    textAlign: "right",
  },

  backLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 4,
  },
  backTitle: {
    color: "#dde3f0",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginBottom: 6,
  },
  backDivider: { height: 1, marginBottom: 8 },
  backRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 4,
  },
  backKey: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  backVal: {
    color: "#dde3f0",
    fontSize: 9,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },

  // Skill chip on back of card
  skillChip: {
    backgroundColor: "rgba(61,155,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(61,155,255,0.3)",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    maxWidth: "65%",
  },
  skillChipText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },

  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 42, marginBottom: 16, opacity: 0.3 },
  emptyTitle: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 10,
  },
  emptyBody: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
