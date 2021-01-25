//--------------------------------------------------------------------------------------------
// Copyright(c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// --------------------------------------------------------------------------------------------

'use strict';

//--------------------------------------------------------------------------------------------
var UIControls = function (app)
{
    this.self = this;
    this.app = app;

    this.currentGesture = ""
    this.isPlaying = false;

    this.canvasDirPad = null;
    this.canvasDirPad2 = null;
    this.canvasMouseDown = false;

    //
    // servo overwrite
    this.servoOverwrite = false;
    this.servoSliders = [];
    this.servoValues = [];
    this.servoLabels = [];

    this.servoKeys = ['torso', 'neck', 'head', 'lshoulder', 'larm', 'lhand', 'rshoulder', 'rarm', 'rhand'];
    this.servos = ["Torso", "Neck", "Head", "Left Shoulder", "Left Upper Arm", "Left Hand", "Right Shoulder", "Right Upper Arm", "Right Hand"];
    this.servoSpeed = 0.4;
}
//--------------------------------------------------------------------------------------------

UIControls.prototype.constructor = UIControls;

//--------------------------------------------------------------------------------------------
UIControls.prototype.initialize = function initUIControls()
{
    this.clrControlEnabled = "#000000";
    this.clrControlDisabled = "#a0a0a0";

    this.dirPadEnabled = false;
    this.fSynchronizeWheels = false;

    this.gestureDuration = 0.0;

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
    this.objMessages = document.getElementById('lblStatus');
    this.objTimeSlider = document.getElementById('sliderTime');
    this.objTimeLabel = document.getElementById('lblTime');
    this.objSamplingEdit = document.getElementById('editSampling');
    this.objLWheelSlider = document.getElementById('sliderLWheel');
    this.objRWheelSlider = document.getElementById('sliderRWheel');

    this.setupControllerOptions();
    this.setupHardwareOptions();
    this.setupAirsimOptions();
    this.setupMiscellaneousOptions();
    this.setupMotorizedWheels();
    this.setupServoOverwrite();
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setupControllerOptions = function()
{
    var scope = this;
    var icon = document.getElementById('togglePlayPause');

    var selectElement = document.getElementById('listGestures');
    if (selectElement != null) {
        selectElement.addEventListener("change", function (event) {
            var value = event.target.value;

            var newGesture = value;
            var msg = JSON.stringify({ msgType: "setGesture", "setGesture": newGesture });

            scope.sendWSMessage(msg);
        });
    }

    var togglePlayPauseButton = document.getElementById('media_controls_play-pause-button');
    if (togglePlayPauseButton != null) {
        togglePlayPauseButton.addEventListener("click", function () {
            var msg = JSON.stringify({ msgType: "togglePlay" });

            scope.sendWSMessage(msg);
        });
    } else {
        console.error("element with id 'media_controls_play-pause-button' expected.");
        return;
    }

    if (this.objTimeSlider != null) {
        this.objTimeSlider.addEventListener("input", function (event) {
            var value = event.target.value;

            //
            // value is between 0 and 1000
            var timeIndex = (parseFloat(value) / 1000.0) * scope.gestureDuration;

            if (scope.objTimeLabel != null)
                scope.objTimeLabel.textContent = timeIndex.toFixed(3) + "s";

            var msg = JSON.stringify({ msgType: "setTimePosition", "setTimePosition": timeIndex });

            scope.sendWSMessage(msg);
        });
    }

    //
    // frame times canvas for tick marks
    this.canvasFrameTimes = document.getElementById('canvasFrameTimes');
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setupHardwareOptions = function ()
{
    var scope = this;

    var objConnect = document.getElementById('btnConnectHW');
    if (objConnect) {
        objConnect.onclick = function () {
            objConnect.disabled = true;

            var objPort = document.getElementById('editUSBPort');
            var port = objPort.value;

            var msg = JSON.stringify({ msgType: "hardware", "hardware": { "command": "connect", "port": port } });

            scope.sendWSMessage(msg);
        }
    }

    var objDisconnect = document.getElementById('btnDisconnectHW');
    if (objDisconnect) {
        objDisconnect.onclick = function () {
            objConnect.disabled = true;

            var msg = JSON.stringify({ msgType: "hardware", "hardware": { "command": "disconnect" } });

            scope.sendWSMessage(msg);
        }
    }

    var objSlider = document.getElementById('sliderServoAdjustment');
    if (objSlider) {
        objSlider.oninput = function (event) {
            var servoTimingAdjustment = parseFloat(objSlider.value);
            var msg = JSON.stringify({ msgType: "hardware", "hardware": { "command": "setServoTimingAdjustment", "servoTimingAdjustment": servoTimingAdjustment } });

            scope.sendWSMessage(msg);

            obj = document.getElementById('lblServoAdjustmentValue');
            if (obj)
                obj.textContent = servoTimingAdjustment.toFixed(0) + "ms";
        }
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setHardwareUIStates = function (enabled)
{
    document.getElementById("lblServoAdjustment").style.color = enabled ? this.clrControlEnabled : this.clrControlDisabled;
    document.getElementById("sliderServoAdjustment").disabled = enabled ? false : true;
    document.getElementById("lblServoAdjustmentValue").style.color = enabled ? this.clrControlEnabled : this.clrControlDisabled;
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setupAirsimOptions = function ()
{
    var scope = this;

    var objConnect = document.getElementById('btnConnectAirsim');
    if (objConnect) {
        objConnect.onclick = function () {
            objConnect.disabled = true;
            var objPort = document.getElementById('editAirSimPort');
            var port = objPort.value;

            var msg = JSON.stringify({ msgType: "airsim", "airsim": { "command": "connect", "port": port } });

            scope.sendWSMessage(msg);
        }
    }

    var objDisconnect = document.getElementById('btnDisconnectAirsim');
    if (objDisconnect) {
        objDisconnect.onclick = function () {
            objConnect.disabled = true;
            var msg = JSON.stringify({ msgType: "airsim", "airsim": { "command": "disconnect" } });

            scope.sendWSMessage(msg);
        }
    }

    var objReset = document.getElementById('btnResetAirsim');
    if (objReset) {
        objReset.onclick = function () {
            var msg = JSON.stringify({ msgType: "airsim", "airsim": { "command": "reset" } });

            scope.sendWSMessage(msg);
        }
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setupMiscellaneousOptions = function ()
{
    var scope = this;
    var obj;

    obj = document.getElementById('btnSampling');
    obj.onclick = function () {
        if (scope.objSamplingEdit == null) {
            console.error("objSamplingEdit is null.");
            return;
        }

        var fps = parseFloat(scope.objSamplingEdit.value);

        var msg = JSON.stringify({ msgType: "setSampling", "setSampling": fps });

        scope.sendWSMessage(msg);
    };

    obj = document.getElementById('staticElbow');
    if (obj) {
        obj.onclick = function () {
            var fChecked = event.target.checked ? true : false;

            if (scope.app != null)
                scope.app.setStaticElbow(fChecked);
        };
    }

    obj = document.getElementById('showHelpers');
    obj.onclick = function (event) {
        var fChecked = event.target.checked ? true : false;

        if (scope.app != null)
            scope.app.showHelpers(fChecked);

        document.getElementById("sliderOpacity").disabled = fChecked ? false : true;
        document.getElementById("lblOpacity").style.color = fChecked ? scope.clrControlEnabled : scope.clrControlDisabled;
    };

    var obj3 = document.getElementById('sliderOpacity');
    if (obj3) {
        obj3.oninput = function (event) {
            var s = parseFloat(obj3.value) / 1000.0;

            if (scope.app != null)
                scope.app.changeMSRAbotOpacity(s);
        }
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setMotorizedWheelsUIStates = function (enabled)
{
    document.getElementById("lblLWheel").style.color = enabled ? this.clrControlEnabled : this.clrControlDisabled;
    document.getElementById("sliderLWheel").disabled = enabled ? false : true;
    document.getElementById("lblLWheelValue").style.color = enabled ? this.clrControlEnabled : this.clrControlDisabled;

    document.getElementById("lblRWheel").style.color = enabled ? this.clrControlEnabled : this.clrControlDisabled;
    document.getElementById("sliderRWheel").disabled = enabled ? false : true;
    document.getElementById("lblRWheelValue").style.color = enabled ? this.clrControlEnabled : this.clrControlDisabled;

    document.getElementById("chkSyncWheels").disabled = enabled ? false : true;
    document.getElementById("lblSyncWheels").style.color = enabled ? this.clrControlEnabled : this.clrControlDisabled;
    document.getElementById("btnWheelStop").disabled = enabled ? false : true;

    var obj = document.getElementById("ctlMotorizedWheels");
    if (obj) {
        obj.style.display = enabled ? "block" : "none";
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setupMotorizedWheels = function ()
{
    var scope = this;
    var obj;

    obj = document.getElementById('chkMotorizedWheels');
    if (obj) {
        this.setMotorizedWheelsUIStates(obj.checked ? true : false)

        obj.onclick = function (event) {
            scope.dirPadEnabled = event.target.checked ? true : false;

            scope.setMotorizedWheelsUIStates(scope.dirPadEnabled);
            scope.updateCanvasDirPad(null);
        };
    }

    obj = document.getElementById('chkSyncWheels');
    obj.onclick = function (event) {
        scope.fSynchronizeWheels = event.target.checked ? true : false;

        if (scope.fSynchronizeWheels && this.objLWheelSlider) {
            var s = this.objLWheelSlider.value;

            if (this.objRWheelSlider != null)
                this.objRWheelSlider.value = s;

            document.getElementById('lblRWheelValue').textContent = s + "%";
        }
    };

    if (this.objLWheelSlider)
        this.objLWheelSlider.addEventListener('input', function (event) {
            var value = event.target.value;

            scope.onLWheelSliderUpdate(value);
        });

    if (this.objRWheelSlider)
        this.objRWheelSlider.addEventListener('input', function (event) {
            var value = event.target.value;

            scope.onRWheelSliderUpdate(value);
        });

    obj = document.getElementById('btnWheelStop');
    if (obj)
        obj.addEventListener('click', this.onWheelStop.bind(this), false); 

    this.setupDirPadCanvas();
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setupDirPadCanvas = function ()
{
    var fPlaying = false;

    //
    // set up directional pad canvas
    this.canvasDirPad = document.getElementById('canvasDirPad');
    this.canvasDirPad2 = document.getElementById('canvasDirPad2');

    this.canvasDirPad.addEventListener('mousemove', this.onCanvasDirPadMouseMove.bind(this), false);
    this.canvasDirPad.addEventListener('pointerdown', this.onCanvasDirPadPointerDown.bind(this), false);
    this.canvasDirPad.addEventListener('pointerup', this.onCanvasDirPadPointerUp.bind(this), false);

    this.updateCanvasDirPad(null);
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setupServoOverwrite = function ()
{
    var scope = this;
    var obj = document.getElementById('chkServoOverwrite');

    obj.addEventListener('click', this.onServoOverwriteChange.bind(this), false);

    obj = document.getElementById('lblServoSpeed');
    if (obj) {
        obj.style.padding = "4px";
        obj.style.color = this.clrControlDisabled;
    }

    obj = document.getElementById('sliderServoSpeed');
    if (obj) {
        obj.setAttribute('type', 'range');
        obj.setAttribute('min', '1');
        obj.setAttribute('max', '10');
        obj.setAttribute('step', '1');
        obj.value = parseInt(this.servoSpeed * 10.0);
        obj.style.width = "260px";
        obj.disabled = true;
        obj.setAttribute('oninput', 'onServoSpeedSliderUpdate(value)');
    }

    obj = document.getElementById('lblServoSpeedValue');
    if (obj) {
        obj.textContent = (this.servoSpeed * 100.0) + "%";
        obj.style.color = this.clrControlDisabled;
        obj.style.float = "right";
        obj.style.width = "7ch";
        obj.style.textAlign = "right";
    }

    var divServoSliders = document.getElementById('boneSliders');

    for (var i = 0; i < this.servos.length; i++) {
        var newRow = divServoSliders.insertRow();
        var newCell0 = newRow.insertCell(0);
        var newCell1 = newRow.insertCell(1);
        var newCell2 = newRow.insertCell(2);
        var lbl1 = document.createElement('div');
        var lbl2 = document.createElement('div');
        var lbl2ID = "servoPos" + i;

        lbl1.textContent = this.servos[i];
        lbl1.style.padding = "4px";
        lbl1.style.color = this.clrControlDisabled;

        newCell0.appendChild(lbl1);

        var input = document.createElement('input');

        this.servoSliders[this.servoKeys[i]] = input;
        this.servoLabels[this.servoKeys[i]] = lbl1;
        this.servoValues[this.servoKeys[i]] = lbl2;

        input.id = "slider_" + this.servos[i];
        input.setAttribute('type', 'range');
        input.setAttribute('min', '-179');
        input.setAttribute('max', '179');
        input.setAttribute('step', '1');
        input.value = 0;
        input.style.width = "260px";
        input.disabled = true;
        input.setAttribute('oninput', 'onServoSliderUpdate(value, ' + i + ', "' + lbl2ID + '")');

        newCell1.appendChild(input);

        lbl2.id = lbl2ID;
        lbl2.textContent = "0\xB0";
        lbl2.style.color = this.clrControlDisabled;
        lbl2.style.float = "right";
        lbl2.style.width = "7ch";
        lbl2.style.textAlign = "right";

        newCell2.appendChild(lbl2);
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setupLabanotationGestures = function(labanotations, selectGesture)
{
    var selectElement = document.getElementById('listGestures');
    var selectedIndex = 0;
    var numItems = 0;

    if (selectElement == null)
        return;

    this.currentGesture = selectGesture;

    //
    // clear select element
    {
        var i, L = selectElement.options.length - 1;
        for (i = L; i >= 0; i--) {
            selectElement.remove(i);
        }
    }

    var numSet = 0;
    for (key in labanotations) {
        var set = labanotations[key];
        var name = set['name'];
        var folder = set['folder'];
        var files = set['files'];

        if (files.length > 0) {
            var optionGroup = document.createElement('OPTGROUP');

            optionGroup.label = "Set " + (numSet + 1) + " [" + name + "]";

            //
            // add new gestures
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var idx = file.indexOf(".json");

                //
                // only add files with json extension
                if (idx > 0) {
                    var str = file.substring(0, idx);
                    var value = "{ \"folder\": \"" + folder + "\", \"file\": \"" + file + "\" }";
                    var newOption = new Option(str, value);

                    if ((selectGesture != null) && (selectGesture.toUpperCase() === file.toUpperCase()))
                        selectedIndex = numItems;

                    numItems++;

                    optionGroup.appendChild(newOption);
                }
            }

            selectElement.appendChild(optionGroup);
            numSet++;
        }
    }

    selectElement.selectedIndex = selectedIndex;
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setGestureInfo = function (gestureInfo)
{
    var parseLog = gestureInfo['parseLog']
    var ges = gestureInfo['gesture'];
    var dur = parseFloat(gestureInfo['duration']);
    var frameTimes = gestureInfo["frameTimes"];
    var file = (ges != null) ? ges['file'] : "";
    var pos = 0;

    if (parseLog && (parseLog.length > 0)) {
        this.reportStatus('<span style = "color: firebrick;"><b>Gesture "' + file + '" parsing error(s):</b></span>');
        this.reportStatus('<span style = "color: firebrick;">' + parseLog + '</span>');
    } else {
        this.reportStatus('Gesture "' + file + '" successfully loaded. ' + frameTimes.length + ' frames. Duration: ' + dur + 's');
    }

    if (this.currentGesture != ges) {
        var selectElement = document.getElementById('listGestures');

        this.currentGesture = ges;

        for (var i = 0; i < selectElement.length; i++) {
            var data = JSON.parse(selectElement[i].value);

            if ((ges != null) && (data['folder'] == ges.folder) && (data['file'] == file)) {
                selectElement[i].selected = true;
                break;
            }
        }
    }

    this.gestureDuration = dur;

    this.updateTimeSlider(pos, dur);

    //
    // the msrabot will draw a more detailed frame time line...
    this.updateFrameTimesEx(gestureInfo);
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.updateFrameTimesEx = function (gestureInfo)
{
    var frameTimes = gestureInfo['frameTimes'];
    var sps = gestureInfo['sps'];

    if (frameTimes == undefined)
        return;

    if ((this.objSamplingEdit) && (sps != undefined)) {
        this.objSamplingEdit.value = sps;
    }

    if (this.canvasFrameTimes == null)
        return; // unexpected...

    var ctx = this.canvasFrameTimes.getContext('2d');
    var dx = this.canvasFrameTimes.width;
    var dy = this.canvasFrameTimes.height;
    var ds = 0.5;
    var offsetL = 10;
    var offsetR = 8;

    dx -= (offsetL + offsetR);

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(offsetL, 0, dx, dy);

    for (var i = 0; i < frameTimes.length; i++) {
        var frameTime = frameTimes[i];

        var time = parseFloat(frameTime['time']);
        var isSample = frameTime['isSample'];
        var t = time;
        var s = (t / this.gestureDuration * dx);
        var x = (offsetL + s - ds);

        if (isSample == 'yes') {
            ctx.fillStyle = '#8080ff';
            ctx.fillRect(x, (dy / 2), 2 * ds, dy);
        } else {
            ctx.fillStyle = '#0000ff';
            ctx.fillRect(x, 0, 2 * ds, dy);
        }
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.updateHardware = function (data)
{
    var obj;
    
    obj = document.getElementById('editUSBPort');
    if (obj) {
        var port = data.port;

        if (port)
            obj.value = port;
    }

    var status = data.status;

    if (status) {
        var connected = (status == "connected");

        obj = document.getElementById('btnConnectHW');
        if (obj) {
            obj.disabled = connected ? true : false;
        }

        obj = document.getElementById('btnDisconnectHW');
        if (obj) {
            obj.disabled = connected ? false : true;
        }

        this.setHardwareUIStates(connected);
    }

    var servoTimingAdjustment = data.servoTimingAdjustment

    if (servoTimingAdjustment) {
        obj = document.getElementById('lblServoAdjustmentValue');
        if (obj)
            obj.textContent = servoTimingAdjustment.toFixed(0) + "ms";

        obj = document.getElementById('sliderServoAdjustment');
        if (obj)
            obj.value = servoTimingAdjustment;
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.updateAirsim = function (data)
{
    var obj = document.getElementById('editAirSimPort');
    if (obj) {
        var port = data.port;

        if (port)
            obj.value = port;
    }

    var status = data.status;

    if (status) {
        var connected = (status == "connected");
        var obj;

        obj = document.getElementById('btnConnectAirsim');
        if (obj) {
            obj.disabled = connected ? true : false;
        }

        obj = document.getElementById('btnDisconnectAirsim');
        if (obj) {
            obj.disabled = connected ? false : true;
        }

        obj = document.getElementById('btnResetAirsim');
        if (obj) {
            obj.disabled = connected ? false : true;
        }
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setControllerInfo = function (status)
{
    var pos = parseFloat(status['position']);
    var dur = parseFloat(status['duration']);
    var playing = status['isPlaying'];

    if (this.isPlaying != playing) {
        this.setPlayStatus(playing);
    }

    if (isNaN(dur)) {
        console.log("!!!!!!duration is not a number!!!!!!");
        console.log(status);
    } else
        this.gestureDuration = dur;

    this.updateTimeSlider(pos, dur);
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setPlayStatus = function (_isPlaying)
{
    this.isPlaying = _isPlaying;

    var icon = document.getElementById('togglePlayPause');

    icon.className = this.isPlaying ? "fa fa-pause" : "fa fa-play";

    if (this.objTimeSlider != null)
        this.objTimeSlider.disabled = this.isPlaying ? true : false;
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.updateTimeSlider = function (timeIndex, duration)
{
    var s = 0.0;

    if (duration != 0)
        s = (parseFloat(timeIndex) * 1000.0) / parseFloat(duration);

    if (this.objTimeSlider != null)
        this.objTimeSlider.value = s;

    if (this.objTimeLabel != null)
        this.objTimeLabel.textContent = timeIndex.toFixed(3) + "s";
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.getCanvasDirPadMousePos = function (evt)
{
    var rect = this.canvasDirPad.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onCanvasDirPadMouseMove = function (evt)
{
    if (this.canvasMouseDown)
        this.updateCanvasDirPad(this.getCanvasDirPadMousePos(evt));
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onCanvasDirPadPointerDown = function (evt)
{
    this.canvasMouseDown = true;
    this.canvasDirPad.setPointerCapture(evt.pointerId);

    this.updateCanvasDirPad(this.getCanvasDirPadMousePos(evt));
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onCanvasDirPadPointerUp = function (evt)
{
    this.canvasMouseDown = false;
    this.canvasDirPad.releasePointerCapture(evt.pointerId);
    this.updateCanvasDirPad(null);
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.updateCanvasDirPad = function (mousePos)
{
    var ctx = this.canvasDirPad.getContext('2d');
    var dx = this.canvasDirPad.width;
    var dy = this.canvasDirPad.height;
    var centerX = dx / 2;
    var centerY = dy / 2;
    var lineWidth = 2;
    var radius = Math.min(centerX, centerY) - lineWidth;

    ctx.clearRect(0, 0, dx, dy);
    ctx.beginPath();
    ctx.strokeStyle = this.dirPadEnabled ? '#404040' : '#b0b0b0';
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = this.dirPadEnabled ? '#d0d0d0' : '#e0e0e0';
    ctx.fill();
    ctx.lineWidth = lineWidth-1;
    ctx.strokeStyle = this.dirPadEnabled ? '#404040' : '#b0b0b0';
    ctx.stroke();

    if (this.canvasMouseDown && (mousePos != null) && this.dirPadEnabled) {
        var v = new THREE.Vector2((mousePos.x - centerX), (mousePos.y - centerY));
        var len = v.length();
        var limit = (radius - 2);

        if (len > limit)
            v = v.normalize().multiplyScalar(limit);

        if (this.fSynchronizeWheels) {
            s = (-v.y) / limit;
            v.x = 0.0;

            wl = s;
            wr = s;
        } else {
            var s = (v.length() / limit);
            var sd = Math.abs(v.x / limit);
            var a;

            var wl, wr;
            if (v.y > 0) {
                a = Math.atan2(v.x, v.y) / (Math.PI / 2.0); // relative to vertical plane

                if (v.x >= 0) {
                    wr = -s;
                    wl = -(1.0 - 2 * sd) * s;
                } else {
                    wr = -(1.0 - 2 * sd) * s;
                    wl = -s;
                }
            } else {
                a = Math.atan2(v.x, -v.y) / (Math.PI / 2.0); // relative to vertical plane

                if (v.x >= 0) {
                    wl = s;
                    wr = (1.0 - 2 * sd) * s;
                } else {
                    wl = (1.0 - 2 * sd) * s;
                    wr = s;
                }
            }
        }

        if (this.objLWheelSlider != null) {
            var u = Math.round(wl * 100);
            this.objLWheelSlider.value = u;
            this.onLWheelSliderUpdate(u);
        }

        if (this.objRWheelSlider != null) {
            var u = Math.round(wr * 100);
            this.objRWheelSlider.value = u;
            this.onRWheelSliderUpdate(u);
        }

        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#FF0000";
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + v.x, centerY + v.y);
        ctx.stroke();
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onServoOverwriteChange = function (event)
{
    var obj = event.target;

    this.servoOverwrite = obj.checked ? true : false;

    if (this.servoOverwrite && this.isPlaying) {
        var msg = JSON.stringify({ msgType: "setPlay", "setPlay": false });

        this.sendWSMessage(msg);
    }

    this.setServoOverwriteState();
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.setServoOverwriteState = function ()
{
    var clr = this.servoOverwrite ? this.clrControlEnabled : this.clrControlDisabled;

    obj = document.getElementById('lblServoSpeed');
    if (obj) {
        obj.style.color = clr;
    }

    obj = document.getElementById('sliderServoSpeed');
    if (obj) {
        obj.disabled = this.servoOverwrite ? false : true;
    }

    obj = document.getElementById('lblServoSpeedValue');
    if (obj) {
        obj.style.color = clr;
    }

    for (var i = 0; i < this.servoKeys.length; i++) {
        var key = this.servoKeys[i];

        this.servoSliders[key].disabled = this.servoOverwrite ? false : true;
        this.servoLabels[key].style.color = clr;
        this.servoValues[key].style.color = clr;
    }

    /*var obj = document.getElementById("ctlServoOverwrite");
    if (obj) {
        obj.style.display = this.servoOverwrite ? "block" : "none";
        console.log(obj.style.display);
    }*/
}
//--------------------------------------------------------------------------------------------

var _updateServosCount = 0;

//--------------------------------------------------------------------------------------------
UIControls.prototype.updateServos = function (servos)
{
    if (this.servoOverwrite)
        return;

    //
    // update servo sliders
    for (key in servos) {
        if (this.servoKeys.includes(key)) {
            var rotation = servos[key].getRotation();
            var angle = THREE.MathUtils.radToDeg(rotation);

            if (angle > 180.0)
                angle -= 360.0;

            this.servoSliders[key].value = angle;
            this.servoValues[key].textContent = "" + Math.round(angle) + "\xB0";
        }
    }
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onServoSliderUpdate = function (value, idx, lbl)
{
    var value = event.target.value;
    var angle = parseFloat(value);

    document.getElementById(lbl).textContent = "" + angle + "\xB0";

    if (_app && _app.msrabot) {
        var key = this.servoKeys[idx];
        var servo = _app.msrabot.servos[key];
        var target = THREE.MathUtils.degToRad(angle);
        var duration = 0.0;

        var currentRotation = servo.getRotation();
        var distance = THREE.MathUtils.radToDeg(Math.abs(target - currentRotation));

        var maxSpeed = 240.0; // degrees per second
        var speed = maxSpeed * this.servoSpeed;

        duration = distance / speed;

        servo.setTarget(target, duration);

        var msg = JSON.stringify({ msgType: "setManualServo", "setManualServo": { "idx": (idx + 1), "servo": key, "target": target, "speed": this.servoSpeed, "duration": duration } });

        this.sendWSMessage(msg);
    }
}
//--------------------------------------------------------------------------------------------
function onServoSliderUpdate(value, idx, lbl)
{
    if (_app && _app.controls)
        _app.controls.onServoSliderUpdate(value, idx, lbl);
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onServoSpeedSliderUpdate = function (value)
{
    var obj;
    var value = event.target.value;

    this.servoSpeed = parseFloat(value) / 10.0;

    obj = document.getElementById('lblServoSpeedValue');
    if (obj) {
        if (this.servoSpeed == 1.0)
            obj.textContent = "max";
        else
            obj.textContent = (this.servoSpeed * 100.0) + "%";
    }
}
//--------------------------------------------------------------------------------------------
function onServoSpeedSliderUpdate(value)
{
    if (_app && _app.controls)
        _app.controls.onServoSpeedSliderUpdate(value);
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onLWheelSliderUpdate = function (value, fSendWheelInfo = true)
{
    var     s = parseFloat(value);

    document.getElementById('lblLWheelValue').textContent = s + "%";

    if (this.fSynchronizeWheels) {
        if (this.objRWheelSlider != null)
            this.objRWheelSlider.value = s;

        document.getElementById('lblRWheelValue').textContent = s + "%";
    }

    if (fSendWheelInfo)
        this.sendWheelInfo();
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onRWheelSliderUpdate = function (value, fSendWheelInfo = true)
{
    var     s = parseFloat(value);

    document.getElementById('lblRWheelValue').textContent = s + "%";

    if (this.fSynchronizeWheels) {
        if (this.objLWheelSlider != null)
            this.objLWheelSlider.value = s;

        document.getElementById('lblLWheelValue').textContent = s + "%";
    }

    if (fSendWheelInfo)
        this.sendWheelInfo();
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.onWheelStop = function ()
{
    if (this.objLWheelSlider != null)
        this.objLWheelSlider.value = 0.0;

    if (this.objRWheelSlider != null)
        this.objRWheelSlider.value = 0.0;

    this.onLWheelSliderUpdate(0.0, false);
    this.onRWheelSliderUpdate(0.0, false);

    this.sendWheelInfo();
}
//--------------------------------------------------------------------------------------------
UIControls.prototype.sendWheelInfo = function ()
{
    var lWheel = 0.0;
    var rWheel = 0.0;

    if (this.objLWheelSlider != null)
        lWheel = parseFloat(this.objLWheelSlider.value) / 100.0;

    if (this.objRWheelSlider != null)
        rWheel = parseFloat(this.objRWheelSlider.value) / 100.0;

    var a = 0.0;
    var s = 0.0;

    if ((lWheel != 0.0) || (rWheel != 0.0)) {
        a = (Math.PI / 4.0) - Math.atan2(rWheel, lWheel);
        s = (Math.abs(lWheel) + Math.abs(rWheel)) / 2.0;

        if (a >= (Math.PI)) {
            s = -s;
            a = Math.PI - a;
        } else if (a >= (Math.PI / 2)) {
            s = -s;
            a = (Math.PI / 2) - (a - Math.PI/2);
        } else if (a <= -(Math.PI / 2)) {
            s = -s;
            a = -Math.PI - a;
        }
    }

    var msg = JSON.stringify({ msgType: "setWheelInfo", "setWheelInfo": { 'LWheel': lWheel, 'RWheel': rWheel, 'throttle': s, 'steering': a } });

    this.sendWSMessage(msg);
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
    var obj;

    //
    // Labanotation
    obj = document.getElementById('listGestures');

    if (obj) {
        //
        // clear select element
        var i, L = obj.options.length - 1;
        for (i = L; i >= 0; i--) {
            obj.remove(i);
        }
    }

    if (this.objTimeSlider != null)
        this.objTimeSlider.disabled = true;

    this.DisableUIControl('lblGestures', true);
    this.DisableUIControl('listGestures');
    this.DisableUIControl('media_controls_play-pause-button');
    this.DisableUIControl('lblTime', true);

    //
    // Hardware
    this.DisableUIControl('lblUSBPort', true);
    this.DisableUIControl('editUSBPort', true);
    this.DisableUIControl('btnConnectHW');
    this.DisableUIControl('btnDisconnectHW');

    this.DisableUIControl('lblServoAdjustment', true);
    this.DisableUIControl('lblServoAdjustmentValue', true);
    this.DisableUIControl('sliderServoAdjustment');

    //
    // AirSim
    this.DisableUIControl('lblAirsimPort', true);
    this.DisableUIControl('editAirSimPort', true);
    this.DisableUIControl('btnConnectAirsim');
    this.DisableUIControl('btnDisconnectAirsim');
    this.DisableUIControl('btnResetAirsim');

    //
    // Miscellaneous
    this.DisableUIControl('lblSampling', true);
    this.DisableUIControl('editSampling', true);
    this.DisableUIControl('btnSampling');
    this.DisableUIControl('showHelpers');
    this.DisableUIControl('lblShowHelpers', true);
    this.DisableUIControl('lblOpacity', true);
    this.DisableUIControl('sliderOpacity');

    //
    // Motorized Wheels
    this.DisableUIControl('chkMotorizedWheels', true);
    this.DisableUIControl('lblMotorizedWheels', true);
    this.setMotorizedWheelsUIStates(false);

    //
    // Servo Overwrite
    this.DisableUIControl('chkServoOverwrite', true);
    this.DisableUIControl('lblServoOverwrite', true);
    this.servoOverwrite = false;
    this.setServoOverwriteState();
}
