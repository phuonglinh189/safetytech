// Minimal Supabase REST adapter for the maturity assessment workshop (no build step, GitHub Pages friendly).
(function () {
  const cfg = window.WORKSHOP_DB_CONFIG || {};

  function isEnabled() {
    return Boolean(cfg.supabaseUrl && cfg.supabaseKey && !cfg.supabaseUrl.includes("YOUR_PROJECT"));
  }

  function headers(extra) {
    return Object.assign({
      apikey: cfg.supabaseKey,
      Authorization: "Bearer " + cfg.supabaseKey,
      "Content-Type": "application/json"
    }, extra || {});
  }

  function baseUrl(table) {
    return cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + table;
  }

  async function req(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      const err = new Error("DB request failed: " + res.status + " " + msg);
      err.status = res.status;
      throw err;
    }
    return res;
  }

  function pad(n) {
    return "E" + String(n).padStart(2, "0");
  }

  async function listExperts() {
    if (!isEnabled()) return [];
    const res = await req(baseUrl(cfg.expertsTable) + "?select=*&order=id.asc", { headers: headers() });
    return res.json();
  }

  async function getExpert(id) {
    if (!isEnabled()) return null;
    const res = await req(baseUrl(cfg.expertsTable) + "?id=eq." + encodeURIComponent(id) + "&select=*", { headers: headers() });
    const rows = await res.json();
    return rows[0] || null;
  }

  // Claim the next free expert id (E01..E{maxExperts}) by attempting a plain insert;
  // a 409 conflict means another browser just took it, so we try the next slot.
  async function claimExpertId(maxExperts) {
    if (!isEnabled()) return null;
    const existing = await listExperts();
    const taken = new Set(existing.map((e) => e.id));
    for (let i = 1; i <= maxExperts; i++) {
      const candidate = pad(i);
      if (taken.has(candidate)) continue;
      try {
        const res = await fetch(baseUrl(cfg.expertsTable), {
          method: "POST",
          headers: headers({ Prefer: "return=representation" }),
          body: JSON.stringify({
            id: candidate,
            status: "in_progress",
            current_levels: {},
            target_levels: {},
            claimed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
        if (res.status === 409 || res.status === 400) continue;
        if (!res.ok) continue;
        const rows = await res.json();
        return rows[0] || { id: candidate };
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  async function saveExpertProgress(id, patch) {
    if (!isEnabled()) return null;
    const body = Object.assign({}, patch, { updated_at: new Date().toISOString() });
    await req(baseUrl(cfg.expertsTable) + "?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify(body)
    });
    return true;
  }

  async function submitExpert(id, currentLevels, targetLevels) {
    return saveExpertProgress(id, {
      status: "submitted",
      current_levels: currentLevels,
      target_levels: targetLevels,
      submitted_at: new Date().toISOString()
    });
  }

  async function getConfig() {
    if (!isEnabled()) return { max_experts: 15, results_revealed: false, survey_locked: false };
    const res = await req(baseUrl(cfg.configTable) + "?key=eq." + encodeURIComponent(cfg.configKey) + "&select=*", { headers: headers() });
    const rows = await res.json();
    return rows[0] || { max_experts: 15, results_revealed: false, survey_locked: false };
  }

  async function updateConfig(patch) {
    if (!isEnabled()) return null;
    const body = Object.assign({}, patch, { updated_at: new Date().toISOString() });
    await req(baseUrl(cfg.configTable) + "?key=eq." + encodeURIComponent(cfg.configKey), {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify(body)
    });
    return true;
  }

  function startPolling(onTick, onError) {
    let active = true;
    async function tick() {
      try {
        const [experts, config] = await Promise.all([listExperts(), getConfig()]);
        if (active) onTick({ experts, config });
      } catch (e) {
        if (active && onError) onError(e);
      }
    }
    tick();
    const timer = setInterval(tick, cfg.pollIntervalMs || 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }

  async function deleteExpert(id) {
    if (!isEnabled()) return null;
    await req(baseUrl(cfg.expertsTable) + "?id=eq." + encodeURIComponent(id), {
      method: "DELETE",
      headers: headers({ Prefer: "return=minimal" })
    });
    return true;
  }

  async function deleteAllExperts() {
    if (!isEnabled()) return null;
    await req(baseUrl(cfg.expertsTable) + "?id=neq.__none__", {
      method: "DELETE",
      headers: headers({ Prefer: "return=minimal" })
    });
    return true;
  }

  window.WorkshopDB = {
    isEnabled,
    listExperts,
    getExpert,
    claimExpertId,
    saveExpertProgress,
    submitExpert,
    deleteExpert,
    deleteAllExperts,
    getConfig,
    updateConfig,
    startPolling
  };
})();
