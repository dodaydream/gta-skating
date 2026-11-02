import type { Venue } from "@/types/venue";
import { ProgramType } from "@/types/schedule";

const TIMEZONE = "America/Toronto";

function todayInVenueTime(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    new Date()
  );
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/**
 * Dev-only venue used to exercise the busyness UI. Its program runs the whole
 * day so a session is always "in progress" and the report control is visible.
 * Never included in a production build (see `schedules.ts`).
 */
export function createTestVenue(): Venue {
  const today = todayInVenueTime();
  const tomorrow = addDays(today, 1);

  return {
    name: "Test Arena (Dev)",
    url: "",
    timezone: TIMEZONE,
    coordinates: { lat: 43.6532, lon: -79.3832 },
    address: "123 Test Street, Toronto, ON M0M 0M0",
    schedule: {
      updatedAt: new Date().toISOString(),
      programs: [
        {
          id: "test-open-ice-today",
          start: `${today}T00:00`,
          end: `${today}T23:59`,
          name: "Open Test Ice",
          type: ProgramType.PublicSkate,
          ticket: 0,
        },
        {
          id: "test-open-ice-tomorrow",
          start: `${tomorrow}T00:00`,
          end: `${tomorrow}T23:59`,
          name: "Open Test Ice",
          type: ProgramType.PublicSkate,
          ticket: 0,
        },
      ],
    },
  };
}
