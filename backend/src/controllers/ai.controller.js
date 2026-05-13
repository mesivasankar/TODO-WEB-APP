import { GoogleGenerativeAI } from "@google/generative-ai";

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
  DAILY_LIMIT: 5,        // Max 5 requests per day
  MINUTE_WINDOW: 60 * 1000,        // 1 minute in ms
  DAILY_WINDOW: 24 * 60 * 60 * 1000 // 24 hours in ms
};

function checkRateLimit(userId) {
  // 1. SKIP CHECKS if we are in "Development" mode (Local Testing)
  // You can toggle this in your .env file
  if (process.env.NODE_ENV !== 'production') {
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
    return { allowed: false, error: "Daily limit reached (5/day). Try again tomorrow." };
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
    const { taskTitle } = req.body;
    
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
    const prompt = `
      You are a productivity expert. 
      Break down the following task into 3 to 5 small, actionable subtasks.
      Task: "${taskTitle}"
      
      Return ONLY a raw JSON array of strings. 
      Do not include markdown formatting.
      Example output: ["Step 1", "Step 2", "Step 3"]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const subtasks = JSON.parse(text);
    
    return res.json({ subtasks });

  } catch (err) {
    console.error("AI Controller Error:", err);
    // Handle the specific "Quota Exceeded" error from Google
    if (err.status === 429 || err.message?.includes("429")) {
        return res.status(429).json({ message: "System busy. Please try again later." });
    }
    return res.status(500).json({ message: "Failed to generate suggestions" });
  }
}