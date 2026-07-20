// Category → its subcategories
function loadSubCategories(catID, containerId, btn) {
    let container = document.getElementById(containerId);

    // swap the two chevrons on this button
    const toggleChevrons = () => {
        btn.querySelector('.chevron-down').classList.toggle('hidden');
        btn.querySelector('.chevron-right').classList.toggle('hidden');
    };

    if (container.dataset.loaded === 'true') {
        container.classList.toggle('hidden');
        toggleChevrons();
        return;
    }

    $.ajax({
        url: window.builderConfig.urls.subCategories,
        type: "GET",
        data: { catID: catID }
    }).done(function (res) {
        container.innerHTML = "";

        res.forEach(sub => {
            let scriptId = `scriptContainer-${sub.subIDPK}`;
            let div = document.createElement('div');
            div.className = "sidebar-sub p-3 ms-5 border-l border-dashed border-stone-300";
            div.dataset.subId = sub.subIDPK;   // drop target for re-nesting scripts
            div.innerHTML = `
                <div class="flex flex-row items-center gap-2">
                    <button class="flex flex-row gap-2 items-center cursor-pointer text-stone-700 hover:text-[#1c4551] transition-colors"
                            onclick="loadScripts(${sub.subIDPK}, 'scriptContainer-${sub.subIDPK}', this)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-down text-stone-500 flex-shrink-0 hidden">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-right text-stone-500 flex-shrink-0">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                        <h2 class="font-sans text-sm">${sub.subName}</h2>
                    </button>
                </div>
                <div id="${scriptId}" class="hidden"></div>
            `;
            container.appendChild(div);
        });

        // "+ New sub-category" row at the bottom
        let addDiv = document.createElement('div');
        addDiv.className = "p-3 ms-5 border-l border-dashed border-stone-300";
        addDiv.innerHTML = `
            <div class="flex flex-row items-center gap-2">
                <button class="flex flex-row gap-2 items-center cursor-pointer text-stone-600 hover:text-[#1c4551] transition-colors" onclick="showSubCategoryModal(${catID})">
                    <h2 class="font-sans text-sm italic">+ New sub-category</h2>
                </button>
            </div>
        `;
        container.appendChild(addDiv);

        container.dataset.loaded = 'true';
        container.classList.remove('hidden');
        toggleChevrons();   // flip to "down" on first open
    }).fail(function (xhr) {
        alert("Could not load subcategories: " + xhr.statusText);
    });
}

// Subcategory → its scripts
function loadScripts(subID, containerId, btn) {
    let container = document.getElementById(containerId);

    const toggleChevrons = () => {
        btn.querySelector('.chevron-down').classList.toggle('hidden');
        btn.querySelector('.chevron-right').classList.toggle('hidden');
    };

    if (container.dataset.loaded === 'true') {
        container.classList.toggle('hidden');
        toggleChevrons();
        return;
    }

    $.ajax({
        url: window.builderConfig.urls.scripts,
        type: "GET",
        data: { subID: subID }
    }).done(function (res) {
        container.innerHTML = "";

        res.forEach(script => {
            let div = document.createElement('div');
            div.className = "sidebar-script p-2 ms-5 border-l border-dashed border-stone-300 font-sans text-sm text-stone-700 select-none cursor-grab active:cursor-grabbing hover:bg-stone-100 transition-colors";
            div.draggable = true;
            div.dataset.scriptId = script.scriptIDPK;
            div.innerHTML = `
                <div class="flex flex-row items-center gap-2">
                    <span class="text-stone-300 text-xs">⠿</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:11px;height:11px;" class="text-stone-400 flex-shrink-0">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25" />
                    </svg>
                    <span class="font-sans text-sm">${script.scriptTitle}</span>
                </div>
            `;
            container.appendChild(div);
        });

        container.dataset.loaded = 'true';
        container.classList.remove('hidden');
        toggleChevrons();
    }).fail(function (xhr) {
        alert("Could not load scripts: " + xhr.statusText);
    });
}

// ======================================================================
//  Sidebar drag & drop — drop a script onto a sub-category to re-nest it
//  (delegated, so it also covers rows/subs loaded lazily after page load)
// ======================================================================
(function () {
    const sidebar = document.getElementById("categoryList");
    if (!sidebar) return;

    let dragEl = null;      // .sidebar-script being dragged
    let srcSub = null;      // sub-category id it came from
    let marked = null;

    const clearMark = () => {
        if (!marked) return;
        marked.style.outline = "";
        marked.style.outlineOffset = "";
        marked = null;
    };
    const markSub = el => {
        clearMark();
        el.style.outline = "2px solid #a3712a";
        el.style.outlineOffset = "-2px";
        marked = el;
    };

    sidebar.addEventListener("dragstart", e => {
        const row = e.target.closest(".sidebar-script");
        if (!row) return;
        dragEl = row;
        srcSub = row.closest(".sidebar-sub")?.dataset.subId || null;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", row.dataset.scriptId || "");
        requestAnimationFrame(() => row.classList.add("opacity-40"));
    });

    sidebar.addEventListener("dragend", () => {
        clearMark();
        dragEl?.classList.remove("opacity-40");
        dragEl = null;
        srcSub = null;
    });

    sidebar.addEventListener("dragover", e => {
        if (!dragEl) return;
        const sub = e.target.closest(".sidebar-sub");
        if (!sub) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        markSub(sub);
    });

    sidebar.addEventListener("drop", async e => {
        if (!dragEl) return;
        const sub = e.target.closest(".sidebar-sub");
        if (!sub) { clearMark(); return; }
        e.preventDefault();

        const row = dragEl;
        const subId = Number(sub.dataset.subId);
        if (String(subId) === String(srcSub)) { clearMark(); return; } // no-op

        // parent category id from the enclosing subCatContainer-<catId>
        const holder = sub.closest("[id^='subCatContainer-']");
        const catId = holder ? Number(holder.id.replace("subCatContainer-", "")) : null;

        const ok = await window.moveScript(row.dataset.scriptId, catId, subId);
        clearMark();
        if (!ok) { alert("Couldn't move this script."); return; }

        // reflect it in the tree: drop into the target's script list if it's
        // already loaded, otherwise just remove it (it'll appear when opened)
        const dest = document.getElementById(`scriptContainer-${subId}`);
        if (dest && dest.dataset.loaded === "true") dest.appendChild(row);
        else row.remove();
    });
})();