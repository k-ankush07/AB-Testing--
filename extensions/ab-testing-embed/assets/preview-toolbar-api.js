;(function () {
  if (window.__igPreviewToolbarApiLoaded) return;
  window.__igPreviewToolbarApiLoaded = true;
  window.igtb = window.igtb || {};
  const ns = window.igtb;

  ns.saveModifications = async function () {
    if (ns.state.saving) return;
    ns.state.saving = true;
    const saveBtn = document.getElementById("ig-save-btn");
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
    const saveBtn = document.getElementById("ig-save-btn");
    if (!saveBtn) return;
    saveBtn.disabled = false;
    saveBtn.style.background = "#fff";
    saveBtn.style.color = "#2563EB";
    saveBtn.style.cursor = "pointer";
  };

  ns.updateLastUpdatedText = function (text) {
    const el = document.getElementById("ig-last-updated-text");
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

  ns.resolveActivePreview = async function () {
    if (ns.state.previewId) return true;

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
      sessionStorage.setItem(`ig-token-${ns.state.previewId}`, ns.state.authToken);
      return true;
    } catch (err) {
      console.error("IG Preview: active experiment lookup failed", err);
      return false;
    }
  };

  ns.init = async function () {
    ns.initializeTokens();
    const hasPreview = await ns.resolveActivePreview();
    if (!hasPreview || !ns.state.previewId) return;
    if (!ns.state.authToken) {
      console.error("IG Preview: No auth token available");
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

      if (ns.state.experimentData.status === "active") {
        const assignedGroup = ns.getAssignedGroup(
          ns.state.experimentData.experimentId,
          ns.state.experimentData.testGroups,
        );
        ns.state.selectedGroupIndex = ns.state.experimentData.testGroups.findIndex(
          (g) => g.id === assignedGroup.id,
        );
        if (ns.state.selectedGroupIndex === -1) ns.state.selectedGroupIndex = 0;
        ns.applyAllModifications();
        return;
      }

      if (ns.state.experimentData.status !== "pending") {
        console.log(
          `IG Preview: experiment status is "${ns.state.experimentData.status}", toolbar hidden`,
        );
        return;
      }

      ns.createToolbar();
      ns.applyAllModifications();
      ns.showSuccessToast(`Loaded '${ns.state.experimentData.name}'`);

      const cleanUrl = `${window.location.pathname}?ig-preview=${ns.state.previewId}&ig-builder-entity=experiment`;
      window.history.replaceState(null, "", cleanUrl);
    } catch (err) {
      console.error("IG Preview error:", err);
    }
  };
})();
