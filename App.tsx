import React, { useEffect, useRef } from "react";
import { AppState, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEngineStore } from "./src/store/useEngineStore";
import { clearDatabase } from "./src/database"; // DEBUG

// 1. IMPORT EXPO ICONS
import { Ionicons } from "@expo/vector-icons";

// IMPORT NOTIFICATIONS
import * as Notifications from "expo-notifications";

// Screens
import Codex from "./src/screens/Codex";
import Completed from "./src/screens/Completed";
import Dashboard from "./src/screens/Dashboard";
import SkillTree from "./src/screens/SkillTree";
import QuestLog from "./src/screens/QuestLog";

const Tab = createBottomTabNavigator();

// Custom Dark Theme for the Navigation Container
const EngineTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#07090f",
  },
};

export default function App() {
  const initEngine = useEngineStore((state) => state.initEngine);
  const tick = useEngineStore((state) => state.tick);
  const getPlumbobStatus = useEngineStore((state) => state.getPlumbobStatus);
  const applyElapsedDecay = useEngineStore((state) => state.applyElapsedDecay);
  const setLastUpdatedAt = useEngineStore((state) => state.setLastUpdatedAt);
  const lastUpdatedAt = useEngineStore((state) => state.lastUpdatedAt);
  const criticalNotified = useRef(false);
  const currentAppState = useRef(AppState.currentState);
  const lastUpdatedRef = useRef(lastUpdatedAt);
  const hasAppliedInitialDecay = useRef(false);

  useEffect(() => {
    lastUpdatedRef.current = lastUpdatedAt;
  }, [lastUpdatedAt]);

  useEffect(() => {
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Request permissions
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Notification permissions not granted");
      }
    };

    requestPermissions();

    // DEBUG: Uncomment to clear database on every app launch
    // clearDatabase();

    initEngine(); // Fires the Time-Delta math on load
    const interval = setInterval(() => {
      tick();
      // Check for critical status after tick
      const status = getPlumbobStatus();
      if (status === "critical" && !criticalNotified.current) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: "Exodus Engine Alert",
            body: "Your Plumbob needs are in critical condition! Open the app to restore them.",
            sound: "default",
          },
          trigger: null, // immediate
        });
        criticalNotified.current = true;
      } else if (status !== "critical") {
        criticalNotified.current = false; // reset when no longer critical
      }
    }, 600000); // 10-minute heartbeat
    return () => clearInterval(interval);
  }, [initEngine, tick, getPlumbobStatus]);

  useEffect(() => {
    // Apply initial decay on app load
    if (!hasAppliedInitialDecay.current && lastUpdatedAt) {
      const now = Date.now();
      const elapsed = now - lastUpdatedAt;
      if (elapsed > 0) {
        applyElapsedDecay(elapsed);
        setLastUpdatedAt(now);
      }
      hasAppliedInitialDecay.current = true;
    }
  }, []); // Empty deps to run only once

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        currentAppState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        const now = Date.now();
        const elapsed = now - (lastUpdatedRef.current || now);
        if (elapsed > 0) {
          applyElapsedDecay(elapsed);
          setLastUpdatedAt(now);
        }
      }

      if (nextState.match(/inactive|background/)) {
        setLastUpdatedAt(Date.now());
      }

      currentAppState.current = nextState;
    });

    return () => subscription.remove();
  }, [applyElapsedDecay, setLastUpdatedAt]);

  return (
    // Wrap everything in the SafeAreaProvider
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#07090f" }}>
        <StatusBar barStyle="light-content" backgroundColor="#07090f" />

        <NavigationContainer theme={EngineTheme}>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                backgroundColor: "#0c0f1a",
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.05)",
                paddingTop: 8,
              },
              tabBarItemStyle: {
                paddingBottom: 4,
              },
              tabBarActiveTintColor: "#00e5b0", // Glowing green for active
              tabBarInactiveTintColor: "rgba(255,255,255,0.3)",
              tabBarLabelStyle: {
                fontSize: 10,
                fontWeight: "800",
                letterSpacing: 1,
              },
            }}
          >
            {/* THE FOUR TABS WITH ICONS */}
            <Tab.Screen
              name="HUD"
              component={Dashboard}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="grid-outline" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Skills"
              component={SkillTree}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons
                    name="git-network-outline"
                    size={size}
                    color={color}
                  />
                ),
              }}
            />
            <Tab.Screen
              name="Quests"
              component={QuestLog}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="map-outline" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Codex"
              component={Codex}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name="terminal-outline" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Completed"
              component={Completed}
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={size}
                    color={color}
                  />
                ),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
