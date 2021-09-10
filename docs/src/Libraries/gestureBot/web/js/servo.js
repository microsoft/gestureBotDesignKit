//--------------------------------------------------------------------------------------------
// Copyright(c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// --------------------------------------------------------------------------------------------

var     _servo_clock = new THREE.Clock(false);

if (_servo_clock) {
    _servo_clock.start();
}

//--------------------------------------------------------------------------------------------
Servo = function (strName, strJoint)
{
    this.strName = strName;
    this.strJoint = strJoint;
    this.objJoint = null;
    this.rotationOrder = 'XYZ';
    this.axis = 0;      // 0 = x, 1 = y, 2 = z
    this.rotation = 0.0;
    this.rotationFrom = 0.0;
    this.rotationTarget = 0.0;
    this.targetSetTime = _servo_clock.getElapsedTime();
    this.duration = 0.0;
    this.doneMoving = true;
    this.initialObjRotation = new THREE.Vector3();
    this.originalMatrix = new THREE.Matrix4();
}

Servo.prototype.constructor = Servo;

//--------------------------------------------------------------------------------------------
Servo.prototype.setJointObject = function (obj, axis, rotationOrder)
{
    this.objJoint = obj;
    this.axis = axis;
    this.rotationOrder = rotationOrder;

    if (obj != null) {
        this.initialObjRotation.x = obj.rotation.x;
        this.initialObjRotation.y = obj.rotation.y;
        this.initialObjRotation.z = obj.rotation.z;

        obj.updateWorldMatrix(true, false);
        obj.updateMatrixWorld(true);

        this.originalMatrix = obj.matrix;
    }
}
//--------------------------------------------------------------------------------------------
Servo.prototype.getJointObject = function ()
{
    return this.objJoint;
}
//--------------------------------------------------------------------------------------------
Servo.prototype.getName = function ()
{
    return this.strName;
}
//--------------------------------------------------------------------------------------------
Servo.prototype.getJointName = function ()
{
    return this.strJoint;
}
//--------------------------------------------------------------------------------------------
Servo.prototype.setTarget = function (rotationTarget, duration)
{
    //
    // adjust angle to 3d model's rotation axis
    switch (this.strName) {
        case "rshoulder":
        case "relbow":
            rotationTarget = -rotationTarget;
            break;
    }

    while (rotationTarget < 0.0)
        rotationTarget += 360.0;

    while (rotationTarget >= 360.0)
        rotationTarget -= 360.0;

    if (rotationTarget === this.rotation) {
        this.doneMoving = true;
        return;
    }

    if (isNaN(duration)) {
        console.log("Servo.setTarget(): duration is not a valid number!");
        duration = 0.0;
    }

    if (duration <= 0.0) {
        this.doneMoving = true;
        this.rotation = rotationTarget;
        this.rotationFrom = rotationTarget;
        this.rotationTarget = rotationTarget;
        this.targetSetTime = _servo_clock.getElapsedTime();
        return;
    }

    this.rotationTarget = rotationTarget;
    this.duration = duration;
    this.rotationFrom = this.rotation;
    this.targetSetTime = _servo_clock.getElapsedTime();
    this.doneMoving = false;

    //
    // look for shortest distance
    var distance = (this.rotationTarget - this.rotationFrom);
    if (Math.abs(distance) > 180.0) {
        if (this.rotationFrom >= 180.0)
            this.rotationFrom -= 360.0;

        if (this.rotationTarget >= 180.0)
            this.rotationTarget -= 360.0;
    }
}
//--------------------------------------------------------------------------------------------
Servo.prototype.getTarget = function ()
{
    return this.rotationTarget;
}
//--------------------------------------------------------------------------------------------
Servo.prototype.getDuration = function ()
{
    return this.duration;
}
//--------------------------------------------------------------------------------------------
Servo.prototype.getRotation = function ()
{
    return this.rotation;
}
//--------------------------------------------------------------------------------------------
Servo.prototype.setRotation = function (rotation)
{
    rotation = THREE.Math.degToRad(rotation);

    var obj = this.objJoint;

    if (obj == null) {
        console.log("Servo.setRotation(): OBJ IS NULL!!!! expected joint '" + this.strJoint + "'");
        return;
    }

    obj.rotation.order = this.rotationOrder;

    switch (this.axis) {
        default:
        case 0: obj.rotation.x = this.initialObjRotation.x + rotation; break;
        case 1: obj.rotation.y = this.initialObjRotation.y + rotation; break;
        case 2: obj.rotation.z = this.initialObjRotation.z + rotation; break;
    }
}
//--------------------------------------------------------------------------------------------
Servo.prototype.update = function ()
{
    var elapsedTime = (_servo_clock.getElapsedTime() - this.targetSetTime); // in s
    var s = elapsedTime / this.duration;

    if (s >= 1.0) {
        this.rotation = this.rotationTarget;
        this.doneMoving = true;
    } else {
        this.rotation = (this.rotationFrom + (this.rotationTarget - this.rotationFrom) * s);
    }

    this.setRotation(this.rotation);
}



