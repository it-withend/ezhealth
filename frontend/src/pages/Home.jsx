
import React from "react";
import Card from "../ui/components/Card";

export default function Home() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Welcome back 👋</h2>
      <input placeholder="Find a doctor or specialty" />

      <h3>Upcoming Appointments</h3>
      <Card>Doctor Appointment</Card>

      <h3>Nearby</h3>
      <Card>Hospital • 200m</Card>

      <h3>Good to know</h3>
      <Card>Health alerts and updates</Card>
    </div>
  );
}
