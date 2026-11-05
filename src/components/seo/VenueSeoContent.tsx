import Link from "next/link";
import type { Venue } from "@/types/venue";
import { formatEventDate, getUpcomingEvents } from "@/lib/schedule";

const MAX_PROGRAMS = 20;

/**
 * Server-rendered, crawlable description of a venue's schedule. Visually hidden
 * with `sr-only` because the interactive map fills the viewport, but present in
 * the HTML for search engines and assistive technology.
 */
export function VenueSeoContent({ venue }: { venue: Venue }) {
  const programs = getUpcomingEvents(venue).slice(0, MAX_PROGRAMS);
  const types = Array.from(
    new Set(venue.schedule.programs.map((program) => program.type))
  );
  const updated = venue.schedule.updatedAt.slice(0, 10);

  return (
    <section className="sr-only">
      <h1>{venue.name} Skating Schedule</h1>
      <p>
        {venue.name} is located at {venue.address}. Upcoming drop-in skating
        programs include {types.join(", ")}.
      </p>
      {programs.length > 0 ? (
        <ul>
          {programs.map((program) => (
            <li key={program.id}>
              {formatEventDate(program.start.slice(0, 10), venue.timezone, "en")}
              {": "}
              {program.name} from {program.start.slice(11, 16)} to{" "}
              {program.end.slice(11, 16)}
              {program.ticket === 0 ? " (free)" : ""}.
            </li>
          ))}
        </ul>
      ) : (
        <p>No upcoming sessions are currently listed for {venue.name}.</p>
      )}
      <p>Schedule last updated {updated}.</p>
      {venue.url ? (
        <p>
          <a href={venue.url} rel="noopener noreferrer">
            Official {venue.name} schedule source
          </a>
        </p>
      ) : null}
      <p>
        <Link href="/">Back to all GTA skating venues</Link>
      </p>
    </section>
  );
}
