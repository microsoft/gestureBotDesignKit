## ![logo](../../../img/MARR_logo.png) [Microsoft Applied Robotics Research Library](https://microsoft.github.io/AppliedRoboticsResearchLibrary/)
### Open Source Samples for Service Robotics
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  

# Simple Sample
The sample source code in 'Simple.pyproj' demonstrates how to instantiate and run the Labanotation Controller software module by itself.

# Software Installation
The sample 'Simple' source code depends on a number of open-source Python libraries. This section provides instructions for installing and operating the software.

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
> git clone --recursive https://github.com/microsoft/gestureBotDesignKit
```
- Run these commands to download and install required python software modules:

***Tip:*** on some systems, earlier versions of python (such as python 2.7) may already be installed with a need to keep them as they are. In this case, it may be required to set a system variable that creates a path to the new installation with a link such as "python37".

```
> python get-pip.py
> python -m pip install -r requirements.txt
```
The following examples assume the repository was downloaded to a folder:
``` 
c:\Users\robotics\github_repos\gestureBotDesignKit\
```
Following is an example run session preceded by a check to insure the correct version of Python 3.7.8 is invoked:
```
C:\Users\robotics>python
Python 3.7.8 (tags/v3.7.8:4b47a5b6ba, Jun 28 2020, 08:53:46) [MSC v.1916 64 bit (AMD64)] on win32
Type "help", "copyright", "credits" or "license" for more information.
>>> quit()
>
> cd \Users\robotics\github_repos\gestureBotDesignKit\src\Samples\Simple

C:\Users\dbaum\source\github_repos\gestureBotDesignKit\src\Samples\Simple>python main.py
Labanotation Sample: Simple v1.00.0178

Http controller started on http://localhost:8000.
loaded 'Ges02_balancinghands.total.json': 10 frames. Performance duration: 5.347s
Ready.

```
# Sample Operations
The user-interface (UI) in this sample can be run in a browser window on the local machine with the localhost URL's provided in each section below.

***Tip:*** If 'localhost' is not a mapped name on the PC, it can be substituted with the PC's local IP address. Also, remote control can be achieved on the local network segment by using the PC's IP address in a browser on a different PC.

## Labanotation Controller UI
[http://localhost:8000](http://localhost:8000)
![Labanotation Controller UI](../../../img/gB_LabanotationController_UI.png)

