import { GoogleAnalytics } from "@next/third-parties/google";

/** Google Analytics tag shared by every root layout. */
export function SiteScripts() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return <>{gaId ? <GoogleAnalytics gaId={gaId} /> : null}</>;
}
