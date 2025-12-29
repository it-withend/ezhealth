import express from "express";
import { dbRun, dbGet, dbAll } from '../database.js';

const router = express.Router();

// Check health metrics and send alerts if needed
router.post("/check", async (req, res) => {
  try {
    const { userId, metricType, value } = req.body;

    if (!userId || !metricType || value === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Define normal ranges
    const normalRanges = {
      pulse: { min: 60, max: 100 },
      systolic: { min: 90, max: 120 },
      diastolic: { min: 60, max: 80 },
      sleep: { min: 6, max: 9 },
      weight: { min: 50, max: 100 }
    };

    const range = normalRanges[metricType];
    let alertTriggered = false;
    let alertType = null;
    let message = null;

    if (range && (value < range.min || value > range.max)) {
      alertTriggered = true;
      alertType = value > range.max ? "high" : "low";
      message = `Your ${metricType} is ${alertType}: ${value}`;
    }

    if (alertTriggered) {
      // Get trusted contacts for this user
      const contacts = await dbAll(
        `SELECT * FROM trusted_contacts WHERE user_id = ? AND can_receive_alerts = 1`,
        [userId]
      );

      // Send alerts to contacts (mock implementation)
      const alerts = contacts.map(contact => ({
        contactId: contact.contact_telegram_id,
        message: message,
        timestamp: new Date()
      }));

      console.log(`Alert triggered for user ${userId}: ${message}`);
      console.log("Alerts to send:", alerts);

      res.json({
        alertTriggered: true,
        alertType,
        message,
        contactsNotified: contacts.length
      });
    } else {
      res.json({
        alertTriggered: false,
        message: "All metrics within normal range"
      });
    }
  } catch (error) {
    console.error("Alert Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get alerts for user
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // Mock alerts (in production, store in database)
    const alerts = [
      {
        id: 1,
        type: "high_pulse",
        message: "Your pulse is unusually high (95 bpm)",
        severity: "warning",
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        id: 2,
        type: "low_sleep",
        message: "You slept less than recommended (6 hours)",
        severity: "info",
        timestamp: new Date(Date.now() - 86400000)
      }
    ];

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
