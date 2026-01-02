import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import Card from "../ui/components/Card";
import { api } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "../styles/HealthMetrics.css";

export default function HealthMetrics() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [selectedMetric, setSelectedMetric] = useState("pulse");
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState([
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
  ]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "pulse",
    value: "",
    unit: "",
    notes: ""
  });

  useEffect(() => {
    if (user) {
      loadMetrics();
      loadChartData();
    }
  }, [user, selectedMetric]);

  const loadMetrics = async () => {
    if (!user) return;
    try {
      const response = await api.get("/health/metrics", {
        params: { limit: 1, days: 1 }
      });
      
      const allMetrics = response.data.metrics || [];
      
      // Get latest values for each metric type
      const latestValues = {};
      allMetrics.forEach(m => {
        if (!latestValues[m.type] || new Date(m.recorded_at) > new Date(latestValues[m.type].recorded_at)) {
          latestValues[m.type] = m;
        }
      });

      // Update metrics with latest values
      setMetrics(prev => prev.map(m => {
        const latest = latestValues[m.id];
        if (latest) {
          let current = latest.value;
          if (m.id === "pressure" && latestValues.systolic && latestValues.diastolic) {
            current = `${latestValues.systolic.value}/${latestValues.diastolic.value}`;
          }
          return { ...m, current };
        }
        return m;
      }));
    } catch (error) {
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
      await api.post("/health/metrics", {
        type: formData.type,
        value: parseFloat(formData.value),
        unit: formData.unit || getDefaultUnit(formData.type),
        notes: formData.notes
      });
      
      setFormData({ type: "pulse", value: "", unit: "", notes: "" });
      setShowAddForm(false);
      loadMetrics();
      loadChartData();
    } catch (error) {
      console.error("Error adding metric:", error);
      alert("Ошибка при добавлении показателя");
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
        <h1>Health Metrics</h1>
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
              <p>Нет данных для отображения</p>
              <p className="hint">Добавьте показатели, чтобы увидеть график</p>
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
            <span className="info-label">Current:</span>
            <span className="info-value">
              {metrics.find(m => m.id === selectedMetric)?.current}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Normal Range:</span>
            <span className="info-value">
              {metrics.find(m => m.id === selectedMetric)?.normal}
            </span>
          </div>
        </div>
      </Card>

      {/* Add New Metric */}
      <Card className="add-metric-card">
        <div className="add-metric-header">
          <h3>Record New Metric</h3>
          <button className="add-metric-btn" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Cancel" : "+ Add Manual Entry"}
          </button>
        </div>
        
        {showAddForm && (
          <form onSubmit={handleAddMetric} className="metric-form">
            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value, unit: getDefaultUnit(e.target.value) })}
              >
                <option value="pulse">Pulse</option>
                <option value="sleep">Sleep</option>
                <option value="weight">Weight</option>
                <option value="systolic">Blood Pressure (Systolic)</option>
                <option value="diastolic">Blood Pressure (Diastolic)</option>
                <option value="sugar">Blood Sugar</option>
              </select>
            </div>
            <div className="form-group">
              <label>Value</label>
              <input
                type="number"
                step="0.1"
                value={formData.value}
                onChange={e => setFormData({ ...formData, value: e.target.value })}
                placeholder="Enter value"
                required
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                placeholder={getDefaultUnit(formData.type)}
              />
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
            <button type="submit" className="submit-btn">Save Metric</button>
          </form>
        )}
      </Card>
    </div>
  );
}
