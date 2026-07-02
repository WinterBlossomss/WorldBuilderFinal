// Category → its subcategories
function loadSubCategories(catID, containerId, btn) {
    let container = document.getElementById(containerId);

    // swap the two chevrons on this button
    const toggleChevrons = () => {
        btn.querySelector('.chevron-down').classList.toggle('hidden');
        btn.querySelector('.chevron-right').classList.toggle('hidden');
    };

    if (container.dataset.loaded === 'true') {
        container.classList.toggle('hidden');
        toggleChevrons();
        return;
    }

    $.ajax({
        url: window.builderConfig.urls.subCategories,
        type: "GET",
        data: { catID: catID }
    }).done(function (res) {
        container.innerHTML = "";

        res.forEach(sub => {
            let scriptId = `scriptContainer-${sub.subIDPK}`;
            let div = document.createElement('div');
            div.className = "p-3 ms-5 border-l-2 border-dashed";
            div.innerHTML = `
                <div class="flex flex-row items-center gap-2">
                    <button class="flex flex-row gap-2 items-center cursor-pointer"
                            onclick="loadScripts(${sub.subIDPK}, 'scriptContainer-${sub.subIDPK}', this)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-down text-black flex-shrink-0 hidden">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-right text-black flex-shrink-0">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                        <h2 class="text-base">${sub.subName}</h2>
                    </button>
                </div>
                <div id="${scriptId}" class="hidden"></div>
            `;
            container.appendChild(div);
        });

        // "+ New sub-category" row at the bottom
        let addDiv = document.createElement('div');
        addDiv.className = "p-3 ms-5 border-l-2 border-dashed";
        addDiv.innerHTML = `
            <div class="flex flex-row items-center gap-2">
                <button class="flex flex-row gap-2 items-center cursor-pointer" onclick="showSubCategoryModal(${catID})">
                    <h2 class="text-md italic">+ New sub-category</h2>
                </button>
            </div>
        `;
        container.appendChild(addDiv);


        container.dataset.loaded = 'true';
        container.classList.remove('hidden');
        toggleChevrons();   // flip to "down" on first open
    }).fail(function (xhr) {
        alert("Could not load subcategories: " + xhr.statusText);
    });
}

// Subcategory → its scripts
function loadScripts(subID, containerId, btn) {
    let container = document.getElementById(containerId);

    const toggleChevrons = () => {
        btn.querySelector('.chevron-down').classList.toggle('hidden');
        btn.querySelector('.chevron-right').classList.toggle('hidden');
    };

    if (container.dataset.loaded === 'true') {
        container.classList.toggle('hidden');
        toggleChevrons();
        return;
    }

    $.ajax({
        url: window.builderConfig.urls.scripts,
        type: "GET",
        data: { subID: subID }
    }).done(function (res) {
        container.innerHTML = "";

        res.forEach(script => {
            let div = document.createElement('div');
            div.className = "p-2 ms-5 border-l-2 border-dashed text-sm text-gray-700";
            div.innerHTML = `
                <div class="flex flex-row items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:11px;height:11px;" class="text-gray-500 flex-shrink-0">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25" />
                    </svg>
                    <span class="text-base">${script.scriptTitle}</span>
                </div>
            `;
            container.appendChild(div);
        });

        container.dataset.loaded = 'true';
        container.classList.remove('hidden');
        toggleChevrons();
    }).fail(function (xhr) {
        alert("Could not load scripts: " + xhr.statusText);
    });
}
