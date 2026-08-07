(function () {
  if (window.__igPreviewToolbarApiLoaded) return;
  window.__igPreviewToolbarApiLoaded = true;
  window.igtb = window.igtb || {};
  const ns = window.igtb;

  ns.saveModifications = async function () {
    if (ns.state.saving) return;
    ns.state.saving = true;
    const saveBtn = ns.root().getElementById("ig-save-btn");
    if (saveBtn) {
      saveBtn.textContent = "Saving...";
      saveBtn.disabled = true;
    }

    try {
      const res = await fetch(
        `${ns.API_BASE}/preview/${ns.state.previewId}/modifications`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: ns.state.authToken,
            modifications: (ns.state.experimentData.modifications || []).filter(
              (m) => m && m.groupValues,
            ),
          }),
        },
      );
      if (!res.ok) throw new Error("Save failed");
      ns.showSuccessToast("Modifications saved");
      if (saveBtn) {
        saveBtn.textContent = "Save";
        saveBtn.disabled = true;
        saveBtn.style.background = "#94A3B8";
        saveBtn.style.cursor = "not-allowed";
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save modifications");
      if (saveBtn) {
        saveBtn.textContent = "Save";
        saveBtn.disabled = false;
      }
    } finally {
      ns.state.saving = false;
    }
  };

  ns.updateSaveButtonState = function () {
    const saveBtn = ns.root().getElementById("ig-save-btn");
    if (!saveBtn) return;
    saveBtn.disabled = false;
    saveBtn.style.background = "#fff";
    saveBtn.style.color = "#2563EB";
    saveBtn.style.cursor = "pointer";
  };

  ns.updateLastUpdatedText = function (text) {
    const el = ns.root().getElementById("ig-last-updated-text");
    if (el) el.textContent = `Last updated: ${text}`;
  };

  ns.pickWeightedGroup = function (testGroups) {
    const total = testGroups.reduce(
      (sum, g) => sum + (Number(g.percent) || 0),
      0,
    );
    if (total <= 0) return testGroups[0];

    let rand = Math.random() * total;
    for (const g of testGroups) {
      rand -= Number(g.percent) || 0;
      if (rand <= 0) return g;
    }
    return testGroups[testGroups.length - 1];
  };

  ns.getAssignedGroup = function (experimentId, testGroups) {
    const key = `ig-assigned-group-${experimentId}`;
    const storedId = localStorage.getItem(key);

    if (storedId) {
      const found = testGroups.find((g) => g.id === storedId);
      if (found) return found;
    }

    const picked = ns.pickWeightedGroup(testGroups);
    localStorage.setItem(key, picked.id);
    return picked;
  };

  ns.isBuilderMode = function () {
    const params = new URLSearchParams(window.location.search);
    return !!(
      params.get("ig-preview") ||
      params.get("ig-builder-mode") ||
      params.get("ig-auth-token")
    );
  };

  ns.hasBuilderToken = function () {
    const params = new URLSearchParams(window.location.search);

    const hasToken =
      params.has("ig-auth-token") ||
      window.location.hash.includes("ig-auth-token");

    if (hasToken) {
      ns.markBuilderSession();
      return true;
    }

    return ns.isBuilderSession();
  };

  ns.TOOLBAR_EXIT_KEY = "ig-toolbar-exited";
  ns.BUILDER_SESSION_KEY = "ig-builder-session";

  ns.markBuilderSession = function () {
    sessionStorage.setItem(ns.BUILDER_SESSION_KEY, "1");
  };

  ns.isBuilderSession = function () {
    return sessionStorage.getItem(ns.BUILDER_SESSION_KEY) === "1";
  };

  ns.clearBuilderSession = function () {
    sessionStorage.removeItem(ns.BUILDER_SESSION_KEY);
  };

  ns.isPreviewPage = function () {
    const params = new URLSearchParams(window.location.search);
    return params.has("ig-preview");
  };

  ns.hasThemePreviewParam = function () {
    const params = new URLSearchParams(window.location.search);
    return params.has("preview_theme_id");
  };

  ns.isDirectPreviewLink = function () {
    return ns.isPreviewPage() || ns.hasThemePreviewParam();
  };

  ns.isToolbarExited = function () {
    if (ns.isDirectPreviewLink()) return false;
    try {
      return sessionStorage.getItem(ns.TOOLBAR_EXIT_KEY) === "1";
    } catch (e) {
      return false;
    }
  };

  ns.markToolbarExited = function () {
    if (ns.isDirectPreviewLink()) return;
    try {
      sessionStorage.setItem(ns.TOOLBAR_EXIT_KEY, "1");
    } catch (e) {}
  };

  ns.clearToolbarExited = function () {
    try {
      sessionStorage.removeItem(ns.TOOLBAR_EXIT_KEY);
    } catch (e) {}
  };

  ns.getPreviewIdFromUrl = function () {
    const params = new URLSearchParams(window.location.search);
    return params.get("ig-preview") || null;
  };

  ns.watchForReRenders = function (experimentsWithGroups) {
    const experiments = experimentsWithGroups || ns.state.experimentsWithGroups;
    if (!experiments || !experiments.length) return;

    ns.state.experimentsWithGroups = experiments;

    function anySelectorUnmatched() {
      return experiments.some(({ experimentData }) =>
        (experimentData.modifications || []).some((mod) => {
          if (!mod || !mod.selector) return false;
          try {
            return document.querySelectorAll(mod.selector).length === 0;
          } catch (e) {
            return false;
          }
        }),
      );
    }

    function reapply() {
      const resolved = ns.buildResolvedModifications(experiments);
      ns.applyResolvedModifications(resolved);
    }
    let attempt = 0;
    const maxAttempts = 15;
    const delayMs = 300;

    function tryOnce() {
      attempt++;
      reapply();
      if (anySelectorUnmatched() && attempt < maxAttempts) {
        setTimeout(tryOnce, delayMs);
      }
    }
    tryOnce();

    if (ns.state._reRenderObserver) {
      ns.state._reRenderObserver.disconnect();
    }

    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(reapply, 150);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    ns.state._reRenderObserver = observer;

    setTimeout(() => {
      observer.disconnect();
      ns.state._reRenderObserver = null;
    }, 8000);
  };

  ns.PREVIEW_ID_SESSION_KEY = "ig-active-preview-id";

  ns.getPersistedPreviewId = function () {
    const fromUrl = ns.getPreviewIdFromUrl();
    if (fromUrl) return fromUrl;
    try {
      return sessionStorage.getItem(ns.PREVIEW_ID_SESSION_KEY) || null;
    } catch (e) {
      return null;
    }
  };

  ns.persistPreviewId = function (previewId) {
    try {
      if (previewId)
        sessionStorage.setItem(ns.PREVIEW_ID_SESSION_KEY, previewId);
    } catch (e) {}
  };

  ns.clearPersistedPreviewId = function () {
    try {
      sessionStorage.removeItem(ns.PREVIEW_ID_SESSION_KEY);
    } catch (e) {}
  };

  ns.resolveActivePreview = async function () {
    if (ns.state.previewId && ns.state.authToken) return true;

    const shop = window.location.hostname;
    try {
      const res = await fetch(
        `${ns.API_BASE}/preview/active?shop=${encodeURIComponent(shop)}`,
      );
      if (!res.ok) return false;

      const data = await res.json();
      if (!data || !data.previewId || !data.token) return false;

      ns.state.previewId = data.previewId;
      ns.state.authToken = data.token;
      sessionStorage.setItem(
        `ig-token-${ns.state.previewId}`,
        ns.state.authToken,
      );
      return true;
    } catch (err) {
      console.error("IG Preview: active experiment lookup failed", err);
      return false;
    }
  };

  ns.fetchAndMergeActiveExperiments = async function () {
    const shop = window.location.hostname;
    const res = await fetch(
      `${ns.API_BASE}/preview/active-list?shop=${encodeURIComponent(shop)}`,
    );
    if (!res.ok) return null;

    const data = await res.json();

    const experimentsRaw = (data && data.experiments) || [];
    if (!experimentsRaw.length) return null;

    experimentsRaw.sort(
      (a, b) => new Date(a.startedAt) - new Date(b.startedAt),
    );

    const experimentsWithGroups = experimentsRaw.map((experimentData) => {
      experimentData.modifications = (
        experimentData.modifications || []
      ).filter((m) => m && m.groupValues && m.selector);

      const assignedGroup = ns.getAssignedGroup(
        experimentData.experimentId,
        experimentData.testGroups,
      );
      let groupIndex = experimentData.testGroups.findIndex(
        (g) => g.id === assignedGroup.id,
      );
      if (groupIndex === -1) groupIndex = 0;

      return { experimentData, groupIndex };
    });

    return experimentsWithGroups;
  };

  ns.init = async function () {
    ns.initializeTokens();

    const builderActive = ns.hasBuilderToken() && !ns.isToolbarExited();
    const persistedPreviewId = ns.getPersistedPreviewId();

    if (!ns.isPreviewPage() && !builderActive && !persistedPreviewId) {
      await ns.runMergeFlow();
      return;
    }

    if (
      !ns.state.previewId &&
      ns.isToolbarExited() &&
      !ns.isDirectPreviewLink() &&
      !persistedPreviewId
    ) {
      const cached = ns.readCache();
      if (cached && cached.experiments && cached.experiments.length) {
        const resolved = ns.buildResolvedModifications(cached.experiments);
        ns.applyResolvedModifications(resolved);
        ns.revealPreviewPage();
        ns.watchForReRenders(cached.experiments);
        ns.refreshExperimentInBackground();
        return;
      }
    }

    await ns.resolveActivePreview();

    if (!ns.state.previewId) {
      ns.state.previewId = persistedPreviewId;
    }

    if (ns.state.previewId) {
      ns.persistPreviewId(ns.state.previewId);
      ns.markBuilderSession();

      if (!ns.state.authToken) {
        console.error("IG Preview: No auth token available");

        ns.state.readOnly = true;
        ns.createToolbar();

        ns.revealPreviewPage();
        return;
      }

      try {
        const res = await fetch(
          `${ns.API_BASE}/preview/${ns.state.previewId}?token=${encodeURIComponent(ns.state.authToken)}`,
        );
        if (!res.ok) throw new Error("Failed to load preview data");
        const data = await res.json();

        ns.state.experimentData = data.experiment || data;
        ns.state.experimentData.modifications = (
          ns.state.experimentData.modifications || []
        ).filter((m) => m && m.groupValues && m.selector);

        const status = ns.state.experimentData.status;

        if (status === "pending" || status === "active") {
          const params = new URLSearchParams(window.location.search);
          const hasExplicitBuilderAuth = !!(
            params.get("ig-builder-mode") || params.get("ig-auth-token")
          );

          if (
            ns.state.experimentData.toolbarExited &&
            !ns.hasBuilderToken() &&
            !ns.isDirectPreviewLink()
          ) {
            const assignedGroup = ns.getAssignedGroup(
              ns.state.experimentData.experimentId,
              ns.state.experimentData.testGroups,
            );
            ns.state.selectedGroupIndex =
              ns.state.experimentData.testGroups.findIndex(
                (g) => g.id === assignedGroup.id,
              );
            if (ns.state.selectedGroupIndex === -1)
              ns.state.selectedGroupIndex = 0;

            ns.markToolbarExited();
            ns.applyAllModifications();
            ns.watchForReRenders([
              {
                experimentData: ns.state.experimentData,
                groupIndex: ns.state.selectedGroupIndex,
              },
            ]);
            ns.revealPreviewPage();
            return;
          }

          if (status === "active") {
            const assignedGroup = ns.getAssignedGroup(
              ns.state.experimentData.experimentId,
              ns.state.experimentData.testGroups,
            );
            ns.state.selectedGroupIndex =
              ns.state.experimentData.testGroups.findIndex(
                (g) => g.id === assignedGroup.id,
              );
            if (ns.state.selectedGroupIndex === -1)
              ns.state.selectedGroupIndex = 0;
          } else {
            ns.state.selectedGroupIndex = 0;
          }

          ns.createToolbar();
          ns.applyAllModifications();
          ns.watchForReRenders();
          ns.showSuccessToast(`Loaded '${ns.state.experimentData.name}'`);
          ns.revealPreviewPage();

          if (ns.isPreviewPage()) {
            const cleanUrl = `${window.location.pathname}?ig-preview=${ns.state.previewId}&ig-builder-entity=experiment`;
            window.history.replaceState(null, "", cleanUrl);
          }
          return;
        }

        ns.revealPreviewPage();
        return;
      } catch (err) {
        console.error("IG Preview error:", err);
        ns.revealPreviewPage();
        return;
      }
    }

    await ns.runMergeFlow();
  };

  ns.runMergeFlow = async function () {
    try {
      const experimentsWithGroups = await ns.fetchAndMergeActiveExperiments();
      if (!experimentsWithGroups) {
        ns.revealPreviewPage();
        return;
      }

      ns.state.experimentsWithGroups = experimentsWithGroups;

      const resolved = ns.buildResolvedModifications(experimentsWithGroups);
      ns.applyResolvedModifications(resolved);
      ns.revealPreviewPage();

      ns.watchForReRenders(experimentsWithGroups);

      ns.writeCache(experimentsWithGroups);
    } catch (err) {
      console.error("IG Preview error:", err);
      ns.revealPreviewPage();
    }
  };

  ns.refreshExperimentInBackground = async function () {
    try {
      const experimentsWithGroups = await ns.fetchAndMergeActiveExperiments();
      if (!experimentsWithGroups) return;
      ns.writeCache(experimentsWithGroups);
    } catch (err) {
      console.error("IG Preview: background refresh failed", err);
    }
  };
})();
