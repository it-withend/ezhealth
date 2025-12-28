import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";
import { getHealthSummary } from "../api";

export default function Home() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    getHealthSummary().then(setData);
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h3>Welcome back 👋</h3>

      <input
        placeholder="Find a doctor or specialty"
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 12,
          marginBottom: 20
        }}
      />

      <h4>Upcoming Appointments</h4>
      {data.appointments.map(a => (
        <Card
          key={a.id}
          onClick={() => navigate("/assistant")}
          style={{ cursor: "pointer" }}
        >
          <b>{a.doctor}</b>
          <br />
          {a.specialty} • {a.date} • {a.time}
        </Card>
      ))}

      <h4 style={{ marginTop: 24 }}>Nearby</h4>
      {data.nearby.map(n => (
        <Card key={n.id}>
          🏥 {n.name} • {n.distance}
        </Card>
      ))}

      <h4 style={{ marginTop: 24 }}>Good to know</h4>
      {data.alerts.map(a => (
        <Card key={a.id}>{a.text}</Card>
      ))}
    </div>
  );
}
