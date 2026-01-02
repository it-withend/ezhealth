import React, { useState } from "react";
import Button from "../ui/components/Button";
import { api } from "../services/api";

export default function AnalyzeDocument() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const upload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const form = new FormData();
      form.append("file", file);

      // Get initData for authorization
      const initData = window.Telegram?.WebApp?.initData;
      const headers = {};
      if (initData) {
        headers["X-Telegram-Init-Data"] = initData;
      }

      const response = await api.post("/ai/analyze-file", form, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data"
        }
      });

      setResult(response.data.analysis || "Analysis completed");
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.error || err.message || "Failed to analyze file");
      setResult("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={e => {
          setFile(e.target.files[0]);
          setError("");
          setResult("");
        }}
        disabled={loading}
      />
      <Button onClick={upload} disabled={loading || !file}>
        {loading ? "Analyzing..." : "Analyze with AI"}
      </Button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {result && <p>{result}</p>}
    </div>
  );
}
