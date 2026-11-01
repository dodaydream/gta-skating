"use client";

import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DESKTOP_QUERY = "(min-width: 1024px)";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

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
    drawerTitle?: ReactNode;
    children?: ReactNode;
  }

function DateRangePicker({
    value,
    onChange,
    open = false,
    onOpenChange,
    numberOfMonths = 2,
    align = "start",
    variant = "outline",
    className,
    trigger,
    drawerTitle,
    children,
  }: DateRangePickerProps) {
    const isDesktop = useIsDesktop();

    const triggerContent = trigger ?? (
      <>
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
    );

    const title = drawerTitle ?? trigger ?? (
      value?.from ? (
        value.to ? (
          <>{format(value.from, "LLL dd, y")} - {format(value.to, "LLL dd, y")}</>
        ) : (
          format(value.from, "LLL dd, y")
        )
      ) : (
        "Select date range"
      )
    );

  const calendar = (
    <Calendar
      mode="range"
      defaultMonth={value?.from}
      selected={value}
      onSelect={onChange}
      numberOfMonths={isDesktop ? numberOfMonths : 1}
      resetOnSelect
    />
  );

  if (isDesktop) {
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
          {triggerContent}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          {calendar}
          {children}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        data-empty={!value?.from}
        className={cn(
          "justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
          className
        )}
        onClick={() => onOpenChange?.(true)}
      >
        {triggerContent}
      </Button>

      <Drawer
        open={open}
        onOpenChange={(next) => onOpenChange?.(next)}
        swipeDirection="down"
        showSwipeHandle
      >
        <DrawerContent
          className="lg:hidden [--drawer-height:auto]"
          header={
            <DrawerTitle className="px-6 pb-2 pt-1 text-center text-base">
              {title}
            </DrawerTitle>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
            <div className="flex justify-center px-2">{calendar}</div>
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export { DateRangePicker };
