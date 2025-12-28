import { createContext, useContext, useState } from "react";
import { lightTheme, darkTheme } from "./themes";

const ThemeContext = createContext(null);

export default function ThemeProvider({ children }) {
  const [mode, setMode] = useState("dark");
  const theme = mode === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode }}>
      <div style={{ background: theme.bg, minHeight: "100vh" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
