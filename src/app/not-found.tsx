import type { Metadata } from "next";
import Link from "next/link";
import { NotFoundTracker } from "@/components/NotFoundTracker";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found — GTA Skating Schedule",
  description:
    "The page you were looking for could not be found. Browse skating schedules across the Greater Toronto Area instead.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-zinc-50 dark:bg-black">
      <NotFoundTracker />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="flex flex-1 flex-col items-start gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
              404
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl dark:text-zinc-50">
              Page not found
            </h1>
          </div>
          <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            We couldn&rsquo;t find the page you were looking for. The schedule
            itself is up and running — only this specific link appears to be
            missing or out of date.
          </p>
          <Link
            href="/"
            className={buttonVariants({ size: "lg", className: "px-4" })}
          >
            View all skating schedules
          </Link>
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
