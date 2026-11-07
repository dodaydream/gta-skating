import { NotFoundContent } from "@/components/NotFoundContent";
import { NotFoundTracker } from "@/components/NotFoundTracker";
import { SiteFooter } from "@/components/ui/SiteFooter";

/** Shared 404 body, rendered by the `not-found.tsx` of each root layout. */
export function NotFoundPage() {
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
