import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Needs {
  restoration: number;
  vitality: number;
  connectivity: number;
  stimulation: number;
}

interface EngineState {
  needs: Needs;
  lastUpdatedAt: number;
  initEngine: () => void;
  modifyNeed: (need: keyof Needs, amount: number) => void;
  tick: () => void; // The Heartbeat
  applyElapsedDecay: (elapsedMs: number) => void;
  setLastUpdatedAt: (timestamp: number) => void;
  getPlumbobStatus: () => "optimal" | "warning" | "critical";
}

const secondDecayRates = {
  restoration: 0.1 / 60, // ~0.001667 per second
  vitality: 0.2 / 60, // ~0.003333 per second
  connectivity: 0.1 / 60, // ~0.001667 per second
  stimulation: 0.15 / 60, // ~0.0025 per second
};

export const useEngineStore = create<EngineState>()(
  persist(
    (set, get) => ({
      // Starting values
      needs: {
        restoration: 100,
        vitality: 50,
        connectivity: 50,
        stimulation: 80,
      },
      lastUpdatedAt: Date.now(),

      initEngine: () => {
        console.log("EXODUS ENGINE: Time-Delta systems initialized.");
      },

      modifyNeed: (need, amount) => {
        set((state) => {
          const newNeeds = { ...state.needs };
          newNeeds[need] = Math.max(
            0,
            Math.min(100, state.needs[need] + amount),
          );

          // Apply trade-offs when increasing needs
          if (amount > 0) {
            if (need === "stimulation") {
              // Drains restoration (mental fatigue) and connectivity (isolation)
              newNeeds.restoration = Math.max(
                0,
                newNeeds.restoration - amount * 0.5,
              );
              newNeeds.connectivity = Math.max(
                0,
                newNeeds.connectivity - amount * 0.3,
              );
            } else if (need === "vitality") {
              // Drains restoration (physical fatigue)
              newNeeds.restoration = Math.max(
                0,
                newNeeds.restoration - amount * 0.4,
              );
            } else if (need === "connectivity") {
              // Drains restoration (social battery depletion)
              newNeeds.restoration = Math.max(
                0,
                newNeeds.restoration - amount * 0.2,
              );
            } else if (need === "restoration") {
              // Drains vitality a little
              newNeeds.vitality = Math.max(0, newNeeds.vitality - amount * 0.1);
            }
          }

          return { needs: newNeeds };
        });
      },

      // THE HEARTBEAT: Drains needs over time
      tick: () => {
        const now = Date.now();
        const elapsedSeconds = 600; // 10 minutes
        set((state) => ({
          needs: {
            restoration: Math.max(
              0,
              state.needs.restoration -
                secondDecayRates.restoration * elapsedSeconds,
            ),
            vitality: Math.max(
              0,
              state.needs.vitality - secondDecayRates.vitality * elapsedSeconds,
            ),
            connectivity: Math.max(
              0,
              state.needs.connectivity -
                secondDecayRates.connectivity * elapsedSeconds,
            ),
            stimulation: Math.max(
              0,
              state.needs.stimulation -
                secondDecayRates.stimulation * elapsedSeconds,
            ),
          },
          lastUpdatedAt: now,
        }));
      },

      applyElapsedDecay: (elapsedMs) => {
        if (elapsedMs <= 0) return;
        const elapsedSeconds = elapsedMs / 1000;

        set((state) => ({
          needs: {
            restoration: Math.max(
              0,
              state.needs.restoration -
                secondDecayRates.restoration * elapsedSeconds,
            ),
            vitality: Math.max(
              0,
              state.needs.vitality - secondDecayRates.vitality * elapsedSeconds,
            ),
            connectivity: Math.max(
              0,
              state.needs.connectivity -
                secondDecayRates.connectivity * elapsedSeconds,
            ),
            stimulation: Math.max(
              0,
              state.needs.stimulation -
                secondDecayRates.stimulation * elapsedSeconds,
            ),
          },
        }));
      },

      setLastUpdatedAt: (timestamp) => {
        set(() => ({ lastUpdatedAt: timestamp }));
      },

      getPlumbobStatus: () => {
        const { restoration, vitality, connectivity, stimulation } =
          get().needs;
        const average =
          (restoration + vitality + connectivity + stimulation) / 4;

        if (average >= 65) return "optimal";
        if (average >= 35) return "warning";
        return "critical";
      },
    }),
    {
      name: "engine-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        needs: state.needs,
        lastUpdatedAt: state.lastUpdatedAt,
      }),
    },
  ),
);
