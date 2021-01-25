![MARR_logo.png](/docs/MARR_logo.png)**Microsoft Applied Robotics Research Library**
# [Gesture Library Samples](/README.md)

# **Software Installation and Operation**

# Introduction
The Gesture Library sample 'MSRAbot' demonstrates how to instantiate the Labanotation controller and MSRAbot simulation... 

# Software Installation
The Gesture Library sample 'MSRAbot' project depends on a number of open-source Python libraries. This section provides instructions for installing and operating the software.

## Tested System Software
We used the following software versions to build the MSRAbot Design Kit:
*   Windows 10 (Version 2004, 64-bit) **or** Linux (Ubuntu18.04, 64-bit)
*   Git client [*(Comes with Microsoft Visual Studio Code)*](https://code.visualstudio.com/Download)
*   [Python 3.7.8](https://www.python.org/downloads/release/python-378/)
### Python Modules
* see requirements.txt

## Instructions
For Windows or Linux, the following instructions will guide you through the installation of code and assets comprising the MSRAbot Design Kit as well as dependent external software.
### Windows
**From a cmd.exe or other terminal shell:**
*   Create a folder for the installation in any convenient location and make it the current directory:
```
$ mkdir [folder path]
$ cd [folder path]]
```

*   Download and run the Python installer from this [link](https://www.python.org/ftp/python/2.7.10/python-2.7.10.amd64.msi)

*   Download the Pip installer to your installation folder from this [link](https://bootstrap.pypa.io/get-pip.py)

*   Run these commands:
```
> python get-pip.py
> python -m pip install -r requirements.txt
```
*   Clone the repository:
```
> git clone --recursive https://dev.azure.com/msresearch/Robotics/_git/MSRABot_DesignKit_Beta
```

### Linux
**From a bash or other terminal shell:**

*   Create a folder for the installation in any convenient location and make it the current directory:
```
$ mkdir [folder path]
$ cd [folder path]
```
*   Run these commands:
```
$ sudo apt-get update
$ sudo apt install python-pip
$ python -m pip install -r requirements.txt
```
*   Clone the project repository:
```
$ git clone --recursive https://dev.azure.com/msresearch/Robotics/_git/MSRABot_DesignKit_Beta
```
