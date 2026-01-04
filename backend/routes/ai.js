import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { authenticate } from '../middleware/auth.js';

// Helper to get file extension
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

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

// List of free models to try as fallback
// Models are ordered by priority: multimodal (image support) first, then text-only
// Multimodal models (support images and text):
const MULTIMODAL_MODELS = [
  "google/gemini-2.0-flash-exp:free",           // Gemini 2.0 Flash - best multimodal, supports images
  "google/gemini-flash-1.5:free",               // Gemini 1.5 Flash - multimodal, supports images
  "google/gemini-1.5-flash:free",              // Gemini 1.5 Flash - multimodal, supports images
  "google/gemini-2.0-flash-thinking-exp:free", // Gemini 2.0 Flash Thinking - multimodal
  "google/gemini-pro-1.5:free",                 // Gemini Pro 1.5 - multimodal (if available free)
  "google/gemini-1.5-pro:free",                // Gemini 1.5 Pro - multimodal (if available free)
];

// Text-only models (fallback if multimodal fail):
const TEXT_ONLY_MODELS = [
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "deepseek/deepseek-chat:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.1-70b-instruct:free",
  "mistralai/mistral-small:free",
  "qwen/qwen-2-7b-instruct:free",
  "huggingface/zephyr-7b-beta:free",
  "openchat/openchat-7b:free",
  "perplexity/llama-3.1-sonar-small-128k-online:free",
];

// Combined list: multimodal first, then text-only
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
      if (errorStatus === 404) {
        console.log(`⚠️ Model ${model} not found (404), trying next model`);
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

// POST /api/ai/analyze - Analyze text message
router.post("/analyze", authenticate, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    try {
      const client = getOpenRouterClient();
      
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

      res.json({ response: result.response });
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
      if (openrouterError.status === 429 || openrouterError.message?.includes('quota') || openrouterError.message?.includes('rate limit') || openrouterError.message?.includes('rate-limited')) {
        console.error("⚠️ OpenRouter API Rate limit exceeded!");
        const errorMessage = openrouterError.error?.metadata?.raw || openrouterError.message || "Rate limit exceeded";
        return res.status(500).json({ 
          error: "AI сервис временно недоступен из-за ограничений. Пожалуйста, попробуйте через несколько минут.",
          details: errorMessage.includes('rate-limited') 
            ? "Бесплатная модель временно ограничена. Попробуйте позже или добавьте свой API ключ в настройках OpenRouter."
            : "Превышен лимит запросов. Попробуйте позже."
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

// Try to get response with fallback models (with support for images)
async function tryWithFallbackForFile(client, messages, systemMessage = null, isImage = false) {
  // For images, use only multimodal models
  const modelsToTry = isImage 
    ? [getModel(), ...MULTIMODAL_MODELS.filter(m => m !== getModel())]
    : [getModel(), ...FALLBACK_MODELS.filter(m => m !== getModel())];
  
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
      
      if (errorStatus === 404) {
        console.log(`⚠️ Model ${model} not found (404), trying next model`);
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
    
    // Get OpenRouter client
    const client = getOpenRouterClient();

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
    } catch (openrouterError) {
      console.error("OpenRouter API Error in file analysis:", openrouterError);
      
      // Check if it's a quota/rate limit error
      if (openrouterError.status === 429 || openrouterError.message?.includes('quota') || openrouterError.message?.includes('rate limit') || openrouterError.message?.includes('rate-limited')) {
        console.error("⚠️ OpenRouter API Rate limit exceeded!");
        const errorMessage = openrouterError.error?.metadata?.raw || openrouterError.message || "Rate limit exceeded";
        return res.status(500).json({ 
          error: "AI сервис временно недоступен из-за ограничений. Пожалуйста, попробуйте через несколько минут.",
          details: errorMessage.includes('rate-limited') 
            ? "Бесплатная модель временно ограничена. Попробуйте позже или добавьте свой API ключ в настройках OpenRouter."
            : "Превышен лимит запросов. Попробуйте позже."
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
    } catch (openrouterError) {
      console.error("OpenRouter API Error:", openrouterError);
      
      // Check if it's a quota/rate limit error
      if (openrouterError.status === 429 || openrouterError.message?.includes('quota') || openrouterError.message?.includes('rate limit') || openrouterError.message?.includes('rate-limited')) {
        console.error("⚠️ OpenRouter API Rate limit exceeded!");
        const errorMessage = openrouterError.error?.metadata?.raw || openrouterError.message || "Rate limit exceeded";
        return res.status(500).json({ 
          error: "AI сервис временно недоступен из-за ограничений. Пожалуйста, попробуйте через несколько минут.",
          details: errorMessage.includes('rate-limited') 
            ? "Бесплатная модель временно ограничена. Попробуйте позже или добавьте свой API ключ в настройках OpenRouter."
            : "Превышен лимит запросов. Попробуйте позже."
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
