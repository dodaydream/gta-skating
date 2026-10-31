"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { IconCalendarWeek, IconCalendar } from "@tabler/icons-react";

interface FilterChipsProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onClear: () => void;
  hideEmpty: boolean;
  onHideEmptyChange: (v: boolean) => void;
  className?: string;
}

function parseDate(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function displayLabel(from: string, to: string): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  const isTodayNow =
    !!from &&
    !!to &&
    from.slice(0, 10) === todayStr &&
    from.slice(11, 16) ===
      new Date()
        .toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false })
        .slice(0, 5) &&
    to.slice(11, 16) === "23:59";
  if (isTodayNow) return "Now";
  if (from && to && from.slice(0, 10) === to.slice(0, 10)) return from.slice(5, 10);
  if (from && to) return `${from.slice(5, 10)} - ${to.slice(5, 10)}`;
  if (from) return `From ${from.slice(5, 10)}`;
  if (to) return `Until ${to.slice(5, 10)}`;
  return "Anytime";
}

export function FilterChips({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
  hideEmpty,
  onHideEmptyChange,
  className = "",
}: FilterChipsProps) {
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState<"from" | "to">("from");
  const active = Boolean(from || to);

  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = date.toISOString().slice(0, 10);
    if (picker === "from") {
      const preservedTime = from ? from.slice(11, 16) : "00:00";
      onFromChange(`${dateStr}T${preservedTime}`);
      setPicker("to");
    } else {
      const preservedTime = to ? to.slice(11, 16) : "23:59";
      onToChange(`${dateStr}T${preservedTime}`);
    }
  };

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <Button
        variant="secondary"
        size="default"
        className="shadow-xs"
        onClick={() => setOpen(!open)}
      >
        {active ? (
          <IconCalendarWeek className="size-4 text-blue-500" />
        ) : (
          <IconCalendar className="size-4" />
        )}
        <span>{displayLabel(from, to)}</span>
        {active && <span className="ml-0.5 size-1.5 rounded-full bg-blue-500" />}
      </Button>

      <Button
        variant={hideEmpty ? "default" : "secondary"}
        size="default"
        className="shadow-xs"
        onClick={() => onHideEmptyChange(!hideEmpty)}
      >
        Programs
      </Button>

      {open && (
        <div className="absolute left-0 right-0 top-11 z-50 mx-auto w-fit sm:left-4 sm:right-auto sm:mx-0">
          <div className="overflow-hidden rounded-xl bg-popover shadow-xl ring-1 ring-foreground/10">
            <div className="flex gap-1 px-3 pt-2 pb-1">
              <button
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  picker === "from"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setPicker("from")}
              >
                From
              </button>
              <button
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  picker === "to"
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setPicker("to")}
              >
                To
              </button>
            </div>

            <Calendar
              mode="single"
              selected={picker === "from" ? fromDate : toDate}
              onSelect={handleSelect}
              autoFocus
            />

            <div className="flex items-center gap-2 border-t px-3 py-2">
              <div className="flex flex-1 items-center gap-1">
                <label className="w-8 shrink-0 text-[11px] text-muted-foreground">
                  {picker === "from" ? "From" : "To"}
                </label>
                <input
                  type="time"
                  value={
                    picker === "from"
                      ? from?.slice(11, 16) ?? "00:00"
                      : to?.slice(11, 16) ?? "23:59"
                  }
                  onChange={(e) => {
                    const time = e.target.value;
                    const dateStr =
                      picker === "from"
                        ? from?.slice(0, 10) ?? todayLocalISO().slice(0, 10)
                        : to?.slice(0, 10) ?? todayLocalISO().slice(0, 10);
                    const newVal = `${dateStr}T${time}`;
                    if (picker === "from") {
                      onFromChange(newVal);
                    } else {
                      onToChange(newVal);
                    }
                  }}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="flex gap-2 border-t px-3 py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = todayLocalISO();
                  onFromChange(now);
                  onToChange(`${now.slice(0, 10)}T23:59`);
                  setOpen(false);
                }}
              >
                Today
              </Button>
              {active && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClear();
                    setOpen(false);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}