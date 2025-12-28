import React from "react";
import Card from "../ui/components/Card";

export default function Home() {
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
      <Card style={{ background: "#479D90", color: "#fff" }}>
        Dr. Darius Klaine<br />
        Dentist • Tomorrow • 10:00
      </Card>

      <h4 style={{ marginTop: 24 }}>Nearby</h4>
      <Card>🏥 St. John Hospital • 200m</Card>

      <h4 style={{ marginTop: 24 }}>Good to know</h4>
      <Card>Latest health alerts and AI tips</Card>
    </div>
  );
}
