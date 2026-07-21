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
        <a href="/Script/Edit?id=${s.id}"
           class="group border border-stone-300 bg-stone-100 pb-4 flex flex-col justify-between h-full no-underline text-stone-900 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(33,28,20,0.10)] hover:border-[#1c4551]">
            <div>
                <div class="h-1.5 w-full" style="background:${catColor}"></div>
                <div class="px-4 pt-3">
                    <div class="font-sans text-[11px] uppercase tracking-[.14em] text-stone-500 mb-1">${label}</div>
                    <div class="font-serif text-lg font-semibold tracking-tight leading-tight mb-1">${s.title || "Untitled"}</div>
                    <div class="text-sm text-stone-500 leading-[1.45] line-clamp-2">${s.snippet || ""}</div>
                </div>
            </div>
            <div class="flex flex-row justify-between font-sans text-[11px] tracking-[.04em] text-stone-400 mt-4 px-4">
                <span>edited ${ago(s.edited)}</span>
                <span>↔ ${s.links} mentions</span>
            </div>
        </a>`;
    }

    function newScriptCard(catId, catName) {
        return `
        <a href="/Script/Create?catID=${catId}"
           class="border border-dashed border-stone-400 p-4 flex items-center justify-center text-stone-400 hover:border-[#a3712a] hover:text-[#a3712a] transition-colors min-h-[120px] no-underline">
            <div class="text-center">
                <div class="text-2xl leading-none">+</div>
                <div class="font-sans text-sm italic mt-1">new ${catName.toLowerCase()} script</div>
            </div>
        </a>`;
    }

    function categorySection(c) {
        return `
        <div class="mb-10" data-id="${c.id}">
            <div class="flex flex-row items-center justify-between mb-3 pb-2 border-b border-stone-300">
                <div class="flex flex-row items-center gap-2.5">
                    <span class="w-4 h-4 border border-stone-400" style="background:${c.color}"></span>
                    <h2 class="font-serif text-2xl font-semibold tracking-tight">${c.name}</h2>
                    <span class="font-sans text-xs tracking-[.06em] text-stone-400">${c.scripts.length} scripts</span>
                </div>
                <div class="flex flex-row items-center gap-2">
                    <button type="button"
                            class="border border-stone-300 px-3 py-1 text-sm font-sans text-stone-600 hover:bg-stone-100 cursor-pointer transition-colors"
                            onclick="navigateToScriptCreate(0, ${c.id})">
                        + new ${c.name.toLowerCase()}
                    </button>
                    <button type="button" class="border border-stone-300 w-8 h-8 flex items-center justify-center text-stone-500 hover:bg-stone-100 cursor-pointer transition-colors">
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
            <span class="font-sans text-[11px] tracking-[.22em] uppercase text-teal-900 mb-2">The Registry</span>
            <h2 class="font-serif text-3xl font-semibold tracking-tight mb-2">Nothing to show yet</h2>
            <p class="text-stone-500 mb-6 max-w-md">Add a category, then create scripts under it.</p>
            <button type="button" onclick="showCategoryModal()"
                    class="font-sans text-sm border border-stone-900 bg-stone-900 text-[#f0ebdf] px-5 py-2.5 hover:bg-[#1c4551] hover:border-[#1c4551] transition-colors">
                + Add a category
            </button>
        </div>`;
    }
    window.addCardCategory = function (cat) {
        if (!loaded) return;
        const section = categorySection({ id: cat.id, name: cat.name, color: cat.color, scripts: [] });
        const addBtn = tree.querySelector(":scope > button");   // the "+ New category" button
        if (addBtn) {
            addBtn.insertAdjacentHTML("beforebegin", section);
        } else {
            // Cards was showing the empty state → replace it with the first category + button
            meta.classList.add("hidden");
            tree.innerHTML = section + `
            <button type="button" onclick="showCategoryModal()"
                    class="w-full border border-dashed border-stone-400 py-3 font-sans text-sm text-stone-400 hover:border-[#a3712a] hover:text-[#a3712a] transition-colors">
                + New category
            </button>`;
        }
    };
    function render(data) {
        meta.classList.add("hidden");
        tree.innerHTML = data.totalCats === 0
            ? emptyStateHtml()
            : data.cats.map(categorySection).join("") + `
                <button type="button" onclick="showCategoryModal()"
                        class="w-full border border-dashed border-stone-400 py-3 font-sans text-sm text-stone-400 hover:border-[#a3712a] hover:text-[#a3712a] transition-colors">
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