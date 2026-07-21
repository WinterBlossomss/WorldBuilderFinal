// import Quill from 'quill';
// import "quill/dist/quill.core.css";
// ----- TAGS -----
const cfg = window.builderConfig;

let selectedTagIds = new Set(); // tag ids applied to this script

const $search = document.getElementById("tagSearchInput");
const $count = document.getElementById("tagMatchCount");
const $match = document.getElementById("tagMatchContainer");
const $selected = document.getElementById("tagSelectedContainer");
const $nameIn = document.getElementById("tagNameInput");
const $allWorld = document.getElementById("tagAllWorlds");

function token() {
    const el = document.querySelector('input[name="__RequestVerificationToken"]');
    return el ? el.value : "";
}

function showTagModal() {
    document.getElementById("tagModal").style.display = "flex";
    loadTags("");
}
function hideTagModal() {
    document.getElementById("tagModal").style.display = "none";
}

// --- load + search ---
async function loadTags(q) {
    const url = `${cfg.urls.list}?worldId=${cfg.worldId}&q=${encodeURIComponent(q || "")}`;
    const res = await fetch(url);
    const data = await res.json();
    $count.textContent = `${data.matched} of ${data.total} match`;
    renderMatching(data.tags);
    renderSelected(data.tags);
}

let searchTimer;
$search?.addEventListener("input", e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadTags(e.target.value), 200);
});

// --- chip builders ---
function tagChip(tag, { removable } = {}) {
    const el = document.createElement("div");
    el.className = "flex flex-row items-center gap-2 py-1 px-2 border border-dashed rounded-full";

    el.innerHTML =
        `<span class="rounded-full p-1" style="background-color:${tag.color}"></span>` +
        `<span class="text-black text-base">${tag.name}</span>` +
        (typeof tag.count === "number" ? `<span class="text-sm text-gray-500">${tag.count}</span>` : "") +
        (selectedTagIds.has(tag.id) ? `<span>✓</span>` : "");

    if (removable) {
        const x = document.createElement("button");
        x.type = "button";
        x.textContent = "×";
        x.className = "ms-1 cursor-pointer text-gray-500 hover:text-black";
        x.onclick = (e) => { e.stopPropagation(); removeTag(tag.id); };
        el.appendChild(x);
        el.classList.add("cursor-default");
    } else {
        // matching list - clicking the whole chip toggles it
        el.className += " cursor-pointer";
        el.onclick = () => toggleTag(tag);
    }
    return el;
}

function removeTag(id) {
    selectedTagIds.delete(id);
    renderPageChips();
    if (document.getElementById("tagModal").style.display === "flex") {
        loadTags($search.value);   // refresh modal lists + ticks
    }
}

function renderMatching(tags) {
    $match.innerHTML = "";
    tags.forEach(t => $match.appendChild(tagChip(t)));
}

const tagCache = new Map();
function renderSelected(tags) {
    tags.forEach(t => tagCache.set(t.id, t));
    $selected.innerHTML = "";
    selectedTagIds.forEach(id => {
        const t = tagCache.get(id);
        if (t) $selected.appendChild(tagChip(t, { removable: true }));
    });
}
const $pageTags = document.getElementById("tagContainer");
const $addBtn = $pageTags.querySelector('button[onclick="showTagModal()"]');

function renderPageChips() {
    $pageTags.querySelectorAll("[data-pagechip]").forEach(n => n.remove());
    selectedTagIds.forEach(id => {
        const t = tagCache.get(id);
        if (!t) return;
        const chip = tagChip(t, { removable: true });
        chip.dataset.pagechip = "1";
        $pageTags.insertBefore(chip, $addBtn);
    });

    // show "none yet -" only when nothing is selected
    const noTags = document.getElementById("noTagsLabel");
    if (noTags) noTags.style.display = selectedTagIds.size > 0 ? "none" : "";
}

function toggleTag(tag) {
    tagCache.set(tag.id, tag);
    if (selectedTagIds.has(tag.id)) selectedTagIds.delete(tag.id);
    else selectedTagIds.add(tag.id);
    loadTags($search.value);
}

// ---- Tag color picker  ----
const TAG_PALETTE = ["#4f7a52", "#7a2f3a", "#8a7a3a", "#3f6079",
    "#7a5a3f", "#6b4a7a", "#000000"];

let newTagColor = TAG_PALETTE[0];

const $colors = document.getElementById("tagColorContainer");
const $preview = document.getElementById("tagColorPreview");

function tagDarken(hex, amount) {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
    return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
}

function selectTagColor(color, swatchEl) {
    newTagColor = color;
    $preview.style.backgroundColor = color;
    $colors.querySelectorAll("button[data-swatch]").forEach(b => b.style.outline = "none");
    if (swatchEl) {
        swatchEl.style.outline = `2px solid ${tagDarken(color, 60)}`;
        swatchEl.style.outlineOffset = "2px";
    }
}

function buildTagPalette() {
    $colors.className = "flex flex-row flex-wrap items-center";
    $preview.style.backgroundColor = newTagColor;

    TAG_PALETTE.forEach(color => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.swatch = color;
        btn.style.backgroundColor = color;
        btn.className = "w-8 h-8 inline-block m-1 border border-dashed rounded-full cursor-pointer";
        btn.addEventListener("mouseenter", () => btn.style.opacity = "0.75");
        btn.addEventListener("mouseleave", () => btn.style.opacity = "1");
        btn.addEventListener("click", () => selectTagColor(color, btn));
        $colors.appendChild(btn);
    });

    // custom color via the rainbow "+" button
    const colorPicker = document.createElement("label");
    colorPicker.className = "inline-flex items-center justify-center w-8 h-8 border border-dashed rounded-full cursor-pointer text-center";
    colorPicker.textContent = "+";
    colorPicker.style.backgroundImage = "url('/images/rainbow_gradient.jpg')";
    colorPicker.style.backgroundSize = "cover";
    colorPicker.style.backgroundPosition = "center";

    const input = document.createElement("input");
    input.type = "color";
    input.value = newTagColor;
    input.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
    input.addEventListener("input", () => selectTagColor(input.value, null));

    colorPicker.appendChild(input);
    $colors.appendChild(colorPicker);

    // ring the default swatch on load
    const first = $colors.querySelector("button[data-swatch]");
    if (first) selectTagColor(newTagColor, first);
}
buildTagPalette();

// --- create a brand-new tag ---
async function createTag() {
    const name = $nameIn.value.trim();
    if (!name) return;
    const res = await fetch(cfg.urls.create, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "RequestVerificationToken": token()
        },
        body: JSON.stringify({
            name,
            color: newTagColor,
            allWorlds: $allWorld.checked,
            worldId: cfg.worldId
        })
    });
    if (!res.ok) { console.error(await res.text()); return; }
    const tag = await res.json();
    selectedTagIds.add(tag.id);
    tagCache.set(tag.id, tag);
    $nameIn.value = "";
    loadTags($search.value);
}

// --- "Done": commit selection to the page + the form ---
function saveTag() {
    const form = document.getElementById("scriptForm");
    if (form) {
        form.querySelectorAll('input[name="tagIds"]').forEach(n => n.remove());
        selectedTagIds.forEach(id => {
            const h = document.createElement("input");
            h.type = "hidden"; h.name = "tagIds"; h.value = id;
            form.appendChild(h);
        });
    }
    renderPageChips();
    hideTagModal();
}
// const colors = ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#008000", "#800080", "#800000", "#000080", "#C0C0C0"];
// const container = document.getElementById("tagColorContainer");
// const preview = document.getElementById('tagColorPreview');
// const colorPreview = document.createElement('div');
// colorPreview.className = '';
// preview.appendChild(colorPreview);

// colors.forEach((color, i) => {
//     const colorDiv = document.createElement("button");
//     colorDiv.style.backgroundColor = color;
//     colorDiv.style.borderColor = borders[i];
//     colorDiv.className = "w-8 h-8 p-5 inline-block m-1 border-2 rounded-xl border-dashed cursor-pointer";
//     colorDiv.addEventListener('mouseenter', () => colorDiv.style.opacity = '0.75');
//     colorDiv.addEventListener('mouseleave', () => colorDiv.style.opacity = '1');

//     const darkBorder = darken(borders[i], 60);

//     colorDiv.addEventListener('focus', () => {
//         colorPreview.style.backgroundColor = color;
//     });
//     colorDiv.addEventListener('blur', () => {
//         colorDiv.style.backgroundColor = color;
//     });

//     container.appendChild(colorDiv);
// });
(function seedTags() {
    const raw = $pageTags.dataset.applied;
    if (!raw) return;
    try {
        JSON.parse(raw).forEach(t => {
            selectedTagIds.add(t.id);
            tagCache.set(t.id, t);
        });
        renderPageChips();
    } catch { }
})();

// ----- Editor -----

const editorContainer = document.getElementById("editorContainer");

const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
        toolbar: '#toolbar',
        history: {
            delay: 1000,
            maxStack: 100,
            userOnly: true
        }
    }
});

// const toolbar = quill.getModule('toolbar');
// const html = quill.getSemanticHTML(0);

// expose for the save
window.editorGetHtml = () => quill.getSemanticHTML(0);
window.syncTagInputs = function () {
    const form = document.getElementById('scriptForm');
    if (!form) return;
    form.querySelectorAll('input[name="tagIds"]').forEach(n => n.remove());
    selectedTagIds.forEach(id => {
        const h = document.createElement('input');
        h.type = 'hidden'; h.name = 'tagIds'; h.value = id; form.appendChild(h);
    });
};

window.quill = quill;

const saved = document.getElementById("savedContent");
if (saved && saved.innerHTML.trim()) {
    quill.clipboard.dangerouslyPasteHTML(saved.innerHTML);


}

// ----- Link selected text to a Script's Detail page -----
(function scriptLinkButton() {
    const btn = document.getElementById("characterLinkButton");
    if (!btn || !window.quill) return;

    const quill = window.quill;
    let savedRange = null;   // the selection captured when the button was clicked
    let panel = null;

    function ensurePanel() {
        if (panel) return panel;
        panel = document.createElement("div");
        panel.style.cssText =
            "position:absolute;z-index:1000;display:none;min-width:220px;max-height:280px;" +
            "overflow:auto;background:#fff;border:1px solid #d6d3cd;border-radius:8px;" +
            "box-shadow:0 12px 30px rgba(33,28,20,.18);padding:6px;";
        panel.innerHTML =
            `<input type="text" class="slp-search" placeholder="Search scripts…" ` +
            `style="width:100%;box-sizing:border-box;padding:6px 8px;margin-bottom:6px;` +
            `border:1px solid #d6d3cd;border-radius:6px;font-size:14px;">` +
            `<div class="slp-list"></div>`;
        document.body.appendChild(panel);

        panel.querySelector(".slp-search").addEventListener("input", e => {
            const q = e.target.value.toLowerCase();
            panel.querySelectorAll(".slp-item").forEach(el => {
                el.style.display = el.textContent.toLowerCase().includes(q) ? "" : "none";
            });
        });
        return panel;
    }

    function positionPanel() {
        const r = btn.getBoundingClientRect();
        panel.style.top = (window.scrollY + r.bottom + 4) + "px";
        panel.style.left = (window.scrollX + r.left) + "px";
    }

    function closePanel() { if (panel) panel.style.display = "none"; }

    async function loadScripts() {
        const list = panel.querySelector(".slp-list");
        list.innerHTML = `<div style="padding:6px 8px;color:#8a857c;font-size:13px;">Loading…</div>`;

        const url = `${cfg.urls.scriptsInWorld}?worldId=${cfg.worldId}&excludeId=${cfg.scriptId || 0}`;
        let scripts = [];
        try {
            scripts = await (await fetch(url)).json();
        } catch {
            list.innerHTML = `<div style="padding:6px 8px;color:#8a2f2a;font-size:13px;">Couldn't load scripts.</div>`;
            return;
        }

        if (!scripts.length) {
            list.innerHTML = `<div style="padding:6px 8px;color:#8a857c;font-size:13px;">No other scripts in this world yet.</div>`;
            return;
        }

        list.innerHTML = "";
        scripts.forEach(s => {
            const item = document.createElement("div");
            item.className = "slp-item";
            item.textContent = s.title || "(untitled)";
            item.style.cssText = "padding:6px 8px;border-radius:6px;cursor:pointer;font-size:14px;";
            item.addEventListener("mouseenter", () => item.style.background = "#f0ebdf");
            item.addEventListener("mouseleave", () => item.style.background = "");
            item.addEventListener("click", () => applyLink(s.id));
            list.appendChild(item);
        });
    }

    function applyLink(scriptId) {
        if (!savedRange || savedRange.length === 0) { closePanel(); return; }

        const base = cfg.urls && cfg.urls.detailPage;
        if (!base) {
            console.error("Script link: detailPage URL missing from builderConfig", cfg.urls);
            alert("Couldn't build the link — the detail page URL is missing.");
            return;
        }

        // base is an absolute path ("/Script/Details"), so it can't resolve against the current page
        const href = `${base}?scriptidpk=${encodeURIComponent(scriptId)}`;
        quill.formatText(savedRange.index, savedRange.length, "link", href, "user");
        quill.setSelection(savedRange.index + savedRange.length, 0);
        closePanel();
    }

    // preventDefault stops the button from stealing the editor's selection
    btn.addEventListener("mousedown", e => e.preventDefault());

    btn.addEventListener("click", () => {
        const range = quill.getSelection();
        if (!range || range.length === 0) {
            alert("Select some text first, then click this button to link it to a script.");
            return;
        }
        savedRange = range;
        ensurePanel();
        positionPanel();
        panel.style.display = "block";
        panel.querySelector(".slp-search").value = "";
        loadScripts();
        panel.querySelector(".slp-search").focus();
    });

    document.addEventListener("mousedown", e => {
        if (!panel || panel.style.display === "none") return;
        if (e.target === btn || panel.contains(e.target)) return;
        closePanel();
    });
})();