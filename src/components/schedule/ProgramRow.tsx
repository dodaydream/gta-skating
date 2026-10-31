import type { Program } from "@/types/schedule";
import { formatTimeRange, formatDuration } from "@/data/schedules";

export function ProgramRow({ program }: { program: Program }) {
  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
          {formatTimeRange(program.start, program.end)}
        </span>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {formatDuration(program.start, program.end)}
        </span>
        <span className="text-black dark:text-zinc-50">{program.name}</span>
      </div>
      <div className="w-full text-sm text-zinc-500 dark:text-zinc-400">
        {program.notes ? <span>{program.notes}</span> : null}
      </div>
    </li>
  );
}