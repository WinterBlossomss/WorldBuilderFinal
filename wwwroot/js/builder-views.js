// Switches between the Board / Cards / Outline panels at the top of the builder.

const viewButtons = document.querySelectorAll('.view-btn');
const viewPanels = document.querySelectorAll('.view-panel');

function selectView(view) {
    viewButtons.forEach(btn => {
        const isActive = btn.dataset.view === view;
        // active: solid ink chip with cream text · inactive: muted, hover warms
        btn.classList.toggle('bg-stone-900', isActive);
        btn.classList.toggle('text-[#f0ebdf]', isActive);
        btn.classList.toggle('font-semibold', isActive);
        btn.classList.toggle('text-stone-600', !isActive);
        btn.classList.toggle('hover:bg-stone-200', !isActive);
    });
    viewPanels.forEach(p => p.classList.toggle('hidden', p.dataset.panel !== view));
}

viewButtons.forEach(btn => btn.addEventListener('click', () => selectView(btn.dataset.view)));

// start on Board
selectView('board');