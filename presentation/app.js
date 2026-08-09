let LANG = "en", DATA = null, UI = null, WEIGHTS = null, DOMAIN_WEIGHTS = null;
let domainCharts = {}, summaryChart = null;
const t = (key, vars) => WorkshopI18n.tFormat(UI, key, LANG, vars || {});

async function init() {
  LANG = WorkshopI18n.getLang();
  document.getElementById("langLink").href = WorkshopI18n.langUrl(LANG === "en" ? "zh" : "en");
  const { indicators, uiText } = await WorkshopI18n.loadWorkshopData();
  DATA = indicators; UI = uiText;
  WEIGHTS = await WorkshopI18n.parseCsv("../data/indicator_weights.csv");
  DOMAIN_WEIGHTS = await WorkshopI18n.parseCsv("../data/domain_weights.csv");

  document.documentElement.lang = LANG === "zh" ? "zh-Hant" : "en";
  document.title = t("site_title");
  document.getElementById("langLink").textContent = t("lang_switch_label");
  document.getElementById("pageTitle").textContent = t("site_title");
  document.getElementById("pageSubtitle").textContent = t("assessment_subtitle");
  document.getElementById("counterLabel").textContent = t("counter_label");
  document.getElementById("waitingHeading").textContent = t("waiting_heading");
  document.getElementById("waitingSubtext").textContent = t("waiting_subtext");
  document.getElementById("finalResultsHeading").textContent = t("final_results_heading");
  document.getElementById("overallCurrentLabel").textContent = t("overall_current_label");
  document.getElementById("overallTargetLabel").textContent = t("overall_target_label");
  document.getElementById("domainBreakdownHeading").textContent = t("domain_breakdown_heading");
  document.getElementById("meaningHeading").textContent = t("meaning_heading");

  if (!WorkshopDB.isEnabled()) {
    document.body.insertAdjacentHTML("afterbegin", '<div class="note warn" style="margin:20px;">Supabase is not configured yet (edit shared/database-config.js).</div>');
    return;
  }

  WorkshopDB.startPolling(({ experts, config }) => render(experts, config));
}

function render(experts, config) {
  const submitted = experts.filter((e) => e.status === "submitted");
  document.getElementById("countValue").textContent = submitted.length;
  document.getElementById("maxValue").textContent = config.max_experts || 15;

  if (!config.results_revealed) {
    document.getElementById("waitingView").style.display = "block";
    document.getElementById("resultsView").style.display = "none";
    return;
  }
  document.getElementById("waitingView").style.display = "none";
  document.getElementById("resultsView").style.display = "block";
  renderResults(submitted);
}

function levelNameForScore(score) {
  const idx = score < 2 ? 0 : score < 3 ? 1 : score < 4 ? 2 : score < 4.5 ? 3 : 4;
  return { name: DATA.levelNames[LANG][idx] || DATA.levelNames.en[idx], meaning: t("level_meaning_" + (idx + 1)) };
}

function meanFor(codes, kind, submitted) {
  const means = {};
  codes.forEach((code) => {
    let total = 0, n = 0;
    submitted.forEach((e) => {
      const v = (e[kind] || {})[code];
      if (v) { total += Number(v); n++; }
    });
    means[code] = n ? total / n : 0;
  });
  return means;
}

function renderResults(submitted) {
  const wByCode = {};
  WEIGHTS.forEach((r) => (wByCode[r.indicator_code] = parseFloat(r.domain_weight)));
  const dW = {};
  DOMAIN_WEIGHTS.forEach((r) => (dW[r.domain] = parseFloat(r.weight)));

  const allCodes = Object.keys(DATA.indicators);
  const curMeans = meanFor(allCodes, "current_levels", submitted);
  const tgtMeans = meanFor(allCodes, "target_levels", submitted);

  const domainScores = {};
  DATA.domains.forEach((domain) => {
    let curSum = 0, tgtSum = 0, wSum = 0;
    domain.indicators.forEach((code) => {
      const w = wByCode[code] || 0;
      curSum += curMeans[code] * w;
      tgtSum += tgtMeans[code] * w;
      wSum += w;
    });
    domainScores[domain.id] = { current: wSum ? curSum / wSum : 0, target: wSum ? tgtSum / wSum : 0 };
  });

  let overallCurrent = 0, overallTarget = 0;
  DATA.domains.forEach((domain) => {
    const w = dW[domain.id] || 0;
    overallCurrent += domainScores[domain.id].current * w;
    overallTarget += domainScores[domain.id].target * w;
  });

  document.getElementById("overallCurrentValue").textContent = overallCurrent.toFixed(2);
  document.getElementById("overallTargetValue").textContent = overallTarget.toFixed(2);
  document.getElementById("overallCurrentLevelName").textContent = levelNameForScore(overallCurrent).name;
  document.getElementById("overallTargetLevelName").textContent = levelNameForScore(overallTarget).name;
  document.getElementById("meaningText").textContent = levelNameForScore(overallCurrent).meaning;

  renderSummaryChart(domainScores);
  renderDomainCharts(curMeans, tgtMeans);
}

function renderSummaryChart(domainScores) {
  if (summaryChart) summaryChart.destroy();
  const canvas = document.getElementById("summaryRadarCanvas");
  const labels = DATA.domains.map((d) => d.name[LANG] || d.name.en);
  summaryChart = new Chart(canvas.getContext("2d"), {
    type: "radar",
    data: {
      labels,
      datasets: [
        { label: t("current_label"), data: DATA.domains.map((d) => domainScores[d.id].current), borderColor: "#4472C4", backgroundColor: "rgba(68,114,196,0.2)" },
        { label: t("target_label"), data: DATA.domains.map((d) => domainScores[d.id].target), borderColor: "#7030A0", backgroundColor: "rgba(112,48,160,0.15)" }
      ]
    },
    options: { scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 } } }, plugins: { legend: { position: "bottom" } } }
  });
}

function renderDomainCharts(curMeans, tgtMeans) {
  const grid = document.getElementById("domainChartsGrid");
  grid.innerHTML = "";
  Object.values(domainCharts).forEach((c) => c.destroy());
  domainCharts = {};
  DATA.domains.forEach((domain) => {
    const card = document.createElement("div");
    card.className = "chart-card";
    const h = document.createElement("h3");
    h.textContent = domain.name[LANG] || domain.name.en;
    const canvas = document.createElement("canvas");
    card.appendChild(h);
    card.appendChild(canvas);
    grid.appendChild(card);
    const labels = domain.indicators;
    domainCharts[domain.id] = new Chart(canvas.getContext("2d"), {
      type: "radar",
      data: {
        labels,
        datasets: [
          { label: t("current_label"), data: labels.map((c) => curMeans[c] || 0), borderColor: "#4472C4", backgroundColor: "rgba(68,114,196,0.2)" },
          { label: t("target_label"), data: labels.map((c) => tgtMeans[c] || 0), borderColor: "#7030A0", backgroundColor: "rgba(112,48,160,0.15)" }
        ]
      },
      options: { scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 } } }, plugins: { legend: { position: "bottom" } } }
    });
  });
}

init();
