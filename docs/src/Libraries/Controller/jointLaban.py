# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import copy
import json, operator
import numpy as np

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import Common.settings as settings

class jointLaban:
    #------------------------------------------------------------------------------
    #
    def __init__(self, key):
        self.rawPoses = []
        self.keyFrames = []
        self.key = key
        self.duration = 0.0
        self.lastkeyFrameIndex = -1

        if (key == 'head'):
            theta = self.convertToRadians(0.0) # forward
            phi = self.convertToRadians(0.0) # normal
        else:
            theta = self.convertToRadians(175.0) # place
            phi = self.convertToRadians(0.0) # low

        self.current = { 'time': 0, 'theta': theta, 'phi': phi }
        self.fromTarget = { 'time': 0, 'theta': theta, 'phi': phi }
        self.toTarget = { 'time': 0, 'theta': theta, 'phi': phi }
        self.s = 0.0

    #------------------------------------------------------------------------------
    #
    def parseJoint(self, parent, key, time, data, idx):
        success = False
        rawPose = {}
        rawPose['time'] = time

        if ('dur' not in data):
            parent.logParsingError("Required 'dur' information is missing at index " + str(idx) + ", key '" + key + "'")
            return False

        if ('dir' not in data):
            parent.logParsingError("Required 'dir' information is missing at index " + str(idx) + ", key '" + key + "'")
            return False

        if ('lvl' not in data):
            parent.logParsingError("Required 'lvl' information is missing at index " + str(idx) + ", key '" + key + "'")
            return False

        # duration
        rawPose['dur'] = data['dur']

        # convert joint information
        if (key.lower() == "head"):
            success = self.convertHeadLabanotation(parent, rawPose, data, idx, key)
        else:
            success = self.convertArmLabanotation(parent, rawPose, data, idx, key)

        if (success is False):
            return False

        self.rawPoses.append(rawPose)

        return True

    # -----------------------------------------------------------------------------
    #
    def convertArmLabanotation(self, parent, rawPose, data, idx, key):
        phi = 0.0
        theta = 180.0

        dir = data['dir'].lower()
        lvl = data['lvl'].lower()

        if (lvl == "high"):
            theta = 45.0
        elif (lvl == "normal"):
            theta = 90.0
        elif (lvl == "low"):
            theta = 135.0
        else:
            theta = 180.0
            parent.logParsingError("Unknown level '" + lvl + "' specified at index " + str(idx) + ", key '" + key + "'")

        if (dir == "forward"):
            phi = 0.0
        elif (dir == "right forward"):
            phi = -45.0
        elif (dir == "right"):
            phi = -90.0
        elif (dir == "right backward"):
            phi = -135.0
        elif (dir == "backward"):
            phi = 180.0
        elif (dir == "left backward"):
            phi = 135.0
        elif (dir == "left"):
            phi = 90.0
        elif (dir == "left forward"):
            phi = 45.0
        elif (dir == "place"):
            if (lvl == "high"):
                theta = 5.0
                phi = 0.0
            elif (lvl == "low"):
                theta = 175.0
                phi = 0.0
            else:
                theta = 180.0
                phi = 0.0
                if (lvl == "normal"):
                    parent.logParsingError("'place:normal' is ambiguous and not supported at index " + str(idx) + ", key '" + key + "'")
        else:
            phi = 0;
            parent.logParsingError("Unknown direction '" + dir + "' specified at index " + str(idx) + ", key '" + key + "'")

        rawPose['theta'] = self.convertToRadians(theta);
        rawPose['phi'] = self.convertToRadians(phi);
        rawPose['dir'] = dir
        rawPose['lvl'] = lvl

        return True

    # -----------------------------------------------------------------------------
    #
    def convertHeadLabanotation(self, parent, rawPose, data, idx, key):
        phi = 0.0
        theta = 180.0

        dir = data['dir'].lower()
        lvl = data['lvl'].lower()

        if (lvl == "high"):
            theta = -30.0
        elif (lvl == "normal"):
            theta = 0.0
        elif (lvl == "low"):
            theta = 30.0
        else:
            theta = 180.0
            parent.logParsingError("Unknown level '" + lvl + "' specified at index " + str(idx) + ", key '" + key + "'")

        if (dir == "forward"):
            phi = 0.0
        elif (dir == "right forward"):
            phi = -45.0
        elif (dir == "right"):
            phi = -90.0
        elif (dir == "left"):
            phi = 90.0
        elif (dir == "left forward"):
            phi = 45.0
        elif (dir == "place"):
            if (lvl == "high"):
                theta = 0.0
                phi = 0.0
            elif (lvl == "low"):
                theta = 180.0
                phi = 0.0
            else:
                theta = 0.0
                phi = 0.0
                if (lvl == "normal"):
                    parent.logParsingError("'place:normal' is ambiguous and not supported at index " + str(idx) + ", key '" + key + "'")
        else:
            phi = 0;
            parent.logParsingError("Unknown direction '" + dir + "' specified at index " + str(idx) + ", key '" + key + "'")

        rawPose['theta'] = self.convertToRadians(theta);
        rawPose['phi'] = self.convertToRadians(phi);
        rawPose['dir'] = dir
        rawPose['lvl'] = lvl

        return True

    #------------------------------------------------------------------------------
    #
    def convertToKeyFrames(self):
        #
        # sort raw poses by time and duration
        self.rawPoses = sorted(self.rawPoses, key=operator.itemgetter('time', 'dur'))

        self.keyFrames = []

        expectedKFTime = -1
        lastKeyFrame = None

        for idx in range(len(self.rawPoses)):
            keyFrame = {}
            rawPose = self.rawPoses[idx]

            #
            # due to the precision how Python stores and represents float values, there will be 
            # a difference to the true decimal value. We therefor round our values to 3 decimal 
            # digits and to the nearest millisecond in order to guarantee correct comparisons and
            # calculations.

            time = round(rawPose['time'], 3)
            duration = round(rawPose['dur'], 3)

            if ((idx > 0) and (expectedKFTime is not -1) and (lastKeyFrame is not None)):
                #
                # do we need to create a keyframe start position for this pose?
                if (expectedKFTime != time):
                    start = copy.deepcopy(lastKeyFrame)
                    start['time'] = time
                    self.keyFrames.append(start)
                    print("Inserted a keyframe start position at index " + str(idx) + ", joint '" + self.key + "'.")

            keyFrame['time'] = (time + duration)
            keyFrame['theta'] = rawPose['theta']
            keyFrame['phi'] = rawPose['phi']
            keyFrame['dir'] = rawPose['dir']
            keyFrame['lvl'] = rawPose['lvl']

            expectedKFTime = round((time + duration), 3)
            lastKeyFrame = keyFrame

            self.keyFrames.append(keyFrame)

        if (len(self.keyFrames) > 0):
            self.duration = self.keyFrames[len(self.keyFrames) - 1]['time']

    #------------------------------------------------------------------------------
    #
    def findPose(self, time, fSetCurrent = False):
        fFoundPlacement = False
        for idx in range(len(self.keyFrames)):
            keyFrame = self.keyFrames[idx]
            tk = keyFrame['time']
            if ((idx == 0) and (time <= tk)):
                if (self.lastkeyFrameIndex is not idx):
                    # interpolate from last known state to this new state
                    self.fromTarget = { 'time': 0.0, 'theta': self.current['theta'], 'phi': self.current['phi'] }
                    self.toTarget = keyFrame
                    self.lastkeyFrameIndex = idx

                if (tk == 0.0):
                    self.s = 0
                else:
                    self.s = time / tk

                fFoundPlacement = True
                break
            else:
                prevKeyFrame = self.keyFrames[idx-1]
                tpk = prevKeyFrame['time']
                if ((tpk <= time) and (time <= tk)):
                    fFoundPlacement = True
                    if (self.lastkeyFrameIndex is not idx):
                        self.lastkeyFrameIndex = idx
                        self.fromTarget = prevKeyFrame
                        self.toTarget = keyFrame

                    if (tpk == tk):
                        self.s = 0
                    else:
                        self.s = (time - tpk) / (tk - tpk)

        if (not fFoundPlacement):
            print("findPose() error: did not find suitable pose.")
            return None

        # interpolate between 'from' and 'to' targets using s
        fromTheta = self.fromTarget['theta']
        fromPhi = self.fromTarget['phi']
        toTheta = self.toTarget['theta']
        toPhi = self.toTarget['phi']

        newPose = {}
        newPose['time'] = time
        newPose['theta'] = fromTheta + (toTheta - fromTheta) * self.s
        newPose['phi'] = fromPhi + (toPhi - fromPhi) * self.s

        if (fSetCurrent):
            self.current['time'] = newPose['time']
            self.current['theta'] = newPose['theta']
            self.current['phi'] = newPose['phi']

        return newPose

    # -----------------------------------------------------------------------------
    #
    def convertToRadians(self, degrees):
       return (degrees * 3.141592654 / 180.0)

    # -----------------------------------------------------------------------------
    #
    def convertToDegrees(self, radians):
       return (radians * 180.0 / 3.141592654)

    #------------------------------------------------------------------------------
    #
    def getKey(self):
        return self.key

    #------------------------------------------------------------------------------
    #
    def getKeyFrames(self):
        return self.keyFrames

    #------------------------------------------------------------------------------
    #
    def getDuration(self):
        return self.duration

    #------------------------------------------------------------------------------
    #
    def getCurrentPose(self):
        return {
            'current': self.current,
            'from':    self.fromTarget,
            'to':      self.toTarget,
            's':       self.s
        }


