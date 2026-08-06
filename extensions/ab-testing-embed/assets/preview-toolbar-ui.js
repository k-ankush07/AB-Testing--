(function () {
  if (window.__igPreviewToolbarUiLoaded) return;
  window.__igPreviewToolbarUiLoaded = true;
  window.igtb = window.igtb || {};
  const ns = window.igtb;

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  function uid() {
    return "mod-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  }

  // ---------- CSS SELECTOR GENERATION ----------
  function getSelector(el) {
    if (el.id) return "#" + el.id;

    const scopeAncestor = el.closest(
      "[id^='shopify-section-'], [data-block-id], [data-section-id]",
    );

    function buildPath(target, root) {
      let path = [];
      let node = target;
      while (
        node &&
        node.nodeType === 1 &&
        node !== root &&
        node !== document.body
      ) {
        let selector = node.tagName.toLowerCase();
        const parent = node.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (c) => c.tagName === node.tagName,
          );
          if (siblings.length > 1) {
            const idx = siblings.indexOf(node) + 1;
            selector += `:nth-of-type(${idx})`;
          }
        }
        path.unshift(selector);
        node = parent;
      }
      return path.join(" > ");
    }

    if (scopeAncestor) {
      const scopeSelector = scopeAncestor.id
        ? "#" + CSS.escape(scopeAncestor.id)
        : `[data-block-id="${scopeAncestor.getAttribute("data-block-id")}"]`;
      const relativePath = buildPath(el, scopeAncestor);
      const fullSelector = `${scopeSelector} ${relativePath}`;

      if (document.querySelectorAll(fullSelector).length === 1) {
        return fullSelector;
      }
    }

    if (
      el.className &&
      typeof el.className === "string" &&
      el.className.trim()
    ) {
      const classes = el.className.trim().split(/\s+/);
      for (const cls of classes) {
        const candidate = "." + cls;
        if (document.querySelectorAll(candidate).length === 1) {
          return candidate;
        }
      }
    }

    if (el.tagName === "IMG") {
      const mediaWrapper = el.closest(".media");
      if (mediaWrapper) {
        const allImgs = mediaWrapper.querySelectorAll("img");
        if (allImgs.length > 1) {
          const wrapperSelector = getSelector(mediaWrapper);
          return wrapperSelector + " img";
        }
      }
    }

    return buildPath(el, document.body);
  }

  // ---------- TOASTS ----------
  function showSuccessToast(message) {
    const existingToast = document.getElementById("ig-success-toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.id = "ig-success-toast";
    toast.style.cssText = `
      position: fixed; top: 90px; right: 20px; z-index: 999999;
      background: #fff; color: #111; padding: 14px 20px;
      border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      display: flex; align-items: center; gap: 10px;
      font-family: -apple-system, sans-serif; font-size: 14px; font-weight: 600;
    `;
    toast.innerHTML = `<span style="color:#22C55E; font-size:18px;">✓</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = "opacity 0.3s ease";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ---------- HOVER OUTLINE ----------
  function ensureHoverBox() {
    let box = document.getElementById("ig-hover-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "ig-hover-box";
      box.style.cssText = `
        position: absolute; pointer-events: none; z-index: 999998;
        border: 2px solid #2563EB; background: rgba(37,99,235,0.08);
        display: none;
      `;
      document.body.appendChild(box);
    }
    return box;
  }

  function positionBoxOn(el, box, color) {
    const rect = el.getBoundingClientRect();
    box.style.left = rect.left + window.scrollX + "px";
    box.style.top = rect.top + window.scrollY + "px";
    box.style.width = rect.width + "px";
    box.style.height = rect.height + "px";
    box.style.borderColor = color || "#2563EB";
    box.style.display = "block";
  }

  function getRealTargetAt(x, y) {
    const stack = document.elementsFromPoint(x, y);

    const usable = stack.filter(
      (node) =>
        !node.closest("#ig-preview-toolbar") &&
        node.id !== "ig-hover-box" &&
        !(
          node.tagName === "A" && node.classList.contains("full-unstyled-link")
        ),
    );

    const imgHit = usable.find((node) => node.tagName === "IMG");
    if (imgHit) return imgHit;

    return usable[0] || stack[0];
  }

  function onMouseMoveForHover(e) {
    if (!ns.state.hoverModeActive) return;
    const el = getRealTargetAt(e.clientX, e.clientY);
    if (!el) return;
    ns.state.currentHoverEl = el;
    positionBoxOn(el, ensureHoverBox(), "#2563EB");
  }

  function onClickForHover(e) {
    if (!ns.state.hoverModeActive) return;
    const el = getRealTargetAt(e.clientX, e.clientY);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();

    ns.state.currentTargetEl = el;
    stopHoverMode();

    const selector = getSelector(el);
    const existingMod = (ns.state.experimentData.modifications || []).find(
      (m) => m && m.groupValues && m.selector === selector,
    );

    if (existingMod) {
      showReplaceConfirmModal(existingMod, el);
    } else {
      showElementActionMenu(el);
    }
  }

  function startHoverMode() {
    ns.state.hoverModeActive = true;
    document.body.style.cursor = "crosshair";
    document.addEventListener("mousemove", onMouseMoveForHover, true);
    document.addEventListener("click", onClickForHover, true);
  }

  function stopHoverMode() {
    ns.state.hoverModeActive = false;
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", onMouseMoveForHover, true);
    document.removeEventListener("click", onClickForHover, true);
    const box = document.getElementById("ig-hover-box");
    if (box) box.style.display = "none";
  }

  // ---------- ELEMENT ACTION MENU ----------
  function showElementActionMenu(el) {
    const existing = document.getElementById("ig-action-menu");
    if (existing) existing.remove();

    const isImage = el.tagName === "IMG";

    const rect = el.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.id = "ig-action-menu";
    menu.style.cssText = `
    position: absolute; top:${rect.top + window.scrollY}px; left:${rect.left + window.scrollX}px;
    width:${rect.width}px; height:${rect.height}px;
    border: 2px solid #2563EB; z-index: 999998; box-sizing: border-box;
  `;

    const popup = document.createElement("div");
    popup.style.cssText = `
    position: absolute; top: 100%; left: 0; margin-top: 4px;
    background:#fff; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.2);
    font-family:-apple-system, sans-serif; font-size:14px; overflow:hidden; min-width:160px;
  `;

    popup.innerHTML = `
    <div class="ig-action-item" data-action="text" style="padding:10px 16px; cursor:pointer; text-align:center; border-bottom:1px solid #eee;">Edit Text</div>
    <div class="ig-action-item" data-action="html" style="padding:10px 16px; cursor:pointer; text-align:center; border-bottom:1px solid #eee;">Edit HTML / CSS</div>
    ${isImage ? `<div class="ig-action-item" data-action="image" style="padding:10px 16px; cursor:pointer; text-align:center; border-bottom:1px solid #eee;">Edit Image</div>` : ""}
    ${
      isImage
        ? `<div class="ig-action-item" data-action="hideimage" style="padding:10px 16px; cursor:pointer; text-align:center;">Hide image</div>`
        : `<div class="ig-action-item" data-action="hide" style="padding:10px 16px; cursor:pointer; text-align:center;">Hide element</div>`
    }
  `;

    menu.appendChild(popup);
    document.body.appendChild(menu);

    popup.querySelectorAll(".ig-action-item").forEach((item) => {
      item.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const action = item.dataset.action;
        menu.remove();
        openModificationPanel(el, action);
      });
    });

    setTimeout(() => {
      document.addEventListener(
        "click",
        function closeMenu(ev) {
          if (!menu.contains(ev.target)) {
            menu.remove();
            document.removeEventListener("click", closeMenu, true);
          }
        },
        true,
      );
    }, 0);
  }

  // ---------- MULTI-EXPERIMENT MERGE LOGIC ----------
  function buildResolvedModifications(experiments) {
    const claimedElements = new Set();
    const resolved = [];

    experiments.forEach(({ experimentData, groupIndex }) => {
      const group = experimentData.testGroups?.[groupIndex];
      if (!group) return;
      const groupName = group.name;

      (experimentData.modifications || []).forEach((mod) => {
        if (!mod || !mod.selector || !mod.groupValues) return;

        let els;
        try {
          els = document.querySelectorAll(mod.selector);
        } catch (e) {
          return;
        }
        if (!els.length) return;

        const unclaimedEls = Array.from(els).filter(
          (el) => !claimedElements.has(el),
        );
        if (!unclaimedEls.length) return;

        const gv = mod.groupValues[groupName];
        if (!gv) return;

        unclaimedEls.forEach((el) => claimedElements.add(el));

        resolved.push({
          type: mod.type,
          hide: gv.hide,
          value: gv.value,
          leaveAsIs: gv.leaveAsIs,
          experimentId: experimentData.experimentId,
          targetEls: unclaimedEls,
        });
      });
    });

    return resolved;
  }

  function applyResolvedModifications(resolvedList) {
    (resolvedList || []).forEach((item) => {
      try {
        if (item.leaveAsIs) return;

        item.targetEls.forEach((el) => {
          if (item.hide) {
            el.style.display = "none";
          } else {
            el.style.display = "";
            if (item.type === "html") {
              const temp = document.createElement("div");
              temp.innerHTML = item.value;
              const newEl = temp.firstElementChild;
              if (newEl && el.parentNode) {
                el.parentNode.replaceChild(newEl, el);
              }
            } else if (item.type === "image") {
              el.removeAttribute("srcset");
              el.removeAttribute("sizes");
              el.src = item.value;
            } else {
              el.textContent = item.value;
            }
          }
        });
      } catch (err) {
        console.error("Apply resolved modification error:", err);
      }
    });
  }

  ns.buildResolvedModifications = buildResolvedModifications;
  ns.applyResolvedModifications = applyResolvedModifications;

  function showReplaceConfirmModal(existingMod, el) {
    const existing = document.getElementById("ig-replace-confirm-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "ig-replace-confirm-overlay";
    overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000002;
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, sans-serif;
  `;

    overlay.innerHTML = `
    <div style="background:#fff; border-radius:10px; width:420px; max-width:90vw; padding:24px;">
      <div style="font-size:15px; color:#111; margin-bottom:20px; line-height:1.5;">
        You already have a replacement for this element. Would you like to edit the existing replacement?
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
        <button id="ig-replace-cancel" style="padding:8px 20px; border:1px solid #d1d5db; border-radius:6px; background:#fff; font-size:13px; cursor:pointer;">Cancel</button>
        <button id="ig-replace-yes" style="padding:8px 20px; border:none; border-radius:6px; background:#2563EB; color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Yes</button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    document
      .getElementById("ig-replace-cancel")
      .addEventListener("click", () => {
        overlay.remove();
        ns.state.currentTargetEl = null;
      });

    document.getElementById("ig-replace-yes").addEventListener("click", () => {
      overlay.remove();

      // Existing modification ko pending mein load karo edit ke liye
      ns.state.pendingModification = JSON.parse(JSON.stringify(existingMod));
      ns.state.pendingModification._editingId = existingMod.id;
      ns.state.currentTargetEl = el;
      ns.state.editedFromReplacementsPanel = false;

      const actionForType =
        existingMod.type === "hide"
          ? "hide"
          : existingMod.type === "html"
            ? "html"
            : existingMod.type === "image"
              ? "image"
              : "text";

      renderModificationPanel(actionForType);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        ns.state.currentTargetEl = null;
      }
    });
  }

  // ---------- MODIFICATION PANEL ----------
  function openModificationPanel(el, action) {
    ns.state.currentTargetEl = el;

    let selector = getSelector(el);
    let initialSrc = el.src || "";

    if (
      (action === "image" || action === "hideimage") &&
      el.tagName === "IMG"
    ) {
      const mediaWrapper = el.closest(".media");
      if (mediaWrapper && mediaWrapper.querySelectorAll("img").length > 1) {
        selector = getSelector(mediaWrapper) + " img";
        initialSrc = el.src || "";
      }
    }

    ns.state.pendingModification = {
      id: uid(),
      selector,
      description: "",
      type:
        action === "html"
          ? "html"
          : action === "image" || action === "hideimage"
            ? "image"
            : "text",
      originalHTML: el.outerHTML,
      groupValues: {},
    };

    ns.state.experimentData.testGroups.forEach((g) => {
      ns.state.pendingModification.groupValues[g.name] = {
        value:
          action === "text"
            ? el.textContent.trim()
            : action === "image" || action === "hideimage"
              ? initialSrc
              : el.outerHTML,
        hide: action === "hideimage",
        leaveAsIs: action !== "hideimage",
      };
    });

    renderModificationPanel(action);
  }

  function renderModificationPanel(action) {
    if (action === "hide") {
      renderHidePanel();
    } else if (action === "html") {
      renderHtmlModal();
    } else if (action === "image" || action === "hideimage") {
      renderImagePanel();
    } else {
      renderTextPanel();
    }
  }

  function renderImagePanel() {
    const footer = document.getElementById("ig-toolbar-footer");
    const mod = ns.state.pendingModification;

    const groupsHTML = ns.state.experimentData.testGroups
      .map((g) => {
        const gv = mod.groupValues[g.name];
        return `
        <div style="display:flex; gap:14px; margin-bottom:16px; align-items:flex-start;">
          <img src="${gv.value}" style="width:64px; height:64px; object-fit:cover; border-radius:6px; border:1px solid #e5e7eb;" />
          <div style="flex:1;">
            <div style="font-weight:600; font-size:13px; margin-bottom:6px;">${g.name}</div>
            <input type="text" class="ig-img-url" data-group="${g.name}" value="${gv.value}" placeholder="Image URL" style="width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:12px; box-sizing:border-box; margin-bottom:8px;" />
            <button type="button" class="ig-img-library" data-group="${g.name}" style="padding:6px 14px; border:none; border-radius:6px; background:#2563EB; color:#fff; font-size:12px; cursor:pointer; margin-bottom:8px;">Select image from library</button>
            <div style="display:flex; gap:14px; font-size:12px; color:#374151;">
              <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                <input type="checkbox" class="ig-img-hide" data-group="${g.name}" ${gv.hide ? "checked" : ""} /> Hide
              </label>
              <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                <input type="checkbox" class="ig-img-leave" data-group="${g.name}" ${gv.leaveAsIs ? "checked" : ""} /> Leave as is
              </label>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    footer.style.display = "block";
    footer.style.maxHeight = "360px";
    footer.style.overflowY = "auto";
    footer.innerHTML = `
    <div style="padding: 4px 0 16px 0;">
      <div style="font-weight:600; font-size:13px; margin-bottom:6px;">Targeting selector</div>
      <input id="ig-mod-selector" type="text" value="${mod.selector}" style="width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; box-sizing:border-box; margin-bottom:14px;" />

      <div style="font-weight:600; font-size:13px; margin-bottom:6px;">Description</div>
      <input id="ig-mod-description" type="text" placeholder="Optional description" style="width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; box-sizing:border-box; margin-bottom:16px;" />

      ${groupsHTML}

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        <button id="ig-mod-delete" style="border:none; background:none; color:#DC2626; cursor:pointer; font-size:16px;">🗑</button>
        <div style="display:flex; gap:10px;">
          <button id="ig-mod-cancel" style="padding:8px 18px; border:1px solid #d1d5db; border-radius:6px; background:#fff; font-size:13px; cursor:pointer;">Cancel</button>
          <button id="ig-mod-done" style="padding:8px 18px; border:none; border-radius:6px; background:#2563EB; color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Done</button>
        </div>
      </div>
    </div>
  `;

    document
      .getElementById("ig-mod-selector")
      .addEventListener("input", (e) => {
        mod.selector = e.target.value;
      });
    document
      .getElementById("ig-mod-description")
      .addEventListener("input", (e) => {
        mod.description = e.target.value;
      });

    footer.querySelectorAll(".ig-img-url").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const g = e.target.dataset.group;
        mod.groupValues[g].value = e.target.value;
        mod.groupValues[g].leaveAsIs = false;
        const thumb = inp.closest("div").parentElement.querySelector("img");
        if (thumb) thumb.src = e.target.value;
      });
    });
    footer.querySelectorAll(".ig-img-hide").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        mod.groupValues[e.target.dataset.group].hide = e.target.checked;
      });
    });
    footer.querySelectorAll(".ig-img-leave").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        mod.groupValues[e.target.dataset.group].leaveAsIs = e.target.checked;
      });
    });
    footer.querySelectorAll(".ig-img-library").forEach((btn) => {
      btn.addEventListener("click", () => {
        const groupName = btn.dataset.group;
        openShopifyImageLibrary((pickedUrl) => {
          mod.groupValues[groupName].value = pickedUrl;
          mod.groupValues[groupName].leaveAsIs = false;

          const urlInput = footer.querySelector(
            `.ig-img-url[data-group="${groupName}"]`,
          );
          if (urlInput) urlInput.value = pickedUrl;

          const thumb = btn.closest("div").parentElement.querySelector("img");
          if (thumb) thumb.src = pickedUrl;
        });
      });
    });

    document.getElementById("ig-mod-delete").addEventListener("click", () => {
      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;
      showDefaultFooter();
    });
    document.getElementById("ig-mod-cancel").addEventListener("click", () => {
      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;
      if (ns.state.editedFromReplacementsPanel) {
        ns.state.editedFromReplacementsPanel = false;
        showDefaultFooter();
        showReplacementsPanel();
      } else {
        showDefaultFooter();
      }
    });
    document.getElementById("ig-mod-done").addEventListener("click", () => {
      commitPendingModification();
    });
  }

  function openShopifyImageLibrary(onSelect) {
    const existing = document.getElementById("ig-imglib-overlay");
    if (existing) existing.remove();

    let selectedUrl = null;
    let files = [];

    const overlay = document.createElement("div");
    overlay.id = "ig-imglib-overlay";
    overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000001;
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, sans-serif;
  `;

    overlay.innerHTML = `
    <div style="background:#fff; border-radius:10px; width:900px; max-width:92vw; max-height:85vh; display:flex; flex-direction:column; overflow:hidden;">
      <div style="display:flex; justify-content:space-between; align-items:center; padding:20px 24px; border-bottom:1px solid #e5e7eb;">
        <h2 style="font-size:18px; font-weight:700; margin:0;">Shopify image library</h2>
        <button id="ig-imglib-close" style="background:none; border:none; font-size:18px; cursor:pointer;">✕</button>
      </div>

      <div style="display:flex; align-items:center; gap:12px; padding:16px 24px; border-bottom:1px solid #f0f0f0;">
        <div style="flex:1; position:relative;">
          <input id="ig-imglib-search" type="text" placeholder="Search products" style="width:100%; padding:8px 36px 8px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; box-sizing:border-box;" />
        </div>
        <button id="ig-imglib-refresh" title="Refresh" style="border:1px solid #d1d5db; background:#fff; border-radius:6px; width:34px; height:34px; cursor:pointer;">⟳</button>
      </div>

      <div id="ig-imglib-grid" style="flex:1; overflow-y:auto; padding:16px 24px; display:grid; grid-template-columns:repeat(5, 1fr); gap:16px;">
        <div style="grid-column: 1 / -1; text-align:center; color:#6B7280; padding:40px 0;">Loading images...</div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:10px; padding:16px 24px; border-top:1px solid #e5e7eb;">
        <button id="ig-imglib-cancel" style="padding:8px 20px; border:1px solid #d1d5db; border-radius:6px; background:#fff; font-size:13px; cursor:pointer;">Cancel</button>
        <button id="ig-imglib-confirm" style="padding:8px 20px; border:none; border-radius:6px; background:#2563EB; color:#fff; font-size:13px; font-weight:600; cursor:pointer;" disabled>Confirm</button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    const grid = document.getElementById("ig-imglib-grid");
    const confirmBtn = document.getElementById("ig-imglib-confirm");

    function renderGrid(list) {
      if (!list.length) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; color:#6B7280; padding:40px 0;">No images found</div>`;
        return;
      }
      grid.innerHTML = list
        .map(
          (f) => `
        <div class="ig-imglib-item" data-url="${f.url}" title="${f.filename}"
          style="cursor:pointer; border:2px solid ${f.url === selectedUrl ? "#2563EB" : "transparent"}; border-radius:8px; overflow:hidden;">
          <div style="width:100%; aspect-ratio:1; background:#f3f4f6; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            <img src="${f.url}" style="width:100%; height:100%; object-fit:cover;" loading="lazy" />
          </div>
          <div style="font-size:11px; color:#374151; padding:4px 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.filename}</div>
        </div>
      `,
        )
        .join("");

      grid.querySelectorAll(".ig-imglib-item").forEach((item) => {
        item.addEventListener("click", () => {
          selectedUrl = item.dataset.url;
          confirmBtn.disabled = false;
          confirmBtn.style.opacity = "1";
          renderGrid(files);
        });
      });
    }

    async function loadFiles(query) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; color:#6B7280; padding:40px 0;">Loading images...</div>`;
      try {
        const url = `${ns.API_BASE}/preview/${ns.state.previewId}/shopify-files?token=${encodeURIComponent(ns.state.authToken)}${query ? `&search=${encodeURIComponent(query)}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load files");
        const data = await res.json();
        files = data.files || [];
        renderGrid(files);
      } catch (err) {
        console.error("Image library load error:", err);
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; color:#DC2626; padding:40px 0;">Failed to load images</div>`;
      }
    }

    loadFiles("");

    let searchTimer = null;
    document
      .getElementById("ig-imglib-search")
      .addEventListener("input", (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadFiles(e.target.value.trim()), 350);
      });

    document
      .getElementById("ig-imglib-refresh")
      .addEventListener("click", () => {
        loadFiles(document.getElementById("ig-imglib-search").value.trim());
      });

    function close() {
      overlay.remove();
    }

    document.getElementById("ig-imglib-close").addEventListener("click", close);
    document
      .getElementById("ig-imglib-cancel")
      .addEventListener("click", close);
    document
      .getElementById("ig-imglib-confirm")
      .addEventListener("click", () => {
        if (selectedUrl) {
          onSelect(selectedUrl);
        }
        close();
      });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
  }

  // ---------- HIDE PANEL ----------
  function renderHidePanel() {
    const footer = document.getElementById("ig-toolbar-footer");
    const mod = ns.state.pendingModification;

    const groupsHTML = ns.state.experimentData.testGroups
      .map(
        (g) => `
        <label style="display:flex; align-items:center; gap:8px; font-size:14px; margin-bottom:12px; cursor:pointer;">
          <input type="checkbox" class="ig-hideonly-cb" data-group="${g.name}" checked />
          Hide In: <strong>${g.name}</strong>
        </label>
      `,
      )
      .join("");

    footer.style.display = "block";
    footer.style.maxHeight = "320px";
    footer.style.overflowY = "auto";
    footer.innerHTML = `
    <div style="padding: 4px 0 16px 0;">
      <div style="font-weight:600; font-size:13px; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
        Targeting selector <span style="color:#9CA3AF; font-size:12px;">ⓘ</span>
      </div>
      <input id="ig-mod-selector" type="text" value="${mod.selector}" style="width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; box-sizing:border-box; margin-bottom:14px;" />

      <div style="font-weight:600; font-size:13px; margin-bottom:6px;">Description</div>
      <div style="position:relative; margin-bottom:16px;">
        <input id="ig-mod-description" type="text" placeholder="Hide element" style="width:100%; padding:8px 34px 8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; box-sizing:border-box;" />
        <span style="position:absolute; right:10px; top:50%; transform:translateY(-50%); color:#9CA3AF;">✨</span>
      </div>

      ${groupsHTML}

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        <button id="ig-mod-delete" style="border:none; background:none; color:#DC2626; cursor:pointer; font-size:16px;">🗑</button>
        <div style="display:flex; gap:10px;">
          <button id="ig-mod-cancel" style="padding:8px 18px; border:1px solid #d1d5db; border-radius:6px; background:#fff; font-size:13px; cursor:pointer;">Cancel</button>
          <button id="ig-mod-done" style="padding:8px 18px; border:none; border-radius:6px; background:#2563EB; color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Done</button>
        </div>
      </div>
    </div>
  `;

    document
      .getElementById("ig-mod-selector")
      .addEventListener("input", (e) => {
        mod.selector = e.target.value;
      });
    document
      .getElementById("ig-mod-description")
      .addEventListener("input", (e) => {
        mod.description = e.target.value;
      });

    footer.querySelectorAll(".ig-hideonly-cb").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const g = e.target.dataset.group;
        mod.groupValues[g].hide = e.target.checked;
      });
      const g = cb.dataset.group;
      mod.groupValues[g].hide = true;
    });

    document.getElementById("ig-mod-delete").addEventListener("click", () => {
      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;
      showDefaultFooter();
    });

    document.getElementById("ig-mod-cancel").addEventListener("click", () => {
      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;

      if (ns.state.editedFromReplacementsPanel) {
        ns.state.editedFromReplacementsPanel = false;
        showDefaultFooter();
        showReplacementsPanel();
      } else {
        showDefaultFooter();
      }
    });
    document.getElementById("ig-mod-done").addEventListener("click", () => {
      commitPendingModification();
    });
  }

  // ---------- TEXT EDIT PANEL ----------
  function renderTextPanel() {
    const footer = document.getElementById("ig-toolbar-footer");
    const mod = ns.state.pendingModification;

    const groupsHTML = ns.state.experimentData.testGroups
      .map((g, i) => {
        const gv = mod.groupValues[g.name];
        return `
        <div style="margin-bottom:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
            <label style="font-weight:600; font-size:13px;">${g.name}</label>
            ${i === 0 ? '<span style="color:#374151; cursor:pointer;">👁</span>' : ""}
          </div>
          <input type="text" class="ig-group-input" data-group="${g.name}" value="${(gv.value || "").replace(/"/g, "&quot;")}" placeholder="Enter replacement text" style="width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; box-sizing:border-box;" />
          <div style="display:flex; gap:14px; margin-top:6px; font-size:12px; color:#374151;">
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" class="ig-hide-cb" data-group="${g.name}" /> Hide
            </label>
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" class="ig-leave-cb" data-group="${g.name}" checked /> Leave as is
            </label>
          </div>
        </div>
      `;
      })
      .join("");

    footer.style.display = "block";
    footer.style.maxHeight = "340px";
    footer.style.overflowY = "auto";
    footer.innerHTML = `
    <div style="padding: 4px 0 16px 0;">
      <div style="font-weight:600; font-size:13px; margin-bottom:6px;">Targeting selector</div>
      <input id="ig-mod-selector" type="text" value="${mod.selector}" style="width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; box-sizing:border-box; margin-bottom:14px;" />

      <div style="font-weight:600; font-size:13px; margin-bottom:6px;">Description</div>
      <div style="position:relative; margin-bottom:14px;">
        <input id="ig-mod-description" type="text" placeholder="Optional description" style="width:100%; padding:8px 34px 8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; box-sizing:border-box;" />
        <span style="position:absolute; right:10px; top:50%; transform:translateY(-50%); color:#9CA3AF;">✨</span>
      </div>

      <label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:4px; cursor:pointer;">
        <input type="checkbox" id="ig-find-toggle" /> Find (optional)
      </label>
      <div style="font-size:12px; color:#6B7280; margin-bottom:16px;">Find specific text to replace or remove for each test group.</div>

      <div style="font-weight:600; font-size:13px; margin-bottom:10px;">Replace</div>
      ${groupsHTML}

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        <button id="ig-mod-delete" style="border:none; background:none; color:#DC2626; cursor:pointer; font-size:16px;">🗑</button>
        <div style="display:flex; gap:10px;">
          <button id="ig-mod-cancel" style="padding:8px 18px; border:1px solid #d1d5db; border-radius:6px; background:#fff; font-size:13px; cursor:pointer;">Cancel</button>
          <button id="ig-mod-done" style="padding:8px 18px; border:none; border-radius:6px; background:#2563EB; color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Done</button>
        </div>
      </div>
    </div>
  `;

    document
      .getElementById("ig-mod-selector")
      .addEventListener("input", (e) => {
        mod.selector = e.target.value;
      });
    document
      .getElementById("ig-mod-description")
      .addEventListener("input", (e) => {
        mod.description = e.target.value;
      });

    footer.querySelectorAll(".ig-group-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const g = e.target.dataset.group;
        mod.groupValues[g].value = e.target.value;
        mod.groupValues[g].leaveAsIs = false;
      });
    });
    footer.querySelectorAll(".ig-hide-cb").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        mod.groupValues[e.target.dataset.group].hide = e.target.checked;
      });
    });
    footer.querySelectorAll(".ig-leave-cb").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        mod.groupValues[e.target.dataset.group].leaveAsIs = e.target.checked;
      });
    });

    document.getElementById("ig-mod-delete").addEventListener("click", () => {
      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;

      if (ns.state.editedFromReplacementsPanel) {
        ns.state.editedFromReplacementsPanel = false;
        showDefaultFooter();
        updateModCountBadge();
        ns.updateSaveButtonState();
        ns.updateLastUpdatedText("just now");
      } else {
        showDefaultFooter();
      }
    });
    document.getElementById("ig-mod-cancel").addEventListener("click", () => {
      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;

      if (ns.state.editedFromReplacementsPanel) {
        ns.state.editedFromReplacementsPanel = false;
        showDefaultFooter();
        showReplacementsPanel();
      } else {
        showDefaultFooter();
      }
    });
    document.getElementById("ig-mod-done").addEventListener("click", () => {
      commitPendingModification();
    });
  }

  // ---------- EDIT HTML MODAL ----------
  function renderHtmlModal() {
    const mod = ns.state.pendingModification;
    const existing = document.getElementById("ig-html-modal-overlay");
    if (existing) existing.remove();

    let activeGroupIdx = 0;

    const overlay = document.createElement("div");
    overlay.id = "ig-html-modal-overlay";
    overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000000;
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, sans-serif;
  `;

    function buildModalHTML() {
      const groupName = ns.state.experimentData.testGroups[activeGroupIdx].name;
      const gv = mod.groupValues[groupName];
      return `
      <div style="background:#fff; border-radius:10px; width:600px; max-width:90vw; max-height:85vh; overflow-y:auto; padding:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h2 style="font-size:18px; font-weight:600; margin:0;">Edit HTML</h2>
          <button id="ig-html-close" style="background:none; border:none; font-size:18px; cursor:pointer;">✕</button>
        </div>

        <div style="font-weight:600; font-size:13px; margin-bottom:6px;">Targeting selector <span style="color:#9CA3AF;">ⓘ</span></div>
        <input id="ig-html-selector" type="text" value="${mod.selector}" style="width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; box-sizing:border-box; margin-bottom:10px;" />
        <div style="font-size:12px; color:#6B7280; margin-bottom:16px;">Elements: 1</div>

        <select id="ig-html-group-select" style="width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; margin-bottom:16px;">
          ${ns.state.experimentData.testGroups
            .map(
              (g, i) =>
                `<option value="${i}" ${i === activeGroupIdx ? "selected" : ""}>${g.name}</option>`,
            )
            .join("")}
        </select>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <label style="font-weight:600; font-size:13px;">HTML</label>
          <div style="display:flex; gap:14px; font-size:12px;">
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="ig-html-hide" ${gv.hide ? "checked" : ""} /> Hide
            </label>
            <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
              <input type="checkbox" id="ig-html-leave" ${gv.leaveAsIs ? "checked" : ""} /> Leave as is
            </label>
          </div>
        </div>
        <textarea id="ig-html-textarea" style="width:100%; height:180px; padding:12px; border:1px solid #d1d5db; border-radius:6px; font-family:monospace; font-size:13px; box-sizing:border-box; resize:vertical;">${gv.value}</textarea>

        <div style="margin-top:16px; margin-bottom:6px;">
          <select id="ig-html-mode" style="padding:8px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:13px;">
            <option value="replace">Replace</option>
            <option value="append">Append</option>
            <option value="prepend">Prepend</option>
          </select>
        </div>
        <div style="font-size:12px; color:#6B7280; margin-bottom:20px;">Replace this element's full HTML.</div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button id="ig-html-cancel" style="padding:8px 20px; border:1px solid #d1d5db; border-radius:6px; background:#fff; font-size:13px; cursor:pointer;">Cancel</button>
          <button id="ig-html-apply" style="padding:8px 20px; border:none; border-radius:6px; background:#2563EB; color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Apply</button>
        </div>
      </div>
    `;
    }

    overlay.innerHTML = buildModalHTML();
    document.body.appendChild(overlay);

    function bindModalEvents() {
      document
        .getElementById("ig-html-close")
        .addEventListener("click", closeModal);
      document
        .getElementById("ig-html-cancel")
        .addEventListener("click", closeModal);

      document
        .getElementById("ig-html-selector")
        .addEventListener("input", (e) => {
          mod.selector = e.target.value;
        });

      document
        .getElementById("ig-html-textarea")
        .addEventListener("input", (e) => {
          const groupName =
            ns.state.experimentData.testGroups[activeGroupIdx].name;
          mod.groupValues[groupName].value = e.target.value;
          mod.groupValues[groupName].leaveAsIs = false;
        });

      document
        .getElementById("ig-html-hide")
        .addEventListener("change", (e) => {
          const groupName =
            ns.state.experimentData.testGroups[activeGroupIdx].name;
          mod.groupValues[groupName].hide = e.target.checked;
        });

      document
        .getElementById("ig-html-leave")
        .addEventListener("change", (e) => {
          const groupName =
            ns.state.experimentData.testGroups[activeGroupIdx].name;
          mod.groupValues[groupName].leaveAsIs = e.target.checked;
        });

      document
        .getElementById("ig-html-group-select")
        .addEventListener("change", (e) => {
          activeGroupIdx = parseInt(e.target.value, 10);
          overlay.innerHTML = buildModalHTML();
          bindModalEvents();
        });

      document.getElementById("ig-html-apply").addEventListener("click", () => {
        closeModal();
        commitPendingModification();
      });
    }

    function closeModal() {
      overlay.remove();

      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;

      if (ns.state.editedFromReplacementsPanel) {
        ns.state.editedFromReplacementsPanel = false;
        showReplacementsPanel();
      }
    }

    bindModalEvents();
  }

  // ---------- SHARED COMMIT LOGIC ----------
  function commitPendingModification() {
    if (!ns.state.experimentData.modifications)
      ns.state.experimentData.modifications = [];

    const pendingModification = ns.state.pendingModification;
    const editingId = pendingModification._editingId;
    delete pendingModification._editingId;

    if (editingId) {
      const idx = ns.state.experimentData.modifications.findIndex(
        (m) => m.id === editingId,
      );
      if (idx !== -1) {
        ns.state.experimentData.modifications[idx] = pendingModification;
      } else {
        ns.state.experimentData.modifications.push(pendingModification);
      }
    } else {
      ns.state.experimentData.modifications.push(pendingModification);
    }

    applyModificationToDOM(pendingModification);
    ns.state.pendingModification = null;
    ns.state.currentTargetEl = null;
    ns.updateSaveButtonState();
    ns.updateLastUpdatedText("just now");

    const wasFromReplacements = ns.state.editedFromReplacementsPanel;
    ns.state.editedFromReplacementsPanel = false;

    showDefaultFooter(true);

    if (wasFromReplacements) {
      showReplacementsPanel();
    }
  }

  // ---------- APPLY MODIFICATION TO LIVE DOM ----------
  function applyModificationToDOM(mod) {
    if (!mod || !mod.selector) return;
    try {
      const els = document.querySelectorAll(mod.selector);
      if (!els.length) return;
      const currentGroupName =
        ns.state.experimentData.testGroups[ns.state.selectedGroupIndex].name;
      const gv = mod.groupValues[currentGroupName];
      if (!gv) return;

      if (gv.leaveAsIs) return;

      els.forEach((el) => {
        if (gv.hide) {
          el.style.display = "none";
        } else {
          el.style.display = "";
          if (mod.type === "html") {
            const temp = document.createElement("div");
            temp.innerHTML = gv.value;
            const newEl = temp.firstElementChild;
            if (newEl && el.parentNode) {
              el.parentNode.replaceChild(newEl, el);
            }
          } else if (mod.type === "image") {
            el.removeAttribute("srcset");
            el.removeAttribute("sizes");
            el.src = gv.value;
          } else {
            el.textContent = gv.value;
          }
        }
      });
    } catch (err) {
      console.error("Apply modification error:", err);
    }
  }

  function applyAllModifications() {
    (ns.state.experimentData.modifications || [])
      .filter((mod) => mod && mod.selector)
      .forEach(applyModificationToDOM);
  }

  // ---------- ICONS ----------
  const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13"></path><path d="m8 6 2-2"></path><path d="m18 16 2-2"></path><path d="m17 11 4.3 4.3c.94.94.94 2.46 0 3.4l-2.6 2.6c-.94.94-2.46.94-3.4 0L11 17"></path><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg>`;
  const ICON_IMAGES = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 11-1.296-1.296a2.4 2.4 0 0 0-3.408 0L11 16"></path><path d="M4 8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"></path><circle cx="13" cy="7" r="1" fill="currentColor"></circle><rect x="8" y="2" width="14" height="14" rx="2"></rect></svg>`;
  const ICON_CODE = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"></path><path d="m6 8-4 4 4 4"></path><path d="m14.5 4-5 16"></path></svg>`;

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
      startHoverMode();
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
    const existing = document.getElementById("ig-replacements-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "ig-replacements-overlay";
    overlay.style.cssText = `
    position: fixed; top: 0; right: 0; bottom: 0; width: 420px; max-width: 90vw;
    background: #fff; z-index: 1000000; box-shadow: -4px 0 16px rgba(0,0,0,0.15);
    font-family: -apple-system, sans-serif; display: flex; flex-direction: column;
  `;

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
                <button type="button" class="ig-repl-edit" data-index="${i}" style="background:none; border:none; cursor:pointer; font-size:16px; padding:4px;">✏️</button>
                <button type="button" class="ig-repl-delete" data-index="${i}" style="background:none; border:none; cursor:pointer; font-size:16px; color:#DC2626; padding:4px;">🗑</button>
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
      overlay.remove();
    });

    overlay.querySelectorAll(".ig-repl-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        const mod = ns.state.experimentData.modifications[idx];
        if (!mod) return;

        overlay.remove();

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

        renderModificationPanel(actionForType);
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

        overlay.remove();
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
            overlay.remove();
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
          <span>▾</span>
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
        applyAllModifications();
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

  ns.getSelector = getSelector;
  ns.showSuccessToast = showSuccessToast;
  ns.applyModificationToDOM = applyModificationToDOM;
  ns.applyAllModifications = applyAllModifications;
  ns.createToolbar = createToolbar;
  ns.showReplacementsPanel = showReplacementsPanel;
  ns.updateModCountBadge = updateModCountBadge;
})();
