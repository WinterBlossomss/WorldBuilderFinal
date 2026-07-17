// world-row.js — paginates each _WorldRow carousel via its prev/next arrows.
(function () {
    const EPS = 2;   // sub-pixel scroll tolerance

    function initRow(row) {
        const track = row.querySelector('[data-row-track]');
        const prev = row.querySelector('[data-row-prev]');
        const next = row.querySelector('[data-row-next]');
        if (!track || !prev || !next) return;

        // One page = one viewport, less a sliver so the edge card stays as an anchor.
        const pageSize = () => Math.max(track.clientWidth - 48, 120);

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