"use client";

import { useTranslation } from "react-i18next";
import { cn } from "cn";

export function TicketBadge({
  ticket,
  className,
}: {
  ticket?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  if (ticket === undefined) return null;

  const free = ticket <= 0;
  const label = free ? t("ticket.free") : `$${ticket.toFixed(2)}`;

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        free
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
        className
      )}
    >
      {label}
    </span>
  );
}
