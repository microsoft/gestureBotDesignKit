# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import time
import math
import threading
import copy
import json

from collections import OrderedDict

from .RS30X import RS30XController
from .RS30X import RS30XParameter
from .RS30X import Logger

# -----------------------------------------------------------------------------
#
class MSRAbotHardware:
    _self = None

    # -----------------------------------------------------------------------------
    #
    def __init__(self, msrabot):
        if (msrabot is None):
            print("ERROR in msrabotHardware.init(): msrabot object expected.")

        self._self = self
        self.msrabot = msrabot

        self.comPort = "com4"
        self.controller = None

        self.servoMap = { 'torso': 1, 'neck': 2, 'head': 3, 'lshoulder': 7, 'larm': 8, 'lhand': 9, 'rshoulder': 4, 'rarm': 5, 'rhand': 6 }

        #
        # adjust servo duration times to eliminate gaps between end of last 
        # target move with next target command, and yield a smoother gesture
        self.servoTimingAdjustment = 30.0

    # -----------------------------------------------------------------------------
    #
    def getPort(self):
        return self.comPort

    # -----------------------------------------------------------------------------
    #
    def setPort(self, port):
        self.comPort = port

    # -----------------------------------------------------------------------------
    #
    def getServoTimingAdjustment(self):
        return self.servoTimingAdjustment

    # -----------------------------------------------------------------------------
    #
    def setServoTimingAdjustment(self, servoTimingAdjustment, sendStatus = True):
        self.servoTimingAdjustment = servoTimingAdjustment

        if (sendStatus and self.msrabot and self.msrabot.fnSendMessage):
            status = {
                'msgType': "hardware", 
                'hardware': { "servoTimingAdjustment": self.servoTimingAdjustment }
            }

            self.msrabot.fnSendMessage(status)

    # -----------------------------------------------------------------------------
    #
    def connected(self):
        if (self.controller is None):
            return False

        return True

    # -----------------------------------------------------------------------------
    #
    def executeCommand(self, data):
        command = data['command']

        if (command == 'connect'):
            port = data['port']
            self.connect(port)
        elif (command == 'disconnect'):
            self.disconnect()
        elif (command == 'setServoTimingAdjustment'):
            servoTimingAdjustment = data['servoTimingAdjustment']
            self.setServoTimingAdjustment(servoTimingAdjustment)

    # -----------------------------------------------------------------------------
    #
    def connect(self, port):
        print("msrabot: connecting to port '" + str(port) + "'...")
        self.setPort(port)

        self.disconnect(False)
        self.controller = RS30XController(port)

        for key in self.servoMap:
            self.controller.torqueOn(self.servoMap[key])

        self.resetToDefaultPositions()

        if (self.msrabot and self.msrabot.fnSendMessage):
            status = {
                'msgType': "hardware", 
                'hardware': { "status": 'connected' }
            }

            self.msrabot.fnSendMessage(status)

    # -----------------------------------------------------------------------------
    #
    def disconnect(self, sendStatus = True):
        if (sendStatus):
            print("msrabot: disconnecting from port '" + str(self.comPort) + "'...")

        if (self.controller is not None):
            for key in self.servoMap:
                self.controller.torqueOff(self.servoMap[key])

            self.controller = None

        if (sendStatus and self.msrabot and self.msrabot.fnSendMessage):
            status = {
                'msgType': "hardware", 
                'hardware': { "status": 'disconnected' }
            }

            self.msrabot.fnSendMessage(status)

    # -----------------------------------------------------------------------------
    #
    def convPosToTenthDeg(self, pos):
        return int(round(pos * 10.0, 0))

    # -----------------------------------------------------------------------------
    #
    def resetToDefaultPositions(self):
        if (self.controller is None):
            return

        for key in self.servoMap:
            self.setManualServo(key, 0, 1)

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
    def clampAngle(self, angle, min, max):
        angle = float(angle)
        min = float(min)
        max = float(max)

        if (angle < min):
            return min
        elif (angle > max):
            return max

        return angle

    # -----------------------------------------------------------------------------
    #
    def setManualServo(self, key, target, duration):
        if (self.controller is None):
            return

        #
        # map target to servo range
        while (target < -(math.pi)):
            target = target + (math.pi * 2);

        while (target >= (math.pi)):
            target -= (math.pi * 2);

        if (not key in self.servoMap):
            print("hardware.setManualServo(): unknown joint '" + key + "'.")
            return

        id = self.servoMap[key]
        target = self.convertToDegrees(target)

        #
        # servo adjusts and limits
        if (key == 'torso'):
            target = -target
            target = self.clampAngle(target, -90, 90)
        elif (key == 'neck'):
            target = target
            target = self.clampAngle(target, -90, 90)
        elif (key == 'head'):
            target = target
        elif (key == 'lshoulder'):
            target = target
        elif (key == 'larm'):
            target = (-90) - target
            target = self.clampAngle(target, -90, 90)
        elif (key == 'lhand'):
            target = target
            target = self.clampAngle(target, -90, 90)
        elif (key == 'rshoulder'):
            target = target
        elif (key == 'rarm'):
            target = 90 + target
            target = self.clampAngle(target, -90, 90)
        elif (key == 'rhand'):
            target = -target
            target = self.clampAngle(target, -90, 90)

        target = self.convPosToTenthDeg(target)
        duration = (duration * 100.0) # unit is 10ms

        #
        # adjust timing...
        duration = duration + (self.servoTimingAdjustment / 10.0) # unit is 10ms

        self.controller.move(RS30XParameter(id, target, int(duration)))

    # -----------------------------------------------------------------------------
    #
    def setWheelInfo(self, lwheel, rwheel):
        pass

