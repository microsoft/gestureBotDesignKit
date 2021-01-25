//--------------------------------------------------------------------------------------------
// Copyright(c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// --------------------------------------------------------------------------------------------

//--------------------------------------------------------------------------------------------
(function ()
{
    if (typeof window.CustomEvent === "function") return false;

    function CustomEvent(event, params) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
})();
//--------------------------------------------------------------------------------------------
function isObject(val)
{
    if (val === null) { return false; }
    return ((typeof val === 'function') || (typeof val === 'object'));
}
//--------------------------------------------------------------------------------------------
function disposeMaterial(mat)
{
    if (!mat)
        return;

    if (mat.map) {
        mat.map.dispose();
        mat.map = undefined;
    }

    if (mat.materials) {
        for (i = 0; i < mat.materials.length; i++) {
            if (mat.materials[i].map) {
                mat.materials[i].map.dispose();
                mat.materials[i].map = undefined;
            }

            mat.materials[i].dispose();
        }
    } else {
        mat.dispose();
    }

    mat = undefined;
}
//--------------------------------------------------------------------------------------------
function disposeObject(obj, disposeMaterial)
{
    if (obj !== null) {
        for (var i = 0; i < obj.children.length; i++) {
            disposeObject(obj.children[i]);
        }

        if (obj.geometry) {
            obj.geometry.dispose();
            obj.geometry = undefined;
        }

        if (disposeMaterial && obj.material) {
            disposeMaterial(obj.material, disposeMaterial);
            obj.material = undefined;
        }

        if (obj.texture) {
            obj.texture.dispose();
            obj.texture = undefined;
        }
    }
    obj = undefined;
}
//--------------------------------------------------------------------------------------------
function dragElement(elmnt)
{
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "Header")) {
        // if present, the header is where you move the DIV from:
        document.getElementById(elmnt.id + "Header").onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
//--------------------------------------------------------------------------------------------
