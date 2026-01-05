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
    console.log(`📱 GET /health/sync/apps - userId=${userId}`);
    
    if (!userId) {
      console.log(`📱 ERROR: No userId found`);
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Get user's connected apps from database
    const connectedApps = await dbAll(
      `SELECT app_name, access_token, last_sync, sync_enabled 
       FROM health_app_sync 
       WHERE user_id = ? AND sync_enabled = 1`,
      [userId]
    );

    console.log(`📱 Found ${connectedApps.length} connected apps for user ${userId}`);

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

    console.log(`📱 Returning ${apps.length} apps`);
    res.json({ apps });
  } catch (error) {
    console.error('📱 Get apps error:', error);
    console.error('📱 Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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

// Fetch data from Google Fit API
async function fetchGoogleFitData(accessToken, days = 7) {
  const endTime = Date.now() * 1000000; // nanoseconds
  const startTime = endTime - (days * 24 * 60 * 60 * 1000000000); // nanoseconds
  
  const metrics = [];
  
  try {
    // Fetch heart rate data
    const heartRateResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aggregateBy: [{
            dataTypeName: 'com.google.heart_rate.bpm'
          }],
          bucketByTime: { durationMillis: 86400000 }, // 1 day
          startTimeMillis: Math.floor(startTime / 1000000),
          endTimeMillis: Math.floor(endTime / 1000000)
        })
      }
    );
    
    if (heartRateResponse.ok) {
      const data = await heartRateResponse.json();
      if (data.bucket) {
        data.bucket.forEach(bucket => {
          if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
            bucket.dataset[0].point.forEach(point => {
              if (point.value && point.value[0]) {
                metrics.push({
                  type: 'com.google.heart_rate.bpm',
                  value: point.value[0].fpVal || point.value[0].intVal,
                  unit: 'bpm',
                  timestamp: point.startTimeNanos
                });
              }
            });
          }
        });
      }
    }
    
    // Fetch sleep data
    const sleepResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${Math.floor(startTime / 1000000)}&endTime=${Math.floor(endTime / 1000000)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (sleepResponse.ok) {
      const sleepData = await sleepResponse.json();
      if (sleepData.session) {
        sleepData.session.forEach(session => {
          if (session.activityType === 72) { // Sleep activity type
            const durationHours = (session.endTimeMillis - session.startTimeMillis) / (1000 * 60 * 60);
            metrics.push({
              type: 'com.google.sleep.segment',
              value: durationHours,
              unit: 'hours',
              timestamp: session.startTimeMillis * 1000000
            });
          }
        });
      }
    }
    
    // Fetch weight data
    const weightResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aggregateBy: [{
            dataTypeName: 'com.google.weight'
          }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: Math.floor(startTime / 1000000),
          endTimeMillis: Math.floor(endTime / 1000000)
        })
      }
    );
    
    if (weightResponse.ok) {
      const weightData = await weightResponse.json();
      if (weightData.bucket) {
        weightData.bucket.forEach(bucket => {
          if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
            bucket.dataset[0].point.forEach(point => {
              if (point.value && point.value[0]) {
                metrics.push({
                  type: 'com.google.weight',
                  value: point.value[0].fpVal || point.value[0].intVal,
                  unit: 'kg',
                  timestamp: point.startTimeNanos
                });
              }
            });
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error fetching Google Fit data:', error);
    throw error;
  }
  
  return metrics;
}

// Manual sync trigger - fetches real data from health apps
router.post('/sync/:appName', async (req, res) => {
  try {
    const userId = req.userId;
    const appName = req.params.appName;
    const { days = 7 } = req.query;

    console.log(`🔄 Manual sync requested for ${appName}, user ${userId}, days: ${days}`);

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

    if (!connection.access_token) {
      return res.status(400).json({ error: 'Access token not found. Please reconnect the app.' });
    }

    let metrics = [];
    
    // Fetch data from the health app API
    if (appName === 'google_fit') {
      try {
        metrics = await fetchGoogleFitData(connection.access_token, parseInt(days));
        console.log(`📊 Fetched ${metrics.length} metrics from Google Fit`);
      } catch (error) {
        console.error('Error fetching from Google Fit:', error);
        // If token expired, try to refresh
        if (error.message && error.message.includes('401')) {
          return res.status(401).json({ 
            error: 'Access token expired. Please reconnect the app.',
            needsReconnect: true
          });
        }
        throw error;
      }
    } else {
      // For other apps, return message that integration is not yet implemented
      return res.json({ 
        success: true, 
        message: `Sync for ${SUPPORTED_APPS[appName].name} is not yet fully implemented. Please use the manual sync endpoint with metrics.`,
        syncedCount: 0
      });
    }

    // Map and save metrics
    const metricTypeMap = {
      google_fit: {
        'com.google.heart_rate.bpm': 'pulse',
        'com.google.sleep.segment': 'sleep',
        'com.google.weight': 'weight',
        'com.google.blood_pressure.systolic': 'systolic',
        'com.google.blood_pressure.diastolic': 'diastolic',
        'com.google.blood_glucose': 'sugar'
      }
    };

    const typeMap = metricTypeMap[appName] || {};
    let syncedCount = 0;

    for (const metric of metrics) {
      const internalType = typeMap[metric.type] || metric.type;
      
      if (!['pulse', 'sleep', 'weight', 'pressure', 'systolic', 'diastolic', 'sugar'].includes(internalType)) {
        continue;
      }

      try {
        // Convert timestamp from nanoseconds to datetime string
        const timestamp = metric.timestamp 
          ? new Date(Math.floor(metric.timestamp / 1000000)).toISOString().replace('T', ' ').substring(0, 19)
          : null;

        await dbRun(
          `INSERT INTO health_metrics (user_id, type, value, unit, notes, source, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            internalType,
            metric.value,
            metric.unit || null,
            `Synced from ${SUPPORTED_APPS[appName].name}`,
            appName,
            timestamp || 'CURRENT_TIMESTAMP'
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
    console.error('Manual sync error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;

