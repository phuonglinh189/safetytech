let LANG = "en", DATA = null, UI = null, WEIGHTS = null, DOMAIN_WEIGHTS = null;
let EXPERT_ID = null, CONFIG = null;
let CONSENT_VERSION = null, ACCEPTANCE = null;
let currentLevels = {}, targetLevels = {};
let saveTimer = null;
let saveQueue = Promise.resolve();
let hasSubmitted = false;
let validationSubmitted = false;
let saveErrorShown = false;
let domainCharts = {}, summaryChart = null;
let pdfFontBase64Promise = null;

const PDF_FONT_FILE = "NotoSansTC-PDF.ttf";

const t = (key, vars) => WorkshopI18n.tFormat(UI, key, LANG, vars || {});

async function init() {
  LANG = WorkshopI18n.getLang();
  const consentText = await WorkshopI18n.loadJson("../data/consent_text.json");
  CONSENT_VERSION = consentText.version;
  ACCEPTANCE = WorkshopConsent.getAccepted(CONSENT_VERSION);
  if (!ACCEPTANCE) {
    redirectToConsent();
    return;
  }
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
  document.getElementById("instructionsHeading").textContent = t("instructions_heading");
  [
    ["instructionWhatTitle", "instruction_what_title"],
    ["instructionWhatText", "instruction_what_text"],
    ["instructionRankTitle", "instruction_rank_title"],
    ["instructionRankText", "instruction_rank_text"],
    ["instructionLevel1", "instruction_level_1"],
    ["instructionLevel2", "instruction_level_2"],
    ["instructionLevel3", "instruction_level_3"],
    ["instructionLevel4", "instruction_level_4"],
    ["instructionLevel5", "instruction_level_5"],
    ["instructionGetTitle", "instruction_get_title"],
    ["instructionGetText", "instruction_get_text"],
    ["instructionResultOverall", "instruction_result_overall"],
    ["instructionResultCategory", "instruction_result_category"],
    ["instructionResultCharts", "instruction_result_charts"],
    ["instructionResultPdf", "instruction_result_pdf"],
    ["instructionMeaningTitle", "instruction_meaning_title"],
    ["instructionMeaningText", "instruction_meaning_text"],
    ["instructionExpectedTime", "instruction_expected_time"]
  ].forEach(([id, key]) => {
    document.getElementById(id).textContent = t(key);
  });
  document.getElementById("resultsHeading").textContent = t("results_heading");
  document.getElementById("overallCurrentLabel").textContent = t("overall_current_label");
  document.getElementById("overallTargetLabel").textContent = t("overall_target_label");
  document.getElementById("domainScoresHeading").textContent = t("domain_scores_heading");
  document.getElementById("summaryRadarHeading").textContent = t("summary_radar_heading");
  document.getElementById("downloadPdfBtn").textContent = t("download_pdf_button");
  document.getElementById("validationNextNote").textContent = t("validation_next_note");
  document.getElementById("lockedNote").textContent = t("survey_locked_message");

  if (!WorkshopDB.isEnabled()) {
    document.getElementById("idStatusText").textContent = "Supabase is not configured yet (edit shared/database-config.js).";
    return;
  }

  CONFIG = await WorkshopDB.getConfig();
  const expert = await ensureExpertId();
  if (!expert) return;
  renderDomains();
  document.getElementById("submitBtn").addEventListener("click", onSubmit);
  document.getElementById("downloadPdfBtn").addEventListener("click", exportPdf);
  document.getElementById("continueValidationBtn").addEventListener("click", continueToValidation);
  await loadExistingProgress(expert);
  applyLockState();
  updateProgress();
}

async function ensureExpertId() {
  const stored = ACCEPTANCE && ACCEPTANCE.expertId;
  if (!stored) {
    redirectToConsent();
    return null;
  }
  const row = await WorkshopDB.getExpert(stored);
  if (!row || row.consent_given !== true || row.consent_version !== CONSENT_VERSION) {
    if (!row) WorkshopConsent.clearExpertId();
    redirectToConsent();
    return null;
  }
  EXPERT_ID = row.id;
  localStorage.setItem("workshop_expert_id", EXPERT_ID);
  document.getElementById("idChip").textContent = EXPERT_ID;
  document.getElementById("idStatusText").textContent = t("your_id_label") + ": " + EXPERT_ID;
  document.getElementById("idNote").textContent = t("id_assigned_note");
  document.getElementById("mainContent").style.display = "block";
  return row;
}

function redirectToConsent() {
  window.location.replace(WorkshopConsent.withLanguage("../consent/", LANG));
}

async function loadExistingProgress(existingExpert) {
  const expert = existingExpert || await WorkshopDB.getExpert(EXPERT_ID);
  if (!expert) return;
  currentLevels = expert.current_levels || {};
  targetLevels = expert.target_levels || {};
  Object.keys(currentLevels).forEach((code) => selectLevelUI(code, "current", currentLevels[code]));
  Object.keys(targetLevels).forEach((code) => selectLevelUI(code, "target", targetLevels[code]));
  if (expert.status === "submitted") {
    hasSubmitted = true;
    validationSubmitted = expert.validation_status === "submitted";
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
      card.style.setProperty("--domain-color", domain.color);
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
          const levelName = document.createElement("b");
          levelName.textContent = "L" + lvl;
          const levelDescription = document.createElement("span");
          levelDescription.className = "level-description";
          levelDescription.textContent = desc;
          btn.appendChild(levelName);
          btn.appendChild(levelDescription);
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
    saveTimer = null;
    const snapshot = {
      status: hasSubmitted ? "submitted" : "in_progress",
      current_levels: Object.assign({}, currentLevels),
      target_levels: Object.assign({}, targetLevels)
    };
    saveQueue = saveQueue.catch(() => {}).then(() => WorkshopDB.saveExpertProgress(EXPERT_ID, snapshot));
    saveQueue.then(() => {
      if (saveErrorShown) {
        saveErrorShown = false;
        const idNote = document.getElementById("idNote");
        idNote.classList.remove("warn");
        idNote.textContent = t("id_assigned_note");
      }
    }).catch((error) => showSaveError("autosave_failed", error));
  }, 500);
}

function showSaveError(key, error) {
  console.error(error);
  saveErrorShown = true;
  const idNote = document.getElementById("idNote");
  idNote.classList.add("warn");
  idNote.textContent = t(key);
  showToast(t(key));
}

function updateProgress() {
  const indicatorCodes = Object.keys(DATA.indicators);
  const total = indicatorCodes.length;
  const completed = indicatorCodes.filter((code) => (
    currentLevels[code] !== undefined && targetLevels[code] !== undefined
  )).length;
  const percent = Math.round((completed / total) * 100);
  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressText").textContent = t("progress_text", { completed, total });
  const progressBar = document.getElementById("progressBar");
  progressBar.setAttribute("aria-valuemax", total);
  progressBar.setAttribute("aria-valuenow", completed);
  progressBar.setAttribute("aria-valuetext", t("progress_text", { completed, total }));
  const complete = completed === total;
  document.getElementById("submitBtn").disabled = complete ? (CONFIG && CONFIG.survey_locked) : true;
  document.getElementById("incompleteNote").style.display = complete ? "none" : "block";
  document.getElementById("incompleteNote").textContent = t("please_complete_all");
}

async function onSubmit() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = t("submitting_button");
  try {
    await saveQueue.catch(() => {});
    await WorkshopDB.submitExpert(
      EXPERT_ID,
      Object.assign({}, currentLevels),
      Object.assign({}, targetLevels)
    );
    hasSubmitted = true;
    saveErrorShown = false;
    const idNote = document.getElementById("idNote");
    idNote.classList.remove("warn");
    idNote.textContent = t("id_assigned_note");
    const submittedNote = document.getElementById("submittedNote");
    submittedNote.classList.remove("warn");
    submittedNote.style.display = "block";
    submittedNote.textContent = t("submitted_note");
    submitBtn.textContent = t("resubmit_button");
    showResults();
  } catch (error) {
    console.error(error);
    const submittedNote = document.getElementById("submittedNote");
    submittedNote.classList.add("warn");
    submittedNote.style.display = "block";
    submittedNote.textContent = t("submit_failed");
    showToast(t("submit_failed"));
    submitBtn.textContent = hasSubmitted ? t("resubmit_button") : t("submit_button");
  } finally {
    updateProgress();
  }
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
  document.getElementById("continueValidationBtn").textContent = t(validationSubmitted ? "view_validation_button" : "continue_validation_button");
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

function continueToValidation() {
  window.location.assign(WorkshopConsent.withLanguage("../validation/", LANG));
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
    options: {
      layout: { padding: { top: 10, right: 50, bottom: 10, left: 50 } },
      scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 } } },
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function loadPdfFontBase64() {
  if (!pdfFontBase64Promise) {
    pdfFontBase64Promise = fetch("../shared/assets/" + PDF_FONT_FILE)
      .then((response) => {
        if (!response.ok) throw new Error("PDF font request failed: " + response.status);
        return response.arrayBuffer();
      })
      .then(arrayBufferToBase64)
      .catch((error) => {
        pdfFontBase64Promise = null;
        throw error;
      });
  }
  return pdfFontBase64Promise;
}

async function applyPdfFont(doc) {
  const fontBase64 = await loadPdfFontBase64();
  doc.addFileToVFS(PDF_FONT_FILE, fontBase64);
  doc.addFont(PDF_FONT_FILE, "NotoSansTC", "normal");
  doc.setFont("NotoSansTC", "normal");
}

async function exportPdf() {
  const button = document.getElementById("downloadPdfBtn");
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = t("pdf_preparing");

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    if (LANG === "zh") await applyPdfFont(doc);

    const margin = 36;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    doc.setFontSize(16);
    doc.text(t("pdf_report_title"), margin, y); y += 22;
    doc.setFontSize(11);
    doc.text(t("pdf_expert_id") + ": " + EXPERT_ID, margin, y); y += 16;
    const dateLocale = LANG === "zh" ? "zh-TW" : "en-GB";
    doc.text(t("pdf_date") + ": " + new Date().toLocaleString(dateLocale), margin, y); y += 24;

    const summaryImg = summaryChart.toBase64Image();
    const summarySize = Math.min(390, contentWidth);
    const summaryX = (pageWidth - summarySize) / 2;
    doc.addImage(summaryImg, "PNG", summaryX, y + 10, summarySize, summarySize);

    doc.addPage();
    const columnGap = 18;
    const rowGap = 24;
    const titleHeight = 18;
    const cellWidth = (contentWidth - columnGap) / 2;
    const chartSize = Math.min(240, cellWidth - 8);
    const rowHeight = titleHeight + chartSize + rowGap;

    Object.entries(domainCharts).forEach(([domainId, chart], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const cellX = margin + column * (cellWidth + columnGap);
      const cellY = margin + row * rowHeight;
      const chartX = cellX + (cellWidth - chartSize) / 2;
      const domain = DATA.domains.find((item) => item.id === domainId);

      if (domain) {
        doc.setFontSize(11);
        doc.text(domain.name[LANG] || domain.name.en, cellX + cellWidth / 2, cellY + 11, {
          align: "center",
          maxWidth: cellWidth - 8
        });
      }
      doc.addImage(chart.toBase64Image(), "PNG", chartX, cellY + titleHeight, chartSize, chartSize);
    });

    doc.save("maturity_assessment_" + EXPERT_ID + ".pdf");
  } catch (error) {
    console.error("PDF export failed", error);
    showToast(t("pdf_export_error"));
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

init();
