
//BSInclude JDH.js
//BSInclude frame.js
//BSInclude tile.js
//BSInclude boxButton.js
//BSInclude menuBar.js

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




RightText = new Text(.5,.5,"RightText");
RightText.setAlignment(ALIGN_CENTERED_MIDDLE);
RightTile.getFrame2().add(RightText);

menu = new MenuBar( 0, 75, 1, 25 );
MenuT.getFrame1().add( menu );
 
//  Fonts need to be changed from the top-level default.
menu.setFontSize( 14 );
 
//  Some fanciful titles for menu items.
fileMenuTab = menu.addItem( "File" );
dataMenuTab = menu.addItem( "Data" );
plotMenuTab = menu.addItem( "Plot" );
 
//  Help menu item is on the right of the screen.
helpMenuTab = menu.addItem( "Help" );
helpMenuTab.fromRight = ( true );


img = new ImageRectangle( .2, .2, .6, .6 );
img.source( "./Me.jpg" );
RightTile.getFrame1().add(img);

resize();


