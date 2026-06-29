// builder-modal.js
// Category/subcategory modals, the color picker swatches, name preview,
// and saving a new category. Reads endpoints + worldId from window.builderConfig.

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
colorPreview.className = 'w-8 h-8 mt-2 ms-2 me-2 inline-block border border-dashed rounded-md';
preview.appendChild(colorPreview);

colors.forEach((color, i) => {
    const colorDiv = document.createElement("button");
    colorDiv.style.backgroundColor = color;
    colorDiv.style.borderColor = borders[i];
    colorDiv.className = "w-8 h-8 p-5 inline-block m-1 border-2 rounded-xl border-dashed cursor-pointer";
    colorDiv.addEventListener('mouseenter', () => colorDiv.style.opacity = '0.75');
    colorDiv.addEventListener('mouseleave', () => colorDiv.style.opacity = '1');

    const darkBorder = darken(borders[i], 60);

    colorDiv.addEventListener('focus', () => {
        colorDiv.style.backgroundColor = borders[i];
        colorDiv.style.borderColor = darkBorder;
        colorPreview.style.backgroundColor = color;
        colorHex.textContent = color;
        colorHex.className = "inline-block p-1 border rounded-full";
    });
    colorDiv.addEventListener('blur', () => {
        colorDiv.style.backgroundColor = color;
        colorDiv.style.borderColor = borders[i];
    });

    container.appendChild(colorDiv);
});

// custom color picker (rainbow "+" button)
const colorPickerLabel = document.createElement("label");
colorPickerLabel.className = "inline-flex items-center justify-center m-1 border-2 border-dashed cursor-pointer text-center rounded-xl";
colorPickerLabel.style.width = "3rem";
colorPickerLabel.style.height = "3rem";
colorPickerLabel.style.borderColor = "#000000";
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
    colorHex.className = "inline-block p-1 border rounded-full";
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
        const html = `
            <div class="py-2">
                <div class="flex flex-row items-center gap-2">
                    <button class="flex flex-row gap-2 items-center cursor-pointer"
                            onclick="loadSubCategories(${res.catIDPK}, 'subCatContainer-${res.catIDPK}', this)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-down text-black flex-shrink-0 hidden">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-right text-black flex-shrink-0">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                        <div class="w-4 h-4 rounded-md border-2 border-dashed flex-shrink-0" style="background-color:${res.catColor}"></div>
                        <h2 class="text-md">${res.catName}</h2>
                    </button>
                </div>
            </div>
            <div id="subCatContainer-${res.catIDPK}" class="hidden"></div>
        `;

        const listCat = `
            <div class="p-1.5">
                            <div class="flex flex-row items-center justify-between">
                                <button class="flex flex-row gap-1.5 items-center cursor-pointer" onclick="selectCategoryForScript(${res.catIDPK}, '${res.catName}')">
                                    <div class="w-3 h-3 rounded-sm border-2 border-dashed flex-shrink-0 p-3 rounded-xl" style="background-color:${res.catColor}"></div>
                                    <h2 class="text-sm">${res.catName}</h2>
                                </button>
                                <div class="text-xs text-gray-500"  id="subCatCount-${res.catIDPK}">
                                    0
                                </div>
                            </div>
            </div>
        `;

        document.getElementById('categoryList').insertAdjacentHTML('beforeend', html);
        scriptModalCatList.insertAdjacentHTML('beforeend',listCat)
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
            <div class="p-3 ms-5 border-l-2 border-dashed">
                <div class="flex flex-row items-center gap-2">
                    <button class="flex flex-row gap-2 items-center cursor-pointer"
                            onclick="loadScripts(${res.subIDPK}, 'scriptContainer-${res.subIDPK}', this)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-down text-black flex-shrink-0 hidden">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:12px;height:12px;" class="chevron-right text-black flex-shrink-0">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                        <h2 class="text-md">${res.subName}</h2>
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
            div.className = "ms-1 text-sm text-gray-700 py-2";
            div.innerHTML = `
                <div class="flex flex-row items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:15px;height:15px;" class="text-gray-500 flex-shrink-0 mb-1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.49 12 3.75 3.75m0 0-3.75 3.75m3.75-3.75H3.74V4.499" />
                    </svg>
                    <button onclick="navigateToScriptCreate(${sub.subIDPK}, ${catID})">
                        <div class="text-base">${sub.subName}</div>
                    </button>
                </div>
            `;
            subCategoryContainer.appendChild(div);
        });

        //Button for creating Script under the Category itself
        let skipSubDiv = document.createElement('div');
        skipSubDiv.className = "p-3 border-y-1 border-dashed";
        skipSubDiv.innerHTML = `
            <div class="flex flex-row items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:15px;height:15px;" class="text-gray-500 flex-shrink-0 mb-1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.49 12 3.75 3.75m0 0-3.75 3.75m3.75-3.75H3.74V4.499" />
                    </svg>
                <button class="flex flex-row gap-2 items-center cursor-pointer" onclick="navigateToScriptCreate(0, ${catID})">
                    <h2 class="text-md italic"> (directly under ${catName})</h2>
                </button>
            </div>
        `;
        subCategoryContainer.appendChild(skipSubDiv);

        //Button for creating a new Sub-Category

        let newSubBtn = document.createElement('div');
        newSubBtn.className = "p-3 border-y-1 border-dashed";
        newSubBtn.innerHTML = `
                <div class="flex flex-row items-center gap-2">
                        <button class="flex flex-row gap-2 items-center cursor-pointer" onclick="showSubCategoryModal(${catID})">
                            <h2 class="text-md italic">+ New sub-category</h2>
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
