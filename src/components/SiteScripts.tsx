import { GoogleAnalytics } from "@next/third-parties/google";

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/** AdSense + Google Analytics tags shared by every root layout. */
export function SiteScripts() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <>
      {adsenseClient ? (
        <script
          async
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
        />
      ) : null}
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </>
  );
}
