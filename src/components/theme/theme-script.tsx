const themeScript = `
(function () {
  try {
    var storageKey = "muhasebe-theme";
    var preference = localStorage.getItem(storageKey) || "system";
    if (preference !== "light" && preference !== "dark" && preference !== "system") {
      preference = "system";
    }
    var systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = preference === "system" ? (systemDark ? "dark" : "light") : preference;
    var root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.themePreference = preference;
    root.classList.toggle("dark", theme === "dark");
  } catch (_) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.themePreference = "system";
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
