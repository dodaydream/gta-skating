import { NotFoundContent } from "@/components/NotFoundContent";
import { NotFoundTracker } from "@/components/NotFoundTracker";
import { SiteFooter } from "@/components/ui/SiteFooter";
import type { Locale } from "@/i18n/locales";

/** Shared 404 body, rendered by the `not-found.tsx` of each root layout. */
export function NotFoundPage({ locale = null }: { locale?: Locale | null }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-zinc-50 dark:bg-black">
      <NotFoundTracker />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="flex flex-1 flex-col justify-center py-10">
          <NotFoundContent locale={locale} />
        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
