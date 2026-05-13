import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function checkModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  console.log("🔑 Using Key:", process.env.GEMINI_API_KEY ? "Loaded (Starts with " + process.env.GEMINI_API_KEY.substring(0, 5) + ")" : "NOT LOADED");

  try {
    // This calls the API to list what models YOU actually have access to
    // Note: This relies on the Google Cloud project being enabled.
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    console.log("🤖 Attempting generation with 'gemini-pro'...");
    const result = await model.generateContent("Test connection.");
    const response = await result.response;
    console.log("✅ SUCCESS! Response:", response.text());
    
  } catch (error) {
    console.error("❌ FAILED:", error.message);
  }
}

checkModels();