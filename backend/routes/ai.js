import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Lazy initialization of Gemini client
let geminiClient = null;
let currentApiKey = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY environment variable is not set");
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  
  // Reinitialize if API key changed
  if (!geminiClient || currentApiKey !== apiKey) {
    const keyPreview = apiKey.substring(0, 10) + "...";
    if (currentApiKey !== apiKey) {
      console.log("🔑 Gemini API key changed, reinitializing client:", keyPreview);
    } else {
      console.log("🔑 Initializing Gemini client with API key:", keyPreview);
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
    currentApiKey = apiKey;
  }
  
  return geminiClient;
}

// Helper function to convert messages to Gemini format
function formatMessagesForGemini(messages) {
  // Gemini uses a different format - we need to convert role-based messages
  // System messages are handled as the first user message with special formatting
  let geminiMessages = [];
  let systemInstruction = null;
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
    } else {
      geminiMessages.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
  }
  
  return { messages: geminiMessages, systemInstruction };
}

// POST /api/ai/analyze - Analyze text message
router.post("/analyze", authenticate, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    // Use Gemini API
    try {
      const client = getGeminiClient();
      const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // System instruction
      const systemInstruction = "You are a medical AI assistant. Provide helpful health information but always recommend consulting with healthcare professionals. Respond in Russian language.";
      
      // Build conversation history for Gemini
      // Gemini requires history to start with 'user' role and alternate user/model
      const historyMessages = [];
      
      if (history && Array.isArray(history) && history.length > 0) {
        for (const h of history) {
          const role = h.role || "user";
          const content = h.content || h.text || "";
          if (content && content.trim()) {
            historyMessages.push({
              role: role === "assistant" ? "model" : "user",
              parts: [{ text: content.trim() }]
            });
          }
        }
      }
      
      // Filter and validate history - must start with 'user' role
      let validHistory = [];
      if (historyMessages.length > 0) {
        // Find first user message index
        let firstUserIndex = historyMessages.findIndex(msg => msg.role === 'user');
        
        if (firstUserIndex >= 0) {
          // Start from first user message
          validHistory = historyMessages.slice(firstUserIndex);
          
          // Ensure history ends with model response (not user)
          // If last message is user, remove it (we'll send current message instead)
          if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
            validHistory = validHistory.slice(0, -1);
          }
        }
        // If no user message found, validHistory stays empty (start fresh)
      }
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 History processing:', {
          inputHistoryLength: history?.length || 0,
          processedHistoryLength: historyMessages.length,
          validHistoryLength: validHistory.length,
          firstRole: validHistory[0]?.role || 'none'
        });
      }

      // Start chat with valid history (if any)
      const chatConfig = {
        systemInstruction: systemInstruction
      };
      
      // Only add history if it's valid and not empty
      if (validHistory.length > 0) {
        chatConfig.history = validHistory;
      }

      const chat = model.startChat(chatConfig);

      // Send the current user message
      const result = await chat.sendMessage(message);
      const response = result.response;
      const text = response.text();

      res.json({ response: text });
    } catch (geminiError) {
      console.error("Gemini API Error:", geminiError);
      console.error("Gemini Error Details:", {
        message: geminiError.message,
        status: geminiError.status,
        code: geminiError.code,
        response: geminiError.response
      });
      
      // Check if it's an authentication error
      if (geminiError.status === 401 || geminiError.status === 403 || geminiError.message?.includes('API key')) {
        console.error("⚠️ Gemini API Key issue detected!");
        return res.status(500).json({ 
          error: "Gemini API authentication failed. Please check API key configuration.",
          details: process.env.NODE_ENV === 'development' ? geminiError.message : undefined
        });
      }
      
      // Check if it's a quota/rate limit error
      if (geminiError.status === 429 || geminiError.message?.includes('quota') || geminiError.message?.includes('rate limit')) {
        console.error("⚠️ Gemini API Quota exceeded!");
        return res.status(500).json({ 
          error: "Gemini API quota exceeded. Please check your Google Cloud account billing and quotas. The AI service is temporarily unavailable.",
          details: process.env.NODE_ENV === 'development' ? geminiError.message : undefined
        });
      }
      
      // Fallback to simple response if API fails
      res.status(500).json({ 
        error: "AI service temporarily unavailable. Please try again later.",
        details: process.env.NODE_ENV === 'development' ? geminiError.message : undefined
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

    // Get Gemini client
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

    let analysis;
    try {
      const prompt = `Analyze the following medical document. Explain results simply. Highlight risks. Respond in Russian language.\n\n${fileText}`;
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      analysis = response.text();
    } catch (geminiError) {
      console.error("Gemini API Error in file analysis:", geminiError);
      
      // Check if it's a quota/rate limit error
      if (geminiError.status === 429 || geminiError.message?.includes('quota') || geminiError.message?.includes('rate limit')) {
        console.error("⚠️ Gemini API Quota exceeded!");
        return res.status(500).json({ 
          error: "Gemini API quota exceeded. Please check your Google Cloud account billing and quotas. The AI service is temporarily unavailable.",
          details: process.env.NODE_ENV === 'development' ? geminiError.message : undefined
        });
      }
      
      // Re-throw to be caught by outer catch
      throw geminiError;
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
      const client = getGeminiClient();
      const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `You are a medical assistant creating a concise summary report for a doctor. 
Create a structured medical consultation summary in Russian language. 
Include: patient information, main complaints/symptoms, conversation summary, 
and recommendations. Keep it professional and concise.

Create a medical consultation summary for patient ${userName || "Patient"} based on this conversation:

${conversation}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const report = response.text();

      res.json({ report });
    } catch (geminiError) {
      console.error("Gemini API Error:", geminiError);
      
      // Check if it's a quota/rate limit error
      if (geminiError.status === 429 || geminiError.message?.includes('quota') || geminiError.message?.includes('rate limit')) {
        console.error("⚠️ Gemini API Quota exceeded!");
        return res.status(500).json({ 
          error: "Gemini API quota exceeded. Please check your Google Cloud account billing and quotas. The AI service is temporarily unavailable.",
          details: process.env.NODE_ENV === 'development' ? geminiError.message : undefined
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

    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Create a short structured medical summary for a doctor in Russian language.

${conversation}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text();

    res.json({
      summary: summary
    });
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
