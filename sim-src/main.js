
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
bg.setBackgroundPaint( rgb(250,250,250) );
testDrawing.add( bg );
////////////////////////////////////////////
//// setting up scrollbar  ////////////////////


MainScroll = new ScrollArea(0,0,1,1);
bg.add(MainScroll);

////////////////////////////////////////////


rect = new Rectangle(10,800,10,500);
rect.setLineWidth( 10 );
MainScroll.add(rect);

////////////////////////Name and Picture///////////////////
startY = 0;

nameTile = new Text(.2,400,"Jason Spitzak");
nameTile.setAlignment(ALIGN_ABOVE_LEFT);
nameTile.setFontSize(42);


img = new ImageRectangle( .7, .1, 400, 400 );
img.source( "./Me.jpg" );

Namebkg = new Rectangle(0,0,1,700);
rect2.setBackgroundPaint( rgba( .5, .5, .2 ,.05) );
Namebkg.setLineWidth( 0 );

MainScroll.add(Namebkg);
MainScroll.add(nameTile);
MainScroll.add(img);


/////////////////////////////////////////////////////////
startY = 700;




resize();
