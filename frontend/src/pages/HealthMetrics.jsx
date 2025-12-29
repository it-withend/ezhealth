import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import Card from "../ui/components/Card";
import "../styles/HealthMetrics.css";

const data = {
  pulse: [
    { date: "Mon", value: 72 },
    { date: "Tue", value: 75 },
    { date: "Wed", value: 70 },
    { date: "Thu", value: 78 },
    { date: "Fri", value: 75 },
    { date: "Sat", value: 73 },
    { date: "Sun", value: 71 }
  ],
  sleep: [
    { date: "Mon", value: 7.5 },
    { date: "Tue", value: 6.8 },
    { date: "Wed", value: 8.2 },
    { date: "Thu", value: 7.0 },
    { date: "Fri", value: 6.5 },
    { date: "Sat", value: 9.0 },
    { date: "Sun", value: 8.5 }
  ],
  weight: [
    { date: "Week 1", value: 72.5 },
    { date: "Week 2", value: 72.3 },
    { date: "Week 3", value: 72.0 },
    { date: "Week 4", value: 71.8 }
  ],
  bloodPressure: [
    { date: "Mon", systolic: 120, diastolic: 80 },
    { date: "Tue", systolic: 122, diastolic: 82 },
    { date: "Wed", systolic: 118, diastolic: 78 },
    { date: "Thu", systolic: 125, diastolic: 83 },
    { date: "Fri", systolic: 121, diastolic: 80 }
  ]
};

export default function HealthMetrics() {
  const navigate = useNavigate();
  const [selectedMetric, setSelectedMetric] = useState("pulse");
  const [metrics, setMetrics] = useState([
    {
      id: "pulse",
      name: "Pulse",
      icon: "❤️",
      unit: "bpm",
      current: 75,
      normal: "60-100",
      trend: "↑ 3%",
      color: "#e74c3c"
    },
    {
      id: "sleep",
      name: "Sleep",
      icon: "😴",
      unit: "hours",
      current: 7.8,
      normal: "7-9",
      trend: "↑ 5%",
      color: "#3498db"
    },
    {
      id: "weight",
      name: "Weight",
      icon: "⚖️",
      unit: "kg",
      current: 71.8,
      normal: "65-75",
      trend: "↓ 0.7%",
      color: "#f39c12"
    },
    {
      id: "bloodPressure",
      name: "Blood Pressure",
      icon: "📊",
      unit: "mmHg",
      current: "121/80",
      normal: "< 120/80",
      trend: "→ Stable",
      color: "#9b59b6"
    }
  ]);

  const getChartData = () => {
    switch (selectedMetric) {
      case "pulse":
        return data.pulse;
      case "sleep":
        return data.sleep;
      case "weight":
        return data.weight;
      case "bloodPressure":
        return data.bloodPressure;
      default:
        return [];
    }
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
          {selectedMetric === "pulse" && (
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

          {selectedMetric === "sleep" && (
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
          )}

          {selectedMetric === "weight" && (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis dataKey="date" stroke="#999" />
                <YAxis stroke="#999" domain={[70, 74]} />
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

          {selectedMetric === "bloodPressure" && (
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
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  stroke="#3498db"
                  dot={{ fill: "#3498db", r: 4 }}
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
        <h3>Record New Metric</h3>
        <button className="add-metric-btn" onClick={() => navigate("/record-metric")}>
          + Add Manual Entry
        </button>
      </Card>
    </div>
  );
}
