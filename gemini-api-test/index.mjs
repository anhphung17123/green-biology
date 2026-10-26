import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

if (!apiKey) {
  console.error('❌ Missing GEMINI_API_KEY in .env');
  process.exit(1);
}

async function main() {
  console.log(`Testing Gemini model: ${model}`);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are a helpful AI assistant.' }] },
        contents: [{ role: 'user', parts: [{ text: 'Reply in Vietnamese. Say hello and confirm that the Gemini API is working. Keep it under 50 words.' }] }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${payload.error?.message || 'Unknown Gemini error'}`);
    const answer = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('');
    console.log(answer || '(No text returned)');
  } catch (error) {
    console.error('❌ Gemini API request failed:', error.message);
    process.exitCode = 1;
  }
}

main();
