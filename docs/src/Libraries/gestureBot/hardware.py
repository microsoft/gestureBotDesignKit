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

from dynamixel_sdk import *                     # Uses Dynamixel SDK library

# Protocol version
PROTOCOL_VERSION            = 2.0               # protocol version to be used with the Dynamixel servos

# Control table address

# -------- RAM ----------------
XL320_TORQUE_ENABLE    = 24  # servo mode on/off - turn into wheel
XL320_LED              = 25
XL320_GOAL_POSITION    = 30
XL320_GOAL_VELOCITY    = 32
XL320_GOAL_TORQUE      = 35
XL320_PRESENT_POSITION = 37  # current servo angle
XL320_PRESENT_SPEED    = 39  # current speed
XL320_PESENT_LOAD      = 41  # current load
XL320_PESENT_VOLTAGE   = 45  # current voltage
XL320_PESENT_TEMP      = 46  # current temperature
XL320_MOVING           = 49
XL320_HW_ERROR_STATUS  = 50
XL320_PUNCH            = 51

TORQUE_ENABLE               = 1                 # Value for enabling the torque
TORQUE_DISABLE              = 0                 # Value for disabling the torque

# -----------------------------------------------------------------------------
#
class gestureBotHardware:
    _self = None

    # -----------------------------------------------------------------------------
    #
    def __init__(self, gestureBot):
        if (gestureBot is None):
            print("ERROR in gestureBotHardware.init(): gestureBot object expected.")

        self._self = self
        self.gestureBot = gestureBot

        self.servoMap = { 'head': 1, 'neck': 2, 'torso': 3, 'hip': 4, 'rshoulder': 5, 'rarm': 6, 'relbow': 7, 'rhand': 8, 'lshoulder': 9, 'larm': 10, 'lelbow': 11, 'lhand': 12 }

        #
        # adjust servo duration times to eliminate gaps between end of last 
        # target move with next target command, and yield a smoother gesture
        self.servoTimingAdjustment = 15.0

        #
        # serial configuration
        self.comPort = "com3"
        self.baudrate = 1000000           # Dynamixel default baudrate : 57600
        self.packetHandler = PacketHandler(PROTOCOL_VERSION)
        self.portHandler = None

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

        if (sendStatus and self.gestureBot and self.gestureBot.fnSendMessage):
            status = {
                'msgType': "hardware", 
                'hardware': { "servoTimingAdjustment": self.servoTimingAdjustment }
            }

            self.gestureBot.fnSendMessage(status)

    # -----------------------------------------------------------------------------
    #
    def connected(self):
        if (self.portHandler is None):
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
        elif (command == 'rebootServos'):
            self.rebootServos()
        elif (command == 'setServoTimingAdjustment'):
            servoTimingAdjustment = data['servoTimingAdjustment']
            self.setServoTimingAdjustment(servoTimingAdjustment)

    # -----------------------------------------------------------------------------
    #
    def connect(self, port):
        print("gestureBot: connecting to port '" + str(port) + "'...")
        self.setPort(port)

        self.disconnect(False)

        portHandler = PortHandler(port)
        success = portHandler.openPort()
        if (not success):
            print("gestureBot: Failed to open the port.")
            return

        # set port baudrate
        success = portHandler.setBaudRate(self.baudrate)
        if (not success):
            print("gestureBot: Failed to set com port baud rate.")

        # port is ready
        self.portHandler = portHandler

        servoTargets = self.gestureBot.getServoTargets()
        for key in servoTargets:
            DXL_ID = self.servoMap[key]
            target = servoTargets[key]['target']
            goal = self.calculateServoGoal(key, target)
            velocity = 200

            self.setVelocity(DXL_ID, velocity)
            self.setGoalPosition(DXL_ID, goal)

        if (self.gestureBot and self.gestureBot.fnSendMessage):
            status = {
                'msgType': "hardware", 
                'hardware': { "status": 'connected' }
            }

            self.gestureBot.fnSendMessage(status)

    # -----------------------------------------------------------------------------
    #
    def disconnect(self, sendStatus = True):
        if (sendStatus):
            print("gestureBot: disconnecting from port '" + str(self.comPort) + "'...")

        if (self.portHandler is not None):
            for key in self.servoMap:
                self.torqueOff(self.servoMap[key])

            # close port
            self.portHandler.closePort()
            self.portHandler = None

        if (sendStatus and self.gestureBot and self.gestureBot.fnSendMessage):
            status = {
                'msgType': "hardware", 
                'hardware': { "status": 'disconnected' }
            }

            self.gestureBot.fnSendMessage(status)

    #------------------------------------------------------------------------------
    #
    def getHardwareErrorDescription(self, status):
        str = hex(status)
        strError = ""

        overload = status & 1
        overheating = (status >> 1) & 1
        voltage = (status >> 2) & 1

        if (overload):
            strError = strError + "Overload"

        if (overheating):
            if (strError):
                strError = strError + ", "

            strError = strError + "Overheating"

        #
        # the current gestureBot will always encounter an Input Voltage error. Therefore 
        # ignoring. See documentation for further information.
        if (False) and (voltage):
            if (strError):
                strError = strError + ", "

            strError = strError + "Input Voltage"

        return strError

    #------------------------------------------------------------------------------
    #
    def handleError(self, DXL_ID, dxl_comm_result, dxl_error, context):
        if dxl_comm_result != COMM_SUCCESS:
            print(context + "(" + str(DXL_ID) + ") failed: %s" % self.packetHandler.getTxRxResult(dxl_comm_result))
            return False
        elif dxl_error != 0:
            if (dxl_error == 128):
                return self.readHardwareErrorStatus(DXL_ID, context)
            else:
                print(context + "(" + str(DXL_ID) + ") failed: %s" % self.packetHandler.getRxPacketError(dxl_error))
                return False

        return True

    #------------------------------------------------------------------------------
    #
    def readHardwareErrorStatus(self, DXL_ID, context):
        # Read hardware error status
        dxl_hw_error_status, dxl_comm_result, dxl_error = self.packetHandler.read2ByteTxRx(self.portHandler, DXL_ID, XL320_HW_ERROR_STATUS)
        if dxl_comm_result != COMM_SUCCESS:
            print(context + "(" + str(DXL_ID) + ") failed: %s" % self.packetHandler.getTxRxResult(dxl_comm_result))
            return False
        elif dxl_error != 0:
            if (dxl_error == 128):
                # report hardware status other than Voltage Input errors. See documentation for further information
                if (dxl_hw_error_status != 0x1e04): # Input Voltage error.
                    print(context + "(" + str(DXL_ID) + ") failed with hardware error: " + self.getHardwareErrorDescription(dxl_hw_error_status))
                    return False
            else:
                print(context + "(" + str(DXL_ID) + ") failed: %s" % self.packetHandler.getRxPacketError(dxl_error))
                return False

        return True

    #------------------------------------------------------------------------------
    #
    def rebootServos(self):
        for key in self.servoMap:
           self.reboot(self.servoMap[key])

        print("gestureBot: all servos have been rebooted.")

    #------------------------------------------------------------------------------
    #
    def reboot(self, DXL_ID):
        if (self.portHandler is None):
            return False

        # Dynamixel LED will flicker while it reboots
        dxl_comm_result, dxl_error = self.packetHandler.reboot(self.portHandler, DXL_ID)

        return True

    #------------------------------------------------------------------------------
    #
    def ping(self, DXL_ID):
        if (self.portHandler is None):
            return False

        # get Dynamixel model number
        dxl_model_number, dxl_comm_result, dxl_error = self.packetHandler.ping(portHandler, DXL_ID)

        success = self.handleError(DXL_ID, dxl_comm_result, dxl_error, "ping")

        return dxl_model_number

    # -----------------------------------------------------------------------------
    #
    def readTxRx(self, DXL_ID, address, numBytes, context):
        if (self.portHandler is None):
            return False

        retries = 0
        while (True):
            if (numBytes == 1):
                data, dxl_comm_result, dxl_error = self.packetHandler.read1ByteTxRx(self.portHandler, DXL_ID, address)
            elif (numBytes == 2):
                data, dxl_comm_result, dxl_error = self.packetHandler.read2ByteTxRx(self.portHandler, DXL_ID, address)
            elif (numBytes == 4):
                data, dxl_comm_result, dxl_error = self.packetHandler.read4ByteTxRx(self.portHandler, DXL_ID, address)

            if (dxl_comm_result == -1000):
                time.sleep(0.1)
                retries = retries + 1
                if (retries > 3):
                    break
            else:
                break

        success = self.handleError(DXL_ID, dxl_comm_result, dxl_error, context)

        return data

    # -----------------------------------------------------------------------------
    #
    def writeTxRx(self, DXL_ID, address, data, numBytes, context):
        if (self.portHandler is None):
            return False

        retries = 0
        while (True):
            if (numBytes == 1):
                dxl_comm_result, dxl_error = self.packetHandler.write1ByteTxRx(self.portHandler, DXL_ID, address, data)
            elif (numBytes == 2):
                dxl_comm_result, dxl_error = self.packetHandler.write2ByteTxRx(self.portHandler, DXL_ID, address, data)
            elif (numBytes == 4):
                dxl_comm_result, dxl_error = self.packetHandler.write4ByteTxRx(self.portHandler, DXL_ID, address, data)

            if (dxl_comm_result == -1000):
                time.sleep(0.1)
                retries = retries + 1
                if (retries > 3):
                    break
            else:
                break

        success = self.handleError(DXL_ID, dxl_comm_result, dxl_error, context)

        return success

    # -----------------------------------------------------------------------------
    #
    def torqueOn(self, DXL_ID):
        return self.writeTxRx(DXL_ID, XL320_TORQUE_ENABLE, TORQUE_ENABLE, 1, "torqueOn")

    # -----------------------------------------------------------------------------
    #
    def torqueOff(self, DXL_ID):
        return self.writeTxRx(DXL_ID, XL320_TORQUE_ENABLE, TORQUE_DISABLE, 1, "torqueOff")

    #------------------------------------------------------------------------------
    #
    def setVelocity(self, DXL_ID, velocity):
        return self.writeTxRx(DXL_ID, XL320_GOAL_VELOCITY, velocity, 2, "setVelocity")

    #------------------------------------------------------------------------------
    #
    def getPresentPosition(self, DXL_ID):
        dxl_present_position = self.readTxRx(DXL_ID, XL320_PRESENT_POSITION, 4, "getPresentPosition")

        return (dxl_present_position & 0x3ff)

    #------------------------------------------------------------------------------
    #
    def setGoalPosition(self, DXL_ID, position):
        return self.writeTxRx(DXL_ID, XL320_GOAL_POSITION, position, 2, "setGoalPosition")

    # -----------------------------------------------------------------------------
    #
    def convPosToTenthDeg(self, pos):
        return int(round(pos * 10.0, 0))

    # -----------------------------------------------------------------------------
    #
    def resetToDefaultPose(self):
        if (self.portHandler is None):
            return

        for key in self.servoMap:
            self.setServoTarget(key, 0, 1)

    # -----------------------------------------------------------------------------
    #
    def calculateServoGoal(self, key, target):
        #
        # map target to xl-320 servo range
        while (target < 0.0):
            target = target + 360.0

        while (target >= 360.0):
            target -= 360

        if (target > 180.0):
            target -= 360.0

        # clamp to servo range
        target = target + 150.0
        if (target > 300.0):
            target = 300
        elif (target < 0.0):
            target = 0

        # convert to position value of destination
        goal = int(target/300*1023)

        #
        # sanity check
        if ((goal < 0) or (goal > 0xeff)):
            raise Exception('setServoTarget(): invalid goal position "{}"'.format(str(goal)))

        return goal

    # -----------------------------------------------------------------------------
    #
    def setServoTarget(self, key, target, duration):
        if (not key in self.servoMap):
            print("hardware.setServoTarget(): unknown joint '" + key + "'.")
            return

        DXL_ID = self.servoMap[key]
        goal = self.calculateServoGoal(key, target)

        #
        # adjust timing...
        duration = duration + (self.servoTimingAdjustment / 1000.0) # in s

        if (duration > 0.0):
            position = self.getPresentPosition(DXL_ID)
            distance = abs(goal - position)
            speed = (distance / duration)
            coeff = 2.0
            velocity = int(speed / coeff)

            if (velocity < 1):
                velocity = 1
            elif (velocity > 0x3ff):
                velocity = 0x3ff
        else:
            velocity = 0x3ff # maximum speed

        self.setVelocity(DXL_ID, velocity)
        self.setGoalPosition(DXL_ID, goal)

    # -----------------------------------------------------------------------------
    #
    def setWheelInfo(self, lwheel, rwheel):
        pass

