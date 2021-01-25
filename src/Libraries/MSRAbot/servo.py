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
import datetime

from collections import OrderedDict

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import Common.utilities as utilities

# -----------------------------------------------------------------------------
#
class MSRAbotServo:
    _self = None

    # -----------------------------------------------------------------------------
    #
    def __init__(self, key):
        self.key = key

        self.rotation = 0.0;
        self.rotationFrom = 0.0;
        self.rotationTarget = 0.0;
        self.targetSetTime = utilities.getTime()
        self.duration = 0.0;
        self.doneMoving = True;

    # -----------------------------------------------------------------------------
    #
    def getKey(self):
        return self.key

    # -----------------------------------------------------------------------------
    #
    def isMoving(self):
        return not self.doneMoving

    # -----------------------------------------------------------------------------
    #
    def getRotation(self):
        return self.rotation

    # -----------------------------------------------------------------------------
    #
    def setTarget(self, rotationTarget, duration):
        while (rotationTarget < 0.0):
            rotationTarget += (math.pi * 2)

        while (rotationTarget >= (math.pi * 2)):
            rotationTarget -= (math.pi * 2)

        if (round(rotationTarget, 3) == round(self.rotation, 3)):
            self.doneMoving = True;
            return;

        if (duration <= 0.0):
            self.doneMoving = True
            self.rotation = rotationTarget
            self.rotationFrom = rotationTarget
            self.rotationTarget = rotationTarget
            self.targetSetTime = utilities.getTime()
            self.duration = 0.0
            return

        self.rotationTarget = rotationTarget
        self.duration = duration
        self.rotationFrom = self.rotation
        self.targetSetTime = utilities.getTime()
        self.doneMoving = False

        #
        # look for shortest distance
        distance = (self.rotationTarget - self.rotationFrom)
        if (abs(distance) > math.pi):
            if (self.rotationFrom >= math.pi):
                self.rotationFrom -= (math.pi * 2)

            if (self.rotationTarget >= math.pi):
                self.rotationTarget -= (math.pi * 2)

    # -----------------------------------------------------------------------------
    #
    def update(self, time):
        if (self.doneMoving):
            return

        if (self.duration <= 0.0):
            return

        elapsedTime = (time - self.targetSetTime)
        s = elapsedTime / self.duration

        if (s >= 1.0):
            self.rotation = self.rotationTarget
            self.doneMoving = True
        else:
            self.rotation = (self.rotationFrom + (self.rotationTarget - self.rotationFrom) * s)

