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

// Refresh Google Fit access token using refresh token
async function refreshGoogleFitToken(refreshToken) {
  try {
    const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Google Fit credentials not configured');
    }
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token'
      })
    });
    
    const tokens = await response.json();
    
    if (tokens.error) {
      throw new Error(`Token refresh failed: ${tokens.error}`);
    }
    
    return tokens;
  } catch (error) {
    console.error('Error refreshing Google Fit token:', error);
    throw error;
  }
}

// Fetch data from Google Fit API
async function fetchGoogleFitData(accessToken, days = 7) {
  const endTimeMillis = Date.now();
  const startTimeMillis = endTimeMillis - (days * 24 * 60 * 60 * 1000);
  
  const metrics = [];
  
  console.log(`📊 Fetching Google Fit data from ${new Date(startTimeMillis).toISOString()} to ${new Date(endTimeMillis).toISOString()}`);
  
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
          startTimeMillis: startTimeMillis,
          endTimeMillis: endTimeMillis
        })
      }
    );
    
    if (!heartRateResponse.ok) {
      const errorData = await heartRateResponse.json().catch(() => ({}));
      console.error(`📊 Heart rate API error: ${heartRateResponse.status}`, errorData);
      if (heartRateResponse.status === 401) {
        throw new Error('401 Unauthorized - token expired');
      }
    } else {
      const data = await heartRateResponse.json();
      console.log(`📊 Heart rate response:`, { bucketCount: data.bucket?.length || 0 });
      if (data.bucket) {
        data.bucket.forEach(bucket => {
          if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
            bucket.dataset[0].point.forEach(point => {
              if (point.value && point.value[0]) {
                const value = point.value[0].fpVal || point.value[0].intVal;
                if (value) {
                  metrics.push({
                    type: 'com.google.heart_rate.bpm',
                    value: value,
                    unit: 'bpm',
                    timestamp: point.startTimeNanos || point.endTimeNanos
                  });
                }
              }
            });
          }
        });
      }
    }
    
    // Fetch sleep data
    const sleepResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${startTimeMillis}&endTime=${endTimeMillis}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (!sleepResponse.ok) {
      const errorData = await sleepResponse.json().catch(() => ({}));
      console.error(`📊 Sleep API error: ${sleepResponse.status}`, errorData);
    } else {
      const sleepData = await sleepResponse.json();
      console.log(`📊 Sleep response:`, { sessionCount: sleepData.session?.length || 0 });
      if (sleepData.session) {
        sleepData.session.forEach(session => {
          if (session.activityType === 72) { // Sleep activity type
            const durationHours = (session.endTimeMillis - session.startTimeMillis) / (1000 * 60 * 60);
            if (durationHours > 0) {
              metrics.push({
                type: 'com.google.sleep.segment',
                value: durationHours,
                unit: 'hours',
                timestamp: session.startTimeMillis * 1000000
              });
            }
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
          startTimeMillis: startTimeMillis,
          endTimeMillis: endTimeMillis
        })
      }
    );
    
    if (!weightResponse.ok) {
      const errorData = await weightResponse.json().catch(() => ({}));
      console.error(`📊 Weight API error: ${weightResponse.status}`, errorData);
    } else {
      const weightData = await weightResponse.json();
      console.log(`📊 Weight response:`, { bucketCount: weightData.bucket?.length || 0 });
      if (weightData.bucket) {
        weightData.bucket.forEach(bucket => {
          if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
            bucket.dataset[0].point.forEach(point => {
              if (point.value && point.value[0]) {
                const value = point.value[0].fpVal || point.value[0].intVal;
                if (value) {
                  metrics.push({
                    type: 'com.google.weight',
                    value: value,
                    unit: 'kg',
                    timestamp: point.startTimeNanos || point.endTimeNanos
                  });
                }
              }
            });
          }
        });
      }
    }
    
    console.log(`📊 Total metrics fetched: ${metrics.length}`);
    
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

    console.log(`🔄 POST /health/sync/sync/${appName} - userId=${userId}, days=${days}`);
    console.log(`🔄 Request body:`, req.body);
    console.log(`🔄 Request query:`, req.query);
    console.log(`🔄 Request params:`, req.params);

    if (!SUPPORTED_APPS[appName]) {
      console.log(`🔄 ERROR: Invalid app name: ${appName}`);
      return res.status(400).json({ error: 'Invalid app name' });
    }

    // Get connection info
    const connection = await dbGet(
      `SELECT * FROM health_app_sync WHERE user_id = ? AND app_name = ? AND sync_enabled = 1`,
      [userId, appName]
    );

    console.log(`🔄 Connection found:`, connection ? { 
      appName: connection.app_name, 
      hasToken: !!connection.access_token,
      tokenPrefix: connection.access_token ? connection.access_token.substring(0, 10) + '...' : 'none',
      isMockToken: connection.access_token?.startsWith('mock_token')
    } : 'not found');

    if (!connection) {
      console.log(`🔄 ERROR: App not connected`);
      return res.status(404).json({ error: 'App not connected' });
    }

    if (!connection.access_token) {
      console.log(`🔄 ERROR: Access token not found`);
      return res.status(400).json({ error: 'Access token not found. Please reconnect the app.' });
    }

    // Check if it's a mock token
    if (connection.access_token.startsWith('mock_token')) {
      console.log(`🔄 Mock token detected - generating sample data`);
      // Generate sample data for testing
      const sampleMetrics = [
        { type: 'com.google.heart_rate.bpm', value: 72 + Math.floor(Math.random() * 10), unit: 'bpm', timestamp: Date.now() * 1000000 },
        { type: 'com.google.sleep.segment', value: 7.5 + Math.random(), unit: 'hours', timestamp: (Date.now() - 86400000) * 1000000 },
        { type: 'com.google.weight', value: 70 + Math.random() * 5, unit: 'kg', timestamp: (Date.now() - 172800000) * 1000000 }
      ];
      
      // Map and save sample metrics
      const metricTypeMap = {
        google_fit: {
          'com.google.heart_rate.bpm': 'pulse',
          'com.google.sleep.segment': 'sleep',
          'com.google.weight': 'weight'
        }
      };
      
      const typeMap = metricTypeMap[appName] || {};
      let syncedCount = 0;

      for (const metric of sampleMetrics) {
        const internalType = typeMap[metric.type] || metric.type;
        
        if (!['pulse', 'sleep', 'weight', 'pressure', 'systolic', 'diastolic', 'sugar'].includes(internalType)) {
          continue;
        }

        try {
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
              `Synced from ${SUPPORTED_APPS[appName].name} (test data)`,
              appName,
              timestamp || 'CURRENT_TIMESTAMP'
            ]
          );
          syncedCount++;
        } catch (error) {
          console.error(`Error syncing metric ${metric.type}:`, error);
        }
      }

      await dbRun(
        `UPDATE health_app_sync SET last_sync = CURRENT_TIMESTAMP WHERE user_id = ? AND app_name = ?`,
        [userId, appName]
      );

      console.log(`✅ Synced ${syncedCount} test metrics from ${appName} for user ${userId}`);
      return res.json({ 
        success: true, 
        syncedCount,
        message: `Synced ${syncedCount} test metrics from ${SUPPORTED_APPS[appName].name}` 
      });
    }

    let metrics = [];
    
    // Fetch data from the health app API
    if (appName === 'google_fit') {
      let accessToken = connection.access_token;
      let tokenRefreshed = false;
      
      try {
        console.log(`🔄 Fetching data from Google Fit API...`);
        metrics = await fetchGoogleFitData(accessToken, parseInt(days));
        console.log(`📊 Fetched ${metrics.length} metrics from Google Fit`);
      } catch (error) {
        console.error('🔄 Error fetching from Google Fit:', error);
        console.error('🔄 Error details:', error.message, error.stack);
        
        // If token expired, try to refresh
        if (error.message && (error.message.includes('401') || error.message.includes('unauthorized'))) {
          if (connection.refresh_token) {
            console.log(`🔄 Access token expired, attempting to refresh...`);
            try {
              const newTokens = await refreshGoogleFitToken(connection.refresh_token);
              accessToken = newTokens.access_token;
              
              // Update tokens in database
              await dbRun(
                `UPDATE health_app_sync SET access_token = ?, refresh_token = ? WHERE user_id = ? AND app_name = ?`,
                [newTokens.access_token, newTokens.refresh_token || connection.refresh_token, userId, appName]
              );
              
              console.log(`✅ Token refreshed successfully`);
              tokenRefreshed = true;
              
              // Retry fetching data with new token
              metrics = await fetchGoogleFitData(accessToken, parseInt(days));
              console.log(`📊 Fetched ${metrics.length} metrics from Google Fit (after refresh)`);
            } catch (refreshError) {
              console.error('🔄 Token refresh failed:', refreshError);
              return res.status(401).json({ 
                error: 'Access token expired and refresh failed. Please reconnect the app.',
                needsReconnect: true
              });
            }
          } else {
            return res.status(401).json({ 
              error: 'Access token expired. Please reconnect the app.',
              needsReconnect: true
            });
          }
        } else {
          throw error;
        }
      }
    } else {
      // For other apps, generate sample data if mock token, otherwise return message
      if (connection.access_token.startsWith('mock_token')) {
        console.log(`🔄 Mock token detected for ${appName} - generating sample data`);
        const sampleMetrics = [
          { type: 'heart_rate', value: 72 + Math.floor(Math.random() * 10), unit: 'bpm', timestamp: Date.now() * 1000000 },
          { type: 'sleep', value: 7.5 + Math.random(), unit: 'hours', timestamp: (Date.now() - 86400000) * 1000000 },
          { type: 'weight', value: 70 + Math.random() * 5, unit: 'kg', timestamp: (Date.now() - 172800000) * 1000000 }
        ];
        
        const metricTypeMap = {
          mi_fit: {
            'heart_rate': 'pulse',
            'sleep': 'sleep',
            'weight': 'weight'
          },
          apple_health: {
            'heart_rate': 'pulse',
            'sleep': 'sleep',
            'weight': 'weight'
          }
        };
        
        const typeMap = metricTypeMap[appName] || {};
        let syncedCount = 0;

        for (const metric of sampleMetrics) {
          const internalType = typeMap[metric.type] || metric.type;
          
          if (!['pulse', 'sleep', 'weight', 'pressure', 'systolic', 'diastolic', 'sugar'].includes(internalType)) {
            continue;
          }

          try {
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
                `Synced from ${SUPPORTED_APPS[appName].name} (test data)`,
                appName,
                timestamp || 'CURRENT_TIMESTAMP'
              ]
            );
            syncedCount++;
          } catch (error) {
            console.error(`Error syncing metric ${metric.type}:`, error);
          }
        }

        await dbRun(
          `UPDATE health_app_sync SET last_sync = CURRENT_TIMESTAMP WHERE user_id = ? AND app_name = ?`,
          [userId, appName]
        );

        console.log(`✅ Synced ${syncedCount} test metrics from ${appName} for user ${userId}`);
        return res.json({ 
          success: true, 
          syncedCount,
          message: `Synced ${syncedCount} test metrics from ${SUPPORTED_APPS[appName].name}` 
        });
      } else {
        // For other apps, return message that integration is not yet implemented
        console.log(`🔄 Sync for ${appName} not fully implemented`);
        return res.json({ 
          success: true, 
          message: `Sync for ${SUPPORTED_APPS[appName].name} is not yet fully implemented. Please use the manual sync endpoint with metrics.`,
          syncedCount: 0
        });
      }
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

