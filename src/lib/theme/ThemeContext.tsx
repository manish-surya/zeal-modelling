"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
interface Ctx { theme: Theme; toggle: () => void }
const ThemeContext = createContext<Ctx>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("zeal-theme") as Theme | null;
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const t = stored ?? sys;
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  const toggle = () =>
    setTheme(prev => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("zeal-theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
