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

  useEffect(() => {
    if (user) {
      loadApps();
    }
  }, [user]);

  const loadApps = async () => {
    try {
      const response = await api.get("/health/sync/apps");
      setApps(response.data.apps || []);
    } catch (error) {
      console.error("Error loading health apps:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (appId) => {
    try {
      // In production, this would open OAuth flow
      // For now, we'll use a mock token
      const mockToken = `mock_token_${appId}_${Date.now()}`;
      
      await api.post("/health/sync/connect", {
        appName: appId,
        accessToken: mockToken
      });
      
      alert(t("health.appConnected") || `${apps.find(a => a.id === appId)?.name} connected successfully!`);
      loadApps();
    } catch (error) {
      console.error("Error connecting app:", error);
      alert(t("common.error") + ": " + (error.response?.data?.error || error.message));
    }
  };

  const handleDisconnect = async (appId) => {
    try {
      await api.post("/health/sync/disconnect", { appName: appId });
      alert(t("health.appDisconnected") || `${apps.find(a => a.id === appId)?.name} disconnected`);
      loadApps();
    } catch (error) {
      console.error("Error disconnecting app:", error);
      alert(t("common.error") + ": " + (error.response?.data?.error || error.message));
    }
  };

  const handleSync = async (appId) => {
    if (!user) return;
    
    setSyncing(prev => ({ ...prev, [appId]: true }));
    
    try {
      // In production, this would fetch real data from the external API
      // For now, we'll simulate syncing some sample data
      const sampleMetrics = [
        { type: "pulse", value: 72, unit: "bpm" },
        { type: "sleep", value: 7.5, unit: "hours" },
        { type: "weight", value: 70, unit: "kg" }
      ];

      await api.post("/health/sync/sync", {
        appName: appId,
        metrics: sampleMetrics
      });
      
      alert(t("health.syncSuccess") || `Synced data from ${apps.find(a => a.id === appId)?.name}`);
      // Reload page data
      window.location.reload();
    } catch (error) {
      console.error("Error syncing:", error);
      alert(t("common.error") + ": " + (error.response?.data?.error || error.message));
    } finally {
      setSyncing(prev => ({ ...prev, [appId]: false }));
    }
  };

  if (loading) {
    return <div>{t("common.loading") || "Loading..."}</div>;
  }

  return (
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
              onClick={() => handleConnect(app.id)}
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
  );
}

