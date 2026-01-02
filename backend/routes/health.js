import express from "express";
import { dbAll, dbRun, dbGet } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes except summary
router.get("/summary", (req, res) => {
  res.json({
    appointments: [
      {
        id: 1,
        doctor: "Dr. Darius Klaine",
        specialty: "Dentist",
        date: "Tomorrow",
        time: "10:00"
      }
    ],
    nearby: [
      {
        id: 1,
        name: "St. John Hospital",
        distance: "200m"
      }
    ],
    alerts: [
      {
        id: 1,
        text: "Latest health alerts and AI tips"
      }
    ]
  });
});

// Get all health metrics for user
router.get("/metrics", authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { type, limit = 100, days = 30 } = req.query;

    let sql = `
      SELECT * FROM health_metrics 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    // Filter by days if specified
    if (days) {
      sql += ' AND recorded_at >= datetime("now", "-' + days + ' days")';
    }

    sql += ' ORDER BY recorded_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const metrics = await dbAll(sql, params);

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new health metric
router.post("/metrics", authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { type, value, unit, notes } = req.body;

    if (!type || value === undefined) {
      return res.status(400).json({ error: 'type and value are required' });
    }

    const result = await dbRun(
      'INSERT INTO health_metrics (user_id, type, value, unit, notes) VALUES (?, ?, ?, ?, ?)',
      [userId, type, value, unit || null, notes || null]
    );

    // Check for critical values and trigger alerts
    try {
      const normalRanges = {
        pulse: { min: 60, max: 100 },
        systolic: { min: 90, max: 120 },
        diastolic: { min: 60, max: 80 },
        sleep: { min: 6, max: 9 },
        weight: { min: 50, max: 100 },
        sugar: { min: 4, max: 6 }
      };

      const range = normalRanges[type];
      if (range) {
        const numValue = parseFloat(value);
        if (numValue < range.min || numValue > range.max) {
          // Get trusted contacts
          const { dbAll } = await import('../database.js');
          const contacts = await dbAll(
            `SELECT * FROM trusted_contacts WHERE user_id = ? AND can_receive_alerts = 1`,
            [userId]
          );

          if (contacts.length > 0) {
            const alertType = numValue > range.max ? "high" : "low";
            const message = `⚠️ Alert: Your ${type} is ${alertType} (${value}${unit ? ' ' + unit : ''}). Normal range: ${range.min}-${range.max}.`;
            
            console.log(`Alert triggered for user ${userId}: ${message}`);
            console.log(`Notifying ${contacts.length} trusted contacts`);
            
            // In production, send Telegram messages to contacts
            // For now, just log
          }
        }
      }
    } catch (alertError) {
      console.warn('Alert check failed:', alertError);
      // Don't fail the request if alert check fails
    }

    res.json({
      success: true,
      metric_id: result.lastID
    });
  } catch (error) {
    console.error('Add metric error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single metric
router.get("/metrics/:id", authenticate, async (req, res) => {
  try {
    const metricId = req.params.id;
    const userId = req.userId;

    const metric = await dbGet(
      'SELECT * FROM health_metrics WHERE id = ? AND user_id = ?',
      [metricId, userId]
    );

    if (!metric) {
      return res.status(404).json({ error: 'Metric not found' });
    }

    res.json({
      success: true,
      metric
    });
  } catch (error) {
    console.error('Get metric error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update metric
router.put("/metrics/:id", authenticate, async (req, res) => {
  try {
    const metricId = req.params.id;
    const userId = req.userId;
    const { type, value, unit, notes } = req.body;

    await dbRun(
      'UPDATE health_metrics SET type = ?, value = ?, unit = ?, notes = ? WHERE id = ? AND user_id = ?',
      [type, value, unit, notes, metricId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update metric error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete metric
router.delete("/metrics/:id", authenticate, async (req, res) => {
  try {
    const metricId = req.params.id;
    const userId = req.userId;

    await dbRun(
      'DELETE FROM health_metrics WHERE id = ? AND user_id = ?',
      [metricId, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete metric error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get metrics statistics for charts
router.get("/metrics/stats", authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { type, days = 30 } = req.query;

    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }

    const metrics = await dbAll(
      `SELECT value, recorded_at, unit 
       FROM health_metrics 
       WHERE user_id = ? AND type = ? 
       AND recorded_at >= datetime("now", "-${days} days")
       ORDER BY recorded_at ASC`,
      [userId, type]
    );

    // Format for charts
    const chartData = metrics.map(m => ({
      date: new Date(m.recorded_at).toLocaleDateString('en-US', { weekday: 'short' }),
      value: m.value,
      fullDate: m.recorded_at
    }));

    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
