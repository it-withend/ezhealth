import { createContext, useContext, useState } from "react";
import { lightTheme, darkTheme } from "./themes";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState("light");
  const toggleTheme = () => setMode(m => m === "light" ? "dark" : "light");
  const theme = mode === "light" ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme }}>
      <div style={{ background: theme.bg, minHeight: "100vh" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
