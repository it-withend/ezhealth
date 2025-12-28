import express from 'express';
import { dbGet, dbAll, dbRun } from '../database.js';

const router = require("express").Router();

// Add health metric
router.post('/metrics', async (req, res) => {
  try {
    const { user_id, type, value, unit, notes } = req.body;
    
    if (!user_id || !type || value === undefined) {
      return res.status(400).json({ error: 'user_id, type, and value are required' });
    }

    const result = await dbRun(
      'INSERT INTO health_metrics (user_id, type, value, unit, notes) VALUES (?, ?, ?, ?, ?)',
      [user_id, type, value, unit || null, notes || null]
    );

    res.json({
      success: true,
      metric_id: result.lastID
    });
  } catch (error) {
    console.error('Add metric error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get health metrics
router.get('/metrics', async (req, res) => {
  try {
    const userId = req.query.user_id;
    const type = req.query.type;
    const limit = parseInt(req.query.limit) || 100;
    
    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    let sql = 'SELECT * FROM health_metrics WHERE user_id = ?';
    const params = [userId];
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY recorded_at DESC LIMIT ?';
    params.push(limit);

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

// Get latest health metric by type
router.get('/metrics/latest', async (req, res) => {
  try {
    const userId = req.query.user_id;
    const type = req.query.type;
    
    if (!userId || !type) {
      return res.status(400).json({ error: 'user_id and type are required' });
    }

    const metric = await dbGet(
      'SELECT * FROM health_metrics WHERE user_id = ? AND type = ? ORDER BY recorded_at DESC LIMIT 1',
      [userId, type]
    );

    res.json({
      success: true,
      metric: metric || null
    });
  } catch (error) {
    console.error('Get latest metric error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete health metric
router.delete('/metrics/:id', async (req, res) => {
  try {
    const metricId = req.params.id;
    const userId = req.query.user_id;
    
    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' });
    }

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

/**
 * GET /health/summary
 * данные для Home
 */
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

/**
 * GET /health/metrics
 */
router.get("/metrics", (req, res) => {
  res.json({
    pulse: 72,
    sleep: 7.4,
    pressure: "120/80",
    sugar: 5.2,
    weight: 74
  });
});

module.exports = router;
export default router;