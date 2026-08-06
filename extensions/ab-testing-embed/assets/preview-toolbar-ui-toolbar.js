(function () {
  if (window.__igPreviewToolbarUiToolbarLoaded) return;
  window.__igPreviewToolbarUiToolbarLoaded = true;
  window.igtb = window.igtb || {};
  const ns = window.igtb;

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  // ---------- ICONS ----------
  const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13"></path><path d="m8 6 2-2"></path><path d="m18 16 2-2"></path><path d="m17 11 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17"></path><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg>`;
  const ICON_IMAGES = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16"></path><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"></path><circle cx="13" cy="7" r="1" fill="currentColor"></circle><rect x="8" y="2" width="14" height="14" rx="2"></rect></svg>`;
  const ICON_CODE = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>`;
  
  const ICON_DROPDOWN = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" aria-hidden="true" style="color: rgb(250, 250, 250); width: 22px; height: 22px;"><path d="m6 9 6 6 6-6"></path></svg>`;
  const ICON_DELETE = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E51C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2 lucide-trash-2" aria-hidden="true"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`
  const ICON_EDITTEXT = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg>`

  function defaultFooterHTML() {
    return `
      <button id="ig-edit-element-btn" style="width:32px; height:32px; border:1px solid #e5e7eb; border-radius:6px; background:#fff; cursor:pointer;">${ICON_EDIT}</button>
      <button style="width:32px; height:32px; border:1px solid #e5e7eb; border-radius:6px; background:#fff; cursor:pointer;">${ICON_IMAGES}</button>
      <button style="width:32px; height:32px; border:1px solid #e5e7eb; border-radius:6px; background:#fff; cursor:pointer;">${ICON_CODE}</button>
      <span style="color:#6B7280; margin-left:8px;">Select any element on the page to make a replacement.</span>
    `;
  }

  function selectionModeFooterHTML() {
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
        <button id="ig-back-btn" style="background:none; border:none; font-weight:600; font-size:14px; cursor:pointer; color:#111;">Back</button>
        <span style="font-size:14px; color:#111;">Choose an element selection mode</span>
        <div style="display:flex; gap:10px;">
          <button id="ig-select-el" style="border:1px solid #e5e7eb; border-radius:6px; padding:8px 16px; background:#fff; font-size:13px; font-weight:600; cursor:pointer;">Select an element</button>
          <button id="ig-paste-selector" style="border:1px solid #e5e7eb; border-radius:6px; padding:8px 16px; background:#fff; font-size:13px; font-weight:600; cursor:pointer;">Paste a selector</button>
          <button id="ig-describe-ai" style="border:1px solid #e5e7eb; border-radius:6px; padding:8px 16px; background:#fff; font-size:13px; font-weight:600; cursor:pointer;">Describe element to AI</button>
        </div>
      </div>
    `;
  }

  function bindDefaultFooterEvents() {
    const editBtn = document.getElementById("ig-edit-element-btn");
    if (editBtn) editBtn.addEventListener("click", showSelectionModeFooter);
  }

  function bindSelectionModeFooterEvents() {
    document
      .getElementById("ig-back-btn")
      .addEventListener("click", () => showDefaultFooter());
    document.getElementById("ig-select-el").addEventListener("click", () => {
      ns.startHoverMode();
    });
    document
      .getElementById("ig-paste-selector")
      .addEventListener("click", () => {
        console.log("Paste a selector mode");
      });
    document.getElementById("ig-describe-ai").addEventListener("click", () => {
      console.log("Describe element to AI mode");
    });
  }

  function showDefaultFooter(refreshCount) {
    const footer = document.getElementById("ig-toolbar-footer");
    footer.style.maxHeight = "";
    footer.style.overflowY = "";
    footer.innerHTML = defaultFooterHTML();
    bindDefaultFooterEvents();
    if (refreshCount) updateModCountBadge();
  }

  function showSelectionModeFooter() {
    const footer = document.getElementById("ig-toolbar-footer");
    footer.innerHTML = selectionModeFooterHTML();
    bindSelectionModeFooterEvents();
  }

  function getModSummary(mod) {
    if (!mod || !mod.groupValues) return { label: "Text", desc: "No data" };
    const currentGroupName =
      ns.state.experimentData.testGroups[ns.state.selectedGroupIndex].name;
    const gv = mod.groupValues[currentGroupName];
    if (!gv) return { label: "Text", desc: "No data" };

    if (mod.type === "hide") {
      return { label: "Hide", desc: mod.description || "Element hidden" };
    }
    if (mod.type === "html") {
      return {
        label: "HTML",
        desc: mod.description || "No description provided",
      };
    }
    if (mod.type === "image") {
      if (ns.isMultiImageMod(mod)) {
        const gv = mod.groupValues[currentGroupName];
        return {
          label: "Image (multi)",
          desc: mod.description || `${(gv?.images || []).length} images`,
        };
      }
      return {
        label: "Image",
        desc:
          mod.description ||
          (gv.hide ? "Image hidden" : gv.value) ||
          "No content",
      };
    }
    return { label: "Text", desc: mod.description || gv.value || "No content" };
  }

  function showReplacementsPanel() {
    const existingBackdrop = document.getElementById(
      "ig-replacements-backdrop",
    );
    if (existingBackdrop) existingBackdrop.remove();
    const existing = document.getElementById("ig-replacements-overlay");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.id = "ig-replacements-backdrop";
    backdrop.style.cssText = `
    position: fixed; inset: 0; background-color: rgba(30, 30, 30, 0.5); z-index: 999999;
    display: block;
  `;
    document.body.appendChild(backdrop);

    const overlay = document.createElement("div");
    overlay.id = "ig-replacements-overlay";
    overlay.style.cssText = `
    position: fixed; top: 0; right: 0; bottom: 0; width: 420px; max-width: 90vw;
    background: #fff; z-index: 1000000; box-shadow: -4px 0 16px rgba(0,0,0,0.15);
    font-family: -apple-system, sans-serif; display: flex; flex-direction: column;
  `;

    function closePanel() {
      overlay.remove();
      backdrop.remove();
    }

    const mods = (ns.state.experimentData.modifications || []).filter(
      (m) => m && m.groupValues,
    );

    overlay.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid #e5e7eb;">
      <h2 style="font-size:18px; font-weight:700; margin:0;">Replacements</h2>
      <button id="ig-repl-close" style="background:none; border:none; font-size:18px; cursor:pointer;">✕</button>
    </div>
    <div id="ig-repl-list" style="flex:1; overflow-y:auto; padding:16px 24px;">
      ${mods
        .map((mod, i) => {
          const { label, desc } = getModSummary(mod);
          return `
            <div style="border:1px solid #e5e7eb; border-radius:10px; padding:16px; margin-bottom:16px;">
              <div style="font-weight:700; font-size:14px; margin-bottom:4px;">${i + 1}. ${label}</div>
              <div style="font-size:14px; color:#374151; margin-bottom:12px;">${desc}</div>
              <div style="display:flex; gap:14px;">
                <button type="button" class="ig-repl-edit" data-index="${i}" style="background:none; border:none; cursor:pointer; font-size:16px; padding:4px;">${ICON_EDITTEXT}</button>
                <button type="button" class="ig-repl-delete" data-index="${i}" style="background:none; border:none; cursor:pointer; font-size:16px; color:#DC2626; padding:4px;">${ICON_DELETE}</button>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    document.getElementById("ig-repl-close").addEventListener("click", (e) => {
      e.stopPropagation();
      closePanel();
    });

    overlay.querySelectorAll(".ig-repl-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const mod = ns.state.experimentData.modifications[idx];
        if (!mod) return;

        closePanel();

        ns.state.pendingModification = JSON.parse(JSON.stringify(mod));
        ns.state.pendingModification._editingId = mod.id;
        ns.state.editedFromReplacementsPanel = true;

        const actionForType =
          mod.type === "hide"
            ? "hide"
            : mod.type === "html"
              ? "html"
              : mod.type === "image"
                ? "image"
                : "text";

        ns.renderModificationPanel(actionForType);
      });
    });

    overlay.querySelectorAll(".ig-repl-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(e.currentTarget.dataset.index, 10);

        ns.state.experimentData.modifications.splice(idx, 1);
        updateModCountBadge();
        ns.updateSaveButtonState();
        ns.updateLastUpdatedText("just now");

        closePanel();
        if (
          ns.state.experimentData.modifications.filter(
            (m) => m && m.groupValues,
          ).length > 0
        ) {
          showReplacementsPanel();
        }
      });
    });

    setTimeout(() => {
      document.addEventListener(
        "click",
        function closeOnOutsideClick(ev) {
          if (!overlay.contains(ev.target)) {
            closePanel();
            document.removeEventListener("click", closeOnOutsideClick, true);
          }
        },
        true,
      );
    }, 0);
  }

  function updateModCountBadge() {
    const count = (ns.state.experimentData.modifications || []).filter(
      (m) => m && m.groupValues,
    ).length;
    const linkArea = document.getElementById("ig-mod-count-area");
    if (!linkArea) return;
    linkArea.innerHTML =
      count > 0
        ? `<a href="#" id="ig-view-replacements" style="color:#fff; text-decoration:underline; font-size:12px; cursor:pointer;">View ${count} replacement${count > 1 ? "s" : ""}</a>`
        : "";

    const link = document.getElementById("ig-view-replacements");
    if (link) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        showReplacementsPanel();
      });
    }
  }

  // ---------- TOOLBAR ----------
  function createToolbar() {
    const existing = document.getElementById("ig-preview-toolbar");
    if (existing) existing.remove();

    const bar = document.createElement("div");
    bar.id = "ig-preview-toolbar";
    bar.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%;
      z-index: 999999; font-family: -apple-system, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    `;

    bar.innerHTML = `
      <div style="background:#2563EB; color:#fff; padding:14px 20px; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:8px; font-size:14px;">
          Editing - <strong>${ns.state.experimentData.name}</strong>
        </div>
        <div style="display:flex; align-items:center; gap:16px;">
          <span style="font-size:14px;">Highlight Modifications</span>
          <label style="position:relative; display:inline-block; width:36px; height:20px;">
            <input type="checkbox" id="ig-highlight-toggle" ${ns.state.highlightOn ? "checked" : ""} style="opacity:0; width:0; height:0;">
            <span id="ig-toggle-slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background:${ns.state.highlightOn ? "#F59E0B" : "#94A3B8"}; border-radius:20px; transition:.3s;"></span>
            <span style="position:absolute; height:16px; width:16px; left:${ns.state.highlightOn ? "18px" : "2px"}; bottom:2px; background:#fff; border-radius:50%; transition:.3s;"></span>
          </label>
          <button id="ig-exit-btn" style="background:none; border:none; color:#fff; font-size:14px; cursor:pointer;">Exit Editor</button>
        </div>
      </div>

      <div style="background:#3B6FE0; color:#fff; padding:10px 20px; display:flex; align-items:center; justify-content:space-between; position:relative;">
        <div id="ig-group-selector" style="cursor:pointer; display:flex; align-items:center; gap:6px; font-size:14px; position:relative;">
          <span id="ig-current-group">${ns.state.experimentData.testGroups[ns.state.selectedGroupIndex]?.name}</span>
          <span style="display:inline-flex;">${ICON_DROPDOWN}</span>
          <div id="ig-group-dropdown" style="display:none; position:absolute; top:28px; left:0; background:#fff; color:#111; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.2); min-width:160px; overflow:hidden;">
            ${ns.state.experimentData.testGroups
              .map(
                (g, i) =>
                  `<div class="ig-group-option" data-index="${i}" style="padding:10px 14px; cursor:pointer; font-size:14px;">${g.name}</div>`,
              )
              .join("")}
          </div>
        </div>
        <div style="font-size:13px; display:flex; align-items:center; gap:16px;">
          <span id="ig-mod-count-area"></span>
          <span id="ig-last-updated-text">Last updated: ${timeAgo(ns.state.experimentData.updatedAt)}</span>
          <button id="ig-save-btn" style="background:#94A3B8; color:#fff; border:none; padding:6px 16px; border-radius:6px; font-size:13px; cursor:not-allowed;" disabled>Save</button>
        </div>
      </div>

      <div id="ig-toolbar-footer" style="background:#fff; color:#333; padding:10px 20px; display:flex; align-items:center; gap:12px; font-size:13px; border-top:1px solid #e5e7eb;">
        ${defaultFooterHTML()}
      </div>
    `;

    document.body.prepend(bar);
    document.body.style.marginTop = bar.offsetHeight + "px";

    document
      .getElementById("ig-exit-btn")
      .addEventListener("click", async () => {
        try {
          await fetch(
            `${ns.API_BASE}/preview/${ns.state.previewId}/toolbar-exit`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                token: ns.state.authToken,
                toolbarExited: true,
              }),
            },
          );
        } catch (e) {
          console.error(e);
        }

        sessionStorage.removeItem(`ig-token-${ns.state.previewId}`);
        ns.markToolbarExited();
        ns.clearBuilderSession();
        ns.clearCache();

        const url = new URL(window.location.href);

        [
          "ig-preview",
          "ig-builder-mode",
          "ig-builder-entity",
          "ig-auth-token",
        ].forEach((k) => url.searchParams.delete(k));

        window.location.href = url.toString();
      });

    document
      .getElementById("ig-highlight-toggle")
      .addEventListener("change", (e) => {
        ns.state.highlightOn = e.target.checked;
        document.getElementById("ig-toggle-slider").style.background = ns.state
          .highlightOn
          ? "#F59E0B"
          : "#94A3B8";
      });

    document
      .getElementById("ig-group-selector")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById("ig-group-dropdown");
        dropdown.style.display =
          dropdown.style.display === "none" ? "block" : "none";
      });

    document.querySelectorAll(".ig-group-option").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        ns.state.selectedGroupIndex = parseInt(e.target.dataset.index, 10);
        document.getElementById("ig-current-group").textContent =
          ns.state.experimentData.testGroups[ns.state.selectedGroupIndex].name;
        document.getElementById("ig-group-dropdown").style.display = "none";
        ns.applyAllModifications();
      });
    });

    document.addEventListener("click", () => {
      const dropdown = document.getElementById("ig-group-dropdown");
      if (dropdown) dropdown.style.display = "none";
    });

    document
      .getElementById("ig-save-btn")
      .addEventListener("click", ns.saveModifications);

    bindDefaultFooterEvents();
    updateModCountBadge();
  }

  ns.showDefaultFooter = showDefaultFooter;
  ns.showReplacementsPanel = showReplacementsPanel;
  ns.updateModCountBadge = updateModCountBadge;
  ns.createToolbar = createToolbar;
})();