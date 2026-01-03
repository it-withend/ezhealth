import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Lazy initialization of OpenRouter client
let openaiClient = null;
let currentApiKey = null;

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY environment variable is not set");
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }
  
  // Reinitialize if API key changed
  if (!openaiClient || currentApiKey !== apiKey) {
    const keyPreview = apiKey.substring(0, 10) + "...";
    if (currentApiKey !== apiKey) {
      console.log("🔑 OpenRouter API key changed, reinitializing client:", keyPreview);
    } else {
      console.log("🔑 Initializing OpenRouter client with API key:", keyPreview);
    }
    
    // OpenRouter uses OpenAI-compatible format
    openaiClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_REFERRER || "https://github.com",
        "X-Title": "EZ Health App"
      }
    });
    currentApiKey = apiKey;
  }
  
  return openaiClient;
}

// Get model name from env or use default free model
function getModel() {
  return process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";
}

// POST /api/ai/analyze - Analyze text message
router.post("/analyze", authenticate, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    try {
      const client = getOpenRouterClient();
      const model = getModel();
      
      // Build messages array
      const messages = [
        { 
          role: "system", 
          content: "You are a medical AI assistant. Provide helpful health information but always recommend consulting with healthcare professionals. Respond in the same language as the user." 
        }
      ];

      // Add history if provided
      if (history && Array.isArray(history)) {
        for (const h of history) {
          const role = h.role || "user";
          const content = h.content || h.text || "";
          if (content && content.trim()) {
            messages.push({
              role: role === "assistant" ? "assistant" : "user",
              content: content.trim()
            });
          }
        }
      }
      
      // Add current user message
      messages.push({
        role: "user",
        content: message
      });

      const completion = await client.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.7
      });

      const response = completion.choices[0].message.content;
      res.json({ response });
    } catch (openrouterError) {
      console.error("OpenRouter API Error:", openrouterError);
      console.error("OpenRouter Error Details:", {
        message: openrouterError.message,
        status: openrouterError.status,
        code: openrouterError.code,
        response: openrouterError.response?.data
      });
      
      // Check if it's an authentication error
      if (openrouterError.status === 401 || openrouterError.status === 403 || openrouterError.message?.includes('api key')) {
        console.error("⚠️ OpenRouter API Key issue detected!");
        return res.status(500).json({ 
          error: "OpenRouter API authentication failed. Please check API key configuration.",
          details: process.env.NODE_ENV === 'development' ? openrouterError.message : undefined
        });
      }
      
      // Check if it's a quota/rate limit error
      if (openrouterError.status === 429 || openrouterError.message?.includes('quota') || openrouterError.message?.includes('rate limit')) {
        console.error("⚠️ OpenRouter API Quota exceeded!");
        return res.status(500).json({ 
          error: "OpenRouter API quota exceeded. Please check your account limits. The AI service is temporarily unavailable.",
          details: process.env.NODE_ENV === 'development' ? openrouterError.message : undefined
        });
      }
      
      res.status(500).json({ 
        error: "AI service temporarily unavailable. Please try again later.",
        details: process.env.NODE_ENV === 'development' ? openrouterError.message : undefined
      });
    }
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/analyze-file - Analyze uploaded file
router.post("/analyze-file", authenticate, upload.single("file"), async (req, res) => {
  let filePath = null;
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    filePath = req.file.path;

    // Read file with error handling
    let fileText;
    try {
      fileText = fs.readFileSync(filePath, "utf8");
    } catch (readError) {
      return res.status(400).json({ error: "Failed to read file", details: readError.message });
    }

    // Get OpenRouter client
    const client = getOpenRouterClient();
    const model = getModel();

    let analysis;
    try {
      const prompt = `Analyze the following medical document. Explain results simply. Highlight risks. Respond in the same language as the document.\n\n${fileText}`;
      
      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are a medical document analyzer. Analyze medical documents and explain results in simple terms."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      });
      
      analysis = completion.choices[0].message.content;
    } catch (openrouterError) {
      console.error("OpenRouter API Error in file analysis:", openrouterError);
      
      // Check if it's a quota/rate limit error
      if (openrouterError.status === 429 || openrouterError.message?.includes('quota') || openrouterError.message?.includes('rate limit')) {
        console.error("⚠️ OpenRouter API Quota exceeded!");
        return res.status(500).json({ 
          error: "OpenRouter API quota exceeded. Please check your account limits. The AI service is temporarily unavailable.",
          details: process.env.NODE_ENV === 'development' ? openrouterError.message : undefined
        });
      }
      
      // Re-throw to be caught by outer catch
      throw openrouterError;
    }

    // Clean up uploaded file
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      console.warn("Failed to cleanup file:", cleanupError);
    }

    res.json({ analysis });
  } catch (error) {
    // Clean up file on error
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn("Failed to cleanup file on error:", cleanupError);
      }
    }
    
    console.error("File analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Generate doctor's report
router.post("/generate-report", authenticate, async (req, res) => {
  try {
    const { messages, userName } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: "Missing messages" });
    }

    // Format conversation for AI
    const conversation = messages
      .map(m => `${m.sender === "user" ? "Patient" : "AI Assistant"}: ${m.text}`)
      .join("\n");

    try {
      const client = getOpenRouterClient();
      const model = getModel();
      
      const prompt = `You are a medical assistant creating a concise summary report for a doctor. 
Create a structured medical consultation summary in Russian language. 
Include: patient information, main complaints/symptoms, conversation summary, 
and recommendations. Keep it professional and concise.

Create a medical consultation summary for patient ${userName || "Patient"} based on this conversation:

${conversation}`;

      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: "You are a medical assistant creating concise summary reports for doctors."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const report = completion.choices[0].message.content;
      res.json({ report });
    } catch (openrouterError) {
      console.error("OpenRouter API Error:", openrouterError);
      
      // Check if it's a quota/rate limit error
      if (openrouterError.status === 429 || openrouterError.message?.includes('quota') || openrouterError.message?.includes('rate limit')) {
        console.error("⚠️ OpenRouter API Quota exceeded!");
        return res.status(500).json({ 
          error: "OpenRouter API quota exceeded. Please check your account limits. The AI service is temporarily unavailable.",
          details: process.env.NODE_ENV === 'development' ? openrouterError.message : undefined
        });
      }
      
      // Fallback to simple report
      const simpleReport = `
СВОДКА МЕДИЦИНСКОЙ КОНСУЛЬТАЦИИ
============================
Дата: ${new Date().toLocaleDateString('ru-RU')}
Пациент: ${userName || "Пациент"}

СВОДКА РАЗГОВОРА:
${conversation}

РЕКОМЕНДАЦИИ:
- Регулярный мониторинг здоровья
- Следование предписанным лекарствам
- Поддержание здорового образа жизни
- Запись на повторную консультацию

Примечание: Это AI-сгенерированная сводка только для справки. Пожалуйста, проконсультируйтесь с медицинскими специалистами для правильной диагностики и лечения.
      `;
      res.json({ report: simpleReport });
    }
  } catch (error) {
    console.error("Generate report error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/summary
 * body: { conversation }
 */
router.post("/summary", authenticate, async (req, res) => {
  try {
    const { conversation } = req.body;

    if (!conversation) {
      return res.status(400).json({ error: "Missing conversation" });
    }

    const client = getOpenRouterClient();
    const model = getModel();
    
    const prompt = `Create a short structured medical summary for a doctor in Russian language.

${conversation}`;

    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a medical assistant creating short structured summaries for doctors."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    });

    const summary = completion.choices[0].message.content;

    res.json({
      summary: summary
    });
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
