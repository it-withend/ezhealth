import Card from "../ui/components/Card";
import { useNavigate } from "react-router-dom";

export default function Assistant() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 20 }}>
      <h3>Hello! 👋 I’m your virtual assistant.</h3>
      <p>Select any topic or write your question below.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card onClick={() => navigate("/assistant/chat")}>
          📅 Schedule Appointment
        </Card>
        <Card onClick={() => navigate("/assistant/chat")}>
          💬 Get Advice
        </Card>
        <Card>
          📄 Browse Documents
        </Card>
        <Card>
          👨‍⚕️ Review Doctors
        </Card>
      </div>
    </div>
  );
}
