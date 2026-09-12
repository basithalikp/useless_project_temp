const apiKey = process.env.VITE_GEMINI_API_KEY;

async function run() {
  const prompt = "Hello";
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        })
      }
    );
    console.log("Status:", response.status);
    const data = await response.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
run();
