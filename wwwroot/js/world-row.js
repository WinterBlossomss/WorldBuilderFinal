// world-row.js — paginates each _WorldRow carousel via its prev/next arrows.
(function () {
    const EPS = 2;   // sub-pixel scroll tolerance

    function initRow(row) {
        const track = row.querySelector('[data-row-track]');
        const prev = row.querySelector('[data-row-prev]');
        const next = row.querySelector('[data-row-next]');
        if (!track || !prev || !next) return;

        const pageSize = () => {
            const card = track.firstElementChild;
            if (!card) return track.clientWidth;
            const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            const step = card.getBoundingClientRect().width + gap;
            return Math.max(Math.floor(track.clientWidth / step), 1) * step;
        };

        function sync() {
            const max = track.scrollWidth - track.clientWidth;
            prev.disabled = track.scrollLeft <= EPS;
            next.disabled = track.scrollLeft >= max - EPS;
        }

        prev.addEventListener('click', () => track.scrollBy({ left: -pageSize(), behavior: 'smooth' }));
        next.addEventListener('click', () => track.scrollBy({ left: pageSize(), behavior: 'smooth' }));

        track.addEventListener('scroll', sync, { passive: true });
        new ResizeObserver(sync).observe(track);   // window resize + late-loading cards
        sync();
    }

    document.querySelectorAll('[data-world-row]').forEach(initRow);
})();