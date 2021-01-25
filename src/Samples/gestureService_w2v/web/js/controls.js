//--------------------------------------------------------------------------------------------
// Copyright(c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// --------------------------------------------------------------------------------------------

'use strict';

var sample_phrases = [
    "I must say this is confusing.",
    "I am hungry, let's go eat.",
    "You should drink less coffee!",
    "I am tired and am going to bed.",
    "Goodbye and have a great day!",
    "This was an interesting conversation!",
];


//--------------------------------------------------------------------------------------------
var UIControls = function (app)
{
    this.self = this;
    this.app = app;
    this.gestureLibrary = null;
}
//--------------------------------------------------------------------------------------------

UIControls.prototype.constructor = UIControls;

//--------------------------------------------------------------------------------------------
UIControls.prototype.initialize = function initUIControls()
{
    this.clrControlEnabled = "#000000";
    this.clrControlDisabled = "#a0a0a0";

    this.objMessages = document.getElementById('lblStatus');
    this.objTextInput = document.getElementById('txtInput');

    this.setupPage();
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.reportStatus = function (msg)
{
    if (this.objMessages == null)
        return;

    var shouldScroll = this.objMessages.scrollTop + this.objMessages.clientHeight <= this.objMessages.scrollHeight;

    var lbl = document.createElement('div');

    lbl.innerHTML = msg;
    lbl.style.fontSize = "75%";

    this.objMessages.appendChild(lbl);

    if (shouldScroll) {
        // scroll to bottom
        this.objMessages.scrollTop = this.objMessages.scrollHeight;
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.sendWSMessage = function (msg)
{
    if (this.app)
        this.app.sendWSMessage(msg);
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setupPage = function ()
{
    var scope = this;
    var obj;

    if (this.objTextInput) {
        this.objTextInput.disabled = false;
        this.objTextInput.readonly = false;

        this.objTextInput.addEventListener('keypress', this.onKeyPress.bind(this), false);
    }

    obj = document.getElementById('btnSend');
    if (obj) {
        obj.onclick = function () {
            if (scope.objTextInput) {
                var message = scope.objTextInput.value;

                scope.processMessage(message);
            }
        }
    }

    for (var i = 0; i < sample_phrases.length; i++) {
        var id = "btnSample" + (i + 1);

        obj = document.getElementById(id);
        if (obj) {
            obj.value = sample_phrases[i];

            obj.onclick = function (event) {
                var message = event.target.value;

                if (scope.objTextInput)
                    scope.objTextInput.value = message;

                scope.processMessage(message);
            }
        }
    }

    obj = document.getElementById('chkGestureLibrary');

    obj.addEventListener('click', this.onGestureLibraryChange.bind(this), false);
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onKeyPress = function (event)
{
    var key = event.keyCode; // window.event.keyCode;

    // check if the user pressed the enter key
    if (key === 13) {
        var message = this.objTextInput.value;

        this.processMessage(message);

        if (event.preventDefault)
            event.preventDefault();
        else
            event.returnValue = false;
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.processMessage = function (message)
{
    var msg = JSON.stringify({ msgType: "processMsg", "processMsg": { "message": message } });

    this.sendWSMessage(msg);
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onGestureLibraryChange = function (event)
{
    var table = document.getElementById('tblGestureLibrary');
    var obj = event.target;

    if (obj.checked) {
        var actionTags = this.gestureLibrary['actionTags']
        var labans = this.gestureLibrary['labans'];
        var actionTagsWords = this.gestureLibrary['actionTagsWords']

        for (var i = 0; i < actionTags.length; i++) {
            var actionTag = actionTags[i];
            var laban = labans[i];
            var actionTagWords = actionTagsWords[i];

            var newRow = table.insertRow();
            var newCell = newRow.insertCell(0);
            var lbl = document.createElement('div');
            var span = document.createElement('span');

            lbl.className = 'tooltip';
            lbl.textContent = actionTag + " (" + actionTagWords.length + ")";
            lbl.style.padding = "0px";

            span.className = 'tooltiptext_leftaligned';
            span.textContent = "" + actionTagWords;

            lbl.appendChild(span);
            newCell.appendChild(lbl);

            for (var j = 0; j < laban.length; j++) {
                var newCell = newRow.insertCell(1 + j);
                var btn = document.createElement('button');
                var txt = laban[j];

                btn.innerText = txt;
                btn.value = txt;
                btn.addEventListener('click', this.onGestureLibraryClick.bind(this), false);

                newCell.appendChild(btn);
            }
        }
    } else {
        removeAllChildNodes(table);
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onGestureLibraryClick = function (event)
{
    var gesture = "" + event.target.value;

    var msg = JSON.stringify({ msgType: "playGesture", "gesture": gesture });

    this.sendWSMessage(msg);
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.initializeGestureLibrary = function (data)
{
    var scope = this;

    this.gestureLibrary = data;
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.DisableUIControl = function (id, changeColor = false)
{
    var obj = document.getElementById(id);

    if (!obj)
        return;

    if (obj.checked != undefined)
        obj.checked = false;

    if (obj.disabled != undefined)
        obj.disabled = true;

    if (changeColor)
        obj.style.color = this.clrControlDisabled;
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.DisableAllControls = function ()
{
    this.DisableUIControl('txtInput', true);
    this.DisableUIControl('btnSend', true);

    this.DisableUIControl('btnSample1', true);
    this.DisableUIControl('btnSample2', true);
    this.DisableUIControl('btnSample3', true);
    this.DisableUIControl('btnSample4', true);
    this.DisableUIControl('btnSample5', true);
    this.DisableUIControl('btnSample6', true);

    this.DisableUIControl('lblGestureLibrary', true);
    this.DisableUIControl('chkGestureLibrary', true);
}
//--------------------------------------------------------------------------------------------
function removeAllChildNodes(parent)
{
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}
