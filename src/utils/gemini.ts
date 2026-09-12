/**
 * Utility for generating lore using Google Gemini 1.5 Flash.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function generateLoreForPOI(poiName: string, poiType: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error("Gemini API key is missing!");
    return "The ancient texts are silent. (Missing API Key)";
  }

  // Generate a random year from 1000 to 2200
  const randomYear = Math.floor(Math.random() * (2200 - 1000 + 1)) + 1000;

  // Decide whether it's past, present, or future context for flavor
  let era = "the past";
  if (randomYear > 2026) era = "the future";
  if (randomYear > 1990 && randomYear <= 2026) era = "recent history";

  const prompt = `You are a creative, whimsical storyteller for a location-based adventure game. 
Generate a very short, engaging piece of lore (2 to 3 sentences maximum) about a real-world location.
Location Name: "${poiName}"
Location Type: "${poiType}"

Set the lore specifically in the year ${randomYear} (${era}). 
Make it fit the location type, but add a fictional, adventurous, or mysterious twist. 
Do not include any pleasantries, just the story.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status);
      return "The mystical energies are distorted right now. Cannot reveal lore.";
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return text || "The lore for this place remains a mystery.";
  } catch (error) {
    console.error("Failed to fetch from Gemini:", error);
    return "The connection to the ethereal plane was lost.";
  }
}
