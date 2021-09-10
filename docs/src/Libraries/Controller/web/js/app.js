//--------------------------------------------------------------------------------------------
// Copyright(c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// --------------------------------------------------------------------------------------------

'use strict';

var _app = null;

//--------------------------------------------------------------------------------------------
var App = function (domTarget)
{
    this.self = this;
    this.container = domTarget;
    this.clock = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.enableStats = false;
    this.stats = null;

    this.clientWidth = this.container.clientWidth;
    this.clientHeight = this.container.clientHeight;

    this.eventDoneInit = null;

    //
    // objects
    this.controls = null;
    this.websocket = null;
    this.skeleton = null;

    //
    // poses
    this.poses = []

    //
    // input events
    this.mouse = new THREE.Vector3(0, 0, 0);
    this.touches = [];
}
//--------------------------------------------------------------------------------------------

App.prototype.constructor = App;

//--------------------------------------------------------------------------------------------
App.prototype.initialize = function initApp()
{
    this.objMessages = document.getElementById('lblStatus');
    this.objTimeSlider = document.getElementById('sliderTime');
    this.objTimeLabel = document.getElementById('lblTime');

    this.isPlaying = false;
    this.gestureDuration = 0.0;
    this.selectGesture = ""
    this.canvasFrameTimes = null;

    this.clrControlEnabled = "#000000";
    this.clrControlDisabled = "#f9f9f9";

    this.setupRenderer();
    this.setupDomEvents();
    this.initializeScene();

    this.setupPlayPauseOptions();
    this.setupMiscellaneous();
    this.setupWebSocket();
}
//--------------------------------------------------------------------------------------------
App.prototype.setupRenderer = function ()
{
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.clientWidth, this.clientHeight);
    this.renderer.setClearColor(0x000080, 1);

    this.renderer.shadowMap.enabled = true;

    this.container.appendChild(this.renderer.domElement);

    //
    // stats
    if (this.enableStats) {
        this.stats = new Stats();
        this.container.appendChild(this.stats.dom);
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.setupDomEvents = function ()
{
    window.addEventListener('resize', this.onWindowResize.bind(this), false);

    document.addEventListener('keydown', this.onDocumentKeyDown.bind(this), false);

    document.addEventListener('mousedown', this.onDocumentMouseDown.bind(this), false);
    document.addEventListener('mousemove', this.onDocumentMouseMove.bind(this), false);
    document.addEventListener('mouseup', this.onDocumentMouseUp.bind(this), false);

    document.addEventListener('wheel', this.onDocumentMouseWheel.bind(this), false);

    document.addEventListener('touchstart', this.onDocumentTouchStart.bind(this), false);
    document.addEventListener('touchmove', this.onDocumentTouchMove.bind(this), false);
    document.addEventListener('touchend', this.onDocumentTouchEnd.bind(this), false);

    document.addEventListener('contextmenu', this.onContextMenu.bind(this), false);
}
//--------------------------------------------------------------------------------------------
App.prototype.initializeScene = function ()
{
    var scope = this;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    this.camera = new THREE.PerspectiveCamera(35, this.clientWidth / this.clientHeight, 1, 10000);
    this.camera.position.set(0, 240, 580);
    this.scene.add(this.camera);

    this.scene.add(new THREE.AmbientLight(0x707070));

    //
    // lights
    {
        var intensity = 1.5;
        var distance = 0;
        var angle = Math.PI / 4;
        var penumbra = 0.5;
        var shadow_mapsize = 4096;
        var shadow_bias = -0.0000222;

        var light = new THREE.SpotLight(0x606060, intensity, distance, angle, penumbra);
        light.position.set(-430, 825, 1000);
        light.castShadow = true;
        light.shadow = new THREE.LightShadow(new THREE.PerspectiveCamera(120, 1, 20, 5000));
        light.shadow.bias = shadow_bias;
        light.shadow.mapSize.width = shadow_mapsize;
        light.shadow.mapSize.height = shadow_mapsize;

        this.scene.add(light);

        var light = new THREE.SpotLight(0x303030, intensity, distance, angle, penumbra);
        light.position.set(-430, 825, -1000);
        light.castShadow = true;
        light.shadow = new THREE.LightShadow(new THREE.PerspectiveCamera(120, 1, 20, 5000));
        light.shadow.bias = shadow_bias;
        light.shadow.mapSize.width = shadow_mapsize;
        light.shadow.mapSize.height = shadow_mapsize;
        this.scene.add(light);
    }

    //
    // create plane Skeleton stands on
    var planeGeometry = new THREE.PlaneBufferGeometry(2000, 2000);
    var planeMaterial = new THREE.MeshPhongMaterial({ color: 0xf0f0f0, flatShading: true, side: THREE.FrontSide });
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    planeGeometry.rotateX(-Math.PI / 2);
    plane.receiveShadow = true;
    this.scene.add(plane);

    var helper = new THREE.GridHelper(2000, 100);
    helper.position.y = plane.position.y + 1;
    helper.material.opacity = 0.25;
    helper.material.transparent = true;
    this.scene.add(helper);

    //
    // create camera and scene panning controls
    this.orbit = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.damping = 0.2;
    this.orbit.addEventListener('change', function () {
        scope.render();
    });
    this.orbit.addEventListener('start', function () {
        scope.cancelHideTransorm();
    });
    this.orbit.addEventListener('end', function () {
        scope.delayHideTransform();
    });

    this.orbit.target.set(0, 140, 0);
    this.orbit.update();

    this.transformControl = new THREE.TransformControls(this.camera, this.renderer.domElement);

    this.transformControl.showZ = false;
    this.transformControl.addEventListener('change', function () {
        scope.render();
    });
    this.transformControl.addEventListener('dragging-changed', function (event) {
        scope.orbit.enabled = !event.value;
    });
    this.scene.add(this.transformControl);

    // Hiding transform situation is a little in a mess :()
    this.transformControl.addEventListener('change', function () {
        scope.cancelHideTransorm();
    });
    this.transformControl.addEventListener('mouseDown', function () {
        scope.cancelHideTransorm();
    });
    this.transformControl.addEventListener('mouseUp', function () {
        scope.delayHideTransform();
    });

    //
    // set up custom event used by Skeleton modules
    // signaling they''re done initializing
    this.eventDoneInit = new CustomEvent('doneInit', { "bubbles": true, "cancelable": false });

    document.addEventListener('doneInit', function (e) {
        if ((scope.skeleton != null) && (scope.skeleton.doneInitializing))
            scope.doneInitializing();
    });

    //
    // create skeleton module
    this.skeleton = new Skeleton(this);
    if (this.skeleton != null) {
        var v = plane.position.clone();

        this.skeleton.initialize(v, false);
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.doneInitializing = function ()
{
}
//--------------------------------------------------------------------------------------------
App.prototype.setupLabanotationGestures = function (labanotations, selectGesture)
{
    var scope = this;
    var selectElement = document.getElementById('listGestures');
    var selectedIndex = 0;
    var numItems = 0;

    if (selectElement == null)
        return;

    selectElement.addEventListener("change", function (event) {
        var value = event.target.value;

        var newGesture = value;
        var msg = JSON.stringify({ msgType: "setGesture", "setGesture": newGesture });

        scope.sendWSMessage(msg);
    });

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
    // clear select element
    {
        var i, L = selectElement.options.length - 1;
        for (i = L; i >= 0; i--) {
            selectElement.remove(i);
        }
    }

    var numSet = 0;
    for (var key in labanotations) {
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
App.prototype.setupPlayPauseOptions = function()
{
    var scope = this;
    var icon = document.getElementById('togglePlayPause');
    var togglePlayPauseButton = document.getElementById('media_controls_play-pause-button');

    //Event listener for the play button
    togglePlayPauseButton.addEventListener("click", function () {
        var msg = JSON.stringify({ msgType: "togglePlay" });

        scope.sendWSMessage(msg);
    });

    //
    // frame times canvas for tick marks
    this.canvasFrameTimes = document.getElementById('canvasFrameTimes');
}
//--------------------------------------------------------------------------------------------
App.prototype.setupMiscellaneous = function()
{
    var scope = this;
    var objBtn = document.getElementById('btnExitApp');

    objBtn.addEventListener("click", function () {
        var msg = JSON.stringify({ msgType: "quitApplication" });

        scope.sendWSMessage(msg);
    });
}
//--------------------------------------------------------------------------------------------
App.prototype.updateTimeSlider = function(timeIndex, duration)
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
App.prototype.updateFrameTimes = function(frameTimes)
{
    var ctx = this.canvasFrameTimes.getContext('2d');
    var dx = this.canvasFrameTimes.width;
    var dy = this.canvasFrameTimes.height;
    var ds = 0.5;
    var offsetL = 10; // todo. right now this is arbitrary
    var offsetR = 8; // todo. right now this is arbitrary

    dx -= (offsetL + offsetR);

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(offsetL, 0, dx, dy);

    for (var i = 0; i < frameTimes.length; i++) {
        var t = frameTimes[i];
        var s = (t / this.gestureDuration * dx);

        ctx.fillStyle = '#0000ff';
        ctx.fillRect(offsetL + s-ds, 0, 2*ds, dy);
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.setPlayStatus = function(_isPlaying)
{
    this.isPlaying = _isPlaying;

    var icon = document.getElementById('togglePlayPause');

    icon.className = this.isPlaying ? "fa fa-pause" : "fa fa-play";

    if (this.objTimeSlider != null)
        this.objTimeSlider.disabled = this.isPlaying ? true : false;
}
//--------------------------------------------------------------------------------------------
App.prototype.setGestureInfo = function(gestureInfo)
{
    var parseLog = gestureInfo['parseLog']
    var ges = gestureInfo['gesture'];
    var duration = parseFloat(gestureInfo['duration']);
    var frameTimes = gestureInfo["frameTimes"];
    var file = (ges != null) ? ges['file'] : "";
    var pos = 0;

    if (parseLog && (parseLog.length > 0)) {
        this.reportStatus('<span style = "color: firebrick;"><b>Gesture "' + file + '" parsing error(s):</b></span>');
        this.reportStatus('<span style = "color: firebrick;">' + parseLog + '</span>');
    } else {
        this.reportStatus('Gesture "' + file + '" successfully loaded. ' + frameTimes.length + ' frames. Duration: ' + duration + 'ms');
    }

    if (this.selectGesture != ges) {
        var selectElement = document.getElementById('listGestures');

        this.selectGesture = ges;

        for (var i = 0; i < selectElement.length; i++) {
            var data = JSON.parse(selectElement[i].value);

            if ((ges != null) && (data['folder'] == ges.folder) && (data['file'] == file)) {
                selectElement[i].selected = true;
                break;
            }
        }
    }

    this.gestureDuration = duration;

    this.updateFrameTimes(frameTimes);
    this.updateTimeSlider(pos, duration);
}
//--------------------------------------------------------------------------------------------
App.prototype.setPose = function (pose)
{
    if (this.skeleton)
        this.skeleton.setPose(pose);
}
//--------------------------------------------------------------------------------------------
App.prototype.setLabanotationStatus = function(status)
{
    var pos = parseFloat(status['position']);
    var dur = parseFloat(status['duration']);
    var playing = status['isPlaying'];

    if (this.isPlaying != playing) {
        this.setPlayStatus(playing);
    }

    this.gestureDuration = dur;

    this.updateTimeSlider(pos, dur);
}
//--------------------------------------------------------------------------------------------
App.prototype.DisableUIControl = function(id, changeColor = false)
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
App.prototype.DisableAllControls = function()
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
    // Application
    this.DisableUIControl('btnExitApp');
}
//--------------------------------------------------------------------------------------------
App.prototype.setupWebSocket = function ()
{
    var host = "ws://" + location.hostname + ":" + location.port + "/ws";

    this.webSocketConnected = false;

    try {
        this.reportStatus('Connecting to "' + host + '"...');

        this.webSocket = new WebSocket(host);

        this.webSocket.onopen = this.onWebSocketOpen.bind(this);
        this.webSocket.onclose = this.onWebSocketClose.bind(this);
        this.webSocket.onmessage = this.onWebSocketMessage.bind(this);
        this.webSocket.onerror = this.onWebSocketError.bind(this);
    }
    catch (exception) {
        this.reportStatus('WebSocket: exception');
        if (window.console)
            console.log(exception);
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.onWebSocketOpen = function()
{
    this.webSocketConnected = true;
    this.reportStatus('WebSocket: connection opened.');
}
//--------------------------------------------------------------------------------------------
App.prototype.onWebSocketClose = function (event)
{
    var reason = "";

    //
    // only error code 1006 is dispatched: https://www.w3.org/TR/websockets/#concept-websocket-close-fail
    //
    if (event.code == 1000)
        reason = "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.";
    else if (event.code == 1001)
        reason = "An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.";
    else if (event.code == 1002)
        reason = "An endpoint is terminating the connection due to a protocol error";
    else if (event.code == 1003)
        reason = "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
    else if (event.code == 1004)
        reason = "Reserved. The specific meaning might be defined in the future.";
    else if (event.code == 1005)
        reason = "No status code was actually present.";
    else if (event.code == 1006) {
        reason = "The connection with the server was closed.";
    } else if (event.code == 1007)
        reason = "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).";
    else if (event.code == 1008)
        reason = "An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.";
    else if (event.code == 1009)
        reason = "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
    else if (event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
        reason = "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: " + event.reason;
    else if (event.code == 1011)
        reason = "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
    else if (event.code == 1015)
        reason = "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
    else
        reason = "Unknown reason";

    this.reportStatus('WebSocket: <span style = "color: red;">' + reason + '</span>');

    window.alert('WebSocket: ' + reason);

    this.webSocketConnected = false;

    this.DisableAllControls();
}
//--------------------------------------------------------------------------------------------
App.prototype.onWebSocketMessage = function (event)
{
    if (typeof event === "undefined" || typeof event.data !== "string")
        return;

    var data = JSON.parse(event.data);

    if (data.msgType == 'initialization') {
        this.setupLabanotationGestures(data.initialization.labanotationFiles, data.gestureInfo.Gesture);
        this.setGestureInfo(data.gestureInfo);
        this.setPose(data.pose);
        this.setLabanotationStatus(data.status);
    } else if (data.msgType == 'gesture') {
        this.setGestureInfo(data.gesture);
    } else if (data.msgType == 'status') {
        this.setLabanotationStatus(data.status);
        this.setPose(data.pose);
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.onWebSocketError = function (event)
{
    this.reportStatus('<span style = "color: red;">WebSocket Error: ' + event.data + '</span>');
}
//--------------------------------------------------------------------------------------------
App.prototype.sendWSMessage = function (msg)
{
    if (this.webSocket == null)
        return;

    if (this.webSocketConnected)
        this.webSocket.send(msg);
}
//--------------------------------------------------------------------------------------------
App.prototype.reportStatus = function (msg)
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
App.prototype.delayHideTransform = function ()
{
    this.cancelHideTransorm();
    this.hideTransform();
}
//--------------------------------------------------------------------------------------------
App.prototype.hideTransform = function ()
{
    var scope = this;

    this.hiding = setTimeout(function () {
        scope.transformControl.detach(scope.transformControl.object);
    }, 2500);
}
//--------------------------------------------------------------------------------------------
App.prototype.cancelHideTransorm = function ()
{
    if (this.hiding) {
        clearTimeout(this.hiding);
        this.hiding = null;
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.onDocumentKeyDown = function (event)
{
    switch (event.keyCode) {
        case 0x41: // 'A'
            break;
        case 0x44: // 'D'
            break;
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.onDocumentMouseDown = function (event)
{
    this.mouse.x = (event.clientX / this.clientWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / this.clientHeight) * 2 + 1;
}
//--------------------------------------------------------------------------------------------
App.prototype.onDocumentMouseMove = function (event)
{
    this.mouse.x = (event.clientX / this.clientWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / this.clientHeight) * 2 + 1;
}
//--------------------------------------------------------------------------------------------
App.prototype.onDocumentMouseUp = function (event)
{
    this.mouse.x = (event.clientX / this.clientWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / this.clientHeight) * 2 + 1;
}
//--------------------------------------------------------------------------------------------
App.prototype.convertTouchEvents = function (touches)
{
    this.touches = [];

    for (var i = 0; i < event.touches.length; i++) {
        this.touches.push(
            new THREE.Vector2(
                (touches[i].pageX / this.clientWidth)  * 2 - 1,
                (-touches[i].pageY / this.clientHeight) * 2 + 1));
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.onDocumentTouchStart = function (event)
{
    this.convertTouchEvents(event.touches);
}
//--------------------------------------------------------------------------------------------
App.prototype.onDocumentTouchMove = function (event)
{
    this.convertTouchEvents(event.touches);
}
//--------------------------------------------------------------------------------------------
App.prototype.onDocumentTouchEnd = function (event)
{
    this.convertTouchEvents(event.touches);
}
//--------------------------------------------------------------------------------------------
App.prototype.onDocumentMouseWheel = function (event)
{
}
//--------------------------------------------------------------------------------------------
App.prototype.onContextMenu = function (event)
{
}
//--------------------------------------------------------------------------------------------
App.prototype.onWindowResize = function ()
{
    this.clientWidth = this.container.clientWidth;
    this.clientHeight = this.container.clientHeight;

    if (this.camera) {
        this.camera.aspect = this.clientWidth / this.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    if (this.renderer)
        this.renderer.setSize(this.clientWidth, this.clientHeight);
}
//--------------------------------------------------------------------------------------------
App.prototype.update = function ()
{
    var delta = this.clock.getDelta();

    TWEEN.update();

    if (this.stats)
        this.stats.update();

    if (this.skeleton)
        this.skeleton.update();
}
//--------------------------------------------------------------------------------------------
App.prototype.render = function ()
{
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
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
function disposeObject(obj, disposeMaterial = false)
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
