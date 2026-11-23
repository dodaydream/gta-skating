import type { Metadata } from "next";
import Link from "next/link";
import { SITE_REPO } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy — GTA Skating Schedule",
  description:
    "How the GTA Skating Schedule collects, uses and shares information, including cookies, analytics and location.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "2 November 2026";

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
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-2 flex flex-col gap-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-3 border-b border-border pb-6">
          <Link
            href="/"
            className="text-sm font-medium text-brand hover:underline"
          >
            ← Back to the schedule
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl dark:text-zinc-50">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          GTA Skating Schedule (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
          operates this website (the &ldquo;Site&rdquo;), which displays public
          skating and arena schedules across the Greater Toronto Area. This
          policy explains what information is collected when you use the Site,
          how it is used and shared, and the choices available to you. It is an
          independent community project and is not affiliated with, or endorsed
          by, any arena or municipality listed on the Site.
        </p>

        <Section id="summary" title="In short">
          <ul className="list-disc pl-5">
            <li>
              The Site has no user accounts or contact forms, and we do not ask
              you for your name, email address, or other contact details. You
              may optionally submit an anonymous &ldquo;how busy is it&rdquo;
              rating, which is the only information you actively provide; doing
              so creates a random, non-identifying identifier in your browser.
            </li>
            <li>
              We use Google Analytics to understand how the Site is used. This
              relies on cookies and similar identifiers and collects usage,
              device, and approximate location data.
            </li>
            <li>
              With your permission, the Site reads your device&rsquo;s location in
              your browser to sort arenas by distance and centre the map. The
              coordinates are used only on your device and are not sent to us or
              to third parties. If you submit a busyness rating, that rating
              reveals the venue and the time you were looking at, but not your
              coordinates.
            </li>
            <li>
              Busyness ratings you choose to submit are stored on our behalf and
              shown to other visitors. They are tied only to a randomly
              generated, non-identifying browser identifier.
            </li>
          </ul>
        </Section>

        <Section id="collect" title="Information we collect">
          <h3 className="font-medium text-foreground">
            Information you provide
          </h3>
          <p>
            The Site does not offer accounts, comments, or forms, so it does not
            collect personal information that you type in. The information you
            actively choose to share is your device location (described below)
            and, optionally, a busyness rating when a session is in progress.
            Busyness ratings are anonymous: they record only a busy level (Quiet,
            Moderate, or Busy), the venue, and the time, and are not linked to
            your name or contact details.
          </p>

          <h3 className="font-medium text-foreground">
            Information collected automatically
          </h3>
          <p>
            When you visit the Site, the following may be collected
            automatically:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <span className="font-medium text-foreground">
                Usage and analytics data.
              </span>{" "}
              Through Google Analytics 4 we collect information such as the
              pages you view, interactions and events (for example changing the
              date filter, clicking &ldquo;centre on your location&rdquo;, or
              toggling &ldquo;hide arenas with no sessions&rdquo;), the
              approximate region derived from your IP address, your browser and
              device type, operating system, language, the page that referred
              you, and a randomly generated identifier stored in a cookie.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Device location.
              </span>{" "}
              With your permission, the Site requests your device&rsquo;s
              location through the browser Geolocation API. The coordinates are
              used only within your browser to calculate distances to arenas and
              centre the map. They are held in memory for your session only and
              are not stored or transmitted to us or to third parties. You can
              deny the request or revoke the permission at any time in your
              browser settings; the Site continues to work without it.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Anonymous identifier.
              </span>{" "}
              If you submit a busyness rating, Firebase Authentication creates a
              random identifier that is stored in your browser. It is not derived
              from your name, email, or any other personal detail, and is used
              only to cap repeated submissions and to validate writes. A rating
              reveals only the venue and time you were asked about, not your
              precise location.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Cookies, web beacons, IP addresses and other identifiers.
              </span>{" "}
              We and third parties use these technologies as described in the
              next section.
            </li>
          </ul>
        </Section>

        <Section id="cookies" title="Cookies and similar technologies">
          <p>
            We and third parties may place and read cookies on your browser, and
            may use web beacons, IP addresses, or other identifiers, as a result
            of analytics on the Site. These include:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <span className="font-medium text-foreground">
                Analytics cookies
              </span>{" "}
              set by Google Analytics (for example <code>_ga</code> and{" "}
              <code>_ga_*</code>) to distinguish users and measure usage.
            </li>
          </ul>
          <p>
            You can control or delete cookies through your browser settings, and
            you can opt out of Google Analytics using Google&rsquo;s browser
            add-on. Disabling cookies may affect how parts of the Site work.
          </p>
        </Section>

        <Section id="use" title="How we use information">
          <ul className="list-disc pl-5">
            <li>To operate, maintain, and improve the Site and its features.</li>
            <li>
              To measure usage and understand which features are used, so we can
              prioritise improvements.
            </li>
            <li>To detect and prevent abuse, and to comply with the law.</li>
          </ul>
        </Section>

        <Section id="sharing" title="How information is shared">
          <p>
            We do not sell your personal information. Information may be shared
            with:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <span className="font-medium text-foreground">
                Google
              </span>{" "}
              — for analytics, in accordance with{" "}
              <a
                className="font-medium text-brand hover:underline"
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google&rsquo;s Privacy Policy
              </a>
              .
            </li>
            <li>
              <span className="font-medium text-foreground">
                Firebase and Google Cloud
              </span>{" "}
              — anonymous busyness ratings are stored in Google Cloud Firestore,
              a service operated by Google. This processing is governed by{" "}
              <a
                className="font-medium text-brand hover:underline"
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google&rsquo;s Privacy Policy
              </a>
              .
            </li>
            <li>
              <span className="font-medium text-foreground">
                Our hosting and map providers
              </span>{" "}
              — the Site is hosted on GitHub Pages and map tiles are loaded from
              OpenFreeMap (OpenStreetMap data). These providers may process
              technical data such as your IP address in order to serve the Site
              and its map.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Legal requirements
              </span>{" "}
              — where required to comply with the law or protect rights and
              safety.
            </li>
          </ul>
        </Section>

        <Section id="retention" title="Data retention">
          <p>
            Anonymous busyness ratings are stored in Firebase Firestore and are
            currently retained indefinitely; they carry no name or contact
            details. Usage data collected through Google Analytics is retained
            according to Google&rsquo;s configured retention period (currently up
            to 14 months) and Google&rsquo;s policies.
          </p>
        </Section>

        <Section id="rights" title="Your rights and choices">
          <p>
            Depending on where you live, you may have the right to access,
            correct, or delete personal information, to object to or restrict
            certain processing, and to withdraw consent. Because we do not hold
            personal information ourselves, requests relating to analytics data
            should be directed to Google using the links above.
            Busyness ratings carry no name or contact details, so deletion
            requests are handled on a best-effort basis through the project
            repository issue tracker linked in the Contact section. You always
            control cookies through your browser and can deny the location
            permission.
          </p>
        </Section>

        <Section id="children" title="Children&rsquo;s privacy">
          <p>
            The Site is intended for a general audience and is not directed at
            children under 13 (or under 16 in some regions). We do not knowingly
            collect personal information from children. If
            you believe a child has provided information through the Site,
            please contact us so we can address it.
          </p>
        </Section>

        <Section id="transfers" title="International transfers">
          <p>
            Our service providers, including Google, may process data in the
            United States and other countries. Where required, they rely on
            appropriate safeguards for such transfers under their own policies.
          </p>
        </Section>

        <Section id="security" title="Security">
          <p>
            The Site is served over HTTPS. Access to busyness ratings in
            Firestore is governed by security rules that restrict writes to
            validated, anonymous submissions (a signed-in, anonymous
            identifier; a bounded busy level; and a server-assigned timestamp
            that prevents backdating). No method of transmission or storage is
            completely secure, so we cannot guarantee absolute security.
          </p>
        </Section>

        <Section id="changes" title="Changes to this policy">
          <p>
            We may update this policy from time to time. Material changes will
            be reflected by updating the &ldquo;Last updated&rdquo; date above.
            Continued use of the Site after a change means you accept the
            updated policy.
          </p>
        </Section>

        <Section id="contact" title="Contact">
          <p>
            For questions about this policy, or to report a concern, please open
            an issue on the project repository at{" "}
            <a
              className="font-medium text-brand hover:underline"
              href={SITE_REPO}
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/dodaydream/gta-skating
            </a>
            .
          </p>
        </Section>

        <Section id="google" title="How Google uses data">
          <p>
            To learn how Google uses data when you use our partners&rsquo; sites
            or apps, see{" "}
            <a
              className="font-medium text-brand hover:underline"
              href="https://www.google.com/policies/privacy/partners/"
              target="_blank"
              rel="noopener noreferrer"
            >
              google.com/policies/privacy/partners
            </a>
            . You can also opt out of Google Analytics with the{" "}
            <a
              className="font-medium text-brand hover:underline"
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Analytics opt-out browser add-on
            </a>
            .
          </p>
        </Section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground">
          <Link
            href="/"
            className="font-medium text-brand hover:underline"
          >
            ← Back to the schedule
          </Link>
        </footer>
      </div>
    </main>
  );
}
