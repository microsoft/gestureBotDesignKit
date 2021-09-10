# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import threading
import argparse
import glob
import json, operator

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'Libraries'))
import Common.settings as settings

# -----------------------------------------------------------------------------
#
class application:
    #------------------------------------------------------------------------------
    # Class initialization
    #
    def __init__(self):
        self.files = []

        # print('\033[4m\033[1m' + 'Labanotation ' + settings.appVersion + '\033[0m')
        print('Labanotation format converter ' + settings.appVersion + '\r\n')

    #------------------------------------------------------------------------------
    #
    def readCmdLine(self):
        parser = argparse.ArgumentParser(description='Labanotation format converter.')
        parser.add_argument('--input', required=True, help='input file(s)')
        parser.add_argument('--outputpath', required=True, help='output path')

        self.cmdArgs = parser.parse_args()

        if (self.cmdArgs.input is None):
            print('Please specify one or more file to convert.')
            exit()

        if (self.cmdArgs.outputpath is None):
            print('Please specify an output path.')
            exit()

        self.files = glob.glob(self.cmdArgs.input)

    #------------------------------------------------------------------------------
    #
    def loadGestureFilePath(self, filePath):
        splitOutput = os.path.split(os.path.abspath(filePath))
        fileName = splitOutput[1]

        data = None
        try:
            path = os.path.abspath(filePath)

            with open(path) as f:
                data = json.load(f)
        except Exception as e:
            print("loadGesture() exception: ", e)
            return False

        success = self.parseGestureData(data)

        if (success is True):
            print("loaded '" + fileName + "': " + str(len(self.poses)) + " frames. Duration: " + str(self.duration) + "ms")
        else:
            print("file '" + fileName + "': " + str(len(self.poses)) + " is not a valid gesture file.")

        return success

    # -----------------------------------------------------------------------------
    #
    def parseGestureData(self, data):
        self.parseLog = ""

        if data is None:
            return False

        for key in data:
            value = data[key]
            self.parseGesturePositions(key, value)

            # only handling one gesture right now...
            return True

    # -----------------------------------------------------------------------------
    #
    def parseGesturePositions(self, key, data):
        #print("The key and value are ({}) = ({})".format(key, data))
        #print("The key ({}) ".format(key))

        self.currentTime = 0.0
        self.currentPosePositionIndex = -1
        self.duration = 0.0
        self.labanotation = []
        self.poses = []

        for subKey in data:
            #print("position: ({}) ".format(subKey))
            self.labanotation.append(data[subKey])

        #
        # convert time values to numbers. Parse angles
        for i in range(len(self.labanotation)):
            pose = self.labanotation[i]

            if ('start time' in pose):
                time = pose['start time'][0]
                t = type(time)

                pose['start time'] = float(time)
            else:
                self.logParsingError("missing 'start time' information at index " + str(i) + "...")
                continue

            #
            # duration key in the current labanotation json format is not used.
            if ('duration' in pose):
                duration = pose['duration'][0]
                t = type(duration)
                pose['duration'] = float(duration)
            #else:
            #    self.logParsingError("missing 'duration' information at index " + str(i) + "...")
            #    continue

            #
            # check for remaining important keys 
            tags = ['head', 
                    'right elbow', 
                    'right wrist',
                    'left elbow',
                    'left wrist',
                    'rotation']

            for tag in tags:
                fFoundTag = False
                for key in pose:
                    if (tag == key): # if (tag.lower() == key.lower()):
                        fFoundTag = True
                        break

                if (not fFoundTag):
                    self.logParsingError("Tag '" + tag + "' is missing at index " + str(idx) + " (time=" + str(pose['time']) + ")")

        #
        # sort by 'start time'
        sorted_items = sorted(self.labanotation, key=operator.itemgetter('start time'))

        #
        # create frameTimes array
        self.frameTimes = []
        for i in range(len(sorted_items)):
            time = float(sorted_items[i]['start time'])

            #
            # some older json labanotations have a startTime=1 rather than 0. Let's simply
            # reset to 0 here...
            if ((i == 0) and (time == 1.0)):
                self.logParsingError("First 'start time' is '1'. Resetting to '0'. Consider adapting latest json format..")
                time = 0.0
                sorted_items[i]['start time'] = time

            self.frameTimes.append(time)

        if (len(sorted_items) > 0):
            last_item = sorted_items[len(sorted_items) - 1]
            self.duration = last_item['start time']

        for i in range(len(sorted_items)):
            time = float(sorted_items[i]['start time'])
            duration = 0.0 # sorted_items[i]['duration']
            pose = {}
            pose["Time"] = time
            # pose["Duration"] = duration
            pose["Head"] = self.convertLabanotation(sorted_items[i]["head"], duration, i, "head")
            pose["RightElbow"] = self.convertLabanotation(sorted_items[i]["right elbow"], duration, i, "right elbow")
            pose["RightWrist"] = self.convertLabanotation(sorted_items[i]["right wrist"], duration, i, "right wrist")
            pose["LeftElbow"] = self.convertLabanotation(sorted_items[i]["left elbow"], duration, i, "left elbow")
            pose["LeftWrist"] = self.convertLabanotation(sorted_items[i]["left wrist"], duration, i, "left wrist")

            self.poses.append(pose)

    # -----------------------------------------------------------------------------
    #
    def convertLabanotation(self, limb, duration, idx, key):
        if (key.lower() == "head"):
            return self.convertHeadLabanotation(limb, duration, idx, key)
        else:
            return self.convertArmLabanotation(limb, duration, idx, key)

    # -----------------------------------------------------------------------------
    #
    def convertArmLabanotation(self, limb, duration, idx, key):
        phi = 0.0
        theta = 180.0

        dir = limb[0].lower()
        lv = limb[1].lower()

        if (lv == "high"):
            theta = 45.0
        elif (lv == "normal"):
            theta = 90.0
        elif (lv == "low"):
            theta = 135.0
        else:
            theta = 180.0
            self.logParsingError("Unknown level '" + lv + "' specified at index " + str(idx) + ", key '" + key + "'")

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
            if (lv == "high"):
                theta = 5.0
                phi = 0.0
            elif (lv == "low"):
                theta = 175.0
                phi = 0.0
            else:
                theta = 180.0
                phi = 0.0
                if (lv == "normal"):
                    self.logParsingError("'place:normal' is ambiguous and not supported at index " + str(idx) + ", key '" + key + "'")
        else:
            phi = 0;
            self.logParsingError("Unknown direction '" + dir + "' specified at index " + str(idx) + ", key '" + key + "'")

        theta = self.convertToRadians(theta);
        phi = self.convertToRadians(phi);

        return { 'theta': theta, 'phi': phi, 'dir': dir, 'lv': lv } # , 'duration': duration

    # -----------------------------------------------------------------------------
    #
    def convertHeadLabanotation(self, limb, duration, idx, key):
        phi = 0.0
        theta = 180.0

        dir = limb[0].lower()
        lv = limb[1].lower()

        if (lv == "high"):
            theta = -30.0
        elif (lv == "normal"):
            theta = 0.0
        elif (lv == "low"):
            theta = 30.0
        else:
            theta = 180.0
            self.logParsingError("Unknown level '" + lv + "' specified at index " + str(idx) + ", key '" + key + "'")

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
            if (lv == "high"):
                theta = 0.0
                phi = 0.0
            elif (lv == "low"):
                theta = 180.0
                phi = 0.0
            else:
                theta = 0.0
                phi = 0.0
                if (lv == "normal"):
                    self.logParsingError("'place:normal' is ambiguous and not supported at index " + str(idx) + ", key '" + key + "'")
        else:
            phi = 0;
            self.logParsingError("Unknown direction '" + dir + "' specified at index " + str(idx) + ", key '" + key + "'")

        theta = self.convertToRadians(theta);
        phi = self.convertToRadians(phi);

        return { 'theta': theta, 'phi': phi, 'dir': dir, 'lv': lv } # , 'duration': duration

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
    def logParsingError(self, msg):
        if (len(self.parseLog) > 0):
            self.parseLog = self.parseLog + "\r\n"

        self.parseLog = self.parseLog + msg

        print("    Parse Error: " + msg)

    # -----------------------------------------------------------------------------
    # determine input and various output file paths
    #
    def getOutputFilePath(self, filename):
        filename = filename.lower()

        # determine absolute input file path
        if os.path.isabs(filename):
            inputFilePath = filename
        else:
            inputFilePath = os.path.join(settings.cwd, self.inputName)

        splitOutput = os.path.split(os.path.abspath(inputFilePath))
        if  (len(splitOutput) != 2):
            print('getOutputFilePath : could not split file path for "{}".'.format(filename))
            return None

        outputFilePath = self.cmdArgs.outputpath
        outputName = os.path.join(outputFilePath, splitOutput[1])

        if not os.path.exists(outputFilePath):
            os.makedirs(outputFilePath)

        return outputName

    #------------------------------------------------------------------------------
    #
    def setJoint(self, new_pose, pose, key1, key2, duration):
        new_pose[key1] = {}
        joint = new_pose[key1]

        joint['dur'] = duration
        joint['dir'] = pose[key2]['dir']
        joint['lvl'] = pose[key2]['lv']

    #------------------------------------------------------------------------------
    #
    def convert(self, filepath):
        # gesture = self.controller.getGestureInfo()
        poses = self.poses # gesture['poses']
        cnt = len(poses)

        new_poses = []

        for idx in range(cnt):
            pose = poses[idx]
            new_pose = {}
            time = float(pose['Time'])
            duration = 0.0

            if (idx == 0):
                new_time = 0.0;
                duration = time;
            else:
                prevTime = float(poses[idx-1]['Time'])
                duration = (time - prevTime)
                new_time = prevTime

            new_pose['time'] = (new_time / 1000.0)
            duration = (duration / 1000.0)

            self.setJoint(new_pose, pose, 'head', 'Head', duration)
            self.setJoint(new_pose, pose, 'relbow', 'RightElbow', duration)
            self.setJoint(new_pose, pose, 'rwrist', 'RightWrist', duration)
            self.setJoint(new_pose, pose, 'lelbow', 'LeftElbow', duration)
            self.setJoint(new_pose, pose, 'lwrist', 'LeftWrist', duration)

            new_poses.append(new_pose)

        # print(new_poses)
        # j = json.dumps(new_poses,indent=2)
        # print(j)

        #
        # write data as json
        writeFile = open(filepath, "w")
        json.dump(new_poses, writeFile, indent=2)
        writeFile.close()

    #------------------------------------------------------------------------------
    #
    def close(self):
        pass

    #------------------------------------------------------------------------------
    #
    def run(self):
        self.readCmdLine()

        for filepath in self.files:
            print("Loading '" + filepath + "'...")
            success = self.loadGestureFilePath(filepath)
            if (success is True):
                outputFilepath = self.getOutputFilePath(filepath)
                if (outputFilepath is None):
                    continue

                self.convert(outputFilepath)

        self.close()

#------------------------------------------------------------------------------
#
# main code
#
if __name__ == '__main__':
    # initialize global variables
    settings.initialize()

    # create main application object, then run it
    settings.application = application()
    settings.application.run()
