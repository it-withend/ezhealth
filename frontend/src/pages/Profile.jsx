import { Card } from "../ui/components/Card";
import { Button } from "../ui/components/Button";
import { useTheme } from "../ui/theme/ThemeProvider";

export default function Profile() {
  const { toggleTheme } = useTheme();
  return (
    <div style={{ padding: 20 }}>
      <Card>
        <p>Kathryn Murphy</p>
        <Button onClick={toggleTheme}>Toggle Theme</Button>
      </Card>
    </div>
  );
}
