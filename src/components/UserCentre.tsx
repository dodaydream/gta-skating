"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { WeekView } from "@/components/schedule/WeekView";
import { fetchPrograms } from "@/api/programs";
import { useFavorites } from "@/lib/favorites";
import type { ProgramItem } from "@/types/schedule";
import { IconUserCircle, IconX } from "@tabler/icons-react";

const DESKTOP_QUERY = "(min-width: 1024px)";

const SNAP_POINTS = [0.5, 0.9];

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

export function UserAvatarButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("user.open")}
      title={t("user.open")}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent bg-secondary text-secondary-foreground transition-colors hover:text-black dark:hover:text-zinc-50",
        className
      )}
    >
      <IconUserCircle className="size-5" />
    </button>
  );
}

function Panel({
  isDesktop,
  onClose,
  bodyRef,
  children,
}: {
  isDesktop: boolean;
  onClose: () => void;
  bodyRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const body = (
    <div
      ref={bodyRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain isolate"
    >
      {children}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[85dvh] flex-col overflow-hidden p-0"
          style={{ maxWidth: "28rem" }}
        >
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open
      modal
      swipeDirection="down"
      showSwipeHandle
      snapToSequentialPoints
      snapPoints={SNAP_POINTS}
      onOpenChange={(open) => !open && onClose()}
    >
      <DrawerContent
        className="data-expanded:shadow-[0_-4px_24px_rgba(0,0,0,0.12)] [&>[data-slot=drawer-content]]:rounded-none"
      >
        {body}
      </DrawerContent>
    </Drawer>
  );
}

function PanelTitle({
  isDesktop,
  className,
  children,
}: {
  isDesktop: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (isDesktop) {
    return <DialogTitle className={className}>{children}</DialogTitle>;
  }
  return <DrawerTitle className={className}>{children}</DrawerTitle>;
}

function PanelDescription({
  isDesktop,
  className,
  children,
}: {
  isDesktop: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (isDesktop) {
    return <DialogDescription className={className}>{children}</DialogDescription>;
  }
  return <DrawerDescription className={className}>{children}</DrawerDescription>;
}

function CloseButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("close")}
      className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
    >
      <IconX className="h-5 w-5" />
    </button>
  );
}

function UserCentrePrograms({
  bodyRef,
}: {
  bodyRef: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation();
  const favorites = useFavorites();
  const [items, setItems] = useState<ProgramItem[] | null>(null);

  useEffect(() => {
    if (favorites.length === 0) return;
    let cancelled = false;
    const from = `${dayjs().startOf("month").format("YYYY-MM-DD")}T00:00`;
    const to = `${dayjs()
      .add(3, "month")
      .endOf("month")
      .format("YYYY-MM-DD")}T23:59`;
    fetchPrograms({
      from,
      to,
      hideEmpty: true,
      favoritesOnly: true,
      favoriteSlugs: favorites,
    })
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [favorites]);

  if (favorites.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {t("user.noFavorites")}
      </p>
    );
  }

  if (items === null) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {t("user.loading")}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {t("user.noPrograms")}
      </p>
    );
  }

  return (
    <div className="flex flex-col px-5">
      <WeekView
        programs={items}
        timezone={items[0].venue.timezone}
        bodyRef={bodyRef}
        showVenue
      />
    </div>
  );
}

export function UserCentre({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const bodyRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  return (
    <Panel isDesktop={isDesktop} onClose={onClose} bodyRef={bodyRef}>
      <div className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-3 bg-popover px-5">
        <PanelTitle isDesktop={isDesktop} className="text-base">
          {t("user.title")}
        </PanelTitle>
        <CloseButton onClick={onClose} />
      </div>
      <PanelDescription isDesktop={isDesktop} className="sr-only">
        {t("user.description")}
      </PanelDescription>
      <UserCentrePrograms bodyRef={bodyRef} />
    </Panel>
  );
}
