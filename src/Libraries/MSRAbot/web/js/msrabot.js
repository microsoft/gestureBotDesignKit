//--------------------------------------------------------------------------------------------
// Copyright(c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// --------------------------------------------------------------------------------------------

//--------------------------------------------------------------------------------------------
MSRAbot = function (app)
{
    this.app = app;

    this.objBase = null;
    this.objBody = null;
    this.objects = [];

    this.gesturePosition = 0.0;
    this.gestureDuration = 0.0;

    this.lastLShoulderTheta = { value: 0.0 };
    this.lastLElbowTheta = { value: 0.0 };
    this.lastRShoulderTheta = { value: 0.0 };
    this.lastRElbowTheta = { value: 0.0 };

    this.showHelpers = false;
    this.meshHelperNeck = null;
    this.meshHelperLeft = null;
    this.meshHelperRight = null;
    this.helperMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00, side: THREE.DoubleSide });

    var servoJointMap = { "torso": "Body", "head": "Face", "neck": "Neck_Joint", "lshoulder": "Shoulder_Left", "larm": "Upper_Arm_Left", "lelbow": "Elbow_Left", "lhand": "Hand_Left", "rshoulder": "Shoulder_Right", "rarm": "Upper_Arm_Right", "relbow": "Elbow_Right", "rhand": "Hand_Right" };

    this.currentPose = null;

    this.servos = [];

    for (key in servoJointMap) {
        var joint = servoJointMap[key];

        this.servos[key] = new Servo(key, joint);
    }

    this.doneInitializing = false;
}

MSRAbot.prototype.constructor = MSRAbot;

//--------------------------------------------------------------------------------------------
MSRAbot.prototype.initialize = function initMSRAbot(vReference, fInterpolateServoTargets = true)
{
    //
    // see https://threejs.org/docs/index.html#examples/en/loaders/GLTFLoader
    //
    var scope = this;

    this.fInterpolateServoTargets = fInterpolateServoTargets;

    this.materials = [
        new THREE.MeshPhongMaterial({ color: 0xEBEAE2, opacity: 0.6, transparent: true, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0x87B5C9, opacity: 0.6, transparent: true, flatShading: true  }),
        new THREE.MeshPhongMaterial({ color: 0x404040, opacity: 0.6, transparent: true, flatShading: true  }),
        new THREE.MeshPhongMaterial({ color: 0xff0000, opacity: 0.6, transparent: true, flatShading: true  }),
        new THREE.MeshPhongMaterial({ color: 0x00ff00, opacity: 0.6, transparent: true, flatShading: true  }),
        new THREE.MeshPhongMaterial({ color: 0x0000ff, opacity: 0.6, transparent: true, flatShading: true  }),
        new THREE.MeshPhongMaterial({ color: 0xfff0f0, opacity: 0.6, transparent: true, flatShading: true  })
    ];

    var loader = new THREE.GLTFLoader().setPath('./models/');
    var file = 'MSRAbot.v0.7.2.glb';

    loader.load(file, function (gltf) {
        gltf.scene.traverse(function (child) {
            var pn = child.parent ? (child.parent.name) : "";

            scope.objects[child.name] = child;

            if (child.name == 'Base') {
                scope.objBase = child;
                child.position.set(vReference.x, vReference.y, vReference.z);
            } else if (child.name == 'Body') {
                scope.objBody = child;
            }


            if (child.name == 'Hood')
                child.material = scope.materials[1];
            else if (child.name == 'Eye')
                child.material = scope.materials[2];
            else if (child.name == 'SensorPlate')
                child.material = scope.materials[1];
            else if (child.name == 'MicrophonePlate')
                child.material = scope.materials[2];
            else
                child.material = scope.materials[0];

            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scope.initializeModelObjects();

        scope.setShowHelpers(scope.showHelpers);

        //
        // done. fire init complete event
        scope.doneInitializing = true;

        if (scope.app.eventDoneInit != null)
            document.dispatchEvent(scope.app.eventDoneInit);
    });
}
//--------------------------------------------------------------------------------------------
MSRAbot.prototype.initializeModelObjects = function ()
{
    if (this.objBase) {
        this.objBase.updateMatrix();
        this.objBase.updateMatrixWorld(true);

        this.app.scene.add(this.objBase);
    }

    //
    // reset arms to default servo positions
    for (key in this.servos) {
        var servo = this.servos[key];
        var jointName = servo.getJointName();

        obj = this.objects[jointName];
        if (isObject(obj)) {
            switch (jointName) {
                case "Shoulder_Left":   obj.rotation.z = 0.0;   break;
                case "Upper_Arm_Left":  obj.rotation.y = Math.PI / 2.0;   break;
                case "Elbow_Left":      obj.rotation.y = Math.PI / 2.0;   break;
                case "Hand_Left":       obj.rotation.x = 0.0;   break;

                case "Shoulder_Right":  obj.rotation.z = 0.0;   break;
                case "Upper_Arm_Right": obj.rotation.y = Math.PI / 2.0; break;
                case "Elbow_Right":     obj.rotation.y = Math.PI / 2.0;   break;
                case "Hand_Right":      obj.rotation.x = 0.0;   break;
            }
        } else {
            console.error("The MSRAbot 3D model does not contain required object of name '" + jointName + "'!");
            window.alert("The MSRAbot 3D model does not contain required object of name '" + jointName + "'!");
        }

        obj.updateWorldMatrix(true, false);
        obj.updateMatrixWorld(true);
    }

    //
    // map servos to model objects
    for (key in this.servos) {
        var servo = this.servos[key];
        var jointName = servo.getJointName();

        obj = this.objects[jointName];
        if (isObject(obj)) {
            switch (jointName) {
                default:                servo.setJointObject(obj, 2, 'XYZ'); break;

                case "Body":            servo.setJointObject(obj, 1, 'XYZ'); break;
                case "Face":            servo.setJointObject(obj, 0, 'ZYX'); break;
                case "Neck_Joint":      servo.setJointObject(obj, 2, 'XYZ'); break;

                case "Shoulder_Left":   servo.setJointObject(obj, 2, 'XYZ'); break;
                case "Upper_Arm_Left":  servo.setJointObject(obj, 1, 'XYZ'); break;
                case "Elbow_Left":      servo.setJointObject(obj, 1, 'XYZ'); break;
                case "Hand_Left":       servo.setJointObject(obj, 0, 'YZX'); break;

                case "Shoulder_Right":  servo.setJointObject(obj, 2, 'XYZ'); break;
                case "Upper_Arm_Right": servo.setJointObject(obj, 1, 'XYZ'); break;
                case "Elbow_Right":     servo.setJointObject(obj, 1, 'XYZ'); break;
                case "Hand_Right":      servo.setJointObject(obj, 0, 'YZX'); break;
            }
        } else {
            console.error("The MSRAbot 3D model does not contain required object of name '" + jointName + "'!");
            window.alert("The MSRAbot 3D model does not contain required object of name '" + jointName + "'!");
        }
    }

    //
    // calculate arm segement lengths
    {
        var pos1, pos2;
        var arm_length = 50;

        //
        // left arm
        pos1 = this.getWorldPosition("Upper_Arm_Left");
        pos2 = this.getWorldPosition("Hand_Left");

        this.seg1_left_len = pos2.sub(pos1).length();
        this.seg2_left_len = arm_length;

        //
        // right arm
        pos1 = this.getWorldPosition("Upper_Arm_Right");
        pos2 = this.getWorldPosition("Hand_Right");

        this.seg1_right_len = pos2.sub(pos1).length();
        this.seg2_right_len = arm_length;
    }

    this.initializeHelpers();
}
//--------------------------------------------------------------------------------------------
MSRAbot.prototype.initializeHelpers = function ()
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
    this.helperHead.parent = this.objBody;

    //
    // left
    this.helperSphereL0 = new THREE.Mesh(sphereGeometry, sphereMaterial0);
    this.app.scene.add(this.helperSphereL0);
    this.helperSphereL0.parent = this.objBody;

    this.helperSphereL1 = new THREE.Mesh(sphereGeometry, sphereMaterial1);
    this.app.scene.add(this.helperSphereL1);
    this.helperSphereL1.parent = this.objBody;

    this.helperSphereL2 = new THREE.Mesh(sphereGeometry, sphereMaterial2);
    this.app.scene.add(this.helperSphereL2);
    this.helperSphereL2.parent = this.objBody;

    //
    // right
    this.helperSphereR0 = new THREE.Mesh(sphereGeometry, sphereMaterial0);
    this.app.scene.add(this.helperSphereR0);
    this.helperSphereR0.parent = this.objBody;

    this.helperSphereR1 = new THREE.Mesh(sphereGeometry, sphereMaterial1);
    this.app.scene.add(this.helperSphereR1);
    this.helperSphereR1.parent = this.objBody;

    this.helperSphereR2 = new THREE.Mesh(sphereGeometry, sphereMaterial2);
    this.app.scene.add(this.helperSphereR2);
    this.helperSphereR2.parent = this.objBody;
}
//--------------------------------------------------------------------------------------------
MSRAbot.prototype.setShowHelpers = function (show)
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

    this.setObjectMaterial('Shoulder_Cover_Right_A', this.materials[show ? 3 : 0]);
    this.setObjectMaterial('Shoulder_Cover_Right_B', this.materials[show ? 4 : 0]);

    this.setObjectMaterial('Elbow_Cover_Right_A', this.materials[show ? 3 : 0]);
    this.setObjectMaterial('Elbow_Cover_Right_B', this.materials[show ? 4 : 0]);

    this.setObjectMaterial('Shoulder_Cover_Left_A', this.materials[show ? 3 : 0]);
    this.setObjectMaterial('Shoulder_Cover_Left_B', this.materials[show ? 4 : 0]);

    this.setObjectMaterial('Elbow_Cover_Left_A', this.materials[show ? 3 : 0]);
    this.setObjectMaterial('Elbow_Cover_Left_B', this.materials[show ? 4 : 0]);

    //
    // if not playing, force creating helper tubes...
    if ((!this.isPlaying) && (this.currentPose != null) && (this.showHelpers)) {
        this.createHelperTubes(this.currentPose);
    }
}
//--------------------------------------------------------------------------------------------
MSRAbot.prototype.setObjectMaterial = function(name, material)
{
    var obj = this.objects[name];
    if (isObject(obj))
        obj.material = material;
}
//--------------------------------------------------------------------------------------------
MSRAbot.prototype.changeOpacity = function (opacity)
{
    for (var i = 0; i < this.materials.length; i++) {
        if (this.materials && this.materials[i]) {
            this.materials[i].opacity = opacity;
            this.materials[i].needsUpdate = true;
        }
    }
}
//--------------------------------------------------------------------------------------------
MSRAbot.prototype.getWorldMatrix = function (name)
{
    var obj = this.objects[name];

    if (obj == undefined)
        return null;

    obj.updateMatrix();
    obj.updateMatrixWorld();

    return obj.matrixWorld.clone();
}
//--------------------------------------------------------------------------------------------
MSRAbot.prototype.getWorldPosition = function (name)
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
MSRAbot.prototype.getVector = function(radius, phi, theta)
{
    y = radius * Math.cos(theta);
    x = radius * Math.sin(theta) * Math.sin(phi);
    z = radius * Math.sin(theta) * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
}
//--------------------------------------------------------------------------------------------
MSRAbot.prototype.createHelperTubes = function (pose)
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

    var vec_hd = this.getVector((this.seg1_left_len * 1.2), hd["phi"], hd["theta"]);
    var vec_le = this.getVector(this.seg1_left_len, le["phi"], le["theta"]);
    var vec_lw = this.getVector(this.seg2_left_len, lw["phi"], lw["theta"]);
    var vec_re = this.getVector(this.seg1_right_len, re["phi"], re["theta"]);
    var vec_rw = this.getVector(this.seg2_right_len, rw["phi"], rw["theta"]);

    var positions;
    var pos;

    //
    // left neck
    positions = [];
    pos = new THREE.Vector3(0, 70, 0); // "Upper_Arm_Left";
    positions.push(pos);
    pos = pos.clone().add(vec_hd);
    positions.push(pos);

    this.meshHelperNeck = this.createHelperTube(positions);
    this.app.scene.add(this.meshHelperNeck);
    this.meshHelperNeck.parent = this.objBody;

    this.helperHead.position.x = positions[1].x;
    this.helperHead.position.y = positions[1].y;
    this.helperHead.position.z = positions[1].z;

    //
    // left arm
    positions = [];
    pos = new THREE.Vector3(67, 53, 0); // "Upper_Arm_Left";
    positions.push(pos);
    pos = pos.clone().add(vec_le);
    positions.push(pos);
    pos = pos.clone().add(vec_lw);
    positions.push(pos);

    this.meshHelperLeft = this.createHelperTube(positions);
    this.app.scene.add(this.meshHelperLeft);
    this.meshHelperLeft.parent = this.objBody;

    if (true) {
        var objects = [this.helperSphereL0, this.helperSphereL1, this.helperSphereL2];

        for (var i = 0; i < objects.length; i++) {
            if (objects[i]) {
                objects[i].position.x = positions[i].x;
                objects[i].position.y = positions[i].y;
                objects[i].position.z = positions[i].z;
            }
        }
    }

    //
    // right arm
    positions = [];
    pos = new THREE.Vector3(-63, 53, 0); // "Upper_Arm_Right"
    positions.push(pos);
    pos = pos.clone().add(vec_re);
    positions.push(pos);
    pos = pos.clone().add(vec_rw);
    positions.push(pos);

    this.meshHelperRight = this.createHelperTube(positions);
    this.app.scene.add(this.meshHelperRight);
    this.meshHelperRight.parent = this.objBody;

    if (true) {
        var objects = [this.helperSphereR0, this.helperSphereR1, this.helperSphereR2];

        for (var i = 0; i < objects.length; i++) {
            if (objects[i]) {
                objects[i].position.x = positions[i].x;
                objects[i].position.y = positions[i].y;
                objects[i].position.z = positions[i].z;
            }
        }
    }
}
//--------------------------------------------------------------------------------------------
MSRAbot.prototype.createHelperTube = function (positions)
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
MSRAbot.prototype.setPose = function (pose)
{
    //
    // clone pose
    this.currentPose = JSON.parse(JSON.stringify(pose));

    if (this.showHelpers) {
        this.createHelperTubes(pose);
    }
}
//--------------------------------------------------------------------------------------------
MSRAbot.prototype.setServoTargets = function (servos)
{
    if (!this.doneInitializing)
        return;

    for (key in servos) {
        var servo = servos[key];
        var target = servo.target;
        var duration = servo.dur;

        if ((this.isPlaying) && (this.servos[key].getTarget() == target))
            continue;

        this.servos[key].setTarget(target, duration);
    }
}
//--------------------------------------------------------------------------------------------
MSRAbot.prototype.setControllerInfo = function (status, pose)
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
MSRAbot.prototype.update = function ()
{
    if (!this.doneInitializing)
        return;

    for (key in this.servos)
        this.servos[key].update();

    if (this.app && this.app.controls)
        this.app.controls.updateServos(this.servos);
}
