const apiKey = process.env.VITE_GEMINI_API_KEY;

async function run() {
  const prompt = `You are a creative, whimsical storyteller for a location-based adventure game. 
Generate a very short, engaging piece of lore (2 to 3 sentences maximum) about a real-world location.
Location Name: "Central Park"
Location Type: "park"

Set the lore specifically in the year 2045 (the future). 
Make it fit the location type, but add a fictional, adventurous, or mysterious twist. 
Do not include any pleasantries, just the story.

You MUST return your response as a valid JSON object matching exactly this schema:
{
  "narrative": "Your 2-3 sentence lore here.",
  "next_mission_objective": "A common location type string (only allowed to take values : 'hotel', 'hospital', 'market', 'park', 'bank', 'school', 'museum', 'landmark') that the player must visit next.",
  "mission_text": "A short, 1-sentence prompt telling the player what to do at the next objective."
}`;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json"
          }
        })
      }
    );
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Raw Response:", text);
    try {
      const data = JSON.parse(text);
      console.log("Data:", data.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch(e){}
  } catch (err) {
    console.error(err);
  }
}
run();
