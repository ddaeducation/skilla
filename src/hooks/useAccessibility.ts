import { useState, useEffect, useCallback } from "react";

export interface AccessibilitySettings {
  fontSize: number; // percentage scale: 100 = default
  fontFamily: "default" | "dyslexia" | "serif" | "mono";
  spacing: "default" | "relaxed" | "spacious";
  darkMode: boolean;
  highContrast: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 100,
  fontFamily: "default",
  spacing: "default",
  darkMode: false,
  highContrast: false,
};

const STORAGE_KEY = "gni-accessibility-settings";

const FONT_MAP: Record<string, string> = {
  default: "'Inter', system-ui, sans-serif",
  dyslexia: "'Comic Sans MS', 'OpenDyslexic', cursive",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Courier New', Consolas, monospace",
};

const SPACING_MAP: Record<string, { letterSpacing: string; lineHeight: string; wordSpacing: string }> = {
  default: { letterSpacing: "normal", lineHeight: "1.6", wordSpacing: "normal" },
  relaxed: { letterSpacing: "0.03em", lineHeight: "1.8", wordSpacing: "0.1em" },
  spacious: { letterSpacing: "0.06em", lineHeight: "2.2", wordSpacing: "0.2em" },
};

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;

    // Font size
    root.style.fontSize = `${settings.fontSize}%`;

    // Font family
    root.style.fontFamily = FONT_MAP[settings.fontFamily] || FONT_MAP.default;

    // Spacing
    const sp = SPACING_MAP[settings.spacing] || SPACING_MAP.default;
    root.style.letterSpacing = sp.letterSpacing;
    root.style.lineHeight = sp.lineHeight;
    root.style.wordSpacing = sp.wordSpacing;

    // Dark mode
    if (settings.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // High contrast
    if (settings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Persist
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSetting, resetSettings };
}
