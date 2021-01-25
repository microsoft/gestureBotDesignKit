# [![logo](/MARR_logo.png)Microsoft Applied Robotics Research Library](https://github.com/davidbaumert/AppliedRoboticsResearchLibrary)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  

# Labanotation Suite: [gestureBot Design Kit](/README.md)

# **Software Installation and Operation: gestureBotSetLimits Sample**

# Introduction
The sample source code in 'gestureBotSetLimits.pyproj' demonstrates how to send configuration commands to the servos using the Robotis Dynamixel 2.0 Protocol. This sample is provided as part of the physical gestureBot construction procedures to set specific rotation limits on particular servos. These limits can help prevent damage caused by incorrect commands or code errors resulting in physical collisions of the gestureBot body components. ***To run this sample, a complete physical gestureBot robot connected to the PC's USB port is required.*** 

# Software Installation
The sample 'gestureBotSetLimites' source code depends on a number of open-source Python libraries. This section provides instructions for installing and operating the software.

## Tested System Software
We used the following software versions to test the Gesture Service samples:
- Windows 10 (Version 2004, 64-bit) **or** Linux (Ubuntu18.04, 64-bit)
- Microsoft Edge Browser (Version 87.0.664.66, 64-bit)
- Git client [*(Comes with Microsoft Visual Studio Code)*](https://code.visualstudio.com/Download)
- [Python 3.7.8](https://www.python.org/downloads/release/python-378/)

### Python Modules
- The following modules are listed in a requirements.txt file for easy installation:
```
numpy==1.19.3
scipy==1.5.2
tornado==4.5.2
opencv-python==4.4.0.46
pyserial==3.4
msgpack-rpc-python==0.4.1
gensim==3.8.3
nltk==3.5
dynamixel_sdk==3.7.31
```

## Installation Instructions
For Windows or Linux, the following instructions will guide you through the installation of code and assets comprising the gestureBot Design Kit as well as dependent external software.

If not already on your PC, download and run the following installers:
- Python 3.7.8:
 [https://www.python.org/downloads/release/python-378/](https://www.python.org/downloads/release/python-378/)

- PIP:
[https://bootstrap.pypa.io/get-pip.py](https://bootstrap.pypa.io/get-pip.py)

From a [**cmd.exe**](C:\WINDOWS\system32\cmd.exe), bash, or other terminal shell:
- Create a folder for the installation in any convenient location and make it the current directory:
```
> mkdir [folder path]
> cd [folder path]]
```
- Clone the repository:
```
> git clone --recursive https://dev.azure.com/msresearch/Robotics/_git/gestureBotDesignKit_Beta
```
# ***ToDo:  Replace above link with public Github repository when it is released.***
- Run these commands to download and install required python software modules:

***Tip:*** on some systems, earlier versions of python (such as python 2.7) may already be installed with a need to keep them as they are. In this case, it may be required to set a system variable that creates a path to the new installation with a link such as "python37".

```
> python get-pip.py
> python -m pip install -r requirements.txt
```


- Using Microsoft Visual Code or any text editor, open the file in the repository folder:
\gestureBotDesignKit\src\Samples\gestureBotSetLimits\main.py

- In **line 50**, change the value to match the serial port noted earlier for your gestureBot. For example:
```
    self.comPort = "com4"
```
***Tip:*** If needed, the serial port can be looked up in Windows Device Manager as shown at the end of [Session 1](/docs_images/Session01.md).

# Sample Operations
The following example run session starts with a check that the correct verion of Python (3.7.8) is invoked and assumes the repository was downloaded to a folder:
``` 
c:\Users\robotics\github_repos\gestureBotDesignKit\
```
The example session:
```
C:\Users\robotics>python
Python 3.7.8 (tags/v3.7.8:4b47a5b6ba, Jun 28 2020, 08:53:46) [MSC v.1916 64 bit (AMD64)] on win32
Type "help", "copyright", "credits" or "license" for more information.
>>quit()
>
> cd \Users\robotics\github_repos\gestureBotDesignKit\src\Samples\gestureBotSetLimits\

C:\Users\robotics\github_repos\gestureBotDesignKit\src\Samples\gestureBotSetLimits>python main.py
gestureBot: connecting to port 'com4'...
ID: 1: setting CW angle limit to -70 (272)
ID: 1: setting CCW angle limit to 50 (682)
ID: 2: setting CW angle limit to -91 (201)
ID: 2: setting CCW angle limit to 91 (821)
gestureBot: disconnecting from port 'com4'...
```
***Tip:*** In the future, if you modify your gestureBot and want to set different safety limits, this code provides an example in the **run()** function starting at **line 270**.
