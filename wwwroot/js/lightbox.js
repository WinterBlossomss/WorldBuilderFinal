// lightbox.js — fullscreen picture viewer.
// Any clickable element with class "js-lightbox" and data-* attributes joins a gallery.
// Galleries are grouped by data-gallery; clicking opens at that item's index.
//
// Registry aesthetic — dark variant of Home/Index.cshtml:
//   ink #211c14 · cream #f0ebdf · ochre #a3712a · square corners · serif titles
//
// Supported data attributes on each trigger:
//   data-gallery   grouping key (e.g. "script-42"); triggers with the same key share a strip
//   data-full      full-size image URL (falls back to the <img> src inside the trigger)
//   data-thumb     small image for the strip (optional; falls back to data-full)
//   data-caption   caption shown centred under the image + used as the strip label
//   data-title     title shown in the bottom bar
//   data-meta      right-hand meta line ("From Lady Vellum · by @runeforge · uploaded …")
//   data-crumb     breadcrumb line ("Ashenmoor › Characters › Red Faction")
//   data-likes     like count (optional)
//   data-back      href for the "back to script" button (optional; closes if absent)
(function () {
    "use strict";

    // ---- registry tokens ----
    const CHROME = "font-sans text-xs tracking-[.16em] uppercase";
    const BTN = "w-8 h-8 shrink-0 border border-[#f0ebdf]/25 bg-[#f0ebdf]/5 flex items-center justify-center " +
        "cursor-pointer transition-colors hover:border-[#a3712a] hover:text-[#a3712a]";
    const BAR = "bg-[#f0ebdf]/[0.04] border-[#f0ebdf]/15";

    // Collect galleries lazily (so dynamically-added pictures still work).
    function itemsFor(gallery) {
        return Array.from(document.querySelectorAll(
            `.js-lightbox[data-gallery="${CSS.escape(gallery)}"]`));
    }

    // ---- build the overlay once ----
    let overlay, elImg, elCap, elCount, elCrumb, elTitle, elMeta, elLikes,
        elThumbs, elZoom, elBack, elDims;
    let group = [];      // current gallery elements
    let idx = 0;         // current index
    let zoom = 1;

    function build() {
        overlay = document.createElement("div");
        overlay.id = "wbLightbox";
        overlay.className = "hidden fixed inset-0 z-[200] flex flex-col bg-[#211c14]/[0.97] text-[#f0ebdf]";
        overlay.innerHTML = `
          <!-- top bar -->
          <div class="flex items-center gap-3 px-6 py-3 border-b ${BAR}">
            <span id="lbCount" class="${CHROME} text-[#a3712a] whitespace-nowrap">Picture 1 / 1</span>
            <span class="${CHROME} text-[#f0ebdf]/40 whitespace-nowrap hidden sm:inline">from</span>
            <span id="lbCrumb" class="font-sans text-xs text-[#f0ebdf]/60 truncate"></span>
            <div class="flex-1"></div>
            <span id="lbLikes" class="hidden items-center gap-1 font-sans text-xs text-[#f0ebdf]/60 mr-1"></span>
            <button type="button" data-lb="prev" aria-label="Previous" class="${BTN}">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 1 L 3 5 L 7 9" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>
            </button>
            <button type="button" data-lb="next" aria-label="Next" class="${BTN}">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1 L 7 5 L 3 9" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>
            </button>
            <button type="button" data-lb="close" aria-label="Close" class="${BTN}">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1 L 9 9 M9 1 L 1 9" stroke="currentColor" stroke-width="1.6"/></svg>
            </button>
          </div>

          <!-- stage -->
          <div class="relative flex-1 min-h-0 flex items-center justify-center px-14 py-6 select-none">
            <button type="button" data-lb="prev" aria-label="Previous"
                    class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 shrink-0 border border-[#f0ebdf]/25 bg-[#211c14]/60 flex items-center justify-center cursor-pointer transition-colors hover:border-[#a3712a] hover:text-[#a3712a]">
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M7 1 L 3 5 L 7 9" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>
            </button>

            <figure class="m-0 max-h-full max-w-[70vw] w-full h-full flex items-center justify-center overflow-auto
                           border border-[#f0ebdf]/15
                           bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgba(240,235,223,0.05)_10px_11px)]">
              <div id="lbImgWrap" class="flex flex-col items-center justify-center text-center gap-4 p-6">
                <img id="lbImg" alt="" class="hidden max-h-[68vh] object-contain transition-transform duration-150" />
                <div id="lbCap" class="font-serif italic text-lg text-[#f0ebdf]/70 max-w-prose"></div>
              </div>
            </figure>

            <button type="button" data-lb="next" aria-label="Next"
                    class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 shrink-0 border border-[#f0ebdf]/25 bg-[#211c14]/60 flex items-center justify-center cursor-pointer transition-colors hover:border-[#a3712a] hover:text-[#a3712a]">
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none"><path d="M3 1 L 7 5 L 3 9" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>
            </button>

            <!-- zoom controls -->
            <div class="absolute bottom-4 right-6 flex items-center border border-[#f0ebdf]/25 bg-[#211c14]/80">
              <button type="button" data-lb="zoomout" aria-label="Zoom out"
                      class="w-7 h-7 flex items-center justify-center cursor-pointer transition-colors hover:text-[#a3712a]">−</button>
              <span id="lbZoom" class="w-14 text-center font-sans text-xs tracking-[.06em] text-[#f0ebdf]/70 border-x border-[#f0ebdf]/15 py-1.5">100%</span>
              <button type="button" data-lb="zoomin" aria-label="Zoom in"
                      class="w-7 h-7 flex items-center justify-center cursor-pointer transition-colors hover:text-[#a3712a]">+</button>
              <button type="button" data-lb="zoomreset" aria-label="Reset zoom"
                      class="w-7 h-7 flex items-center justify-center cursor-pointer transition-colors hover:text-[#a3712a] border-l border-[#f0ebdf]/15">⤢</button>
            </div>
          </div>

          <!-- bottom info bar -->
          <div class="border-t ${BAR} px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div class="min-w-0">
              <div id="lbTitle" class="font-serif font-semibold text-lg tracking-[-.01em] leading-tight truncate"></div>
              <div id="lbMeta" class="font-sans text-xs text-[#f0ebdf]/50 leading-tight mt-0.5"></div>
              <div id="lbDims" class="font-sans text-xs tracking-[.06em] text-[#f0ebdf]/30 leading-tight"></div>
            </div>
            <div class="flex-1"></div>
            <a id="lbBack" href="#" data-lb="back"
               class="inline-flex items-center gap-2 ${CHROME} px-3 py-1.5 border border-[#f0ebdf]/25 bg-[#f0ebdf]/5 text-[#f0ebdf]/70 no-underline transition-colors hover:border-[#a3712a] hover:text-[#a3712a]">
               ← Back to script
            </a>
          </div>

          <!-- thumbnail strip -->
          <div id="lbThumbs" class="flex gap-3 justify-center border-t ${BAR} px-6 py-4 overflow-x-auto"></div>
        `;
        document.body.appendChild(overlay);

        elImg = overlay.querySelector("#lbImg");
        elCap = overlay.querySelector("#lbCap");
        elCount = overlay.querySelector("#lbCount");
        elCrumb = overlay.querySelector("#lbCrumb");
        elTitle = overlay.querySelector("#lbTitle");
        elMeta = overlay.querySelector("#lbMeta");
        elDims = overlay.querySelector("#lbDims");
        elLikes = overlay.querySelector("#lbLikes");
        elThumbs = overlay.querySelector("#lbThumbs");
        elZoom = overlay.querySelector("#lbZoom");
        elBack = overlay.querySelector("#lbBack");

        overlay.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-lb]");
            if (!btn) {
                if (e.target === overlay) close();   // click backdrop
                return;
            }
            const act = btn.dataset.lb;
            if (act === "close") close();
            else if (act === "next") go(idx + 1);
            else if (act === "prev") go(idx - 1);
            else if (act === "zoomin") setZoom(zoom + 0.25);
            else if (act === "zoomout") setZoom(zoom - 0.25);
            else if (act === "zoomreset") setZoom(1);
            else if (act === "back") { if (elBack.getAttribute("href") === "#") { e.preventDefault(); close(); } }
        });

        document.addEventListener("keydown", (e) => {
            if (overlay.classList.contains("hidden")) return;
            if (e.key === "Escape") close();
            else if (e.key === "ArrowRight") go(idx + 1);
            else if (e.key === "ArrowLeft") go(idx - 1);
        });
    }

    function data(el, k) { return el?.dataset?.[k] || ""; }
    function fullOf(el) { return data(el, "full") || el.querySelector("img")?.getAttribute("src") || ""; }
    function thumbOf(el) { return data(el, "thumb") || fullOf(el); }

    function setZoom(z) {
        zoom = Math.min(4, Math.max(0.5, Math.round(z * 100) / 100));
        elImg.style.transform = `scale(${zoom})`;
        elZoom.textContent = Math.round(zoom * 100) + "%";
    }

    function renderThumbs() {
        elThumbs.innerHTML = "";
        // A single-item gallery has nothing to navigate.
        if (group.length < 2) { elThumbs.classList.add("hidden"); return; }
        elThumbs.classList.remove("hidden");

        group.forEach((el, i) => {
            const t = document.createElement("button");
            t.type = "button";
            t.dataset.lb = "thumb";
            t.className = "relative w-24 shrink-0 text-left cursor-pointer";
            const src = thumbOf(el);
            const on = i === idx;
            t.innerHTML = `
              <div class="aspect-[4/3] overflow-hidden border transition-all
                          ${on ? "border-[#a3712a]" : "border-[#f0ebdf]/20 opacity-50 hover:opacity-100 hover:border-[#f0ebdf]/50"}
                          bg-[repeating-linear-gradient(135deg,transparent_0_8px,rgba(240,235,223,0.06)_8px_9px)] flex items-center justify-center">
                ${src ? `<img src="${src}" class="w-full h-full object-cover" alt="" loading="lazy">`
                    : `<span class="font-sans text-xs tracking-[.06em] uppercase text-[#f0ebdf]/30">none</span>`}
                <span class="absolute top-1 left-1 w-5 h-5 bg-[#211c14]/80 border border-[#f0ebdf]/20 font-sans text-xs flex items-center justify-center">${i + 1}</span>
              </div>
              <div class="font-sans text-xs text-[#f0ebdf]/40 truncate mt-1.5">${data(el, "caption") || data(el, "title") || "Picture " + (i + 1)}</div>`;
            t.addEventListener("click", () => go(i));
            elThumbs.appendChild(t);
        });
    }

    function go(n) {
        if (!group.length) return;
        idx = (n + group.length) % group.length;
        const el = group[idx];
        const src = fullOf(el);

        setZoom(1);
        if (src) {
            elImg.src = src;
            elImg.classList.remove("hidden");
            elImg.onload = () => {
                elDims.textContent = elImg.naturalWidth && elImg.naturalHeight
                    ? `${elImg.naturalWidth} × ${elImg.naturalHeight}` : "";
            };
        } else {
            elImg.classList.add("hidden");
            elImg.removeAttribute("src");
            elDims.textContent = "";
        }

        elCap.textContent = data(el, "caption");
        elCount.textContent = `Picture ${idx + 1} / ${group.length}`;
        elCrumb.textContent = data(el, "crumb");
        elTitle.textContent = data(el, "title") || data(el, "caption") || "Picture";
        elMeta.textContent = data(el, "meta");

        const back = data(el, "back");
        elBack.setAttribute("href", back || "#");

        const likes = data(el, "likes");
        if (likes) { elLikes.textContent = "♥ " + likes; elLikes.classList.remove("hidden"); elLikes.classList.add("flex"); }
        else { elLikes.classList.add("hidden"); elLikes.classList.remove("flex"); }

        renderThumbs();
    }

    function open(el) {
        group = itemsFor(data(el, "gallery"));
        if (!group.length) group = [el];
        idx = group.indexOf(el);
        if (idx < 0) idx = 0;
        overlay.classList.remove("hidden");
        document.body.style.overflow = "hidden";
        go(idx);
    }

    function close() {
        overlay.classList.add("hidden");
        document.body.style.overflow = "";
    }

    // ---- wire triggers (delegated, so it also covers pictures added later) ----
    document.addEventListener("click", (e) => {
        const trigger = e.target.closest(".js-lightbox");
        if (!trigger) return;
        e.preventDefault();
        if (!overlay) build();
        open(trigger);
    });

    // Expose for manual use if ever needed
    window.WBLightbox = { open: (el) => { if (!overlay) build(); open(el); }, close };
})();