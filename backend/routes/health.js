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
    const userIdType = typeof userId;
    const { type, limit = 100, days = 30 } = req.query;

    console.log(`📊 GET /health/metrics - userId=${userId} (type: ${userIdType}), type=${type}, limit=${limit}, days=${days}`);

    // Use CAST to ensure type matching
    let sql = `
      SELECT * FROM health_metrics 
      WHERE CAST(user_id AS INTEGER) = CAST(? AS INTEGER)
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

    console.log(`📊 Executing SQL: ${sql} with params:`, params);
    console.log(`📊 Param types: userId=${typeof params[0]}, limit=${typeof params[params.length - 1]}`);

    const metrics = await dbAll(sql, params);
    
    // Debug: Check what user_ids exist in the table
    const allUserIds = await dbAll('SELECT DISTINCT user_id, typeof(user_id) as user_id_type, COUNT(*) as count FROM health_metrics GROUP BY user_id LIMIT 10');
    console.log(`📊 All user_ids in health_metrics table:`, allUserIds);
    
    // Debug: Try query without WHERE to see all metrics
    const allMetrics = await dbAll('SELECT id, user_id, typeof(user_id) as user_id_type, type, value FROM health_metrics ORDER BY id DESC LIMIT 10');
    console.log(`📊 Last 10 metrics in table (all users):`, allMetrics);

    console.log(`📊 Returning ${metrics.length} metrics for user ${userId} (type: ${typeof userId})`);
    if (metrics.length > 0) {
      console.log(`📊 Sample metrics:`, metrics.slice(0, 3).map(m => ({ 
        id: m.id, 
        type: m.type, 
        value: m.value, 
        user_id: m.user_id,
        user_id_type: typeof m.user_id,
        recorded_at: m.recorded_at 
      })));
      
      // Check if user_id matches
      const userIdsMatch = metrics.every(m => String(m.user_id) === String(userId));
      if (!userIdsMatch) {
        console.warn(`⚠️ Some metrics have different user_id! Expected: ${userId}, Found:`, 
          [...new Set(metrics.map(m => m.user_id))]);
      }
    } else {
      console.log(`⚠️ No metrics found for user ${userId}`);
    }

    res.json({
      success: true,
      metrics,
      userId: userId,
      userIdType: userIdType // Include userId in response for debugging
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

    console.log(`📊 Adding health metric: userId=${userId}, type=${type}, value=${value}, unit=${unit}`);

    if (!type || value === undefined) {
      return res.status(400).json({ error: 'type and value are required' });
    }

    if (!userId) {
      console.error('❌ No userId found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`📊 INSERT params: userId=${userId} (type: ${typeof userId}), type=${type}, value=${value}, unit=${unit || null}`);
    
    // Ensure userId is stored as INTEGER
    const userIdInt = parseInt(userId, 10);
    console.log(`📊 INSERT: userId=${userId} -> userIdInt=${userIdInt} (type: ${typeof userIdInt})`);
    
    console.log(`📊 About to INSERT: userIdInt=${userIdInt}, type=${type}, value=${value}, unit=${unit || null}`);
    
    const result = await dbRun(
      'INSERT INTO health_metrics (user_id, type, value, unit, notes, source) VALUES (?, ?, ?, ?, ?, ?)',
      [userIdInt, type, value, unit || null, notes || null, 'manual']
    );
    
    console.log(`✅ Health metric added: ID=${result.lastID}, changes=${result.changes}, userId=${userIdInt}, type=${type}, value=${value}`);
    
    if (result.changes === 0) {
      console.error(`❌ INSERT returned 0 changes! Something went wrong.`);
    }
    
    // Immediately check if it was saved
    const immediateCheck = await dbAll('SELECT COUNT(*) as count FROM health_metrics');
    console.log(`📊 Total metrics in table after insert: ${immediateCheck[0]?.count || 0}`);
    
    // Verify the metric was saved correctly
    const savedMetric = await dbGet(
      'SELECT * FROM health_metrics WHERE id = ? AND CAST(user_id AS INTEGER) = CAST(? AS INTEGER)',
      [result.lastID, userIdInt]
    );
    
    if (!savedMetric) {
      console.error(`❌ Failed to verify saved metric: ID=${result.lastID}, userId=${userId}`);
      // Try to find it with different user_id types
      const savedAsString = await dbGet(
        'SELECT * FROM health_metrics WHERE id = ? AND user_id = ?',
        [result.lastID, String(userId)]
      );
      const savedAsNumber = await dbGet(
        'SELECT * FROM health_metrics WHERE id = ? AND user_id = ?',
        [result.lastID, Number(userId)]
      );
      console.error(`❌ Tried string userId:`, savedAsString ? 'FOUND' : 'NOT FOUND');
      console.error(`❌ Tried number userId:`, savedAsNumber ? 'FOUND' : 'NOT FOUND');
      
      // Check what user_ids exist in the table
      const allMetrics = await dbAll('SELECT DISTINCT user_id, typeof(user_id) as user_id_type FROM health_metrics LIMIT 10');
      console.error(`❌ All user_ids in table:`, allMetrics);
    } else {
      console.log(`✅ Verified saved metric:`, { 
        id: savedMetric.id, 
        user_id: savedMetric.user_id, 
        user_id_type: typeof savedMetric.user_id,
        type: savedMetric.type, 
        value: savedMetric.value 
      });
    }
    
    // Also check if we can retrieve it with the same query used in GET
    const testQuery = await dbAll(
      'SELECT * FROM health_metrics WHERE CAST(user_id AS INTEGER) = CAST(? AS INTEGER) ORDER BY recorded_at DESC LIMIT 10',
      [userIdInt]
    );
    console.log(`📊 Test query after insert: Found ${testQuery.length} metrics for userId=${userId}`);
    if (testQuery.length > 0) {
      console.log(`📊 Test query sample:`, testQuery[0]);
    }

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

    const userIdInt = parseInt(userId, 10);
    const metric = await dbGet(
      'SELECT * FROM health_metrics WHERE id = ? AND CAST(user_id AS INTEGER) = CAST(? AS INTEGER)',
      [metricId, userIdInt]
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

    const userIdInt = parseInt(userId, 10);
    await dbRun(
      'UPDATE health_metrics SET type = ?, value = ?, unit = ?, notes = ? WHERE id = ? AND CAST(user_id AS INTEGER) = CAST(? AS INTEGER)',
      [type, value, unit, notes, metricId, userIdInt]
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

    const userIdInt = parseInt(userId, 10);
    await dbRun(
      'DELETE FROM health_metrics WHERE id = ? AND CAST(user_id AS INTEGER) = CAST(? AS INTEGER)',
      [metricId, userIdInt]
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

    console.log(`📈 Getting stats: userId=${userId}, type=${type}, days=${days}`);

    const userIdInt = parseInt(userId, 10);
    console.log(`📈 Getting stats: userId=${userId} -> userIdInt=${userIdInt} (type: ${typeof userIdInt}), type=${type}, days=${days}`);

    // Debug: Check what metrics exist for this user
    const allUserMetrics = await dbAll(
      'SELECT id, user_id, typeof(user_id) as user_id_type, type, value FROM health_metrics WHERE CAST(user_id AS INTEGER) = CAST(? AS INTEGER) LIMIT 10',
      [userIdInt]
    );
    console.log(`📈 All metrics for userId=${userIdInt}:`, allUserMetrics);

    const metrics = await dbAll(
      `SELECT value, recorded_at, unit 
       FROM health_metrics 
       WHERE CAST(user_id AS INTEGER) = CAST(? AS INTEGER) AND type = ? 
       AND recorded_at >= datetime("now", "-${days} days")
       ORDER BY recorded_at ASC`,
      [userIdInt, type]
    );

    console.log(`📈 Found ${metrics.length} metrics for type ${type}`);

    // Format for charts
    const chartData = metrics.map(m => ({
      date: new Date(m.recorded_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      value: parseFloat(m.value),
      fullDate: m.recorded_at,
      timestamp: new Date(m.recorded_at).getTime()
    }));

    // Sort by timestamp to ensure correct order
    chartData.sort((a, b) => a.timestamp - b.timestamp);

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
