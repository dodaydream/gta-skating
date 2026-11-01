"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  numberOfMonths?: number;
  align?: "start" | "center" | "end";
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
  trigger?: ReactNode;
  children?: ReactNode;
}

function DateRangePicker({
  value,
  onChange,
  open,
  onOpenChange,
  numberOfMonths = 2,
  align = "start",
  variant = "outline",
  className,
  trigger,
  children,
}: DateRangePickerProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant={variant}
            data-empty={!value?.from}
            className={cn(
              "justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
              className
            )}
          />
        }
      >
        {trigger ?? (
          <>
            <CalendarIcon />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={numberOfMonths}
          resetOnSelect
        />
        {children}
      </PopoverContent>
    </Popover>
  );
}

export { DateRangePicker };
