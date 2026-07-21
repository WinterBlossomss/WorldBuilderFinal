let currentSubCatParentId = null;
const subCategoryContainer = document.getElementById('subCategoryContainer');

// ---- Modal show/hide ----
function showCategoryModal() {
    hideSubCategoryModal()
    hideScriptModal()
    document.getElementById('catModal').style.display = 'flex';
}
function hideCategoryModal() {
    document.getElementById('catModal').style.display = 'none';
}
function showSubCategoryModal(catID) {
    currentSubCatParentId = catID;
    subCategoryContainer.innerHTML = "";
    hideScriptModal();
    hideCategoryModal();
    document.getElementById('subCatModal').style.display = 'flex';
}
function hideSubCategoryModal() {
    document.getElementById('subCatModal').style.display = 'none';
}
function showScriptModal() {
    hideSubCategoryModal()
    hideCategoryModal()
    document.getElementById('scriptModal').style.display = 'flex';
}
function hideScriptModal() {
    document.getElementById('scriptModal').style.display = 'none';
}

// ---- Color helpers ----
const colors = ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#008000", "#800080", "#800000", "#000080", "#C0C0C0"];

const borders = colors.map(hex => {
    let r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40);
    let g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40);
    let b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
});

function darken(hex, amount) {
    let r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
    let g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
    let b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ---- Build the color picker UI ----
const container = document.getElementById("colorContainer");
const colorHex = document.getElementById("colorHex");

// preview swatch (declared before the focus handlers that reference it)
const preview = document.getElementById('colorPreview');
const colorPreview = document.createElement('div');
colorPreview.className = 'w-8 h-8 mt-2 ms-2 me-2 inline-block border border-dashed border-stone-400';
preview.appendChild(colorPreview);

colors.forEach((color, i) => {
    const colorDiv = document.createElement("button");
    colorDiv.style.backgroundColor = color;
    colorDiv.style.borderColor = borders[i];
    colorDiv.className = "w-8 h-8 p-5 inline-block m-1 border-2 border-dashed cursor-pointer";
    colorDiv.addEventListener('mouseenter', () => colorDiv.style.opacity = '0.75');
    colorDiv.addEventListener('mouseleave', () => colorDiv.style.opacity = '1');

    const darkBorder = darken(borders[i], 60);

    colorDiv.addEventListener('focus', () => {
        colorDiv.style.backgroundColor = borders[i];
        colorDiv.style.borderColor = darkBorder;
        colorPreview.style.backgroundColor = color;
        colorHex.textContent = color;
        colorHex.className = "inline-block p-1 border border-stone-300 font-sans text-xs";
    });
    colorDiv.addEventListener('blur', () => {
        colorDiv.style.backgroundColor = color;
        colorDiv.style.borderColor = borders[i];
    });

    container.appendChild(colorDiv);
});

// custom color picker (rainbow "+" button)
const colorPickerLabel = document.createElement("label");
colorPickerLabel.className = "inline-flex items-center justify-center m-1 border-2 border-dashed cursor-pointer text-center";
colorPickerLabel.style.width = "3rem";
colorPickerLabel.style.height = "3rem";
colorPickerLabel.style.borderColor = "#211c14";
colorPickerLabel.textContent = "+";
colorPickerLabel.style.backgroundImage = "url('/images/rainbow_gradient.jpg')";
colorPickerLabel.style.backgroundSize = "cover";
colorPickerLabel.style.backgroundPosition = "center";

const colorPickerInput = document.createElement("input");
colorPickerInput.type = "color";
colorPickerInput.style.position = "absolute";
colorPickerInput.style.width = "0";
colorPickerInput.style.height = "0";
colorPickerInput.style.opacity = "0";
colorPickerInput.style.pointerEvents = "none";

colorPickerLabel.appendChild(colorPickerInput);
container.appendChild(colorPickerLabel);

colorPickerInput.addEventListener('input', () => {
    colorPreview.style.backgroundColor = colorPickerInput.value;
    colorHex.textContent = colorPickerInput.value;
    colorHex.className = "inline-block p-1 border border-stone-300 font-sans text-xs";
});

// ---- Live name preview ----
const nameInput = document.getElementById('nameInput');
const namePreview = document.getElementById('namePreview');
const scriptModalCatList = document.getElementById("scriptModalCatList");

nameInput.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    namePreview.textContent = value ? value : "Name...";
});

// ---- Save a new category ----
function saveCategory() {
    const txt = document.getElementById("noCatTxt");
    const name = nameInput.value.trim();
    const color = colorHex.textContent.trim();

    $.ajax({
        url: window.builderConfig.urls.createCategory,
        type: "POST",
        data: {
            worldId: window.builderConfig.worldId,
            name: name,
            color: color,
            __RequestVerificationToken: $('input[name="__RequestVerificationToken"]').val()
        }
    }).done(function (res) {
        if (txt) txt.remove();
        const html = `
            <div class="py-1.5" data-cat-id="${res.catIDPK}">
                <div class="flex flex-row items-center gap-2">
                    <button class="flex flex-row gap-2 items-center cursor-pointer text-stone-800 hover:text-[#1c4551] transition-colors"
                            onclick="loadSubCategories(${res.catIDPK}, 'subCatContainer-${res.catIDPK}', this)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-down flex-shrink-0 hidden">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-right flex-shrink-0">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                        <span class="w-3.5 h-3.5 border border-stone-400 flex-shrink-0" style="background-color:${res.catColor}"></span>
                        <span class="font-sans text-sm">${res.catName}</span>
                    </button>
                </div>
                <div id="subCatContainer-${res.catIDPK}" class="hidden pl-5"></div>
            </div>
        `;

        const listCat = `
            <div class="p-2" data-cat-id="${res.catIDPK}">
                <div class="flex flex-row items-center justify-between">
                    <button class="flex flex-row gap-2 items-center cursor-pointer hover:text-[#1c4551] transition-colors" onclick="selectCategoryForScript(${res.catIDPK}, '${res.catName}')">
                        <span class="w-3.5 h-3.5 border border-stone-400 flex-shrink-0" style="background-color:${res.catColor}"></span>
                        <span class="font-sans text-sm">${res.catName}</span>
                    </button>
                    <div class="font-sans text-xs text-stone-500" id="subCatCount-${res.catIDPK}">
                        0
                    </div>
                </div>
            </div>
        `;

        document.getElementById('categoryList').insertAdjacentHTML('beforeend', html);
        scriptModalCatList.insertAdjacentHTML('beforeend', listCat);

        // --- add a filter chip to the relationship board toolbar ---
        const boardFilters = document.getElementById('boardFilters');
        if (boardFilters) {
            const chipHtml = `
                <button class="filter-chip border px-3 py-1 text-sm transition-colors"
                        data-cat="${res.catIDPK}"
                        style="border-color:${res.catColor}; color:${res.catColor}">
                    ${res.catName} <span class="opacity-60">0</span>
                </button>`;
            boardFilters.insertAdjacentHTML('beforeend', chipHtml);
        }
        // --- add the category to the Cards view ---
        if (window.addCardCategory) {
            window.addCardCategory({ id: res.catIDPK, name: res.catName, color: res.catColor });
        }
        nameInput.value = "";
        namePreview.textContent = "Name...";
        hideCategoryModal();
    }).fail(function (xhr) {
        alert("Could not save category: " + xhr.statusText);
    });
}
// --- Save a new Sub-Category ---
const subName = document.getElementById("subNameInput");

function saveSubCategory() {
    $.ajax({
        url: window.builderConfig.urls.createSubCategory,
        type: "POST",
        data: {
            subName: subName.value.trim(),
            catID: currentSubCatParentId,
            __RequestVerificationToken: $('input[name="__RequestVerificationToken"]').val()
        }
    }).done(function (res) {
        const containerId = `subCatContainer-${currentSubCatParentId}`;
        const html = `
            <div class="sidebar-sub p-3 ms-5 border-l border-dashed border-stone-300" data-sub-id="${res.subIDPK}">
                <div class="flex flex-row items-center gap-2">
                    <button class="flex flex-row gap-2 items-center cursor-pointer text-stone-700 hover:text-[#1c4551] transition-colors"
                            onclick="loadScripts(${res.subIDPK}, 'scriptContainer-${res.subIDPK}', this)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-down text-stone-500 flex-shrink-0 hidden">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-right text-stone-500 flex-shrink-0">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                        <h2 class="font-sans text-sm">${res.subName}</h2>
                    </button>
                </div>
                <div id="scriptContainer-${res.subIDPK}" class="hidden"></div>
            </div>
        `;
        document.getElementById(containerId).insertAdjacentHTML('beforeend', html);

        const countEl = document.getElementById(`subCatCount-${currentSubCatParentId}`);
        if (countEl) {
            countEl.textContent = (parseInt(countEl.textContent, 10) || 0) + 1;
        }

        subName.value = "";
        hideSubCategoryModal();
    }).fail(function (xhr) {
        alert("Could not save sub-category: " + xhr.statusText);
    });
}

// --- Save a new script ---
function selectCategoryForScript(catID, catName) {
    const subCategoryDisplay = document.getElementById('subCategoryDisplay');
    const subCategoryScriptName = document.getElementById('subCategoryName');

    // Update the view
    subCategoryScriptName.textContent = `Sub-Category in ${catName}`;
    subCategoryDisplay.classList.remove('hidden');

    $.ajax({
        url: window.builderConfig.urls.subFromCat,
        type: "GET",
        data: { catID: catID }
    }).done(function (res) {
        subCategoryContainer.innerHTML = "";

        //All Sub-Categories
        res.forEach(sub => {
            let div = document.createElement('div');
            div.className = "ms-1 font-sans text-sm text-stone-700 py-2";
            div.innerHTML = `
                <div class="flex flex-row items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:15px;height:15px;" class="text-stone-400 flex-shrink-0 mb-1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.49 12 3.75 3.75m0 0-3.75 3.75m3.75-3.75H3.74V4.499" />
                    </svg>
                    <button class="hover:text-[#1c4551] transition-colors cursor-pointer" onclick="navigateToScriptCreate(${sub.subIDPK}, ${catID})">
                        <div class="font-sans text-sm">${sub.subName}</div>
                    </button>
                </div>
            `;
            subCategoryContainer.appendChild(div);
        });

        //Button for creating Script under the Category itself
        let skipSubDiv = document.createElement('div');
        skipSubDiv.className = "p-3 border-y border-dashed border-stone-300";
        skipSubDiv.innerHTML = `
            <div class="flex flex-row items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:15px;height:15px;" class="text-stone-400 flex-shrink-0 mb-1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.49 12 3.75 3.75m0 0-3.75 3.75m3.75-3.75H3.74V4.499" />
                    </svg>
                <button class="flex flex-row gap-2 items-center cursor-pointer text-stone-600 hover:text-[#1c4551] transition-colors" onclick="navigateToScriptCreate(0, ${catID})">
                    <h2 class="font-sans text-sm italic"> (directly under ${catName})</h2>
                </button>
            </div>
        `;
        subCategoryContainer.appendChild(skipSubDiv);

        //Button for creating a new Sub-Category

        let newSubBtn = document.createElement('div');
        newSubBtn.className = "p-3 border-y border-dashed border-stone-300";
        newSubBtn.innerHTML = `
                <div class="flex flex-row items-center gap-2">
                        <button class="flex flex-row gap-2 items-center cursor-pointer text-stone-600 hover:text-[#1c4551] transition-colors" onclick="showSubCategoryModal(${catID})">
                            <h2 class="font-sans text-sm italic">+ New sub-category</h2>
                        </button>
                    </div>
        `;
        subCategoryContainer.appendChild(newSubBtn);
    }).fail(function (xhr) {
        alert("Could not load subcategories: " + xhr.statusText);
    });
}

// ---- Click to navigate to a script ----
function navigateToScriptCreate(subID, catID) {
    const params = new URLSearchParams({
        subID: subID,
        catID: catID,
        worldID: window.builderConfig.worldId
    });
    window.location.href = `${window.builderConfig.urls.scriptCreateRedirect}?${params.toString()}`;
}