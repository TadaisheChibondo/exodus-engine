import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSequence,
} from "react-native-reanimated";

interface PlumbobProps {
  status: "optimal" | "warning" | "critical";
}

export default function Plumbob({ status }: PlumbobProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    // Determine the heartbeat speed based on status
    let duration = 2000; // Slow, calm breathing
    let scaleMax = 1.1;

    if (status === "warning") {
      duration = 1000; // Elevated heart rate
      scaleMax = 1.15;
    } else if (status === "critical") {
      duration = 400; // Fast, panicked heartbeat
      scaleMax = 1.25;
    }

    // Apply the breathing animation loop
    scale.value = withRepeat(
      withSequence(
        withTiming(scaleMax, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // -1 means infinite loop
      true, // reverse
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [status]);

  // Map the status to our HUD colors
  const color =
    status === "optimal"
      ? "#00e5b0" // Neon Green
      : status === "warning"
        ? "#f5d060" // Warning Yellow
        : "#ff4444"; // Critical Red

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: "45deg" }, { scale: scale.value }],
    opacity: opacity.value,
    backgroundColor: color,
    shadowColor: color,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.diamond, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  diamond: {
    width: 18,
    height: 18,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
});
