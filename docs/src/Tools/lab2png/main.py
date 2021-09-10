# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import threading
import argparse
import glob

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'Libraries'))
import Common.settings as settings
import Controller.controller as controller

# -----------------------------------------------------------------------------
#
class application:
    #------------------------------------------------------------------------------
    # Class initialization
    #
    def __init__(self):
        self.files = []
        self.controller = None

        # print('\033[4m\033[1m' + 'Labanotation ' + settings.appVersion + '\033[0m')
        print('Labanotation to PNG converter ' + settings.appVersion + '\r\n')

        #
        # Create labanotation controller
        self.controller = controller.Controller()

    #------------------------------------------------------------------------------
    #
    def readCmdLine(self):
        parser = argparse.ArgumentParser(description='Labanotation to PNG converter.')
        parser.add_argument('--input', required=True, help='Laban input file')
        parser.add_argument('--width', default=768, help='width of output image. Default is 768 pixels.')

        self.cmdArgs = parser.parse_args()

        if (self.cmdArgs.input is None):
            print('Please specify one or more file to convert.')
            exit()

        self.files = glob.glob(self.cmdArgs.input)

    # -----------------------------------------------------------------------------
    # determine input and various output file paths
    #
    def getOutputFilename(self, filename):
        # determine absolute input file path
        if os.path.isabs(filename):
            inputFilePath = filename
        else:
            inputFilePath = os.path.join(settings.cwd, filename)

        # remove file extension from inputName, if any
        inputNameSplit = os.path.splitext(inputFilePath)
        if  inputNameSplit[1] != '':
            outputName = inputNameSplit[0] + '.png'
        else:
            outputName = inputFilePath + '.png'

        return outputName

    #------------------------------------------------------------------------------
    #
    def run(self):
        self.readCmdLine()

        width = int(self.cmdArgs.width)

        for filepath in self.files:
            print("Loading '" + filepath + "'...")
            success = self.controller.loadGestureFilePath(filepath)
            if (success is True):
                outputFilepath = self.getOutputFilename(filepath)
                self.controller.saveAsImage(outputFilepath, width)

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
