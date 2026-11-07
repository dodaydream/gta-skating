import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ — GTA Skating Schedule",
  description:
    "Frequently asked questions about the GTA Skating Schedule: where the data comes from, how often it is updated, how accurate it is, and how to report an issue.",
  alternates: { canonical: "/faq" },
};

const REPO_URL = "https://github.com/dodaydream/gta-skating";
const TORONTO_LICENCE_URL =
  "https://www.toronto.ca/city-government/data-research-maps/open-data/open-data-licence/";

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is GTA Skating?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GTA Skating Schedule is a free, independent community project that gathers public drop-in skating, shinny, and figure-skating schedules from arenas across the Greater Toronto Area into one place. It is not affiliated with, or endorsed by, any arena, municipality, or operator listed on the site.",
      },
    },
    {
      "@type": "Question",
      name: "Where does the schedule data come from?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Data is collected from the public schedule pages and open data feeds published by municipalities, arena operators, and universities. The full list is on the Data sources page, including the City of Toronto Open Data dataset used under the Open Government Licence – Toronto.",
      },
    },
    {
      "@type": "Question",
      name: "How often is the data updated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Schedules are refreshed regularly as sources republish them. Recurring weekly programs are expanded into dated sessions and cached on the site. Some sources update weekly, so changes such as cancellations may lag behind a venue's live calendar.",
      },
    },
    {
      "@type": "Question",
      name: "How accurate is the information?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We do our best to keep the data current, but schedules can change at short notice. Always confirm times, prices, and availability with the venue before you go. Each arena's page links to its official source.",
      },
    },
    {
      "@type": "Question",
      name: "Is GTA Skating free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The site is free, requires no account, and does not ask for your name or email. It is supported by advertising.",
      },
    },
    {
      "@type": "Question",
      name: "What do the program types mean?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Public Skate is general drop-in leisure skating open to everyone. Stick and Puck is informal practice with a stick and puck, usually without an organized game. Pickup Hockey (also called shinny) is informal, non-league hockey, often with full equipment. Figure Skating sessions are for practising, sometimes with rules about jumps and spins. Ringette is drop-in ringette, a team sport played on ice with a straight stick and a ring.",
      },
    },
    {
      "@type": "Question",
      name: "What does the price badge mean?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Each program shows a badge that reads Free for free drop-in sessions, or a dollar amount where the source publishes a drop-in fee. Fees and registration requirements can change, so confirm with the venue.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to register in advance?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Many drop-in sessions are first-come, first-served, but some venues require pre-registration or have capacity limits. The site shows the published schedule; check the venue's source page, linked on each arena page, for registration details.",
      },
    },
    {
      "@type": "Question",
      name: "What do the busyness ratings mean?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For sessions that are in progress, visitors can submit an anonymous 'how busy is it' rating of Quiet, Moderate, or Busy. Once a session has at least three reports, we show the usual busyness as an average. Ratings are anonymous and shared publicly.",
      },
    },
    {
      "@type": "Question",
      name: "How do favourites and my location work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Favourites are stored in your browser on your device, so no account is needed. With your permission, the site reads your location in the browser to sort arenas by distance and centre the map; the coordinates stay on your device.",
      },
    },
    {
      "@type": "Question",
      name: "Why might an arena or session be missing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We cover the sources listed on the Data sources page. Venues that do not publish a machine-readable schedule may not be included, and a session may be missing if the source has not published it yet or has cancelled it.",
      },
    },
    {
      "@type": "Question",
      name: "How do I report a wrong schedule or suggest an arena?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Open an issue on the project repository with the arena and, if possible, a link to the correct schedule.",
      },
    },
    {
      "@type": "Question",
      name: "Is the site affiliated with the City of Toronto or any municipality?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. GTA Skating Schedule is an independent community project and is not affiliated with, or endorsed by, any organization listed. City of Toronto open data is used under the Open Government Licence – Toronto.",
      },
    },
    {
      "@type": "Question",
      name: "How is my privacy handled?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The site has no accounts or contact forms. It uses Google Analytics and displays advertising, and stores anonymous busyness ratings. See the Privacy Policy for full details.",
      },
    },
  ],
};

function DocLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
      href={href}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
    >
      {children}
    </a>
  );
}

function Question({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="scroll-mt-6 text-lg font-semibold tracking-tight text-black dark:text-zinc-50"
    >
      {children}
    </h2>
  );
}

function Answer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex flex-col gap-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
      {children}
    </div>
  );
}

export default function FaqPage() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-3 border-b border-black/[.08] pb-6 dark:border-white/[.145]">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to the schedule
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl dark:text-zinc-50">
            Frequently asked questions
          </h1>
        </header>

        <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          GTA Skating Schedule aggregates publicly available drop-in skating
          schedules from municipal recreation departments, arena operators, and
          universities across the Greater Toronto Area. Here are answers to the
          questions we see most often. It is an independent community project and
          is not affiliated with, or endorsed by, any of the organizations listed
          on the site.
        </p>

        <section className="scroll-mt-6">
          <Question id="what">What is GTA Skating?</Question>
          <Answer>
            <p>
              GTA Skating Schedule is a free, independent community project that
              gathers public drop-in skating, shinny, and figure-skating
              schedules from arenas across the Greater Toronto Area into one
              place. It is not affiliated with, or endorsed by, any arena,
              municipality, or operator listed on the site.
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="data">Where does the schedule data come from?</Question>
          <Answer>
            <p>
              Data is collected from the public schedule pages and open data
              feeds published by municipalities, arena operators, and
              universities. The full list is on the{" "}
              <DocLink href="/data-sources">Data sources</DocLink> page,
              including the City of Toronto Open Data dataset used under the{" "}
              <DocLink href={TORONTO_LICENCE_URL}>
                Open Government Licence – Toronto
              </DocLink>
              .
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="refresh">How often is the data updated?</Question>
          <Answer>
            <p>
              Schedules are refreshed regularly as sources republish them.
              Recurring weekly programs are expanded into dated sessions and
              cached on the site. Some sources update weekly, so changes such as
              cancellations may lag behind a venue&rsquo;s live calendar.
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="accuracy">How accurate is the information?</Question>
          <Answer>
            <p>
              We do our best to keep the data current, but schedules can change
              at short notice — holidays, tournaments, and maintenance all shift
              times. Always confirm times, prices, and availability with the
              venue before you go. Each arena&rsquo;s page links to its official
              source.
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="free">Is GTA Skating free to use?</Question>
          <Answer>
            <p>
              Yes. The site is free, requires no account, and does not ask for
              your name or email. It is supported by advertising.
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="types">What do the program types mean?</Question>
          <Answer>
            <ul className="list-disc pl-5">
              <li>
                <span className="font-medium text-black dark:text-zinc-100">
                  Public Skate
                </span>{" "}
                — general drop-in leisure skating, open to everyone.
              </li>
              <li>
                <span className="font-medium text-black dark:text-zinc-100">
                  Stick and Puck
                </span>{" "}
                — informal practice with a stick and puck, usually without an
                organized game.
              </li>
              <li>
                <span className="font-medium text-black dark:text-zinc-100">
                  Pickup Hockey
                </span>{" "}
                (also called shinny) — informal, non-league hockey, often with
                full equipment.
              </li>
              <li>
                <span className="font-medium text-black dark:text-zinc-100">
                  Figure Skating
                </span>{" "}
                — sessions for practising, sometimes with rules about jumps and
                spins.
              </li>
              <li>
                <span className="font-medium text-black dark:text-zinc-100">
                  Ringette
                </span>{" "}
                — drop-in ringette, a team sport played on ice with a straight
                stick and a ring.
              </li>
            </ul>
            <p>
              The exact name and any extra rules are published by the venue and
              shown in each session&rsquo;s notes.
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="price">What does the price badge mean?</Question>
          <Answer>
            <p>
              Each program shows a badge that reads <em>Free</em> for free
              drop-in sessions, or a dollar amount where the source publishes a
              drop-in fee. Fees and registration requirements can change, so
              confirm with the venue.
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="register">Do I need to register in advance?</Question>
          <Answer>
            <p>
              Many drop-in sessions are first-come, first-served, but some venues
              require pre-registration or have capacity limits. The site shows
              the published schedule; check the venue&rsquo;s source page, linked
              on each arena page, for registration details.
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="busy">What do the busyness ratings mean?</Question>
          <Answer>
            <p>
              For sessions that are in progress, visitors can submit an
              anonymous &ldquo;how busy is it&rdquo; rating of Quiet, Moderate,
              or Busy. Once a session has at least three reports, we show the
              usual busyness as an average. Ratings are anonymous and shared
              publicly.
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="favorites">
            How do favourites and my location work?
          </Question>
          <Answer>
            <p>
              Favourites are stored in your browser on your device, so no account
              is needed. With your permission, the site reads your location in
              the browser to sort arenas by distance and centre the map; the
              coordinates stay on your device.
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="missing">
            Why might an arena or session be missing?
          </Question>
          <Answer>
            <p>
              We cover the sources listed on the{" "}
              <DocLink href="/data-sources">Data sources</DocLink> page. Venues
              that do not publish a machine-readable schedule may not be
              included, and a session may be missing if the source has not
              published it yet or has cancelled it.
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="report">
            How do I report a wrong schedule or suggest an arena?
          </Question>
          <Answer>
            <p>
              Open an issue on the project repository at{" "}
              <DocLink href={REPO_URL}>github.com/dodaydream/gta-skating</DocLink>
              , including the arena and, if possible, a link to the correct
              schedule.
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="affiliation">
            Is the site affiliated with the City of Toronto or any municipality?
          </Question>
          <Answer>
            <p>
              No. GTA Skating Schedule is an independent community project and is
              not affiliated with, or endorsed by, any organization listed. City
              of Toronto open data is used under the{" "}
              <DocLink href={TORONTO_LICENCE_URL}>
                Open Government Licence – Toronto
              </DocLink>
              .
            </p>
          </Answer>
        </section>

        <section className="scroll-mt-6">
          <Question id="privacy">How is my privacy handled?</Question>
          <Answer>
            <p>
              The site has no accounts or contact forms. It uses Google Analytics
              and displays advertising, and stores anonymous busyness ratings.
              See the <DocLink href="/privacy">Privacy Policy</DocLink> for full
              details.
            </p>
          </Answer>
        </section>

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
