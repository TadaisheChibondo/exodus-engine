import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  LinearTransition, // 🚀 NEW: The Layout Physics Engine
} from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // Swipe 25% of the screen to trigger

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
}

export default function TaskCard({
  task,
  onComplete,
  onCancel,
  onEdit,
}: TaskCardProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  // 🚀 THE FIX: Extract the primitive string so Reanimated doesn't capture the live DB object
  const taskId = task.id;

  // The Gesture Engine
  const pan = Gesture.Pan()
    .onUpdate((event) => {
      // Move the card with the finger
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swiped Right -> Complete
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 });
        opacity.value = withTiming(0, { duration: 250 }, () => {
          runOnJS(onComplete)(taskId); // 👈 Use the primitive string here
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swiped Left -> Cancel/Penalty
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 250 });
        opacity.value = withTiming(0, { duration: 250 }, () => {
          runOnJS(onCancel)(taskId); // 👈 And use the primitive string here
        });
      } else {
        // Didn't swipe far enough -> Snap back to center
        translateX.value = withSpring(0, { damping: 20, stiffness: 90 });
      }
    });

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(onEdit)(task);
    });

  const combinedGesture = Gesture.Race(pan, longPress);

  // Apply the animation to the styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(150)}
      style={{ width: "100%" }}
    >
      <GestureDetector gesture={combinedGesture}>
        <Animated.View
          style={[styles.card, { borderLeftColor: task.color }, animatedStyle]}
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
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%", // 🚀 FIXED: No more tiny 160px width
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16, // Slightly more padding for the new full-width look
    justifyContent: "space-between",
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
