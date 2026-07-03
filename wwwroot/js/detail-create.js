(function () {
    const cfg = window.builderConfig;
    if (!cfg.scriptId) return;   // saved-scripts-only

    // TESTINGGG

    const title = document.getElementById("detailTitle");
    const portrait = document.getElementById("detailPortrait");
    const portIn = document.getElementById("detailPortraitInput");
    const rowsEl = document.getElementById("detailRows");
    const addRow = document.getElementById("detailAddRow");
    const addSec = document.getElementById("detailAddSection");
    const enabled = document.getElementById("detailEnabled");
    const body = document.getElementById("detailBody");
    const hidden = document.getElementById("detailHiddenNote");

    let rows = []; // {name, content, isSection}
    let portraitPicId = null; // set after upload
    let portraitFile = null; // pending upload on save

    const tok = () => document.querySelector('input[name="__RequestVerificationToken"]')?.value || "";

    // ---- load existing ----
    async function load() {
        const res = await fetch(`${cfg.urls.detailForScript}?scriptId=${cfg.scriptId}`);
        const data = await res.json();
        title.value = data.title || "";
        enabled.checked = data.enabled !== false; // default on
        applyEnabled();
        if (data.picPath) setPortraitPreview(data.picPath, data.picId);
        rows = data.rows && data.rows.length ? data.rows : [
            { name: "Information", content: "", isSection: true }
        ];
        render();
    }

    // ---- render rows ----
    function render() {
        rowsEl.innerHTML = "";
        rows.forEach((r, i) => {
            // before starting a NEW section (that isn't the first row),
            // close off the previous section with its "+ Add row" line
            if (r.isSection && i > 0 && hasFieldsBefore(i)) {
                rowsEl.appendChild(addRowLine(i));   // i = index of the upcoming section
            }
            rowsEl.appendChild(r.isSection ? sectionEl(r, i) : fieldEl(r, i));
        });
    }

    // a "+ Add row" line that appends a field to the section ending at `beforeIndex`
    function addRowLine(beforeIndex) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "add-in-sec text-sm text-gray-500 py-2 hover:bg-gray-50 w-full";
        el.textContent = "+ Add row";
        el.onclick = () => {
            rows.splice(beforeIndex, 0, { name: "", content: "", isSection: false });
            render();
        };
        return el;
    }
    // are there any field rows between the previous section and index i?
    function hasFieldsBefore(i) {
        return i > 0 && !rows[i - 1].isSection;   // the row right before is a field
    }
    function hasSectionAfter(secIndex) {
        for (let i = secIndex + 1; i < rows.length; i++) {
            if (rows[i].isSection) return true;
        }
        return false;
    }
    function endOfSection(secIndex) {
        let i = secIndex + 1;
        while (i < rows.length && !rows[i].isSection) i++;
        return i;
    }
    function sectionEl(r, i) {
        const el = document.createElement("div");
        el.className = "bg-gray-100 border-y px-3 py-2 flex items-center justify-between";
        el.innerHTML = `
        <input class="bg-transparent font-semibold italic text-center w-full outline-none" value="">
        <button type="button" class="text-gray-400 hover:text-black ms-2">×</button>`;
        const input = el.querySelector("input");
        input.value = r.name || "";
        input.addEventListener("input", e => r.name = e.target.value);
        el.querySelector("button").onclick = () => { rows.splice(i, 1); render(); };
        return el;
    }

    function fieldEl(r, i) {
        const el = document.createElement("div");
        el.className = "flex flex-row border-b items-stretch";
        el.innerHTML = `
            <input class="w-1/3 border-e px-3 py-2 bg-gray-50 outline-none text-sm" placeholder="Add a field...">
            <textarea class="flex-grow px-3 py-2 outline-none text-sm resize-none" rows="1" placeholder="value..."></textarea>
            <button type="button" class="text-gray-400 hover:text-black px-2">×</button>`;
        const [nameIn, valIn] = [el.querySelector("input"), el.querySelector("textarea")];
        nameIn.value = r.name || "";
        valIn.value = r.content || "";
        nameIn.addEventListener("input", e => r.name = e.target.value);
        valIn.addEventListener("input", e => r.content = e.target.value);
        el.querySelector("button").onclick = () => { rows.splice(i, 1); render(); };
        return el;
    }

    addRow.addEventListener("click", () => { rows.push({ name: "", content: "", isSection: false }); render(); });
    addSec.addEventListener("click", () => { rows.push({ name: "New section", content: "", isSection: true }); render(); });

    // ---- portrait (local preview, upload on save) ----
    function setPortraitPreview(url, picId) {
        portraitPicId = picId ?? portraitPicId;
        portrait.style.backgroundImage = `url('${url}')`;
        portrait.style.backgroundSize = "cover";
        portrait.style.backgroundPosition = "center";
        portrait.querySelectorAll("div").forEach(d => d.style.display = "none");
    }
    portrait.addEventListener("click", () => portIn.click());
    portIn.addEventListener("change", e => {
        const f = e.target.files[0];
        if (!f) return;
        portraitFile = f;
        portraitPicId = null; // re-upload on save
        setPortraitPreview(URL.createObjectURL(f), null);
    });

    async function uploadPortrait() {
        if (!portraitFile) return portraitPicId; // unchanged
        const fd = new FormData();
        fd.append("file", portraitFile);
        fd.append("worldId", cfg.worldId);
        fd.append("caption", "");
        fd.append("__RequestVerificationToken", tok());
        const res = await fetch(cfg.urls.picUpload, { method: "POST", body: fd });
        if (!res.ok) return null;
        return (await res.json()).id;
    }

    // ---- save ----
    window.saveDetailNote = async function () {
        const picId = await uploadPortrait();
        if (picId === null && portraitFile) { alert("Portrait upload failed."); return false; }

        const res = await fetch(cfg.urls.detailSave, {
            method: "POST",
            headers: { "Content-Type": "application/json", "RequestVerificationToken": tok() },
            body: JSON.stringify({
                scriptId: cfg.scriptId,
                title: title.value,
                picId: picId,
                enabled: enabled.checked,
                rows: rows.filter(r => r.isSection || r.name || r.content)
            })
        });
        if (!res.ok) { alert("Could not save detail note: " + await res.text()); return false; }
        return true;
    };

    // --- Enable switc ---
    function applyEnabled() {
        const on = enabled.checked;
        body.classList.toggle("hidden", !on);
        hidden.classList.toggle("hidden", on);
    }
    enabled.addEventListener("change", applyEnabled);

    load();
})();