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

    // ---- notice modal ----
    const $notice = document.createElement("div");
    $notice.id = "relNoticeModal";
    $notice.className = "hidden fixed left-0 top-0 w-screen h-screen bg-black/30 justify-center items-center z-[120]";
    $notice.innerHTML = `
        <div class="bg-stone-100 border border-stone-300 shadow-[0_20px_60px_rgba(33,28,20,0.25)] p-8 w-[30%] max-w-md z-[120]">
            <div class="flex flex-row justify-between items-center border-b border-dashed border-stone-300 pb-3">
                <h2 id="relNoticeTitle" class="font-serif font-semibold text-2xl tracking-tight">Heads up</h2>
                <button id="relNoticeClose" class="text-stone-500 hover:text-stone-900 border border-stone-300 hover:bg-stone-200 w-10 h-10 grid place-items-center transition-colors">✕</button>
            </div>
            <p id="relNoticeText" class="py-4 font-sans text-stone-700"></p>
            <div class="flex flex-row justify-end">
                <button id="relNoticeOk" class="font-sans text-sm border border-stone-900 bg-stone-900 text-[#f0ebdf] hover:bg-[#1c4551] hover:border-[#1c4551] px-5 py-2.5 cursor-pointer transition-colors">Got it</button>
            </div>
        </div>`;
    document.body.appendChild($notice);

    const $noticeTitle = $notice.querySelector("#relNoticeTitle");
    const $noticeText = $notice.querySelector("#relNoticeText");

    function showNotice(title, message) {
        $noticeTitle.textContent = title || "Heads up";
        $noticeText.textContent = message || "";
        $notice.classList.remove("hidden");
        $notice.classList.add("flex");
    }
    function hideNotice() {
        $notice.classList.add("hidden");
        $notice.classList.remove("flex");
    }
    $notice.querySelector("#relNoticeClose").onclick = hideNotice;
    $notice.querySelector("#relNoticeOk").onclick = hideNotice;
    $notice.addEventListener("click", e => { if (e.target === $notice) hideNotice(); });

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
    function createType() {
        showConnModal();
    }

    async function submitNewType() {
        const name = $connInput.value.trim();
        if (!name) { $connInput.focus(); return; }

        const saveBtn = $connModal.querySelector("#relConnSave");
        saveBtn.disabled = true;
        try {
            const res = await fetch(cfg.urls.relCreateType, {
                method: "POST",
                headers: { "Content-Type": "application/json", "RequestVerificationToken": tok() },
                body: JSON.stringify({ descr: name })
            });
            if (!res.ok) {
                let msg = "Could not create this connection.";
                try { msg = (await res.json()).error || msg; } catch { /* non-JSON */ }
                hideConnModal();
                showNotice("Can't add connection", msg);
                return;
            }
            const t = await res.json();
            types.push(t);
            typeId = t.id;      // auto-select the new one
            renderPills();
            hideConnModal();
        } finally {
            saveBtn.disabled = false;
        }
    }

    // ---- new connection (relation type) modal ----
    const $connModal = document.createElement("div");
    $connModal.id = "relConnModal";
    $connModal.className = "hidden fixed left-0 top-0 w-screen h-screen bg-black/30 justify-center items-center z-[120]";
    $connModal.innerHTML = `
    <div class="bg-stone-100 border border-stone-300 shadow-[0_20px_60px_rgba(33,28,20,0.25)] p-8 w-[30%] max-w-md z-[120]">
        <div class="flex flex-row justify-between items-center border-b border-dashed border-stone-300 pb-3">
            <div>
                <span class="font-sans text-[11px] tracking-[.22em] uppercase text-teal-900">New Connection</span>
                <h2 class="font-serif font-semibold text-2xl tracking-tight">Add a relation type</h2>
            </div>
            <button id="relConnClose" class="text-stone-500 hover:text-stone-900 border border-stone-300 hover:bg-stone-200 w-10 h-10 grid place-items-center transition-colors">✕</button>
        </div>
        <div class="pb-1 pt-4">
            <div class="flex flex-row items-center gap-1">
                <div class="font-sans text-sm tracking-[.1em] uppercase text-stone-600">Name</div>
                <div class="text-[#a3712a]">*</div>
            </div>
        </div>
        <input id="relConnInput" maxlength="50" autocomplete="off" placeholder='e.g. "Allied with"'
               class="border border-stone-300 bg-white w-full px-3 py-2 mb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a3712a] focus-visible:outline-offset-2" />
        <div class="text-xs text-stone-500 italic pb-2">how the two scripts are related — up to 50 characters</div>
        <div class="flex flex-row justify-between mt-3">
            <button id="relConnCancel" class="font-sans text-sm border border-stone-300 text-stone-700 hover:bg-stone-200 px-5 py-2.5 cursor-pointer transition-colors">Cancel</button>
            <button id="relConnSave" class="font-sans text-sm border border-stone-900 bg-stone-900 text-[#f0ebdf] hover:bg-[#1c4551] hover:border-[#1c4551] px-5 py-2.5 cursor-pointer transition-colors">Create</button>
        </div>
    </div>`;
    document.body.appendChild($connModal);

    const $connInput = $connModal.querySelector("#relConnInput");

    function showConnModal() {
        $connInput.value = "";
        $connModal.classList.remove("hidden");
        $connModal.classList.add("flex");
        setTimeout(() => $connInput.focus(), 0);
    }
    function hideConnModal() {
        $connModal.classList.add("hidden");
        $connModal.classList.remove("flex");
    }
    $connModal.querySelector("#relConnClose").onclick = hideConnModal;
    $connModal.querySelector("#relConnCancel").onclick = hideConnModal;
    $connModal.addEventListener("click", e => { if (e.target === $connModal) hideConnModal(); });
    $connInput.addEventListener("keydown", e => {
        if (e.key === "Enter") { e.preventDefault(); submitNewType(); }
        if (e.key === "Escape") hideConnModal();
    });
    $connModal.querySelector("#relConnSave").onclick = submitNewType;

    // ---- script search (scoped to this world) ----
    let timer;
    $search.addEventListener("input", e => {
        clearTimeout(timer);
        const q = e.target.value;
        timer = setTimeout(() => runSearch(q), 200);
    });
    async function runSearch(q) {
        const res = await fetch(
            `${cfg.urls.relSearch}?q=${encodeURIComponent(q)}&excludeId=${cfg.scriptId}&worldId=${cfg.worldId}`
        );
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
        if (!target) { showNotice("Pick a script", "Choose a script to connect this one to."); return; }
        if (!typeId) { showNotice("Pick a relation", "Choose how these scripts are related (the HOW)."); return; }
        const res = await fetch(cfg.urls.relLink, {
            method: "POST",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": tok() },
            body: JSON.stringify({ fromId: cfg.scriptId, toId: target.id, connId: typeId })
        });
        if (!res.ok) {
            let msg = "Could not link.";
            try { msg = (await res.json()).error || msg; } catch { /* non-JSON */ }
            showNotice("Can't create this link", msg);   // e.g. "These scripts are already linked."
            return;
        }
        target = null; $search.value = "";
        loadRelations();
    });

    loadRelations();
    loadTypes();
})();