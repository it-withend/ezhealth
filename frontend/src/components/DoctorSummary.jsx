import React, { useState } from "react";
import Button from "../ui/components/Button";

export default function DoctorSummary({ conversation }) {
  const [summary, setSummary] = useState("");

  const generate = async () => {
    const res = await fetch("/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation })
    });

    const data = await res.json();
    setSummary(data.summary);
  };

  return (
    <div>
      <Button onClick={generate}>Generate summary for doctor</Button>
      <pre>{summary}</pre>
    </div>
  );
}
