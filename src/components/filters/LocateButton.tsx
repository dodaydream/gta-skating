"use client";

import { useTranslation } from "react-i18next";
import { IconLocation } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { useSkatingAppData } from "@/components/SkatingAppDataProvider";

export function LocateButton() {
  const { t } = useTranslation();
  const { locateRef } = useSkatingAppData();

  return (
    <Button
      variant="secondary"
      size="icon-lg"
      className="shadow-xs"
      onClick={() => {
        trackEvent("locate_me");
        locateRef.current?.();
      }}
      title={t("filters.locate")}
    >
      <IconLocation className="size-4" />
    </Button>
  );
}
