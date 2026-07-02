// outline.js — lazy-loads the full outline when the Outline tab is first opened
// lazy load - only load when it is needed
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
            `<span class="text-xs px-2 py-0.5 rounded-full border" style="border-color:${t.color}">${t.name}</span>`).join("");
        const tagNames = (s.tags || []).map(t => t.name.toLowerCase()).join(",");
        return `
        <a href="/Script/Edit?id=${s.id}"  class="outline-row flex flex-row items-center justify-between py-1.5 px-2 ms-6 hover:bg-gray-50"
           data-name="${(s.title || "untitled").toLowerCase()}" data-tags="${tagNames}">
            <div class="flex flex-row items-center gap-2">
                <span class="text-gray-400 text-xs">↳</span>
                <span class="italic">${s.title || "Untitled"}</span>
            </div>
            <div class="flex flex-row items-center gap-3">
                <div class="flex flex-row gap-1">${tags}</div>
                <span class="text-xs text-gray-400 w-16 text-right">${ago(s.edited)}</span>
                <span class="text-xs text-gray-400">↔ ${s.links}</span>
            </div>
        </a>`;
    }

    function render(data) {
        //totalScripts
        //totalCats
        //cats = tree
        meta.textContent = `${data.totalScripts} scripts · ${data.totalCats} categories · drag rows to reorder, drop on a parent to re-nest`;

        if (data.totalCats === 0) {
            tree.innerHTML = emptyStateHtml();
            return;
        }

        tree.innerHTML = data.cats.map(c => `
        <div class="outline-cat border-b" data-id="${c.id}" data-name="${c.name.toLowerCase()}">
            <div class="flex flex-row items-center justify-between py-2 px-2">
                <button class="cat-toggle flex flex-row items-center gap-2 cursor-pointer">
                    <span class="chev text-gray-500">▾</span>
                    
                    <span class="w-3 h-3 rounded-sm border" style="background:${c.color}"></span>
                    <span class="font-semibold italic">${c.name}</span>
                </button>
                <div class="flex flex-row items-center gap-3">
                    <span class="text-sm text-gray-400 italic">${c.scriptCount} scripts</span>
                    <button type="button"
                            class="border rounded-full px-3 py-0.5 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer" style="border-color:#66FF00 "
                            onclick="event.stopPropagation(); navigateToScriptCreate(0, ${c.id})">
                        + add
                    </button>
                    <button class="border rounded-full px-3 py-0.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                            onclick="event.stopPropagation(); deleteCategory(${c.id})">
                        delete
                    </button>
                </div>
            </div>
            <div class="cat-body">
                ${c.directScripts.map(scriptRow).join("")}
                ${c.subs.map(sub => `
                    <div class="outline-sub ms-4 border-s" data-id="${sub.id}" data-name="${sub.name.toLowerCase()}">
                        <div class="flex flex-row items-center justify-between pe-2">
                            <button class="sub-toggle flex flex-row items-center gap-2 py-2 px-2 cursor-pointer">
                                <span class="chev">▾</span>
                                <span class="font-medium">${sub.name}</span>
                                <span class="text-xs text-gray-400">${sub.scripts.length}</span>
                            </button>
                            <button class="border rounded-full px-2 py-0.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
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
        return `<div class="text-sm text-gray-400 italic py-2 ms-6">no scripts here yet</div>`;
    }

    function emptyStateHtml() {
        return `
    <div class="flex flex-col items-center text-center py-16 px-8">
        <div class="flex flex-col items-center gap-2 mb-6 text-gray-300">
            <div class="w-40 border-t border-dashed"></div>
            <div class="w-32 border-t border-dashed ms-6"></div>
            <div class="flex flex-row items-center gap-2 ms-10">
                <div class="w-20 border-t border-dashed"></div>
                <div class="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-sm">+</div>
            </div>
        </div>
        <h2 class="text-3xl italic mb-2">Nothing to outline yet</h2>
        <p class="text-gray-400 italic mb-6 max-w-md">
            Add a category, then nest sub-categories and scripts under it. Drag to reorder anytime.
        </p>
        <div class="flex flex-row gap-3">
            <button type="button" onclick="showCategoryModal()" class="bg-black text-white px-5 py-2.5 rounded-lg">+ Add a category</button>
            <button type="button" onclick="openImportWorldModal()" class="border px-5 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50">Import from another world</button>
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