// Drawer controls
function showDrawer() {
    const d = document.getElementById('drawer');
    if (!d) return;
    d.classList.remove('hidden');
    requestAnimationFrame(() => {
        d.classList.replace('opacity-0', 'opacity-100');
        document.getElementById('drawerPanel').classList.remove('-translate-x-full');
    });
}
function hideDrawer() {
    const d = document.getElementById('drawer');
    if (!d) return;
    d.classList.replace('opacity-100', 'opacity-0');
    document.getElementById('drawerPanel').classList.add('-translate-x-full');
    setTimeout(() => d.classList.add('hidden'), 300);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideDrawer(); });

// Global registry search — live dropdown in the top bar (styled like the Home registry)
(function () {
    var input = document.getElementById('globalSearch');
    var panel = document.getElementById('globalSearchResults');
    if (!input || !panel) return;

    var timer = null, seq = 0;

    function esc(s) {
        return (s || '').replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    // 2400 -> "2.4k"
    function kfmt(n) {
        n = n || 0;
        return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
    }
    function hide() { panel.classList.add('hidden'); panel.innerHTML = ''; }

    function render(data, q) {
        var html = '';
        var headCls = 'font-sans text-[10px] tracking-[.18em] uppercase text-teal-900 px-3 pt-2.5 pb-1';
        var rowCls = 'flex items-center gap-2.5 px-3 py-2 border-b border-dotted border-stone-200 '
            + 'last:border-b-0 no-underline hover:bg-stone-50 transition-colors';

        if (data.worlds && data.worlds.length) {
            html += '<div class="' + headCls + '">Worlds</div>';
            data.worlds.forEach(function (w) {
                var dot = w.color ? w.color : '#a8a29e';
                var meta = (w.genre ? esc(w.genre) + ' · ' : '') + '♥ ' + kfmt(w.likes);
                html += '<a class="' + rowCls + '" href="/World/Details/' + w.id + '">'
                    + '<span class="w-2 h-2 rounded-full shrink-0" style="background:' + esc(dot) + '"></span>'
                    + '<span class="font-serif font-semibold text-sm text-stone-900 truncate">' + esc(w.name) + '</span>'
                    + '<span class="ml-auto shrink-0 font-sans text-[11px] tracking-wide text-stone-500">' + meta + '</span>'
                    + '</a>';
            });
        }
        if (data.builders && data.builders.length) {
            html += '<div class="' + headCls + '">Builders</div>';
            data.builders.forEach(function (b) {
                var initial = (b.name || '?').charAt(0).toUpperCase();
                html += '<a class="' + rowCls + '" href="/Author/Index/' + b.id + '">'
                    + '<span class="w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center font-serif text-[11px] font-bold text-stone-700 shrink-0">' + esc(initial) + '</span>'
                    + '<span class="font-serif font-semibold text-sm text-stone-900 truncate">@' + esc(b.name) + '</span>'
                    + '<span class="ml-auto shrink-0 font-sans text-[11px] text-stone-500">builder</span>'
                    + '</a>';
            });
        }

        if (!html) {
            html = '<div class="px-3 py-6 text-center font-sans text-xs text-stone-500">No matches for &ldquo;' + esc(q) + '&rdquo;</div>';
        } else {
            html += '<a class="block px-3 py-2 text-center font-sans text-[11px] tracking-[.05em] text-teal-900 no-underline border-t border-stone-300 hover:bg-stone-50" '
                + 'href="/World/Index?q=' + encodeURIComponent(q) + '">See all results &rarr;</a>';
        }
        panel.innerHTML = html;
        panel.classList.remove('hidden');
    }

    input.addEventListener('input', function () {
        var q = this.value.trim();
        clearTimeout(timer);
        if (q.length < 1) { hide(); return; }
        timer = setTimeout(function () {
            var mine = ++seq;
            fetch('/World/GlobalSearch?q=' + encodeURIComponent(q))
                .then(function (res) { return res.ok ? res.json() : null; })
                .then(function (data) { if (data && mine === seq) render(data, q); })
                .catch(function () { /* ignore */ });
        }, 180);
    });
    input.addEventListener('focus', function () { if (this.value.trim()) input.dispatchEvent(new Event('input')); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { hide(); this.blur(); } });
    document.addEventListener('click', function (e) {
        if (e.target !== input && !panel.contains(e.target)) hide();
    });
})();