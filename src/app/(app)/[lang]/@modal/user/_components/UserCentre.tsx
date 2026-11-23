"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { cn } from "cn";
import { useIsDesktop } from "@/hooks/useIsDesktop";
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
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import { useSkatingAppData } from "@/app/(app)/[lang]/_components/SkatingAppDataProvider";
import { useLocale } from "@/i18n/LocaleProvider";
import { getVenueBySlug } from "@/data/venue-meta";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import {
  IconInfoCircle,
  IconStarFilled,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";

const SNAP_POINTS = [0.9];

const GROUP_CLASS =
  "divide-y divide-border overflow-hidden rounded-lg border border-border";

const SECTION_TITLE_CLASS =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

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
        "flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent bg-secondary text-secondary-foreground transition-colors hover:text-foreground",
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
  children,
}: {
  isDesktop: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const body = (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain isolate">
      {children}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[85dvh] flex-col overflow-hidden p-0"
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
      <DrawerContent className="data-expanded:shadow-[0_-4px_24px_rgba(0,0,0,0.12)] [&>[data-slot=drawer-content]]:rounded-none">
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
      className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-muted hover:text-foreground"
    >
      <IconX className="h-5 w-5" />
    </button>
  );
}

function FavoriteVenueItem({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const venue = getVenueBySlug(slug);
  if (!venue) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Link href={`/${locale}/venue/${slug}`} className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {venue.name}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {venue.address}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggleFavorite(slug)}
        aria-label={t("user.remove")}
        title={t("user.remove")}
        className="rounded-lg p-1.5 text-amber-500 transition-colors hover:bg-zinc-100 hover:text-amber-600 dark:hover:bg-zinc-800 dark:hover:text-amber-400"
      >
        <IconStarFilled className="size-4" />
      </button>
    </div>
  );
}

function FavouritesSection() {
  const { t } = useTranslation();
  const favorites = useFavorites();

  return (
    <section className="px-5 pt-4">
      <h3 className={cn(SECTION_TITLE_CLASS, "pb-2")}>
        {t("user.sectionTitle")}
      </h3>
      {favorites.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t("user.noFavorites")}
        </p>
      ) : (
        <div className={GROUP_CLASS}>
          {favorites.map((slug) => (
            <FavoriteVenueItem key={slug} slug={slug} />
          ))}
        </div>
      )}
    </section>
  );
}

function SettingsSection() {
  const { t } = useTranslation();
  return (
    <section className="px-5 pt-5">
      <h3 className={cn(SECTION_TITLE_CLASS, "pb-2")}>
        {t("user.settings")}
      </h3>
      <div className={GROUP_CLASS}>
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="text-sm text-foreground">
            {t("language.label")}
          </span>
          <LanguageToggle />
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="text-sm text-foreground">
            {t("user.appearance")}
          </span>
          <ThemeToggle />
        </div>
      </div>
    </section>
  );
}

export function UserCentre() {
  const { t } = useTranslation();
  const { closeUser } = useSkatingAppData();
  const isDesktop = useIsDesktop();

  return (
    <Panel isDesktop={isDesktop} onClose={closeUser}>
      <div className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-3 bg-popover px-5">
        <PanelTitle isDesktop={isDesktop} className="text-base">
          {t("user.title")}
        </PanelTitle>
        <CloseButton onClick={closeUser} />
      </div>
      <PanelDescription isDesktop={isDesktop} className="sr-only">
        {t("user.description")}
      </PanelDescription>
      <div className="flex flex-1 flex-col">
        <FavouritesSection />
        <SettingsSection />
        <p className="mt-auto flex items-start gap-1.5 px-5 py-4 text-xs text-muted-foreground">
          <IconInfoCircle className="mt-px size-3.5 shrink-0" />
          <span>{t("user.localNote")}</span>
        </p>
      </div>
    </Panel>
  );
}
