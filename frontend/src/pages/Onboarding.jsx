import React from "react";
import Button from "../ui/components/Button";

export default function Onboarding() {
  return (
    <div
      style={{
        backgroundColor: "#479D90",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        padding: 24,
        textAlign: "center",
        fontFamily: "Montserrat"
      }}
    >
      <img
        src="/logo.png"
        alt="logo"
        style={{ width: 120, marginBottom: 24 }}
      />

      <h2>Your digital healthcare assistant</h2>

      <p style={{ maxWidth: 320, opacity: 0.9 }}>
        Book appointments, review doctors and track your medical history
      </p>

      <Button
        style={{
          marginTop: 32,
          background: "#FFFFFF",
          color: "#479D90",
          borderRadius: 12,
          padding: "12px 24px",
          fontWeight: 500
        }}
      >
        Get Started
      </Button>
    </div>
  );
}
