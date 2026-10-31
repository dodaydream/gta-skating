import type { NextRequest } from "next/server";
import type { Arena } from "@/types/arena";
import type { Program, ProgramItem } from "@/types/schedule";
import { arenas as allArenas } from "@/data/schedules";

interface Bound {
  date: string;
  datetime: string;
}

function todayIn(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
}

function toBound(raw?: string): Bound | undefined {
  if (!raw) return undefined;
  const date = raw.slice(0, 10);
  const time = raw.length > 10 ? raw.slice(11, 16) : "";
  const datetime = time ? `${date} ${time}` : `${date} 00:00`;
  return { date, datetime };
}

function programOverlaps(
  program: Program,
  eventDate: string,
  from?: Bound,
  to?: Bound
): boolean {
  const start = toBound(`${eventDate}T${program.start}`)!;
  const end = toBound(`${eventDate}T${program.end}`)!;
  const winStart = from?.datetime;
  const winEnd = to?.datetime;

  if (winStart && end.datetime < winStart) return false;
  if (winEnd && start.datetime > winEnd) return false;
  return true;
}

function buildProgramItems(arena: Arena, from?: Bound, to?: Bound): ProgramItem[] {
  const start = from?.date ?? todayIn(arena.timezone);
  const items: ProgramItem[] = [];

  for (const event of arena.schedule.events) {
    if (event.date < start) continue;
    if (to && event.date > to.date) continue;

    for (const program of event.programs) {
      if (!programOverlaps(program, event.date, from, to)) continue;
      items.push({ ...program, date: event.date, arena });
    }
  }

  return items;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;

  const result = allArenas.flatMap((a) => buildProgramItems(a, toBound(from), toBound(to)));
  result.sort((a, b) => {
    const aTime = new Date(`${a.date}T${a.start}`).getTime();
    const bTime = new Date(`${b.date}T${b.start}`).getTime();
    return aTime - bTime;
  });

  return Response.json(result);
}