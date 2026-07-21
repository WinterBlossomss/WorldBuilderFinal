// picture-create.js — hold pictures locally, upload only on Save
(function () {
    const cfg = window.builderConfig;
    let pictures = [];     // {uid, file, url, caption} — order = display order, [0] = main
    let uid = 0;

    const $grid = document.getElementById("pictureGrid");
    const $drop = document.getElementById("pictureDrop");
    const $browse = document.getElementById("pictureBrowse");
    const $subtitle = document.getElementById("pictureSubtitle");

    // highlight classes toggled while dragging over the zone
    const HL = ["border-teal-900", "bg-stone-200", "text-teal-900"];

    function tok() {
        const el = document.querySelector('input[name="__RequestVerificationToken"]');
        return el ? el.value : "";
    }

    // ---- add files (local only) ----
    function addFiles(fileList) {
        for (const file of fileList) {
            if (!file.type.startsWith("image/")) continue;
            pictures.push({ uid: ++uid, file, url: URL.createObjectURL(file), caption: "" });
        }
        render();
    }

    function removePicture(id) {
        const p = pictures.find(x => x.uid === id);
        if (p) URL.revokeObjectURL(p.url);
        pictures = pictures.filter(x => x.uid !== id);
        render();
    }

    function replacePicture(id, file) {
        const p = pictures.find(x => x.uid === id);
        if (!p || !file) return;
        if (p.url && p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
        p.file = file;
        p.id = null;
        p.url = URL.createObjectURL(file);
        render();
    }

    function setCaption(id, text) {
        const p = pictures.find(x => x.uid === id);
        if (p) p.caption = text;   // stays local until Save
    }

    // ---- render ----
    function render() {
        $grid.querySelectorAll(".picture-card").forEach(n => n.remove());
        pictures.forEach((p, i) => $grid.insertBefore(card(p, i), $drop));

        if (pictures.length === 0) {
            $subtitle.textContent = "0 attached · the first picture you add becomes the script's main image";
            $drop.classList.add("col-span-6");
            $drop.style.aspectRatio = "";
            $drop.style.minHeight = "12rem";
        } else {
            $subtitle.textContent = `${pictures.length} attached · drag to reorder · first picture is the script's main image`;
            $drop.classList.remove("col-span-6");
            $drop.style.aspectRatio = "3/2";
            $drop.style.minHeight = "";
        }
    }

    function card(p, index) {
        const el = document.createElement("div");
        el.className = "picture-card flex flex-col gap-2 w-full";
        el.draggable = true;
        el.dataset.id = p.uid;
        el.innerHTML = `
            <div class="relative border border-stone-300 bg-stone-50 overflow-hidden" style="aspect-ratio:3/2;">
                <img src="${p.url}" class="absolute inset-0 w-full h-full object-cover">
                <div class="absolute top-2 right-2 flex flex-row items-center gap-1.5">
                    <label class="bg-stone-100 border border-stone-300 px-3 py-1 text-[11px] font-sans uppercase tracking-[.06em] text-stone-700 cursor-pointer hover:border-teal-900 hover:text-teal-900 transition-colors">
                        Replace
                        <input type="file" accept="image/*" class="hidden replace-input">
                    </label>
                    <button type="button" class="bg-stone-100 border border-stone-300 w-6 h-6 flex items-center justify-center text-xs text-stone-700 cursor-pointer hover:border-teal-900 hover:text-teal-900 transition-colors remove-btn">×</button>
                </div>
                ${index === 0
                ? `<div class="absolute bottom-2 left-2 bg-stone-900 text-[#f0ebdf] text-[11px] font-sans uppercase tracking-[.1em] px-3 py-1">main</div>`
                : ""}
            </div>
            <div class="border border-stone-300 bg-white p-2">
                <textarea class="caption w-full text-sm italic font-serif text-stone-700 bg-transparent outline-none resize-none" rows="2" placeholder="Add a caption..."></textarea>
            </div>
        `;
        el.querySelector(".caption").value = p.caption || "";
        el.querySelector(".remove-btn").onclick = () => removePicture(p.uid);
        el.querySelector(".replace-input").onchange = e => e.target.files[0] && replacePicture(p.uid, e.target.files[0]);
        el.querySelector(".caption").addEventListener("input", e => setCaption(p.uid, e.target.value));
        addDrag(el);
        return el;
    }

    // ---- drag reorder ----
    let dragId = null;
    function addDrag(el) {
        el.addEventListener("dragstart", () => { dragId = +el.dataset.id; el.classList.add("opacity-50"); });
        el.addEventListener("dragend", () => el.classList.remove("opacity-50"));
        el.addEventListener("dragover", e => e.preventDefault());
        el.addEventListener("drop", e => {
            e.preventDefault();
            const targetId = +el.dataset.id;
            if (dragId == null || dragId === targetId) return;
            const from = pictures.findIndex(p => p.uid === dragId);
            const to = pictures.findIndex(p => p.uid === targetId);
            const [moved] = pictures.splice(from, 1);
            pictures.splice(to, 0, moved);
            render();
        });
    }

    // ---- upload everything on Save ----
    async function uploadAll() {
        const ids = [];
        for (const p of pictures) {
            if (p.id) { ids.push(p.id); continue; }   // already saved, reuse
            const fd = new FormData();
            fd.append("file", p.file);
            fd.append("worldId", cfg.worldId);
            fd.append("caption", p.caption || "");
            fd.append("__RequestVerificationToken", tok());
            const res = await fetch(cfg.urls.picUpload, { method: "POST", body: fd });
            if (!res.ok) { alert(`Picture upload failed (${res.status}): ${await res.text()}`); return null; }
            ids.push((await res.json()).id);
        }
        return ids;
    }

    // expose for the save orchestrator
    window.uploadPictures = uploadAll;

    // ---- wiring ----
    $browse.addEventListener("change", e => addFiles(e.target.files));
    $drop.addEventListener("click", () => $browse.click());

    ["dragenter", "dragover"].forEach(ev =>
        $drop.addEventListener(ev, e => {
            e.preventDefault(); e.stopPropagation();
            $drop.classList.add(...HL);
        }));

    $drop.addEventListener("dragleave", e => {
        e.preventDefault(); e.stopPropagation();
        // ignore leave events fired when moving onto a child element
        if (!$drop.contains(e.relatedTarget)) $drop.classList.remove(...HL);
    });

    // The one and only drop handler — adds the files.
    $drop.addEventListener("drop", async e => {
        e.preventDefault(); e.stopPropagation();
        $drop.classList.remove(...HL);

        // 1. Real file(s) dropped from the OS
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
            addFiles(e.dataTransfer.files);
            return;
        }

        // 2. Image dragged from another web page — only a URL is available
        const url = e.dataTransfer.getData("text/uri-list")
            || e.dataTransfer.getData("text/plain");
        if (!url) return;

        try {
            const res = await fetch(url);
            const blob = await res.blob();
            if (!blob.type.startsWith("image/")) return;

            const name = (url.split("/").pop() || "image").split("?")[0];
            const dt = new DataTransfer();
            dt.items.add(new File([blob], name, { type: blob.type }));
            addFiles(dt.files);
        } catch (err) {
            console.error(err);
            alert("Could not load that image from the web (likely CORS). Save it and drop the file, or use browse.");
        }
    });

    // seed existing pictures from the server-rendered data
    (function seedPictures() {
        const raw = $grid.dataset.existing;
        if (!raw) return;
        try {
            JSON.parse(raw).forEach(p => {
                pictures.push({ uid: ++uid, id: p.id, file: null, url: p.path, caption: p.caption || "" });
            });
        } catch (e) { console.error("seed failed", e); }
    })();

    render();
})();