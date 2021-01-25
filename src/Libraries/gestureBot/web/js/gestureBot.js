//--------------------------------------------------------------------------------------------
// Copyright(c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// --------------------------------------------------------------------------------------------

_divGraph = null;

//--------------------------------------------------------------------------------------------
gestureBot = function (app)
{
    this.app = app;
    this.doneInitializing = false;

    this.objBase = null;
    this.objBody = null;
    this.objNeck = null;
    this.objRShoulder = null;
    this.objLShoulder = null;
    this.objects = [];
    this.arrayObjects = [];

    this.gesturePosition = 0.0;
    this.gestureDuration = 0.0;

    this.neck_len = 48.0;
    this.seg1_len = 72.0;
    this.seg2_len = 50.0;

    this.lastLShoulderTheta = { value: 0.0 };
    this.lastLElbowTheta = { value: 0.0 };
    this.lastRShoulderTheta = { value: 0.0 };
    this.lastRElbowTheta = { value: 0.0 };

    this.hideShell = false;

    this.showHelpers = false;
    this.meshHelperNeck = null;
    this.meshHelperLeft = null;
    this.meshHelperRight = null;
    this.helperMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00, side: THREE.DoubleSide });
    this.invisibleMaterial = new THREE.MeshBasicMaterial({ visible: false });

    //
    // note that blender glb export removes any periods in names
    var servoJointMap = {
        'head':         "gB_SwingBracket_Head",
        'neck':         "gB_Neck",
        'torso':        "gB_UpperTorsoFrame",
        'hip':          "gB_SwingBracket_RivetMount",
        'rshoulder':    "gB_SwingBracket_ScrewMount_Shoulder_R",
        'rarm':         "XL-320D_ID006",
        'relbow':       "gB_SwingBracket_ScrewMount002",
        'rhand':        "XL-320D_ID008",
        'lshoulder':    "gB_SwingBracket_ScrewMount_Shoulder_L",
        'larm':         "XL-320D_ID010",
        'lelbow':       "gB_SwingBracket_ScrewMount001",
        'lhand':        "XL-320D_ID012"
    };

    this.currentPose = null;

    this.servos = [];

    for (key in servoJointMap) {
        var joint = servoJointMap[key];

        this.servos[key] = new Servo(key, joint);
    }

    this.servoLimits = [];

    this.renderChildOnly = false;
    this.currentlyRenderingChildIndex = -1;
}

gestureBot.prototype.constructor = gestureBot;

//--------------------------------------------------------------------------------------------
gestureBot.prototype.initialize = function initGestureBot(vReference, fInterpolateServoTargets = true)
{
    this.fInterpolateServoTargets = fInterpolateServoTargets;

    this.materials = [
        new THREE.MeshPhongMaterial({ color: 0xEBEAE2, opacity: 0.6, transparent: true, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0x87B5C9, opacity: 0.6, transparent: true, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0x404040, opacity: 0.6, transparent: true, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0xff0000, opacity: 0.6, transparent: true, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0x00ff00, opacity: 0.6, transparent: true, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0x0000ff, opacity: 0.6, transparent: true, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0xfff0f0, opacity: 0.6, transparent: true, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0x606060, opacity: 0.6, transparent: true, flatShading: true })
    ];

    this.createHelpers();

    this.loadModel(false);
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.clearModel = function ()
{
    this.objects = [];
    this.arrayObjects = [];
    this.objBody = null;
    this.objNeck = null;
    this.objRShoulder = null;
    this.objLShoulder = null;

    if (this.objBase) {
        this.app.scene.remove(this.objBase);
        disposeObject(this.objBase, false);
        this.objBase = undefined;
    }
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.loadModel = function (fHighRes = true)
{
    //
    // see https://threejs.org/docs/index.html#examples/en/loaders/GLTFLoader
    //
    var scope = this;

    //
    // reset initialization flag
    this.doneInitializing = false;

    //
    // free current model
    this.clearModel();

    var loader = new THREE.GLTFLoader().setPath('./models/');
    var dev_version = '' + Math.floor(Math.random() * 100000);
    var file = (fHighRes) ? 'gestureBot.v0.9.2.glb' : 'gestureBot.v0.9.2.low.glb';

    //if (true)
    //    file = file + "?rand=" + Math.floor(Math.random() * 100000);

    loader.load(file, function (gltf) {
        var numVertices = 0;
        var mesh;
        var children = gltf.scene.children;

        for (var i = 0; i < children.length; i++) {
            var child = children[i];

            if ((child.isMesh) && (child.name == "gB_Base")) {
                mesh = child;
                break;
            }
        }

        if (mesh == null) {
            window.alert("The gestureBot 3D model does not contain required main object of name 'gB_Base'!");
            return;
        }

        mesh.traverse(function (child) {
            var pn = child.parent ? (child.parent.name) : "";

            scope.objects[child.name] = child;
            scope.arrayObjects.push(child);

            // console.log("child.name='" + child.name + "'");

            if (child.name == 'gB_Base') {
                scope.objBase = child;
            } else if (child.name == 'gB_BaseFrame') {
                scope.objBody = child;
            } else if (child.name == 'gB_Neck') {
                scope.objNeck = child;
            } else if (child.name == 'XL-320D_ID005') {
                scope.objRShoulder = child;
            } else if (child.name == 'XL-320D_ID009') {
                scope.objLShoulder = child;
            }

            switch (child.name) {
                case "XL-320D_ID001":
                case "XL-320D_ID002":
                case "XL-320D_ID003":
                case "XL-320D_ID004":
                case "XL-320D_ID005":
                case "XL-320D_ID006":
                case "XL-320D_ID006":
                case "XL-320D_ID007":
                case "XL-320D_ID008":
                case "XL-320D_ID009":
                case "XL-320D_ID010":
                case "XL-320D_ID011":
                case "XL-320D_ID012":
                    child.material = scope.materials[7];
                    break;

                case "gB_Eyes":
                    child.material = scope.materials[2];
                    break;

                case "gB_Hood":
                    child.material = scope.materials[1];
                    break;

                default:
                    child.material = scope.materials[0];
                    break;
            }

            if (child.isMesh) {
                child.originalMaterial = child.material;

                child.castShadow = true;
                child.receiveShadow = true;

                var geometry = child.geometry;
                if (geometry) {
                    if (geometry.type == "BufferGeometry") {
                        numVertices += geometry.attributes.position.count;
                    } else {
                        console.log("Unknown geometry type: ");
                        console.log(geometry);
                    }
                }
            }
        });

        console.log("Total number of vertices: " + numVertices);

        scope.initializeModelObjects();

        //
        // done. fire init complete event
        scope.doneInitializing = true;

        if (scope.app.eventDoneInit != null)
            document.dispatchEvent(scope.app.eventDoneInit);

        //
        // set show helpers after resetting doneInitializing flag
        scope.setShowHelpers(scope.showHelpers);

        if (scope.hideShell)
            scope.setHideShell(scope.hideShell);
    });
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.initializeModelObjects = function ()
{
    if (this.objBase) {
        this.objBase.updateMatrix();
        this.objBase.updateMatrixWorld(true);

        this.app.scene.add(this.objBase);
    }

    //
    // map servos to model objects
    for (key in this.servos) {
        var servo = this.servos[key];
        var jointName = servo.getJointName();
        var name = servo.getName();

        obj = this.objects[jointName];
        if (isObject(obj)) {
            switch (name) {
                default:                servo.setJointObject(obj, 0, 'ZYX'); break;

                case "head":            servo.setJointObject(obj, 0, 'ZYX'); break;
                case "neck":            servo.setJointObject(obj, 1, 'ZYX'); break;
                case "torso":           servo.setJointObject(obj, 1, 'ZYX'); break;
                case "hip":             servo.setJointObject(obj, 0, 'ZYX'); break;

                case "rshoulder":       servo.setJointObject(obj, 0, 'ZYX'); break;
                case "rarm":            servo.setJointObject(obj, 2, 'XYZ'); break;
                case "relbow":          servo.setJointObject(obj, 0, 'ZYX'); break;
                case "rhand":           servo.setJointObject(obj, 1, 'YZX'); break;

                case "lshoulder":       servo.setJointObject(obj, 0, 'ZYX'); break;
                case "larm":            servo.setJointObject(obj, 2, 'XYZ'); break;
                case "lelbow":          servo.setJointObject(obj, 0, 'ZYX'); break;
                case "lhand":           servo.setJointObject(obj, 1, 'YZX'); break;
            }
        } else {
            console.error("The gestureBot 3D model does not contain required object of name '" + jointName + "'!");
            window.alert("The gestureBot 3D model does not contain required object of name '" + jointName + "'!");
        }
    }

    this.initializeHelpers();
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.createHelpers = function ()
{
    var sphereMaterial0 = new THREE.MeshPhongMaterial({ specular: 0x333333, shininess: 5, color: 0xff00ff });
    var sphereMaterial1 = new THREE.MeshPhongMaterial({ specular: 0x333333, shininess: 5, color: 0x00ff00 });
    var sphereMaterial2 = new THREE.MeshPhongMaterial({ specular: 0x333333, shininess: 5, color: 0x0000ff });
    var sphereGeometry = new THREE.SphereBufferGeometry(8, 16, 16);
    var headGeometry = new THREE.SphereBufferGeometry(16, 16, 16);

    //
    // head
    this.helperHead = new THREE.Mesh(headGeometry, sphereMaterial1);
    this.app.scene.add(this.helperHead);

    //
    // left
    this.helperSphereL0 = new THREE.Mesh(sphereGeometry, sphereMaterial0);
    this.app.scene.add(this.helperSphereL0);

    this.helperSphereL1 = new THREE.Mesh(sphereGeometry, sphereMaterial1);
    this.app.scene.add(this.helperSphereL1);

    this.helperSphereL2 = new THREE.Mesh(sphereGeometry, sphereMaterial2);
    this.app.scene.add(this.helperSphereL2);

    //
    // right
    this.helperSphereR0 = new THREE.Mesh(sphereGeometry, sphereMaterial0);
    this.app.scene.add(this.helperSphereR0);

    this.helperSphereR1 = new THREE.Mesh(sphereGeometry, sphereMaterial1);
    this.app.scene.add(this.helperSphereR1);

    this.helperSphereR2 = new THREE.Mesh(sphereGeometry, sphereMaterial2);
    this.app.scene.add(this.helperSphereR2);
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.initializeHelpers = function ()
{
    if (this.helperHead)
        this.helperHead.parent = this.objBase;

    if (this.helperSphereL0)
        this.helperSphereL0.parent = this.objBase;

    if (this.helperSphereL1)
        this.helperSphereL1.parent = this.objBase;

    if (this.helperSphereL2)
        this.helperSphereL2.parent = this.objBase;

    if (this.helperSphereR0)
        this.helperSphereR0.parent = this.objBase;

    if (this.helperSphereR1)
        this.helperSphereR1.parent = this.objBase;

    if (this.helperSphereR2)
        this.helperSphereR2.parent = this.objBase;
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.renderShadow = function (flag)
{
    for (var key in this.objects)
        this.objects[key].material.needsUpdate = true;
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.useHighResModel = function (flag)
{
    this.loadModel(flag);
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.onDocumentKeyDown = function (event)
{
    return false;

    switch (event.keyCode) {
        case 0x6b: // '+'
        case 0x6d: // '-'
            if (this.renderChildOnly) {
                this.currentlyRenderingChildIndex += (event.keyCode == 0x6b) ? (1) : (-1);

                if ((this.currentlyRenderingChildIndex < 0) || (this.currentlyRenderingChildIndex >= this.arrayObjects.length)) {
                    this.renderChildOnly = false;
                    this.currentlyRenderingChildIndex = -1;
                }
            } else {
                this.renderChildOnly = true;
                this.currentlyRenderingChildIndex = 0;
            }

            this.RefreshChildrenVisibility();
            return true;
    }

    return false;
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.RefreshChildrenVisibility = function ()
{
    for (var i = 0; i < this.arrayObjects.length; i++) {
        var obj = this.arrayObjects[i];

        if (obj) {
            var fVisible = (this.renderChildOnly) ? (i == this.currentlyRenderingChildIndex) : (true);

            obj.material = fVisible ? obj.originalMaterial : this.invisibleMaterial;

            /*if (this.renderChildOnly && fVisible)
                console.log("isolated child (" + this.currentlyRenderingChildIndex + "): '" + obj.name + "'");*/
        }
    }
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.setHideShell = function (hide)
{
    var shellObjects = ["gB_Hood", "gB_Face", "gB_Eyes", "gB_Ear_L", "gB_Ear_R", "gB_UpperTorsoFrontCover", "gB_UpperTorsoBackCover", "gB_HipCover",
                        "gB_ServoCover005", "gB_ServoSideCover007", "gB_ServoSideCover010", "gB_ServoCover001", "gB_ServoSideCover002", "gB_ServoSideCover003", "gB_ServoCover004", "gB_HandL", 
                        "gB_BracketCover001", "gB_BracketCover_RivetSide001", "gB_BracketCover003", "gB_BracketCover_RivetSide003",
                        "gB_ServoCover006", "gB_ServoSideCover008", "gB_ServoSideCover009", "gB_ServoCover", "gB_ServoSideCover", "gB_ServoSideCover001", "gB_ServoCover003", "gB_HandR",
                        "gB_BracketCover", "gB_BracketCover_RivetSide", "gB_BracketCover002", "gB_BracketCover_RivetSide002" ];

    this.hideShell = hide;

    for (var i = 0; i < this.arrayObjects.length; i++) {
        var obj = this.arrayObjects[i];

        if (obj) {
            var fVisible = (hide) ? (!shellObjects.includes(obj.name)) : (true);

            obj.material = fVisible ? obj.originalMaterial : this.invisibleMaterial;
        }
    }
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.setShowHelpers = function (show)
{
    this.showHelpers = show;

    if (this.helperHead)
        this.helperHead.visible = show;

    if (this.helperSphereL0)
        this.helperSphereL0.visible = show;

    if (this.helperSphereL1)
        this.helperSphereL1.visible = show;

    if (this.helperSphereL2)
        this.helperSphereL2.visible = show;

    if (this.helperSphereR0)
        this.helperSphereR0.visible = show;

    if (this.helperSphereR1)
        this.helperSphereR1.visible = show;

    if (this.helperSphereR2)
        this.helperSphereR2.visible = show;

    if (!show && this.meshHelperNeck) {
        this.app.scene.remove(this.meshHelperNeck);
        disposeObject(this.meshHelperNeck, false);
        this.meshHelperNeck = undefined;
    }

    if (!show && this.meshHelperLeft) {
        this.app.scene.remove(this.meshHelperLeft);
        disposeObject(this.meshHelperLeft, false);
        this.meshHelperLeft = undefined;
    }

    if (!show && this.meshHelperRight) {
        this.app.scene.remove(this.meshHelperRight);
        disposeObject(this.meshHelperRight, false);
        this.meshHelperRight = undefined;
    }

    for (var i = 0; i < this.materials.length; i++) {
        if (this.materials && this.materials[i]) {
            this.materials[i].transparent = show;
            this.materials[i].needsUpdate = true;
        }
    }

    this.setObjectMaterial('gB_ServoWheel002', this.materials[show ? 3 : 0]);   // left shoulder
    this.setObjectMaterial('gB_ServoWheel003', this.materials[show ? 4 : 0]);   // left elbow

    this.setObjectMaterial('gB_ServoWheel004', this.materials[show ? 3 : 0]);   // right shoulder
    this.setObjectMaterial('gB_ServoWheel005', this.materials[show ? 4 : 0]);   // right elbow

    //
    // if not playing, force creating helper tubes...
    if ((!this.isPlaying) && (this.currentPose != null) && (this.showHelpers)) {
        this.createHelperTubes(this.currentPose);
    }
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.setObjectMaterial = function(name, material)
{
    var obj = this.objects[name];
    if (isObject(obj))
        obj.material = material;
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.changeOpacity = function (opacity)
{
    for (var i = 0; i < this.materials.length; i++) {
        if (this.materials && this.materials[i]) {
            this.materials[i].opacity = opacity;
            this.materials[i].needsUpdate = true;
        }
    }
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.getWorldMatrix = function (name)
{
    var obj = this.objects[name];

    if (obj == undefined)
        return null;

    obj.updateMatrix();
    obj.updateMatrixWorld();

    return obj.matrixWorld.clone();
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.getWorldPosition = function (name)
{
    var obj = this.objects[name];

    if (obj == undefined)
        return null;

    obj.updateMatrix();
    obj.updateMatrixWorld();

    var mat = obj.matrixWorld;
    var pos = new THREE.Vector3();

    pos.setFromMatrixPosition(mat);

    return pos;
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.getVector = function(radius, phi, theta)
{
    y = radius * Math.cos(theta);
    x = radius * Math.sin(theta) * Math.sin(phi);
    z = radius * Math.sin(theta) * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.createHelperTubes = function (pose)
{
    if (!this.doneInitializing)
        return;

    if (this.meshHelperNeck) {
        this.app.scene.remove(this.meshHelperNeck);
        disposeObject(this.meshHelperNeck, false);
        this.meshHelperNeck = undefined;
    }

    if (this.meshHelperLeft) {
        this.app.scene.remove(this.meshHelperLeft);
        disposeObject(this.meshHelperLeft, false);
        this.meshHelperLeft = undefined;
    }

    if (this.meshHelperRight) {
        this.app.scene.remove(this.meshHelperRight);
        disposeObject(this.meshHelperRight, false);
        this.meshHelperRight = undefined;
    }

    var hd = pose['head']['current'];
    var re = pose['relbow']['current'];
    var rw = pose['rwrist']['current'];
    var le = pose['lelbow']['current'];
    var lw = pose['lwrist']['current'];

    var vec_hd = this.getVector((this.neck_len), hd["phi"], hd["theta"]);
    var vec_le = this.getVector(this.seg1_len, le["phi"], le["theta"]);
    var vec_lw = this.getVector(this.seg2_len, lw["phi"], lw["theta"]);
    var vec_re = this.getVector(this.seg1_len, re["phi"], re["theta"]);
    var vec_rw = this.getVector(this.seg2_len, rw["phi"], rw["theta"]);

    var positions;
    var pos;

    //
    // neck
    positions = [];
    pos = new THREE.Vector3(0, 0, 0);
    positions.push(pos);
    pos = pos.clone().add(vec_hd);
    positions.push(pos);

    this.meshHelperNeck = this.createHelperTube(positions);
    this.app.scene.add(this.meshHelperNeck);
    this.meshHelperNeck.parent = this.objNeck;

    this.helperHead.parent = this.objNeck;
    this.helperHead.position.x = positions[1].x;
    this.helperHead.position.y = positions[1].y;
    this.helperHead.position.z = positions[1].z;

    //
    // left
    positions = [];
    pos = new THREE.Vector3(33, 0, 0);
    positions.push(pos);
    pos = pos.clone().add(vec_le);
    positions.push(pos);
    pos = pos.clone().add(vec_lw);
    positions.push(pos);

    this.meshHelperLeft = this.createHelperTube(positions);
    this.app.scene.add(this.meshHelperLeft);
    this.meshHelperLeft.parent = this.objLShoulder;

    if (true) {
        var objects = [this.helperSphereL0, this.helperSphereL1, this.helperSphereL2];

        for (var i = 0; i < objects.length; i++) {
            if (objects[i]) {
                objects[i].parent = this.objLShoulder;
                objects[i].position.x = positions[i].x;
                objects[i].position.y = positions[i].y;
                objects[i].position.z = positions[i].z;
            }
        }
    }

    //
    // right
    positions = [];
    pos = new THREE.Vector3(-33, 0, 0);
    positions.push(pos);
    pos = pos.clone().add(vec_re);
    positions.push(pos);
    pos = pos.clone().add(vec_rw);
    positions.push(pos);

    this.meshHelperRight = this.createHelperTube(positions);
    this.app.scene.add(this.meshHelperRight);
    this.meshHelperRight.parent = this.objRShoulder;

    if (true) {
        var objects = [this.helperSphereR0, this.helperSphereR1, this.helperSphereR2];

        for (var i = 0; i < objects.length; i++) {
            if (objects[i]) {
                objects[i].parent = this.objRShoulder;
                objects[i].position.x = positions[i].x;
                objects[i].position.y = positions[i].y;
                objects[i].position.z = positions[i].z;
            }
        }
    }
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.createHelperTube = function (positions)
{
    var curve = new THREE.CurvePath();

    for (var i = 0; i < (positions.length-1); i++) {
        var lineCurve = new THREE.LineCurve3(positions[i], positions[i + 1]);

        curve.add(lineCurve);
    }

    var extrudePath = curve;
    var extrusionSegments = 100;
    var radius = 6;
    var radiusSegments = 14;
    var closed = false;

    var tubeGeometry = new THREE.TubeBufferGeometry(extrudePath, extrusionSegments, radius, radiusSegments, closed);

    curve = undefined;

    var mesh = new THREE.Mesh(tubeGeometry, this.helperMaterial);

    return mesh;
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.setPose = function (pose)
{
    //
    // clone pose
    this.currentPose = JSON.parse(JSON.stringify(pose));

    if (this.showHelpers) {
        this.createHelperTubes(pose);
    }
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.setServoAngleLimits = function (servoLimits)
{
    //
    // make a copy and store
    this.servoLimits = JSON.parse(JSON.stringify(servoLimits));
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.setServoTargets = function (servos, immediate=false)
{
    for (key in servos) {
        var servo = servos[key];
        var target = servo.target;
        var duration = servo.dur;

        if (this.servos[key].getTarget() == target)
            continue;

        if (immediate)
            this.servos[key].setTarget(target, 0.0);
        else
            this.servos[key].setTarget(target, duration);
    }
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.setControllerInfo = function (status, pose)
{
    var pos = parseFloat(status['position']);
    var dur = parseFloat(status['duration']);
    var playing = status['isPlaying'];

    if (this.isPlaying != playing) {
        this.isPlaying = playing;
    }

    this.gesturePosition = pos;
    this.gestureDuration = dur;

    this.setPose(pose);
}
//--------------------------------------------------------------------------------------------
gestureBot.prototype.update = function ()
{
    if (!this.doneInitializing)
        return;

    for (key in this.servos)
        this.servos[key].update();

    if (this.app && this.app.controls)
        this.app.controls.updateServos(this.servos);

    if (_divGraph) {
        values = [];

        for (key in this.servos) {
            var value = this.servos[key].getRotation();

            values.push(value);
        }

        _divGraph.addRotation(this.strName, values);
    }
}





//--------------------------------------------------------------------------------------------
function switchColors()
{
    var r, g, b, rg, gb, rb;
    var range = 255; // controls the range of r,g,b you would like
    //reduce the range if you want more darker colors
    var sep = range / 4; // controls the minimum separation for saturation
    //note- keep sep < range/3 otherwise may crash browser due to performance
    //reduce the sep if you do not mind pastel colors
    //generate r,g,b, values as long as any difference is < separation
    do {
        r = Math.floor(Math.random() * range);
        g = Math.floor(Math.random() * range);
        b = Math.floor(Math.random() * range);

        rg = Math.abs(r - g);
        gb = Math.abs(g - b);
        rb = Math.abs(r - b);
    } while (rg < sep || gb < sep || rb < sep);

    //convert the rgb to hex

    function rgbtohex(rgb) {
        var first, second; // makes the two hex code for each rgb value

        first = Math.floor(rgb / 16); //get first unit of hex
        second = rgb % 16; //get second unit of hex
        // convert to string with hex base 16
        first = first.toString(16);
        second = second.toString(16);
        //concatenate the two units of the hex
        var rgbtohex = first + second;
        //return the two unit hex code for the r,g,b value
        return rgbtohex;
    }

    //convert the r,g,b numbers to hex code by calling the rgbto hex function
    var r_str = rgbtohex(r),
        g_str = rgbtohex(g),
        b_str = rgbtohex(b);
    //concatenate the final string for the output
    var final = '#' + r_str + g_str + b_str;

    //output random color
    return final;
}
//--------------------------------------------------------------------------------------------
ServoGraph = function ()
{
    this.width = 600;
    this.height = 360;

    this.div = document.createElement('div');

    this.div.style.cssText = 'position:absolute;top:900px;opacity:0.8;z-index:100';
    document.body.appendChild(this.div);

    this.canvas = document.createElement('canvas');
    this.div.appendChild(this.canvas);

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');

    this.idx = 0;
    this.valuesArray = new Array(this.width);

    for (var i = 0; i < this.valuesArray.length; i++)
        this.valuesArray[i] = null;

    this.colors = new Array(64);

    for (var i = 0; i < this.colors.length; i++) {
        this.colors[i] = switchColors();
    }

    this.update();
}

ServoGraph.prototype.constructor = ServoGraph;

//--------------------------------------------------------------------------------------------
ServoGraph.prototype.addRotation = function (key, values)
{
    this.idx = this.idx + 1;
    if (this.idx >= this.width)
        this.idx = 0;

    var numValues = values.length;
    var a = this.valuesArray[this.idx];

    if ((a == null) || (a.length != numValues)) {
        a = new Array(numValues);
        this.valuesArray[this.idx] = a;
    }

    for (var i = 0; i < numValues; i++) {
        a[i] = values[i];
    }

    this.update();
}
//--------------------------------------------------------------------------------------------
ServoGraph.prototype.update = function ()
{
    this.ctx.fillStyle = '#e0e0ff';
    this.ctx.fillRect(0, 0, this.width, this.height);

    var x = 0;
    var i = this.idx + 1;
    if (i >= this.width)
        i = 0;

    while (i != this.idx) {
        var a = this.valuesArray[i];

        if (a != null) {
            for (var j = 0; j < a.length; j++) {
                value = a[j];

                var s = 2;
                var y = parseInt(value);

                this.ctx.fillStyle = this.colors[j];
                this.ctx.fillRect(x, y, s, s);
            }
        }

        i++;
        if (i > this.width)
            i = 0;

        x++;
    }
}

