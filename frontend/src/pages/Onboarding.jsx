import { Button } from "../ui/components/Button";
import { useTheme } from "../ui/theme/ThemeProvider";

export default function Onboarding({ onFinish }) {
  const { theme } = useTheme();
  return (
    <div style={{ minHeight: "100vh", background: theme.primary, padding: 24 }}>
      <h1 style={{ color: "#fff" }}>Your digital healthcare assistant</h1>
      <Button onClick={onFinish}>Get Started</Button>
    </div>
  );
}
