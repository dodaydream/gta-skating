import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from "@/i18n/locales";

/**
 * Redirect to the visitor's stored or browser-preferred locale, before the
 * browser paints. GitHub Pages (a static export) has no server to issue a
 * redirect, so this must run client-side; running it as an inline script in the
 * initial HTML avoids the visible flash a post-hydration effect would cause.
 */
function redirectScript(): string {
  return `(function(){var locales=${JSON.stringify(
    SUPPORTED_LOCALES
  )};function match(t){var b=String(t||"").toLowerCase().split(/[-_]/)[0];return locales.indexOf(b)>=0?b:null}var locale=null;try{locale=match(localStorage.getItem(${JSON.stringify(
    LOCALE_STORAGE_KEY
  )}))}catch(e){}if(!locale){var langs=navigator.languages||[navigator.language];for(var i=0;i<langs.length;i++){var m=match(langs[i]);if(m){locale=m;break}}}if(!locale){locale=${JSON.stringify(
    DEFAULT_LOCALE
  )}}location.replace("/"+locale+location.search+location.hash)})();`;
}

/**
 * The locale-prefixed app lives at `/{lang}`, so the bare root has no page of
 * its own. Static export has no server to redirect, so this sends visitors to
 * their stored or browser-preferred locale on the client.
 */
export default function RootRedirect() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: redirectScript() }} />
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=/${DEFAULT_LOCALE}`} />
      </noscript>
    </>
  );
}
