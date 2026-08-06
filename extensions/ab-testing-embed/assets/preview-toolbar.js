(function () {
  const currentScript = document.currentScript;
  const baseUrl = currentScript ? currentScript.src.replace(/[^/]+$/, "") : "";

  const assets = [
    "preview-toolbar-state.js",
    "preview-toolbar-api.js",
    "preview-toolbar-ui-selection.js",
    "preview-toolbar-ui-panels.js",
    "preview-toolbar-ui-toolbar.js",
  ];

  function runInit() {
    if (window.igtb && typeof window.igtb.init === "function") {
      window.igtb.init();
    }
  }

  function safeRunInit() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runInit, { once: true });
    } else {
      runInit();
    }
  }

  function loadAllScripts() {
    let loadedCount = 0;
    let hasError = false;

    const scripts = assets.map((asset) => {
      const script = document.createElement("script");
      script.src = baseUrl + asset;
      script.async = false;
      return script;
    });

    scripts.forEach((script) => {
      script.onload = function () {
        loadedCount++;
        if (loadedCount === assets.length && !hasError) {
          safeRunInit();
        }
      };
      script.onerror = function () {
        hasError = true;

        console.group("IG Preview Script Error");
        console.log("Asset:", script.src);
        console.log("Base URL:", baseUrl);
        console.log("Asset Name:", script.src.split("/").pop());
        console.groupEnd();

        if (typeof window.__igReveal === "function") {
          window.__igReveal();
        }
      };
      document.head.appendChild(script);
    });
  }

  loadAllScripts();
})();
