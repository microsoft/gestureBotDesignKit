# [![logo](/MARR_logo.png)Microsoft Applied Robotics Research Library](https://github.com/microsoft/AppliedRoboticsResearchLibrary)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  

# Labanotation Suite: [gestureBot Design Kit](/README.md)

# [gestureBot Construction Guide](/hardware/README.md)

## **Session 5:** Assemble the Right Arm
In this session we will 3D-print the base component while assembling the gestureBot's right arm.

### Parts: 
- servo labeled ID:005 programmed in Session 2
- (3) 130MM servo cable
- (16) short plastic rivets
- (2) long plastic rivets
- (16) 3mm miniature steel screws
- [(2) Screw Mount Swing Bracket](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_SwingBracket.stl) 3D-printed in Session 4, the swing brackets and servo wheels form a shoulder joint between servos ID:005 and ID:006 and an elbow joint between servos ID:007 and ID:008.
- [(2) Servo Wheel](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_ServoWheel.stl) 3D-printed in Session 4, the servo wheels support the swing bracket mounts for servo ID:006 and ID:008.
- [(2) Servo Mount Plate](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_ServoMountPlate.stl) 3D-printed in Session 4, the servo mount plates support the servo ID:005 attachment to the upper torso frame and form a lower arm section between servo ID:006 and ID:007.

### Tools: 
- PH0 Phillips screwdriver
- plastic rivet tool

![Session05 parts and tools](/docs_images/gB_Session05_PartsTools.jpg)

### **Procedure:**

#### **First, start 3D-printing the parts required for future sessions:**
- [Base](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_Base.stl)

#### **Second, assemble the right arm:**
- Mount a swing bracket to servo ID:005 with (4) 3mm miniature screws, taking care to align the tick-marks on the servo horn, the servo cover, and the swing bracket.
![mount right shoulder swing bracket](/docs_images/gB_Session05_MountRightShoulderSwingBracket.jpg)

- Attach servo wheel to right shoulder swing bracket by inserting a long rivet through the bracket and into the back of servo ID:006. Do not install the rivet pin to allow the servo wheel to rotate freely.
![mount right shoulder servo wheel](/docs_images/gB_Session05_Servo6WheelInstall.jpg)

- Mount the servo ID:006 horn to the right shoulder swing bracket with (4) 3mm miniature screws and taking care to align servo horn ***double tick-marks*** with the tick-mark on the bracket. Note that in this case the alignment is made with the opposite side of the servo horn.
![mount right shoulder swing bracket with screws](/docs_images/gB_Session05_Servo6InstallScrews.jpg)

- With (3) short rivets, attach a servo mount plate to the back of servo ID:007 with the mount hole rings oriented length-wise to the servo.
![attach servo7 mount plate](/docs_images/gB_Session05_Servo7MountPlate.jpg)

- Connect a 130mm cable to the top-side connector of servo ID:006. 
![connect cable to top of servo6](/docs_images/gB_Session05_Servo6ConnectCable.jpg)

- Attach servo ID:006 to ID:007 using (4) short rivets in the mount plate while routing the cable connected to servo ID:006 through the space between the servo and the mount plate.
![attach servo6 to servo7 and route cable through mount plate](/docs_images/gB_Session05_MountServo6Servo7MountPlate_RouteCable.jpg)

- Connect cable from servo ID:006 to servo ID:007 on its bottom-side connector.
![connect cable to bottom of servo7](/docs_images/gB_Session05_Connect6toServo7.jpg)

- Mount the right elbow swing bracket to servo ID:007 with (4) 3mm miniature screws taking care to align the tick-mark on the servo horn with the tick-mark on the servo cover and the bracket.
![attach swing bracket to servo7](/docs_images/gB_Session05_MountServo7SwingBracket.jpg)

- Attach servo wheel to right elbow swing bracket by inserting a long rivet through the bracket and into the back of servo ID:008. Do not install the rivet pin to allow the servo wheel to rotate freely.
![mount right shoulder servo wheel](/docs_images/gB_Session05_Servo8WheelInstall.jpg)

- Mount the servo ID:008 horn to the right elbow swing bracket with (4) 3mm miniature screws and taking care to align servo horn ***double tick-marks*** with the tick-mark on the bracket. Note that in this case the alignment is made with the opposite side of the servo horn.
![mount right elbow swing backet with screws](/docs_images/gB_Session05_Servo8InstallScrews.jpg)

- Connect a 130mm cable from the top connector of servo ID:007 to the rear-side connector of servo ID:008.
![connect servo7 to servo8](/docs_images/gB_Session05_ConnectServo7toServo8.jpg)

- Connect a 130mm cable from the rear-side connector of servo ID:005 to the bottom-side connector of servo ID:006.
![connect servo7 to servo8](/docs_images/gB_Session05_ConnectServo5toServo6.jpg)

## [**Next-> Session 6:** Assemble the Left Arm](/docs_images/Session06.md)
