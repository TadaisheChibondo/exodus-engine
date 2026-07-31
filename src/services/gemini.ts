import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Securely load the API key from your .env vault
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("EXODUS ENGINE WARNING: Gemini API Key is missing from .env");
}

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(apiKey || "");

export const generateSkillBlueprint = async (skillName: string) => {
  try {
    console.log(
      `EXODUS ENGINE: Initiating neural link for skill blueprint: [${skillName}]...`,
    );

    // We use gemini-2.5-flash because it is lightning fast and perfect for structured data
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        // 🚀 THE MAGIC: This forces the AI to output pure, parseable JSON
        responseMimeType: "application/json",
      },
    });

    // 2. The Strict System Prompt
    const prompt = `
      You are an expert game designer and life-coach AI running inside the 'Exodus Engine'.
      Your objective is to generate a comprehensive, 10-level progression blueprint for a user trying to master the following skill: "${skillName}".

      Rules:
      1. Break the skill down into 10 logical levels.
      2. For each level, provide 2 to 4 actionable, real-world activities.
      3. Assign an XP bounty to each activity (e.g., 100 to 1000 XP based on difficulty).
      4. Assign a 'recommended_need' to each activity. This must be exactly one of the following strings: "stimulation", "vitality", "connectivity", or "restoration". (e.g., coding is "stimulation", going to a meetup is "connectivity").
      5. Return ONLY valid JSON matching this exact structure:

      {
        "skill_name": "${skillName}",
        "total_levels": 10,
        "progression_rules": "A short, motivating paragraph explaining how to progress through these levels.",
        "roadmap": [
          {
            "level": 1,
            "milestone": "Name of the milestone (e.g., The Fundamentals)",
            "activities": [
              {
                "name": "Specific actionable task",
                "xp": 500,
                "recommended_need": "stimulation"
              }
            ]
          }
        ]
      }
    `;

    // 3. Execute the payload
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // 4. Parse and return the structured data
    const blueprint = JSON.parse(responseText);
    console.log("EXODUS ENGINE: Blueprint acquired and verified.");

    return blueprint;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    console.error("EXODUS ENGINE ERROR: Neural link failed.", message, error);
    throw new Error(
      `Gemini error: ${message || "Unknown error from AI service."}`,
    );
  }
};

// Add this to your existing src/services/gemini.ts

interface CoachAnalyticsInput {
  needs: {
    restoration: number;
    vitality: number;
    connectivity: number;
    stimulation: number;
  };
  activeSkills: Array<{ name: string; level: number; xp: number }>;
  recentTasks: Array<{ name: string; status: string; task_type: string }>;
  completionRate: number;
  totalXpEarned: number;
}

export interface CoachResponse {
  synergyName: string;
  synergyDescription: string;
  honestOpinion: string;
  sixMonthSimulation: string;
}

export async function generateCoachFeedback(
  analytics: CoachAnalyticsInput,
): Promise<CoachResponse> {
  // Pull your existing API key configuration or environment variables
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Neural Link Offline: Gemini API Key missing from environment.",
    );
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const systemInstructions = `
    You are the Core Directive Engine of the Exodus OS—a rigorous, highly observant, and deeply insightful life coach modeled after ultimate personal discipline and strategic mastery. You treat the user's life data like a complex production system. 
    
    Analyze the raw metrics provided. Your feedback must be completely honest, unvarnished, and tactical. Strip away hollow platitudes. Focus intensely on raw trajectory, execution density, and resource depletion.

    You must output a strictly structured JSON object containing exactly these four keys:
    1. "synergyName": An RPG-style hybrid class name discovering cross-discipline connections from their active skills list (e.g., if they have "Coding" and "Chess", call them a "Neural Architect" or "Algorithmic Grandmaster").
    2. "synergyDescription": A short breakdown explaining why these specific skills synthesize powerfully.
    3. "honestOpinion": A sharp, direct assessment of their current completion rate, task balance, and neglected needs. Speak directly to their discipline and focus.
    4. "sixMonthSimulation": A predictive simulation calculating precisely where they will stand in 6 months if they continue running on their current exact trajectory and completion rate.
  `;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: systemInstructions },
            {
              text: `Current System Analytics Data Matrix:\n${JSON.stringify(analytics, null, 2)}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Neural Link Error: System returned status ${response.status}`,
    );
  }

  const json = await response.json();
  const rawText = json.candidates[0].content.parts[0].text;

  return JSON.parse(rawText) as CoachResponse;
}
