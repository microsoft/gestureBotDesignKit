//--------------------------------------------------------------------------------------------
// Copyright(c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// --------------------------------------------------------------------------------------------

//--------------------------------------------------------------------------------------------
Skeleton = function (app)
{
    this.app = app;

    this.objBase = null;
    this.objBody = null;
    this.objects = [];

    this.gesturePosition = 0.0;
    this.gestureDuration = 0.0;

    this.groupShoulderL = null;
    this.groupShoulderR = null;
    this.groupNeck = null;
    this.meshLeftArmTubes = null;
    this.meshRightArmTubes = null;
    this.matTube = new THREE.MeshPhongMaterial({ color: 0xffff00, specular: 0x333333, shininess: 5 });

    this.doneInitializing = false;
}

Skeleton.prototype.constructor = Skeleton;

//--------------------------------------------------------------------------------------------
Skeleton.prototype.initialize = function initSkeleton(vReference, fInterpolateServoTargets = true)
{
    var scope = this;
    var arm_length = 45;

    this.seg1_head_len = 20;

    this.seg1_left_len = arm_length;
    this.seg2_left_len = arm_length;

    this.seg1_right_len = arm_length;
    this.seg2_right_len = arm_length;

    this.initializeHelpers();

    //
    // done. fire init complete event
    scope.doneInitializing = true;

    if (scope.app.eventDoneInit != null)
        document.dispatchEvent(scope.app.eventDoneInit);
}
//--------------------------------------------------------------------------------------------
Skeleton.prototype.initializeHelpers = function ()
{
    var sphereMaterial0 = new THREE.MeshPhongMaterial({ specular: 0x333333, shininess: 5, color: 0xff00ff });
    var sphereMaterial1 = new THREE.MeshPhongMaterial({ specular: 0x333333, shininess: 5, color: 0x00ff00 });
    var sphereMaterial2 = new THREE.MeshPhongMaterial({ specular: 0x333333, shininess: 5, color: 0x0000ff });
    var sphereMaterial3 = new THREE.MeshPhongMaterial({ specular: 0x333333, shininess: 5, color: 0x00ffff });
    var sphereGeometry = new THREE.SphereBufferGeometry(6, 16, 16);
    var sphereGeometry2 = new THREE.SphereBufferGeometry(14, 16, 16);
    var tubes;

    this.objBody = new THREE.Group();
    this.app.scene.add(this.objBody);
    this.objBody.position.x = 0.0;
    this.objBody.position.y = 184;
    this.objBody.position.z = 0;

    //
    // skeleton
    var joints = [
        new THREE.Vector3(  0,    0, 0),        //  0  chest
        new THREE.Vector3(  0,   12, 0),        //  1  neck
        new THREE.Vector3(-40,  -10, 0),        //  2  shoulder
        new THREE.Vector3( 40,  -10, 0),        //  3  shoulder
        new THREE.Vector3(  0,  -40, 0),        //  4  chest
        new THREE.Vector3(  0,  -80, 0),        //  5  stomach
        new THREE.Vector3(-25,  -90, 0),        //  6  hip
        new THREE.Vector3( 25,  -90, 0),        //  7  hip
        new THREE.Vector3(-25, -135, 0),        //  8  leg
        new THREE.Vector3( 25, -135, 0),        //  9  leg
        new THREE.Vector3(-25, -180, 0),        // 10  leg
        new THREE.Vector3( 25, -180, 0),        // 11  leg
    ];

    this.groupShoulderL = new THREE.Group();
    this.groupShoulderL.position.x = joints[3].x;
    this.groupShoulderL.position.y = joints[3].y;
    this.groupShoulderL.position.z = joints[3].z;
    this.objBody.add(this.groupShoulderL);

    this.groupShoulderR = new THREE.Group();
    this.groupShoulderR.position.x = joints[2].x;
    this.groupShoulderR.position.y = joints[2].y;
    this.groupShoulderR.position.z = joints[2].z;
    this.objBody.add(this.groupShoulderR);

    this.groupNeck = new THREE.Group();
    this.groupNeck.position.x = joints[1].x;
    this.groupNeck.position.y = joints[1].y;
    this.groupNeck.position.z = joints[1].z;
    this.objBody.add(this.groupNeck);

    this.addSpheres(joints, sphereGeometry, sphereMaterial3);

    var bones = [
        [0, 1], [0, 2], [0, 3], [2, 4], [3, 4], [4, 5], [5, 6], [5, 7], [6, 8], [7, 9], [8, 10], [9, 11]
    ];

    for (var i = 0; i < bones.length; i++) {
        positions = [];

        positions.push(joints[bones[i][0]].clone());
        positions.push(joints[bones[i][1]].clone());

        tubes = this.createHelperTube(positions);
        this.objBody.add(tubes);
    }

    this.helperSphereH = this.createMesh(sphereGeometry2, sphereMaterial0, this.groupNeck, 0.0, this.seg1_head_len, 0.0);

    //
    // left
    this.helperSphereL0 = this.createMesh(sphereGeometry, sphereMaterial0, this.groupShoulderL);
    this.helperSphereL1 = this.createMesh(sphereGeometry, sphereMaterial1, this.groupShoulderL);
    this.helperSphereL2 = this.createMesh(sphereGeometry, sphereMaterial2, this.groupShoulderL);

    //
    // right
    this.helperSphereR0 = this.createMesh(sphereGeometry, sphereMaterial0, this.groupShoulderR);
    this.helperSphereR1 = this.createMesh(sphereGeometry, sphereMaterial1, this.groupShoulderR);
    this.helperSphereR2 = this.createMesh(sphereGeometry, sphereMaterial2, this.groupShoulderR);
}
//--------------------------------------------------------------------------------------------
Skeleton.prototype.createMesh = function (geometry, material, parent = null, x = 0.0, y = 0.0, z = 0.0)
{
    var mesh;

    mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.position.x = x;
    mesh.position.y = y;
    mesh.position.z = z;

    if (parent != null)
        parent.add(mesh);

    return mesh;
}
//--------------------------------------------------------------------------------------------
Skeleton.prototype.addSpheres = function (positions, geometry, material)
{
    for (var i = 0; i < positions.length; i++) {
        // don't add duplicate spheres for shoulders
        if ((i == 2) || (i == 3))
            continue;

        var pos = positions[i];
        var sphere = this.createMesh(geometry, material, this.objBody, pos.x, pos.y, pos.z);
    }
}
//--------------------------------------------------------------------------------------------
Skeleton.prototype.getVector = function(radius, phi, theta)
{
    y = radius * Math.cos(theta);
    x = radius * Math.sin(theta) * Math.sin(phi);
    z = radius * Math.sin(theta) * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
}
//--------------------------------------------------------------------------------------------
Skeleton.prototype.createHelperTubes = function (pose)
{
    if (!this.doneInitializing)
        return;

    if (this.meshHelperHead) {
        this.app.scene.remove(this.meshHelperHead);
        disposeObject(this.meshHelperHead, false);
        this.meshHelperHead = undefined;
    }

    if (this.meshLeftArmTubes) {
        this.app.scene.remove(this.meshLeftArmTubes);
        disposeObject(this.meshLeftArmTubes, false);
        this.meshLeftArmTubes = undefined;
    }

    if (this.meshRightArmTubes) {
        this.app.scene.remove(this.meshRightArmTubes);
        disposeObject(this.meshRightArmTubes, false);
        this.meshRightArmTubes = undefined;
    }

    var hd = pose['head'].current;
    var re = pose['relbow'].current;
    var rw = pose['rwrist'].current;
    var le = pose['lelbow'].current;
    var lw = pose['lwrist'].current;

    var vec_le = this.getVector(this.seg1_left_len, le["phi"], le["theta"]);
    var vec_lw = this.getVector(this.seg2_left_len, lw["phi"], lw["theta"]);
    var vec_re = this.getVector(this.seg1_right_len, re["phi"], re["theta"]);
    var vec_rw = this.getVector(this.seg2_right_len, rw["phi"], rw["theta"]);
    var vec_hd = this.getVector(this.seg1_head_len, hd["phi"], hd["theta"]);

    var positions;
    var pos;

    //
    // head
    positions = [];
    pos = new THREE.Vector3(0, 0, 0);
    positions.push(pos);
    pos = pos.clone().add(vec_hd);
    positions.push(pos);

    this.meshHelperHead = this.createHelperTube(positions);
    this.app.scene.add(this.meshHelperHead);
    this.meshHelperHead.parent = this.groupNeck;

    if (this.helperSphereH) {
        this.helperSphereH.position.x = pos.x;
        this.helperSphereH.position.y = pos.y;
        this.helperSphereH.position.z = pos.z;
    }

    //
    // left arm
    positions = [];
    pos = new THREE.Vector3(0, 0, 0);
    positions.push(pos);
    pos = pos.clone().add(vec_le);
    positions.push(pos);
    pos = pos.clone().add(vec_lw);
    positions.push(pos);

    this.meshLeftArmTubes = this.createHelperTube(positions);
    this.app.scene.add(this.meshLeftArmTubes);
    this.meshLeftArmTubes.parent = this.groupShoulderL;

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
    pos = new THREE.Vector3(0, 0, 0);
    positions.push(pos);
    pos = pos.clone().add(vec_re);
    positions.push(pos);
    pos = pos.clone().add(vec_rw);
    positions.push(pos);

    this.meshRightArmTubes = this.createHelperTube(positions);
    this.app.scene.add(this.meshRightArmTubes);
    this.meshRightArmTubes.parent = this.groupShoulderR;

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
Skeleton.prototype.createHelperTube = function (positions)
{
    var curve = new THREE.CurvePath();

    for (var i = 0; i < (positions.length-1); i++) {
        var lineCurve = new THREE.LineCurve3(positions[i], positions[i + 1]);

        curve.add(lineCurve);
    }

    var extrudePath = curve;
    var extrusionSegments = 100;
    var radius = 4;
    var radiusSegments = 14;
    var closed = false;

    var tubeGeometry = new THREE.TubeBufferGeometry(extrudePath, extrusionSegments, radius, radiusSegments, closed);

    curve = undefined;

    var mesh = new THREE.Mesh(tubeGeometry, this.matTube);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}
//--------------------------------------------------------------------------------------------
Skeleton.prototype.setPose = function (pose)
{
    this.createHelperTubes(pose);
}
//--------------------------------------------------------------------------------------------
Skeleton.prototype.update = function ()
{
    if (!this.doneInitializing)
        return;
}
