import React, { useState } from "react";
import Button from "../ui/components/Button";

export default function AnalyzeDocument() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState("");

  const upload = async () => {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/ai/analyze", {
      method: "POST",
      body: form
    });

    const data = await res.json();
    setResult(data.analysis);
  };

  return (
    <div>
      <input type="file" onChange={e => setFile(e.target.files[0])} />
      <Button onClick={upload}>Analyze with AI</Button>
      <p>{result}</p>
    </div>
  );
}
