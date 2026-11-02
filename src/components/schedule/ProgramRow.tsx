"use client";

import { useTranslation } from "react-i18next";
import type { Program } from "@/types/schedule";
import { formatTimeRange, durationParts } from "@/lib/schedule";
import { TicketBadge } from "@/components/schedule/TicketBadge";

export function ProgramRow({ program }: { program: Program }) {
  const { t } = useTranslation();
  const { hours, minutes } = durationParts(program.start, program.end);
  const duration =
    hours === 0
      ? t("duration.minutes", { count: minutes })
      : minutes === 0
        ? t("duration.hours", { count: hours })
        : t("duration.hoursMinutes", { hours, minutes });

  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
          {formatTimeRange(program.start, program.end)}
        </span>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {duration}
        </span>
        <span className="text-black dark:text-zinc-50">{program.name}</span>
        <TicketBadge ticket={program.ticket} />
      </div>
      <div className="w-full text-sm text-zinc-500 dark:text-zinc-400">
        {program.notes ? <span>{program.notes}</span> : null}
      </div>
    </li>
  );
}
