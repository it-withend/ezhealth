import React, { useState } from "react";
import Button from "../ui/components/Button";
import Card from "../ui/components/Card";

export default function Assistant() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const sendMessage = async () => {
    const res = await fetch("/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await res.json();

    setChat([...chat, { user: message, ai: data.reply }]);
    setMessage("");
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>Assistant</h3>

      {chat.map((c, i) => (
        <Card key={i}>
          <b>You:</b> {c.user}
          <br />
          <b>AI:</b> {c.ai}
        </Card>
      ))}

      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Describe symptoms or ask a question"
        style={{ width: "100%", padding: 12, marginTop: 12 }}
      />

      <Button onClick={sendMessage} style={{ marginTop: 12 }}>
        Send
      </Button>
    </div>
  );
}
