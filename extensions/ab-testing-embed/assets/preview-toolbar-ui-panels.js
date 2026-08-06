(function () {
  if (window.__igPreviewToolbarUiPanelsLoaded) return;
  window.__igPreviewToolbarUiPanelsLoaded = true;
  window.igtb = window.igtb || {};
  const ns = window.igtb;

  function uid() {
    return "mod-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  }

  const ICON_DELETE = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E51C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2 lucide-trash-2" aria-hidden="true"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

  function getImageGroupContext(el) {
    const mediaWrapper = el.closest(".media");
    if (!mediaWrapper) return null;
    const allImgs = Array.from(mediaWrapper.querySelectorAll("img"));
    if (allImgs.length <= 1) return null;
    return {
      wrapperSelector: ns.getSelector(mediaWrapper),
      images: allImgs,
      clickedIndex: allImgs.indexOf(el),
    };
  }

  // ---------- MODIFICATION PANEL ----------
  function openModificationPanel(el, action) {
    ns.state.currentTargetEl = el;

    const isImageAction = action === "image" || action === "hideimage";
    const groupInfo =
      isImageAction && el.tagName === "IMG" ? getImageGroupContext(el) : null;

    if (groupInfo) {
      ns.state.pendingModification = {
        id: uid(),
        selector: groupInfo.wrapperSelector,
        description: "",
        type: "image",
        isMultiImage: true,
        imageCount: groupInfo.images.length,
        originalHTML: el.outerHTML,
        groupValues: {},
      };

      ns.state.experimentData.testGroups.forEach((g) => {
        ns.state.pendingModification.groupValues[g.name] = {
          images: groupInfo.images.map((imgEl) => ({
            value: imgEl.src || "",
            hide: false,
            leaveAsIs: true,
          })),
        };
      });
    } else {
      let selector = ns.getSelector(el);
      let initialSrc = el.src || "";

      ns.state.pendingModification = {
        id: uid(),
        selector,
        description: "",
        type: action === "html" ? "html" : isImageAction ? "image" : "text",
        originalHTML: el.outerHTML,
        groupValues: {},
      };

      ns.state.experimentData.testGroups.forEach((g) => {
        ns.state.pendingModification.groupValues[g.name] = {
          value:
            action === "text"
              ? el.textContent.trim()
              : isImageAction
                ? initialSrc
                : el.outerHTML,
          hide: action === "hideimage",
          leaveAsIs: action !== "hideimage" && action !== "hide",
        };
      });
    }

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

  function isMultiImageMod(mod) {
    if (!mod) return false;
    if (mod.isMultiImage) return true;
    if (mod.groupValues) {
      const firstGv = Object.values(mod.groupValues)[0];
      if (firstGv && Array.isArray(firstGv.images)) return true;
    }
    return false;
  }

  function renderImagePanel() {
    const footer = document.getElementById("ig-toolbar-footer");
    const mod = ns.state.pendingModification;
    mod.isMultiImage = isMultiImageMod(mod);

    const groupsHTML = ns.state.experimentData.testGroups
      .map((g) => {
        const gv = mod.groupValues[g.name];

        if (mod.isMultiImage) {
          const imagesHTML = gv.images
            .map(
              (imgVal, idx) => `
              <div style="display:flex; gap:14px; margin-bottom:12px; align-items:flex-start;">
                <img src="${imgVal.value}" style="width:56px; height:56px; object-fit:cover; border-radius:6px; border:1px solid #e5e7eb;" />
                <div style="flex:1;">
                  <div style="font-weight:600; font-size:12px; margin-bottom:4px; color:#6B7280;">Image ${idx + 1}${idx === 0 ? " (Main)" : " (Hover/Alt)"}</div>
                  <input type="text" class="ig-img-url-multi" data-group="${g.name}" data-index="${idx}" value="${imgVal.value}" placeholder="Image URL" style="width:100%; padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:12px; box-sizing:border-box; margin-bottom:6px;" />
                  <button type="button" class="ig-img-library-multi" data-group="${g.name}" data-index="${idx}" style="padding:6px 14px; border:none; border-radius:6px; background:#2563EB; color:#fff; font-size:12px; cursor:pointer; margin-bottom:6px;">Select image from library</button>
                  <div style="display:flex; gap:14px; font-size:12px; color:#374151;">
                    <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                      <input type="checkbox" class="ig-img-hide-multi" data-group="${g.name}" data-index="${idx}" ${imgVal.hide ? "checked" : ""} /> Hide
                    </label>
                    <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                      <input type="checkbox" class="ig-img-leave-multi" data-group="${g.name}" data-index="${idx}" ${imgVal.leaveAsIs ? "checked" : ""} /> Leave as is
                    </label>
                  </div>
                </div>
              </div>
            `,
            )
            .join("");

          return `
            <div style="margin-bottom:16px; border:1px solid #eee; border-radius:8px; padding:12px;">
              <div style="font-weight:600; font-size:13px; margin-bottom:10px;">${g.name}</div>
              ${imagesHTML}
            </div>
          `;
        }

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
        <button id="ig-mod-delete" style="border:none; background:none; color:#DC2626; cursor:pointer; font-size:16px;">${ICON_DELETE}</button>
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

    if (mod.isMultiImage) {
      footer.querySelectorAll(".ig-img-url-multi").forEach((inp) => {
        inp.addEventListener("input", (e) => {
          const g = e.target.dataset.group;
          const idx = parseInt(e.target.dataset.index, 10);
          mod.groupValues[g].images[idx].value = e.target.value;
          mod.groupValues[g].images[idx].leaveAsIs = false;
          const thumb = inp.closest("div").parentElement.querySelector("img");
          if (thumb) thumb.src = e.target.value;
        });
      });
      footer.querySelectorAll(".ig-img-hide-multi").forEach((cb) => {
        cb.addEventListener("change", (e) => {
          const g = e.target.dataset.group;
          const idx = parseInt(e.target.dataset.index, 10);
          mod.groupValues[g].images[idx].hide = e.target.checked;
        });
      });
      footer.querySelectorAll(".ig-img-leave-multi").forEach((cb) => {
        cb.addEventListener("change", (e) => {
          const g = e.target.dataset.group;
          const idx = parseInt(e.target.dataset.index, 10);
          mod.groupValues[g].images[idx].leaveAsIs = e.target.checked;
        });
      });
      footer.querySelectorAll(".ig-img-library-multi").forEach((btn) => {
        btn.addEventListener("click", () => {
          const groupName = btn.dataset.group;
          const idx = parseInt(btn.dataset.index, 10);
          openShopifyImageLibrary((pickedUrl) => {
            mod.groupValues[groupName].images[idx].value = pickedUrl;
            mod.groupValues[groupName].images[idx].leaveAsIs = false;
            const urlInput = footer.querySelector(
              `.ig-img-url-multi[data-group="${groupName}"][data-index="${idx}"]`,
            );
            if (urlInput) urlInput.value = pickedUrl;
            const thumb = btn.closest("div").parentElement.querySelector("img");
            if (thumb) thumb.src = pickedUrl;
          });
        });
      });
    } else {
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
    }

    document.getElementById("ig-mod-delete").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const mod = ns.state.pendingModification;

      const idx = ns.state.experimentData.modifications.findIndex(
        (m) => m.id === (mod._editingId || mod.id),
      );

      if (idx !== -1) {
        ns.state.experimentData.modifications.splice(idx, 1);
        console.log("Deleted");
      } else {
        console.log("Not Found");
      }

      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;
      ns.state.editedFromReplacementsPanel = false;

      ns.updateModCountBadge();
      ns.updateSaveButtonState();
      ns.updateLastUpdatedText("just now");

      ns.showDefaultFooter();

    });
    document.getElementById("ig-mod-cancel").addEventListener("click", () => {
      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;
      ns.state.editedFromReplacementsPanel = false;
      ns.showDefaultFooter();
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
        <button id="ig-mod-delete" style="border:none; background:none; color:#DC2626; cursor:pointer; font-size:16px;">${ICON_DELETE}</button>
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
        mod.groupValues[g].leaveAsIs = !e.target.checked;
      });
      const g = cb.dataset.group;
      mod.groupValues[g].hide = true;
      mod.groupValues[g].leaveAsIs = false;
    });

    document.getElementById("ig-mod-delete").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const mod = ns.state.pendingModification;

      const idx = ns.state.experimentData.modifications.findIndex(
        (m) => m.id === (mod._editingId || mod.id),
      );

      if (idx !== -1) {
        ns.state.experimentData.modifications.splice(idx, 1);
        console.log("Deleted");
      } else {
        console.log("Not Found");
      }

      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;
      ns.state.editedFromReplacementsPanel = false;

      ns.updateModCountBadge();
      ns.updateSaveButtonState();
      ns.updateLastUpdatedText("just now");

      ns.showDefaultFooter();
    });

    document.getElementById("ig-mod-cancel").addEventListener("click", () => {
      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;
      ns.state.editedFromReplacementsPanel = false;
      ns.showDefaultFooter();
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
               <input type="checkbox" class="ig-hide-cb" data-group="${g.name}" ${gv.hide ? "checked" : ""} /> Hide
           </label>
           <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
             <input type="checkbox" class="ig-leave-cb" data-group="${g.name}" ${gv.leaveAsIs ? "checked" : ""} /> Leave as is
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
        <button id="ig-mod-delete" style="border:none; background:none; color:#DC2626; cursor:pointer; font-size:16px;">${ICON_DELETE}</button>
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

    document.getElementById("ig-mod-delete").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const mod = ns.state.pendingModification;

      const idx = ns.state.experimentData.modifications.findIndex(
        (m) => m.id === (mod._editingId || mod.id),
      );

      if (idx !== -1) {
        ns.state.experimentData.modifications.splice(idx, 1);
        console.log("Deleted");
      } else {
        console.log("Not Found");
      }

      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;
      ns.state.editedFromReplacementsPanel = false;

      ns.updateModCountBadge();
      ns.updateSaveButtonState();
      ns.updateLastUpdatedText("just now");

      ns.showDefaultFooter();

    });
    document.getElementById("ig-mod-cancel").addEventListener("click", () => {
      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;
      ns.state.editedFromReplacementsPanel = false;
      ns.showDefaultFooter();
    });
    document.getElementById("ig-mod-done").addEventListener("click", () => {
      commitPendingModification();
    });
  }

  // ---------- EDIT HTML MODAL ----------
  let CM6 = null;

  async function loadCM6Bundle() {
    if (!window.__igCM6BundleUrl) {
      throw new Error("CM6 bundle URL not found — check liquid snippet");
    }
    return import(window.__igCM6BundleUrl);
  }

  function ensureCodeMirror6Loaded(callback) {
    if (CM6) {
      callback();
      return;
    }
    if (window.__igCM6Loading) {
      window.__igCM6Callbacks = window.__igCM6Callbacks || [];
      window.__igCM6Callbacks.push(callback);
      return;
    }
    window.__igCM6Loading = true;
    window.__igCM6Callbacks = [callback];

    loadCM6Bundle()
      .then((mod) => {
        CM6 = mod;
        window.__igCM6Loading = false;
        (window.__igCM6Callbacks || []).forEach((cb) => cb());
        window.__igCM6Callbacks = [];
      })
      .catch((err) => {
        console.error("IG Preview: failed to load CodeMirror 6", err);
        window.__igCM6Loading = false;
      });
  }

  function renderHtmlModal() {
    const mod = ns.state.pendingModification;
    const existing = document.getElementById("ig-html-modal-overlay");
    if (existing) existing.remove();

    let activeGroupIdx = 0;
    let cmInstance = null;
    let editorGeneration = 0;

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
        <div id="ig-html-editor-container" style="border:1px solid #d1d5db; border-radius:6px; overflow:hidden; margin-bottom:6px;"></div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button id="ig-html-cancel" style="padding:8px 20px; border:1px solid #d1d5db; border-radius:6px; background:#fff; font-size:13px; cursor:pointer;">Cancel</button>
          <button id="ig-html-apply" style="padding:8px 20px; border:none; border-radius:6px; background:#2563EB; color:#fff; font-size:13px; font-weight:600; cursor:pointer;">Apply</button>
        </div>
      </div>
    `;
    }

    function destroyEditor() {
      editorGeneration++;
      if (cmInstance) {
        cmInstance.destroy();
        cmInstance = null;
      }
    }

    function initEditor() {
      const myGeneration = ++editorGeneration;
      const groupName = ns.state.experimentData.testGroups[activeGroupIdx].name;
      const gv = mod.groupValues[groupName];
      const container = document.getElementById("ig-html-editor-container");
      if (!container) return;

      ensureCodeMirror6Loaded(() => {
        if (myGeneration !== editorGeneration) return;
        if (!document.getElementById("ig-html-editor-container")) return;

        const { basicSetup, html, EditorView, EditorState } = CM6;

        const state = EditorState.create({
          doc: gv.value || "",
          extensions: [
            basicSetup,
            html(),
            EditorView.lineWrapping,
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                const currentGroupName =
                  ns.state.experimentData.testGroups[activeGroupIdx].name;
                mod.groupValues[currentGroupName].value =
                  update.state.doc.toString();
                mod.groupValues[currentGroupName].leaveAsIs = false;
              }
            }),
            EditorView.theme({
              "&": { fontSize: "13px", height: "180px" },
              ".cm-scroller": { fontFamily: "monospace", overflow: "auto" },
              ".cm-selectionBackground": {
                display: "block !important",
                backgroundColor: "#3b82f660 !important",
              },
              "&.cm-focused .cm-selectionBackground": {
                display: "block !important",
                backgroundColor: "#3b82f699 !important",
              },
            }),
          ],
        });

        cmInstance = new EditorView({
          state,
          parent: container,
        });

        setTimeout(() => {
          if (myGeneration !== editorGeneration) return;
          cmInstance.focus();
        }, 30);
      });
    }

    function getCurrentEditorValue() {
      return cmInstance ? cmInstance.state.doc.toString() : "";
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

      const fallback = document.getElementById("ig-html-textarea-fallback");
      if (fallback) {
        fallback.addEventListener("input", (e) => {
          if (cmInstance) return;
          const groupName =
            ns.state.experimentData.testGroups[activeGroupIdx].name;
          mod.groupValues[groupName].value = e.target.value;
          mod.groupValues[groupName].leaveAsIs = false;
        });
      }

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
          const outgoingGroupName =
            ns.state.experimentData.testGroups[activeGroupIdx].name;
          mod.groupValues[outgoingGroupName].value = getCurrentEditorValue();

          activeGroupIdx = parseInt(e.target.value, 10);
          destroyEditor();
          overlay.innerHTML = buildModalHTML();
          bindModalEvents();
          initEditor();
        });

      document.getElementById("ig-html-apply").addEventListener("click", () => {
        const groupName =
          ns.state.experimentData.testGroups[activeGroupIdx].name;
        mod.groupValues[groupName].value = getCurrentEditorValue();

        commitPendingModification();
        overlay.remove();
      });
    }

    function closeModal() {
      destroyEditor();
      overlay.remove();

      ns.state.pendingModification = null;
      ns.state.currentTargetEl = null;

      if (ns.state.editedFromReplacementsPanel) {
        ns.state.editedFromReplacementsPanel = false;
        ns.showReplacementsPanel();
      }
    }

    bindModalEvents();
    initEditor();
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

    ns.showDefaultFooter(true);

    if (wasFromReplacements) {
      ns.showReplacementsPanel();
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

      if (isMultiImageMod(mod)) {
        els.forEach((wrapperEl) => {
          const imgs = wrapperEl.querySelectorAll("img");
          gv.images.forEach((imgVal, idx) => {
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

      if (gv.leaveAsIs) return;

      els.forEach((el) => {
        if (gv.hide) {
          el.style.display = "none";
        } else {
          el.style.display = "";
          if (mod.type === "html") {
            const temp = document.createElement("div");
            temp.innerHTML = gv.value;
            if (el.parentNode && temp.childNodes.length > 0) {
              const fragment = document.createDocumentFragment();
              while (temp.firstChild) {
                fragment.appendChild(temp.firstChild);
              }
              el.parentNode.replaceChild(fragment, el);
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

  ns.isMultiImageMod = isMultiImageMod;
  ns.openModificationPanel = openModificationPanel;
  ns.renderModificationPanel = renderModificationPanel;
  ns.applyModificationToDOM = applyModificationToDOM;
  ns.applyAllModifications = applyAllModifications;
})();
