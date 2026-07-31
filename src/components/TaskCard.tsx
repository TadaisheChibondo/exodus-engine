import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

interface TaskCardProps {
  task: {
    id: string;
    name: string;
    xp: number;
    color: string;
    is_urgent: boolean;
    scheduled_time?: string;
  };
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onEdit: (task: any) => void;
  drag?: () => void; // 🚀 Passed down from DraggableFlatList
  isActive?: boolean; // 🚀 Tells us if the card is currently being held
}

export default function TaskCard({
  task,
  onComplete,
  onCancel,
  onEdit,
  drag,
  isActive,
}: TaskCardProps) {
  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(150)}
    >
      <View
        style={[
          styles.card,
          { borderLeftColor: task.color },
          isActive && styles.activeCard, // Elevate when dragging
        ]}
      >
        {/* LEFT SIDE: Info & Drag Area */}
        <TouchableOpacity
          style={styles.infoArea}
          onLongPress={drag} // 🚀 Hold to drag
          onPress={() => onEdit(task)} // 🚀 Tap to edit
          delayLongPress={150}
          disabled={isActive}
          activeOpacity={0.7}
        >
          {task.is_urgent && <Text style={styles.urgentBadge}>⚠ URGENT</Text>}
          <Text style={styles.name} numberOfLines={2}>
            {task.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.xp, { color: task.color }]}>
              +{task.xp} XP
            </Text>
            {task.scheduled_time && (
              <Text style={styles.time}>◷ {task.scheduled_time}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* RIGHT SIDE: Action Buttons */}
        <View style={styles.actionArea}>
          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={() => onComplete(task.id)}
          >
            <Text style={styles.buttonText}>✓</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => onCancel(task.id)}
          >
            <Text style={styles.buttonText}>X</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    flexDirection: "row", // Align left info and right buttons horizontally
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderLeftWidth: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  activeCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "#bd70ff",
    transform: [{ scale: 1.02 }],
    elevation: 5,
  },
  infoArea: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  actionArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    gap: 8,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  completeButton: {
    backgroundColor: "rgba(0, 229, 176, 0.1)", // engineGreen
  },
  deleteButton: {
    backgroundColor: "rgba(255, 69, 58, 0.1)", // danger red
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dde3f0",
  },
  urgentBadge: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#ff4444",
    marginBottom: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#dde3f0",
    marginBottom: 12,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xp: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
  },
  time: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
  },
});
