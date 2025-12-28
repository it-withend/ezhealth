import { Button } from "../ui/components/Button";
import { useTheme } from "../ui/theme/ThemeProvider";

export default function Onboarding({ onFinish }) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: theme.primary,
      }}
    >
      <div />

      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            color: "#fff",
            fontSize: 28,
            marginBottom: 12,
          }}
        >
          Your digital healthcare assistant
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 15,
            lineHeight: 1.5,
          }}
        >
          Book appointments, review doctors
          <br />
          and track your medical history
        </p>
      </div>

      <Button
        onClick={() => {
          localStorage.setItem("onboarding_done", "1");
          onFinish();
        }}
      >
        Get Started
      </Button>
    </div>
  );
}
