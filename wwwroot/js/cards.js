// cards.js — lazy-loads the card view (scripts grouped by category) when the Cards tab is first opened
(function () {
    const panel = document.getElementById("cardPanel");
    if (!panel) return;

    let loaded = false;
    const tree = document.getElementById("cardTree");
    const meta = document.getElementById("cardMeta");

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
        let duration = (new Date(dt) - Date.now()) / 1000;
        for (const { amount, unit } of DIVISIONS) {
            if (Math.abs(duration) < amount) return rtf.format(Math.round(duration), unit);
            duration /= amount;
        }
    };

    function scriptCard(catColor, s, catName) {
        const label = s.subName ? `${catName} · ${s.subName}` : catName;
        return `
        <a href="/Script/Edit?id=${s.id}" class="border rounded-lg pb-4 flex flex-col justify-between hover:shadow-sm bg-white h-full">
            <div>
                <div class="border-b-1 border-dashed p-2 w-full" style="background:${catColor}"></div>
                <div class="px-4 pt-3">
                    <div class="text-xs uppercase tracking-wide text-gray-400 mb-1">${label}</div>
                    <div class="text-lg font-semibold italic mb-1">${s.title || "Untitled"}</div>
                    <div class="text-sm text-gray-500 line-clamp-2">${s.snippet || ""}</div>
                </div>
            </div>
            <div class="flex flex-row justify-between text-xs text-gray-400 mt-4 px-4">
                <span>edited ${ago(s.edited)}</span>
                <span>↔ ${s.links} mentions</span>
            </div>
        </a>`;
    }

    function newScriptCard(catId, catName) {
        return `
        <a href="/Script/Create?catID=${catId}" class="border border-dashed rounded-lg p-4 flex items-center justify-center text-gray-400 hover:bg-gray-50 min-h-[120px]">
            <div class="text-center">
                <div class="text-2xl">+</div>
                <div class="text-sm italic">new ${catName.toLowerCase()} script</div>
            </div>
        </a>`;
    }

    function categorySection(c) {
        return `
        <div class="mb-8" data-id="${c.id}">
            <div class="flex flex-row items-center justify-between mb-2">
                <div class="flex flex-row items-center gap-2">
                    <span class="w-4 h-4 rounded-sm border" style="background:${c.color}"></span>
                    <h2 class="text-2xl italic">${c.name}</h2>
                    <span class="text-sm text-gray-400">${c.scripts.length} scripts</span>
                </div>
                <div class="flex flex-row items-center gap-2">
                    <button type="button"
                            class="border rounded-full px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"
                            onclick="navigateToScriptCreate(0, ${c.id})">
                        + new ${c.name.toLowerCase()}
                    </button>
                    <button type="button" class="border rounded-full w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer">
                        ⋯
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                ${c.scripts.map(s => scriptCard(c.color, s, c.name)).join("")}
                ${newScriptCard(c.id, c.name)}
            </div>
        </div>`;
    }

    function emptyStateHtml() {
        return `
        <div class="flex flex-col items-center text-center py-16 px-8">
            <h2 class="text-3xl italic mb-2">Nothing to show yet</h2>
            <p class="text-gray-400 italic mb-6 max-w-md">Add a category, then create scripts under it.</p>
            <button type="button" onclick="showCategoryModal()" class="bg-black text-white px-5 py-2.5 rounded-lg">+ Add a category</button>
        </div>`;
    }

    function render(data) {
        meta.classList.add("hidden");
        tree.innerHTML = data.totalCats === 0
            ? emptyStateHtml()
            : data.cats.map(categorySection).join("") + `
                <button type="button" onclick="showCategoryModal()"
                        class="w-full border border-dashed rounded-xl py-3 text-gray-400 hover:bg-gray-50">
                    + New category
                </button>`;
    }

    async function load() {
        if (loaded) return;
        loaded = true;
        meta.classList.remove("hidden");
        meta.textContent = "loading…";
        try {
            const res = await fetch(`${window.builderConfig.urls.cardData}?worldId=${panel.dataset.world}`);
            if (!res.ok) throw new Error(res.status);
            render(await res.json());
        } catch (e) {
            loaded = false;
            meta.classList.remove("hidden");
            meta.textContent = "Couldn't load cards — try again.";
        }
    }

    const host = panel.closest('[data-panel="cards"]');
    if (host) {
        new MutationObserver(() => {
            if (!host.classList.contains("hidden")) load();
        }).observe(host, { attributes: true, attributeFilter: ["class"] });
        if (!host.classList.contains("hidden")) load();
    } else {
        load();
    }
})();