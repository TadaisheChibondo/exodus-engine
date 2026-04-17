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
  initEngine: () => void;
  modifyNeed: (need: keyof Needs, amount: number) => void;
  tick: () => void; // The Heartbeat
  getPlumbobStatus: () => "optimal" | "warning" | "critical";
}

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

      initEngine: () => {
        console.log("EXODUS ENGINE: Time-Delta systems initialized.");
        // Needs are now loaded automatically by persist middleware
      },

      modifyNeed: (need, amount) => {
        set((state) => ({
          needs: {
            ...state.needs,
            // Clamp values strictly between 0 and 100
            [need]: Math.max(0, Math.min(100, state.needs[need] + amount)),
          },
        }));
      },

      // THE HEARTBEAT: Drains needs over time
      tick: () => {
        set((state) => ({
          needs: {
            // 👇 Now drains 1 point per tick
            restoration: Math.max(0, state.needs.restoration - 1),
            vitality: Math.max(0, state.needs.vitality - 2),
            connectivity: Math.max(0, state.needs.connectivity - 1),
            stimulation: Math.max(0, state.needs.stimulation - 1.5),
          },
        }));
      },

      getPlumbobStatus: () => {
        const { restoration, vitality, connectivity, stimulation } =
          get().needs;
        // Calculate the average of all your needs
        const average =
          (restoration + vitality + connectivity + stimulation) / 4;

        if (average >= 65) return "optimal"; // Green
        if (average >= 35) return "warning"; // Yellow
        return "critical"; // Red
      },
    }),
    {
      name: "engine-storage", // unique name
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ needs: state.needs }), // only persist needs
    },
  ),
);
