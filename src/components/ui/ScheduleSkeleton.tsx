export function ScheduleSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950"
        >
          <div className="px-5 py-4">
            <div className="mb-2 h-5 w-44 animate-pulse rounded bg-black/[.08] dark:bg-white/[.1]" />
            <div className="h-4 w-72 animate-pulse rounded bg-black/[.06] dark:bg-white/[.08]" />
          </div>
        </div>
      ))}
    </div>
  );
}