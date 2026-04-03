"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext<{
  theme: string;
  setTheme: (theme: string) => void;
}>({
  theme: "system",
  setTheme: () => null,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<string>("system");

  useEffect(() => {
    // Only run on client mounting
    const savedTheme = localStorage.getItem("theme") || "system";
    setThemeState(savedTheme);

    const applyTheme = (val: string) => {
      const isDark =
        val === "dark" ||
        (val === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);

      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      if (isDark) root.classList.add("dark");
    };

    // Apply strictly on mount to ensure sync
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (localStorage.getItem("theme") === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);

    const isDark =
      newTheme === "dark" ||
      (newTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (isDark) root.classList.add("dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
