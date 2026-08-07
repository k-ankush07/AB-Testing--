(function () {
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

    modifiedEls: new Set(),
  };

  ns.HIGHLIGHT_BOX_SHADOW = "inset 0 0 0 2px #F59E0B";

  ns.applyHighlightState = function (el) {
    if (!el || !el.isConnected) return;
    if (ns.state.highlightOn) {
      el.style.boxShadow = ns.HIGHLIGHT_BOX_SHADOW;
    } else {
      el.style.boxShadow = "";
    }
  };

  ns.refreshAllHighlights = function () {
    ns.state.modifiedEls.forEach((el) => {
      if (!el.isConnected) {

        ns.state.modifiedEls.delete(el);
        return;
      }
      ns.applyHighlightState(el);
    });
  };

  ns.trackModifiedEl = function (el) {
    if (!el) return;
    ns.state.modifiedEls.add(el);
    ns.applyHighlightState(el);
  };

  ns.root = function () {
    if (ns.shadowRoot) return ns.shadowRoot;

    const host = document.createElement("div");
    host.id = "ig-toolbar-host";

    host.appendChild(document.createTextNode("\u200B"));

    host.style.setProperty("display", "block", "important");
    host.style.setProperty("position", "static", "important");

    document.body.appendChild(host);

    ns.shadowHost = host;
    ns.shadowRoot = host.attachShadow({ mode: "open" });

    if (window.__igToolbarCssUrl) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = window.__igToolbarCssUrl;
      ns.shadowRoot.appendChild(link);
    }

    return ns.shadowRoot;
  };
  ns.initializeTokens = function () {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(
      window.location.hash.replace("#", ""),
    );

    ns.state.previewId = params.get("ig-preview");
    ns.state.authToken =
      hashParams.get("ig-auth-token") ||
      params.get("ig-auth-token") ||
      (ns.state.previewId
        ? sessionStorage.getItem(`ig-token-${ns.state.previewId}`)
        : null);

    const freshToken =
      hashParams.get("ig-auth-token") || params.get("ig-auth-token");
    if (freshToken && ns.state.previewId) {
      sessionStorage.setItem(`ig-token-${ns.state.previewId}`, freshToken);
    }
  };

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

  // ---------- VISITOR COUNTRY ----------
  ns.getVisitorCountry = function () {
    if (window.__igVisitorCountry) return window.__igVisitorCountry;

    const meta = document.querySelector('meta[name="ig-visitor-country"]');
    if (meta && meta.content) return meta.content;

    return null;
  };

  ns.matchesCountryTargeting = function (experimentData) {
    const countries = experimentData.countries;
    if (!countries || !countries.length) return true;

    const visitorCountry = ns.getVisitorCountry();
    if (!visitorCountry) return false;

    return countries.includes(visitorCountry);
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
      document.documentElement.removeAttribute("data-ig-hidden");
      document.documentElement.style.visibility = "";
    }
  };
})();