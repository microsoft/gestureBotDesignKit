# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import copy
import json
import threading
import time
import operator
import glob
import numpy as np

sys.path.append(os.path.dirname(__file__))
import drawLaban
import loadLaban

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import Common.utilities as utilities
import Common.webSocket as webSocket

# -----------------------------------------------------------------------------
#
class Controller(loadLaban.loadLaban, drawLaban.drawLaban, webSocket.HttpServerWrapper):

    # -----------------------------------------------------------------------------
    #
    def __init__(self, **args):
        self.context = args.get('context')
        if (self.context is None):
            self.context = "controller"

        self.fnStatusUpdate = args.get('fnStatusUpdate')
        self.fnGestureUpdate = args.get('fnGestureUpdate')
        self.fnRequestShutdown = args.get('fnRequestShutdown')

        self.calculatedFPS = 0
        self.targetFPS = 30
        self.spf = 1.0 / self.targetFPS

        self.fKeepRunning = True
        self.fResetPlayTime = False
        self.fIsPlaying = False
        self.fRepeat = False
        self.currentFile = None
        self.currentTime = 0.0

        self.gesturePath = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'Labanotation'))

        self.getGestureFolders()
        self.scanFolderForGestures()

        #
        # initialize inherited classes
        loadLaban.loadLaban.__init__(self)
        drawLaban.drawLaban.__init__(self)

        #
        # start a thread for our gesture loop
        self.thread = threading.Thread(target = self.threadFunction, args=(1,))
        self.thread.start()

        #
        # if requested, create and initialize http server to access controller
        httpPort = args.get('httpPort')
        path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'web'))

        webSocket.HttpServerWrapper.__init__(self, httpPort, path, self.context)

    # -----------------------------------------------------------------------------
    #
    def close(self):
        self.fKeepRunning = False

        # close http server
        super().close()

    # -----------------------------------------------------------------------------
    #
    def getGestureFolders(self):
        self.labanotationFiles = { } 

        len_path = len(self.gesturePath)
        idx = 0

        folders = glob.glob(self.gesturePath + "/*/")
        for folder in folders:
            name = folder[len_path:]
            if ((len(name) > 0) and name.startswith("\\")):
                name = name[1:]

            if ((len(name) > 0) and name.endswith("\\")):
                name = name[0:-1]

            self.labanotationFiles[idx] = { 'name': name, 'folder': "./" + name + '/' }
            idx = idx + 1

    # -----------------------------------------------------------------------------
    #
    def scanFolderForGestures(self):
        try:
            for key in self.labanotationFiles:
                set = self.labanotationFiles[key]
                folder = set['folder']
                path = os.path.join(self.gesturePath, folder)

                if (path[-1] is not '\\') or (path[-1] is not '/'):
                    path = path + '/'

                files = os.listdir(path)
                files.sort()

                if (len(files) > 0):
                    # filter json files
                    jsonFiles = []
                    for file in files:
                        if file.endswith('.json'):
                            jsonFiles.append(file)

                    set['files'] = jsonFiles
        except Exception as e:
            if ((e.errno) and (e.errno == 2)):
                print("scanFolderForGestures() error: '" + e.filename + "' - " + e.strerror)
            else:
                print("scanFolderForGestures() exception: ", e)

    # -----------------------------------------------------------------------------
    #
    def onWSConnect(self):
        status = {
            'msgType': "initialization", 
            'initialization': {
                "labanotationFiles": self.getLabanotationGestures()
            }
        }

        status["gestureInfo"] = self.getGestureInfo()
        status["pose"] = self.getPose()
        status["status"] = self.getStatus()

        return status

    # -----------------------------------------------------------------------------
    #
    def onWSDisconnect(self):
        pass

    # -----------------------------------------------------------------------------
    #
    def onWSMessage(self, msg):
        if msg['msgType'] == "setGesture":
            self.setGesture(msg["setGesture"])
        elif msg['msgType'] == "setTimePosition":
            self.setTimePosition(msg["setTimePosition"])
        elif msg['msgType'] == "togglePlay":
            self.togglePlay()
        elif msg['msgType'] == "quitApplication":
            self.quitApplication()
        else:
            print(self.context + ".websocket.on_message(): invalid message: '" + str(msg) + "'")

    # -----------------------------------------------------------------------------
    #
    def setGesture(self, gesture):
        data = json.loads(gesture)

        folder = data['folder']
        gesture = data['file']

        return self.loadGesture(folder, gesture)

    #------------------------------------------------------------------------------
    #
    def loadGestureFilePath(self, gesture):
        if (not os.path.isfile(gesture)):
            print(self.context + ": the gesture file '" + gesture + "' could not be found.")
            return False

        split = os.path.split(os.path.abspath(gesture))

        if  split[1] != '':
            folder = split[0] + "\\"
            gesture = split[1]
        else:
            folder = ""
            gesture = split[0]

        return self.loadGesture(folder, gesture)

    # -----------------------------------------------------------------------------
    #
    def loadDefaultGesture(self):
        sets = self.labanotationFiles

        if (1 in self.labanotationFiles):
            set = self.labanotationFiles[1]
            files = set['files']
            if (len(files) > 5):
                return self.loadGesture(set['folder'], files[5])
            elif (len(files) > 0):
                return self.loadGesture(set['folder'], files[0])

        return False

    # -----------------------------------------------------------------------------
    #
    def playGesture(self, folder, fileName):
        success = self.loadGesture(folder, fileName)

        if (success):
            self.setPlay(True)

        return success

    #------------------------------------------------------------------------------
    #
    def playGestureFilePath(self, gesture):
        success = self.loadGestureFilePath(gesture)

        if (success):
            self.setPlay(True)

        return success

    # -----------------------------------------------------------------------------
    #
    def quitApplication(self):
        if (self.fnRequestShutdown is not None):
            self.fnRequestShutdown()

    # -----------------------------------------------------------------------------
    #
    def NotifyStatusUpdate(self):
        status = self.getStatus()

        #
        # let web controller know...
        if (self.fnSendMessage is not None):
            msg = {
                'msgType': "status", 
                'status': status,
                'pose': self.getPose()
            }

            self.fnSendMessage(msg)

        #
        # let also the app know...
        if (self.fnStatusUpdate is not None):
            self.fnStatusUpdate(status)

    # -----------------------------------------------------------------------------
    #
    def NotifyGestureUpdate(self):
        info = self.getGestureInfo()

        if (self.fnSendMessage is not None):
            msg = {
                'msgType': "gesture", 
                'gesture': info,
            }

            self.fnSendMessage(msg)

        if (self.fnGestureUpdate is not None):
            self.fnGestureUpdate(info)

    # -----------------------------------------------------------------------------
    #
    def getLabanotationGestures(self):
        return self.labanotationFiles

    # -----------------------------------------------------------------------------
    #
    def getCurrentGesture(self):
        return self.currentFile

    # -----------------------------------------------------------------------------
    #
    def setTimePosition(self, timeIndex):
        self.currentTime = timeIndex

        self.findPose(True)

        # send update with new time position...
        self.NotifyStatusUpdate()

    # -----------------------------------------------------------------------------
    #
    def togglePlay(self):
        self.setPlay(not self.fIsPlaying)

    # -----------------------------------------------------------------------------
    #
    def setPlay(self, state):
        #
        # if the position is at the end, reset to beginning
        if ((not self.fIsPlaying) and (self.currentTime >= self.duration)):
            self.currentTime = 0.0

        self.fResetPlayTime = True
        self.fIsPlaying = state

        self.NotifyStatusUpdate()

    # -----------------------------------------------------------------------------
    #
    def isPlaying(self):
        return self.fIsPlaying

    # -----------------------------------------------------------------------------
    #
    def getDuration(self):
        return self.duration

    # -----------------------------------------------------------------------------
    #
    def setFPS(self, fps):
        self.targetFPS = fps
        self.spf = 1.0 / self.targetFPS

    # -----------------------------------------------------------------------------
    #
    def getJointKeys(self):
        return self.jointKeys

    # -----------------------------------------------------------------------------
    #
    def getJoint(self, joint, time):
        if (joint not in self.tracks):
            return None

        return self.tracks[joint].findPose(time, False)

    # -----------------------------------------------------------------------------
    #
    def getTracks(self):
        return self.tracks

    # -----------------------------------------------------------------------------
    #
    def getPose(self):
        pose = {}

        for joint in self.jointKeys:
            pose[joint] = self.tracks[joint].getCurrentPose()

        return pose

    # -----------------------------------------------------------------------------
    #
    def findPose(self, fSetCurrent = False):
        if (self.duration == 0):
            return

        #
        # find pose for each track
        for joint in self.jointKeys:
            self.tracks[joint].findPose(self.currentTime, fSetCurrent)

    # -----------------------------------------------------------------------------
    #
    def threadFunction(self, name):
        frames = 0
        timeStartGesture = timeFPS = utilities.getTime()

        while self.fKeepRunning:
            if (self.fResetPlayTime):
                self.fResetPlayTime = False
                timeStartGesture = utilities.getTime() - self.currentTime

            if (self.fIsPlaying):
                timeStartFrame = utilities.getTime()

                #
                # determine current gesture time position
                self.currentTime = (timeStartFrame - timeStartGesture)
                while ((self.currentTime >= self.duration) and (self.fIsPlaying)):
                    if (self.fRepeat):
                        self.currentTime = self.currentTime - self.duration
                        timeStartGesture = (timeStartFrame - self.currentTime)
                    else:
                        self.currentTime = self.duration
                        self.fIsPlaying = False

                self.findPose(True)
                self.NotifyStatusUpdate()

                frames = frames + 1
                diff = timeStartFrame - timeFPS
                if (diff > 0.500):
                    self.calculatedFPS = frames / diff
                    timeFPS = timeStartFrame
                    frames = 0
                    # print("fps: " + str(self.calculatedFPS))

                diff = self.spf - (utilities.getTime() - timeStartFrame)
                if (diff > 0.0):
                    time.sleep(diff)
            else:
                time.sleep(0.005)

    # -----------------------------------------------------------------------------
    #
    def getStatus(self):
        return {
            'isPlaying': self.fIsPlaying,
            'position': self.currentTime,
            'duration': self.duration
        }

    # -----------------------------------------------------------------------------
    #
    def getGestureInfo(self):
        return {
            'gesture':  self.currentFile,
            'duration': self.duration,
            'fps': self.targetFPS,
            'frameTimes': self.frameTimes,
            'parseLog': self.parseLog
        }
