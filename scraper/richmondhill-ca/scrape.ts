import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Arena,
  ArenaMetaList,
  DayName,
  Program,
} from "../types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../src/data");

const TIMEZONE = "America/Toronto";

const PAGE_URL =
  "https://www.richmondhill.ca/en/things-to-do/Skating.aspx";

const DAYS: DayName[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** Only emit events from today through this many days out. */
const LOOKAHEAD_DAYS = 31;

interface ArenaMeta {
  id: string;
  name: string;
}

const ARENA_MAP = new Map<string, ArenaMeta>([
  ["tom graham", { id: "tom-graham-arena", name: "Tom Graham Arena" }],
  ["ed sackfield", { id: "ed-sackfield-arena", name: "Ed Sackfield Arena" }],
  ["bond lake", { id: "bond-lake-arena", name: "Bond Lake Arena" }],
  ["elgin barrow", { id: "elgin-barrow-arena", name: "Elgin Barrow Arena" }],
]);

interface TimeSlot {
  start: string;
  end: string;
}

interface RawEntry {
  arenaId: string;
  arenaName: string;
  day: DayName;
  programName: string;
  time: TimeSlot;
}

interface ScheduleSection {
  programType: string;
  tableHtml: string;
}

function fetchHtml(url: string): Promise<string> {
  return fetch(url, {
    headers: { "User-Agent": "gta-skating-scraper/0.1 (+local dev)" },
    signal: AbortSignal.timeout(15_000),
  }).then((r) => {
    if (!r.ok) throw new Error(`GET ${url} -> ${r.status} ${r.statusText}`);
    return r.text();
  });
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

function toHHMM(h: string, min: string, ap: string): string {
  let hour = Number.parseInt(h, 10);
  const minute = Number.parseInt(min || "0", 10);
  const isAm = ap.toLowerCase().startsWith("a");
  if (isAm && hour === 12) hour = 0;
  if (!isAm && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTimeRange(text: string): TimeSlot | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(?:([ap]\.?m\.?)\s*)?[-–]\s*(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)/i
  );
  if (!m) return null;
  const ap1 = m[3] || m[6];
  return {
    start: toHHMM(m[1], m[2], ap1),
    end: toHHMM(m[4], m[5], m[6]),
  };
}

function findArena(text: string): ArenaMeta | null {
  const lower = text.toLowerCase().trim();
  for (const [key, arena] of ARENA_MAP) {
    if (lower.includes(key)) return arena;
  }
  return null;
}

function extractScheduleSections(html: string): ScheduleSection[] {
  const sections: ScheduleSection[] = [];
  const headerRe = /data-name="accParent"[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  const lines = html.split("\n");
  const headers: { index: number; text: string }[] = [];
  let h: RegExpExecArray | null;
  while ((h = headerRe.exec(html)) !== null) {
    const text = stripHtml(h[1]).trim();
    if (!/schedule/i.test(text)) continue;
    headers.push({ index: h.index, text });
  }

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const nextBoundary =
      i + 1 < headers.length
        ? html.indexOf("data-name=\"accParent\"", header.index + header.text.length)
        : -1;
    const start = html.indexOf("data-name=\"accChild\"", header.index);
    if (start === -1) continue;
    const childStart = html.indexOf(">", start) + 1;
    const end = nextBoundary === -1 ? html.length : html.lastIndexOf("</tr>", nextBoundary);

    const childContent = html.slice(childStart, end);
    const programType = header.text.replace(/\s*:\s*.*/, "").trim();
    const tableRe = /<table[^>]*class="\s*datatable[^"]*"[^>]*>([\s\S]*?)<\/table>/i;
    const tableMatch = tableRe.exec(childContent);
    if (!tableMatch) continue;
    sections.push({
      programType,
      tableHtml: tableMatch[1],
    });
  }
  return sections;
}

function parseCell(cellHtml: string): string[] {
  const cells: string[] = [];
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = tdRe.exec(cellHtml)) !== null) {
    cells.push(stripHtml(m[1]));
  }
  return cells;
}

function isCellEmpty(text: string): boolean {
  return text === "" || text === "\u00a0" || /^\s*$/.test(text);
}

interface ProgramCell {
  programName: string;
  time: TimeSlot | null;
}

function parseCellContent(text: string, defaultName: string): ProgramCell[] {
  if (isCellEmpty(text)) return [];

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const results: ProgramCell[] = [];
  const timeRe =
    /(\d{1,2})(?::(\d{2}))?\s*(?:([ap]\.?m\.?)\s*)?[-–]\s*(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)/i;

  const hasSpecialNote = /time change on|only:/i.test(text);

  for (const line of lines) {
    const range = parseTimeRange(line);
    if (!range) continue;
    if (hasSpecialNote && results.length > 0) continue;
    let programName = defaultName;
    const beforeTime = line.replace(timeRe, "").trim();
    if (beforeTime && beforeTime !== defaultName) {
      programName = beforeTime.replace(/\s+/g, " ").trim();
    }
    results.push({ programName, time: range });
  }

  return results;
}

function identifyProgramType(sectionHeading: string): string {
  const lower = sectionHeading.toLowerCase();
  if (lower.includes("shinny")) return "Shinny";
  if (lower.includes("stick and puck") || lower.includes("stick & puck"))
    return "Stick and Puck";
  if (lower.includes("figure skating")) return "Figure Skating";
  if (lower.includes("ringette")) return "Ringette";
  if (lower.includes("skating")) return "Public Skate";
  return sectionHeading;
}

function parseScheduleTable(
  section: ScheduleSection
): RawEntry[] {
  const programType = identifyProgramType(section.programType);
  const entries: RawEntry[] = [];

  const tbodyRe = /<tbody>([\s\S]*?)<\/tbody>/i;
  const tbodyMatch = tbodyRe.exec(section.tableHtml);
  if (!tbodyMatch) return entries;

  const rows: string[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(tbodyMatch[1])) !== null) {
    rows.push(rowMatch[1]);
  }

  const days = DAYS;

  for (let ri = 1; ri < rows.length; ri++) {
    const cells = parseCell(rows[ri]);
    if (cells.length < 2) continue;

    const arena = findArena(cells[0]);
    if (!arena) continue;

    for (let di = 1; di < Math.min(cells.length, 8); di++) {
      const cellText = cells[di];
      const dayIndex = di - 1;

      const programCells = parseCellContent(cellText, programType);
      for (const pc of programCells) {
        if (!pc.time) continue;
        entries.push({
          arenaId: arena.id,
          arenaName: arena.name,
          day: days[dayIndex],
          programName: pc.programName,
          time: pc.time,
        });
      }
    }
  }

  return entries;
}

function slug(name: string, day: DayName, start: string): string {
  const raw = `${name} ${day} ${start}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return raw.replace(/^-+|-+$/g, "").slice(0, 80);
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function expandWeekly(
  entry: RawEntry
): string[] {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + LOOKAHEAD_DAYS);
  const targetIdx = DAYS.indexOf(entry.day);

  const out: string[] = [];
  const cursor = new Date(today);
  cursor.setUTCHours(12, 0, 0, 0);
  if (cursor.getUTCDay() !== targetIdx) {
    const delta = (targetIdx - cursor.getUTCDay() + 7) % 7;
    cursor.setUTCDate(cursor.getUTCDate() + delta);
  }
  for (; cursor <= endDate; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    out.push(dateStr(cursor));
  }
  return out;
}

function buildArenaSchedules(
  entries: RawEntry[]
): Map<string, Program[]> {
  const byArena = new Map<string, Program[]>();

  for (const entry of entries) {
    const dates = expandWeekly(entry);
    for (const date of dates) {
      if (!byArena.has(entry.arenaId)) byArena.set(entry.arenaId, []);
      byArena.get(entry.arenaId)!.push({
        id: randomUUID(),
        start: `${date}T${entry.time.start}`,
        end: `${date}T${entry.time.end}`,
        name: entry.programName,
      });
    }
  }

  return byArena;
}

function addSensorySkate(
  arenaId: string,
  programsByArena: Map<string, Program[]>
): void {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + LOOKAHEAD_DAYS);
  const inRange = (ds: string): boolean => ds >= dateStr(today) && ds <= dateStr(endDate);
  const dates = ["2026-11-07", "2027-01-16"].filter(inRange);
  for (const date of dates) {
    if (!programsByArena.has(arenaId)) programsByArena.set(arenaId, []);
    programsByArena.get(arenaId)!.push({
      id: "sensory-friendly-skate-saturday-16-15",
      start: `${date}T16:15`,
      end: `${date}T17:15`,
      name: "Sensory Friendly Skate",
    });
  }
}

async function writeArenaSchedule(
  meta: ArenaMetaList["arenas"][number],
  programs: Program[]
): Promise<string> {
  const payload: Arena = {
    name: meta.name,
    url: meta.url,
    timezone: TIMEZONE,
    address: meta.address,
    coordinates: meta.coordinates,
    schedule: {
      updatedAt: new Date().toISOString(),
      programs,
    },
  };
  const file = path.join(OUT_DIR, `${meta.id}.json`);
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return file;
}

async function main(): Promise<void> {
  const meta = JSON.parse(
    await readFile(path.join(__dirname, "meta.json"), "utf8")
  ) as ArenaMetaList;

const html = await fetchHtml(PAGE_URL);
  const sections = extractScheduleSections(html);

  if (sections.length === 0) {
    throw new Error(`No schedule sections found on page.`);
  }

  const allEntries: RawEntry[] = [];

  for (const section of sections) {
    const entries = parseScheduleTable(section);
    allEntries.push(...entries);
  }

  const programsByArena = buildArenaSchedules(allEntries);

  addSensorySkate("ed-sackfield-arena", programsByArena);

  const written: string[] = [];
  const skipped: string[] = [];

  for (const arena of meta.arenas) {
    let programs = programsByArena.get(arena.id) ?? [];
    if (programs.length === 0) {
      skipped.push(arena.id);
      continue;
    }
    programs = [...programs].sort((a, b) => a.start.localeCompare(b.start));
    const file = await writeArenaSchedule(arena, programs);
    written.push(arena.id);
    console.log(
      `[${arena.id}] ${programs.length} program(s) -> ${path.relative(process.cwd(), file)}`
    );
  }

  console.log(
    `[richmondhill-ca] wrote ${written.length} arena(s): ${written.join(", ")}`
  );
  if (skipped.length > 0) {
    console.log(
      `[richmondhill-ca] skipped ${skipped.length} arena(s) with no data: ${skipped.join(", ")}`
    );
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});