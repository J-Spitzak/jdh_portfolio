
//BSInclude JDH.js

//BSInclude frame.js

//BSInclude button.js

//BSInclude boxButton.js

//BSInclude textInput.js

//BSInclude valueInput.js


//BSInclude xyPlot.js




//BSInclude simulation.js





//My code (main.js)








//// setting up jdh  ///////////////////////
testDrawing = new JDHDrawing( "testDraw" );
bg = new Frame( 0, 0, 1, 1 );
bg.setCombinedPaint( rgba(247, 6, 6, 1) );
testDrawing.add( bg );
////////////////////////////////////////////
//// setting up frames  ////////////////////
/*
menuHeight = .1
TopMenu = new Frame( 0, 0, 1, menuHeight );
MainFrame = new Frame( 0, menuHeight, 1, 1 );
bg.add( TopMenu );
bg.add( MainFrame );
*/
////////////////////////////////////////////
//MainScroll = new ScrollArea(0,0,1,1);
//MainScroll.setArea( 100, 1000 );
//bg.add(MainScroll);


rect1 = new Rectangle(0,0,50,300);
rect1.setLineWidth(10);
bg.add(rect1);




//// input fields   /////////////////////////////////////
/////////////////////////////////////////////////////////



resize();