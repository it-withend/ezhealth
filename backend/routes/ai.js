import express from "express";

const router = express.Router();

// Simple mock AI response (replace with actual OpenAI API)
router.post("/analyze", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    // Mock response (replace with actual OpenAI call)
    const mockResponses = [
      "Based on your symptoms, I recommend consulting with a doctor for proper diagnosis. In the meantime, stay hydrated and rest.",
      "Your health metrics look normal. Continue monitoring them regularly.",
      "High blood pressure might be related to stress. Try relaxation techniques and reduce salt intake.",
      "Your sleep pattern seems irregular. Try maintaining a consistent sleep schedule.",
      "The symptoms you describe could have multiple causes. Please consult a healthcare professional for accurate diagnosis."
    ];

    const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    // In production, use actual OpenAI API:
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // const completion = await openai.chat.completions.create({
    //   model: "gpt-4",
    //   messages: [
    //     { role: "system", content: "You are a medical AI assistant. Provide helpful health information but always recommend consulting with healthcare professionals." },
    //     { role: "user", content: message }
    //   ]
    // });

    res.json({ response });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Generate doctor's report
router.post("/generate-report", async (req, res) => {
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

export default router;/**
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
