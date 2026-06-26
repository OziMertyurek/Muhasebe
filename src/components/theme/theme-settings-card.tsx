"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { clsx } from "clsx";

type ThemePreference = "light" | "dark" | "system";

const storageKey = "muhasebe-theme";

const options: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: "light",
    label: "Açık",
    description: "Aydınlık arayüz",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Koyu",
    description: "Düşük ışıkta rahat",
    icon: Moon,
  },
  {
    value: "system",
    label: "Sistem",
    description: "Cihaz temasını izler",
    icon: Monitor,
  },
];

function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const value = window.localStorage.getItem(storageKey);

  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return "system";
}

function resolveTheme(preference: ThemePreference) {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return preference;
}

function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.dataset.themePreference = preference;
  root.classList.toggle("dark", theme === "dark");
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener("muhasebe-theme-change", callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("muhasebe-theme-change", callback);
    window.removeEventListener("storage", callback);
  };
}

export function ThemeSettingsCard() {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribeToTheme,
    getStoredPreference,
    () => "system",
  );

  useEffect(() => {
    applyTheme(preference);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (preference === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  function selectTheme(nextPreference: ThemePreference) {
    window.localStorage.setItem(storageKey, nextPreference);
    applyTheme(nextPreference);
    window.dispatchEvent(new Event("muhasebe-theme-change"));
  }

  return (
    <section className="rounded-lg border border-[#dce2dc] bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#607167]">Görünüm</p>
          <h2 className="mt-1 text-lg font-semibold text-[#16201b]">Tema</h2>
          <p className="mt-1 text-sm leading-5 text-[#647067]">
            Açık, koyu veya cihaz temasına uyumlu görünüm seçin.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((option) => {
            const Icon = option.icon;
            const isActive = preference === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => selectTheme(option.value)}
                className={clsx(
                  "flex min-w-36 items-center gap-3 rounded-md border px-3 py-3 text-left transition",
                  isActive
                    ? "border-[#8ea99b] bg-[#f4f7f4] text-[#16201b]"
                    : "border-[#dce2dc] bg-white text-[#46534b] hover:bg-[#f7f9f7]",
                )}
                aria-pressed={isActive}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#fbfcfa] text-[#14543f]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {option.label}
                    {isActive ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#647067]">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
