const apiKey = process.env.VITE_GEMINI_API_KEY;

async function run() {
  const prompt = "Output JSON with { key: 'value' }";
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );
    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Raw Response:", text);
  } catch (err) {
    console.error(err);
  }
}
run();
