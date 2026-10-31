import type { NextRequest } from "next/server";
import type { Arena } from "@/types/arena";
import type { ProgramItem } from "@/types/schedule";
import { arenas as allArenas } from "@/data/schedules";

function todayIn(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date()
  );
}

function buildProgramItems(arena: Arena, from?: string, to?: string): ProgramItem[] {
  const start = from ?? todayIn(arena.timezone);
  return arena.schedule.programs
    .filter(
      (program) =>
        program.start >= start && (to === undefined || program.start <= to)
    )
    .map((program) => ({ ...program, arena }));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;

  const result = allArenas.flatMap((a) => buildProgramItems(a, from, to));
  result.sort((a, b) => a.start.localeCompare(b.start));

  return Response.json(result);
}