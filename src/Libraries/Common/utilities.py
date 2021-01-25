# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import os
import sys
import time
import datetime

# -----------------------------------------------------------------------------
# when possible, create a relative sub_path for path from main_path
#
def getRelativePath(main_path, sub_path):
    if sys.platform == "win32":
        main_path = main_path.lower()
        sub_path = sub_path.lower()
    _main_path = os.path.abspath(main_path).split(os.path.sep)
    _sub_path = os.path.abspath(sub_path).split(os.path.sep)
    eq_until_pos = None
    for i in range(min(len(_main_path), len(_sub_path))):
        if _main_path[i] == _sub_path[i]:
            eq_until_pos = i
        else:
            break
    if eq_until_pos is None:
        return sub_path
    newpath = [".." for i in range(len(_main_path[eq_until_pos+1:]))]
    newpath.extend(_sub_path[eq_until_pos+1:])
    return os.path.join(*newpath) if newpath else "."

# -----------------------------------------------------------------------------
#
def beautifyPath(strPath):
    splitOutput = os.path.split(os.path.abspath(strPath))
    relativePath = getRelativePath(os.getcwd(), splitOutput[0])
    return os.path.join(relativePath, splitOutput[1])

# -----------------------------------------------------------------------------
#
def getTime():
    # return int(round(time.time() * 1000))     # not precise enough...
    # return time.clock() * 1000.0              # appears to be only accurate on Windows platform

    now = datetime.datetime.now()
    epoch = time.mktime(now.timetuple())*1e3 + now.microsecond/1e3

    return (epoch / 1000.0)     # return in seconds...

