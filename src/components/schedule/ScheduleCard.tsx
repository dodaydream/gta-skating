"use client";

import { useTranslation } from "react-i18next";
import { formatEventDate } from "@/lib/schedule";
import { ProgramRow } from "./ProgramRow";
import type { Venue } from "@/types/venue";
import type { Program } from "@/types/schedule";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { normalizeLocale } from "@/i18n/config";

export function ScheduleCard({
  venue,
  onToggle,
}: {
  venue: Venue;
  onToggle: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = normalizeLocale(i18n.resolvedLanguage);
  const programs = venue.schedule.programs;
  const groupedByDate = groupByDate(programs);
  const programCount = programs.length;
  const updated = new Date(venue.schedule.updatedAt)
    .toISOString()
    .slice(0, 10);

  return (
    <Card className="overflow-hidden border-black/[.08] bg-white shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/[.145] dark:bg-zinc-950 py-0">
      <Collapsible defaultOpen>
        <CollapsibleTrigger
          className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-50 data-open:bg-zinc-50 dark:hover:bg-zinc-900 dark:data-open:bg-zinc-900"
          onClick={onToggle}
        >
          <CardHeader className="w-full gap-0.5 p-0">
            <CardTitle aria-level={2} className="truncate">
              {venue.name}
            </CardTitle>
            <CardDescription className="truncate">
              {venue.address}
            </CardDescription>
          </CardHeader>

          <div className="flex shrink-0 flex-col items-end gap-1">
            {programCount > 0 && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {t("programs.sessions", { count: programCount })}
              </span>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="flex flex-col gap-5 border-t px-5 pb-5 pt-4">
            {groupedByDate.size === 0 ? (
              <p className="text-sm text-zinc-500">
                {t("programs.noneUpcoming")}
              </p>
            ) : (
              <div className="flex flex-col gap-5">
                {[...groupedByDate.entries()].map(([date, datePrograms]) => (
                  <div key={date} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {formatEventDate(date, venue.timezone, locale)}
                      </h3>
                      <span className="flex-1 border-t border-dashed border-black/[.08] dark:border-white/[.1]" />
                    </div>
                    <ul className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
                      {datePrograms.map((program) => (
                        <ProgramRow key={program.id} program={program} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-black/[.06] pt-3 text-xs dark:border-white/[.08]">
              <a
                className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
                href={venue.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("programs.venueWebsite")}
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17 17 7M7 7h10v10" />
                </svg>
              </a>
              <span className="text-zinc-400">
                {t("programs.updated", { date: updated })}
              </span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function groupByDate(programs: Program[]): Map<string, Program[]> {
  const map = new Map<string, Program[]>();
  for (const p of programs) {
    const date = p.start.slice(0, 10);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(p);
  }
  return map;
}
