// import Quill from 'quill';
// import "quill/dist/quill.core.css";
// ----- TAGS -----
const tagContainer = document.getElementById("tagContainer");

function showTagModal() {
    document.getElementById('tagModal').style.display = 'flex';
}
function hideTagModal() {
    document.getElementById('tagModal').style.display = 'none';

}
function saveTag() {

}ww
const colors = ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#008000", "#800080", "#800000", "#000080", "#C0C0C0"];
const container = document.getElementById("tagColorContainer");
const preview = document.getElementById('tagColorPreview');
const colorPreview = document.createElement('div');
colorPreview.className = '';
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
        colorPreview.style.backgroundColor = color;
    });
    colorDiv.addEventListener('blur', () => {
        colorDiv.style.backgroundColor = color;
    });

    container.appendChild(colorDiv);
});


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

const toolbar = quill.getModule('toolbar');

new QuillMarkdown(quill);


