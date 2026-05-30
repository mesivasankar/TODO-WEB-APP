import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use the alias that always points to the free tier model
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

/* ============================================================
   🛑 RATE LIMITING SYSTEM (In-Memory)
   Tracks usage per user to prevent abuse.
   Refreshes automatically when server restarts.
   ============================================================ */
const usageTracker = new Map();

const RATE_LIMITS = {
  MINUTE_LIMIT: 2,       // Max 2 requests per minute
  DAILY_LIMIT: 50,       // Max 50 requests per day
  MINUTE_WINDOW: 60 * 1000,        // 1 minute in ms
  DAILY_WINDOW: 24 * 60 * 60 * 1000 // 24 hours in ms
};

function checkRateLimit(userId) {
  // 1. SKIP CHECKS if we are in "Development" mode (Local Testing)
  // You can toggle this in your .env file
  if (!env.isProduction) {
    return { allowed: true };
  }

  const now = Date.now();

  // Get existing record or create new one
  if (!usageTracker.has(userId)) {
    usageTracker.set(userId, {
      minuteCount: 0,
      minuteStart: now,
      dayCount: 0,
      dayStart: now
    });
  }

  const userUsage = usageTracker.get(userId);

  // 2. RESET COUNTERS if windows have passed

  // Reset Minute Counter if > 1 minute passed
  if (now - userUsage.minuteStart > RATE_LIMITS.MINUTE_WINDOW) {
    userUsage.minuteCount = 0;
    userUsage.minuteStart = now;
  }

  // Reset Day Counter if > 24 hours passed
  if (now - userUsage.dayStart > RATE_LIMITS.DAILY_WINDOW) {
    userUsage.dayCount = 0;
    userUsage.dayStart = now;
  }

  // 3. CHECK LIMITS
  if (userUsage.minuteCount >= RATE_LIMITS.MINUTE_LIMIT) {
    return { allowed: false, error: "Too many requests! Please wait a moment." };
  }

  if (userUsage.dayCount >= RATE_LIMITS.DAILY_LIMIT) {
    return { allowed: false, error: "Daily limit reached (50/day). Try again tomorrow." };
  }

  // 4. INCREMENT COUNTS (If allowed)
  userUsage.minuteCount++;
  userUsage.dayCount++;

  return { allowed: true };
}

/* ============================================================
   CONTROLLER FUNCTION
   ============================================================ */
export async function suggestSubtasks(req, res, next) {
  try {
    const { taskTitle, instruction } = req.body;

    // We assume req.user exists because of 'requireAuth' middleware
    const userId = req.user?.id || "anonymous";

    // 🔥 STEP 1: Check Rate Limits
    const limitCheck = checkRateLimit(userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({ message: limitCheck.error });
    }

    if (!taskTitle) {
      return res.status(400).json({ message: "Task title is required" });
    }

    // 🔥 STEP 2: Call AI
    let prompt = `
      You are a productivity expert. 
      Break down the following task into 3 to 5 small, actionable subtasks.
      Task: "${taskTitle}"
    `;

    if (instruction && instruction.trim()) {
      prompt += `\nAdjust the steps based on this user feedback: "${instruction.trim()}".`;
    }

    prompt += `
      
      Return ONLY a raw JSON array of strings. 
      Do not include markdown formatting.
      Example output: ["Step 1", "Step 2", "Step 3"]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const subtasks = JSON.parse(text);

    const userUsage = usageTracker.get(userId) || { dayCount: 0 };
    const remaining = Math.max(0, RATE_LIMITS.DAILY_LIMIT - userUsage.dayCount);

    return res.json({ 
      subtasks,
      dailyLimit: RATE_LIMITS.DAILY_LIMIT,
      dailyRemaining: env.isProduction ? remaining : RATE_LIMITS.DAILY_LIMIT,
      isProduction: env.isProduction
    });

  } catch (err) {
    console.error("AI Controller Error:", err);
    // Handle the specific "Quota Exceeded" error from Google
    if (err.status === 429 || err.message?.includes("429")) {
      return res.status(429).json({ message: "System busy. Please try again later." });
    }
    return res.status(500).json({ message: "Failed to generate suggestions" });
  }
}

export async function getAiUsage(req, res, next) {
  try {
    const userId = req.user?.id || "anonymous";
    const userUsage = usageTracker.get(userId) || { dayCount: 0 };
    const remaining = Math.max(0, RATE_LIMITS.DAILY_LIMIT - userUsage.dayCount);
    return res.json({
      dailyLimit: RATE_LIMITS.DAILY_LIMIT,
      dailyRemaining: env.isProduction ? remaining : RATE_LIMITS.DAILY_LIMIT,
      isProduction: env.isProduction
    });
  } catch (error) {
    next(error);
  }
}