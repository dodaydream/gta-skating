import { cn } from "cn";

const LABELS: Record<number, string> = {
  1: "Quiet",
  2: "Moderate",
  3: "Busy",
};

const DOT_ACTIVE: Record<number, string> = {
  1: "bg-emerald-500 dark:bg-emerald-400",
  2: "bg-amber-500 dark:bg-amber-400",
  3: "bg-red-500 dark:bg-red-400",
};

/**
 * Busyness indicator for a program card: three dots filled to the rounded
 * average, a text label, and the number of underlying reports.
 */
export function BusyBadge({
  busy,
  n,
  className,
}: {
  busy: number;
  n: number;
  className?: string;
}) {
  const rounded = Math.min(3, Math.max(1, Math.round(busy)));
  const label = LABELS[rounded];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400",
        className
      )}
      aria-label={`Usually ${label.toLowerCase()} · ${n} ${
        n === 1 ? "report" : "reports"
      }`}
    >
      <span aria-hidden="true" className="flex items-center gap-0.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              i <= rounded
                ? DOT_ACTIVE[rounded]
                : "bg-zinc-200 dark:bg-zinc-700"
            )}
          />
        ))}
      </span>
      <span>{label}</span>
      <span className="text-zinc-400 dark:text-zinc-500">&middot; {n}</span>
    </span>
  );
}
