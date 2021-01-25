# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import threading
import time

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'Libraries'))
import Common.settings as settings
import Common.webSocket as webSocket
import Controller.controller as controller
import gestureBot.gestureBot as gestureBot

# -----------------------------------------------------------------------------
#
class application:
    #------------------------------------------------------------------------------
    # Class initialization
    #
    def __init__(self):
        # set global application variable now so all other objects have access 
        # to the application object.
        settings.application = self

        print('Labanotation Sample: gestureBot ' + settings.appVersion + '\r\n')

        self.controller = None
        self.gestureBot1 = None
        self.gestureBot2 = None

        self.shutdownEvent = threading.Event()

        #
        # Create labanotation controller
        self.controller = controller.Controller(
            fnStatusUpdate=self.onControllerStatusUpdate, 
            fnGestureUpdate=self.onControllerGestureUpdate, 
            fnRequestShutdown=self.requestShutdownApplication,
            httpPort=8000)

        #
        # load default gesture
        if (self.controller is not None):
            self.controller.loadDefaultGesture()

        #
        # Create gestureBot 
        self.gestureBot1 = gestureBot.gestureBot(self.controller, httpPort=8001, context="gestureBot1")

        #
        # Create a second and separate instance of gestureBot 
        # self.gestureBot2 = gestureBot.gestureBot(self.controller, httpPort=8002, context="gestureBot2")

        webSocket.startHttpServerIOLoop()

    #------------------------------------------------------------------------------
    #
    def onControllerStatusUpdate(self, status):
        if (self.gestureBot1 is not None):
            self.gestureBot1.onControllerStatusUpdate(status)

        if (self.gestureBot2 is not None):
            self.gestureBot2.onControllerStatusUpdate(status)

    #------------------------------------------------------------------------------
    #
    def onControllerGestureUpdate(self, info):
        if (self.gestureBot1 is not None):
            self.gestureBot1.onGestureUpdate(info)

        if (self.gestureBot2 is not None):
            self.gestureBot2.onGestureUpdate(info)

    # -----------------------------------------------------------------------------
    #
    def requestShutdownApplication(self):
        self.shutdownEvent.set()

    #------------------------------------------------------------------------------
    #
    def cleanup(self):
        webSocket.stopHttpServerIOLoop()

        if (self.gestureBot1 is not None):
            self.gestureBot1.close()
            del self.gestureBot1
            self.gestureBot1 = None

        if (self.gestureBot2 is not None):
            self.gestureBot2.close()
            del self.gestureBot2
            self.gestureBot2 = None

        if (self.controller is not None):
            self.controller.close()
            del self.controller
            self.controller = None

    #------------------------------------------------------------------------------
    #
    def run(self):
        # wait a few milliseconds for all previous print() calls to complete...
        time.sleep(0.03)

        print("Ready.")

        #
        # loop until shutdown request or Ctrl-C...
        try:
            while not (self.shutdownEvent.wait(timeout=0.5)):
                continue
        except KeyboardInterrupt:
            pass

        print("Shutting down...")
        self.cleanup()

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
