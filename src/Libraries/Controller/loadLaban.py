# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import json, operator
import numpy as np
import copy

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import Common.settings as settings

sys.path.append(os.path.dirname(__file__))
import jointLaban

class loadLaban():
    #------------------------------------------------------------------------------
    #
    def __init__(self):
        self.duration = 0.0
        self.tracks = {}
        self.frameTimes = []

        self.jointKeys = [
            'head', 
            'relbow', 
            'rwrist',
            'lelbow',
            'lwrist']

        self.parseLog = ""

        for joint in self.jointKeys:
            self.tracks[joint] = jointLaban.jointLaban(joint)

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
    def loadGesture(self, folder, fileName, forceLoad = False):
        #
        # reset
        self.fIsPlaying = False
        self.fResetPlay = True
        self.currentTime = 0.0

        if (self.currentFile is not None):
            if ((not forceLoad) and (folder.casefold() == self.currentFile['folder'].casefold()) and (fileName.casefold() == self.currentFile['file'].casefold())):
                return True

        self.currentFile = { "folder": folder, "file": fileName }

        self.parseLog = ""
        data = None
        success = False
        try:
            path = os.path.abspath(os.path.join(self.gesturePath, folder, fileName))

            with open(path) as f:
                data = json.load(f)

        except Exception as e:
            print("loadGesture() exception: ", e)
            return False

        if data is not None:
            success = self.parseGesturePositions(data)
            if (success is True):
                print("loaded '" + fileName + "': " + str(len(self.frameTimes)) + " frames. Performance duration: " + str(self.duration) + "s")
            else:
                print("file '" + fileName + "' is not a valid gesture file.")
        else:
            print("file '" + fileName + "' appears empty.")

        self.NotifyGestureUpdate()

        return success

    # -----------------------------------------------------------------------------
    #
    def logParsingError(self, msg):
        if (len(self.parseLog) > 0):
            self.parseLog = self.parseLog + "\r\n"

        self.parseLog = self.parseLog + msg

        print("    Parse Error: " + msg)

    # -----------------------------------------------------------------------------
    #
    def parseGesturePositions(self, data):
        self.currentTime = 0.0
        self.duration = 0.0
        self.tracks = {}

        for joint in self.jointKeys:
            self.tracks[joint] = jointLaban.jointLaban(joint)

        #
        # parse all the joints and supplementary information
        for idx in range(len(data)):
            pose = data[idx]
            time = 0.0

            if ('time' in pose):
                time = pose['time']
            else:
                self.logParsingError("Required 'time' information is missing at index " + str(idx) + "!")
                continue

            #
            # check for particular joints
            for joint in self.jointKeys:
                if (joint in pose):
                    self.tracks[joint].parseJoint(self, joint, time, pose[joint], idx)

        #
        # convert to key frames
        for joint in self.jointKeys:
            self.tracks[joint].convertToKeyFrames()

        #
        # calculate various information, create frameTimes array
        self.frameTimes = []
        for joint in self.jointKeys:
            tracks = self.tracks[joint]

            keyFrames = tracks.getKeyFrames()
            for iFrame in range(len(keyFrames)):
                time = keyFrames[iFrame]['time']
                if (time not in self.frameTimes):
                    self.frameTimes.append(time)

            self.frameTimes = sorted(self.frameTimes)

            duration = tracks.getDuration()
            if (self.duration < duration):
                self.duration = duration

        return True
