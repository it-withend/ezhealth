import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { authenticate } from '../middleware/auth.js';
import { dbRun, dbAll } from '../database.js';

// Helper to get file extension
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Lazy initialization of Poe API client
let openaiClient = null;
let currentApiKey = null;

function getPoeClient() {
  const apiKey = process.env.POE_API_KEY;
  
  if (!apiKey) {
    console.error("❌ POE_API_KEY environment variable is not set");
    throw new Error("POE_API_KEY environment variable is not set");
  }
  
  // Reinitialize if API key changed
  if (!openaiClient || currentApiKey !== apiKey) {
    const keyPreview = apiKey.substring(0, 10) + "...";
    if (currentApiKey !== apiKey) {
      console.log("🔑 Poe API key changed, reinitializing client:", keyPreview);
    } else {
      console.log("🔑 Initializing Poe API client with API key:", keyPreview);
    }
    
    // Poe uses OpenAI-compatible API format
    openaiClient = new OpenAI({
      baseURL: "https://api.poe.com/v1",
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.POE_REFERRER || "https://github.com",
        "X-Title": "EZ Health App"
      }
    });
    currentApiKey = apiKey;
  }
  
  return openaiClient;
}

// Get model name from env or use default Poe model
// Poe supports many models: Claude-Opus-4.1, Claude-Sonnet-4, Gemini-2.5-Pro, GPT-4o, etc.
function getModel() {
  return process.env.POE_MODEL || "Claude-Sonnet-4";
}

// Detect language from text
function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'Russian';
  
  const lowerText = text.toLowerCase();
  
  // Check for Uzbek (Cyrillic or Latin)
  const uzbekPatterns = [
    /[ўқғҳ]/,
    /(salom|yaxshi|yomon|davolanish|bemor|shifokor|tibbiy)/i,
    /(men|sen|u|biz|siz|ular)/i
  ];
  if (uzbekPatterns.some(p => p.test(lowerText))) {
    return 'Uzbek';
  }
  
  // Check for English
  const englishPatterns = [
    /(the|and|is|are|was|were|have|has|will|would|should|can|could)/i,
    /(hello|hi|help|doctor|medical|health|symptom|pain|treatment)/i
  ];
  if (englishPatterns.some(p => p.test(lowerText))) {
    return 'English';
  }
  
  // Check for Russian (Cyrillic)
  const russianPatterns = [
    /[а-яё]/i,
    /(привет|здравствуйте|помощь|врач|медицинский|здоровье|симптом|боль|лечение)/i
  ];
  if (russianPatterns.some(p => p.test(lowerText))) {
    return 'Russian';
  }
  
  // Default to Russian
  return 'Russian';
}

// List of models from Poe API (https://api.poe.com/v1)
// Models are separated into multimodal (support images/files) and text-only

// Poe API models - all models support text, many support images/files
// Poe provides access to hundreds of models through a single API
// MULTIMODAL MODELS: Can analyze text, images, files and respond with text
// These models support image input and can process photos/documents
// Used ONLY in chat with file/image upload capability
const MULTIMODAL_MODELS = [
  "GPT-4o",                    // GPT-4o - multimodal, supports images
  "Claude-Opus-4.1",           // Claude Opus 4.1 - multimodal
  "Claude-Sonnet-4",           // Claude Sonnet 4 - multimodal
  "Gemini-2.5-Pro",            // Gemini 2.5 Pro - multimodal
  "Gemini-2.0-Flash",          // Gemini 2.0 Flash - multimodal
];

// TEXT-ONLY MODELS: Can analyze only text and respond with text
// Used in regular text chat (all models: multimodal + text-only)
// Note: Most Poe models are multimodal, but some are text-only
const TEXT_ONLY_MODELS = [
  "Claude-Haiku-4",            // Claude Haiku 4 - fast text model
  "Llama-3.1-405B",            // Llama 3.1 405B - large text model
  "Grok-4",                    // Grok 4 - text model
  "GPT-4o-mini",                // GPT-4o Mini - smaller text model
];

// Combined list for regular text chat: multimodal first, then text-only
// This is used for regular text chat (tryWithFallback) - includes ALL models
// For file/image uploads, use tryWithFallbackForFile which uses ONLY MULTIMODAL_MODELS
const FALLBACK_MODELS = [...MULTIMODAL_MODELS, ...TEXT_ONLY_MODELS];

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Try to get response with fallback models
async function tryWithFallback(client, messages, systemMessage = null) {
  const modelsToTry = [getModel(), ...FALLBACK_MODELS.filter(m => m !== getModel())];
  
  let lastError = null;
  let rateLimitedModels = [];
  
  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    
    try {
      console.log(`🔄 Trying model: ${model} (${i + 1}/${modelsToTry.length})`);
      
      const messageArray = systemMessage 
        ? [{ role: "system", content: systemMessage }, ...messages]
        : messages;
      
      const completion = await client.chat.completions.create({
        model: model,
        messages: messageArray,
        temperature: 0.7
      });
      
      console.log(`✅ Success with model: ${model}`);
      return { response: completion.choices[0].message.content, model };
    } catch (error) {
      lastError = error;
      const errorMessage = error.error?.metadata?.raw || error.message || "Unknown error";
      const errorStatus = error.status || error.code;
      
      console.log(`❌ Model ${model} failed:`, errorStatus || errorMessage);
      
      // Check if it's a rate limit error (429) - only then try other models
      const isRateLimit = errorStatus === 429 || 
                         error.message?.includes('rate limit') || 
                         error.message?.includes('rate-limited') ||
                         errorMessage?.includes('rate-limited') ||
                         errorMessage?.includes('rate limit') ||
                         errorMessage?.includes('temporarily rate-limited');
      
      // If it's a 404 (model not found), skip this model and try next
      // Handle 404 (not found) and 400 (invalid model ID) - skip and try next
      if (errorStatus === 404 || errorStatus === 400) {
        const errorType = errorStatus === 404 ? 'not found (404)' : 'invalid model ID (400)';
        console.log(`⚠️ Model ${model} ${errorType}, trying next model`);
        // Add small delay before trying next model
        if (i < modelsToTry.length - 1) {
          await sleep(500);
        }
        continue;
      } else if (isRateLimit) {
        // Track rate-limited models
        rateLimitedModels.push(model);
        console.log(`⏳ Model ${model} rate-limited, trying next model`);
        // Add delay before trying next model (to avoid hitting rate limits)
        if (i < modelsToTry.length - 1) {
          await sleep(1000);
        }
        continue;
      } else {
        // For other errors (not 404, not 429), throw immediately
        console.error(`❌ Non-recoverable error with model ${model}:`, errorStatus, errorMessage);
        throw error;
      }
    }
  }
  
  // If all models failed due to rate limits, provide helpful error
  if (rateLimitedModels.length === modelsToTry.length) {
    const error = new Error("All free models are currently rate-limited. Please try again in a few minutes.");
    error.status = 429;
    error.rateLimitedModels = rateLimitedModels;
    throw error;
  }
  
  // If all models failed, throw the last error
  throw lastError;
}

// GET /api/ai/history - Get chat history
router.get("/history", authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50; // Get last 50 messages by default

    console.log(`📜 Loading chat history for user ${userId}, limit: ${limit}`);

    const history = await dbAll(
      `SELECT id, role, content, created_at 
       FROM ai_chat_history 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );

    console.log(`✅ Found ${history.length} messages in history`);

    // Reverse to get chronological order
    const reversedHistory = history.reverse().map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at
    }));

    res.json({ history: reversedHistory });
  } catch (error) {
    console.error("Error loading chat history:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/ai/history - Clear chat history
router.delete("/history", authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    console.log(`🗑️ Clearing chat history for user ${userId}`);

    await dbRun(
      `DELETE FROM ai_chat_history WHERE user_id = ?`,
      [userId]
    );

    console.log(`✅ Chat history cleared for user ${userId}`);

    res.json({ success: true, message: "Chat history cleared" });
  } catch (error) {
    console.error("Error clearing chat history:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/analyze - Analyze text message
router.post("/analyze", authenticate, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    try {
      const client = getPoeClient();
      
      // Build messages array
      const messages = [];

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

      // Detect user language from the last message
      const userMessage = message || (history && history.length > 0 ? history[history.length - 1].content || history[history.length - 1].text : "");
      const detectedLang = detectLanguage(userMessage);
      
      const systemPrompt = `You are a medical AI assistant. Provide helpful health information but always recommend consulting with healthcare professionals.

CRITICAL: You MUST respond ONLY in ${detectedLang} language. Do NOT mix languages. Do NOT use English words if the user writes in Russian or Uzbek. Use ONLY ${detectedLang} language throughout your entire response. If you need to use medical terms, translate them to ${detectedLang} or provide them with ${detectedLang} explanations.`;

      const result = await tryWithFallback(
        client, 
        messages.filter(m => m.role !== "system"),
        systemPrompt
      );

      const userId = req.userId;
      const aiResponse = result.response;

      // Save user message to database
      try {
        await dbRun(
          `INSERT INTO ai_chat_history (user_id, role, content) VALUES (?, ?, ?)`,
          [userId, 'user', message]
        );
        console.log(`💾 Saved user message to history for user ${userId}`);
      } catch (dbError) {
        console.error("Error saving user message to history:", dbError);
        // Don't fail the request if history save fails
      }

      // Save AI response to database
      try {
        await dbRun(
          `INSERT INTO ai_chat_history (user_id, role, content) VALUES (?, ?, ?)`,
          [userId, 'assistant', aiResponse]
        );
        console.log(`💾 Saved AI response to history for user ${userId}`);
      } catch (dbError) {
        console.error("Error saving AI response to history:", dbError);
        // Don't fail the request if history save fails
      }

      res.json({ response: aiResponse });
    } catch (poeError) {
      console.error("Poe API Error:", poeError);
      console.error("Poe Error Details:", {
        message: poeError.message,
        status: poeError.status,
        code: poeError.code,
        response: poeError.response?.data
      });
      
      // Check if it's an authentication error
      if (poeError.status === 401 || poeError.status === 403 || poeError.message?.includes('api key')) {
        console.error("⚠️ Poe API Key issue detected!");
        return res.status(500).json({ 
          error: "Poe API authentication failed. Please check API key configuration.",
          details: process.env.NODE_ENV === 'development' ? poeError.message : undefined
        });
      }
      
      // Check if it's a quota/rate limit error
      if (poeError.status === 429 || poeError.message?.includes('quota') || poeError.message?.includes('rate limit') || poeError.message?.includes('rate-limited')) {
        console.error("⚠️ Poe API Rate limit exceeded!");
        const errorMessage = poeError.error?.metadata?.raw || poeError.message || "Rate limit exceeded";
        return res.status(500).json({ 
          error: "AI сервис временно недоступен из-за ограничений. Пожалуйста, попробуйте через несколько минут.",
          details: "Превышен лимит запросов (500 запросов в минуту). Попробуйте позже."
        });
      }
      
      res.status(500).json({ 
        error: "AI service temporarily unavailable. Please try again later.",
        details: process.env.NODE_ENV === 'development' ? poeError.message : undefined
      });
    }
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to check if file is an image
function isImageFile(mimetype, filename) {
  const imageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  return imageMimes.includes(mimetype) || imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

// Helper function to get MIME type from file extension
function getMimeType(filename) {
  const ext = getFileExtension(filename);
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

// Helper function to convert image to base64
function imageToBase64(filePath, filename) {
  const imageBuffer = fs.readFileSync(filePath);
  const base64Image = imageBuffer.toString('base64');
  const mimetype = getMimeType(filename);
  return `data:${mimetype};base64,${base64Image}`;
}

// Try to get response with fallback models (for file/image uploads)
// IMPORTANT: For files/images, use ONLY multimodal models (they can process images/files)
// For text-only chat, use tryWithFallback which includes all models
async function tryWithFallbackForFile(client, messages, systemMessage = null, isImage = false) {
  // For files/images (both image files and text files), use ONLY multimodal models
  // Multimodal models can process both images and text files
  const modelsToTry = [getModel(), ...MULTIMODAL_MODELS.filter(m => m !== getModel())];
  
  let lastError = null;
  let rateLimitedModels = [];
  
  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    
    try {
      console.log(`🔄 Trying model: ${model} (${i + 1}/${modelsToTry.length})${isImage ? ' [IMAGE]' : ''}`);
      
      const messageArray = systemMessage 
        ? [{ role: "system", content: systemMessage }, ...messages]
        : messages;
      
      const completion = await client.chat.completions.create({
        model: model,
        messages: messageArray,
        temperature: 0.7
      });
      
      console.log(`✅ Success with model: ${model}`);
      return { response: completion.choices[0].message.content, model };
    } catch (error) {
      lastError = error;
      const errorMessage = error.error?.metadata?.raw || error.message || "Unknown error";
      const errorStatus = error.status || error.code;
      
      console.log(`❌ Model ${model} failed:`, errorStatus || errorMessage);
      
      const isRateLimit = errorStatus === 429 || 
                         error.message?.includes('rate limit') || 
                         error.message?.includes('rate-limited') ||
                         errorMessage?.includes('rate-limited') ||
                         errorMessage?.includes('rate limit') ||
                         errorMessage?.includes('temporarily rate-limited');
      
      // Handle 404 (not found) and 400 (invalid model ID) - skip and try next
      if (errorStatus === 404 || errorStatus === 400) {
        const errorType = errorStatus === 404 ? 'not found (404)' : 'invalid model ID (400)';
        console.log(`⚠️ Model ${model} ${errorType}, trying next model`);
        if (i < modelsToTry.length - 1) {
          await sleep(500);
        }
        continue;
      } else if (isRateLimit) {
        rateLimitedModels.push(model);
        console.log(`⏳ Model ${model} rate-limited, trying next model`);
        if (i < modelsToTry.length - 1) {
          await sleep(1000);
        }
        continue;
      } else {
        console.error(`❌ Non-recoverable error with model ${model}:`, errorStatus, errorMessage);
        throw error;
      }
    }
  }
  
  if (rateLimitedModels.length === modelsToTry.length) {
    const error = new Error("All free models are currently rate-limited. Please try again in a few minutes.");
    error.status = 429;
    error.rateLimitedModels = rateLimitedModels;
    throw error;
  }
  
  throw lastError;
}

// POST /api/ai/analyze-file - Analyze uploaded file (text or image)
router.post("/analyze-file", authenticate, upload.single("file"), async (req, res) => {
  let filePath = null;
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    filePath = req.file.path;
    const isImage = isImageFile(req.file.mimetype, req.file.originalname);
    
    // Get Poe API client
    const client = getPoeClient();

    let analysis;
    try {
      let messages = [];
      let detectedLang = 'Russian';
      
      if (isImage) {
        // Handle image file
        console.log('📷 Processing image file:', req.file.originalname);
        const base64Image = imageToBase64(filePath, req.file.originalname);
        
        // For multimodal models, send image as content array
        messages = [{
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this medical image (X-ray, test result, document photo, etc.). Explain what you see in simple terms. Highlight any risks or concerns. Respond in the same language as the user's request or in Russian if not specified."
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image
              }
            }
          ]
        }];
        
        detectedLang = 'Russian'; // Default for images
      } else {
        // Handle text file
        console.log('📄 Processing text file:', req.file.originalname);
        let fileText;
        try {
          fileText = fs.readFileSync(filePath, "utf8");
        } catch (readError) {
          return res.status(400).json({ error: "Failed to read file", details: readError.message });
        }
        
        detectedLang = detectLanguage(fileText);
        const prompt = `Analyze the following medical document. Explain results simply. Highlight risks. Respond in the same language as the document.\n\n${fileText}`;
        
        messages = [{ role: "user", content: prompt }];
      }
      
      const systemPrompt = `You are a medical document and image analyzer. Analyze medical documents, images, test results, X-rays, and explain results in simple terms.

CRITICAL: You MUST respond ONLY in ${detectedLang} language. Do NOT mix languages. Use ONLY ${detectedLang} language throughout your entire response.`;

      const result = await tryWithFallbackForFile(
        client,
        messages,
        systemPrompt,
        isImage
      );
      
      analysis = result.response;
      
      // Save user message and AI response to database
      const userId = req.userId;
      const userMessageText = isImage 
        ? `Uploaded image: ${req.file.originalname}`
        : `Uploaded document: ${req.file.originalname}`;
      
      try {
        // Save user message about file upload
        await dbRun(
          `INSERT INTO ai_chat_history (user_id, role, content) VALUES (?, ?, ?)`,
          [userId, 'user', userMessageText]
        );
        console.log(`💾 Saved user file upload message to history for user ${userId}`);
        
        // Save AI response
        await dbRun(
          `INSERT INTO ai_chat_history (user_id, role, content) VALUES (?, ?, ?)`,
          [userId, 'assistant', analysis]
        );
        console.log(`💾 Saved AI file analysis response to history for user ${userId}`);
      } catch (dbError) {
        console.error("Error saving file analysis to history:", dbError);
        // Don't fail the request if history save fails
      }
    } catch (poeError) {
      console.error("Poe API Error in file analysis:", poeError);
      
      // Check if it's a quota/rate limit error
      if (poeError.status === 429 || poeError.message?.includes('quota') || poeError.message?.includes('rate limit') || poeError.message?.includes('rate-limited')) {
        console.error("⚠️ Poe API Rate limit exceeded!");
        const errorMessage = poeError.error?.metadata?.raw || poeError.message || "Rate limit exceeded";
        return res.status(500).json({ 
          error: "AI сервис временно недоступен из-за ограничений. Пожалуйста, попробуйте через несколько минут.",
          details: "Превышен лимит запросов (500 запросов в минуту). Попробуйте позже."
        });
      }
      
      // Re-throw to be caught by outer catch
      throw poeError;
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
      const client = getPoeClient();
      
      const prompt = `You are a medical assistant creating a concise summary report for a doctor. 
Create a structured medical consultation summary in Russian language. 
Include: patient information, main complaints/symptoms, conversation summary, 
and recommendations. Keep it professional and concise.

Create a medical consultation summary for patient ${userName || "Patient"} based on this conversation:

${conversation}`;

      const result = await tryWithFallback(
        client,
        [{ role: "user", content: prompt }],
        "You are a medical assistant creating concise summary reports for doctors."
      );

      const report = result.response;
      res.json({ report });
    } catch (poeError) {
      console.error("Poe API Error:", poeError);
      
      // Check if it's a quota/rate limit error
      if (poeError.status === 429 || poeError.message?.includes('quota') || poeError.message?.includes('rate limit') || poeError.message?.includes('rate-limited')) {
        console.error("⚠️ Poe API Rate limit exceeded!");
        const errorMessage = poeError.error?.metadata?.raw || poeError.message || "Rate limit exceeded";
        return res.status(500).json({ 
          error: "AI сервис временно недоступен из-за ограничений. Пожалуйста, попробуйте через несколько минут.",
          details: "Превышен лимит запросов (500 запросов в минуту). Попробуйте позже."
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

    const client = getPoeClient();
    
    const prompt = `Create a short structured medical summary for a doctor in Russian language.

${conversation}`;

    const result = await tryWithFallback(
      client,
      [{ role: "user", content: prompt }],
      "You are a medical assistant creating short structured summaries for doctors."
    );

    const summary = result.response;

    res.json({
      summary: summary
    });
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
