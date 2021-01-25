# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import enum 
import json
from time import sleep

import threading
import asyncio

import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.gen
from tornado import web
from tornado.options import define, options

# import mimetypes

import multiprocessing

import Common.settings as settings

# -----------------------------------------------------------------------------
#
def threadFnIOLoop(args):
    tornado.ioloop.IOLoop.current().start()

# -----------------------------------------------------------------------------
#
def stopHttpServerIOLoop():
    if (settings.numHttpServers > 0):
        # A call to tornado.ioloop.IOLoop.instance().stop() is not thread-safe
        # As per suggestion at https://stackoverflow.com/questions/34104656/tornado-web-server-ioloop-error-on-stop
        # and https://stackoverflow.com/questions/5375220/how-do-i-stop-tornado-web-server

        io_loop = tornado.ioloop.IOLoop.instance()
        io_loop.add_callback(lambda x: x.stop(), io_loop)

# -----------------------------------------------------------------------------
#
def startHttpServerIOLoop():
    if (settings.numHttpServers > 0):
        #
        # once all httpserver have been created, 
        # start a thread for tornado's ioLoop
        settings.threadIOLoop = threading.Thread(target = threadFnIOLoop, args=(1,))
        settings.threadIOLoop.start()

# -----------------------------------------------------------------------------
#
class IndexHandler(tornado.web.RequestHandler):
    # -----------------------------------------------------------------------------
    #
    def initialize(self, root, default_filename = None):
        self.root = root
        if (default_filename is None):
            self.default_filename = 'index.html'
        else:
            self.default_filename = default_filename

    # -----------------------------------------------------------------------------
    #
    def get(self):
        webPath = os.path.join(self.root, self.default_filename)

        self.render(webPath)

# -----------------------------------------------------------------------------
#
class StaticHandler(tornado.web.StaticFileHandler):
    # -----------------------------------------------------------------------------
    #
    def get_content_type(self):
        mime_type = super().get_content_type()

        filename = os.path.split(self.absolute_path)
        extension = os.path.splitext(filename[1])[1]
        if (extension is not None):
            extension =extension.lower()
            if (extension == ".js"):
                return 'text/javascript'
            elif (extension == ".glb"):
                return 'model/gltf-binary'

        return mime_type

# -----------------------------------------------------------------------------
#
class HttpServerWrapper:
    # -----------------------------------------------------------------------------
    #
    def __init__(self, port, root, context):
        self.port = port
        self.root = root
        self.context = context
        self.httpServer = None
        self.fnSendMessage = None

        if (self.port is not None):
            self.doneInitializingEvent = threading.Event()

            self.thread = threading.Thread(target = self.threadHttpServer, args=(1,))
            self.thread.start()

            waitTime = 0.1
            waitCount = 0
            while not (self.doneInitializing(waitTime)):
                waitCount = waitCount + waitTime
                if (waitCount > 3.0): # wait 3 seconds...
                    raise Exception("" + self.context + " module failed to initialize http server in a timely manner.")

    # -----------------------------------------------------------------------------
    #
    def doneInitializing(self, waitTime):
        if (self.doneInitializingEvent.wait(timeout=waitTime)):
            return True

        return False

    # -----------------------------------------------------------------------------
    #
    def threadHttpServer(self, args):
        asyncio.set_event_loop(asyncio.new_event_loop())

        file = self.root
        self.app = tornado.web.Application(
            [
                (r"/", IndexHandler, { 'root': self.root }),
                (r"/ws", webSocket, { 'parent': self, 'context': self.context } ),
                (r"/(.*)", StaticHandler, { 'path': self.root })
            ]
        )

        self.httpServer = tornado.httpserver.HTTPServer(self.app, max_buffer_size=167772160) # allow for 160MB uploads (default=100MB)
        self.httpServer.listen(self.port)

        print("Http " + self.context + " started on http://localhost:" + str(self.port) + ".")

        settings.numHttpServers = settings.numHttpServers + 1

        #
        # signal done initializing...
        self.doneInitializingEvent.set()

    # -----------------------------------------------------------------------------
    #
    def setFnSendMessage(self, fnSendMessage):
        self.fnSendMessage = fnSendMessage

    # -----------------------------------------------------------------------------
    #
    def close(self):
        if (self.httpServer is not None):
            print("closing " + self.context + " http server...")
            self.httpServer.close_all_connections()
            del self.httpServer
            self.httpServer = None

# -----------------------------------------------------------------------------
#
class webSocket(tornado.websocket.WebSocketHandler):
    # -----------------------------------------------------------------------------
    #
    def __init__(self, application, request, **kwargs):
        tornado.websocket.WebSocketHandler.__init__(self, application, request, **kwargs)

    # -----------------------------------------------------------------------------
    #
    def initialize(self, parent, context):
        self.objCallback = parent
        self.context = context

        self.outputQueue = multiprocessing.Queue()
        self.clients = set()
        self.initialized = False

    # -----------------------------------------------------------------------------
    #
    def open(self):
        self.handleOpen(self)

    # -----------------------------------------------------------------------------
    #
    def on_close(self, reason = ""):
        self.handleClose(self, reason)

    # -----------------------------------------------------------------------------
    #
    def on_message(self, msg):
        if msg is None:
            return

        msg = json.loads(msg)

        if (self.objCallback is not None):
            self.objCallback.onWSMessage(msg)

    # -----------------------------------------------------------------------------
    #
    def handleOpen(self, client):
        if (self.initialized is not True):
            scheduler_interval = 1
            mainLoop = tornado.ioloop.IOLoop.instance()
            self.scheduler = tornado.ioloop.PeriodicCallback(self.checkOutputQueue, scheduler_interval, io_loop = mainLoop)
            self.scheduler.start()

            if (self.objCallback is not None):
                self.objCallback.setFnSendMessage(self.sendMessage)
            else:
                print("ERROR: websocket (" + str(self.context) + "): callback object expected.")

            self.initialized = True

        self.clients.add(client)

        if (self.objCallback is not None):
            msg = self.objCallback.onWSConnect()
            if (msg is not None):
                self.sendMessage(msg, client)
        else:
            print("ERROR: websocket: callback object expected.")

    # -----------------------------------------------------------------------------
    #
    def handleClose(self, client, reason):
        if (self.objCallback is not None):
            self.objCallback.onWSDisconnect()

        self.clients.discard(client)

    # -----------------------------------------------------------------------------
    #
    def sendMessage(self, msg, client = None):
        #
        # serialize
        j = json.dumps(msg)

        if (client is not None):
            try:
                client.write_message(j)
            except Exception as e:
                print("EXCEPTION: in webSocket (" + str(self.context) + ") in sendMessage(): ", e)
        else:
            #
            # we could use a queue here, but we want to make sure message are being 
            # sent as timely as possible. A queue can signifcantly delay notifications
            # that are time sensitive, such as for example time position updates.
            #
            if (False):
                self.outputQueue.put(j)
            else:
                for client in self.clients:
                    success = False
                    numRetries = 0
                    exception = None
                    while ((not success) and (numRetries < 10)):
                        try:
                            client.write_message(j)
                            success = True
                        except Exception as e:
                            numRetries = numRetries + 1
                            exception = e
                            sleep(0.03)

                    if (not success):
                        print("EXCEPTION: in webSocket (" + str(self.context) + ") in sendMessage()  " + str(numRetries) + " retries: ", exception)

    # -----------------------------------------------------------------------------
    #
    def checkOutputQueue(self):
        if (not self.outputQueue.empty()):
            message = self.outputQueue.get()
            for client in self.clients:
                client.write_message(message)
