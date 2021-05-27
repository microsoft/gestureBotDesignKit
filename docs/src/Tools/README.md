# [![logo](/MARR_logo.png)Microsoft Applied Robotics Research Library](https://github.com/microsoft/AppliedRoboticsResearchLibrary)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  

# Labanotation Suite: [gestureBot Design Kit](/README.md)

# **Tools**

## [convert](/src/Tools/convert/)
The **convert** tool will take a JSON Labanotation file created with the Gesture Authoring Tools included in the [Labanotation Suite](https://github.com/microsoft/LabanotationSuite) repository as input and convert it a JSON file compatible with the software in this repository.
```
usage: main.py [-h] --input INPUT --outputpath OUTPUTPATH
```

## [lab2png](/src/Tools/lab2png)
The **lab2png tool will take a Labanotation gesture file in JSON format as input and render a Labanotation score in the .png graphics format as output.
```
usage: main.py [-h] --input INPUT [--width WIDTH]
```