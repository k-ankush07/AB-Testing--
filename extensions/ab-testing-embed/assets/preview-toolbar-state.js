;(function () {
  if (window.__igPreviewToolbarStateLoaded) return;
  window.__igPreviewToolbarStateLoaded = true;
  window.igtb = window.igtb || {};
  const ns = window.igtb;

  ns.API_BASE = "http://localhost:8001/api"; 
  ns.CACHE_TTL = 5 * 60 * 1000;

  ns.state = {
    editedFromReplacementsPanel: false,
    previewId: null,
    authToken: null,
    experimentData: null,
    selectedGroupIndex: 0,
    highlightOn: true,
    hoverModeActive: false,
    currentHoverEl: null,
    currentTargetEl: null,
    pendingModification: null,
    saving: false,
  };

  ns.initializeTokens = function () {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));

    ns.state.previewId = params.get("ig-preview");
    ns.state.authToken =
      hashParams.get("ig-auth-token") ||
      params.get("ig-auth-token") ||
      (ns.state.previewId ? sessionStorage.getItem(`ig-token-${ns.state.previewId}`) : null);

    const freshToken = hashParams.get("ig-auth-token") || params.get("ig-auth-token");
    if (freshToken && ns.state.previewId) {
      sessionStorage.setItem(`ig-token-${ns.state.previewId}`, freshToken);
    }
  };

  // ---------- CACHE HELPERS ----------
 // ---------- CACHE HELPERS ----------
ns.getCacheKey = function () {
  return "ig-exp-cache-" + window.location.hostname;
};

ns.readCache = function () {
  try {
    const raw = localStorage.getItem(ns.getCacheKey());
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || !Array.isArray(cached.experiments)) return null;
    if (Date.now() - cached.savedAt > ns.CACHE_TTL) return null;
    return cached;
  } catch (err) {
    return null;
  }
};

ns.writeCache = function (experiments) {
  try {
    localStorage.setItem(
      ns.getCacheKey(),
      JSON.stringify({
        experiments: experiments, 
        savedAt: Date.now(),
      }),
    );
  } catch (err) {}
};

ns.clearCache = function () {
  try {
    localStorage.removeItem(ns.getCacheKey());
  } catch (err) {}
};

  // ---------- REVEAL PAGE ----------
  ns.revealPreviewPage = function () {
    if (window.__igRevealTimer) {
      clearTimeout(window.__igRevealTimer);
      window.__igRevealTimer = null;
    }
    if (typeof window.__igReveal === "function") {
      window.__igReveal();
    } else {
      // fallback agar anti-flicker snippet kisi wajah se load nahi hua
      document.documentElement.removeAttribute("data-ig-hidden");
      document.documentElement.style.visibility = "";
    }
  };
})();