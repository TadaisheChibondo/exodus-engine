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
  } catch (error) {
    console.error("EXODUS ENGINE ERROR: Neural link failed.", error);
    return null;
  }
};
