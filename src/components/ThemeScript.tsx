// Applied before paint so the stored theme (or the system preference) is set
// without a flash of the wrong colours.
const themeScript = `(function(){try{var s=localStorage.getItem("gta-skating-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
