let LANG = "en", DATA = null, UI = null, WEIGHTS = null, DOMAIN_WEIGHTS = null;
const t = (key, vars) => WorkshopI18n.tFormat(UI, key, LANG, vars || {});

async function init() {
  LANG = WorkshopI18n.getLang();
  document.getElementById("langLink").href = WorkshopI18n.langUrl(LANG === "en" ? "zh" : "en");
  const { indicators, uiText } = await WorkshopI18n.loadWorkshopData();
  DATA = indicators; UI = uiText;
  WEIGHTS = await WorkshopI18n.parseCsv("../data/indicator_weights.csv");
  DOMAIN_WEIGHTS = await WorkshopI18n.parseCsv("../data/domain_weights.csv");

  document.getElementById("langLink").textContent = t("lang_switch_label");
  document.getElementById("pageTitle").textContent = t("control_title");
  document.getElementById("submittedLabel").textContent = t("submissions_label");
  document.getElementById("maxExpertsLabel").textContent = t("max_experts_label");
  document.getElementById("saveMaxBtn").textContent = t("save_button");
  document.getElementById("lockLabel").textContent = t("lock_survey_label");
  document.getElementById("liveTableHeading").textContent = t("live_table_heading");
  document.getElementById("liveAveragesHeading").textContent = t("live_averages_heading");

  if (!WorkshopDB.isEnabled()) {
    document.body.insertAdjacentHTML("afterbegin", '<div class="note warn" style="margin:20px;">Supabase is not configured yet (edit shared/database-config.js).</div>');
    return;
  }

  document.getElementById("saveMaxBtn").addEventListener("click", async () => {
    const val = parseInt(document.getElementById("maxExpertsInput").value, 10) || 15;
    await WorkshopDB.updateConfig({ max_experts: val });
  });
  document.getElementById("lockToggle").addEventListener("change", async (e) => {
    await WorkshopDB.updateConfig({ survey_locked: e.target.checked });
  });
  document.getElementById("revealBtn").addEventListener("click", async () => {
    const cfg = await WorkshopDB.getConfig();
    await WorkshopDB.updateConfig({ results_revealed: !cfg.results_revealed });
    render(await WorkshopDB.listExperts(), await WorkshopDB.getConfig());
  });

  WorkshopDB.startPolling(({ experts, config }) => render(experts, config));
}

function render(experts, config) {
  document.getElementById("submittedCount").textContent = experts.filter((e) => e.status === "submitted").length;
  document.getElementById("maxCount").textContent = config.max_experts || 15;
  document.getElementById("maxExpertsInput").value = config.max_experts || 15;
  document.getElementById("lockToggle").checked = !!config.survey_locked;
  document.getElementById("revealStatusLabel").textContent = config.results_revealed ? t("revealed_status") : t("not_revealed_status");
  document.getElementById("revealBtn").textContent = config.results_revealed ? t("hide_button") : t("reveal_button");

  const statusKey = { unassigned: "status_unassigned", in_progress: "status_in_progress", submitted: "status_submitted" };
  let rows = "<tr><th>ID</th><th></th><th></th></tr>";
  experts.forEach((e) => {
    rows += "<tr><td>" + e.id + "</td><td><span class='pill status-" + e.status + "'>" + t(statusKey[e.status] || "status_in_progress") + "</span></td><td>" + (e.updated_at ? new Date(e.updated_at).toLocaleTimeString() : "") + "</td></tr>";
  });
  document.getElementById("expertsTable").innerHTML = rows;

  renderAverages(experts.filter((e) => e.status === "submitted"));
}

function renderAverages(submitted) {
  const wByCode = {};
  WEIGHTS.forEach((r) => (wByCode[r.indicator_code] = parseFloat(r.domain_weight)));
  const table = document.getElementById("averagesTable");
  if (!submitted.length) {
    table.innerHTML = "<tr><td>—</td></tr>";
    return;
  }
  let html = "<tr><th>" + t("live_averages_heading") + "</th><th>" + t("current_label") + "</th><th>" + t("target_label") + "</th></tr>";
  DATA.domains.forEach((domain) => {
    let curSum = 0, tgtSum = 0, wSum = 0;
    domain.indicators.forEach((code) => {
      const w = wByCode[code] || 0;
      let curTotal = 0, tgtTotal = 0, n = 0;
      submitted.forEach((e) => {
        if (e.current_levels && e.current_levels[code]) { curTotal += Number(e.current_levels[code]); n++; }
        if (e.target_levels && e.target_levels[code]) tgtTotal += Number(e.target_levels[code]);
      });
      if (n) {
        curSum += (curTotal / n) * w;
        tgtSum += (tgtTotal / n) * w;
        wSum += w;
      }
    });
    html += "<tr><td>" + (domain.name[LANG] || domain.name.en) + "</td><td>" + (wSum ? (curSum / wSum).toFixed(2) : "-") + "</td><td>" + (wSum ? (tgtSum / wSum).toFixed(2) : "-") + "</td></tr>";
  });
  table.innerHTML = html;
}

init();
