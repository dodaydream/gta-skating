import type { Metadata } from "next";
import { NotFoundContent } from "@/components/NotFoundContent";
import { NotFoundTracker } from "@/components/NotFoundTracker";
import { SiteFooter } from "@/components/ui/SiteFooter";

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
        <div className="flex flex-1 flex-col items-center justify-center py-10">
          <NotFoundContent />
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
