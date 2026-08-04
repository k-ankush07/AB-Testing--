(function () {
  const currentScript = document.currentScript;
  const baseUrl = currentScript
    ? currentScript.src.replace(/[^/]+$/, "")
    : "";

  const shouldHidePreview =
    /(^|\?|&)ig-preview=/.test(window.location.search) ||
    /ig-auth-token/.test(window.location.search) ||
    /ig-auth-token/.test(window.location.hash);

  if (shouldHidePreview) {
    const style = document.createElement("style");
    style.id = "ig-preview-hide-style";
    style.textContent = "body.ig-preview-hidden{visibility:hidden!important;opacity:0!important;}";
    document.head.appendChild(style);
    document.body.classList.add("ig-preview-hidden");
    window.__igPreviewHideController = {
      show: () => document.body.classList.remove("ig-preview-hidden"),
    };
  }

  const assets = [
    "preview-toolbar-state.js",
    "preview-toolbar-utils.js",
    "preview-toolbar-api.js",
    "preview-toolbar-ui.js",
  ];

  function loadScript(index) {
    if (index >= assets.length) return;
    const script = document.createElement("script");
    script.src = baseUrl + assets[index];
    script.defer = true;
    script.onload = function () {
      loadScript(index + 1);
    };
    script.onerror = function () {
      console.error("IG Preview: failed to load", assets[index]);
    };
    document.head.appendChild(script);
  }

  loadScript(0);
})();
