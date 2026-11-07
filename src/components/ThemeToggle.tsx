"use client";

import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { setTheme, useTheme, type Theme } from "@/lib/theme";
import { IconMoon, IconSun } from "@tabler/icons-react";

const THEMES: { value: Theme; icon: typeof IconSun }[] = [
  { value: "light", icon: IconSun },
  { value: "dark", icon: IconMoon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <div
      role="group"
      aria-label={t("theme.label")}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-0.5 rounded-lg border border-transparent bg-secondary p-0.5 text-secondary-foreground",
        className
      )}
    >
      {THEMES.map(({ value, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            aria-label={t(`theme.${value}`)}
            title={t(`theme.${value}`)}
            onClick={() => setTheme(value)}
            className={cn(
              "flex h-full min-w-9 items-center justify-center rounded-md px-2 transition-colors",
              active
                ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
                : "text-muted-foreground hover:text-secondary-foreground"
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
