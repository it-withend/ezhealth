import React from "react";

export function Button({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px",
        borderRadius: 14,
        border: "none",
        background: "#3BAA9D",
        color: "#fff",
        fontSize: 16,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}
