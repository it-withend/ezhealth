import express from "express";
import { dbRun, dbGet, dbAll } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Check health metrics and send alerts if needed
router.post("/check", authenticate, async (req, res) => {
  try {
    const userId = req.userId; // From authentication middleware
    const { metricType, value } = req.body;

    if (!metricType || value === undefined) {
      return res.status(400).json({ error: "metricType and value are required" });
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
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    // Get recent critical metrics
    const recentMetrics = await dbAll(
      `SELECT * FROM health_metrics 
       WHERE user_id = ? 
       AND recorded_at >= datetime("now", "-7 days")
       ORDER BY recorded_at DESC
       LIMIT 50`,
      [userId]
    );

    // Check for critical values
    const alerts = [];
    const normalRanges = {
      pulse: { min: 60, max: 100 },
      systolic: { min: 90, max: 120 },
      diastolic: { min: 60, max: 80 },
      sleep: { min: 6, max: 9 },
      sugar: { min: 4, max: 6 }
    };

    recentMetrics.forEach(metric => {
      const range = normalRanges[metric.type];
      if (range) {
        const value = parseFloat(metric.value);
        if (value < range.min || value > range.max) {
          const alertType = value > range.max ? "high" : "low";
          alerts.push({
            id: metric.id,
            type: `${alertType}_${metric.type}`,
            message: `Ваш ${metric.type === 'pulse' ? 'пульс' : metric.type === 'sleep' ? 'сон' : metric.type} ${alertType === 'high' ? 'высокий' : 'низкий'}: ${value}${metric.unit ? ' ' + metric.unit : ''}`,
            severity: value > range.max * 1.2 || value < range.min * 0.8 ? "critical" : "warning",
            timestamp: metric.recorded_at,
            metricId: metric.id
          });
        }
      }
    });

    res.json(alerts);
  } catch (error) {
    console.error("Get alerts error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Emergency alert with location
router.post("/emergency", authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { message, location, locationUrl } = req.body;

    // Get user info
    const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get trusted contacts who can receive alerts
    const contacts = await dbAll(
      `SELECT * FROM trusted_contacts WHERE user_id = ? AND can_receive_alerts = 1`,
      [userId]
    );

    if (contacts.length === 0) {
      return res.status(404).json({ error: "No trusted contacts with alert permissions found" });
    }

    // Format emergency message
    const emergencyMessage = message || "Emergency! I need help.";
    const fullMessage = locationUrl 
      ? `${emergencyMessage}\n📍 Location: ${locationUrl}`
      : location
      ? `${emergencyMessage}\n📍 Location: ${location.latitude}, ${location.longitude}`
      : emergencyMessage;

    // In production, send via Telegram Bot API
    // For now, log the alerts
    console.log(`🚨 EMERGENCY ALERT from user ${userId} (${user.first_name || 'User'})`);
    console.log(`Message: ${fullMessage}`);
    console.log(`Sending to ${contacts.length} contacts:`);
    contacts.forEach(contact => {
      console.log(`  - ${contact.contact_name || contact.contact_telegram_id} (ID: ${contact.contact_telegram_id})`);
    });

    res.json({
      success: true,
      message: "Emergency alert sent",
      contactsNotified: contacts.length,
      contacts: contacts.map(c => ({
        id: c.id,
        name: c.contact_name,
        telegramId: c.contact_telegram_id
      }))
    });
  } catch (error) {
    console.error("Emergency alert error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
