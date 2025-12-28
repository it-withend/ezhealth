const router = require("express").Router();
const OpenAI = require("openai");
const multer = require("multer");
const fs = require("fs");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const upload = multer({ dest: "uploads/" });

/**
 * POST /ai/chat
 * body: { message }
 */
router.post("/chat", async (req, res) => {
  const { message } = req.body;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a medical AI assistant. Explain medical data in simple language. Do not make diagnoses."
      },
      { role: "user", content: message }
    ]
  });

  res.json({
    reply: completion.choices[0].message.content
  });
});

/**
 * POST /ai/analyze
 * form-data: file
 */
router.post("/analyze", upload.single("file"), async (req, res) => {
  const fileText = fs.readFileSync(req.file.path, "utf8");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Analyze the medical document. Explain results simply. Highlight risks."
      },
      { role: "user", content: fileText }
    ]
  });

  res.json({
    analysis: completion.choices[0].message.content
  });
});

/**
 * POST /ai/summary
 * body: { conversation }
 */
router.post("/summary", async (req, res) => {
  const { conversation } = req.body;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Create a short structured medical summary for a doctor."
      },
      { role: "user", content: conversation }
    ]
  });

  res.json({
    summary: completion.choices[0].message.content
  });
});

module.exports = router;
