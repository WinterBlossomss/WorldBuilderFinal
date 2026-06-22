// relation-create.js — Related scripts panel (only active once the script is saved)
(function () {
    const cfg = window.builderConfig;
    if (!cfg.scriptId) return;   // create mode: panel shows the "save first" notice

    const $list = document.getElementById("relList");
    const $sub = document.getElementById("relSubtitle");
    const $search = document.getElementById("relSearchInput");
    const $results = document.getElementById("relSearchResults");
    const $pills = document.getElementById("relTypePills");
    const $add = document.getElementById("relAddBtn");

    let target = null;        // chosen script {id, title}
    let typeId = null;        // chosen relation type
    let types = [];

    const tok = () => document.querySelector('input[name="__RequestVerificationToken"]')?.value || "";

    // muted palette, colored client-side from the relation-type id
    const PALETTE = [
        { bg: "#dbe4ec", fg: "#3f6079" }, { bg: "#e6d6da", fg: "#7a2f3a" },
        { bg: "#d9e4d6", fg: "#4f7a52" }, { bg: "#e8e0cf", fg: "#8a7a3a" },
        { bg: "#e2dae8", fg: "#6b4a7a" }, { bg: "#e3d8cf", fg: "#7a5a3f" },
    ];
    const colorFor = id => PALETTE[id % PALETTE.length];

    // ---- existing links ----
    async function loadRelations() {
        const res = await fetch(`${cfg.urls.relForScript}?scriptId=${cfg.scriptId}`);
        const links = await res.json();
        $list.innerHTML = "";
        $sub.textContent = links.length
            ? `connected to → ${links.length} script${links.length > 1 ? "s" : ""}`
            : "nothing linked yet · connect this script to characters, places & factions";
        links.forEach(renderRow);
    }

    function renderRow(link) {
        const c = colorFor(link.connId);
        const row = document.createElement("div");
        row.className = "flex flex-row items-center justify-between border border-dashed rounded-lg px-3 py-2";
        row.innerHTML = `
            <div class="flex flex-row items-center gap-3 flex-wrap">
                <span class="text-sm text-gray-500">Connected to →</span>
                <span class="font-semibold underline">${link.otherTitle || "Untitled"}</span>
                <span class="text-sm text-gray-400">· HOW:</span>
                <span class="px-3 py-1 rounded-full text-sm font-semibold"
                      style="background:${c.bg};color:${c.fg}">${link.connDescr || "—"}</span>
            </div>
            <button type="button" class="text-gray-400 hover:text-black border rounded-full w-7 h-7 flex-shrink-0">×</button>`;
        row.querySelector("button").onclick = () => unlink(link.oneId, link.twoId, row);
        $list.appendChild(row);
    }

    async function unlink(oneId, twoId, row) {
        const res = await fetch(cfg.urls.relUnlink, {
            method: "POST",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": tok() },
            body: JSON.stringify({ oneId, twoId })
        });
        if (res.ok) { row.remove(); loadRelations(); }
    }

    // ---- relation types (the HOW pills) ----
    async function loadTypes() {
        const res = await fetch(cfg.urls.relTypes);
        types = await res.json();
        renderPills();
    }
    function renderPills() {
        $pills.innerHTML = "";
        types.forEach(t => {
            const c = colorFor(t.id);
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = t.descr;
            b.className = "px-3 py-1 rounded-full text-sm border cursor-pointer";
            b.style.background = typeId === t.id ? c.bg : "transparent";
            b.style.color = c.fg;
            b.onclick = () => { typeId = t.id; renderPills(); };
            $pills.appendChild(b);
        });
        const add = document.createElement("button");
        add.type = "button";
        add.textContent = "+ new";
        add.className = "px-3 py-1 rounded-full text-sm border border-dashed cursor-pointer text-gray-500";
        add.onclick = createType;
        $pills.appendChild(add);
    }
    async function createType() {
        const name = prompt('New relation type (e.g. "Allied with")');
        if (!name) return;
        const res = await fetch(cfg.urls.relCreateType, {
            method: "POST",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": tok() },
            body: JSON.stringify({ descr: name })
        });
        if (!res.ok) return;
        const t = await res.json();
        types.push(t); typeId = t.id; renderPills();
    }

    // ---- script search ----
    let timer;
    $search.addEventListener("input", e => {
        clearTimeout(timer);
        const q = e.target.value;
        timer = setTimeout(() => runSearch(q), 200);
    });
    async function runSearch(q) {
        const res = await fetch(`${cfg.urls.relSearch}?q=${encodeURIComponent(q)}&excludeId=${cfg.scriptId}`);
        const items = await res.json();
        $results.innerHTML = "";
        if (!items.length) { $results.classList.add("hidden"); return; }
        items.forEach(it => {
            const d = document.createElement("div");
            d.className = "px-3 py-2 hover:bg-gray-100 cursor-pointer";
            d.textContent = it.title || "Untitled";
            d.onclick = () => { target = it; $search.value = it.title || ""; $results.classList.add("hidden"); };
            $results.appendChild(d);
        });
        $results.classList.remove("hidden");
    }
    document.addEventListener("click", e => {
        if (!$search.contains(e.target) && !$results.contains(e.target)) $results.classList.add("hidden");
    });

    // ---- add a link ----
    $add.addEventListener("click", async () => {
        if (!target) { alert("Pick a script to connect."); return; }
        if (!typeId) { alert("Pick a relation (HOW)."); return; }
        const res = await fetch(cfg.urls.relLink, {
            method: "POST",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": tok() },
            body: JSON.stringify({ fromId: cfg.scriptId, toId: target.id, connId: typeId })
        });
        if (!res.ok) { alert((await res.json()).error || "Could not link."); return; }
        target = null; $search.value = "";
        loadRelations();
    });

    loadRelations();
    loadTypes();
})();