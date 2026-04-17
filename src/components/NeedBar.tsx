import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface NeedBarProps {
  cfg: { label: string; icon: string; color: string };
  value: number;
  onPress: () => void;
}

export default function NeedBar({ cfg, value, onPress }: NeedBarProps) {
  const isLow = value < 45;
  const isCrit = value < 25;

  // Animate the bar filling up or draining
  const fillStyle = useAnimatedStyle(() => ({
    width: withSpring(`${value}%`, { damping: 20, stiffness: 90 }),
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.container,
        isCrit && { borderColor: "rgba(255,60,60,0.3)", borderWidth: 1 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.icon, { color: cfg.color }]}>{cfg.icon}</Text>
        <Text style={styles.label}>{cfg.label}</Text>
        <Text style={[styles.val, { color: isLow ? "#ff7070" : cfg.color }]}>
          {Math.round(value)}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            fillStyle,
            { backgroundColor: isLow ? "#ff4444" : cfg.color },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 6,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  icon: { fontSize: 10, marginRight: 6 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.5)",
    flex: 1,
  },
  val: { fontFamily: "monospace", fontSize: 11, fontWeight: "600" },
  track: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3 },
});
