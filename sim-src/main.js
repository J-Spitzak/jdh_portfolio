
//BSInclude JDH.js

//BSInclude frame.js

//BSInclude button.js

//BSInclude boxButton.js

//BSInclude textInput.js

//BSInclude valueInput.js


//BSInclude xyPlot.js

//BSInclude drawing.js



//BSInclude scrollArea.js




//My code (main.js)








//// setting up jdh  ///////////////////////
testDrawing = new JDHDrawing( "testDraw" );
bg = new Frame( 0, 0, 1, 1 );
//bg.setCombinedPaint( rgba(247, 6, 6,.5) );
testDrawing.add( bg );
////////////////////////////////////////////
//// setting up scrollbar  ////////////////////


MainScroll = new ScrollArea(0,0,1,1);
bg.add(MainScroll);

////////////////////////////////////////////


rect = new Rectangle(10,800,10,500);
rect.setLineWidth( 10 );
MainScroll.add(rect);



//// input fields   /////////////////////////////////////
/////////////////////////////////////////////////////////



resize();
