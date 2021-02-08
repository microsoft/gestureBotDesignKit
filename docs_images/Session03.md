# [![logo](/MARR_logo.png)Microsoft Applied Robotics Research Library](https://github.com/microsoft/AppliedRoboticsResearchLibrary)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)  

# Labanotation Suite: [gestureBot Design Kit](/README.md)

# [gestureBot Construction Guide](/hardware/README.md)

## **Session 3:** Assemble the Torso
In this session we will 3D-print the head components while assembling the gestureBot's torso.

### Parts: 
- (3) servos labeled ID:004, ID:003, and ID:002 programmed in Session 2
- (4) 130MM servo cables
- (22) short plastic rivets
- (5) long plastic rivets
- (4) 3mm miniature steel screws
- [Base Frame](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_Print/gB_BaseFrame.stl) 3D-printed in Session 1, the base frame is the lower torso component and provides the stationary mounting point for servo ID:004 and anchors all of the moving parts of the gestureBot.
- [Hip Cover](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_HipCover.stl) 3D-printed in Session 2, the hip cover attaches to the base frame and it's spherical shape allows the gestureBot's hip joint to move without exposing its interior.
- [Hip Swing Bracket](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_SwingBracket_Hip.stl) 3D-printed in Session 2, the hip swing bracket and servo wheel attach to servo ID:004 and ID:003 rotating vertically to allow the entire gestureBot to lean forward and backward.
- [Upper Torso Frame](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_UpperTorsoFrame.stl) 3D-printed in Session 2, the upper torso frame and mount plate connect to servo ID:003 allowing the gestureBot's torso to rotate horizontally, as well as providing mount points for servo ID:002 which rotates the head horizontally and servos ID:005 and ID:009 which rotate the arm assemblies vertically.
- [Servo Wheel](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_SwingBracket_Hip.stl) 3D-printed in Session 2, the servo wheel supports servo ID:004 in the hip swing bracket.
- [Servo Mount Plate](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_UpperTorsoFrame.stl) 3D-printed in Session 2, the servo mount plate supports servo ID:002 in the upper torso frame.

### Tools: 
- PH0 Phillips screwdriver
- plastic rivet tool

![Session 3 parts and tools](/docs_images/gB_Session03_PartsTools.jpg)

### **Procedure:**
#### **First, start 3D-printing the parts required for the next session:**
- [Neck](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_Neck.stl) 3D-printed in Session 3
- [Head Swing Bracket](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_SwingBracket_Head.stl) 3D-printed in Session 3
- [Servo Wheel](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_ServoWheel.stl) 3D-printed in Session 3
- [Head Frame](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_HeadFrame.stl) 3D-printed in Session 3
- [Face](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_Face.stl) 3D-printed in Session 3
- [Speaker](https://github.com/microsoft/gestureBotDesignKit/blob/main/hardware/3D_print/gb_Speaker.stl) 3D-printed in Session 3

**Hint:** Many 3D-printers have enough room on their build plate to print all of these models at the same time. Follow your printer's software instructions on how to add multiple models to a printing project file.

#### **Second, learn how to ensure the gripping performance of plastic rivets:**
It is easy to install plastic rivets incorrectly and decrease their grip and fastening strength. To work well, care must be taken not to deform their shape or crush their structure when inserting them into their mount holes. 

![Damaged rivets versus functional rivets](/docs_images/gB_Session03_RivetComparison.jpg)

Generally, the plastic covers of the servo motors are molded (not 3D-printed) from high-quality plastic. Their precision shapes are stable and do not present a problem for plastic rivets. However, parts printed by desktop 3D-printers may have shape variances that may negatively impact the way the rivets work.  Issues such as printer settings, calibration drift, quality and type of the plastic filament supply, print head wear, and environmental conditions such as temperature, humidity or vibrations can all affect the strength, flexibility, and shape precision of the parts they print.

![tool small hole crushing rivet](/docs_images/gB_Session03_RivetInsertion.jpg)

To prevent these factors from impacting rivet strength, make sure that the mount holes are a full 3mm in diameter. If they are too small they will crush and deform the rivet shell, preventing their tips from expanding when the pin is inserted and gripping the inside edge of the mount hole. If this is the case with the mount holes in your 3D-printed parts, be sure to enlarge them with a 3mm drill bit, a rotary deburring tool, or a needle file.

![expanding rivet hole](/docs_images/gB_Session03_RivetHole_Debur.jpg)

When inserting a rivet, the shell must reach far enough into the material layers it is fastening that the ridges on its end extend past the edge of the last layer. Ideally, the ridge edge and the material edge match perfectly. When the pin is inserted, the shell expands and pushes the ridge edges over the material edge and should produce a satisfying "snap" feeling. This action creates a gripping shelf that prevents the rivet from exiting the hole. If the rivet does not fully expand, only the friction pressure of the rivet shell against the side of the hole will hold it in, which is a much weaker form of fastening and generally will work loose as the robot moves during normal operation. 

#### **Third, assemble the components of the torso:**

- Mount servo ID:003 to the hip bracket by installing 6 rivets.
![mount servo to hip bracket with rivets](/docs_images/gB_Session03_Servo_HipBracket_RivetInstall.jpg)
![servo mounted to hip bracket](/docs_images/gB_Session03_Servo_HipBracket_Complete.jpg)

- Connect (2) 130mm cables to servo.
![connect cables to servo](/docs_images/gB_Session03_Servo3Cables.jpg)

- Install servo wheel with a long rivet. Do not insert a pin into the long rivet, friction will be sufficient to hold the rivet through the 3 layers and the servo wheel must spin freely.
![install servo wheel](/docs_images/gB_Session03_Servo4WheelInstall.jpg)

- Install servo ID:004 into the hip bracket, making sure that the servo horn (wheel that moves) is at its 0-degree postion. Check that the small single tick-mark on the horn is aligned with the tick-mark on the servo housing, as well as the tick-mark on the swing bracket.
![check alignment of servo horn and bracket](/docs_images/gB_Session03_Servo4Install_BracketAlignment.jpg)

- Fasten servo ID:004 to the bracket with (4) screws.
![install servo with screws](/docs_images/gB_Session03_Servo4Install_Screws.jpg)

- Connect servo ID003 to servo ID004 with one of its 130mm cables.
![connect servo cables](/docs_images/gB_Session03_ConnectServo3toServo4.jpg)

- Connect 130mm cable to servo ID004.
![connect servo cables](/docs_images/gB_Session03_ConnectServo4Cable.jpg)

- Mount servo ID:004 to base frame with (6) rivets, routing cable through side gap between mount holes.
![mount servo to base frame](/docs_images/gB_Session03_MountServo4BaseFrame.jpg)
![mount servo to base frame interior](/docs_images/gB_Session03_MountServo4BaseFrame_Interior.jpg)

- Route servo ID:004 cable through access hole in base frame.
![route servo cable through base frame](/docs_images/gB_Session03_RouteServo4Cable.jpg)

- Install the hip cover over servos ID:003 and ID:004 and onto the base frame. While not functionally significant, it might be aesthetically preferrable to align the ridges of the hip cover with the ridges on the base frame.
![install hip cover](/docs_images/gB_Session03_InstallHipCover.jpg)
![align hip cover](/docs_images/gB_Session03_AlignHipCover.jpg)

- Mount upper torso frame to servo ID003 with (4) short rivets, taking care servo horn tick-mark is aligned with tick-mark on servo housing.
![mount upper torso frame to servo](/docs_images/gB_Session03_MountUpperTorsoFrame_AlignServo3Horn.jpg)
![mount upper torso frame to servo](/docs_images/gB_Session03_MountUpperTorsoFrame_Servo3Horn.jpg)

- Attach servo ID:002 mount plate with (4) short rivets.
![mount servo mount plate](/docs_images/gB_Session03_MountServo4MountPlate.jpg)
![install mount plate rivets](/docs_images/gB_Session03_Servo4MountPlateRivets.jpg)

- Connect servo ID:003 to servo ID:002 with 130mm cable
![connect servo cables](/docs_images/gB_Session03_ConnectServo3toServo2.jpg)

- Mount servo ID:002 to upper torso frame with mount plate, taking care to route 130mm cables through gaps between mounting holes at bottom of servo.
![mount servo to upper torso frame](/docs_images/gB_Session03_MountServo2UpperTorsoFrame.jpg)

- Use (2) long rivets in the bottom mount plate holes.
![mount servo to upper torso frame with long rivets](/docs_images/gB_Session03_MountServo2UpperTorsoFrame_LongRivets.jpg)
- Use (4) short rivets in the back mount plate holes.
![mount servo to upper torso frame with mount plate](/docs_images/gB_Session03_MountServo2UpperTorsoFrame_PlateRivets.jpg)

- Inspect The completed upper torso assembly.
![completed upper torso assembly](/docs_images/gB_Session03_Complete.jpg)

## [**Next -> Session 4:** Assemble the Head Structure](/docs_images/Session04.md)
