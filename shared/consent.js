// Consent state shared by the consent and assessment pages.
(function () {
  const STORAGE_KEY = "workshop_consent_v1";
  const EXPERT_ID_KEY = "workshop_expert_id";

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      return value && typeof value === "object" ? value : null;
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function write(value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    return value;
  }

  function getAccepted(version) {
    const value = read();
    if (!value || value.accepted !== true || value.version !== version || !value.expertId) return null;
    return value;
  }

  function getDeclined(version) {
    const value = read();
    if (!value || value.accepted !== false || value.version !== version) return null;
    return value;
  }

  function saveAccepted(details) {
    const value = write({
      accepted: true,
      version: details.version,
      acceptedAt: details.acceptedAt,
      language: details.language,
      expertId: details.expertId
    });
    localStorage.setItem(EXPERT_ID_KEY, details.expertId);
    return value;
  }

  function saveDeclined(version, language) {
    return write({
      accepted: false,
      version,
      declinedAt: new Date().toISOString(),
      language
    });
  }

  function clearDeclined(version) {
    if (getDeclined(version)) localStorage.removeItem(STORAGE_KEY);
  }

  function expertId() {
    return localStorage.getItem(EXPERT_ID_KEY);
  }

  function clearExpertId() {
    localStorage.removeItem(EXPERT_ID_KEY);
  }

  function withLanguage(path, language) {
    const url = new URL(path, window.location.href);
    url.searchParams.set("lang", language === "zh" ? "zh" : "en");
    return url.toString();
  }

  window.WorkshopConsent = {
    read,
    getAccepted,
    getDeclined,
    saveAccepted,
    saveDeclined,
    clearDeclined,
    expertId,
    clearExpertId,
    withLanguage
  };
})();
