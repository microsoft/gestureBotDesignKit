# [![logo](/MARR_logo.png)Microsoft Applied Robotics Research Library](https://github.com/microsoft/AppliedRoboticsResearchLibrary)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  

# Labanotation Suite: [gestureBot Design Kit](/README.md)

# **Software Samples**

## [Gesture Service](/src/Samples/gestureService_w2v)
The Gesture Service sample source code in 'gestureService_w2v.pyproj' demonstrates how to instantiate and run all of the software modules in the project together as a system: 
- Gesture Service
  - Labanotation controller
  - Gesture Engine based on Google's [word2vec](https://code.google.com/archive/p/word2vec/#!)
  - Gesture Library
- gestureBot controller


## [gestureBot](/src/Samples/gestureBot)
The gestureBot sample source code in 'gestureBot.pyproj' demonstrates how to instantiate and run the minimum software modules required to control a physical robot and have it perform gestures from ghe Gesture Library:
- Gesture Service
  - Labanotation controller
  - Gesture Library
- gestureBot controller

## [Simple](/src/Samples/Simple)
The sample source code in 'Simple.pyproj' demonstrates how to instantiate and run the Labanotation Controller software module by itself.

## [gestureBotSetLimits](/src/Samples/gestureBotSetLimits)
The sample source code in 'gestureBotSetLimits.pyproj' demonstrates how to send configuration commands to the servos using the Robotis Dynamixel 2.0 Protocol. This sample is provided as part of the physical gestureBot construction procedures to set specific rotation limits on particular servos. These limits can help prevent damage caused by incorrect commands or code errors resulting in physical collisions of the gestureBot body components. ***To run this sample, a complete physical gestureBot robot connected to the PC's USB port is required.*** 
