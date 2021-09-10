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
import gestureService_w2v.gestureService as gestureService

# -----------------------------------------------------------------------------
#
class application(webSocket.HttpServerWrapper):
    #------------------------------------------------------------------------------
    # Class initialization
    #
    def __init__(self):
        # set global application variable now so all other objects have access 
        # to the application object.
        settings.application = self

        print('Labanotation Sample: gesture Service ' + settings.appVersion + '\r\n')

        self.context = "application"
        self.controller = None
        self.gestureBot = None
        self.gestureService = None

        self.shutdownEvent = threading.Event()

        self.wordList = None

        #
        # Create labanotation controller
        self.controller = controller.Controller(
            fnStatusUpdate=self.onControllerStatusUpdate, 
            fnGestureUpdate=self.onControllerGestureUpdate, 
            fnRequestShutdown=self.requestShutdownApplication,
            httpPort=8000)

        #
        # Create gestureBot 
        self.gestureBot = gestureBot.gestureBot(self.controller, httpPort=8001, context="gestureBot")

        #
        # Create gesture Service
        self.gestureService = gestureService.GestureService(context="gestureService")

        if (self.gestureService is not None):
            self.actionTags = self.gestureService.getActionTags()
            self.wordsInActionTags = self.gestureService.getWordsInActionTags()
            self.labans = self.gestureService.getLabans()

        #
        # if requested, create and initialize http server to access gestureBot
        httpPort = 8002

        path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'web'))

        webSocket.HttpServerWrapper.__init__(self, httpPort, path, self.context)

        webSocket.startHttpServerIOLoop()

    # -----------------------------------------------------------------------------
    #
    def onWSConnect(self):
        if (self.fnSendMessage):
            msg = {
                'msgType': "initialization", 
                'initialization': { 'actionTags': self.actionTags, 'labans': self.labans, 'actionTagsWords': self.wordsInActionTags }
            }

            self.fnSendMessage(msg)

        return None

    # -----------------------------------------------------------------------------
    #
    def onWSDisconnect(self):
        pass

    # -----------------------------------------------------------------------------
    #
    def onWSMessage(self, msg):
        msgType = msg['msgType']
        if msgType == "initialization":
            pass
        elif msgType == "processMsg":
            self.processMsg(msg['processMsg'])
        elif msgType == "loadGesture":
            self.loadGesture(msg['gesture'])
        elif msgType == "playGesture":
            self.playGesture(msg['gesture'])
        else:
            print("onWSMessage(): unhandled message: '" + str(msg) + "'")

    # -----------------------------------------------------------------------------
    #
    def processMsg(self, msg):
        if (not 'message' in msg):
            print("processMsg(): 'message' is currently the only supported key.")
            return

        message = msg['message']

        phraseList = self.gestureService.tokenizeMessage(message)
        for phrase in phraseList:
            self.wordList = self.gestureService.tokenizePhrase(phrase)

            gestureName, scores, trigger_word_num = self.gestureService.findGesture(self.wordList)

            if (gestureName is None):
                continue

            self.currentWordIndex = 0
            self.triggerWordIndex = trigger_word_num
            self.selectedGesture = gestureName

            wordScores = []
            for score in scores:
                wordScores.append(score)

            if (self.fnSendMessage):
                msg = {
                    'msgType': "w2v", 
                    'w2v': { 'phrase': phrase, 'wordList': self.wordList, 'gestureName': gestureName, 'triggerWordNum': int(trigger_word_num), 'scores': wordScores  }
                }

                self.fnSendMessage(msg)

    # -----------------------------------------------------------------------------
    #
    def loadGesture(self, gesture):
        if (self.controller is not None):
            self.controller.loadGesture('./gestureLibrary/', gesture + '.json')

    # -----------------------------------------------------------------------------
    #
    def playGesture(self, gesture):
        if (self.controller is not None):
            self.controller.playGesture('./gestureLibrary/', gesture + '.json')

    #------------------------------------------------------------------------------
    #
    def onControllerStatusUpdate(self, status):
        if (self.gestureBot is not None):
            self.gestureBot.onControllerStatusUpdate(status)

    #------------------------------------------------------------------------------
    #
    def onControllerGestureUpdate(self, info):
        if (self.gestureBot is not None):
            self.gestureBot.onGestureUpdate(info)

    # -----------------------------------------------------------------------------
    #
    def requestShutdownApplication(self):
        self.shutdownEvent.set()

    #------------------------------------------------------------------------------
    #
    def cleanup(self):
        # close http server
        super().close()

        webSocket.stopHttpServerIOLoop()

        if (self.gestureService is not None):
            self.gestureService.close()
            del self.gestureService
            self.gestureService = None

        if (self.gestureBot is not None):
            self.gestureBot.close()
            del self.gestureBot
            self.gestureBot = None

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
