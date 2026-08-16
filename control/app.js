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
  document.getElementById("validationCompletedLabel").textContent = t("validation_completed_label");
  document.getElementById("maxExpertsLabel").textContent = t("max_experts_label");
  document.getElementById("saveMaxBtn").textContent = t("save_button");
  document.getElementById("lockLabel").textContent = t("lock_survey_label");
  document.getElementById("resetAllBtn").textContent = t("reset_all_button");
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
  document.getElementById("resetAllBtn").addEventListener("click", async () => {
    if (!confirm(t("reset_all_confirm"))) return;
    try {
      await WorkshopDB.deleteAllExperts();
      await WorkshopDB.updateConfig({ results_revealed: false, survey_locked: false });
    } catch (e) {
      alert("Delete failed: " + e.message + "\nMake sure the 'experts delete' RLS policy exists in Supabase (see README.md).");
    }
    render(await WorkshopDB.listExperts(), await WorkshopDB.getConfig());
  });

  WorkshopDB.startPolling(({ experts, config }) => render(experts, config));
}

function render(experts, config) {
  document.getElementById("submittedCount").textContent = experts.filter((e) => e.status === "submitted").length;
  document.getElementById("validationCompletedCount").textContent = experts.filter((e) => e.validation_status === "submitted").length;
  document.getElementById("maxCount").textContent = config.max_experts || 15;
  document.getElementById("validationMaxCount").textContent = config.max_experts || 15;
  document.getElementById("maxExpertsInput").value = config.max_experts || 15;
  document.getElementById("lockToggle").checked = !!config.survey_locked;
  document.getElementById("revealStatusLabel").textContent = config.results_revealed ? t("revealed_status") : t("not_revealed_status");
  document.getElementById("revealBtn").textContent = config.results_revealed ? t("hide_button") : t("reveal_button");

  const statusKey = { unassigned: "status_unassigned", in_progress: "status_in_progress", submitted: "status_submitted" };
  const validationStatusKey = { not_started: "validation_status_not_started", in_progress: "validation_status_in_progress", submitted: "validation_status_submitted" };
  const locale = LANG === "zh" ? "zh-TW" : "en-GB";
  let rows = "<tr><th>ID</th><th>" + t("expert_status_heading") + "</th><th>" + t("validation_status_heading") + "</th><th>" + t("validation_time_heading") + "</th><th>" + t("consent_status_heading") + "</th><th>" + t("consent_time_heading") + "</th><th>" + t("updated_time_heading") + "</th><th>" + t("actions_heading") + "</th></tr>";
  experts.forEach((e) => {
    const consented = e.consent_given === true;
    const consentClass = consented ? "status-consented" : "status-not-consented";
    const consentLabel = consented ? t("consent_yes") : t("consent_no");
    const consentTime = e.consented_at ? new Date(e.consented_at).toLocaleString(locale) : "—";
    const validationStatus = e.validation_status || "not_started";
    const validationTime = e.validation_submitted_at ? new Date(e.validation_submitted_at).toLocaleString(locale) : "—";
    const updatedTime = e.updated_at ? new Date(e.updated_at).toLocaleString(locale) : "—";
    rows += "<tr><td>" + e.id + "</td><td><span class='pill status-" + e.status + "'>" + t(statusKey[e.status] || "status_in_progress") + "</span></td><td><span class='pill validation-status-" + validationStatus + "'>" + t(validationStatusKey[validationStatus] || "validation_status_not_started") + "</span></td><td>" + validationTime + "</td><td><span class='pill " + consentClass + "'>" + consentLabel + "</span></td><td>" + consentTime + "</td><td>" + updatedTime + "</td><td><button class='secondary' data-remove='" + e.id + "' style='padding:4px 10px; font-size:12px;'>" + t("delete_expert_button") + "</button></td></tr>";
  });
  document.getElementById("expertsTable").innerHTML = rows;
  document.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm(t("delete_expert_confirm"))) return;
      try {
        await WorkshopDB.deleteExpert(btn.dataset.remove);
      } catch (e) {
        alert("Delete failed: " + e.message + "\nMake sure the 'experts delete' RLS policy exists in Supabase (see README.md).");
      }
      render(await WorkshopDB.listExperts(), await WorkshopDB.getConfig());
    });
  });

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
