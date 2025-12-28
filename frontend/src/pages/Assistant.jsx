import { Card } from "../ui/components/Card";
import { useTheme } from "../ui/theme/ThemeProvider";

export default function Assistant() {
  const { theme } = useTheme();
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ color: theme.text }}>Assistant</h1>
      <Card><p>Schedule Appointment</p></Card>
    </div>
  );
}
