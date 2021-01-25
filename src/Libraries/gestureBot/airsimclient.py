# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import time
import math
import logging

additional_path = os.path.dirname(__file__)
sys.path.append(additional_path)
import airsim

# -----------------------------------------------------------------------------
#
class AirSim:
    # -----------------------------------------------------------------------------
    #
    def __init__(self):
        self.client = None
        self.robot_pose = airsim.RobotPose()

    # -----------------------------------------------------------------------------
    #
    def connect(self):
        self.client = RobotClient()
        self.client.confirmConnection()
        self.client.enableApiControl(True)
        self.client.reset()

        #
        # set last known pose
        self.setRobotPose()

    # -----------------------------------------------------------------------------
    #
    def disconnect(self):
        if (self.client is not None):
            self.client.enableApiControl(False)

            del self.client
            self.client = None

    # -----------------------------------------------------------------------------
    #
    def close(self):
        self.disconnect()
        self.robot_pose = None

    # -----------------------------------------------------------------------------
    #
    def reset(self):
        if (self.client is not None):
            self.client.reset()

    # -----------------------------------------------------------------------------
    #
    def convertToDegrees(self, radians):
       return (radians * 180.0 / 3.141592654)

    # -----------------------------------------------------------------------------
    #
    def setWheelInfo(self, lWheel, rWheel, throttle, steering):
        if (self.client is not None):
            steering = (steering / (math.pi / 2))

            robot_controls = airsim.RobotControls()

            robot_controls.throttle = throttle * 1.4
            robot_controls.steering = steering / 8

            self.client.setRobotControls(robot_controls)

    # -----------------------------------------------------------------------------
    #
    def setRobotKeyPoseTarget(self, key, target, duration):
        self.robot_pose.fDuration = (duration / 1000.0)

        if (key == 'head'):
            self.robot_pose.fHead = -target
        elif (key == 'neck'):
            self.robot_pose.fNeck = target
        elif (key == 'torso'):
            pass
        elif (key == 'hip'):
            pass

        elif (key == 'lshoulder'):
            self.robot_pose.fLShoulder = target
        elif (key == 'larm'):
            self.robot_pose.fLUpperArm = -90 - target
        elif (key == 'lelbow'):
            self.robot_pose.fLElbow = target
        elif (key == 'lhand'):
            self.robot_pose.fLHand = target

        elif (key == 'rshoulder'):
            self.robot_pose.fRShoulder = -target
        elif (key == 'rarm'):
            self.robot_pose.fRUpperArm = -90 - target
        elif (key == 'relbow'):
            self.robot_pose.fRElbow = target
        elif (key == 'rhand'):
            self.robot_pose.fRHand = target
        else:
            print("airsim.setRobotKeyPoseTarget(): unrecognized key '" + str(key) + "'")

        self.setRobotPose()

    # -----------------------------------------------------------------------------
    #
    def setRobotPose(self):
        if (self.client is not None):
            self.client.setRobotPose(self.robot_pose)

