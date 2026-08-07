
//BSInclude JDH.js
//BSInclude frame.js
//BSInclude tile.js
//BSInclude boxButton.js
//BSInclude menuBar.js
//BSInclude textOutput.js
//BSInclude menuPopup.js

//////////// text

var AboutMain = "I am a second year Mechanical Engineering student <@nat the Olin College of Engineering.  I love working on <@nprojects that require building something that should  <@nrequire far more time, experience and budget than <@nI really have. Last Semester I finished a fully <@nmechanical air raid siren. I will soon start building a <@nstirling cryocooler and I am working out the control <@nsystem for a omnicopter drone. I also have a <@npassion for physics and nanotechnology.";
var EducationMain = "I am currently in my second year studying <@nMechanical Engineering at Olin College. Olin is a small <@nengineering-focused school in Needham Massachusetts <@nknown for it's modern approach to engineering <@neducation. Prior to Olin I went to school at the <@nArlington Tech program in the Arlington Career Center <@n(now Grace Hopper Center)."
var AHSMain = "In my Junior year of high school I was part of a group tasked with creating plaques for the Arlington Historical Society (AHS). AHS wanted to commemorate 3 slaves who had dies at the Ball Sellers House, a historic Arlington landmark. We machined the plaques out of bronze, going through many iterations and being in constant communication with the AHS team about their requirements. I was mostly in charge of the machining and automation of the procedure. Automation was critical as although we initially made 3 it laid the groundwork for AHS's next contract of over 50 plaques to be placed in the ground and over a hundred trophy's given to students by the school."
var ARSMain = "An Air Raid Siren is a type of siren that uses a circular fan with a matching amount of blades and baffles such that it creates cyclical pressure waves while turning. To produce an audible amount of noise (>~150 Hz) the blades have to spin increadibly fast. Under drill power my rotor rotates 14 times a second and reaches a surface speed of 11.5 m/s. But the whole idea behind this was for it to be entirely mechanical so it can also be powered with a crank, however I never got it to produce a significant audible noise by crank power. Designing a system made out of plywood to be able to withstand the speeds it is subjected to was a huge engineering challenge."
var NextProjMain = "I am currently working on some upcoming projects that I hope to finish by the end of the next semester. I have designed a stirling cooler that I hope could reach cryogenic temperatures. I am also working on an omnicopter (pircture left). An omnicopter is a type of drone capable of moving and rotating independently of it's position and orientation."
var TAIMain = "Temple Allen Industries makes automated sanding equipment for the aerospace industry. I interned there from October 2024 to August 2025 and also during the 2025/26 winter and between May and July 2026. I worked to design changes to existing systems as well as leading the design of the newest version of one of their flagship products. Most of my work was in Solidworks and Excel but I also helped frequently with physical assembly";
var RobMain = "";








////////////////// setting up drawing and tiling ////////////////

drawing = new JDHDrawing( "testDraw" );

frame1 = new Frame( 0, 0, 0, 0, "the frame" );
drawing.add( frame1 );
MenuT = new Tile( 0, 0, 0, 0, "the tile" );
drawing.add( MenuT );
MenuT.setOrientation( HORIZONTAL_TILE );
MenuT.setDivision( .15 );

MenuT.getFrame1().setBackgroundPaint( "#99ff99" );

RightTile = new Tile( 0, 0, 0, 0, "child tile" );
MenuT.setFrame2( RightTile );
RightTile.setDivision( -.5 );
RightTile.getFrame2().setBackgroundPaint( "#9999ff" );

////////////////// setting up drawing and tiling ////////////////
//// setting up text ////////////////////////////////////////////


textComponent = new Component(.5,.5,.6,.6);
textComponent.setAlignment(ALIGN_CENTERED_MIDDLE);
textComponent.setBackgroundPaint(rgba(0,0,0,0));
RightTile.getFrame2().add(textComponent);

RightText = new Text(.5,.5,AboutMain);
RightText.setAlignment(ALIGN_CENTERED_MIDDLE);
RightText.setBackgroundPaint(rgba(0,0,0,0));
textComponent.add(RightText);
RightText.setBackground( null );
RightText.setText(AboutMain);

function changeText(arg) {
    console.log(arg);
    RightText.setText(arg);
}

RtextComponent = new Component(.5,.1,1,.1);
RtextComponent.setAlignment(ALIGN_CENTERED_MIDDLE);
RtextComponent.setBackgroundPaint(rgba(0,0,0,0));
RightTile.getFrame2().add(RtextComponent);

RightTextHeader = new Text(.5,.5, "Hi");
RightTextHeader.setAlignment(ALIGN_CENTERED_MIDDLE);
RtextComponent.add(RightTextHeader);
RightTextHeader.setFontSize(60);
RightTextHeader.setBackground( null );

//// setting up text ////////////////////////////////////////////
///////////////////////// setting up menu ///////////////////////


menu = new MenuBar( 0, .5, 1, 50 );
menu.setAlignment(ALIGN_CENTERED_LEFT);
MenuT.getFrame1().add( menu );
 
//  Fonts need to be changed from the top-level default.
menu.setFontSize( 30 );
 
//  menu items.
AboutMenuTab = menu.addItem( "About Me",changeText,"Main" );
EduMenuTab = menu.addItem( "Eduction",changeText,"Edu" );
ExpMenuTab = menu.addItem( "Experience",changeText,"Exp" );
ProjMenuTab = menu.addItem( "Projects" , changeText,"Proj");

//sub menus
ProjMenu = new MenuPopup();
ProjMenu.addItem( "AHS Plaques", changeText, "AHS" );
ProjMenu.addItem( "Air Raid Siren", changeText, "ARS" );
ProjMenuTab.popup = ProjMenu;

ExpMenu = new MenuPopup();
ExpMenu.addItem( "Robotics", changeText, "Rob" );
ExpMenu.addItem( "Temple Allen", changeText, "TAI" );
ExpMenuTab.popup = ExpMenu;
 
//  Help menu item is on the right of the screen.
helpMenuTab = menu.addItem( "Contact",changeText,"Contact" );
helpMenuTab.fromRight = ( true );

///////////////////////// setting up menu ///////////////////////


img = new ImageRectangle( .2, .2, .6, .6 );
img.source( "./Me.jpg" );
RightTile.getFrame1().add(img);

resize();


