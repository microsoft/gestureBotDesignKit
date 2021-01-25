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

    this.lights = [];

    this.clientWidth = this.container.clientWidth;
    this.clientHeight = this.container.clientHeight;

    this.hiding = null;

    this.eventDoneInit = null;

    //
    // objects
    this.controls = null;
    this.chart = null;
    this.websocket = null;
    this.gestureBot = null;

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
    //
    // set up UI controls
    this.controls = new UIControls(this);
    if (this.controls == null) {
        console.error("Failed to create UI controls object.");
        return;
    }

    this.controls.initialize();

    //
    // set up servo chart
    this.chart = new ServoChart(this);
    if (this.chart == null) {
        console.error("Failed to create Servo Chart object.");
        return;
    }

    this.chart.initialize();

    //
    // set up miscellaneous
    this.setupRenderer();
    this.setupDomEvents();
    // this.createDebugLabels();
    this.initializeScene();

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
    this.renderer.shadowMap.type = THREE.VSMShadowMap;

    this.container.appendChild(this.renderer.domElement);

    //
    // stats
    if (this.enableStats) {
        this.stats = new Stats();
        this.stats.dom.style = "position:relative;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000"
        this.container.prepend(this.stats.dom);
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
App.prototype.renderShadow = function (val)
{
    if (this.renderer && this.renderer.shadowMap)
        this.renderer.shadowMap.enabled = val;

    for (var i in this.lights) {
        this.lights[i].castShadow = val;
    }

    if (this.gestureBot)
        this.gestureBot.renderShadow(val);
}
//--------------------------------------------------------------------------------------------
App.prototype.useHighResModel = function (val)
{
    if (this.gestureBot)
        this.gestureBot.useHighResModel(val);
}
//--------------------------------------------------------------------------------------------
App.prototype.hideShell = function (val)
{
    if (this.gestureBot)
        this.gestureBot.setHideShell(val);
}
//--------------------------------------------------------------------------------------------
App.prototype.showHelpers = function (val)
{
    if (this.gestureBot)
        this.gestureBot.setShowHelpers(val);
}
//--------------------------------------------------------------------------------------------
App.prototype.onLabanotationGestureChange = function(value)
{
    console.log("onLabanotationGestureChange");
}
//--------------------------------------------------------------------------------------------
App.prototype.onTimeSliderUpdate = function (value)
{
    console.log("onTimeSliderUpdate");
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
        var shadow_radius = 4;
        var shadow_camera_near = 1000;
        var shadow_camera_far = 2000;

        var light = new THREE.SpotLight(0x606060, intensity, distance, angle, penumbra);
        light.position.set(-430, 825, 1000);
        light.castShadow = true;
        if (false) {
            light.shadow = new THREE.LightShadow(new THREE.PerspectiveCamera(120, 1, 20, 5000));
            light.shadow.bias = shadow_bias;
            light.shadow.mapSize.width = shadow_mapsize;
            light.shadow.mapSize.height = shadow_mapsize;
        } else {
            light.shadow.camera.near = shadow_camera_near;
            light.shadow.camera.far = shadow_camera_far;
            light.shadow.mapSize.width = shadow_mapsize;
            light.shadow.mapSize.height = shadow_mapsize;
            light.shadow.bias = shadow_bias;
            light.shadow.radius = shadow_radius;
        }

        this.lights.push(light);
        this.scene.add(light);

        var light = new THREE.SpotLight(0x303030, intensity, distance, angle, penumbra);
        light.position.set(-430, 825, -1000);
        light.castShadow = true;
        if (false) {
            light.shadow = new THREE.LightShadow(new THREE.PerspectiveCamera(120, 1, 20, 5000));
            light.shadow.bias = shadow_bias;
            light.shadow.mapSize.width = shadow_mapsize;
            light.shadow.mapSize.height = shadow_mapsize;
        } else {
            light.shadow.camera.near = shadow_camera_near;
            light.shadow.camera.far = shadow_camera_far;
            light.shadow.mapSize.width = shadow_mapsize;
            light.shadow.mapSize.height = shadow_mapsize;
            light.shadow.bias = shadow_bias;
            light.shadow.radius = shadow_radius;
        }

        this.lights.push(light);
        this.scene.add(light);
    }

    //
    // create plane gestureBot stands on
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
    // set up custom event used by gestureBot modules
    // signaling they''re done initializing
    this.eventDoneInit = new CustomEvent('doneInit', { "bubbles": true, "cancelable": false });

    document.addEventListener('doneInit', function (e) {
        if ((scope.gestureBot != null) && (scope.gestureBot.doneInitializing))
            scope.doneInitializing();
    });

    //
    // create gestureBot module
    this.gestureBot = new gestureBot(this);
    if (this.gestureBot != null) {
        var v = plane.position.clone();

        this.gestureBot.initialize(v, false);
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.createDebugLabels = function ()
{
    var x = 10;
    var y = 86;

    this.dbgLabel1 = this.createDebugLabel('dbgLabel1', x, y);
    y += 28;
    this.dbgLabel2 = this.createDebugLabel('dbgLabel2', x, y);
    y += 28;
    this.dbgLabel3 = this.createDebugLabel('dbgLabel3', x, y);
    y += 28;
    this.dbgLabel4 = this.createDebugLabel('dbgLabel4', x, y);
}
//--------------------------------------------------------------------------------------------
App.prototype.createDebugLabel = function (name, x, y)
{
    var dbgLabel = document.createElement('div');

    dbgLabel.id = name;
    dbgLabel.textContent = '';
    dbgLabel.style.left = '' + x + 'px';
    dbgLabel.style.top = '' + y + 'px';
    dbgLabel.style.opacity = "0.8";
    dbgLabel.style.padding = "4px";
    dbgLabel.style.borderBottom = "1px solid #363636";
    dbgLabel.style.color = "#000";
    dbgLabel.style.zIndex = 10002;

    this.container.appendChild(dbgLabel);

    return dbgLabel;
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
App.prototype.doneInitializing = function ()
{
    if (this.controls)
        this.controls.allReady();
}
//--------------------------------------------------------------------------------------------
App.prototype.reportStatus = function (msg)
{
    if (this.controls)
        this.controls.reportStatus(msg);
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

    if (this.controls) {
        this.controls.DisableAllControls();
    }
}
//--------------------------------------------------------------------------------------------
App.prototype.onWebSocketMessage = function (event)
{
    if (typeof event === "undefined" || typeof event.data !== "string")
        return;

    var data = JSON.parse(event.data);

    if (data.msgType == 'initialization') {
        if (this.controls) {
            this.controls.setupLabanotationGestures(data.initialization.labanotationFiles, data.gestureInfo.Gesture);
            this.controls.setServoAngleLimits(data.servoAngleLimits);
            this.controls.setGestureInfo(data.gestureInfo);
            this.controls.setControllerInfo(data.status);
            this.controls.updateHardware(data.hardware);
        }

        if (this.gestureBot) {
            this.gestureBot.setServoAngleLimits(data.servoAngleLimits);
            this.gestureBot.setServoTargets(data.servos, true);
            this.gestureBot.setControllerInfo(data.status, data.pose);
        }

        if (this.chart) {
            this.chart.setKeyFrames(data.keyFrames, data.gestureInfo);
        }
    } else if (data.msgType == 'gestureInfo') {
        if (this.controls) {
            this.controls.setGestureInfo(data.gestureInfo);
        }

        if (this.chart) {
            this.chart.setKeyFrames(data.keyFrames, data.gestureInfo);
        }
    } else if (data.msgType == 'controller') {
        if (this.controls) {
            this.controls.setControllerInfo(data.controller);
        }
        if (this.gestureBot) {
            this.gestureBot.setServoTargets(data.servos);
            this.gestureBot.setControllerInfo(data.controller, data.pose);
        }
    } else if (data.msgType == 'hardware') {
        if (this.controls)
            this.controls.updateHardware(data.hardware);

    } else if (data.msgType == 'airsim') {
        if (this.controls)
            this.controls.updateAirsim(data.airsim);
    } else {
        console.log("onWebSocketMessage: unhandled data type '" + data.msgType + "'.");
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
App.prototype.changeGestureBotOpacity = function (opacity)
{
    if (this.gestureBot != null)
        this.gestureBot.changeOpacity(opacity);
}
//--------------------------------------------------------------------------------------------
App.prototype.importFile = function (files)
{
    if (files.length < 1)
        return;

    var scope = this;
    var map = {};
    var file = files[0];

    map[file.name] = file;

    var manager = new THREE.LoadingManager();
    manager.setURLModifier(function (url) {
        var file = filesMap[url];

        if (file) {
            console.log('Loading', url);
            return URL.createObjectURL(file);
        }

        return url;
     });

    for (var i = 0; i < files.length; i++) {
        scope.loadFile(files[i], manager);
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
    // console.log(event.keyCode.toString(16));

    switch (event.keyCode) {
        case 0x6b: // '+'
        case 0x6d: // '-'
            if (this.gestureBot)
                return this.gestureBot.onDocumentKeyDown(event);
            break;
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
App.prototype.setServos = function (servos, setImmediately = false)
{
    if (this.gestureBot)
        this.gestureBot.setServos(servos, setImmediately);
}
//--------------------------------------------------------------------------------------------
App.prototype.update = function ()
{
    var delta = this.clock.getDelta();

    TWEEN.update();

    if (this.stats)
        this.stats.update();

    if (this.gestureBot)
        this.gestureBot.update();
}
//--------------------------------------------------------------------------------------------
App.prototype.render = function ()
{
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
}
//--------------------------------------------------------------------------------------------
