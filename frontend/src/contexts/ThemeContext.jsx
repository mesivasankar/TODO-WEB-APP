import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 1. Initialize from localStorage or default to system preference
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("app-theme");
    if (saved) return saved;
    
    // Check browser system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return "light";
    }
    return "dark"; // Default to dark for most systems
  });

  // 2. Apply theme to document body whenever it changes
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    // Also toggle a class for easier CSS targeting if needed
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    }
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook for easy access
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}