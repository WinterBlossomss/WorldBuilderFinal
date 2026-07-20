(function () {
    const cfg = window.builderConfig || {};
    const urls = cfg.urls || {};

    const viewport = document.getElementById('boardViewport');
    const world = document.getElementById('boardWorld');
    const svg = document.getElementById('boardLines');
    if (!viewport || !world || !svg) return; // board panel not on the page

    const SVGNS = 'http://www.w3.org/2000/svg';
    const cards = () => Array.from(world.querySelectorAll('.board-card'));
    const token = () => document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';

    let links = [];          // [{ oneId, twoId, label, loose }]
    let activeCat = 'all';    // current filter
    let scale = 1;

    // linking state
    let linkMode = false;
    let selected = [];        // up to 2 selected card elements
    let relTypes = null;      // cached [{ id, descr }]
    let chosenType = null;    // selected relation-type id
    let popover = null;

    // ---------- initial auto-layout for cards still at (0,0) ----------
    (function autoPlace() {
        const stacked = cards().filter(c =>
            (parseFloat(c.style.left) || 0) === 0 && (parseFloat(c.style.top) || 0) === 0);
        if (stacked.length < 2) return;          // genuinely placed already
        const COL_W = 260, ROW_H = 170, PER_ROW = 4, X0 = 60, Y0 = 60;
        stacked.forEach((c, i) => {
            c.style.left = (X0 + (i % PER_ROW) * COL_W) + 'px';
            c.style.top = (Y0 + Math.floor(i / PER_ROW) * ROW_H) + 'px';
        });
    })();

    // ---------- connection lines ----------
    function cardById(id) { return world.querySelector(`.board-card[data-script-id="${id}"]`); }

    function centerOf(el) {
        // geometry in unscaled world space (offsets are unaffected by the CSS transform)
        return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
    }

    function isVisible(el) { return el && !el.classList.contains('hidden'); }

    function drawLinks() {
        svg.innerHTML = '';
        world.querySelectorAll('.link-label').forEach(l => l.remove());

        links.forEach(link => {
            const a = cardById(link.oneId), b = cardById(link.twoId);
            if (!isVisible(a) || !isVisible(b)) return;

            const p1 = centerOf(a), p2 = centerOf(b);
            const line = document.createElementNS(SVGNS, 'line');
            line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
            line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
            line.setAttribute('stroke', '#1c4551');
            line.setAttribute('stroke-width', '1.5');
            if (link.loose) line.setAttribute('stroke-dasharray', '5 4');
            svg.appendChild(line);

            if (link.label) {
                const lab = document.createElement('div');
                lab.className = 'link-label absolute -translate-x-1/2 -translate-y-1/2 ' +
                    'bg-stone-100 border border-stone-300 px-1.5 py-0.5 font-sans text-[10px] tracking-[.04em] text-stone-600 pointer-events-none';
                lab.style.left = ((p1.x + p2.x) / 2) + 'px';
                lab.style.top = ((p1.y + p2.y) / 2) + 'px';
                lab.style.zIndex = '5';
                lab.textContent = link.label;
                world.appendChild(lab);
            }
        });
    }

    function boardNote(msg) {
        console.warn('[board] ' + msg);
        let n = document.getElementById('boardNote');
        if (!n) {
            n = document.createElement('div');
            n.id = 'boardNote';
            n.className = 'absolute top-2 left-2 z-50 bg-[#f5eede] border border-[#a3712a]/50 ' +
                'text-[#7a5320] font-sans text-xs px-2 py-1 max-w-xs';
            n.onclick = () => n.remove();
            viewport.appendChild(n);
        }
        n.textContent = '⚠ ' + msg + ' (click to dismiss)';
    }

    async function loadLinks() {
        if (!urls.boardLinks) {
            boardNote('builderConfig.urls.boardLinks is not set — add it in Index.cshtml');
            return;
        }
        let res;
        try {
            res = await fetch(`${urls.boardLinks}?worldId=${cfg.worldId}`, {
                headers: { 'Accept': 'application/json' }
            });
        } catch (e) {
            boardNote('network error fetching links: ' + e.message);
            return;
        }
        if (!res.ok) {
            boardNote('BoardLinks returned HTTP ' + res.status + ' — check the controller action / route');
            return;
        }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('json')) {
            boardNote('BoardLinks did not return JSON (likely an auth redirect to the login page)');
            return;
        }
        try {
            const raw = await res.json();
            // normalise in case property casing differs
            links = raw.map(l => ({
                oneId: l.oneId ?? l.OneId,
                twoId: l.twoId ?? l.TwoId,
                label: l.label ?? l.Label,
                loose: l.loose ?? l.Loose ?? false
            }));
        } catch (e) {
            boardNote('could not parse links JSON: ' + e.message);
            return;
        }
        console.log(`[board] loaded ${links.length} link(s)`, links);
        if (links.length === 0) {
            boardNote('0 links returned — no connections saved for this world yet, or both scripts must be in this world');
        }
        drawLinks();
    }

    // ---------- drag to move + persist ----------
    let drag = null;
    world.addEventListener('mousedown', e => {
        const card = e.target.closest('.board-card');
        if (!card) return;
        if (e.target.closest('.card-edit, .card-remove')) return; // buttons handle themselves

        drag = {
            card,
            startX: e.clientX, startY: e.clientY,
            origLeft: parseFloat(card.style.left) || 0,
            origTop: parseFloat(card.style.top) || 0,
            maxLeft: world.offsetWidth - card.offsetWidth,   // keep the card inside #boardWorld
            maxTop: world.offsetHeight - card.offsetHeight,
            moved: false
        };
        card.style.zIndex = 30;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        e.preventDefault();
    });

    function onMove(e) {
        if (!drag) return;
        const dx = (e.clientX - drag.startX) / scale;
        const dy = (e.clientY - drag.startY) / scale;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
        // clamp so the card can't be dragged outside the board
        const nx = Math.max(0, Math.min(drag.maxLeft, drag.origLeft + dx));
        const ny = Math.max(0, Math.min(drag.maxTop, drag.origTop + dy));
        drag.card.style.left = nx + 'px';
        drag.card.style.top = ny + 'px';
        drawLinks();
    }

    function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!drag) return;
        const card = drag.card;
        card.style.zIndex = 10;

        if (drag.moved) {
            persistPosition(card.dataset.scriptId,
                parseFloat(card.style.left) || 0,
                parseFloat(card.style.top) || 0);
        } else if (linkMode) {
            // a click in link mode selects/deselects rather than opening
            toggleSelect(card);
        } else {
            // a click (no drag) opens the script
            openScript(card.dataset.scriptId);
        }
        drag = null;
    }

    function persistPosition(scriptId, x, y) {
        if (!urls.savePosition) return;
        fetch(urls.savePosition, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': token() },
            body: JSON.stringify({ scriptId: Number(scriptId), x, y })
        }).catch(() => { /* non-fatal: position just won't survive reload */ });
    }

    // ---------- edit / remove / open ----------
    function openScript(id) {
        if (urls.scriptEdit) window.location = `${urls.scriptEdit}/${id}`;
    }

    world.addEventListener('click', e => {
        const editBtn = e.target.closest('.card-edit');
        const removeBtn = e.target.closest('.card-remove');
        const card = e.target.closest('.board-card');
        if (!card) return;

        if (editBtn) { openScript(card.dataset.scriptId); return; }
        if (removeBtn) {
            // removes from the board only — the script stays in the world
            card.classList.add('hidden');
            drawLinks();
        }
    });

    // ---------- filtering (delegated so chips added later still work) ----------
    const filterBar = document.getElementById('boardFilters');
    if (filterBar) {
        filterBar.addEventListener('click', e => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;
            const cat = chip.dataset.cat;
            activeCat = (activeCat === cat && cat !== 'all') ? 'all' : cat; // click again => show all
            applyFilter();
            styleChips();
        });
    }

    function applyFilter() {
        cards().forEach(c => {
            const show = activeCat === 'all' || c.dataset.catId === activeCat;
            c.classList.toggle('hidden', !show);
        });
        drawLinks();
    }

    function styleChips() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            const on = chip.dataset.cat === activeCat;
            if (chip.dataset.cat === 'all') {
                chip.classList.toggle('bg-stone-900', on);
                chip.classList.toggle('text-[#f0ebdf]', on);
                chip.classList.toggle('bg-stone-100', !on);
                chip.classList.toggle('text-stone-700', !on);
            } else {
                chip.style.backgroundColor = on ? chip.style.borderColor : 'transparent';
                chip.style.color = on ? '#f0ebdf' : chip.style.borderColor;
            }
        });
    }

    // ---------- zoom ----------
    function applyZoom() {
        world.style.transform = `scale(${scale})`;
        const lbl = document.getElementById('zoomLabel');
        if (lbl) lbl.textContent = Math.round(scale * 100) + '%';
    }
    document.getElementById('zoomIn')?.addEventListener('click', () => { scale = Math.min(2, scale + 0.1); applyZoom(); });
    document.getElementById('zoomOut')?.addEventListener('click', () => { scale = Math.max(0.4, scale - 0.1); applyZoom(); });

    // ---------- reset (non-destructive view reset) ----------
    function resetBoard() {
        // zoom back to 100% and scroll to origin
        scale = 1; applyZoom();
        viewport.scrollTo({ top: 0, left: 0, behavior: 'smooth' });

        // clear the category filter
        activeCat = 'all';
        applyFilter();
        styleChips();

        // exit link mode + clear any in-progress selection
        if (linkMode) setLinkMode(false); else clearSelection();

        // restore cards removed from the board with ✕
        cards().forEach(c => c.classList.remove('hidden'));

        drawLinks();
    }
    document.getElementById('resetBoardBtn')?.addEventListener('click', resetBoard);

    // ---------- linking: select two cards, pick or create a relation ----------
    const LINK_PALETTE = [
        { bg: '#dbe4ec', fg: '#3f6079' }, { bg: '#e6d6da', fg: '#7a2f3a' },
        { bg: '#d9e4d6', fg: '#4f7a52' }, { bg: '#e8e0cf', fg: '#8a7a3a' },
        { bg: '#e2dae8', fg: '#6b4a7a' }, { bg: '#e3d8cf', fg: '#7a5a3f' }
    ];
    const palFor = id => LINK_PALETTE[id % LINK_PALETTE.length];
    const esc = s => (s || '').replace(/[&<>"]/g,
        m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

    const linkBtn = document.getElementById('linkModeBtn');
    const linkHint = document.getElementById('linkHint');
    linkBtn?.addEventListener('click', () => setLinkMode(!linkMode));

    function setLinkMode(on) {
        linkMode = on;
        linkBtn?.classList.toggle('bg-[#a3712a]', on);
        linkBtn?.classList.toggle('border-[#a3712a]', on);
        linkBtn?.classList.toggle('text-stone-900', on);
        linkBtn?.classList.toggle('text-stone-600', !on);
        linkHint?.classList.toggle('hidden', !on);
        viewport.classList.toggle('cursor-crosshair', on);
        if (!on) clearSelection();
    }

    function clearSelection() {
        selected.forEach(c => c.classList.remove('ring-2', 'ring-[#a3712a]'));
        selected = [];
        chosenType = null;
        closePopover();
        if (linkHint) linkHint.textContent = 'select two cards…';
    }

    function toggleSelect(card) {
        if (popover) return;                       // resolve the open link first
        const i = selected.indexOf(card);
        if (i >= 0) {
            card.classList.remove('ring-2', 'ring-[#a3712a]');
            selected.splice(i, 1);
        } else if (selected.length < 2) {
            card.classList.add('ring-2', 'ring-[#a3712a]');
            selected.push(card);
        }
        if (linkHint) linkHint.textContent = selected.length === 1 ? 'select one more…' : 'select two cards…';
        if (selected.length === 2) openPopover();
    }

    async function ensureTypes() {
        if (relTypes) return;
        try {
            const res = await fetch(urls.relTypes);
            relTypes = res.ok ? await res.json() : [];
        } catch { relTypes = []; }
    }

    function titleOf(card) { return card.querySelector('.font-serif')?.textContent.trim() || 'script'; }

    async function openPopover() {
        if (!urls.relLink || !urls.relTypes) {
            boardNote('linking endpoints not set — add relLink / relTypes / relCreateType to builderConfig');
            return;
        }
        await ensureTypes();
        closePopover();

        popover = document.createElement('div');
        popover.className = 'fixed z-[60] bg-stone-100 border border-stone-300 shadow-[0_20px_60px_rgba(33,28,20,0.25)] p-3 w-72 text-sm font-sans';
        popover.innerHTML =
            `<div class="font-serif font-semibold text-base mb-2 leading-snug">Link “${esc(titleOf(selected[0]))}” ↔ “${esc(titleOf(selected[1]))}”</div>
             <div class="font-sans text-[11px] tracking-[.14em] uppercase text-stone-500 mb-1">How:</div>
             <div id="lkPills" class="flex flex-wrap gap-1.5 mb-2"></div>
             <div id="lkErr" class="text-xs text-[#8a2f2a] mb-2 hidden"></div>
             <div class="flex justify-between">
                 <button id="lkCancel" class="border border-stone-300 px-3 py-1 hover:bg-stone-200 transition-colors">Cancel</button>
                 <button id="lkSave" class="bg-stone-900 text-[#f0ebdf] px-3 py-1 hover:bg-[#1c4551] transition-colors disabled:opacity-40" disabled>Link</button>
             </div>`;
        document.body.appendChild(popover);
        positionPopover();
        renderTypePills();
        popover.querySelector('#lkCancel').onclick = clearSelection;
        popover.querySelector('#lkSave').onclick = doLink;
    }

    function positionPopover() {
        if (!popover || selected.length !== 2) return;
        const ra = selected[0].getBoundingClientRect();
        const rb = selected[1].getBoundingClientRect();
        const pw = popover.offsetWidth, ph = popover.offsetHeight;
        let x = (ra.left + ra.right + rb.left + rb.right) / 4 - pw / 2;
        let y = (ra.top + rb.top) / 2;
        x = Math.max(8, Math.min(window.innerWidth - pw - 8, x));
        y = Math.max(8, Math.min(window.innerHeight - ph - 8, y));
        popover.style.left = x + 'px';
        popover.style.top = y + 'px';
    }

    function renderTypePills() {
        const wrap = popover.querySelector('#lkPills');
        wrap.innerHTML = '';
        (relTypes || []).forEach(t => {
            const c = palFor(t.id);
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = t.descr;
            b.className = 'px-2.5 py-0.5 border text-xs font-sans';
            b.style.background = chosenType === t.id ? c.bg : 'transparent';
            b.style.color = c.fg;
            b.style.borderColor = c.fg;
            b.onclick = () => { chosenType = t.id; renderTypePills(); syncSave(); };
            wrap.appendChild(b);
        });
        const add = document.createElement('button');
        add.type = 'button';
        add.textContent = '+ new';
        add.className = 'px-2.5 py-0.5 border border-dashed border-stone-400 text-stone-500 text-xs font-sans';
        add.onclick = createType;
        wrap.appendChild(add);
        positionPopover();
    }

    function syncSave() {
        const s = popover?.querySelector('#lkSave');
        if (s) s.disabled = !chosenType;
    }

    async function createType() {
        const name = prompt('New relation (e.g. "Allied with")');
        if (!name || !name.trim()) return;
        if (!urls.relCreateType) { boardNote('relCreateType URL not set'); return; }
        try {
            const res = await fetch(urls.relCreateType, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': token() },
                body: JSON.stringify({ descr: name.trim() })
            });
            if (!res.ok) return;
            const t = await res.json();
            relTypes.push(t);
            chosenType = t.id;
            renderTypePills();
            syncSave();
        } catch { /* ignore */ }
    }

    async function doLink() {
        if (!chosenType || selected.length !== 2) return;
        const fromId = Number(selected[0].dataset.scriptId);
        const toId = Number(selected[1].dataset.scriptId);
        const errEl = popover.querySelector('#lkErr');
        try {
            const res = await fetch(urls.relLink, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'RequestVerificationToken': token() },
                body: JSON.stringify({ fromId, toId, connId: chosenType })
            });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                errEl.textContent = e.error || ('Could not link (HTTP ' + res.status + ')');
                errEl.classList.remove('hidden');
                return;
            }
            const link = await res.json();
            links.push({
                oneId: link.oneId ?? fromId,
                twoId: link.twoId ?? toId,
                label: link.connDescr,
                loose: false
            });
            clearSelection();
            drawLinks();
        } catch (e) {
            errEl.textContent = 'Network error: ' + e.message;
            errEl.classList.remove('hidden');
        }
    }

    function closePopover() {
        if (popover) { popover.remove(); popover = null; }
    }

    // redraw when the board tab is reopened (cards have no size while hidden)
    document.querySelector('[data-view="board"]')?.addEventListener('click',
        () => requestAnimationFrame(drawLinks));
    window.addEventListener('resize', () => { drawLinks(); positionPopover(); });
    viewport.addEventListener('scroll', positionPopover);

    // ---------- go ----------
    loadLinks();
})();