"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/** Records 404 views (attempted path + referrer) so broken links can be traced. */
export function NotFoundTracker() {
  useEffect(() => {
    trackEvent("page_not_found", {
      path: window.location.pathname,
      referrer: document.referrer,
    });
  }, []);

  return null;
}
