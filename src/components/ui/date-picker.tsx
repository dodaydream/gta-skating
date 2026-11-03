"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import type { DateRange } from "react-day-picker";
import { enCA, frCA } from "react-day-picker/locale";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { normalizeLocale } from "@/i18n/config";
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

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => true);
}

interface DateRangePickerProps {
value?: DateRange;
    onChange?: (range: DateRange | undefined) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    numberOfMonths?: number;
    max?: number;
    align?: "start" | "center" | "end";
    variant?: React.ComponentProps<typeof Button>["variant"];
    size?: React.ComponentProps<typeof Button>["size"];
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
    max,
    align = "start",
    variant = "outline",
    size = "default",
    className,
    trigger,
    drawerTitle,
    children,
  }: DateRangePickerProps) {
    const { t, i18n } = useTranslation();
    const locale = normalizeLocale(i18n.resolvedLanguage);
    const dateLocale = locale === "fr" ? frCA : enCA;
    const valueFormat = locale === "fr" ? "d LLL y" : "LLL dd, y";
    const isDesktop = useIsDesktop();

    const triggerContent = trigger ?? (
      <>
        {value?.from ? (
          value.to ? (
            <>
              {format(value.from, valueFormat, { locale: dateLocale })} -{" "}
              {format(value.to, valueFormat, { locale: dateLocale })}
            </>
          ) : (
            format(value.from, valueFormat, { locale: dateLocale })
          )
        ) : (
          <span>{t("filters.pickDate")}</span>
        )}
      </>
    );

    const title = drawerTitle ?? trigger ?? (
      value?.from ? (
        value.to ? (
          <>
            {format(value.from, valueFormat, { locale: dateLocale })} -{" "}
            {format(value.to, valueFormat, { locale: dateLocale })}
          </>
        ) : (
          format(value.from, valueFormat, { locale: dateLocale })
        )
      ) : (
        t("filters.selectDateRange")
      )
    );

  const calendar = (
    <Calendar
      mode="range"
      defaultMonth={value?.from}
      selected={value}
      onSelect={onChange}
      numberOfMonths={isDesktop ? numberOfMonths : 1}
      max={max}
      locale={dateLocale}
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
              size={size}
              data-empty={!value?.from}
              className={cn(
                "justify-center text-center font-normal data-[empty=true]:text-muted-foreground lg:justify-start lg:text-left",
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
        size={size}
        data-empty={!value?.from}
        className={cn(
          "justify-center text-center font-normal data-[empty=true]:text-muted-foreground lg:justify-start lg:text-left",
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
