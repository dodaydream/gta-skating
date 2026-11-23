"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SITE_REPO } from "@/lib/site";

const SUPPORT_URL = process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL;

/** Copyright line and footer links for standalone pages. */
export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground">
      <p>© {new Date().getFullYear()} GTA Skating</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link
          href="/privacy"
          className="whitespace-nowrap hover:text-brand"
        >
          {t("sidebar.privacy")}
        </Link>
        <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
          ·
        </span>
        <Link
          href="/data-sources"
          className="whitespace-nowrap hover:text-brand"
        >
          {t("sidebar.dataSources")}
        </Link>
        <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
          ·
        </span>
        <Link
          href="/faq"
          className="whitespace-nowrap hover:text-brand"
        >
          {t("sidebar.faq")}
        </Link>
        <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
          ·
        </span>
        {SUPPORT_URL ? (
          <>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap bg-clip-text transition-colors hover:bg-gradient-to-r hover:from-[#FFDD00] hover:to-[#FF813F] hover:text-transparent"
            >
              Buy Me a Coffee
            </a>
            <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
              ·
            </span>
          </>
        ) : null}
        <a
          href={SITE_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap hover:text-brand"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
