;(function () {
  if (window.__igPreviewToolbarStateLoaded) return;
  window.__igPreviewToolbarStateLoaded = true;
  window.igtb = window.igtb || {};
  const ns = window.igtb;

  ns.API_BASE = "http://localhost:8001/api";
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
})();
