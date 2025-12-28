import React, { useEffect, useState } from "react";
import { getHealthMetrics } from "../api";
import Card from "../ui/components/Card";

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    getHealthMetrics().then(setMetrics);
  }, []);

  if (!metrics) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h3>Health Overview</h3>

      <Card>❤️ Pulse: {metrics.pulse}</Card>
      <Card>😴 Sleep: {metrics.sleep} h</Card>
      <Card>🩸 Pressure: {metrics.pressure}</Card>
      <Card>🍬 Sugar: {metrics.sugar}</Card>
      <Card>⚖️ Weight: {metrics.weight} kg</Card>
    </div>
  );
}
