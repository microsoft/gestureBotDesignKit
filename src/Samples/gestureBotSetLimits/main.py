# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import threading
import time

from dynamixel_sdk import *                    # Uses Dynamixel SDK library

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'Libraries'))
import Common.settings as settings

# Protocol version
PROTOCOL_VERSION            = 2.0               # protocol version to be used with the Dynamixel servos

# Control table address

# -------- EEPROM -------------
XL320_CW_ANGLE_LIMIT   = 6
XL320_CCW_ANGLE_LIMIT  = 8

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
class application:
    #------------------------------------------------------------------------------
    # Class initialization
    #
    def __init__(self):
        self.comPort = "com4"
        self.baudrate = 1000000           # Dynamixel default baudrate : 57600
        self.packetHandler = PacketHandler(PROTOCOL_VERSION)
        self.portHandler = None

        self.servoMap = { 'head': 1, 'neck': 2, 'torso': 3, 'hip': 4, 'rshoulder': 5, 'rarm': 6, 'relbow': 7, 'rhand': 8, 'lshoulder': 9, 'larm': 10, 'lelbow': 11, 'lhand': 12 }

    #------------------------------------------------------------------------------
    #
    def handleError(self, DXL_ID, dxl_comm_result, dxl_error, context):
        if dxl_comm_result != COMM_SUCCESS:
            print(context + " failed: %s" % self.packetHandler.getTxRxResult(dxl_comm_result))
            return False
        elif dxl_error != 0:
            if (dxl_error == 128):
                return self.readHardwareErrorStatus(DXL_ID, context)
            else:
                print(context + " failed: %s" % self.packetHandler.getRxPacketError(dxl_error))
                return False

        return True

    #------------------------------------------------------------------------------
    #
    def readHardwareErrorStatus(self, DXL_ID, context):
        # Read hardware error status
        dxl_hw_error_status, dxl_comm_result, dxl_error = self.packetHandler.read2ByteTxRx(self.portHandler, DXL_ID, XL320_HW_ERROR_STATUS)
        if dxl_comm_result != COMM_SUCCESS:
            print(context + " failed: %s" % self.packetHandler.getTxRxResult(dxl_comm_result))
            return False
        elif dxl_error != 0:
            if (dxl_error == 128):
                if (dxl_hw_error_status != 0x1e04): # exception for gestureBot. see Documentation
                    print(context + " failed: hardware error status: " + hex(dxl_hw_error_status))
                    return False
            else:
                print(context + " failed: %s" % self.packetHandler.getRxPacketError(dxl_error))
                return False

        return True

    # -----------------------------------------------------------------------------
    #
    def connect(self):
        self.disconnect()

        print("gestureBot: connecting to port '" + str(self.comPort) + "'...")

        portHandler = PortHandler(self.comPort)
        success = portHandler.openPort()
        if (not success):
            print("gestureBot: Failed to open port '" + str(self.comPort) + "'.")
            return False

        # Set port baudrate
        success = portHandler.setBaudRate(self.baudrate)
        if (not success):
            print("gestureBot: Failed to set com port baud rate.")
            return False

        # port is ready
        self.portHandler = portHandler

        return True

    # -----------------------------------------------------------------------------
    #
    def disconnect(self):
        if (self.portHandler is None):
            return

        print("gestureBot: disconnecting from port '" + str(self.comPort) + "'...")

        # Close port
        self.portHandler.closePort()
        self.portHandler = None

    #------------------------------------------------------------------------------
    #
    def reboot(self, DXL_ID):
        if (self.portHandler is None):
            return False

        # Dynamixel LED will flicker while it reboots
        dxl_comm_result, dxl_error = self.packetHandler.reboot(self.portHandler, DXL_ID)
        return self.handleError(DXL_ID, dxl_comm_result, dxl_error, "reboot")

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

    # -----------------------------------------------------------------------------
    # 
    def setCWAngleLimit(self, DXL_ID, angle):
        if (self.portHandler is None):
            return False

        data_write = [DXL_LOBYTE(angle), DXL_HIBYTE(angle)]
        # dxl_comm_result = self.packetHandler.regWriteTxOnly(self.portHandler, DXL_ID, XL320_CW_ANGLE_LIMIT, 2, data_write)
        dxl_comm_result = self.packetHandler.writeTxOnly(self.portHandler, DXL_ID, XL320_CW_ANGLE_LIMIT, 2, data_write)
        dxl_error = 0

        success = self.handleError(DXL_ID, dxl_comm_result, dxl_error, "CWAngleLimit")

        return success

    # -----------------------------------------------------------------------------
    #
    def setCCWAngleLimit(self, DXL_ID, angle):
        if (self.portHandler is None):
            return False

        data_write = [DXL_LOBYTE(angle), DXL_HIBYTE(angle)]
        # dxl_comm_result = self.packetHandler.regWriteTxOnly(self.portHandler, DXL_ID, XL320_CCW_ANGLE_LIMIT, 2, data_write)
        dxl_comm_result = self.packetHandler.writeTxOnly(self.portHandler, DXL_ID, XL320_CCW_ANGLE_LIMIT, 2, data_write)
        dxl_error = 0

        success = self.handleError(DXL_ID, dxl_comm_result, dxl_error, "CCWAngleLimit")

        return success

    # -----------------------------------------------------------------------------
    # 
    def setAngleLimits(self, DXL_ID, angleCW, angleCCW):
        _angleCW = self.convertAngle(angleCW)
        print("ID: " + str(DXL_ID) + ": setting CW angle limit to " + str(angleCW) + " (" + str(_angleCW) + ")")
        self.setCWAngleLimit(DXL_ID, _angleCW)
        time.sleep(0.1)

        _angleCCW = self.convertAngle(angleCCW)
        print("ID: " + str(DXL_ID) + ": setting CCW angle limit to " + str(angleCCW) + " (" + str(_angleCCW) + ")")
        self.setCCWAngleLimit(DXL_ID, _angleCCW)
        time.sleep(0.1)

    # -----------------------------------------------------------------------------
    # 
    def convertAngle(self, angle):
        #
        # map angle to xl-320 servo range
        while (angle < 0.0):
            angle = angle + 360.0

        while (angle >= 360.0):
            angle -= 360

        if (angle > 180.0):
            angle -= 360.0

        # clamp to servo range
        angle = angle + 150.0
        if (angle > 300.0):
            angle = 300
        elif (angle < 0.0):
            angle = 0

        # convert to position value of destination
        return int(angle/300*1023)

    #------------------------------------------------------------------------------
    #
    def run(self):
        if (not self.connect()):
            return

        for key in self.servoMap:
            self.torqueOff(self.servoMap[key])

        # head
        self.setAngleLimits(1, -70, 50)

        # neck
        self.setAngleLimits(2, -91, 91) # 204..818

        self.disconnect()

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

