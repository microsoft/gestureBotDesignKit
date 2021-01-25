# --------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
# --------------------------------------------------------------------------------------------

import sys
import os
import json, operator
import numpy as np
import cv2

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import Common.utilities as utilities

class drawLaban():
    #------------------------------------------------------------------------------
    #
    def __init__(self):
        self.imgScale = 0
        self.imgWidth = 0
        self.imgHeight = 0
        self.img = None

    #------------------------------------------------------------------------------
    #
    def saveAsImage(self, outputFilepath, width = 768):
        # determine name of labanotation
        head, tail = os.path.split(outputFilepath)
        file = os.path.splitext(tail)
        self.name = file[0]

        img = self.convertToImage(width)
        if (img is not None):
            try:
                cv2.imwrite(outputFilepath, img)
                print("Labanotation score image was saved to '" + utilities.beautifyPath(outputFilepath) + "'")
            except Exception as e:
                print("Exception saving Labanotation score image to '" + utilities.beautifyPath(outputFilepath) + "': ", e)
        else:
            print("Failed to convert Labanotation to image.")

    #------------------------------------------------------------------------------
    #
    def convertToImage(self, width):
        self.imgUnit = (width / 11)

        height = int(self.duration * 10.0 * self.imgUnit);

        self.bottomFooter = int(self.imgUnit * 2)
        self.imgScale = height / self.duration
        self.imgWidth = width
        self.imgHeight = height + self.bottomFooter

        self.img = np.ones((self.imgHeight, self.imgWidth), np.uint8)
        self.img = self.img*255

        self.initCanvas()

        self.drawLimb(1,  "left",  "lwrist")
        self.drawLimb(2,  "left",  "lelbow")
        self.drawLimb(9,  "right", "relbow")
        self.drawLimb(10, "right", "rwrist")
        self.drawLimb(11, "right", "head")

        return self.img

    #------------------------------------------------------------------------------
    #
    def drawLine(self, img, starting_point, ending_point, color, thickness):
        x1 = int(starting_point[0])
        y1 = int(starting_point[1])
        x2 = int(ending_point[0])
        y2 = int(ending_point[1])

        cv2.line(self.img, (x1,y1), (x2,y2), color, thickness)

    #------------------------------------------------------------------------------
    #
    def drawRectangle(self, img, starting_point, ending_point, color, thickness):
        x1 = int(starting_point[0])
        y1 = int(starting_point[1])
        x2 = int(ending_point[0])
        y2 = int(ending_point[1])

        cv2.rectangle(self.img, (x1,y1), (x2,y2), color, thickness)

    #------------------------------------------------------------------------------
    #
    def drawCircle(self, img, center_coordinates, radius, color, thickness):
        x1 = int(center_coordinates[0])
        y1 = int(center_coordinates[1])

        cv2.circle(self.img, (x1,y1), radius, color, thickness)

    #------------------------------------------------------------------------------
    #
    def drawText(self, img, text, coordinates, font, fontScale, color, thickness):
        x1 = int(coordinates[0])
        y1 = int(coordinates[1])

        cv2.putText(self.img, text, (x1,y1), font, fontScale, color, thickness)

    #------------------------------------------------------------------------------
    #
    def drawCenteredText(self, img, text, coordinates, font, fontScale, color, thickness):
        # get boundary of this text
        textsize = cv2.getTextSize(text, font, fontScale, thickness)[0]

        x1 = int(coordinates[0]) - int(textsize[0] / 2)
        y1 = int(coordinates[1])

        cv2.putText(self.img, text, (x1,y1), font, fontScale, color, thickness)

    #------------------------------------------------------------------------------
    # draw a vertical dashed line.
    def dashed(self, x1, y1, y2):
        dash = 40
        if y1 > y2:
            a = y1; y1 = y2; y2 = a

        sz = int((np.abs(y2-y1)) / dash)

        for i in range(0, sz):
            self.drawLine(self.img, (x1, y2-i*dash), (x1, y2-i*dash-dash/2), 0, 2)

    #------------------------------------------------------------------------------
    # draw 'seconds' markers
    def drawSecondsMarkers(self, cell):
        footer = (self.imgHeight - self.bottomFooter)

        second = 0
        while True:
            x1 = (self.imgUnit * cell) - 4
            x2 = (self.imgUnit * cell) + 4
            y = footer - (second * self.imgScale)
            if y < 0:
                break
            self.drawLine(self.img, (int(x1), int(y)),(int(x2), int(y)), 0, 2)
            second += 1

    #------------------------------------------------------------------------------
    # canvas initialization
    def initCanvas(self):
        footer = (self.imgHeight - self.bottomFooter)

        self.drawLine(self.img,(self.imgUnit*3,0),(self.imgUnit*3,footer),0,2)
        self.drawLine(self.img,(self.imgUnit*5,0),(self.imgUnit*5,footer),0,2)
        self.drawLine(self.img,(self.imgUnit*7,0),(self.imgUnit*7,footer),0,2)
        self.drawLine(self.img,(self.imgUnit*3,footer),(self.imgUnit*7,footer),0,2)
        self.drawLine(self.img,(self.imgUnit*3,footer+4),(self.imgUnit*7,footer+4),0,2)

        for i in range(1, 11):
            self.dashed(self.imgUnit*i, 0, footer)

        self.drawSecondsMarkers(3)
        self.drawSecondsMarkers(5)
        self.drawSecondsMarkers(7)

        font = cv2.FONT_HERSHEY_SIMPLEX
        subtitle = (self.imgHeight - 50)
        title = (self.imgHeight - 20)
        self.drawText(self.img,'lower', (0*self.imgUnit+5,subtitle), font, 0.5, 1,2)
        self.drawText(self.img,'upper', (1*self.imgUnit+5,subtitle), font, 0.5, 1,2)
        self.drawText(self.img,'upper', (8*self.imgUnit+5,subtitle), font, 0.5, 1,2)
        self.drawText(self.img,'lower', (9*self.imgUnit+5,subtitle), font, 0.5, 1,2)
        self.drawText(self.img,'head', (10*self.imgUnit-5,title),    font, 0.8   , 1,2)
        self.drawText(self.img,'arm(L)',(0*self.imgUnit+10,title),   font, 0.8, 1,2)
        self.drawText(self.img,'arm(R)',(8*self.imgUnit+10,title),   font, 0.8, 1,2)

        self.drawCenteredText(self.img, self.name, (5*self.imgUnit, self.imgHeight-35), font, 1.2, 1,2)

    #------------------------------------------------------------------------------
    # 
    def drawLabanSign(self, cell, time, duration, side, dir, lvl):
        time1 = time
        time2 = time + duration

        x1 = (cell-1)*self.imgUnit+7
        x2 = cell*self.imgUnit-5
        y1 = self.imgHeight - self.bottomFooter - int(time2 * self.imgScale) + 3
        y2 = self.imgHeight - self.bottomFooter - int(time1 * self.imgScale) - 3

        # shading: pattern/black/dot
        if (lvl == "normal"):
            self.drawCircle(self.img, ((x1+x2)/2, (y1+y2)/2), 4, 0, -1)
        elif (lvl == "high"):
            step = 20
            i = 0
            while True:
                xl = x1
                yl = y1 + (i*step)
                xr = x1 + (i*step)
                yr = y1
                if (yl > y2):
                    xl = yl-y2+xl
                    yl = y2
                if (xr > x2):
                    yr = y1+xr-x2
                    xr = x2
                if ((xl > xr) or (yr > yl)):
                    break
                self.drawLine(self.img, (xl,yl), (xr, yr), 0, 2)
                i += 1
        elif (lvl == "low"):
            self.drawRectangle(self.img, (x1,y1), (x2,y2), 0, -1)
        else:
            print("Unknow Level: " + lvl)

        #shape: trapezoid, polygon, triangle, rectangle
        if (dir == "right"):
            pts = np.array([[x1,y1-1],[x2+1,y1-1],[x2+1,(y1+y2)/2]],np.int32)
            cv2.fillPoly(self.img,[pts],255)
            pts = np.array([[x1,y2+1],[x2+1,y2+1],[x2+1,(y1+y2)/2]],np.int32)
            cv2.fillPoly(self.img,[pts],255)
            pts = np.array([[x1,y1],[x1,y2],[x2,(y1+y2)/2]],np.int32)
            cv2.polylines(self.img, [pts], True, 0, 2)
        elif (dir == "left"):
            pts = np.array([[x1-1,y1-1],[x2,y1-1],[x1-1,(y1+y2)/2]],np.int32)
            cv2.fillPoly(self.img,[pts],255)
            pts = np.array([[x1-1,y2+1],[x2,y2+1],[x1-1,(y1+y2)/2]],np.int32)
            cv2.fillPoly(self.img,[pts],255)
            pts = np.array([[x1,(y1+y2)/2],[x2,y1],[x2,y2]],np.int32)
            cv2.polylines(self.img, [pts], True, 0, 2)
        elif (dir == "left forward"):
            pts = np.array([[x1,y1-1],[x2+1,y1-1],[x2+1,y1+(y2-y1)/3]],np.int32)
            cv2.fillPoly(self.img,[pts],255)
            pts = np.array([[x1,y1],[x2,y1+(y2-y1)/3],[x2,y2],[x1,y2]],np.int32)
            cv2.polylines(self.img, [pts], True, 0, 2)
        elif (dir == "right forward"):
            pts = np.array([[x1-1,y1-1],[x2+1,y1-1],[x1-1,y1+(y2-y1)/3]],np.int32)
            cv2.fillPoly(self.img,[pts],255)
            pts = np.array([[x1,y1+(y2-y1)/3],[x2,y1],[x2,y2],[x1,y2]],np.int32)
            cv2.polylines(self.img, [pts], True, 0, 2)
        elif (dir == "left backward"):
            pts = np.array([[x1,y2+1],[x2+1,y2+1],[x2+1,y2-(y2-y1)/3]],np.int32)
            cv2.fillPoly(self.img,[pts],255)
            pts = np.array([[x1,y1],[x2,y1],[x2,y2-(y2-y1)/3],[x1,y2]],np.int32)
            cv2.polylines(self.img, [pts], True, 0, 2)
        elif (dir == "right backward"):
            pts = np.array([[x1-1,y2+1],[x2+1,y2+1],[x1-1,y2-(y2-y1)/3]],np.int32)
            cv2.fillPoly(self.img,[pts],255)
            pts = np.array([[x1,y1],[x2,y1],[x2,y2],[x1,y2-(y2-y1)/3]],np.int32)
            cv2.polylines(self.img, [pts], True, 0, 2)
        elif (dir == "forward" and side=="right"):
            self.drawRectangle(self.img,(x1+(x2-x1)/2,y1-1),(x2+1,y1+(y2-y1)/3),255,-1)
            pts = np.array([[x1,y1],[x1+(x2-x1)/2,y1],[x1+(x2-x1)/2,y1+(y2-y1)/3],
                            [x2,y1+(y2-y1)/3],[x2,y2],[x1,y2]],np.int32)
            cv2.polylines(self.img, [pts], True, 0, 2)
        elif (dir == "forward" and side=="left"):
            self.drawRectangle(self.img,(x1-1,y1-1),(x1+(x2-x1)/2,y1+(y2-y1)/3),255,-1)
            pts = np.array([[x1,y1+(y2-y1)/3],[x1+(x2-x1)/2,y1+(y2-y1)/3],[x1+(x2-x1)/2,y1],
                            [x2,y1],[x2,y2],[x1,y2]],np.int32)
            cv2.polylines(self.img, [pts], True, 0, 2)
        elif (dir == "backward" and side=="right"):
            self.drawRectangle(self.img,(x1+(x2-x1)/2,y2-(y2-y1)/3),(x2+1,y2+1),255,-1)
            pts = np.array([[x1,y1],[x2,y1],[x2,y2-(y2-y1)/3],
                            [x1+(x2-x1)/2,y2-(y2-y1)/3],[x1+(x2-x1)/2,y2],[x1,y2]],np.int32)
            cv2.polylines(self.img, [pts], True, 0, 2)
        elif (dir == "backward" and side=="left"):
            self.drawRectangle(self.img,(x1-1,y2-(y2-y1)/3),(x1+(x2-x1)/2,y2+1),255,-1)
            pts = np.array([[x1,y1],[x2,y1],[x2,y2],
                            [x1+(x2-x1)/2,y2],[x1+(x2-x1)/2,y2-(y2-y1)/3],
                            [x1,y2-(y2-y1)/3]],np.int32)
            cv2.polylines(self.img, [pts], True, 0, 2)
        elif (dir == "place"):
            self.drawRectangle(self.img,(x1,y1),(x2,y2),0,2)
        else:
            print("Unknow Direction: " + side + ": " + dir)
    
    #------------------------------------------------------------------------------
    # 
    def drawLimb(self, cell, side, key):
        track = self.tracks[key]

        cnt = len(track.keyFrames)
        for idx in range(0, cnt):
            if (idx == 0):
                prevTime = 0
                prevDir = ''
                prevLvl = ''
            else:
                prevTime = track.keyFrames[idx-1]['time']
                prevDir = track.keyFrames[idx-1]['dir']
                prevLvl = track.keyFrames[idx-1]['lvl']

            time = track.keyFrames[idx]['time']
            dir = track.keyFrames[idx]['dir']
            lvl = track.keyFrames[idx]['lvl']

            duration = time - prevTime

            if ((prevDir == dir) and (prevLvl == lvl)):
                continue

            self.drawLabanSign(cell, prevTime, duration, side, dir, lvl)

