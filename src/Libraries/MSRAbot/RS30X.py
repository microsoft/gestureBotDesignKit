import os
import serial
import array
import struct
import datetime
import collections
import enum 
import inspect

SERIAL_BAUDRATE = 115200
SERIAL_BYTESIZE = serial.EIGHTBITS
SERIAL_PARITY   = serial.PARITY_NONE
SERIAL_STOPBIT  = serial.STOPBITS_ONE
SERIAL_TIMEOUT  = 1

class Logger:
    logging = True
    ELogLevel = enum.Enum("ELogLevel", "ERROR WARN_ INFO_ DEBUG TRACE")
    level = ELogLevel.INFO_

    @classmethod
    def get_line(cls, depth=0):
        frame = inspect.currentframe(depth + 1)
        filename = frame.f_code.co_filename
        if filename.find('/') >= 0:
            filename = filename.rsplit('/', 1)[1]
        return (filename, frame.f_lineno)

    @classmethod
    def log(cls, level, message, *values):
        if cls.logging and cls.level.value >= level.value:
            line = cls.get_line(1)
            print ("%s:[%s]:%s:%d: %s" % (datetime.datetime.now(), level.name, line[0], line[1], message % values))

    @classmethod
    def logging(cls, logging = True):
        cls.logging = logging


class RS30XParameter:
    def __init__(self, id, pos = 0, time = -1):
        self.id = int(id)
        self.pos = int(pos)
        self.time = int(time)

class RS30XController():
    def __init__(self, port):
        if (port is None):
            port = 'COM3'

        self.dev = port
        self.ser = None
        self.status = {}
        if self.dev is not None:
            self.ser = serial.Serial(self.dev, SERIAL_BAUDRATE, SERIAL_BYTESIZE, SERIAL_PARITY, SERIAL_STOPBIT, SERIAL_TIMEOUT)

    def __send(self, array_obj):
        if self.ser is not None:
            self.ser.flushOutput()
            self.ser.flushInput()
            self.ser.write(array_obj.tostring())
    
    def initMemMap(self, id):
        a = RS30XController.createShortPacketHeader(id)
        a.extend(array.array('B', [0x10, 0xFF, 0xFF, 0x00]))
        RS30XController.appendCheckSum(a)
        Logger.log(Logger.ELogLevel.TRACE, "initMemMap, %s", a)
        self.__send(a)

    def setReplyDelay(self, id, delay):
        a = RS30XController.createShortPacketHeader(id)
        a.extend(array.array('B', [0x60, 0x07, 0x01, 0x01, delay]))
        RS30XController.appendCheckSum(a)
        Logger.log(Logger.ELogLevel.TRACE, "setReplyDelay, %s", a)
        self.__send(a)

    def setServoId(self, id, dest):
        a = RS30XController.createShortPacketHeader(id)
        a.extend(array.array('B', [0x00, 0x04, 0x01, 0x01, dest]))
        RS30XController.appendCheckSum(a)
        Logger.log(Logger.ELogLevel.TRACE, "setServoId, %s", a)
        self.__send(a)

    def commitToFlashROM(self, id):
        a = RS30XController.createShortPacketHeader(id)
        a.extend(array.array('B', [0x40,0xFF,0x00,0x00]))
        RS30XController.appendCheckSum(a)
        Logger.log(Logger.ELogLevel.TRACE, "commitToFlashROM, %s", a)
        self.__send(a)

    def restart(self, id):
        a = RS30XController.createShortPacketHeader(id)
        a.extend(array.array('B', [0x20,0xFF,0x00,0x00]))
        RS30XController.appendCheckSum(a)
        Logger.log(Logger.ELogLevel.TRACE, "restart, %s", a)
        self.__send(a)

    def torqueOn(self, id):
        a = RS30XController.createShortPacketHeader(id)
        a.extend(array.array('B', [0x00, 0x24, 0x01, 0x01, 0x01]))
        RS30XController.appendCheckSum(a)
        Logger.log(Logger.ELogLevel.TRACE, "torqueOn, %s", a)
        self.__send(a)

    def torqueOff(self, id):
        a = RS30XController.createShortPacketHeader(id)
        a.extend(array.array('B', [0x00, 0x24, 0x01, 0x01, 0x00]))
        RS30XController.appendCheckSum(a)
        Logger.log(Logger.ELogLevel.TRACE, "torqueOff, %s", a)
        self.__send(a)

    def move(self, *args):
        if isinstance(args[0], collections.Iterable) or isinstance(args[0], tuple):
            self.__moveLong(args[0])
        elif isinstance(args[0], RS30XParameter):
            self.__moveLong(args)
        else:
            self.__moveShort(*args)
    
    def __moveLong(self, args):
        datlen = 3
        if args[0].time != -1:
            datlen = 5
    
        a = RS30XController.createLongPacketHeader()
        a.extend(array.array('B', [0x1E, datlen, len(args)]))

        for arg in args:
            Logger.log(Logger.ELogLevel.TRACE, "__moveLong, id = %d, pos = %d, time = %d", arg.id, arg.pos, arg.time)
            
            a.append(arg.id)
            p = struct.pack('<h', arg.pos)
            u = struct.unpack('<BB',p)
            a.append(u[0])
            a.append(u[1])
    
            if datlen > 3:
                t = struct.pack('<h', arg.time)
                u = struct.unpack('<BB',t)
                a.append(u[0])
                a.append(u[1])

        RS30XController.appendCheckSum(a)
        Logger.log(Logger.ELogLevel.TRACE, "__moveLong, packet = %s", a)
        self.__send(a)

    def __moveShort(self, id_, pos_, time_ = -1):
        id = int(id_)
        pos = int(pos_)
        time = int(time_)

        datlen = 2
        if time != -1:
            datlen = 4

        a = RS30XController.createShortPacketHeader(id)
        a.extend(array.array('B', [0x00, 0x1E, datlen, 0x01]))
        p = struct.pack('<h', pos)
        u = struct.unpack('<BB', p)
        a.append(u[0])
        a.append(u[1])

        if datlen > 2:
            t = struct.pack('<h', time)
            u = struct.unpack('<BB', t)
            a.append(u[0])
            a.append(u[1])

        RS30XController.appendCheckSum(a)
        Logger.log(Logger.ELogLevel.TRACE, "__moveShort, id = %d, pos = %d, time = %d, packet = %s", id, pos, time, a)
        self.__send(a)

    def getStatus(self, id):
        a = RS30XController.createShortPacketHeader(id)
        a.extend(array.array('B', [0x09, 0x00, 0x00, 0x01]))
        RS30XController.appendCheckSum(a)
        Logger.log(Logger.ELogLevel.TRACE, "getStatus, %s", a)
        self.__send(a)
        
        p = None
        if self.ser is not None:
            Logger.log(Logger.ELogLevel.TRACE, "getStatus, reading...")
            p = self.ser.read(26)
        else:
            p = "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1a"
        Logger.log(Logger.ELogLevel.TRACE, "getStatusReply, %s", array.array('B', p))        
        self.status[id] = p[7:25]

    def getPosition(self, id):
        return struct.unpack('<hh', self.status[id][0:4])

    @classmethod
    def createShortPacketHeader(cls, id):
        return array.array('B', [0xFA, 0xAF, id])

    @classmethod
    def createLongPacketHeader(cls):
        return array.array('B', [0xFA, 0xAF, 0x00, 0x00])

    @classmethod
    def appendCheckSum(cls, array_obj):
        sum = array_obj[2]
        for i in range(3, len(array_obj)):
            sum = sum ^ array_obj[i]

        array_obj.extend(array.array('B', [sum])) 
