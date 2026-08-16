let LANG = "en";
let CONSENT = null;
let existingAcceptance = null;
let isSaving = false;

const localText = (key) => {
  const value = CONSENT && CONSENT[key];
  if (!value) return key;
  return value[LANG] || value.en || key;
};

async function init() {
  LANG = WorkshopI18n.getLang();
  CONSENT = await WorkshopI18n.loadJson("../data/consent_text.json");
  document.documentElement.lang = LANG === "zh" ? "zh-Hant" : "en";
  document.title = localText("header_subtitle");
  document.getElementById("langLink").href = WorkshopI18n.langUrl(LANG === "en" ? "zh" : "en");
  document.getElementById("langLink").textContent = LANG === "en" ? "中文" : "English";
  renderConsent();

  document.getElementById("agreeBtn").addEventListener("click", onAgree);
  document.getElementById("declineBtn").addEventListener("click", onDecline);
  document.getElementById("reviewBtn").addEventListener("click", onReview);

  if (WorkshopConsent.getDeclined(CONSENT.version)) {
    showDeclined();
    return;
  }

  existingAcceptance = WorkshopConsent.getAccepted(CONSENT.version);
  if (existingAcceptance) showExistingAcceptance();
}

function renderConsent() {
  document.getElementById("pageTitle").textContent = localText("header_subtitle");
  document.getElementById("pageSubtitle").textContent = localText("title");
  document.getElementById("consentTitle").textContent = localText("title");
  document.getElementById("consentSalutation").textContent = localText("salutation");
  document.getElementById("consentIntroduction").textContent = localText("introduction");
  document.getElementById("decisionQuestion").textContent = localText("decision_question");
  document.getElementById("agreeBtn").textContent = localText("agree_label");
  document.getElementById("declineBtn").textContent = localText("decline_label");
  document.getElementById("declinedHeading").textContent = localText("declined_heading");
  document.getElementById("declinedMessage").textContent = localText("declined_message");
  document.getElementById("reviewBtn").textContent = localText("review_label");

  const container = document.getElementById("consentSections");
  container.innerHTML = "";
  CONSENT.sections.forEach((section) => {
    const article = document.createElement("article");
    article.className = "consent-section";
    article.id = section.id;

    const heading = document.createElement("h3");
    heading.textContent = section.heading[LANG] || section.heading.en;
    article.appendChild(heading);

    (section.paragraphs[LANG] || section.paragraphs.en || []).forEach((text) => {
      const paragraph = document.createElement("p");
      appendLinkedText(paragraph, text);
      article.appendChild(paragraph);
    });

    const items = section.items && (section.items[LANG] || section.items.en);
    if (items && items.length) {
      const list = document.createElement("ul");
      items.forEach((text) => {
        const item = document.createElement("li");
        item.textContent = text;
        list.appendChild(item);
      });
      article.appendChild(list);
    }
    container.appendChild(article);
  });
}

function appendLinkedText(element, text) {
  const emailPattern = /\[([^\]]+@[^\]]+)\]/g;
  let cursor = 0;
  let match;
  while ((match = emailPattern.exec(text)) !== null) {
    element.appendChild(document.createTextNode(text.slice(cursor, match.index) + "["));
    const link = document.createElement("a");
    link.href = "mailto:" + match[1];
    link.textContent = match[1];
    element.appendChild(link);
    element.appendChild(document.createTextNode("]"));
    cursor = match.index + match[0].length;
  }
  element.appendChild(document.createTextNode(text.slice(cursor)));
}

function showExistingAcceptance() {
  const note = document.getElementById("existingConsentNote");
  note.textContent = localText("already_consented");
  note.hidden = false;
  document.getElementById("agreeBtn").textContent = localText("continue_label");
}

async function onAgree() {
  if (isSaving) return;
  setSaving(true);
  clearError();
  try {
    if (!WorkshopDB.isEnabled()) throw new Error("CONSENT_DB_NOT_CONFIGURED");

    const storedId = (existingAcceptance && existingAcceptance.expertId) || WorkshopConsent.expertId();
    let expert = storedId ? await WorkshopDB.getExpert(storedId) : null;
    let acceptedAt = existingAcceptance && existingAcceptance.acceptedAt;
    let consentLanguage = existingAcceptance && existingAcceptance.language;

    if (expert && expert.consent_given === true && expert.consent_version === CONSENT.version && existingAcceptance) {
      navigateToAssessment();
      return;
    }

    if (!acceptedAt) acceptedAt = new Date().toISOString();
    if (!consentLanguage) consentLanguage = LANG;
    const consentMetadata = {
      consent_given: true,
      consented_at: acceptedAt,
      consent_version: CONSENT.version,
      consent_language: consentLanguage
    };

    if (expert) {
      await WorkshopDB.saveExpertProgress(expert.id, consentMetadata);
    } else {
      if (storedId) WorkshopConsent.clearExpertId();
      const config = await WorkshopDB.getConfig();
      expert = await WorkshopDB.claimExpertId(config.max_experts || 15, consentMetadata);
      if (!expert) throw new Error("CONSENT_NO_EXPERT_SLOT");
    }

    WorkshopConsent.saveAccepted({
      version: CONSENT.version,
      acceptedAt,
      language: consentLanguage,
      expertId: expert.id
    });
    navigateToAssessment();
  } catch (error) {
    console.error(error);
    if (error && error.message === "CONSENT_NO_EXPERT_SLOT") {
      showError(localText("no_slot_error"));
    } else if (error && error.message === "CONSENT_DB_NOT_CONFIGURED") {
      showError(localText("configuration_error"));
    } else {
      showError(localText("save_error"));
    }
  } finally {
    setSaving(false);
  }
}

function onDecline() {
  if (isSaving) return;
  WorkshopConsent.saveDeclined(CONSENT.version, LANG);
  existingAcceptance = null;
  showDeclined();
}

function onReview() {
  WorkshopConsent.clearDeclined(CONSENT.version);
  document.getElementById("declinedPanel").hidden = true;
  document.getElementById("consentContent").hidden = false;
  document.getElementById("decisionQuestion").focus();
}

function showDeclined() {
  document.getElementById("consentContent").hidden = true;
  document.getElementById("declinedPanel").hidden = false;
  document.getElementById("declinedHeading").focus();
}

function setSaving(saving) {
  isSaving = saving;
  document.getElementById("agreeBtn").disabled = saving;
  document.getElementById("declineBtn").disabled = saving;
  document.getElementById("consentSaving").textContent = saving ? localText("saving_label") : "";
}

function showError(message) {
  const error = document.getElementById("consentError");
  error.textContent = message;
  error.hidden = false;
}

function clearError() {
  const error = document.getElementById("consentError");
  error.textContent = "";
  error.hidden = true;
}

function navigateToAssessment() {
  window.location.assign(WorkshopConsent.withLanguage("../assessment-tool/", LANG));
}

init().catch((error) => {
  console.error(error);
  const target = document.getElementById("consentError");
  if (target) {
    target.textContent = CONSENT ? localText("save_error") : "Unable to load the consent form.";
    target.hidden = false;
  }
});
