// outline.js — lazy-loads the full outline when the Outline tab is first opened,
// and provides drag-and-drop: reorder rows, or drop a row on a category /
// sub-category to re-nest it (persisted via window.moveScript).
(function () {
    const panel = document.getElementById("outlinePanel");
    if (!panel) return;

    let loaded = false;
    const tree = document.getElementById("outlineTree");
    const meta = document.getElementById("outlineMeta");

    //Calculates time using Relative Time Format
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    const DIVISIONS = [
        { amount: 60, unit: 'second' },
        { amount: 60, unit: 'minute' },
        { amount: 24, unit: 'hour' },
        { amount: 7, unit: 'day' },
        { amount: 4.34524, unit: 'week' },
        { amount: 12, unit: 'month' },
        { amount: Infinity, unit: 'year' },
    ];

    const ago = dt => {
        let duration = (new Date(dt) - Date.now()) / 1000; // seconds; negative = past
        for (const { amount, unit } of DIVISIONS) {
            if (Math.abs(duration) < amount) return rtf.format(Math.round(duration), unit);
            duration /= amount;
        }
    };

    // loads rows of categories
    function scriptRow(s) {
        const tags = (s.tags || []).map(t =>
            `<span class="font-sans text-[11px] tracking-[.04em] px-2 py-0.5 border" style="border-color:${t.color}; color:${t.color}">${t.name}</span>`).join("");
        const tagNames = (s.tags || []).map(t => t.name.toLowerCase()).join(",");
        return `
        <a href="/Script/Edit?id=${s.id}" draggable="true" data-script-id="${s.id}"
           class="outline-row group flex flex-row items-center justify-between py-1.5 px-2 ms-6 no-underline text-stone-900 select-none cursor-grab active:cursor-grabbing hover:bg-stone-100 transition-colors"
           data-name="${(s.title || "untitled").toLowerCase()}" data-tags="${tagNames}">
            <div class="flex flex-row items-center gap-2">
                <span class="drag-dot text-stone-300 group-hover:text-stone-400 text-xs">⠿</span>
                <span class="text-stone-400 text-xs">↳</span>
                <span class="font-serif">${s.title || "Untitled"}</span>
            </div>
            <div class="flex flex-row items-center gap-3">
                <div class="flex flex-row gap-1">${tags}</div>
                <span class="font-sans text-[11px] text-stone-400 w-16 text-right">${ago(s.edited)}</span>
                <span class="font-sans text-[11px] text-stone-400">↔ ${s.links}</span>
            </div>
        </a>`;
    }

    function render(data) {
        meta.textContent = `${data.totalScripts} scripts · ${data.totalCats} categories · drag rows to reorder, drop on a parent to re-nest`;

        if (data.totalCats === 0) {
            tree.innerHTML = emptyStateHtml();
            return;
        }

        tree.innerHTML = data.cats.map(c => `
        <div class="outline-cat border-b border-stone-300" data-id="${c.id}" data-name="${c.name.toLowerCase()}">
            <div class="cat-head flex flex-row items-center justify-between py-2 px-2">
                <button class="cat-toggle flex flex-row items-center gap-2 cursor-pointer">
                    <span class="chev text-stone-500">▾</span>

                    <span class="w-3 h-3 border border-stone-400" style="background:${c.color}"></span>
                    <span class="font-serif font-semibold text-lg tracking-tight">${c.name}</span>
                </button>
                <div class="flex flex-row items-center gap-3">
                    <span class="cat-count font-sans text-xs tracking-[.04em] text-stone-400">${c.scriptCount} scripts</span>
                    <button type="button"
                            class="border border-stone-300 px-3 py-0.5 text-sm font-sans text-stone-600 hover:bg-stone-100 hover:text-[#1c4551] cursor-pointer transition-colors"
                            onclick="event.stopPropagation(); navigateToScriptCreate(0, ${c.id})">
                        + add
                    </button>
                    <button class="border border-[#8a2f2a]/40 px-3 py-0.5 text-sm font-sans text-[#8a2f2a] hover:bg-[#8a2f2a]/10 cursor-pointer transition-colors"
                            onclick="event.stopPropagation(); deleteCategory(${c.id})">
                        delete
                    </button>
                </div>
            </div>
            <div class="cat-body">
                ${c.directScripts.map(scriptRow).join("")}
                ${c.subs.map(sub => `
                    <div class="outline-sub ms-4 border-s border-stone-300" data-id="${sub.id}" data-name="${sub.name.toLowerCase()}">
                        <div class="sub-head flex flex-row items-center justify-between pe-2">
                            <button class="sub-toggle flex flex-row items-center gap-2 py-2 px-2 cursor-pointer">
                                <span class="chev text-stone-500">▾</span>
                                <span class="font-sans font-medium">${sub.name}</span>
                                <span class="sub-count font-sans text-xs text-stone-400">${sub.scripts.length}</span>
                            </button>
                            <button class="border border-[#8a2f2a]/40 px-2 py-0.5 text-sm font-sans text-[#8a2f2a] hover:bg-[#8a2f2a]/10 cursor-pointer transition-colors"
                                    onclick="event.stopPropagation(); deleteSubCategory(${sub.id})">
                                delete
                            </button>
                        </div>
                        <div class="sub-body">
                            ${sub.scripts.length ? sub.scripts.map(scriptRow).join("") : emptyRowHtml()}
                        </div>
                    </div>`).join("")}
                ${(!c.directScripts.length && !c.subs.length) ? emptyRowHtml() : ""}
            </div>
        </div>`).join("");
    }

    function emptyRowHtml() {
        return `<div class="outline-empty text-sm text-stone-400 italic py-2 ms-6">no scripts here yet</div>`;
    }

    function emptyStateHtml() {
        return `
    <div class="flex flex-col items-center text-center py-16 px-8">
        <div class="flex flex-col items-center gap-2 mb-6 text-stone-300">
            <div class="w-40 border-t border-dashed border-stone-300"></div>
            <div class="w-32 border-t border-dashed border-stone-300 ms-6"></div>
            <div class="flex flex-row items-center gap-2 ms-10">
                <div class="w-20 border-t border-dashed border-stone-300"></div>
                <div class="w-6 h-6 bg-stone-900 text-[#f0ebdf] flex items-center justify-center text-sm">+</div>
            </div>
        </div>
        <h2 class="font-serif text-3xl font-semibold tracking-tight mb-2">Nothing to outline yet</h2>
        <p class="text-stone-500 mb-6 max-w-md">
            Add a category, then nest sub-categories and scripts under it. Drag to reorder anytime.
        </p>
        <div class="flex flex-row gap-3">
            <button type="button" onclick="showCategoryModal()" class="font-sans text-sm border border-stone-900 bg-stone-900 text-[#f0ebdf] px-5 py-2.5 hover:bg-[#1c4551] hover:border-[#1c4551] transition-colors">+ Add a category</button>
            <button type="button" onclick="openImportWorldModal()" class="font-sans text-sm border border-stone-300 px-5 py-2.5 text-stone-700 hover:bg-stone-100 transition-colors">Import from another world</button>
        </div>
    </div>`;
    }

    // loads outline - gives render the json from db
    async function load() {
        if (loaded) return;
        loaded = true;
        try {
            const res = await fetch(`${window.builderConfig.urls.outlineData}?worldId=${panel.dataset.world}`);
            if (!res.ok) throw new Error(res.status);
            render(await res.json());
        } catch (e) {
            loaded = false;            // allow a retry on next open
            meta.textContent = "Couldn't load outline — try again.";
        }
    }

    // load when the outline panel becomes visible (tab switch toggles .hidden)
    const host = panel.closest('[data-panel="outline"]');
    if (host) {
        //watches host for changes
        new MutationObserver(() => {
            if (!host.classList.contains("hidden")) load();
        })
            .observe(host, { attributes: true, attributeFilter: ["class"] });
        if (!host.classList.contains("hidden")) load();   // already visible on page load
    } else {
        load();
    }

    // ======================================================================
    //  Drag & drop  —  reorder rows / drop on a category or sub to re-nest
    // ======================================================================
    let dragEl = null;      // the .outline-row being dragged
    let dragSrc = null;     // { catId, subId } it started in
    let marked = null;      // element currently showing a drop indicator

    function parentInfo(el) {
        const sub = el.closest(".outline-sub");
        const cat = el.closest(".outline-cat");
        return {
            catId: cat ? Number(cat.dataset.id) : null,
            subId: sub ? Number(sub.dataset.id) : 0
        };
    }

    // Where would a drop land, given the hovered element?
    function dropZone(target) {
        const row = target.closest(".outline-row");
        if (row && row !== dragEl) return { type: "row", el: row };
        const sub = target.closest(".outline-sub");
        if (sub) return { type: "sub", el: sub };
        const cat = target.closest(".outline-cat");
        if (cat) return { type: "cat", el: cat };
        return null;
    }

    function clearMark() {
        if (!marked) return;
        marked.style.boxShadow = "";
        marked.style.outline = "";
        marked.style.outlineOffset = "";
        marked = null;
    }

    function markRow(row, after) {
        clearMark();
        row.style.boxShadow = after ? "inset 0 -2px 0 #a3712a" : "inset 0 2px 0 #a3712a";
        marked = row;
    }

    function markBox(el) {
        clearMark();
        el.style.outline = "2px solid #a3712a";
        el.style.outlineOffset = "-2px";
        marked = el;
    }

    tree.addEventListener("dragstart", e => {
        const row = e.target.closest(".outline-row");
        if (!row) return;
        dragEl = row;
        dragSrc = parentInfo(row);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", row.dataset.scriptId || "");
        requestAnimationFrame(() => row.classList.add("opacity-40"));
    });

    tree.addEventListener("dragend", () => {
        clearMark();
        dragEl?.classList.remove("opacity-40");
        dragEl = null;
        dragSrc = null;
    });

    tree.addEventListener("dragover", e => {
        if (!dragEl) return;
        const zone = dropZone(e.target);
        if (!zone) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (zone.type === "row") {
            const r = zone.el.getBoundingClientRect();
            markRow(zone.el, (e.clientY - r.top) > r.height / 2);
        } else {
            markBox(zone.el);
        }
    });

    tree.addEventListener("drop", async e => {
        if (!dragEl) return;
        const zone = dropZone(e.target);
        if (!zone) { clearMark(); return; }
        e.preventDefault();

        const row = dragEl;                 // capture before dragend nulls it
        const src = dragSrc;
        let catId, subId, ref = null, after = false;

        if (zone.type === "row") {
            const info = parentInfo(zone.el);
            catId = info.catId; subId = info.subId;
            const r = zone.el.getBoundingClientRect();
            after = (e.clientY - r.top) > r.height / 2;
            ref = zone.el;
        } else if (zone.type === "sub") {
            subId = Number(zone.el.dataset.id);
            catId = Number(zone.el.closest(".outline-cat").dataset.id);
        } else { // cat
            catId = Number(zone.el.dataset.id);
            subId = 0;
        }

        const changedParent = catId !== src.catId || subId !== src.subId;

        // persist the re-parent (reordering within a parent has no column to save to)
        if (changedParent) {
            const ok = await window.moveScript(row.dataset.scriptId, catId, subId);
            if (!ok) { clearMark(); alert("Couldn't move this script."); return; }
        }

        // move it in the DOM
        if (zone.type === "row") {
            after ? ref.after(row) : ref.before(row);
        } else if (zone.type === "sub") {
            zone.el.querySelector(".sub-body").appendChild(row);
        } else {
            const body = zone.el.querySelector(".cat-body");
            const firstSub = body.querySelector(".outline-sub");
            firstSub ? body.insertBefore(row, firstSub) : body.appendChild(row);
        }

        clearMark();
        refreshEmpties();
        recount();
    });

    // add/remove "no scripts here yet" placeholders after a move
    function refreshEmpties() {
        tree.querySelectorAll(".outline-sub").forEach(sub => {
            const body = sub.querySelector(".sub-body");
            if (!body) return;
            const rows = body.querySelectorAll(".outline-row").length;
            const ph = body.querySelector(".outline-empty");
            if (rows === 0 && !ph) body.insertAdjacentHTML("beforeend", emptyRowHtml());
            if (rows > 0 && ph) ph.remove();
        });
        tree.querySelectorAll(".outline-cat").forEach(cat => {
            const body = cat.querySelector(".cat-body");
            if (!body) return;
            const directRows = [...body.children].filter(c => c.classList && c.classList.contains("outline-row")).length;
            const hasSub = !!body.querySelector(".outline-sub");
            const ph = [...body.children].find(c => c.classList && c.classList.contains("outline-empty"));
            if (directRows === 0 && !hasSub && !ph) body.insertAdjacentHTML("beforeend", emptyRowHtml());
            if ((directRows > 0 || hasSub) && ph) ph.remove();
        });
    }

    // recompute the "N scripts" counters on categories and sub-categories
    function recount() {
        tree.querySelectorAll(".outline-cat").forEach(cat => {
            const n = cat.querySelectorAll(".outline-row").length;
            const span = cat.querySelector(".cat-count");
            if (span) span.textContent = `${n} scripts`;
        });
        tree.querySelectorAll(".outline-sub").forEach(sub => {
            const n = sub.querySelectorAll(".outline-row").length;
            const span = sub.querySelector(".sub-count");
            if (span) span.textContent = n;
        });
    }

    // ---- interactions ----
    tree.addEventListener("click", e => {
        const cat = e.target.closest(".cat-toggle"), sub = e.target.closest(".sub-toggle");
        const body = cat ? cat.closest(".outline-cat").querySelector(".cat-body")
            : sub ? sub.closest(".outline-sub").querySelector(".sub-body") : null;
        if (!body) return;
        body.classList.toggle("hidden");
        (cat || sub).querySelector(".chev").textContent = body.classList.contains("hidden") ? "▸" : "▾";
    });
    document.getElementById("outlineExpandAll").addEventListener("click", () => {
        tree.querySelectorAll(".cat-body,.sub-body").forEach(b => b.classList.remove("hidden"));
        tree.querySelectorAll(".chev").forEach(c => c.textContent = "▾");
    });
    document.getElementById("outlineCollapseAll").addEventListener("click", () => {
        tree.querySelectorAll(".cat-body, .sub-body").forEach(b => b.classList.add("hidden"));
        tree.querySelectorAll(".chev").forEach(c => c.textContent = "▸");
    });

    document.getElementById("outlineFilter").addEventListener("input", e => {
        const q = e.target.value.trim().toLowerCase();

        // 1) rows: show those matching title or tag
        tree.querySelectorAll(".outline-row").forEach(r => {
            const hit = !q || r.dataset.name.includes(q) || (r.dataset.tags || "").includes(q);
            r.style.display = hit ? "" : "none";
        });

        // when the box is empty, restore everything and stop
        if (!q) {
            tree.querySelectorAll(".outline-sub, .outline-cat").forEach(g => g.style.display = "");
            return;
        }

        // hide sub-categories with no visible rows
        tree.querySelectorAll(".outline-sub").forEach(sub => {
            const anyRow = [...sub.querySelectorAll(".outline-row")].some(r => r.style.display !== "none");
            sub.style.display = anyRow ? "" : "none";
        });

        // hide categories with no visible rows (direct OR inside any sub)
        tree.querySelectorAll(".outline-cat").forEach(cat => {
            const anyRow = [...cat.querySelectorAll(".outline-row")].some(r => r.style.display !== "none");
            cat.style.display = anyRow ? "" : "none";
        });

        // for no results
        const noResults = document.getElementById("outlineNoResults");
        if (!q) {
            noResults.classList.add("hidden");
            return;
        }
        const anyCatVisible = [...tree.querySelectorAll(".outline-cat")].some(c => c.style.display !== "none");
        noResults.classList.toggle("hidden", anyCatVisible);
        noResults.textContent = anyCatVisible ? "" : `No scripts match "${e.target.value}"`;

        // auto-expand groups that survived the filter so matches are visible
        tree.querySelectorAll(".outline-cat, .outline-sub").forEach(g => {
            if (g.style.display !== "none") {
                g.querySelectorAll(".cat-body, .sub-body").forEach(b => b.classList.remove("hidden"));
                g.querySelectorAll(".chev").forEach(c => c.textContent = "▾");
            }
        });

        // display new script button
        tree.querySelectorAll(".outline-newscript").forEach(b => b.style.display = q ? "none" : "");
    });

    //Sorts A -> Z OR Z -> A
    document.getElementById("outlineSort").addEventListener("click", e => {
        const btn = e.currentTarget, asc = btn.dataset.dir !== "asc";
        btn.dataset.dir = asc ? "asc" : "desc";
        btn.textContent = asc ? "Sort: A → Z" : "Sort: Z → A";
        [...tree.querySelectorAll(".outline-cat")]
            .sort((a, b) => a.dataset.name.localeCompare(b.dataset.name) * (asc ? 1 : -1))
            .forEach(c => tree.appendChild(c));
    });
})();