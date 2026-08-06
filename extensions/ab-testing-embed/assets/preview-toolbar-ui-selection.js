(function () {
  if (window.__igPreviewToolbarUiSelectionLoaded) return;
  window.__igPreviewToolbarUiSelectionLoaded = true;
  window.igtb = window.igtb || {};
  const ns = window.igtb;

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
        ns.openModificationPanel(el, action);
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
      if (!ns.matchesCountryTargeting(experimentData)) return;

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
          isMultiImage: ns.isMultiImageMod(mod),
          hide: gv.hide,
          value: gv.value,
          images: gv.images,
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
        if (item.isMultiImage) {
          item.targetEls.forEach((wrapperEl) => {
            const imgs = wrapperEl.querySelectorAll("img");
            (item.images || []).forEach((imgVal, idx) => {
              const imgEl = imgs[idx];
              if (!imgEl) return;
              if (imgVal.leaveAsIs) return;
              if (imgVal.hide) {
                imgEl.style.display = "none";
              } else {
                imgEl.style.display = "";
                imgEl.removeAttribute("srcset");
                imgEl.removeAttribute("sizes");
                imgEl.src = imgVal.value;
              }
            });
          });
          return;
        }

        if (item.leaveAsIs) return;

        item.targetEls.forEach((el) => {
          if (item.hide) {
            el.style.display = "none";
          } else {
            el.style.display = "";
            if (item.type === "html") {
              const temp = document.createElement("div");
              temp.innerHTML = item.value;
              if (el.parentNode && temp.childNodes.length > 0) {
                const fragment = document.createDocumentFragment();
                while (temp.firstChild) {
                  fragment.appendChild(temp.firstChild);
                }
                el.parentNode.replaceChild(fragment, el);
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

      ns.renderModificationPanel(actionForType);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        ns.state.currentTargetEl = null;
      }
    });
  }

  ns.getSelector = getSelector;
  ns.showSuccessToast = showSuccessToast;
  ns.startHoverMode = startHoverMode;
})();
