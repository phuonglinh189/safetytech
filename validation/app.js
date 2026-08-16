let LANG = "en";
let DATA = null;
let CONSENT_VERSION = null;
let ACCEPTANCE = null;
let EXPERT_ID = null;
let answers = { profile: {}, ratings: {}, comments: "" };
let saveTimer = null;
let saveQueue = Promise.resolve();
let saveErrorShown = false;
let isSubmitting = false;

const localize = (entry) => (entry && (entry[LANG] || entry.en)) || "";
const ui = (key, vars) => {
  let text = DATA && DATA.ui && DATA.ui[key] ? localize(DATA.ui[key]) : key;
  Object.keys(vars || {}).forEach((name) => {
    text = text.replace("{" + name + "}", vars[name]);
  });
  return text;
};

async function init() {
  LANG = WorkshopI18n.getLang();
  const [consentText, validationText] = await Promise.all([
    WorkshopI18n.loadJson("../data/consent_text.json"),
    WorkshopI18n.loadJson("../data/validation_text.json")
  ]);
  CONSENT_VERSION = consentText.version;
  DATA = validationText;
  ACCEPTANCE = WorkshopConsent.getAccepted(CONSENT_VERSION);
  if (!ACCEPTANCE) {
    redirectToConsent();
    return;
  }

  renderStaticText();
  if (!WorkshopDB.isEnabled()) {
    showFatalError(ui("database_not_configured"));
    return;
  }

  const expert = await WorkshopDB.getExpert(ACCEPTANCE.expertId);
  if (!expert || expert.consent_given !== true || expert.consent_version !== CONSENT_VERSION) {
    if (!expert) WorkshopConsent.clearExpertId();
    redirectToConsent();
    return;
  }
  if (expert.status !== "submitted") {
    redirectToAssessment();
    return;
  }

  EXPERT_ID = expert.id;
  document.getElementById("idChip").textContent = EXPERT_ID;
  document.getElementById("idStatusText").textContent = ui("expert_id") + ": " + EXPERT_ID;
  document.getElementById("idNote").textContent = ui("resume_note");

  if (expert.validation_status === "submitted" && expert.validation_version === DATA.version) {
    showThankYou();
    return;
  }

  if (expert.validation_version === DATA.version && expert.validation_answers) {
    answers = normalizeAnswers(expert.validation_answers);
  }
  renderForm();
  populateForm();
  bindFormEvents();
  document.getElementById("mainContent").hidden = false;
  updateProgress();
}

function renderStaticText() {
  document.documentElement.lang = LANG === "zh" ? "zh-Hant" : "en";
  document.title = localize(DATA.title);
  document.getElementById("pageTitle").textContent = localize(DATA.title);
  document.getElementById("pageSubtitle").textContent = localize(DATA.header_subtitle);
  const langLink = document.getElementById("langLink");
  langLink.href = WorkshopI18n.langUrl(LANG === "en" ? "zh" : "en");
  langLink.textContent = LANG === "en" ? "中文" : "English";
  document.getElementById("formTitle").textContent = localize(DATA.title);
  document.getElementById("formIntro").textContent = localize(DATA.intro);
  document.getElementById("profileHeading").textContent = localize(DATA.expert_background_heading);
  document.getElementById("validationHeading").textContent = localize(DATA.validation_heading);
  document.getElementById("scaleGuideHeading").textContent = ui("scale_guide_heading");
  document.getElementById("commentsHeading").textContent = localize(DATA.comments_heading);
  document.getElementById("commentsQuestion").textContent = localize(DATA.comments_question);
  document.getElementById("commentsInput").placeholder = localize(DATA.comments_placeholder);
  document.getElementById("submitValidationBtn").textContent = ui("submit_button");
  document.getElementById("validationIncompleteNote").textContent = ui("incomplete_message");
  document.getElementById("thankYouHeading").textContent = ui("thank_you_heading");
  document.getElementById("thankYouMessage").textContent = ui("thank_you_message");
  document.getElementById("backToResultsLink").textContent = ui("back_to_results");
  document.getElementById("backToResultsLink").href = WorkshopConsent.withLanguage("../assessment-tool/", LANG);

  const scaleGuide = document.getElementById("scaleGuide");
  scaleGuide.innerHTML = "";
  DATA.scale.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "validation-scale-chip";
    const number = document.createElement("b");
    number.textContent = item.value;
    const label = document.createElement("span");
    label.textContent = localize(item.label);
    chip.appendChild(number);
    chip.appendChild(label);
    scaleGuide.appendChild(chip);
  });
}

function renderForm() {
  renderProfileQuestions();
  renderValidationGroups();
}

function renderProfileQuestions() {
  const container = document.getElementById("profileQuestions");
  container.innerHTML = "";
  DATA.profile_questions.forEach((question) => {
    const card = document.createElement("div");
    card.className = "validation-profile-card";
    card.dataset.profileQuestion = question.id;

    const heading = document.createElement("h3");
    heading.id = "profile-" + question.id + "-heading";
    heading.textContent = localize(question.label);
    card.setAttribute("role", "group");
    card.setAttribute("aria-labelledby", heading.id);
    card.appendChild(heading);

    if (question.type === "choice") {
      const choices = document.createElement("div");
      choices.className = "validation-choice-grid";
      question.options.forEach((option) => {
        const label = document.createElement("label");
        label.className = "validation-choice";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "profile-" + question.id;
        input.value = option.value;
        input.dataset.profileKey = question.id;
        const text = document.createElement("span");
        text.textContent = localize(option.label);
        label.appendChild(input);
        label.appendChild(text);
        choices.appendChild(label);
      });
      card.appendChild(choices);

      const otherWrap = document.createElement("div");
      otherWrap.className = "validation-other-field";
      otherWrap.dataset.otherFor = question.id;
      otherWrap.hidden = true;
      const otherLabel = document.createElement("label");
      otherLabel.htmlFor = question.id + "Other";
      otherLabel.textContent = localize(DATA.other_detail_label);
      const otherInput = document.createElement("input");
      otherInput.type = "text";
      otherInput.id = question.id + "Other";
      otherInput.dataset.otherKey = question.id + "_other";
      otherInput.placeholder = localize(DATA.other_detail_placeholder);
      otherWrap.appendChild(otherLabel);
      otherWrap.appendChild(otherInput);
      card.appendChild(otherWrap);
    } else {
      const input = document.createElement("input");
      input.type = "number";
      input.className = "validation-years-input";
      input.min = "0";
      input.step = "1";
      input.inputMode = "numeric";
      input.placeholder = localize(DATA.years_placeholder);
      input.dataset.yearsKey = question.id;
      input.setAttribute("aria-label", localize(question.label));
      card.appendChild(input);
    }
    container.appendChild(card);
  });
}

function renderValidationGroups() {
  const container = document.getElementById("validationGroups");
  container.innerHTML = "";
  DATA.groups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "validation-group";
    const heading = document.createElement("h3");
    heading.className = "domain-header";
    heading.style.background = group.color;
    heading.textContent = localize(group.heading);
    section.appendChild(heading);

    group.questions.forEach((question) => {
      const card = document.createElement("article");
      card.className = "validation-question-card";
      card.style.setProperty("--group-color", group.color);

      const code = document.createElement("span");
      code.className = "indicator-code";
      code.textContent = question.id;
      const title = document.createElement("h4");
      title.id = question.id + "Title";
      title.textContent = localize(question.aspect);
      const criteria = document.createElement("p");
      criteria.className = "validation-criteria";
      criteria.id = question.id + "Criteria";
      criteria.textContent = localize(question.criteria);
      const selected = document.createElement("output");
      selected.className = "validation-slider-value unanswered";
      selected.id = question.id + "Value";
      selected.textContent = ui("not_answered");

      const slider = document.createElement("input");
      slider.type = "range";
      slider.className = "validation-slider untouched";
      slider.min = "1";
      slider.max = "5";
      slider.step = "1";
      slider.value = "3";
      slider.dataset.ratingId = question.id;
      slider.setAttribute("aria-labelledby", title.id);
      slider.setAttribute("aria-describedby", criteria.id + " " + selected.id);
      slider.setAttribute("aria-valuetext", ui("not_answered"));

      const marks = document.createElement("div");
      marks.className = "validation-slider-marks";
      DATA.scale.forEach((scale) => {
        const mark = document.createElement("span");
        mark.textContent = scale.value;
        mark.style.left = ((Number(scale.value) - 1) / 4 * 100) + "%";
        marks.appendChild(mark);
      });

      card.appendChild(code);
      card.appendChild(title);
      card.appendChild(criteria);
      card.appendChild(selected);
      card.appendChild(slider);
      card.appendChild(marks);
      section.appendChild(card);
    });
    container.appendChild(section);
  });
}

function bindFormEvents() {
  document.querySelectorAll("[data-profile-key]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.profileKey;
      answers.profile[key] = input.value;
      if (input.value !== "other") {
        delete answers.profile[key + "_other"];
        const otherInput = document.querySelector('[data-other-key="' + key + '_other"]');
        if (otherInput) otherInput.value = "";
      }
      toggleOtherField(key, input.value === "other");
      updateChoiceStyles(key);
      answerChanged();
    });
  });

  document.querySelectorAll("[data-other-key]").forEach((input) => {
    input.addEventListener("input", () => {
      answers.profile[input.dataset.otherKey] = input.value;
      answerChanged();
    });
  });

  document.querySelectorAll("[data-years-key]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.yearsKey;
      if (input.value === "") delete answers.profile[key];
      else answers.profile[key] = Number(input.value);
      answerChanged();
    });
  });

  document.querySelectorAll("[data-rating-id]").forEach((slider) => {
    slider.addEventListener("input", () => {
      const id = slider.dataset.ratingId;
      answers.ratings[id] = Number(slider.value);
      updateSlider(slider, answers.ratings[id]);
      answerChanged();
    });
  });

  document.getElementById("commentsInput").addEventListener("input", (event) => {
    answers.comments = event.target.value;
    scheduleSave();
  });
  document.getElementById("validationForm").addEventListener("submit", submitValidation);
}

function populateForm() {
  DATA.profile_questions.forEach((question) => {
    const value = answers.profile[question.id];
    if (question.type === "choice") {
      const input = document.querySelector('[name="profile-' + question.id + '"][value="' + String(value || "") + '"]');
      if (input) input.checked = true;
      toggleOtherField(question.id, value === "other");
      const other = document.querySelector('[data-other-key="' + question.id + '_other"]');
      if (other) other.value = answers.profile[question.id + "_other"] || "";
      updateChoiceStyles(question.id);
    } else {
      const input = document.querySelector('[data-years-key="' + question.id + '"]');
      if (input && value !== undefined && value !== null) input.value = value;
    }
  });

  Object.keys(answers.ratings).forEach((id) => {
    const slider = document.querySelector('[data-rating-id="' + id + '"]');
    if (slider) {
      slider.value = answers.ratings[id];
      updateSlider(slider, answers.ratings[id]);
    }
  });
  document.getElementById("commentsInput").value = answers.comments || "";
}

function toggleOtherField(key, visible) {
  const wrap = document.querySelector('[data-other-for="' + key + '"]');
  if (wrap) wrap.hidden = !visible;
}

function updateChoiceStyles(key) {
  document.querySelectorAll('[name="profile-' + key + '"]').forEach((input) => {
    input.closest("label").classList.toggle("selected", input.checked);
  });
}

function updateSlider(slider, value) {
  const scale = DATA.scale.find((item) => Number(item.value) === Number(value));
  const label = scale ? localize(scale.label) : "";
  const output = document.getElementById(slider.dataset.ratingId + "Value");
  const text = ui("selected_value", { value, label });
  slider.classList.remove("untouched");
  slider.style.setProperty("--range-progress", ((Number(value) - 1) / 4 * 100) + "%");
  slider.setAttribute("aria-valuetext", text);
  output.classList.remove("unanswered");
  output.textContent = text;
}

function answerChanged() {
  clearError();
  updateProgress();
  scheduleSave();
}

function updateProgress() {
  const profileCompleted = DATA.profile_questions.filter(profileQuestionComplete).length;
  const ratingIds = DATA.groups.flatMap((group) => group.questions.map((question) => question.id));
  const ratingsCompleted = ratingIds.filter((id) => validRating(answers.ratings[id])).length;
  const completed = profileCompleted + ratingsCompleted;
  const total = DATA.profile_questions.length + ratingIds.length;
  const percent = Math.round(completed / total * 100);
  const text = ui("progress_text", { completed, total });

  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressText").textContent = text;
  const progressBar = document.getElementById("progressBar");
  progressBar.setAttribute("aria-valuemax", total);
  progressBar.setAttribute("aria-valuenow", completed);
  progressBar.setAttribute("aria-valuetext", text);

  const complete = completed === total;
  document.getElementById("submitValidationBtn").disabled = !complete || isSubmitting;
  document.getElementById("validationIncompleteNote").hidden = complete;
  return complete;
}

function profileQuestionComplete(question) {
  const value = answers.profile[question.id];
  if (question.type === "choice") {
    if (!question.options.some((option) => option.value === value)) return false;
    if (value === "other") return Boolean(String(answers.profile[question.id + "_other"] || "").trim());
    return true;
  }
  const number = Number(value);
  return value !== "" && value !== undefined && value !== null && Number.isInteger(number) && number >= 0;
}

function validRating(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 5;
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    enqueueSave();
  }, 500);
}

function enqueueSave() {
  if (!EXPERT_ID || isSubmitting) return;
  const snapshot = answerSnapshot();
  saveQueue = saveQueue.catch(() => {}).then(() => (
    WorkshopDB.saveValidationProgress(EXPERT_ID, snapshot, DATA.version)
  ));
  saveQueue.then(() => {
    if (saveErrorShown) {
      saveErrorShown = false;
      clearError();
    }
  }).catch((error) => showDatabaseError("autosave_failed", error));
}

async function submitValidation(event) {
  event.preventDefault();
  if (!updateProgress() || isSubmitting) return;
  isSubmitting = true;
  clearError();
  clearTimeout(saveTimer);
  saveTimer = null;
  document.getElementById("submitValidationBtn").textContent = ui("submitting_button");
  document.getElementById("validationSaving").textContent = ui("submitting_button");
  updateProgress();
  try {
    await saveQueue.catch(() => {});
    await WorkshopDB.submitValidation(EXPERT_ID, answerSnapshot(), DATA.version);
    showThankYou();
  } catch (error) {
    showDatabaseError("submit_failed", error);
  } finally {
    isSubmitting = false;
    document.getElementById("submitValidationBtn").textContent = ui("submit_button");
    document.getElementById("validationSaving").textContent = "";
    if (!document.getElementById("mainContent").hidden) updateProgress();
  }
}

function answerSnapshot() {
  return {
    profile: Object.assign({}, answers.profile),
    ratings: Object.assign({}, answers.ratings),
    comments: String(answers.comments || "")
  };
}

function normalizeAnswers(value) {
  return {
    profile: value && value.profile && typeof value.profile === "object" ? Object.assign({}, value.profile) : {},
    ratings: value && value.ratings && typeof value.ratings === "object" ? Object.assign({}, value.ratings) : {},
    comments: value && typeof value.comments === "string" ? value.comments : ""
  };
}

function showDatabaseError(fallbackKey, error) {
  console.error(error);
  saveErrorShown = true;
  const migrationError = error && error.status === 400 && /validation_/i.test(error.message || "");
  showError(ui(migrationError ? "migration_required" : fallbackKey));
}

function showError(message) {
  const error = document.getElementById("validationError");
  error.textContent = message;
  error.hidden = false;
}

function clearError() {
  const error = document.getElementById("validationError");
  error.textContent = "";
  error.hidden = true;
}

function showFatalError(message) {
  document.getElementById("idStatusText").textContent = message;
  document.getElementById("idNote").classList.add("warn");
}

function showThankYou() {
  document.getElementById("mainContent").hidden = true;
  document.getElementById("thankYouPanel").hidden = false;
  document.getElementById("thankYouHeading").focus();
}

function redirectToConsent() {
  window.location.replace(WorkshopConsent.withLanguage("../consent/", LANG));
}

function redirectToAssessment() {
  window.location.replace(WorkshopConsent.withLanguage("../assessment-tool/", LANG));
}

init().catch((error) => {
  console.error(error);
  const message = DATA ? ui("submit_failed") : (LANG === "zh" ? "無法載入驗證表單。" : "Unable to load the Validation form.");
  showFatalError(message);
});
