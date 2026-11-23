"use client";

import { useTranslation } from "react-i18next";
import { IconLocation } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { useSkatingAppData } from "@/app/(app)/[lang]/_components/SkatingAppDataProvider";

export function LocateButton() {
  const { t } = useTranslation();
  const { locateRef } = useSkatingAppData();

  return (
    <Button
      variant="outline"
      size="icon-lg"
      className="shadow-xs"
      onClick={() => {
        trackEvent("locate_me");
        locateRef.current?.();
      }}
      aria-label={t("filters.locate")}
      title={t("filters.locate")}
    >
      <IconLocation />
    </Button>
  );
}
