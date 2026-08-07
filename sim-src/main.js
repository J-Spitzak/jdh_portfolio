
//BSInclude JDH.js
//BSInclude frame.js
//BSInclude tile.js
//BSInclude boxButton.js
//BSInclude menuBar.js
//BSInclude textOutput.js
//BSInclude menuPopup.js

//////////// text

var AboutMain = "I am a second year Mechanical Engineering student at the Olin College of Engineering. \@n I love working on projects that require building something that should require far more time, experience and budget than I really have. \@n Last Semester I finished a fully mechanical air raid siren. I will soon start building a stirling cryocooler and I am working out the control system for a omnicopter drone. \@n I also have a passion for physics and nanotechnology (particularly nano-scale imaging).";
var EducationMain = "I am currently in my second year studying Mechanical Engineering at Olin College. Olin is a small engineering-focused school in Needham Massachusetts known for it's modern approach to engineering education. Prior to Olin I went to school at the Arlington Tech program in the Arlington Career Center (now Grace Hopper Center)"









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


textComponent = new Component(.5,.5,500,500);
textComponent.setAlignment(ALIGN_CENTERED_MIDDLE);
textComponent.setBackgroundPaint(rgba(0,0,0,0));
RightTile.getFrame2().add(textComponent);

RightText = new TextOutput(0,0,1,1);
RightText.setAlignment(ALIGN_CENTERED_MIDDLE);
RightText.setBackgroundPaint(rgba(0,0,0,0));
textComponent.add(RightText);

function changeText(arg) {
    console.log("hi");
    if (arg == "Main") {
        RightText.setText(AboutMain);
    }
    else if (arg == "Edu") {
        console.log("hi!");
        RightText.setText(EducationMain);
    }
}

RightTextHeader = new Text(.5,.2,"Hi There!");
RightTextHeader.setAlignment(ALIGN_CENTERED_MIDDLE);
RightTile.getFrame2().add(RightTextHeader);
RightTextHeader.setFontSize(60);

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
ProjMenuTab = menu.addItem( "Projects" );

//sub menus
ProjMenu = new MenuPopup();
ProjMenu.addItem( "AHS Plaques", changeText, "AHS" );
ProjMenu.addItem( "Air Raid Siren", changeText, "ARS" );
ProjMenuTab.popup = ProjMenu;
 
//  Help menu item is on the right of the screen.
helpMenuTab = menu.addItem( "Contact" );
helpMenuTab.fromRight = ( true );

///////////////////////// setting up menu ///////////////////////


img = new ImageRectangle( .2, .2, .6, .6 );
img.source( "./Me.jpg" );
RightTile.getFrame1().add(img);

resize();


