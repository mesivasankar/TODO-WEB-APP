import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("❌ ERROR: GEMINI_API_KEY is missing from .env file");
  process.exit(1);
}

console.log(`🔑 Testing Key: ${API_KEY.substring(0, 5)}...`);

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("\n❌ API Error:", data.error.message);
      return;
    }

    if (!data.models) {
      console.log("\n⚠️ No models found. Is the API enabled?");
      return;
    }

    console.log("\n✅ AVAILABLE MODELS FOR YOUR KEY:");
    console.log("-----------------------------------");
    data.models.forEach(m => {
      // We only care about models that support 'generateContent'
      if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
        console.log(`- ${m.name.replace("models/", "")}`);
      }
    });
    console.log("-----------------------------------");

  } catch (error) {
    console.error("\n❌ Network Error:", error.message);
  }
}

listModels();