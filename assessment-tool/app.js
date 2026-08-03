let LANG = "en", DATA = null, UI = null, WEIGHTS = null, DOMAIN_WEIGHTS = null;
let EXPERT_ID = null, CONFIG = null;
let currentLevels = {}, targetLevels = {};
let saveTimer = null;
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
  document.getElementById("langLink").textContent = t("lang_switch_label");
  document.getElementById("pageTitle").textContent = t("site_title");
  document.getElementById("pageSubtitle").textContent = t("assessment_subtitle");
  document.getElementById("instructionsHeading").textContent = t("instructions_heading");
  document.getElementById("instructionsText").textContent = t("instructions_text");
  document.getElementById("resultsHeading").textContent = t("results_heading");
  document.getElementById("overallCurrentLabel").textContent = t("overall_current_label");
  document.getElementById("overallTargetLabel").textContent = t("overall_target_label");
  document.getElementById("domainScoresHeading").textContent = t("domain_scores_heading");
  document.getElementById("summaryRadarHeading").textContent = t("summary_radar_heading");
  document.getElementById("downloadPdfBtn").textContent = t("download_pdf_button");
  document.getElementById("lockedNote").textContent = t("survey_locked_message");

  if (!WorkshopDB.isEnabled()) {
    document.getElementById("idStatusText").textContent = "Supabase is not configured yet (edit shared/database-config.js).";
    return;
  }

  CONFIG = await WorkshopDB.getConfig();
  await ensureExpertId();
  renderDomains();
  document.getElementById("submitBtn").addEventListener("click", onSubmit);
  document.getElementById("downloadPdfBtn").addEventListener("click", exportPdf);
  await loadExistingProgress();
  applyLockState();
  updateProgress();
}

async function ensureExpertId() {
  const stored = localStorage.getItem("workshop_expert_id");
  if (stored) {
    EXPERT_ID = stored;
  } else {
    document.getElementById("idStatusText").textContent = t("assigning_id");
    const row = await WorkshopDB.claimExpertId(CONFIG.max_experts || 15);
    if (!row) {
      document.getElementById("idStatusText").textContent = t("no_id_available");
      return;
    }
    EXPERT_ID = row.id;
    localStorage.setItem("workshop_expert_id", EXPERT_ID);
  }
  document.getElementById("idChip").textContent = EXPERT_ID;
  document.getElementById("idStatusText").textContent = t("your_id_label") + ": " + EXPERT_ID;
  document.getElementById("idNote").textContent = t("id_assigned_note");
  document.getElementById("mainContent").style.display = "block";
}

async function loadExistingProgress() {
  const expert = await WorkshopDB.getExpert(EXPERT_ID);
  if (!expert) return;
  currentLevels = expert.current_levels || {};
  targetLevels = expert.target_levels || {};
  Object.keys(currentLevels).forEach((code) => selectLevelUI(code, "current", currentLevels[code]));
  Object.keys(targetLevels).forEach((code) => selectLevelUI(code, "target", targetLevels[code]));
  if (expert.status === "submitted") {
    document.getElementById("submittedNote").style.display = "block";
    document.getElementById("submittedNote").textContent = t("submitted_note");
    document.getElementById("submitBtn").textContent = t("resubmit_button");
    showResults();
  } else {
    document.getElementById("submitBtn").textContent = t("submit_button");
  }
}

function applyLockState() {
  if (CONFIG && CONFIG.survey_locked) {
    document.getElementById("lockedNote").style.display = "block";
    document.querySelectorAll(".level-btn").forEach((b) => (b.disabled = true));
    document.getElementById("submitBtn").disabled = true;
  }
}

function renderDomains() {
  const container = document.getElementById("domainsContainer");
  container.innerHTML = "";
  DATA.domains.forEach((domain) => {
    const section = document.createElement("div");
    section.className = "domain-section";
    const header = document.createElement("div");
    header.className = "domain-header";
    header.style.background = domain.color;
    header.textContent = domain.name[LANG] || domain.name.en;
    section.appendChild(header);

    domain.indicators.forEach((code) => {
      const ind = DATA.indicators[code];
      const card = document.createElement("div");
      card.className = "indicator-card";
      card.innerHTML =
        '<span class="indicator-code">' + code + '</span>' +
        "<h4>" + (ind.name[LANG] || ind.name.en) + "</h4>" +
        '<p class="indicator-desc">' + (ind.description[LANG] || ind.description.en) + "</p>";

      ["current", "target"].forEach((kind) => {
        const row = document.createElement("div");
        row.className = "level-row";
        const label = document.createElement("div");
        label.className = "level-row-label";
        label.textContent = t(kind + "_label");
        row.appendChild(label);
        const opts = document.createElement("div");
        opts.className = "level-options";
        for (let lvl = 1; lvl <= 5; lvl++) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "level-btn " + kind;
          btn.dataset.code = code;
          btn.dataset.kind = kind;
          btn.dataset.level = lvl;
          const desc = (ind.levels[LANG] && ind.levels[LANG][lvl - 1]) || ind.levels.en[lvl - 1] || "";
          btn.innerHTML = "<b>" + "L" + lvl + "</b>" + desc.slice(0, 90) + (desc.length > 90 ? "…" : "");
          btn.title = desc;
          btn.addEventListener("click", () => onLevelClick(code, kind, lvl));
          opts.appendChild(btn);
        }
        row.appendChild(opts);
        card.appendChild(row);
      });
      section.appendChild(card);
    });
    container.appendChild(section);
  });
}

function selectLevelUI(code, kind, level) {
  document.querySelectorAll('.level-btn[data-code="' + code + '"][data-kind="' + kind + '"]').forEach((b) => {
    b.classList.toggle("selected", Number(b.dataset.level) === Number(level));
  });
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.style.display = "none"), 3200);
}

function onLevelClick(code, kind, level) {
  if (CONFIG && CONFIG.survey_locked) return;
  if (kind === "current") {
    const tgt = targetLevels[code];
    if (tgt !== undefined && level > tgt) {
      showToast(t("current_above_target"));
      return;
    }
    currentLevels[code] = level;
  } else {
    const cur = currentLevels[code];
    if (cur !== undefined && level < cur) {
      showToast(t("target_below_current"));
      return;
    }
    targetLevels[code] = level;
  }
  selectLevelUI(code, kind, level);
  updateProgress();
  scheduleSave();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    WorkshopDB.saveExpertProgress(EXPERT_ID, {
      status: "in_progress",
      current_levels: currentLevels,
      target_levels: targetLevels
    }).catch(() => {});
  }, 500);
}

function updateProgress() {
  const total = Object.keys(DATA.indicators).length * 2;
  const completed = Object.keys(currentLevels).length + Object.keys(targetLevels).length;
  document.getElementById("progressFill").style.width = Math.round((completed / total) * 100) + "%";
  document.getElementById("progressText").textContent = t("progress_text", { completed, total });
  const complete = completed === total;
  document.getElementById("submitBtn").disabled = complete ? (CONFIG && CONFIG.survey_locked) : true;
  document.getElementById("incompleteNote").style.display = complete ? "none" : "block";
  document.getElementById("incompleteNote").textContent = t("please_complete_all");
}

async function onSubmit() {
  await WorkshopDB.submitExpert(EXPERT_ID, currentLevels, targetLevels);
  document.getElementById("submittedNote").style.display = "block";
  document.getElementById("submittedNote").textContent = t("submitted_note");
  document.getElementById("submitBtn").textContent = t("resubmit_button");
  showResults();
}

function computeScores() {
  const wByCode = {};
  WEIGHTS.forEach((r) => (wByCode[r.indicator_code] = parseFloat(r.domain_weight)));
  const dW = {};
  DOMAIN_WEIGHTS.forEach((r) => (dW[r.domain] = parseFloat(r.weight)));
  const domainScores = {};
  DATA.domains.forEach((domain) => {
    let curSum = 0, tgtSum = 0, wSum = 0;
    domain.indicators.forEach((code) => {
      const w = wByCode[code] || 0;
      curSum += (currentLevels[code] || 0) * w;
      tgtSum += (targetLevels[code] || 0) * w;
      wSum += w;
    });
    domainScores[domain.id] = {
      current: wSum ? curSum / wSum : 0,
      target: wSum ? tgtSum / wSum : 0
    };
  });
  let overallCurrent = 0, overallTarget = 0;
  DATA.domains.forEach((domain) => {
    const w = dW[domain.id] || 0;
    overallCurrent += domainScores[domain.id].current * w;
    overallTarget += domainScores[domain.id].target * w;
  });
  return { domainScores, overallCurrent, overallTarget };
}

function levelNameForScore(score) {
  const idx = score < 2 ? 0 : score < 3 ? 1 : score < 4 ? 2 : score < 4.5 ? 3 : 4;
  return { name: DATA.levelNames[LANG][idx] || DATA.levelNames.en[idx], meaning: t("level_meaning_" + (idx + 1)) };
}

function showResults() {
  const { domainScores, overallCurrent, overallTarget } = computeScores();
  document.getElementById("resultsPanel").style.display = "block";
  document.getElementById("overallCurrentValue").textContent = overallCurrent.toFixed(2);
  document.getElementById("overallTargetValue").textContent = overallTarget.toFixed(2);
  document.getElementById("overallCurrentLevelName").textContent = levelNameForScore(overallCurrent).name;
  document.getElementById("overallTargetLevelName").textContent = levelNameForScore(overallTarget).name;

  const table = document.getElementById("domainScoresTable");
  let html = "<tr><th></th><th>" + t("current_label") + "</th><th>" + t("target_label") + "</th></tr>";
  DATA.domains.forEach((domain) => {
    const s = domainScores[domain.id];
    html += "<tr><td>" + (domain.name[LANG] || domain.name.en) + "</td><td>" + s.current.toFixed(2) + "</td><td>" + s.target.toFixed(2) + "</td></tr>";
  });
  table.innerHTML = html;

  renderDomainCharts(domainScores);
  renderSummaryChart(domainScores);
}

function renderDomainCharts() {
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
          { label: t("current_label"), data: labels.map((c) => currentLevels[c] || 0), borderColor: "#4472C4", backgroundColor: "rgba(68,114,196,0.2)" },
          { label: t("target_label"), data: labels.map((c) => targetLevels[c] || 0), borderColor: "#7030A0", backgroundColor: "rgba(112,48,160,0.15)" }
        ]
      },
      options: { scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 } } }, plugins: { legend: { position: "bottom" } } }
    });
  });
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

function exportPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;
  doc.setFontSize(16);
  doc.text(t("pdf_report_title"), margin, y); y += 22;
  doc.setFontSize(11);
  doc.text(t("pdf_expert_id") + ": " + EXPERT_ID, margin, y); y += 16;
  doc.text(t("pdf_date") + ": " + new Date().toLocaleString(), margin, y); y += 24;

  const summaryImg = summaryChart.toBase64Image();
  doc.addImage(summaryImg, "PNG", margin, y, 260, 260);
  y += 280;

  doc.setFontSize(9);
  DATA.domains.forEach((domain) => {
    if (y > 720) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.text(domain.name[LANG] || domain.name.en, margin, y); y += 14;
    doc.setFontSize(9);
    domain.indicators.forEach((code) => {
      const ind = DATA.indicators[code];
      const line = code + " " + (ind.name[LANG] || ind.name.en) + " — " + t("pdf_current") + ": " + (currentLevels[code] || "-") + "  " + t("pdf_target") + ": " + (targetLevels[code] || "-");
      doc.text(line, margin, y, { maxWidth: 500 }); y += 13;
    });
    y += 8;
  });

  doc.addPage();
  y = margin;
  Object.entries(domainCharts).forEach(([id, chart]) => {
    if (y > 560) { doc.addPage(); y = margin; }
    doc.addImage(chart.toBase64Image(), "PNG", margin, y, 240, 240);
    y += 260;
  });

  doc.save("maturity_assessment_" + EXPERT_ID + ".pdf");
}

init();
