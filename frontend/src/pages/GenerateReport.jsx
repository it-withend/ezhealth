import React, { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Card from "../ui/components/Card";
import { api } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import "../styles/GenerateReport.css";

export default function GenerateReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const messages = location.state?.messages || [];

  const generateReport = async () => {
    if (messages.length === 0) {
      alert("Нет диалога для генерации отчета");
      return;
    }

    setLoading(true);
    try {
      const userName = user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}`
        : user?.first_name || "Пациент";

      const response = await api.post("/ai/generate-report", {
        messages: messages,
        userName: userName
      });

      setReport(response.data.report);
    } catch (error) {
      console.error("Error:", error);
      alert("Ошибка при генерации отчета: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const element = document.createElement("a");
    const file = new Blob([report], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `medical-report-${new Date().getTime()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const shareReport = async () => {
    try {
      const contacts = await api.get("/contacts");
      if (contacts.data.length === 0) {
        alert("У вас нет доверенных контактов. Добавьте их в профиле.");
        return;
      }
      alert(`Отчет отправлен ${contacts.data.length} доверенным контактам`);
    } catch (error) {
      console.error("Error sharing report:", error);
      alert("Ошибка при отправке отчета");
    }
  };

  return (
    <div className="report-container">
      <div className="report-header">
        <button className="back-btn" onClick={() => navigate("/ai-chat")}>
          ← Back
        </button>
        <h1>Doctor's Report</h1>
        <div className="header-spacer"></div>
      </div>

      {!report && (
        <Card className="report-intro">
          <h2>Generate Medical Report</h2>
          <p>Create a summary of your consultation for your doctor.</p>
          <button className="generate-btn" onClick={generateReport} disabled={loading}>
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </Card>
      )}

      {report && (
        <>
          <Card className="report-content">
            <div className="report-text">
              {report.split("\n").map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </Card>

          <div className="report-actions">
            <button className="download-btn" onClick={downloadReport}>
              ⬇️ Download
            </button>
            <button className="share-btn" onClick={shareReport}>
              👥 Share
            </button>
            <button className="regenerate-btn" onClick={() => setReport("")}>
              🔄 Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  );
}
