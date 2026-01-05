import React, { useState, useEffect, useContext } from "react";
import { api } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Card from "../ui/components/Card";

export default function HealthAppSync() {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    // Backend uses middleware to get user_id from initData, so we can load apps even without user context
    loadApps();
  }, [user]);

  const loadApps = async () => {
    try {
      setLoading(true);
      console.log("Loading health apps...");
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthAppSync.jsx:loadApps',
          message: 'loadApps ENTRY',
          data: { hasUser: !!user, userId: user?.id },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H1'
        })
      }).catch(() => {});
      // #endregion
      
      const response = await api.get("/health/sync/apps");
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthAppSync.jsx:loadApps',
          message: 'loadApps API RESPONSE',
          data: { 
            status: response.status,
            appsCount: response.data?.apps?.length || 0,
            apps: response.data?.apps || []
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H1'
        })
      }).catch(() => {});
      // #endregion
      
      console.log("Health apps response:", response.data);
      const appsData = response.data?.apps || [];
      console.log(`Loaded ${appsData.length} health apps`);
      setApps(appsData);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthAppSync.jsx:loadApps',
          message: 'loadApps ERROR',
          data: { 
            error: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            responseData: error.response?.data,
            url: error.config?.url
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H1'
        })
      }).catch(() => {});
      // #endregion
      console.error("Error loading health apps:", error);
      console.error("Error details:", error.response?.data);
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectClick = (app) => {
    setSelectedApp(app);
    setShowConnectModal(true);
  };

  const handleConnectConfirm = async () => {
    if (!selectedApp) return;
    
    try {
      const appId = selectedApp.id;
      const app = apps.find(a => a.id === appId);
      
      // Show OAuth instructions
      let oauthUrl = "";
      let instructions = "";
      
      if (appId === "google_fit") {
        instructions = `To connect Google Fit:
1. Click "Authorize" below to open Google OAuth
2. Sign in with your Google account
3. Grant permissions to access Google Fit data
4. You will be redirected back to the app`;
        
        // In production, this would be the actual OAuth URL
        oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/google-fit/callback')}&response_type=code&scope=https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/fitness.heart_rate.read`;
      } else if (appId === "mi_fit") {
        instructions = `To connect Mi Fit (Xiaomi Health):
1. Click "Authorize" below to open Xiaomi OAuth
2. Sign in with your Xiaomi account
3. Grant permissions to access health data
4. You will be redirected back to the app

API Reference: https://dev.mi.com/docs/passport/en/open-api/`;
        
        // In production, this would be the actual OAuth URL
        oauthUrl = `https://open.account.xiaomi.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=${encodeURIComponent(window.location.origin + '/auth/mi-fit/callback')}&response_type=code&scope=1+3`;
      } else if (appId === "apple_health") {
        instructions = `To connect Apple Health:
1. Open Settings > Privacy & Security > Health
2. Enable HealthKit sharing
3. Grant permissions to this app
4. The app will automatically sync data

Note: Full integration requires iOS app with HealthKit framework`;
        oauthUrl = null; // Apple Health uses HealthKit, not OAuth
      } else {
        instructions = `To connect ${app?.name}:
Please refer to the app's official documentation for OAuth setup instructions.`;
        oauthUrl = null;
      }

      // For now, use test token (in production, redirect to OAuth)
      const useTestToken = window.confirm(instructions + "\n\nFor testing: Use test token? (In production, this would redirect to OAuth)");
      
      if (useTestToken) {
        const mockToken = `mock_token_${appId}_${Date.now()}`;
        
        console.log(`Connecting ${appId} with test token...`);
        await api.post("/health/sync/connect", {
          appName: appId,
          accessToken: mockToken
        });
        
        alert(t("health.appConnected") || `${app?.name} connected successfully!`);
        setShowConnectModal(false);
        setSelectedApp(null);
        await loadApps();
      } else if (oauthUrl) {
        // In production, redirect to OAuth URL
        window.location.href = oauthUrl;
      }
    } catch (error) {
      console.error("Error connecting app:", error);
      console.error("Error details:", error.response?.data);
      alert(t("common.error") + ": " + (error.response?.data?.error || error.message));
    }
  };

  const handleDisconnect = async (appId) => {
    if (!window.confirm(t("health.disconnectConfirm") || "Are you sure you want to disconnect this app?")) {
      return;
    }
    
    try {
      await api.post("/health/sync/disconnect", { appName: appId });
      alert(t("health.appDisconnected") || `${apps.find(a => a.id === appId)?.name} disconnected`);
      await loadApps();
    } catch (error) {
      console.error("Error disconnecting app:", error);
      alert(t("common.error") + ": " + (error.response?.data?.error || error.message));
    }
  };

  const handleSync = async (appId) => {
    if (!user) return;
    
    setSyncing(prev => ({ ...prev, [appId]: true }));
    
    try {
      // Use the manual sync endpoint that fetches real data from the API
      const response = await api.post(`/health/sync/sync/${appId}`, {}, {
        params: { days: 7 } // Sync last 7 days
      });
      
      const syncedCount = response.data?.syncedCount || 0;
      const message = response.data?.message || t("health.syncSuccess") || `Synced data from ${apps.find(a => a.id === appId)?.name}`;
      
      alert(`${message}\n${syncedCount > 0 ? `Synced ${syncedCount} metrics.` : 'No new data to sync.'}`);
      
      // Reload page data to show synced metrics
      window.location.reload();
    } catch (error) {
      console.error("Error syncing:", error);
      const errorMessage = error.response?.data?.error || error.message;
      const needsReconnect = error.response?.data?.needsReconnect;
      
      if (needsReconnect) {
        alert(t("health.reconnectRequired") || `Please reconnect ${apps.find(a => a.id === appId)?.name}. Your access token has expired.`);
        // Optionally reload apps to show disconnect status
        await loadApps();
      } else {
        alert(t("common.error") + ": " + errorMessage);
      }
    } finally {
      setSyncing(prev => ({ ...prev, [appId]: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>{t("common.loading") || "Loading health apps..."}</div>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
        <p>No health apps available</p>
        <button 
          onClick={loadApps}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: '#2D9B8C',
            color: 'white',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
        {apps.map(app => (
          <Card key={app.id} style={{ padding: '15px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>{app.icon}</div>
            <h4 style={{ margin: '10px 0' }}>{app.name}</h4>
            {app.connected ? (
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                  {app.lastSync 
                    ? `${t("health.lastSync") || "Last sync"}: ${new Date(app.lastSync).toLocaleDateString()}`
                    : t("health.notSynced") || "Not synced yet"}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  <button
                    onClick={() => handleSync(app.id)}
                    disabled={syncing[app.id]}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: syncing[app.id] ? '#ccc' : '#2D9B8C',
                      color: 'white',
                      cursor: syncing[app.id] ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {syncing[app.id] ? t("common.syncing") || "Syncing..." : t("health.syncNow") || "Sync Now"}
                  </button>
                  <button
                    onClick={() => handleDisconnect(app.id)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid #e74c3c',
                      background: 'white',
                      color: '#e74c3c',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {t("health.disconnect") || "Disconnect"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleConnectClick(app)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2D9B8C',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  width: '100%'
                }}
              >
                {t("health.connect") || "Connect"}
              </button>
            )}
          </Card>
        ))}
      </div>

      {/* Connect Modal */}
      {showConnectModal && selectedApp && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card style={{
            padding: '20px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginTop: 0 }}>Connect {selectedApp.name}</h3>
            <p style={{ whiteSpace: 'pre-line', marginBottom: '20px' }}>
              {selectedApp.id === "google_fit" && `To connect Google Fit:
1. Click "Authorize" below to open Google OAuth
2. Sign in with your Google account
3. Grant permissions to access Google Fit data
4. You will be redirected back to the app

API Reference: https://developers.google.com/fit/rest/v1/reference`}
              {selectedApp.id === "mi_fit" && `To connect Mi Fit (Xiaomi Health):
1. Click "Authorize" below to open Xiaomi OAuth
2. Sign in with your Xiaomi account
3. Grant permissions to access health data
4. You will be redirected back to the app

API Reference: https://dev.mi.com/docs/passport/en/open-api/`}
              {selectedApp.id === "apple_health" && `To connect Apple Health:
1. Open Settings > Privacy & Security > Health
2. Enable HealthKit sharing
3. Grant permissions to this app
4. The app will automatically sync data

Note: Full integration requires iOS app with HealthKit framework`}
              {!["google_fit", "mi_fit", "apple_health"].includes(selectedApp.id) && `To connect ${selectedApp.name}:
Please refer to the app's official documentation for OAuth setup instructions.`}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  setSelectedApp(null);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                {t("common.cancel") || "Cancel"}
              </button>
              <button
                onClick={handleConnectConfirm}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2D9B8C',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {t("health.authorize") || "Authorize"}
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
