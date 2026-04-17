import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
} from "react-native-reanimated";

// Create an animated version of the SVG Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SkillRingProps {
  skill: {
    level: number;
    xp: number;
    max_xp: number;
    color: string;
  };
  size?: number;
  strokeWidth?: number;
}

export default function SkillRing({
  skill,
  size = 64,
  strokeWidth = 4,
}: SkillRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Reanimated shared value to track the exact XP percentage
  const fillPercentage = useSharedValue(0);

  useEffect(() => {
    // Whenever XP changes, animate the shared value
    // We cap it at 1 (100%) so it doesn't break the circle if you over-level
    const targetPercent = Math.min(skill.xp / skill.max_xp, 1);
    fillPercentage.value = withSpring(targetPercent, {
      damping: 15,
      stiffness: 90,
    });
  }, [skill.xp, skill.max_xp]);

  // Map the percentage to the SVG stroke offset
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset =
      circumference - circumference * fillPercentage.value;
    return { strokeDashoffset };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* The background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* The animated XP fill */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={skill.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>

      <View style={styles.innerCore}>
        <Text style={[styles.levelText, { color: skill.color }]}>
          L{skill.level}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    // Rotate the SVG so the progress ring starts at the top (12 o'clock)
    transform: [{ rotate: "-90deg" }],
  },
  innerCore: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "800",
  },
});
