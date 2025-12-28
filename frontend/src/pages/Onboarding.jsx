import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../ui/components/Button";

export default function Onboarding() {
  const navigate = useNavigate();

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
        onClick={() => navigate("/home")}
        style={{
          marginTop: 32,
          background: "#FFFFFF",
          color: "#479D90",
          borderRadius: 12,
          padding: "14px 28px",
          fontWeight: 500
        }}
      >
        Get Started
      </Button>
    </div>
  );
}
