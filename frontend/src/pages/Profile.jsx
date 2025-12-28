import Card from "../ui/components/Card.jsx";
import Button from "../ui/components/Button";
import { useTheme } from "../ui/theme/ThemeProvider";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { theme, toggleTheme, mode } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    // Очистим также локальное хранилище для онбординга, чтобы пользователь прошел его снова
    localStorage.removeItem("onboarding_done");
    window.location.reload(); // Перезагрузка страницы для обновления состояния
  };

  return (
    <div style={{ padding: 20 }}>
      <Card>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: theme.primarySoft,
              margin: "0 auto 12px",
            }}
          />
          <h2 style={{ color: theme.text }}>
            {user?.first_name || user?.username || "User"}
          </h2>
          <p style={{ color: theme.textMuted }}>Patient</p>
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Card>
          <SettingItem
            label="Theme"
            value={mode === "light" ? "Light" : "Dark"}
            onClick={toggleTheme}
          />
          <SettingItem label="Notifications" value="Enabled" />
          <SettingItem label="Privacy" value="Standard" />
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Button onClick={handleLogout}>Log out</Button>
      </div>
    </div>
  );
}

const SettingItem = ({ label, value, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 0",
      cursor: onClick ? "pointer" : "default",
    }}
  >
    <span>{label}</span>
    <span style={{ opacity: 0.6 }}>{value}</span>
  </div>
);
