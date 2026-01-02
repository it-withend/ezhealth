import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Lazy initialization of OpenAI client
let openai = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// POST /api/ai/analyze - Analyze text message
router.post("/analyze", authenticate, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    // Use actual OpenAI API
    try {
      const openaiClient = getOpenAIClient();
      
      const messages = [
        { 
          role: "system", 
          content: "You are a medical AI assistant. Provide helpful health information but always recommend consulting with healthcare professionals." 
        },
        { role: "user", content: message }
      ];

      // Add history if provided
      if (history && Array.isArray(history)) {
        messages.splice(1, 0, ...history.map(h => ({
          role: h.role || "user",
          content: h.content || h.text || ""
        })));
      }

      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages
      });

      const response = completion.choices[0].message.content;
      res.json({ response });
    } catch (openaiError) {
      console.error("OpenAI API Error:", openaiError);
      // Fallback to simple response if API fails
      res.status(500).json({ 
        error: "AI service temporarily unavailable. Please try again later.",
        details: process.env.NODE_ENV === 'development' ? openaiError.message : undefined
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

    // Get OpenAI client
    const openaiClient = getOpenAIClient();

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Analyze the medical document. Explain results simply. Highlight risks."
        },
        { role: "user", content: fileText }
      ]
    });

    const analysis = completion.choices[0].message.content;

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

    // Generate a summary report
    const conversation = messages
      .filter(m => m.sender === "user")
      .map(m => `Patient: ${m.text}`)
      .join("\n");

    const report = `
MEDICAL CONSULTATION SUMMARY
============================
Date: ${new Date().toLocaleDateString()}
Patient: ${userName || "Patient"}

CONVERSATION SUMMARY:
${conversation}

RECOMMENDATIONS:
- Regular health monitoring
- Follow prescribed medications
- Maintain healthy lifestyle
- Schedule follow-up consultation

Note: This is an AI-generated summary for reference only. Please consult with healthcare professionals for proper diagnosis and treatment.
    `;

    res.json({ report });
  } catch (error) {
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

    const openaiClient = getOpenAIClient();
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Create a short structured medical summary for a doctor."
        },
        { role: "user", content: conversation }
      ]
    });

    res.json({
      summary: completion.choices[0].message.content
    });
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
