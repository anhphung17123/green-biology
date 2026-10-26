import "dotenv/config";
import OpenAI from "openai";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

if (!API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  timeout: 30_000,
  maxRetries: 0,
});

async function main() {
  console.log("====================================");
  console.log("       GEMINI API CONNECTION TEST");
  console.log("====================================");
  console.log(`Model: ${MODEL}`);
  console.log("Sending request...\n");

  const startedAt = Date.now();

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant.",
        },
        {
          role: "user",
          content:
            "Reply in Vietnamese. Say hello and confirm that the Gemini API is working. Keep it under 50 words.",
        },
      ],
    });

    const elapsed = Date.now() - startedAt;
    const answer = response.choices?.[0]?.message?.content;

    console.log("✅ API REQUEST SUCCESSFUL");
    console.log("------------------------------------");
    console.log("Response:");
    console.log(answer ?? "(No text returned)");
    console.log("------------------------------------");
    console.log(`Model returned: ${response.model}`);
    console.log(`Time elapsed: ${elapsed} ms`);

    if (response.usage) {
      console.log("Token usage:", response.usage);
    }

    console.log("\nYour Gemini API key can make requests.");
  } catch (error) {
    console.error("\n❌ API REQUEST FAILED");

    if (error.status === 400) {
      console.error("Bad request. Check the model name and request.");
    } else if (error.status === 401 || error.status === 403) {
      console.error("Authentication or permission error.");
      console.error("Check your API key and account permissions.");
    } else if (error.status === 404) {
      console.error("Model or endpoint not found.");
      console.error("Check the model name and API compatibility.");
    } else if (error.status === 429) {
      console.error("Rate limit or quota exceeded.");
      console.error("Check your Gemini API quota and billing settings.");
    } else if (
      error.code === "ETIMEDOUT" ||
      error.name === "APIConnectionTimeoutError"
    ) {
      console.error("Request timed out. Try again later.");
    } else if (error.status) {
      console.error(`HTTP status: ${error.status}`);
      console.error(error.message);
    } else {
      console.error("Connection error or unexpected failure.");
      console.error(error.message);
    }

    // Do not print the API key or request headers.
    process.exitCode = 1;
  }
}

main();
