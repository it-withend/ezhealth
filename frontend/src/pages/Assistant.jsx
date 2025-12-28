import Card from "../ui/components/Card.jsx";
import { useTheme } from "../ui/theme/ThemeProvider.jsx";
import { useAuth } from "../context/AuthContext.js";

export default function Assistant() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ color: theme.text }}>Assistant</h1>
      <Card><p>Schedule Appointment</p></Card>
    </div>
  );
}
