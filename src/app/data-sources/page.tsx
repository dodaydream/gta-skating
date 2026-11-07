import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Data Sources — GTA Skating Schedule",
  description:
    "Where the GTA Skating Schedule collects its skating and arena schedule data, how it is refreshed, and how to verify it.",
  alternates: { canonical: "/data-sources" },
};

const REPO_URL = "https://github.com/dodaydream/gta-skating";

const SOURCES: {
  name: string;
  href: string;
  title: string;
}[] = [
  {
    name: "Bill Bolton Arena",
    href: "https://www.billboltonarena.ca/public-skating",
    title: "Public Skating — Bill Bolton Arena",
  },
  {
    name: "Canlan Sports",
    href: "https://apps.daysmartrecreation.com/dash/x/canlan/event-registration",
    title: "Dash Member",
  },
  {
    name: "City of Toronto",
    href: "https://open.toronto.ca/dataset/registered-programs-and-drop-in-courses-offering/",
    title:
      "Registered Programs and Drop In Courses Offering – City of Toronto Open Data",
  },
  {
    name: "City of Markham",
    href: "https://cityofmarkham.perfectmind.com/Clients/BookMe4BookingPages/Classes?calendarId=ecf5202d-4c97-4f89-b4e3-42966a1cc453&widgetId=6825ea71-e5b7-4c2a-948f-9195507ad90a&embed=False",
    title: "Drop-In Skating – City of Markham",
  },
  {
    name: "City of Mississauga",
    href: "https://anc.ca.apm.activecommunities.com/activemississauga/calendars?defaultCalendarId=1&categoryIds=52&view=2",
    title: "Drop-In Recreation – City of Mississauga",
  },
  {
    name: "City of Pickering",
    href: "https://www.pickering.ca/parks-recreation-culture/arenas-and-skating/",
    title: "Arenas and Skating – City of Pickering",
  },
  {
    name: "City of Vaughan",
    href: "https://vaughan.perfectmind.com/25076/Clients/BookMe4BookingPages/Classes?calendarId=84142d20-1da8-48ed-800d-31dc0c30121d&widgetId=dff88c8a-0b78-4a94-9dde-250040385300&embed=False",
    title: "Drop-In Skating – City of Vaughan",
  },
  {
    name: "George Bell Arena",
    href: "https://georgebellarena.com/public-skating",
    title: "Public Skating",
  },
  {
    name: "Larry Grossman Forest Hill Memorial Arena",
    href: "https://larrygrossmanforesthillarena.com/recreational-skating-hours/",
    title: "Recreational Skating Hours - Larry Grossman",
  },
  {
    name: "Leaside Gardens",
    href: "https://leasidegardens.com/arenas/public-skate-times/",
    title: "Public Skating, Figure Skating & Shinny – Leaside Gardens",
  },
  {
    name: "Mattamy Athletic Centre",
    href: "https://www.mattamyathleticcentre.ca/venue-info/community-skates",
    title: "Community Skates | Mattamy Athletic Centre",
  },
  {
    name: "Moss Park Arena",
    href: "https://mossparkarena.com/home/skating/public-skating/",
    title: "Public Skating - Moss Park Arena",
  },
  {
    name: "Town of Richmond Hill",
    href: "https://www.richmondhill.ca/en/things-to-do/Skating.aspx",
    title: "Skating - City of Richmond Hill",
  },
  {
    name: "Town of Whitby",
    href: "https://www.whitby.ca/explore-and-enjoy/parks-and-recreation/skating-schedules-and-arenas/",
    title: "Skating Schedules and Arenas – Town of Whitby",
  },
  {
    name: "Town of Whitchurch-Stouffville",
    href: "https://anc.ca.apm.activecommunities.com/townofws/calendars?onlineSiteId=0&no_scroll_top=true&defaultCalendarId=3&locationId=13%2C14&displayType=0&view=2",
    title: "Drop-In Skating – Town of Whitchurch-Stouffville",
  },
  {
    name: "Township of King",
    href: "https://townshipofking.perfectmind.com/23793/Clients/BookMe4BookingPages/Classes?calendarId=2fd6d540-75aa-416b-9a70-a78b8f598e7d&widgetId=15f6af07-39c5-473e-b053-96653f77a406&embed=False",
    title: "Drop-In Skating – Township of King",
  },
  {
    name: "University of Toronto",
    href: "https://kpe.utoronto.ca/sport-recreationrecreational-fitness-drop-sportsdrop-sports-activities/drop-ice-skate-ice-sports",
    title:
      "Drop-In Ice Skate & Ice Sports | UofT - Faculty of Kinesiology & Physical Education",
  },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
        {title}
      </h2>
      <div className="mt-2 flex flex-col gap-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </section>
  );
}

function SourceLink({ name, href }: { name: string; href: string }) {
  return (
    <a
      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {name}
    </a>
  );
}

export default function DataSourcesPage() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-3 border-b border-black/[.08] pb-6 dark:border-white/[.145]">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to the schedule
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl dark:text-zinc-50">
            Data Sources
          </h1>
        </header>

        <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          GTA Skating Schedule aggregates publicly available drop-in skating
          schedules from municipal recreation departments, arena operators, and
          universities across the Greater Toronto Area. It is an independent
          community project and is not affiliated with, or endorsed by, any of
          the organizations listed below.
        </p>

        <Section id="how" title="How the data is collected">
          <p>
            Automated scrapers read the public schedule pages and feeds listed
            below on a regular basis. Recurring weekly programs are expanded
            into dated sessions, and each arena&rsquo;s schedule is cached on the
            site and refreshed as new data is published. No login, account, or
            private data is involved — only what the source already publishes
            for the public.
          </p>
        </Section>

        <Section id="sources" title="Sources">
          <ul className="flex flex-col gap-3">
            {SOURCES.map((source) => (
              <li key={source.href}>
                {source.name} —{" "}
                <SourceLink name={source.title} href={source.href} />
              </li>
            ))}
          </ul>
        </Section>

        <Section id="accuracy" title="Accuracy and verification">
          <p>
            Schedules can change at short notice — holidays, tournaments, and
            maintenance all shift times. We do our best to keep the data fresh,
            but it may lag behind the source. Each arena&rsquo;s page on this
            site links to its official source, and the disclaimer in the sidebar
            reminds you to confirm times with the venue before you go.
          </p>
        </Section>

        <Section id="corrections" title="Corrections">
          <p>
            Spotted a schedule that&rsquo;s wrong or an arena we&rsquo;re missing?
            Please open an issue on the project repository at{" "}
            <SourceLink
              name="github.com/dodaydream/gta-skating"
              href={REPO_URL}
            />
            , including the arena and, if possible, a link to the correct
            schedule.
          </p>
        </Section>

        <footer className="border-t border-black/[.08] pt-6 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
          <Link
            href="/"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to the schedule
          </Link>
        </footer>
      </div>
    </main>
  );
}
