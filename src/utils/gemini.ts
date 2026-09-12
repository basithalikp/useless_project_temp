/**
 * Utility for generating lore using Google Gemini 1.5 Flash.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export interface LoreEntry {
  id: string;
  poiName: string;
  poiType: string;
  narrative: string;
}

export interface Mission {
  targetPOIType: string;
  missionText: string;
}

export interface GeminiResponse {
  narrative: string;
  next_mission_objective: string;
  mission_text: string;
}

export async function generateLoreForPOI(
  poiName: string, 
  poiType: string, 
  lorebook: LoreEntry[],
  activeMission: Mission | null
): Promise<GeminiResponse | null> {
  if (!GEMINI_API_KEY) {
    console.error("Gemini API key is missing!");
    return null;
  }

  // 50% chance for past, 50% chance for future
  const isFuture = Math.random() > 0.5;
  let randomYear: number;
  
  if (isFuture) {
    // Random future year from 2027 to 3000
    randomYear = Math.floor(Math.random() * (3000 - 2027 + 1)) + 2027;
  } else {
    // Random past year from 1000 to 2025
    randomYear = Math.floor(Math.random() * (2025 - 1000 + 1)) + 1000;
  }

  // Decide whether it's past, present, or future context for flavor
  let era = "the past";
  if (randomYear > 2026) era = "the future";
  if (randomYear > 1990 && randomYear <= 2026) era = "recent history";

  const historyContext = lorebook.length > 0 
    ? `\n\nHere is the story so far:\n${lorebook.map(l => `- At a ${l.poiType} named ${l.poiName}: ${l.narrative}`).join('\n')}` 
    : '';

  const missionContext = activeMission
    ? `\n\nThe player is currently on a mission: "${activeMission.missionText}". Incorporate the resolution of this mission into the narrative if the location type matches '${activeMission.targetPOIType}'.`
    : '';

  const prompt = `You are a creative, whimsical storyteller for a location-based adventure game. 
Generate a very short, engaging piece of lore (2 to 3 sentences maximum) about a real-world location.
Location Name: "${poiName}"
Location Type: "${poiType}"

Set the lore specifically in the year ${randomYear} (${era}). 
Make it fit the location type, but add a fictional, adventurous, or mysterious twist. 
Do not include any pleasantries, just the story.${historyContext}${missionContext}

You MUST return your response as a valid JSON object matching exactly this schema:
{
  "narrative": "Your 2-3 sentence lore here.",
  "next_mission_objective": "A common location type string (e.g. 'hotel', 'hospital', 'shop', 'park', 'bank', etc.) that the player must visit next.",
  "mission_text": "A short, 1-sentence prompt telling the player what to do at the next objective."
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      return JSON.parse(text) as GeminiResponse;
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch from Gemini:", error);
    return null;
  }
}
