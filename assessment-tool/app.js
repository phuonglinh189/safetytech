let LANG = "en", DATA = null, UI = null, WEIGHTS = null, DOMAIN_WEIGHTS = null;
let PROFILE_DATA = null, RECOMMENDATIONS = null;
let EXPERT_ID = null, CONFIG = null;
let CONSENT_VERSION = null, ACCEPTANCE = null;
let currentLevels = {}, targetLevels = {};
let organizationProfile = { role: "", role_other: "", company_name: "", size: "" };
let saveTimer = null;
let saveQueue = Promise.resolve();
let hasSubmitted = false;
let validationSubmitted = false;
let saveErrorShown = false;
let domainCharts = {}, summaryChart = null;

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
  const [{ indicators, uiText }, profileData, recommendations, weights, domainWeights] = await Promise.all([
    WorkshopI18n.loadWorkshopData(),
    WorkshopI18n.loadJson("../data/organization_profile.json"),
    WorkshopI18n.loadJson("../data/maturity_level_transition_recommendations.json"),
    WorkshopI18n.parseCsv("../data/indicator_weights.csv"),
    WorkshopI18n.parseCsv("../data/domain_weights.csv")
  ]);
  DATA = indicators; UI = uiText; PROFILE_DATA = profileData; RECOMMENDATIONS = recommendations;
  WEIGHTS = weights; DOMAIN_WEIGHTS = domainWeights;
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
  renderOrganizationProfile();

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
  document.getElementById("langLink").addEventListener("click", persistBeforeLanguageChange);
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
  organizationProfile = normalizeOrganizationProfile(expert.organization_profile);
  populateOrganizationProfile();
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

function localizeProfile(entry) {
  return (entry && (entry[LANG] || entry.en)) || "";
}

function normalizeOrganizationProfile(value) {
  const profile = value && typeof value === "object" ? value : {};
  return {
    role: typeof profile.role === "string" ? profile.role : "",
    role_other: typeof profile.role_other === "string" ? profile.role_other : "",
    company_name: typeof profile.company_name === "string" ? profile.company_name : "",
    size: typeof profile.size === "string" ? profile.size : ""
  };
}

function organizationSizeOptions(role) {
  return role === "construction_contractor"
    ? PROFILE_DATA.contractor_size_options
    : PROFILE_DATA.organization_size_options;
}

function organizationProfileComplete() {
  const validRole = PROFILE_DATA.role_options.some((option) => option.value === organizationProfile.role);
  if (!validRole) return false;
  if (organizationProfile.role === "other" && !organizationProfile.role_other.trim()) return false;
  if (!organizationProfile.company_name.trim()) return false;
  return organizationSizeOptions(organizationProfile.role).some((option) => option.value === organizationProfile.size);
}

function renderOrganizationProfile() {
  document.getElementById("organizationHeading").textContent = localizeProfile(PROFILE_DATA.heading);
  document.getElementById("organizationIntro").textContent = localizeProfile(PROFILE_DATA.intro);
  document.getElementById("organizationRoleLabel").textContent = localizeProfile(PROFILE_DATA.role_label);
  document.getElementById("organizationRoleOtherLabel").textContent = localizeProfile(PROFILE_DATA.role_other_label);
  document.getElementById("organizationRoleOther").placeholder = localizeProfile(PROFILE_DATA.role_other_placeholder);
  document.getElementById("organizationCompanyNameLabel").textContent = localizeProfile(PROFILE_DATA.company_name_label);
  document.getElementById("organizationCompanyName").placeholder = localizeProfile(PROFILE_DATA.company_name_placeholder);

  const roleOptions = document.getElementById("organizationRoleOptions");
  roleOptions.innerHTML = "";
  PROFILE_DATA.role_options.forEach((option) => {
    const label = document.createElement("label");
    label.className = "assessment-profile-choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "organization-role";
    input.value = option.value;
    input.addEventListener("change", () => onOrganizationRoleChange(option.value));
    const text = document.createElement("span");
    text.textContent = localizeProfile(option.label);
    label.appendChild(input);
    label.appendChild(text);
    roleOptions.appendChild(label);
  });

  document.getElementById("organizationRoleOther").addEventListener("input", (event) => {
    organizationProfile.role_other = event.target.value;
    organizationChanged();
  });
  document.getElementById("organizationCompanyName").addEventListener("input", (event) => {
    organizationProfile.company_name = event.target.value;
    organizationChanged();
  });
  renderOrganizationSizeOptions();
}

function renderOrganizationSizeOptions() {
  const role = organizationProfile.role;
  const fieldset = document.getElementById("organizationSizeFieldset");
  fieldset.disabled = !role || (CONFIG && CONFIG.survey_locked);
  document.getElementById("organizationSizeLabel").textContent = localizeProfile(
    role === "construction_contractor" ? PROFILE_DATA.contractor_size_label : PROFILE_DATA.size_label
  );
  const container = document.getElementById("organizationSizeOptions");
  container.innerHTML = "";
  organizationSizeOptions(role).forEach((option) => {
    const label = document.createElement("label");
    label.className = "assessment-profile-choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "organization-size";
    input.value = option.value;
    input.checked = option.value === organizationProfile.size;
    input.disabled = !role || Boolean(CONFIG && CONFIG.survey_locked);
    input.addEventListener("change", () => {
      organizationProfile.size = option.value;
      updateOrganizationChoiceStyles();
      organizationChanged();
    });
    const text = document.createElement("span");
    text.textContent = localizeProfile(option.label);
    label.appendChild(input);
    label.appendChild(text);
    container.appendChild(label);
  });
  updateOrganizationChoiceStyles();
}

function onOrganizationRoleChange(role) {
  if (CONFIG && CONFIG.survey_locked) return;
  const previousOptions = organizationSizeOptions(organizationProfile.role).map((option) => option.value);
  organizationProfile.role = role;
  if (role !== "other") organizationProfile.role_other = "";
  const nextOptions = organizationSizeOptions(role).map((option) => option.value);
  if (!nextOptions.includes(organizationProfile.size) || !previousOptions.includes(organizationProfile.size)) {
    organizationProfile.size = "";
  }
  document.getElementById("organizationRoleOther").value = organizationProfile.role_other;
  document.getElementById("organizationCompanyName").value = organizationProfile.company_name;
  document.getElementById("organizationRoleOtherWrap").hidden = role !== "other";
  renderOrganizationSizeOptions();
  updateOrganizationChoiceStyles();
  organizationChanged();
}

function populateOrganizationProfile() {
  document.querySelectorAll('[name="organization-role"]').forEach((input) => {
    input.checked = input.value === organizationProfile.role;
  });
  document.getElementById("organizationRoleOtherWrap").hidden = organizationProfile.role !== "other";
  document.getElementById("organizationRoleOther").value = organizationProfile.role_other;
  renderOrganizationSizeOptions();
  updateOrganizationChoiceStyles();
}

function updateOrganizationChoiceStyles() {
  document.querySelectorAll('.assessment-profile-choice input').forEach((input) => {
    input.closest("label").classList.toggle("selected", input.checked);
  });
}

function organizationChanged() {
  updateProgress();
  scheduleSave();
}

function applyLockState() {
  if (CONFIG && CONFIG.survey_locked) {
    document.getElementById("lockedNote").style.display = "block";
    document.querySelectorAll(".level-btn").forEach((b) => (b.disabled = true));
    document.querySelectorAll("#organizationProfilePanel input").forEach((input) => (input.disabled = true));
    document.getElementById("organizationSizeFieldset").disabled = true;
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
    enqueueProgressSave();
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

function progressSnapshot() {
  return {
    status: hasSubmitted ? "submitted" : "in_progress",
    current_levels: Object.assign({}, currentLevels),
    target_levels: Object.assign({}, targetLevels),
    organization_profile: Object.assign({}, organizationProfile)
  };
}

function enqueueProgressSave() {
  const snapshot = progressSnapshot();
  saveQueue = saveQueue.catch(() => {}).then(() => WorkshopDB.saveExpertProgress(EXPERT_ID, snapshot));
  return saveQueue;
}

async function persistBeforeLanguageChange(event) {
  event.preventDefault();
  const destination = event.currentTarget.href;
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    await enqueueProgressSave();
    window.location.assign(destination);
  } catch (error) {
    showSaveError("autosave_failed", error);
  }
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
  const questionsComplete = completed === total;
  const profileComplete = organizationProfileComplete();
  const complete = questionsComplete && profileComplete;
  document.getElementById("submitBtn").disabled = !complete || Boolean(CONFIG && CONFIG.survey_locked);
  const note = document.getElementById("incompleteNote");
  note.style.display = complete ? "none" : "block";
  note.textContent = !questionsComplete && !profileComplete
    ? t("please_complete_profile_and_all")
    : (!profileComplete ? t("please_complete_profile") : t("please_complete_all"));
  const downloadButton = document.getElementById("downloadPdfBtn");
  const validationButton = document.getElementById("continueValidationBtn");
  if (downloadButton) downloadButton.disabled = !profileComplete;
  if (validationButton) validationButton.disabled = !profileComplete;
  return complete;
}

async function onSubmit() {
  if (!updateProgress()) return;
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
      Object.assign({}, targetLevels),
      Object.assign({}, organizationProfile)
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
  WEIGHTS.forEach((r) => (wByCode[r.indicator_code] = parseFloat(r.global_weight)));
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
  Object.keys(DATA.indicators).forEach((code) => {
    const w = wByCode[code] || 0;
    overallCurrent += (currentLevels[code] || 0) * w;
    overallTarget += (targetLevels[code] || 0) * w;
  });
  return { domainScores, overallCurrent, overallTarget };
}

function levelNameForScore(score) {
  const idx = score < 2 ? 0 : score < 3 ? 1 : score < 4 ? 2 : score < 4.5 ? 3 : 4;
  return { index: idx, name: DATA.levelNames[LANG][idx] || DATA.levelNames.en[idx], meaning: t("level_meaning_" + (idx + 1)) };
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

async function continueToValidation() {
  if (!organizationProfileComplete()) {
    showToast(t("please_complete_profile"));
    document.getElementById("organizationProfilePanel").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  clearTimeout(saveTimer);
  saveTimer = null;
  const button = document.getElementById("continueValidationBtn");
  button.disabled = true;
  try {
    await enqueueProgressSave();
    window.location.assign(WorkshopConsent.withLanguage("../validation/", LANG));
  } catch (error) {
    showSaveError("autosave_failed", error);
    button.disabled = false;
  }
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

function localizedOrganizationValue(options, value) {
  const match = options.find((option) => option.value === value);
  return match ? localizeProfile(match.label) : "-";
}

function organizationRoleText() {
  if (organizationProfile.role === "other") return organizationProfile.role_other.trim() || localizedOrganizationValue(PROFILE_DATA.role_options, "other");
  return localizedOrganizationValue(PROFILE_DATA.role_options, organizationProfile.role);
}

function organizationSizeText() {
  return localizedOrganizationValue(organizationSizeOptions(organizationProfile.role), organizationProfile.size);
}

function timestampForFile(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportPdf() {
  if (!organizationProfileComplete()) {
    showToast(t("please_complete_profile"));
    return;
  }
  const button = document.getElementById("downloadPdfBtn");
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = t("pdf_preparing");

  try {
    const generatedAt = new Date();
    const { domainScores, overallCurrent, overallTarget } = computeScores();
    const currentLevel = levelNameForScore(overallCurrent);
    const targetLevel = levelNameForScore(overallTarget);
    const blob = await WorkshopReport.createAssessmentPdf({
      jspdf: window.jspdf,
      lang: LANG,
      t,
      expertId: EXPERT_ID,
      dateText: generatedAt.toLocaleString(LANG === "zh" ? "zh-TW" : "en-GB"),
      roleText: organizationRoleText(),
      companyName: organizationProfile.company_name.trim(),
      sizeText: organizationSizeText(),
      domains: DATA.domains.map((domain) => ({ id: domain.id, name: domain.name[LANG] || domain.name.en })),
      domainScores,
      overallCurrent,
      overallTarget,
      currentLevel,
      targetLevel,
      scaleLevels: DATA.levelNames[LANG].map((name, index) => ({
        name,
        meaning: t("level_meaning_" + (index + 1))
      })),
      domainCharts,
      summaryChart,
      recommendations: RECOMMENDATIONS,
      fontAssetBase: "../shared/assets/"
    });
    const timestamp = timestampForFile(generatedAt);
    const localName = "maturity_assessment_" + EXPERT_ID + "_" + timestamp + "_" + LANG + ".pdf";
    const archiveName = timestamp + "-" + LANG + ".pdf";
    let archiveFailed = false;
    try {
      await WorkshopDB.uploadAssessmentReport(EXPERT_ID, archiveName, blob);
    } catch (archiveError) {
      archiveFailed = true;
      console.error("PDF archive upload failed", archiveError);
    }
    downloadBlob(blob, localName);
    if (archiveFailed) showToast(t("pdf_archive_warning"));
  } catch (error) {
    console.error("PDF export failed", error);
    showToast(t("pdf_export_error"));
  } finally {
    button.disabled = !organizationProfileComplete();
    button.textContent = originalLabel;
  }
}

init();
