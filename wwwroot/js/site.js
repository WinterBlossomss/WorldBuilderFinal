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

