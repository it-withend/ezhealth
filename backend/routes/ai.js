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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:23',message:'POST /analyze called',data:{hasMessage:!!req.body.message,hasHistory:!!req.body.history},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const { message, history } = req.body;

    if (!message) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:30',message:'Missing message error',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return res.status(400).json({ error: "Missing message" });
    }

    // Use actual OpenAI API
    try {
      const openaiClient = getOpenAIClient();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:40',message:'Calling OpenAI API',data:{hasApiKey:!!process.env.OPENAI_API_KEY,messageLength:message.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:65',message:'OpenAI response received',data:{responseLength:response.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      res.json({ response });
    } catch (openaiError) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:70',message:'OpenAI API error',data:{error:openaiError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error("OpenAI API Error:", openaiError);
      // Fallback to simple response if API fails
      res.status(500).json({ 
        error: "AI service temporarily unavailable. Please try again later.",
        details: process.env.NODE_ENV === 'development' ? openaiError.message : undefined
      });
    }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:80',message:'General error in /analyze',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/analyze-file - Analyze uploaded file
router.post("/analyze-file", authenticate, upload.single("file"), async (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:88',message:'POST /analyze-file called',data:{hasFile:!!req.file},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  let filePath = null;
  try {
    // Check if file was uploaded
    if (!req.file) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:95',message:'No file uploaded error',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return res.status(400).json({ error: "No file uploaded" });
    }

    filePath = req.file.path;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:102',message:'Reading file',data:{filePath,fileSize:req.file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Read file with error handling
    let fileText;
    try {
      fileText = fs.readFileSync(filePath, "utf8");
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:109',message:'File read successfully',data:{textLength:fileText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (readError) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:113',message:'File read error',data:{error:readError.message,filePath},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return res.status(400).json({ error: "Failed to read file", details: readError.message });
    }

    // Get OpenAI client
    const openaiClient = getOpenAIClient();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:120',message:'Calling OpenAI for file analysis',data:{fileTextLength:fileText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:135',message:'File analysis complete',data:{analysisLength:analysis.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'routes/ai.js:148',message:'Error in /analyze-file',data:{error:error.message,filePath},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
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
