import React, { useState, useEffect, useContext } from "react";
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
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const [selectedMetric, setSelectedMetric] = useState("pulse");
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
  const [showSyncApps, setShowSyncApps] = useState(false);
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

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'HealthMetrics.jsx:useEffect',
        message: 'useEffect triggered',
        data: { hasUser: !!user, userId: user?.id, selectedMetric },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C'
      })
    }).catch(() => {});
    // #endregion

    if (user) {
      loadMetrics();
      loadChartData();
    }
  }, [user, selectedMetric]);

  const loadMetrics = async () => {
    if (!user) return;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'HealthMetrics.jsx:loadMetrics',
        message: 'loadMetrics called',
        data: { userId: user?.id },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C'
      })
    }).catch(() => {});
    // #endregion

    try {
      // Load more metrics to get latest values for all types
      const response = await api.get("/health/metrics", {
        params: { limit: 100, days: 30 }
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthMetrics.jsx:loadMetrics',
          message: 'loadMetrics response',
          data: { metricsCount: response.data?.metrics?.length || 0, success: response.data?.success },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'C'
        })
      }).catch(() => {});
      // #endregion
      
      const allMetrics = response.data.metrics || [];
      console.log("Loaded metrics:", allMetrics);
      
      // Get latest values for each metric type
      const latestValues = {};
      allMetrics.forEach(m => {
        const metricType = m.type;
        if (!latestValues[metricType] || new Date(m.recorded_at) > new Date(latestValues[metricType].recorded_at)) {
          latestValues[metricType] = m;
        }
      });

      console.log("Latest values:", latestValues);
      console.log("All metrics from API:", allMetrics);

      // Update metrics with latest values
      setMetrics(prev => prev.map(m => {
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
        
        if (latest) {
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
            current = latest.value;
          }
          
          console.log(`Updated ${m.id}: ${current}`);
          return { ...m, current };
        }
        
        // No data found, keep default
        const defaultValue = m.id === "pressure" ? "-" : 0;
        return { ...m, current: defaultValue };
      }));
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/107767b9-5ae8-4ca1-ba4d-b963fcffccb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'HealthMetrics.jsx:loadMetrics',
          message: 'loadMetrics error',
          data: { error: error.message, status: error.response?.status, responseData: error.response?.data },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'C'
        })
      }).catch(() => {});
      // #endregion
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    if (!user) return;
    try {
      const response = await api.get("/health/metrics/stats", {
        params: { type: selectedMetric, days: 30 }
      });
      
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
    } catch (error) {
      console.error("Error loading chart data:", error);
      setChartData([]);
    }
  };

  const handleAddMetric = async (e) => {
    e.preventDefault();
    if (!formData.value) return;

    try {
      console.log("Adding metric:", formData);
      const response = await api.post("/health/metrics", {
        type: formData.type,
        value: parseFloat(formData.value),
        unit: formData.unit || getDefaultUnit(formData.type),
        notes: formData.notes
      });
      
      console.log("Metric added successfully:", response.data);
      
      setFormData({ type: "pulse", value: "", unit: "", notes: "" });
      setShowAddForm(false);
      
      // Reload data after adding - wait a bit for DB to update
      setTimeout(async () => {
        await loadMetrics();
        await loadChartData();
      }, 300);
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

      {/* Quick Stats */}
      <div className="quick-stats">
        {metrics.map(metric => (
          <Card
            key={metric.id}
            className={`stat-card ${selectedMetric === metric.id ? "active" : ""}`}
            onClick={() => setSelectedMetric(metric.id)}
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
