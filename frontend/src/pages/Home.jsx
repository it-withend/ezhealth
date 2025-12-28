import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "../ui/components/Card";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 20, fontFamily: "Montserrat" }}>
      <h3>Welcome back 👋</h3>

      <input
        placeholder="Find a doctor or specialty"
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 12,
          border: "1px solid #CAEEEA",
          marginBottom: 20
        }}
      />

      <h4>Upcoming Appointments</h4>
      <Card onClick={() => navigate("/assistant")} style={{ cursor: "pointer" }}>
        <b>Dr. Darius Klaine</b>
        <br />
        Dentist • Tomorrow • 10:00
      </Card>

      <h4 style={{ marginTop: 24 }}>Nearby</h4>
      <Card onClick={() => navigate("/assistant")} style={{ cursor: "pointer" }}>
        🏥 St. John Hospital • 200m
      </Card>

      <h4 style={{ marginTop: 24 }}>Good to know</h4>
      <Card onClick={() => navigate("/assistant")} style={{ cursor: "pointer" }}>
        Latest health alerts and AI tips
      </Card>
    </div>
  );
}
