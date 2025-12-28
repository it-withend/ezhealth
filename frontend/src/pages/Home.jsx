import { Card } from "../ui/components/Card";
import { Button } from "../ui/components/Button";
import { useTheme } from "../ui/theme/ThemeProvider";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ color: theme.text }}>Welcome back, {user?.first_name || user?.username || "User"} 👋</h1>
      <Card>
        <p style={{ color: theme.text }}>Dr. Darius Klaine</p>
        <Button>View Details</Button>
      </Card>
    </div>
  );
}
