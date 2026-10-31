"use client";

import { useState } from "react";

interface DateFilterProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onClear: () => void;
  className?: string;
}

function toLocalInput(value: string): string {
  if (!value) return "";
  // "YYYY-MM-DD" -> "YYYY-MM-DDT00:00"
  return value.length === 10 ? `${value}T00:00` : value;
}

function displayLabel(from: string, to: string): string {
  const isTodayNow =
    !!from &&
    !!to &&
    from.slice(0, 10) === todayLocal() &&
    from.slice(11, 16) === nowLocal() &&
    to.slice(11, 16) === "23:59";
  if (isTodayNow) return "Today · Now";
  if (from && to) {
    const same = from.slice(0, 10) === to.slice(0, 10);
    if (same) return from.slice(0, 10);
    return `${from.slice(5, 10)} → ${to.slice(5, 10)}`;
  }
  if (from) return `From ${from.slice(5, 10)}`;
  if (to) return `Until ${to.slice(5, 10)}`;
  return "Today";
}

function todayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nowLocal(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

export function DateFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
  className = "",
}: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const active = Boolean(from || to);

  const handleOpen = () => {
    if (!open) {
      setOpen(true);
      if (!from && !to) {
        const today = todayLocal();
        onFromChange(`${today}T00:00`);
        onToChange(`${today}T23:59`);
      }
    } else {
      setOpen(false);
    }
  };

  return (
    <div className={`bg-black/70 text-white shadow-lg ${className}`}>
      <button
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium"
        onClick={handleOpen}
        aria-expanded={open}
      >
        <svg
          className="h-4 w-4 shrink-0 opacity-80"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="3" y="4" width="14" height="14" rx="2" />
          <path d="M3 8h14M7 2v4M13 2v4" strokeLinecap="round" />
        </svg>
        <span>{displayLabel(from, to)}</span>
        {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />}
        <svg
          className={`h-4 w-4 shrink-0 opacity-80 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-white/10 p-3">
          <DateInput label="From" value={toLocalInput(from)} onChange={onFromChange} />
          <DateInput label="To" value={toLocalInput(to)} onChange={onToChange} />
          <div className="flex gap-2">
            {active && (
              <button
                className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25"
                onClick={onClear}
              >
                Clear
              </button>
            )}
            <button
              className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25"
              onClick={() => {
                const today = todayLocal();
                const nowHm = nowLocal();
                onFromChange(`${today}T${nowHm}`);
                onToChange(`${today}T23:59`);
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-white/70">
      <span className="w-8 shrink-0">{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-black/40 px-2 py-1 text-sm text-white [color-scheme:dark]"
      />
    </label>
  );
}