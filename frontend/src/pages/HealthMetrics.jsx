import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import Card from "../ui/components/Card";
import { api } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import HealthAppSync from "../components/HealthAppSync";
import "../styles/HealthMetrics.css";

export default function HealthMetrics() {
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'HealthMetrics.jsx:component',
        message: 'COMPONENT MOUNTED',
        data: { componentName: 'HealthMetrics.jsx (page)' },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H4'
      })
    }).catch(() => {});
    return () => {
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthMetrics.jsx:component',
          message: 'COMPONENT UNMOUNTED',
          data: { componentName: 'HealthMetrics.jsx (page)' },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H4'
        })
      }).catch(() => {});
    };
  }, []);
  // #endregion

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const [selectedMetric, setSelectedMetric] = useState("pulse");
  
  // Handle OAuth callback messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const success = params.get('success');
    const error = params.get('error');
    const errorMessage = params.get('message');
    
    if (connected && success === 'true') {
      alert(t("health.appConnected") || `Google Fit connected successfully! You can now sync your health data.`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      const messages = {
        'oauth_denied': 'Authorization was denied. Please try again.',
        'no_code': errorMessage || 'Authorization code not received. This usually means:\n1. Redirect URI does not match Google Cloud Console settings\n2. You did not complete authorization on Google\n\nPlease check that redirect URI in Google Cloud Console matches:\nhttps://ezhealth-l6zx.onrender.com/api/auth/google-fit/callback',
        'no_user': 'User not found. Please log in again.',
        'token_failed': 'Failed to exchange authorization code. Please try again.',
        'config_error': 'Server configuration error. Please contact support.',
        'server_error': 'Server error occurred. Please try again later.'
      };
      const errorMsg = errorMessage || messages[error] || 'Unknown error occurred';
      console.error(`❌ OAuth error: ${error}`, errorMsg);
      alert(t("common.error") || "Error" + ": " + errorMsg);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [t]);
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState(() => {
    // This will be updated when language changes
    return [
      {
        id: "pulse",
        name: "Pulse",
        icon: "❤️",
        unit: "bpm",
        current: 0,
        normal: "60-100",
        trend: "",
        color: "#e74c3c"
      },
      {
        id: "sleep",
        name: "Sleep",
        icon: "😴",
        unit: "hours",
        current: 0,
        normal: "7-9",
        trend: "",
        color: "#3498db"
      },
      {
        id: "weight",
        name: "Weight",
        icon: "⚖️",
        unit: "kg",
        current: 0,
        normal: "65-75",
        trend: "",
        color: "#f39c12"
      },
      {
        id: "pressure",
        name: "Blood Pressure",
        icon: "📊",
        unit: "mmHg",
        current: "-",
        normal: "< 120/80",
        trend: "",
        color: "#9b59b6"
      },
      {
        id: "sugar",
        name: "Blood Sugar",
        icon: "🍬",
        unit: "mmol/L",
        current: 0,
        normal: "4-6",
        trend: "",
        color: "#9b59b6"
      }
    ];
  });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSyncApps, setShowSyncApps] = useState(true); // Show by default
  const [formData, setFormData] = useState({
    type: "pulse",
    value: "",
    unit: "",
    notes: ""
  });

  useEffect(() => {
    // Update metric names when language changes
    setMetrics(prev => prev.map(m => ({
      ...m,
      name: m.id === "pulse" ? t("health.pulse") :
            m.id === "sleep" ? t("health.sleep") :
            m.id === "weight" ? t("health.weight") :
            m.id === "pressure" ? t("health.pressure") :
            m.id === "sugar" ? t("health.sugar") : m.name
    })));
  }, [t]);

  // Track selectedMetric changes
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'HealthMetrics.jsx:useEffect[selectedMetric-track]',
        message: 'selectedMetric STATE CHANGED',
        data: { 
          selectedMetric: selectedMetric,
          stackTrace: new Error().stack?.split('\n').slice(0, 8).join(' | ')
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1'
      })
    }).catch(() => {});
    // #endregion
  }, [selectedMetric]);

  // Define loadMetrics before useEffect that uses it
  const loadMetrics = async () => {
    loadMetricsCallCountRef.current++;
    const callNumber = loadMetricsCallCountRef.current;
    // Backend uses middleware to get user_id from initData, so we don't need user.id
    // But we still log if user is available for debugging
    const frontendUserId = user?.id;
    const userIdType = typeof frontendUserId;
    console.log(`📊 Loading metrics (user from context: ${frontendUserId || 'null'}, backend will use initData)`);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'HealthMetrics.jsx:loadMetrics',
        message: 'loadMetrics ENTRY',
        data: { 
          callNumber: callNumber,
          totalCalls: loadMetricsCallCountRef.current,
          hasUser: !!user,
          userId: frontendUserId, 
          userIdType: userIdType,
          selectedMetric: selectedMetric,
          loading: loading,
          stackTrace: new Error().stack?.split('\n').slice(0, 8).join(' | '),
          note: 'Backend will use initData from headers to get user_id'
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1'
      })
    }).catch(() => {});
    // #endregion

    try {
      setLoading(true);
      // Load more metrics to get latest values for all types
      const response = await api.get("/health/metrics", {
        params: { limit: 100, days: 30 }
      });
      
      console.log(`📊 API Response status: ${response.status}`, response.data);
      
      const allMetrics = response.data.metrics || [];
      const responseUserId = response.data.userId;
      const responseUserIdType = typeof responseUserId;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthMetrics.jsx:loadMetrics',
          message: 'loadMetrics API RESPONSE',
          data: { 
            frontendUserId: frontendUserId,
            frontendUserIdType: userIdType,
            responseUserId: responseUserId,
            responseUserIdType: responseUserIdType,
            metricsCount: allMetrics.length,
            sampleMetrics: allMetrics.slice(0, 5).map(m => ({ 
              id: m.id, 
              type: m.type, 
              value: m.value, 
              user_id: m.user_id,
              user_id_type: typeof m.user_id,
              recorded_at: m.recorded_at 
            }))
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H1'
        })
      }).catch(() => {});
      // #endregion
      
      console.log("📊 API Response:", {
        backendUserId: responseUserId,
        frontendUser: user?.id || 'null',
        metricsCount: allMetrics.length,
        sampleMetrics: allMetrics.slice(0, 3).map(m => ({ id: m.id, type: m.type, value: m.value, user_id: m.user_id }))
      });
      
      // Get latest values for each metric type
      const latestValues = {};
      allMetrics.forEach(m => {
        const metricType = m.type;
        const recordedAt = m.recorded_at ? new Date(m.recorded_at) : new Date(0);
        const existing = latestValues[metricType];
        const existingDate = existing && existing.recorded_at ? new Date(existing.recorded_at) : new Date(0);
        
        if (!existing || recordedAt > existingDate) {
          latestValues[metricType] = m;
        }
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthMetrics.jsx:loadMetrics',
          message: 'BEFORE setMetrics - latestValues computed',
          data: { 
            latestValuesKeys: Object.keys(latestValues),
            latestValuesDetails: Object.keys(latestValues).map(type => ({
              type,
              value: latestValues[type].value,
              valueType: typeof latestValues[type].value,
              recorded_at: latestValues[type].recorded_at,
              user_id: latestValues[type].user_id
            }))
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H2'
        })
      }).catch(() => {});
      // #endregion

      console.log("Latest values by type:", latestValues);
      console.log("Latest values details:", Object.keys(latestValues).map(type => ({
        type,
        value: latestValues[type].value,
        recorded_at: latestValues[type].recorded_at
      })));

      // Update metrics with latest values
      setMetrics(prev => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'HealthMetrics.jsx:setMetrics',
            message: 'setMetrics ENTRY - prev state',
            data: { 
              prevMetrics: prev.map(m => ({ id: m.id, name: m.name, current: m.current })),
              latestValuesKeys: Object.keys(latestValues)
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'H2'
          })
        }).catch(() => {});
        // #endregion

        const updated = prev.map(m => {
          // Map metric IDs to API types
          const typeMap = {
            pulse: "pulse",
            sleep: "sleep",
            weight: "weight",
            pressure: "pressure", // Can be "pressure", "systolic", or "diastolic"
            sugar: "sugar"
          };
          
          const apiType = typeMap[m.id];
          const latest = latestValues[apiType];
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'HealthMetrics.jsx:setMetrics',
              message: `Processing metric ${m.id}`,
              data: { 
                metricId: m.id,
                apiType: apiType,
                hasLatest: !!latest,
                latestValue: latest?.value,
                latestValueType: typeof latest?.value,
                latestRecordedAt: latest?.recorded_at
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'H2'
            })
          }).catch(() => {});
          // #endregion
          
          if (latest && latest.value !== null && latest.value !== undefined) {
            let current = latest.value;
            
            // For pressure, check for systolic and diastolic separately
            if (m.id === "pressure") {
              const systolic = latestValues["systolic"];
              const diastolic = latestValues["diastolic"];
              const pressure = latestValues["pressure"];
              
              if (systolic && diastolic) {
                // Both systolic and diastolic available
                current = `${systolic.value}/${diastolic.value}`;
              } else if (pressure) {
                // Single pressure value
                current = pressure.value;
              } else if (systolic || diastolic) {
                // Only one part available
                current = systolic ? `${systolic.value}/-` : `-/${diastolic.value}`;
              } else {
                current = "-";
              }
            } else {
              // For other metrics, use the value directly
              current = parseFloat(latest.value) || 0;
            }
            
            console.log(`✅ Updated ${m.id} (${m.name}): ${current} ${m.unit} (from type: ${apiType}, value: ${latest.value})`);
            return { ...m, current };
          }
          
          // No data found, keep default
          const defaultValue = m.id === "pressure" ? "-" : 0;
          console.log(`⚠️ No data for ${m.id} (${m.name}), keeping default: ${defaultValue}`);
          return { ...m, current: defaultValue };
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'HealthMetrics.jsx:setMetrics',
            message: 'setMetrics EXIT - returning updated state',
            data: { 
              updatedMetrics: updated.map(m => ({ id: m.id, name: m.name, current: m.current, currentType: typeof m.current }))
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'H2'
          })
        }).catch(() => {});
        // #endregion
        
        console.log("Final updated metrics:", updated.map(m => ({ id: m.id, name: m.name, current: m.current })));
        return updated;
      });
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthMetrics.jsx:loadMetrics',
          message: 'loadMetrics ERROR',
          data: { 
            error: error.message,
            errorStatus: error.response?.status,
            errorData: error.response?.data
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H1'
        })
      }).catch(() => {});
      // #endregion
      console.error("Error loading metrics:", error);
      console.error("Error details:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // Define loadChartData before useEffect that uses it
  const loadChartData = async () => {
    loadChartDataCallCountRef.current++;
    const callNumber = loadChartDataCallCountRef.current;
    // Backend uses middleware to get user_id from initData, so we don't need user check
    if (!selectedMetric) return; // Don't load if no metric selected
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'HealthMetrics.jsx:loadChartData',
        message: 'loadChartData ENTRY',
        data: { 
          callNumber: callNumber,
          totalCalls: loadChartDataCallCountRef.current,
          selectedMetric: selectedMetric,
          hasUser: !!user,
          stackTrace: new Error().stack?.split('\n').slice(0, 8).join(' | ')
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H5'
      })
    }).catch(() => {});
    // #endregion
    
    try {
      const response = await api.get("/health/metrics/stats", {
        params: { type: selectedMetric, days: 30 }
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthMetrics.jsx:loadChartData',
          message: 'loadChartData API RESPONSE',
          data: { 
            selectedMetric: selectedMetric,
            dataCount: response.data?.data?.length || 0,
            hasData: !!(response.data?.data && response.data.data.length > 0)
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H5'
        })
      }).catch(() => {});
      // #endregion
      
      const data = response.data.data || [];
      
      // Format data for charts
      if (selectedMetric === "pressure") {
        // For pressure, we need to combine systolic and diastolic
        try {
          const systolicResponse = await api.get("/health/metrics/stats", {
            params: { type: "systolic", days: 30 }
          });
          const diastolicResponse = await api.get("/health/metrics/stats", {
            params: { type: "diastolic", days: 30 }
          });
          
          const systolicData = systolicResponse.data.data || [];
          const diastolicData = diastolicResponse.data.data || [];
          
          // Combine by date
          const combinedMap = new Map();
          
          systolicData.forEach(item => {
            const date = item.date || item.fullDate;
            if (!combinedMap.has(date)) {
              combinedMap.set(date, { date, systolic: item.value, diastolic: null });
            } else {
              combinedMap.get(date).systolic = item.value;
            }
          });
          
          diastolicData.forEach(item => {
            const date = item.date || item.fullDate;
            if (!combinedMap.has(date)) {
              combinedMap.set(date, { date, systolic: null, diastolic: item.value });
            } else {
              combinedMap.get(date).diastolic = item.value;
            }
          });
          
          const combined = Array.from(combinedMap.values()).sort((a, b) => 
            new Date(a.date) - new Date(b.date)
          );
          setChartData(combined);
        } catch (error) {
          console.error("Error loading pressure data:", error);
          setChartData([]);
        }
      } else {
        setChartData(data);
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthMetrics.jsx:loadChartData',
          message: 'loadChartData SUCCESS',
          data: { 
            selectedMetric: selectedMetric,
            chartDataLength: Array.isArray(data) ? data.length : (selectedMetric === "pressure" ? "combined" : 0)
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H5'
        })
      }).catch(() => {});
      // #endregion
    } catch (error) {
      console.error("Error loading chart data:", error);
      setChartData([]);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthMetrics.jsx:loadChartData',
          message: 'loadChartData ERROR',
          data: { 
            error: error.message,
            errorStatus: error.response?.status,
            selectedMetric: selectedMetric
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H5'
        })
      }).catch(() => {});
      // #endregion
    }
  };

  // Track initial load to prevent infinite loops
  const initialLoadRef = useRef(false);
  const loadMetricsCallCountRef = useRef(0);
  const loadChartDataCallCountRef = useRef(0);
  
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'HealthMetrics.jsx:useEffect[selectedMetric]',
        message: 'useEffect[selectedMetric] TRIGGERED',
        data: { 
          selectedMetric: selectedMetric,
          initialLoadRefCurrent: initialLoadRef.current,
          hasUser: !!user,
          userId: user?.id,
          loadMetricsCallCount: loadMetricsCallCountRef.current,
          loadChartDataCallCount: loadChartDataCallCountRef.current,
          stackTrace: new Error().stack?.split('\n').slice(0, 5).join(' | ')
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1'
      })
    }).catch(() => {});
    // #endregion

    // Only load metrics once on mount
    if (initialLoadRef.current) {
      // Only reload chart when metric selection changes
      loadChartDataCallCountRef.current++;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthMetrics.jsx:useEffect[selectedMetric]',
          message: 'CALLING loadChartData (selectedMetric changed)',
          data: { 
            selectedMetric: selectedMetric,
            callCount: loadChartDataCallCountRef.current
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H1'
        })
      }).catch(() => {});
      // #endregion
      loadChartData();
      return;
    }
    
    initialLoadRef.current = true;
    loadMetricsCallCountRef.current++;
    loadChartDataCallCountRef.current++;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'HealthMetrics.jsx:useEffect[selectedMetric]',
        message: 'INITIAL LOAD - calling loadMetrics and loadChartData',
        data: { 
          selectedMetric: selectedMetric,
          loadMetricsCallCount: loadMetricsCallCountRef.current,
          loadChartDataCallCount: loadChartDataCallCountRef.current
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1'
      })
    }).catch(() => {});
    // #endregion

    // Backend uses middleware to get user_id from initData, so we don't need user check
    try {
      if (typeof loadMetrics === 'function') {
        loadMetrics();
      }
      
      if (typeof loadChartData === 'function') {
        loadChartData();
      }
    } catch (error) {
      console.error('Error in useEffect calling load functions:', error);
    }
  }, [selectedMetric]); // Only depend on selectedMetric

  // REMOVED: Auto-reload effect that was causing infinite loops
  // The effect with [loading] dependency was triggering repeatedly:
  // 1. loadMetrics() sets loading=true, then loading=false
  // 2. useEffect[loading] triggers on loading change
  // 3. This creates a cycle of requests
  // Solution: Remove this effect entirely - initial load is handled by useEffect[selectedMetric]

  // Log metrics state changes to track if setMetrics actually updates the state
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'HealthMetrics.jsx:useEffect[metrics]',
        message: 'METRICS STATE CHANGED',
        data: { 
          metrics: metrics.map(m => ({ id: m.id, name: m.name, current: m.current, currentType: typeof m.current })),
          metricsLength: metrics.length,
          selectedMetric: selectedMetric,
          loading: loading
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H3'
      })
    }).catch(() => {});
    // #endregion
  }, [metrics]);

  const handleAddMetric = async (e) => {
    e.preventDefault();
    if (!formData.value) return;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'HealthMetrics.jsx:handleAddMetric',
        message: 'handleAddMetric ENTRY',
        data: { 
          userId: user?.id,
          userIdType: typeof user?.id,
          formData: formData,
          currentMetrics: metrics.map(m => ({ id: m.id, current: m.current }))
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H3'
      })
    }).catch(() => {});
    // #endregion

    try {
      console.log("Adding metric:", formData);
      const response = await api.post("/health/metrics", {
        type: formData.type,
        value: parseFloat(formData.value),
        unit: formData.unit || getDefaultUnit(formData.type),
        notes: formData.notes
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthMetrics.jsx:handleAddMetric',
          message: 'Metric ADDED - before reload',
          data: { 
            response: response.data,
            addedType: formData.type,
            addedValue: formData.value
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H3'
        })
      }).catch(() => {});
      // #endregion
      
      console.log("Metric added successfully:", response.data);
      
      setFormData({ type: "pulse", value: "", unit: "", notes: "" });
      setShowAddForm(false);
      
      // Immediately reload data after adding
      console.log("Reloading metrics after add...");
      try {
        await loadMetrics();
        await loadChartData();
        console.log("Metrics reloaded successfully");
        
        // Force a state check after a brief delay to see if metrics updated
        setTimeout(() => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'HealthMetrics.jsx:handleAddMetric',
              message: 'Metrics state CHECK after reload (500ms delay)',
              data: { 
                metricsAfterDelay: metrics.map(m => ({ id: m.id, current: m.current }))
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'H3'
            })
          }).catch(() => {});
          // #endregion
        }, 500);
      } catch (reloadError) {
        console.error("Error reloading metrics:", reloadError);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'HealthMetrics.jsx:handleAddMetric',
            message: 'Reload ERROR',
            data: { 
              error: reloadError.message,
              errorResponse: reloadError.response?.data
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'H3'
          })
        }).catch(() => {});
        // #endregion
        // Retry after delay
        setTimeout(async () => {
          console.log("Retrying metrics reload...");
          await loadMetrics();
          await loadChartData();
        }, 1000);
      }
    } catch (error) {
      console.error("Error adding metric:", error);
      console.error("Error details:", error.response?.data);
      alert(t("common.error") + ": " + (error.response?.data?.error || error.message));
    }
  };

  const getDefaultUnit = (type) => {
    const units = {
      pulse: "bpm",
      sleep: "hours",
      weight: "kg",
      pressure: "mmHg",
      sugar: "mmol/L"
    };
    return units[type] || "";
  };

  const getChartData = () => {
    return chartData;
  };

  const getMetricColor = () => {
    const metric = metrics.find(m => m.id === selectedMetric);
    return metric?.color || "#2D9B8C";
  };

  return (
    <div className="health-metrics-container">
      <div className="metrics-header">
        <h1>{t("health.title")}</h1>
      </div>

      {/* Health App Sync Section */}
      <Card className="sync-card" style={{ marginBottom: '20px', padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>{t("health.syncApps") || "Sync with Health Apps"}</h3>
          <button 
            onClick={() => setShowSyncApps(!showSyncApps)}
            style={{ 
              padding: '6px 12px', 
              borderRadius: '8px', 
              border: 'none', 
              background: '#2D9B8C', 
              color: 'white', 
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            {showSyncApps ? t("common.hide") : t("common.show")}
          </button>
        </div>
        {showSyncApps && <HealthAppSync />}
      </Card>

      {/* Quick Stats */}
      <div className="quick-stats">
        {metrics.map(metric => (
          <Card
            key={metric.id}
            className={`stat-card ${selectedMetric === metric.id ? "active" : ""}`}
            onClick={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  location: 'HealthMetrics.jsx:onClick',
                  message: 'USER CLICKED metric card',
                  data: { 
                    clickedMetricId: metric.id,
                    currentSelectedMetric: selectedMetric
                  },
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  runId: 'run1',
                  hypothesisId: 'H1'
                })
              }).catch(() => {});
              // #endregion
              setSelectedMetric(metric.id);
            }}
          >
            <div className="stat-icon">{metric.icon}</div>
            <div className="stat-value">{metric.current} {metric.unit}</div>
            <div className="stat-name">{metric.name}</div>
          </Card>
        ))}
      </div>

      {/* Selected Metric Chart */}
      <Card className="chart-card">
        <div className="chart-header">
          <h3>{metrics.find(m => m.id === selectedMetric)?.name}</h3>
          <span className="chart-trend">
            {metrics.find(m => m.id === selectedMetric)?.trend}
          </span>
        </div>

        <div className="chart-container">
          {chartData.length === 0 ? (
            <div className="no-data">
              <p>{t("health.noData")}</p>
              <p className="hint">{t("health.noDataHint")}</p>
            </div>
          ) : selectedMetric === "pressure" ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: `1px solid ${getMetricColor()}`,
                    borderRadius: 8
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="systolic"
                  stroke="#e74c3c"
                  dot={{ fill: "#e74c3c", r: 4 }}
                  strokeWidth={2}
                  name="Systolic"
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  stroke="#3498db"
                  dot={{ fill: "#3498db", r: 4 }}
                  strokeWidth={2}
                  name="Diastolic"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : selectedMetric === "sleep" ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: `1px solid ${getMetricColor()}`,
                    borderRadius: 8
                  }}
                />
                <Bar dataKey="value" fill={getMetricColor()} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: `1px solid ${getMetricColor()}`,
                    borderRadius: 8
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={getMetricColor()}
                  dot={{ fill: getMetricColor(), r: 4 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="metric-info">
          <div className="info-item">
            <span className="info-label">{t("health.current")}</span>
            <span className="info-value">
              {metrics.find(m => m.id === selectedMetric)?.current}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">{t("health.normalRange")}</span>
            <span className="info-value">
              {metrics.find(m => m.id === selectedMetric)?.normal}
            </span>
          </div>
        </div>
      </Card>

      {/* Add New Metric */}
      <Card className="add-metric-card">
        <div className="add-metric-header">
          <h3>{t("health.recordNew")}</h3>
          <button className="add-metric-btn" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? t("common.cancel") : t("health.addManual")}
          </button>
        </div>
        
        {showAddForm && (
          <form onSubmit={handleAddMetric} className="metric-form">
            <div className="form-group">
              <label>{t("health.type")}</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value, unit: getDefaultUnit(e.target.value) })}
              >
                <option value="pulse">{t("health.pulse")}</option>
                <option value="sleep">{t("health.sleep")}</option>
                <option value="weight">{t("health.weight")}</option>
                <option value="systolic">{t("health.systolic")}</option>
                <option value="diastolic">{t("health.diastolic")}</option>
                <option value="sugar">{t("health.sugar")}</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t("health.value")}</label>
              <input
                type="number"
                step="0.1"
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: e.target.value })}
                placeholder={t("health.value")}
                required
              />
            </div>
            <div className="form-group">
              <label>{t("health.unit") || "Unit"}</label>
              <input
                type="text"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                placeholder={getDefaultUnit(formData.type)}
              />
            </div>
            <div className="form-group">
              <label>{t("health.notes")}</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("health.notesPlaceholder")}
              />
            </div>
            <button type="submit" className="submit-btn">{t("health.saveMetric")}</button>
          </form>
        )}
      </Card>
    </div>
  );
}
