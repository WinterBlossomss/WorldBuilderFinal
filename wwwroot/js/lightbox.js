// lightbox.js — fullscreen picture viewer (matches the "Picture 1/3" popup mock).
// Any clickable element with class "js-lightbox" and data-* attributes joins a gallery.
// Galleries are grouped by data-gallery; clicking opens at that item's index.
//
// Supported data attributes on each trigger:
//   data-gallery   grouping key (e.g. "script-42"); triggers with the same key share a strip
//   data-full      full-size image URL (falls back to the <img> src inside the trigger)
//   data-caption   caption shown centred over the image + used as the strip label
//   data-title     bold title shown in the bottom bar
//   data-meta      right-hand meta line ("From Lady Vellum · by @runeforge · uploaded …")
//   data-crumb     breadcrumb line ("Ashenmoor › Characters › Red Faction")
//   data-likes     like count (optional)
//   data-back      href for the "← back to script" button (optional; closes if absent)
(function () {
    "use strict";

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
        overlay.className = "hidden fixed inset-0 z-[200] flex flex-col bg-[#2b2723]/97 text-[#e9e3d6] font-['Kalam']";
        overlay.innerHTML = `
          <!-- top bar -->
          <div class="flex items-center gap-3 px-5 py-3 text-[13px] text-[#cfc7b6]">
            <span class="font-bold" id="lbCount">Picture 1 / 1</span>
            <span class="text-[#8f887a]">from</span>
            <span id="lbCrumb" class="truncate text-[#cfc7b6]"></span>
            <div class="flex-1"></div>
            <span id="lbLikes" class="hidden items-center gap-1 mr-1"></span>
            <button type="button" data-lb="prev" aria-label="Previous"
                    class="w-9 h-9 rounded-full border border-[#5a5347] flex items-center justify-center hover:bg-white/5">‹</button>
            <button type="button" data-lb="next" aria-label="Next"
                    class="w-9 h-9 rounded-full border border-[#5a5347] flex items-center justify-center hover:bg-white/5">›</button>
            <button type="button" data-lb="close" aria-label="Close"
                    class="w-9 h-9 rounded-full border border-[#5a5347] flex items-center justify-center hover:bg-white/5">✕</button>
          </div>

          <!-- stage -->
          <div class="relative flex-1 min-h-0 flex items-center justify-center px-14 select-none">
            <button type="button" data-lb="prev" aria-label="Previous"
                    class="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-[#5a5347] flex items-center justify-center text-xl hover:bg-white/5">‹</button>

            <figure class="m-0 max-h-full max-w-[70vw] w-full h-full flex items-center justify-center overflow-auto
                           border-[1.5px] border-dashed border-[#8f887a]/50
                           bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgba(233,227,214,0.05)_10px_11px)]">
              <div id="lbImgWrap" class="flex flex-col items-center justify-center text-center gap-3 p-6">
                <img id="lbImg" alt="" class="hidden max-h-[70vh] object-contain transition-transform duration-150" />
                <div id="lbCap" class="italic text-[19px] text-[#cfc7b6]"></div>
              </div>
            </figure>

            <button type="button" data-lb="next" aria-label="Next"
                    class="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-[#5a5347] flex items-center justify-center text-xl hover:bg-white/5">›</button>

            <!-- zoom pill -->
            <div class="absolute bottom-3 right-4 flex items-center gap-1 rounded-full border border-[#5a5347] bg-black/30 px-1.5 py-1 text-[12px]">
              <button type="button" data-lb="zoomout" class="w-6 h-6 rounded-full hover:bg-white/10">−</button>
              <span id="lbZoom" class="w-12 text-center">100%</span>
              <button type="button" data-lb="zoomin" class="w-6 h-6 rounded-full hover:bg-white/10">+</button>
              <button type="button" data-lb="zoomreset" class="w-6 h-6 rounded-full hover:bg-white/10" aria-label="Reset zoom">⤢</button>
            </div>
          </div>

          <!-- bottom info bar -->
          <div class="bg-[#1c1a17] border-t border-[#3a352d] px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-1">
            <div class="min-w-0">
              <div id="lbTitle" class="font-bold text-[17px] leading-tight truncate"></div>
              <div id="lbMeta" class="text-[12px] text-[#8f887a] leading-tight"></div>
              <div id="lbDims" class="text-[11px] text-[#6f685c] leading-tight"></div>
            </div>
            <div class="flex-1"></div>
            <a id="lbBack" href="#" data-lb="back"
               class="inline-flex items-center gap-1.5 rounded-md border border-[#5a5347] px-3 py-1.5 text-[13px] text-[#cfc7b6] no-underline hover:bg-white/5">
               ← back to script
            </a>
          </div>

          <!-- thumbnail strip -->
          <div id="lbThumbs" class="flex gap-2 justify-center bg-[#1c1a17] px-6 pb-4"></div>
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

    function setZoom(z) {
        zoom = Math.min(4, Math.max(0.5, Math.round(z * 100) / 100));
        elImg.style.transform = `scale(${zoom})`;
        elZoom.textContent = Math.round(zoom * 100) + "%";
    }

    function renderThumbs() {
        elThumbs.innerHTML = "";
        group.forEach((el, i) => {
            const t = document.createElement("button");
            t.type = "button";
            t.dataset.lb = "thumb";
            t.className = "relative w-24 shrink-0 text-left";
            const src = fullOf(el);
            t.innerHTML = `
              <div class="aspect-[4/3] overflow-hidden border ${i === idx ? "border-[#e9e3d6]" : "border-[#3a352d]"} ${i === idx ? "" : "opacity-60 hover:opacity-100"}
                          bg-[repeating-linear-gradient(135deg,transparent_0_8px,rgba(233,227,214,0.06)_8px_9px)] flex items-center justify-center">
                ${src ? `<img src="${src}" class="w-full h-full object-cover" alt="">`
                      : `<span class="text-[10px] text-[#8f887a]">no image</span>`}
                <span class="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-[11px] flex items-center justify-center">${i + 1}</span>
              </div>
              <div class="text-[10.5px] text-[#8f887a] truncate mt-1">${data(el, "caption") || data(el, "title") || "picture " + (i + 1)}</div>`;
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
