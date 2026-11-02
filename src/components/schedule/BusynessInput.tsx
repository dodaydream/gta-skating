"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BusyLevel } from "@/types/feedback";
import type { Program } from "@/types/schedule";
import { submitReport } from "@/api/busyness";
import { minutesUntilEnd } from "@/lib/schedule";
import { trackEvent } from "@/lib/analytics";
import { cn } from "cn";

const OPTIONS: { level: BusyLevel; labelKey: string }[] = [
  { level: 1, labelKey: "busy.quiet" },
  { level: 2, labelKey: "busy.moderate" },
  { level: 3, labelKey: "busy.busy" },
];

type Status = "idle" | "submitting" | "submitted" | "error";

function errorKeyFor(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? "";
  if (code === "auth/network-request-failed" || code === "unavailable") {
    return "busy.errorNetwork";
  }
  if (code === "auth/operation-not-allowed") {
    return "busy.errorDisabled";
  }
  if (code === "permission-denied") {
    return "busy.errorRejected";
  }
  return "busy.errorGeneric";
}

/**
 * "How busy is it right now?" control. Signs in anonymously and writes a single
 * point-in-time report for the venue's current hour.
 */
export function BusynessInput({
  venueSlug,
  timezone,
  program,
  onSubmitted,
}: {
  venueSlug: string;
  timezone: string;
  program?: Program | null;
  onSubmitted?: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<BusyLevel | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const busy = status === "submitting" || status === "submitted";

  async function handleSubmit() {
    if (selected === null || busy) return;
    setStatus("submitting");
    setErrorKey(null);
    try {
      await submitReport(venueSlug, selected, timezone);
      setStatus("submitted");
      trackEvent("busyness_report", { venue: venueSlug, busy: selected });
      onSubmitted?.();
    } catch (error) {
      console.error("busyness_report_failed", error);
      setErrorKey(errorKeyFor(error));
      setStatus("error");
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-black/[.08] bg-white p-3 dark:border-white/[.145] dark:bg-zinc-950">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        {program ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="mb-2 flex flex-wrap items-center gap-1">
              <span className="w-fit rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {t("busy.inProgress")}
              </span>
              <span className="w-fit rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {t("busy.endsIn", {
                  minutes: minutesUntilEnd(program.end, timezone),
                })}
              </span>
            </div>
            <span className="truncate text-sm font-medium text-black dark:text-zinc-50">
              {program.name}
            </span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-black dark:text-zinc-50">
              {t("busy.question")}
            </h3>
            {status === "submitted" ? (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {t("busy.thanks")}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {OPTIONS.map((option) => {
              const active = selected === option.level;
              return (
                <button
                  key={option.level}
                  type="button"
                  disabled={busy}
                  aria-pressed={active}
                  onClick={() => {
                    setSelected(option.level);
                    if (status === "error") setStatus("idle");
                  }}
                  className={cn(
                    "flex-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 lg:flex-none",
                    active
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-black/[.12] text-zinc-700 hover:bg-zinc-100 dark:border-white/[.2] dark:text-zinc-200 dark:hover:bg-zinc-800"
                  )}
                >
                  {t(option.labelKey)}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={selected === null || busy}
              className="w-full rounded-full bg-black px-3 py-1 text-xs font-semibold text-white transition-opacity disabled:opacity-40 dark:bg-zinc-50 dark:text-black lg:ml-auto lg:w-auto"
            >
              {status === "submitting"
                ? t("busy.sending")
                : status === "submitted"
                  ? t("busy.submitted")
                  : t("busy.submit")}
            </button>
          </div>

          {status === "error" ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errorKey ? t(errorKey) : t("busy.errorGeneric")}
            </p>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("busy.anonymous")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
