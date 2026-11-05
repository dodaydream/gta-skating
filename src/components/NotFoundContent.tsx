"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button";

/** Localized 404 body, shown in the visitor's selected language. */
export function NotFoundContent() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p
        aria-hidden="true"
        className="text-6xl font-bold tracking-tight text-zinc-200 select-none sm:text-7xl dark:text-zinc-800"
      >
        404
      </p>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl dark:text-zinc-50">
          {t("notFound.title")}
        </h1>
        <p className="mx-auto max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {t("notFound.message")}
        </p>
      </div>
      <Link
        href="/"
        className={buttonVariants({ size: "lg", className: "mt-2 px-4" })}
      >
        {t("notFound.backToSchedule")}
      </Link>
    </div>
  );
}
