// Shared i18n + data loading helpers for the maturity assessment workshop pages.
(function () {
  function getLang() {
    const params = new URLSearchParams(window.location.search);
    const l = params.get("lang");
    return l === "zh" ? "zh" : "en";
  }

  function langUrl(lang) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    return url.toString();
  }

  async function loadJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error("Failed to load " + path);
    return res.json();
  }

  async function loadWorkshopData() {
    const [indicators, uiText] = await Promise.all([
      loadJson("../data/indicators.json"),
      loadJson("../data/ui_text.json")
    ]);
    return { indicators, uiText };
  }

  function t(uiText, key, lang) {
    const entry = uiText[key];
    if (!entry) return key;
    return entry[lang] || entry.en || key;
  }

  function tFormat(uiText, key, lang, vars) {
    let s = t(uiText, key, lang);
    Object.keys(vars || {}).forEach((k) => {
      s = s.replace("{" + k + "}", vars[k]);
    });
    return s;
  }

  async function parseCsv(path) {
    const res = await fetch(path);
    const text = await res.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");
    return lines.slice(1).filter(Boolean).map((line) => {
      const cells = line.split(",");
      const row = {};
      headers.forEach((h, i) => (row[h.trim()] = cells[i] !== undefined ? cells[i].trim() : ""));
      return row;
    });
  }

  window.WorkshopI18n = { getLang, langUrl, loadJson, loadWorkshopData, t, tFormat, parseCsv };
})();
