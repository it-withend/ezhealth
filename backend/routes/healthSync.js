import express from "express";
import { dbAll, dbRun, dbGet } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Supported health apps
const SUPPORTED_APPS = {
  google_fit: {
    name: "Google Fit",
    icon: "🏃",
    enabled: true,
    apiUrl: "https://www.googleapis.com/fitness/v1"
  },
  apple_health: {
    name: "Apple Health",
    icon: "🍎",
    enabled: true,
    apiUrl: null // Requires HealthKit framework on iOS
  },
  mi_fit: {
    name: "Mi Fit",
    icon: "📱",
    enabled: true,
    apiUrl: null // Requires Xiaomi API
  },
  samsung_health: {
    name: "Samsung Health",
    icon: "📊",
    enabled: true,
    apiUrl: null
  },
  fitbit: {
    name: "Fitbit",
    icon: "⌚",
    enabled: true,
    apiUrl: "https://api.fitbit.com/1"
  }
};

// Get connected health apps
router.get('/apps', async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user's connected apps from database
    const connectedApps = await dbAll(
      `SELECT app_name, access_token, last_sync, sync_enabled 
       FROM health_app_sync 
       WHERE user_id = ? AND sync_enabled = 1`,
      [userId]
    );

    const apps = Object.keys(SUPPORTED_APPS).map(key => {
      const app = SUPPORTED_APPS[key];
      const connected = connectedApps.find(c => c.app_name === key);
      
      return {
        id: key,
        name: app.name,
        icon: app.icon,
        connected: !!connected,
        lastSync: connected?.last_sync || null,
        enabled: app.enabled
      };
    });

    res.json({ apps });
  } catch (error) {
    console.error('Get apps error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Connect health app
router.post('/connect', async (req, res) => {
  try {
    const userId = req.userId;
    const { appName, accessToken, refreshToken } = req.body;

    if (!appName || !SUPPORTED_APPS[appName]) {
      return res.status(400).json({ error: 'Invalid app name' });
    }

    // Check if already connected
    const existing = await dbGet(
      `SELECT * FROM health_app_sync WHERE user_id = ? AND app_name = ?`,
      [userId, appName]
    );

    if (existing) {
      // Update existing connection
      await dbRun(
        `UPDATE health_app_sync 
         SET access_token = ?, refresh_token = ?, sync_enabled = 1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND app_name = ?`,
        [accessToken, refreshToken || null, userId, appName]
      );
    } else {
      // Create new connection
      await dbRun(
        `INSERT INTO health_app_sync (user_id, app_name, access_token, refresh_token, sync_enabled)
         VALUES (?, ?, ?, ?, 1)`,
        [userId, appName, accessToken, refreshToken || null]
      );
    }

    console.log(`✅ Connected ${appName} for user ${userId}`);
    res.json({ success: true, message: `${SUPPORTED_APPS[appName].name} connected successfully` });
  } catch (error) {
    console.error('Connect app error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disconnect health app
router.post('/disconnect', async (req, res) => {
  try {
    const userId = req.userId;
    const { appName } = req.body;

    await dbRun(
      `UPDATE health_app_sync SET sync_enabled = 0 WHERE user_id = ? AND app_name = ?`,
      [userId, appName]
    );

    console.log(`❌ Disconnected ${appName} for user ${userId}`);
    res.json({ success: true, message: `${SUPPORTED_APPS[appName]?.name || appName} disconnected` });
  } catch (error) {
    console.error('Disconnect app error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync data from health app
router.post('/sync', async (req, res) => {
  try {
    const userId = req.userId;
    const { appName, metrics } = req.body;

    if (!appName || !SUPPORTED_APPS[appName]) {
      return res.status(400).json({ error: 'Invalid app name' });
    }

    if (!metrics || !Array.isArray(metrics)) {
      return res.status(400).json({ error: 'Metrics array is required' });
    }

    // Map external app metric types to our internal types
    const metricTypeMap = {
      google_fit: {
        'com.google.heart_rate.bpm': 'pulse',
        'com.google.sleep.segment': 'sleep',
        'com.google.weight': 'weight',
        'com.google.blood_pressure.systolic': 'systolic',
        'com.google.blood_pressure.diastolic': 'diastolic',
        'com.google.blood_glucose': 'sugar'
      },
      apple_health: {
        'HKQuantityTypeIdentifierHeartRate': 'pulse',
        'HKCategoryTypeIdentifierSleepAnalysis': 'sleep',
        'HKQuantityTypeIdentifierBodyMass': 'weight',
        'HKQuantityTypeIdentifierBloodPressureSystolic': 'systolic',
        'HKQuantityTypeIdentifierBloodPressureDiastolic': 'diastolic',
        'HKQuantityTypeIdentifierBloodGlucose': 'sugar'
      },
      mi_fit: {
        'heart_rate': 'pulse',
        'sleep': 'sleep',
        'weight': 'weight',
        'blood_pressure_systolic': 'systolic',
        'blood_pressure_diastolic': 'diastolic',
        'blood_glucose': 'sugar'
      }
    };

    const typeMap = metricTypeMap[appName] || {};
    let syncedCount = 0;

    for (const metric of metrics) {
      const internalType = typeMap[metric.type] || metric.type;
      
      // Skip if we don't recognize the type
      if (!['pulse', 'sleep', 'weight', 'pressure', 'systolic', 'diastolic', 'sugar'].includes(internalType)) {
        continue;
      }

      try {
        await dbRun(
          `INSERT INTO health_metrics (user_id, type, value, unit, notes, source)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            userId,
            internalType,
            metric.value,
            metric.unit || null,
            `Synced from ${SUPPORTED_APPS[appName].name}`,
            appName
          ]
        );
        syncedCount++;
      } catch (error) {
        console.error(`Error syncing metric ${metric.type}:`, error);
        // Continue with other metrics
      }
    }

    // Update last sync time
    await dbRun(
      `UPDATE health_app_sync SET last_sync = CURRENT_TIMESTAMP WHERE user_id = ? AND app_name = ?`,
      [userId, appName]
    );

    console.log(`✅ Synced ${syncedCount} metrics from ${appName} for user ${userId}`);
    res.json({ 
      success: true, 
      syncedCount,
      message: `Synced ${syncedCount} metrics from ${SUPPORTED_APPS[appName].name}` 
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual sync trigger (for testing)
router.post('/sync/:appName', async (req, res) => {
  try {
    const userId = req.userId;
    const appName = req.params.appName;

    if (!SUPPORTED_APPS[appName]) {
      return res.status(400).json({ error: 'Invalid app name' });
    }

    // Get connection info
    const connection = await dbGet(
      `SELECT * FROM health_app_sync WHERE user_id = ? AND app_name = ? AND sync_enabled = 1`,
      [userId, appName]
    );

    if (!connection) {
      return res.status(404).json({ error: 'App not connected' });
    }

    // In production, this would call the external API
    // For now, return a message indicating sync would happen
    res.json({ 
      success: true, 
      message: `Sync initiated for ${SUPPORTED_APPS[appName].name}. In production, this would fetch data from the API.` 
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

