"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

const REPO_URL = "https://github.com/dodaydream/gta-skating";
const SUPPORT_URL = process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL;

/** Copyright line and footer links for standalone pages. */
export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="flex flex-col gap-2 border-t border-black/[.08] pt-6 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
      <p>© {new Date().getFullYear()} GTA Skating</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link
          href="/privacy"
          className="whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400"
        >
          {t("sidebar.privacy")}
        </Link>
        <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
          ·
        </span>
        <Link
          href="/data-sources"
          className="whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400"
        >
          {t("sidebar.dataSources")}
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
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
