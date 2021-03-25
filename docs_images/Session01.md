# [![logo](/MARR_logo.png)Microsoft Applied Robotics Research Library](https://github.com/microsoft/AppliedRoboticsResearchLibrary)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  

# Labanotation Suite: [gestureBot Design Kit](/README.md)

# [gestureBot Construction Guide](/hardware/README.md)

## **Session 1:** Set Up the Servo Controller Electronics
In this first session we will begin the process of 3D-printing robot plastic parts starting with the base frame which will be used in Session 2. Then, we will connect the servo controller to the powered USB3 Hub and a single servo motor.

### Parts: 
- (2) servos and their included 130mm cables
- USB Terminal Block
- USB3 Hub with Power Supply
- Servo Controller

### Tools: 
- wire strippers/cutters
- 2mm screwdriver

![Session01 parts and tools](/docs_images/gB_Session01_PartsTools.jpg)

### **Procedure:**

#### **First, start 3D-printing the parts required for the next session:**
- [Base Frame](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_Print/gB_BaseFrame.stl)

#### **Second, connect the controller and Terminal Block to the USB Hub:**

- From two servo packages, remove the short connection cables and servos then set one servo aside.
![2 short cables and servos](/docs_images/gB_Session01_ShortCables_Servos.jpg)

- Using the wire strippers/cutters, cut the plastic connector off of one of the short connection cables.
![cut short cable connector](/docs_images/gB_Session01_cut_short_cable.jpg)

- Cut the Pin3 wire completely off the remaining connector and save it to use as a ground jumper wire.
![ground wire cutting](/docs_images/gB_Session01_GroundWire_Cut.jpg)
***Tip:*** Double check you are cutting the correct wire!
- Using the wire stripper's stranded 22-gauge slot, remove approximately 3mm of the insulation from each end of the ground jumper wire and the remaining two ends of the connector cable.
![ground wire end stripping](/docs_images/gB_Session01_GroundWire_Strip.jpg)

- Using your fingers, twist the wire ends so that the strands hold together.
![jumper cable preparation](/docs_images/gB_Session01_JumperCable_Prep.jpg)
![ground wire preparation](/docs_images/gB_Session01_GroundWire_Prep.jpg)

- Using the 2mm screwdriver, loosen the screw-clamps on the USB terminal block marked '**S**', '**-**', and '**+**'.
![USB terminal block preparation](/docs_images/gB_Session01_USBTerminalBlock_Prep.jpg)
![USB terminal block preparation end view](/docs_images/gB_Session01_USBTerminalBlock_PrepEnd.jpg)

- Insert one end of the prepared jumper wire into the USB terminal block's screw clamp marked "**-**" then tighten with the screw driver.
![USB terminal block pull-test](/docs_images/gB_Session01_USBTerminalBlock_PullTest.jpg)
***Tip:*** Make sure the wire is correctly connected by firmly pulling on it and visually checking that it is not slipping out

- Connect the wires from the short cable to the USB Terminal Block:
  - Insert both the loose end of the prepared wire clamped into '**-**' and the cable wire connected to pin 1 into the wire clamp marked '**S**' then tighten with the screwdriver.

- Insert the cable wire connected to pin 2 on the connector into the wire clamp marked "**+**" (for positive voltage) and tighten with the screwdriver.
![USB terminal block wiring guide](/docs_images/gB_Session01_USBTerminalBlock_WiringGuide.jpg)
***Tip:*** the jumper wire ties the negative side of the power provided by USB to chassis ground which reduces electromagnetic noise that may interfere with communications between the controller and the servos.

- Connect the USB Terminal Block to the Servo Controller with any one of the four three-pin connectors on the controller.
![connect servo controller to USB terminal block](/docs_images/gB_Session01_USBTerminalBlock_Connect_ServoController.jpg)

- Plug the USB Terminal Block into the USB Hub using the port closest to the hub's link cable. Using the short USB-to-mini cable, connect the servo controller to any of the USB Hub's ports.
![plug controller into USB hub](/docs_images/gB_Session01_Controller_USBHubConnect.jpg)

- Connect the servo to the servo controller with the remaining 130mm cable. The cable connector must snap into place on either connector on the servo. The other end of the cable can be inserted into any of the three remaining 3-pin connectors on the servo controller PC board. 
![plug cable into servo](/docs_images/gB_Session01_Cable_ServoConnect.jpg)
![plug servo into controller](/docs_images/gB_Session01_Servo_ControllerConnect.jpg)
***Tip:*** Look closely at the cable connector ends and the receptacles to make sure the pin orientation is correct. If you push hard enough, it is possible to mistakenly insert them backwards. When inserted correctly, they will "snap" into place.

#### **Third, power it up!**

- Plug the USB Hub's power supply into an AC receptacle and insert its connector into the USB Hub. Observe a LED inside the servo flash red momentarily and a green LED on the controller turn on when power is applied.
![observe servo red light flash](/docs_images/gB_Session01_Servo_PowerLightFlash.jpg)

- Plug the USB Hub into your PC, then use Windows to open Device Manager and note which serial port number the servo controller is assigned to (for example: **"COM4"**)
![gB_DeviceManager Com Port](/docs_images/gB_Session01_DeviceManager_ComPort.png)

## [**Next -> Session 2** - Communicate with the Servos](/docs_images/Session02.md)
