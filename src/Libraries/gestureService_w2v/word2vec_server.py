# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import threading
import time
import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import Common.settings as settings

import word2vec

from xmlrpc.server import SimpleXMLRPCServer
from xmlrpc.server import SimpleXMLRPCRequestHandler

# -----------------------------------------------------------------------------
#
class application:
    #------------------------------------------------------------------------------
    # Class initialization
    #
    def __init__(self):
        self.shutdownEvent = threading.Event()

    #------------------------------------------------------------------------------
    #
    def run(self):
        print("initializing...")

        with SimpleXMLRPCServer(("127.0.0.1", 8700)) as server:
            server.register_function(pow)
            server.register_function(lambda x,y: x+y, 'add')
            server.register_instance(word2vec.word2vec(), allow_dotted_names=True)
            server.register_multicall_functions()
            print("Serving XML-RPC on localhost port 8700")
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                print("Shutting down...")


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
