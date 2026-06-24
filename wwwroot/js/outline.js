// outline.js — lazy-loads the full outline when the Outline tab is first opened
(function () {
    const panel = document.getElementById("outlinePanel");
    if (!panel) return;

    let loaded = false;
    const tree = document.getElementById("outlineTree");
    const meta = document.getElementById("outlineMeta");

    const ago = dt => {
        const d = (Date.now() - new Date(dt)) / 1000;
        if (d >= 604800) return `${Math.floor(d / 604800)}w ago`;
        if (d >= 86400) return `${Math.floor(d / 86400)}d ago`;
        if (d >= 3600) return `${Math.floor(d / 3600)}h ago`;
        return "just now";
    };

    function scriptRow(s) {
        const tags = (s.tags || []).map(t =>
            `<span class="text-xs px-2 py-0.5 rounded-full border" style="border-color:${t.color}">${t.name}</span>`).join("");
        const tagNames = (s.tags || []).map(t => t.name.toLowerCase()).join(",");
        return `
        <a href="/Script/Edit/${s.id}" class="outline-row flex flex-row items-center justify-between py-1.5 px-2 ms-6 hover:bg-gray-50"
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
        meta.textContent = `${data.totalScripts} scripts · ${data.totalCats} categories · drag rows to reorder, drop on a parent to re-nest`;
        tree.innerHTML = data.cats.map(c => `
        <div class="outline-cat border-b" data-name="${c.name.toLowerCase()}">
            <div class="flex flex-row items-center justify-between py-2 px-2">
                <button class="cat-toggle flex flex-row items-center gap-2 cursor-pointer">
                    <span class="chev text-gray-500">▾</span>
                    
                    <span class="w-3 h-3 rounded-sm border" style="background:${c.color}"></span>
                    <span class="font-semibold italic">${c.name}</span>
                </button>
                <div class="flex flex-row items-center gap-3">
                    <span class="text-sm text-gray-400 italic">${c.scriptCount} scripts</span>
                    <button type="button"
                            class="border rounded-full px-3 py-0.5 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                            onclick="event.stopPropagation(); navigateToScriptCreate(0, ${c.id})">
                        + add
                    </button>
                </div>
            </div>
            <div class="cat-body">
                ${c.directScripts.map(scriptRow).join("")}
                ${c.subs.map(sub => `
                    <div class="outline-sub ms-4 border-s" data-name="${sub.name.toLowerCase()}">
                        <button class="sub-toggle flex flex-row items-center gap-2 py-2 px-2 cursor-pointer">
                            <span class="chev">▾</span>
                            <span class="font-medium">${sub.name}</span>
                            <span class="text-xs text-gray-400">${sub.scripts.length}</span>
                        </button>
                        <div class="sub-body">
                            ${sub.scripts.map(scriptRow).join("")}
                            <button type="button" class="outline-newscript text-sm text-gray-400 italic py-1.5 px-2 ms-6 hover:bg-gray-50 w-full text-left"
                                    onclick="navigateToScriptCreate(${sub.id}, ${c.id})">
                                + New script in ${sub.name}
                            </button>
                        </div>
                    </div>`).join("")}
            </div>
        </div>`).join("");
    }

    async function load() {
        if (loaded) return;
        loaded = true;
        const res = await fetch(`${window.builderConfig.urls.outlineData}?worldId=${panel.dataset.world}`);
        render(await res.json());
    }

    // load when the outline panel becomes visible (your tab switch toggles .hidden)
    const host = panel.closest('[data-panel="outline"]');
    if (host) {
        new MutationObserver(() => { if (!host.classList.contains("hidden")) load(); })
            .observe(host, { attributes: true, attributeFilter: ["class"] });
        if (!host.classList.contains("hidden")) load();   // already visible on page load
    } else {
        load();
    }

    // ---- interactions (delegated; survive re-render) ----
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

        // 2) hide sub-categories with no visible rows
        tree.querySelectorAll(".outline-sub").forEach(sub => {
            const anyRow = [...sub.querySelectorAll(".outline-row")].some(r => r.style.display !== "none");
            sub.style.display = anyRow ? "" : "none";
        });

        // 3) hide categories with no visible rows (direct OR inside any sub)
        tree.querySelectorAll(".outline-cat").forEach(cat => {
            const anyRow = [...cat.querySelectorAll(".outline-row")].some(r => r.style.display !== "none");
            cat.style.display = anyRow ? "" : "none";
        });

        // auto-expand groups that survived the filter so matches are visible
        tree.querySelectorAll(".outline-cat, .outline-sub").forEach(g => {
            if (g.style.display !== "none") {
                g.querySelectorAll(".cat-body, .sub-body").forEach(b => b.classList.remove("hidden"));
                g.querySelectorAll(".chev").forEach(c => c.textContent = "▾");
            }
        });

        tree.querySelectorAll(".outline-newscript").forEach(b => b.style.display = q ? "none" : "");
    });
    document.getElementById("outlineSort").addEventListener("click", e => {
        const btn = e.currentTarget, asc = btn.dataset.dir !== "asc";
        btn.dataset.dir = asc ? "asc" : "desc";
        btn.textContent = asc ? "Sort: A → Z" : "Sort: Z → A";
        [...tree.querySelectorAll(".outline-cat")]
            .sort((a, b) => a.dataset.name.localeCompare(b.dataset.name) * (asc ? 1 : -1))
            .forEach(c => tree.appendChild(c));
    });
})();