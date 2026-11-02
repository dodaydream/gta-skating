import { cn } from "cn";
import { formatTicket } from "@/lib/schedule";

export function TicketBadge({
  ticket,
  className,
}: {
  ticket?: number;
  className?: string;
}) {
  const label = formatTicket(ticket);
  if (label === null) return null;

  const free = label === "Free";

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
