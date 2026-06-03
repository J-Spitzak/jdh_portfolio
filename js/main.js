
//  This is the "top level" for a JDH drawing.  It provides the functions you need to
//  define components, draw them, and respond to events as necessary.  All components
//  are "children" of a "topLevel" component, which is defined in the "init()" function.
//  The "init()" function should be called with the ID of the HTML canvas that contains
//  the JDH drawing area.
//
//  INCLUDE ITEMS:
//=============================================================================
//
//  This is a series of functions to make sharing "global" memory items easier
//  between two (or more) JDH applications.  
//
//=============================================================================


//  This function creates an object that is simply a pointer to shared memory.
//  The user can put whatever they want in there.
function BaseSharedMemory() {
    //  Shared memory is stored in the "window" structure (which probably locks
    //  us to a single browser window - may need to find a way out of that).
    //  This is useful because it is "global", yet we can check if it is
    //  undefined (you can't do that with a pure global variable).
	if ( window.sharedJDHItems === undefined )
		window.sharedJDHItems = {};
	return window.sharedJDHItems;
}

//  Generate a shared memory item with the given name.  This creates an object that
//  you can add variables to as you see fit.  Because it calls the BaseSharedMemory()
//  function, it will initialize shared memory if that has not been done.
function SharedMemory( newName ) {
    //  Get a pointer to shared memory - this will initialize it if necessary.
    var shared = BaseSharedMemory();
    //  Create the named item if it doesn't exist.
    if ( shared[newName] === undefined )
        shared[newName] = {};
    return shared[newName];
}
//notInclude nixieFont.js
//=============================================================================
//  Component
//  
//  This is the most basic component of the JDH drawing scheme, used as the base for
//  all widgets.  It contains the mechanisms for being a member of a list of components,
//  maintaining a list of child components, and for propogating draw instructions, resize
//  activities, and event handling to child components.  A Component has size parameters
//  and resize instructions even if it is not drawn itself.
//=============================================================================

function Component( x, y, w, h, label ) {
    this.setSize( x, y, w, h );
    this.label = label;     //  this can be a string or a component (or null)
	this.name = label;      //  The "name" matches the label initially, although you can change it.
	if ( label === undefined ) {
		this.label = null;
		this.name = null;
	}  
	this.next = null;       //  the next in a linked list
	this.previous = null;   //  the previous in a linked list
	this.children = null;   //  the first component in a linked list of child components
	this.lastChild = null;  //  the last child added in the child list
	this.parent = null;     //  the parent component of this component
	this.background = null; //  components to draw before this component
	this.foreground = null; //  components to draw after this component
	this.noLabel = false;   //  shut off labeling - if you want to use the label internally somehow
	                        //  (object identification in diagnostics, for instance)
	//  Offsets applied to computed X,Y positions.  Used for zooming.
	this.xOffset = 0.0;
	this.yOffset = 0.0;
	//  These "drawing" size specifications are where the component is actually
	//  drawn (in pixels).  They are recomputed on the fly when sizes change.
	this.drawX = x;
	this.drawY = y;
	this.drawW = w;
	this.drawH = h;
	//  Track whether this component is a WebGL component.  The GLComponent class will change this
	//  on inheritance.
	this.isGL = false;
	//  Settings that will apply to this object and its children when they are
	//  drawn.  These are checked in the "drawSettings()" function and undone, if
	//  necessary, in the "returnSettings()" function.
	this.strokePaint = null;
	this.fillPaint = null;
	this.lineWidth = null;
	this.lineCap = null;
	this.lineJoin = null;
	this.miterLimit = null;
	this.lineDash = null;
	this.lineDashOffset = null;
	//  Font stuff
	this.font = null;
	this.fontSize = null;
	this.fontFamily = null;
	this.fontVariant = null;
	this.fontItalic = null;
	this.fontBold = null;
	this.fontOutline = null;
	//  The alpha setting for this component.  This will apply to all paint, and is independent
	//  of any alpha setting WITHIN paint (rgba, etc.).
	this.alpha = null;
	//  Font paints are a bit of a fake - JavaScript does not actually track a different
	//  set of paints for fonts - these are used in the "drawText" function, and have to be
	//  undone by hand (save/restore won't do it!).
	this.fontFillPaint = null;
	this.fontStrokePaint = null;
	this.inactiveFontFillPaint = null;
	this.inactiveFontStrokePaint = null;
	//  Shadow information for this component.
	this.hasShadow = false;
	this.shadowColor = null;
	this.shadowBlur = null;
	this.shadowX = null;
	this.shadowY = null;
	//  Each component may impose its own clipping area.  The setClip() function
	//  may be used to specify a complex clipping path, or it may simply be set to
	//  "true", which will cause clipping to apply to a default area - the frame
	//  outlined by the current object dimensions.  Clipping applies to object
	//  drawing and to children.
	this.clipRegion = false;
	//  A component may be made invisible.  It will neither draw itself nor respond
	//  to events.  It will, however, resize.
	this.visible = true;
	//  Elaborate components can be made to trigger all sorts of callbacks, but enough
	//  components do only one thing that a generic callback scheme is included here.
	//  Set the callback function using setCallback().  Trigger the callback using
	//  doCallback().  If you don't set the callback, calling the latter is harmless.
	this.callback = null;
	//  The callbackComponent is the target component of the callback.  Set with the
	//  setCallback() function.
	this.callbackComponent = null;
	//  This is an amount of time a callback should be delayed before it is triggered.
	//  It can be used to avoid repeated callbacks - each "possible" callback will
	//  cause all previous callbacks to be cancelled and will schedule a new callback
	//  at this delay interval.  The delay interval is measured in milliseconds.
	this.callbackDelay = null;
	this.callbackTimeoutID = null;
	this.callbackWhen = 0;
	this.callbackArg = null;
	//  Any component may be made to ignore all events by setting this to false.
	this.handleEvents = true;
	//  This is a similar setting that is used to make components "inactive".
	this.inactiveEvents = false;
	//  This "deactivates" a component, but it is still visible.  The setting can be used to change
	//  the color.
	this.deactivated = false;
	//  This is the "drawing" this component belongs to.
	this.drawing = null;
	//  These are used for child component removal.  This first is a list of children
	//  that are to be removed (as pointers).  The second is a list of children that
	//  have descendents that have removals in them.  These are set during operation, then
	//  checked on a top-level draw.
	this.removeChildren = [];
	this.removeDescendents = [];
	//  Related to tooltips.  See the "setTooltip()" function for details.
	this.tooltipCallback = null;
	this.defaultTooltip = null;
	this.tooltipDefined = false;
	this.tooltipGo = true;
	//  The "physical change" flag is used to indicate that something has happened to
	//  this component that changed its size.  This can be the addition or removal of
	//  a child component, or a resize of this or a child component.  To set the
	//  physical change flag, use the physicalChange( true/false ) function.  When
	//  you set it to true, parent components will be informed (and they will inform
	//  their parents, etc.).
	//  This scheme was originally implemented to serve the Browser and BrowserItem
	//  components, but it may have other uses.
	this.physicalChange = false;
	//  The scale should apply to everything.
	this.scale = null;
	//  Experimental x and y scales - these should not be used in combination with the
	//  above, and they don't handle zoom values.
	this.scaleX = null;
	this.scaleY = null;
	//  Rotation.
	this.rotate = null;
	//  Skew values.
	this.skewX = null;
	this.skewY = null;
	//  Affine transforms from the user
	this.transform = null;
	this.absoluteTransform = null;
	//  Some text controls
	this.textJustification = null;
	//  Maintain a particular ratio between width and height - basically whatever
	//  will fit in the parent limits.  If null, no ratio applies.
	this.whRatio = null;
	this.whAlign = null;
	this.whFill = false;
	//  These variables are for "restrictive" redraws.  If a component is set to restrictive
	//  redraw, it will only redraw when explicitly told to do so or when its size changes.
	this.restrictiveRedraw = false;
	this.restrictiveImage = null;
	this.restLeft = 0;
	this.restRight = 0;
	this.restTop = 0;
	this.restBottom = 0;
	this.redrawAnyway = true;
	this.saveDrawX = null;
	this.saveDrawY = null;
	this.saveDrawW = null;
	this.saveDrawH = null;
	//  This flag is used to draw components that have negative size.  By default such
	//  items will not draw.  The "sizeOK" is used internally by resize to check whether
	//  the component has a negative size.
	this.drawNegative = false;
	this._sizeOK = true;
	//  Used to list overlay items that "belong" to this component or its children.
	//  This has to be explicitly defined (by "keepOverlayList()"), otherwise it is
	//  essentially ignored.
	this.overlayList = null;
	//  A component can hold its own overlay.  Generally they don't do this, but under
	//  some circumstances (for instance torn-off components) this is required.
	this.localOverlay = null;
	//  Used for diagnostic messages.  Set to a string, or whatever, in a component
	//  you are testing, then add this sort of code in this code:
	//  if ( this.diagnostic !== null )
	//      console.info( "here it is " + this.diagnostic );
	this.diagnostic = null;
	//  Can be used to "force" a width and height to be a fraction, even when they are
	//  larger than 1.  Used in "resizeToo()".
	this.widthFractional = false;
	this.heightFractional = false;
	//  Identity matrix so this event is not transformed by default
	this.drawnTransform = null;
	//  This is used to store the inverse transform of this object.
	this.invT = null;
	//  Use the Nixie font for text of this component.
	this.useNixieFont = false;
};

//  These are used (possibly) by inheriting components to determine whether a callback
//  should be done or not.  These things can be or'd together.  I'm adding to this list
//  as child components require it.  
var NOTHING            = 0;
var ON_ENTER           = 1;
var ON_CHANGE          = 2;
var ON_MOUSE_WHEEL     = 4;
var ON_ARROW_KEY       = 8;
var ON_CLICK           = 16;
var ON_LEAVE           = 32;
var ON_PUSH            = 64;
var ON_RELEASE         = 128;
var ON_FOCUS           = 256;
var ON_LOSTFOCUS       = 512;

//  Function to set when callbacks should be done.
Component.prototype.setCallbackWhen = function( newVal ) {
	this.callbackWhen = newVal; 
};

//  Add the callback criteria to whatever exists.
Component.prototype.addCallbackWhen = function( newVal ) {
	this.callbackWhen = newVal | this.callbackWhen;
};

//  Set the callback function.  You can set it to null to cancel the callback.
Component.prototype.setCallback = function( newCallback, callbackComponent, callbackDelay, callbackArg ) {
	this.callback = newCallback;
	if ( callbackComponent === undefined )
		this.callbackComponent = null;
	else
		this.callbackComponent = callbackComponent;
	if ( callbackDelay === undefined )
		this.callbackDelay = null;
	else
		this.callbackDelay = callbackDelay;
	if ( callbackArg === undefined )
		this.callbackArg = null;
	else
		this.callbackArg = callbackArg;
};

//  Trigger the callback.  If its null, don't do anything.  If there is a delay, cancel any
//  previous delay and set a timeout for triggering a timeout after the delay amount.  The
//  optional argument "when" can be used to trigger the callback (or not) on specific types
//  of events or activities based on user settings (see "callbackWhen" above).
Component.prototype.doCallback = function( when, event ) {
	if ( when !== undefined && when !== null ) {//&& this.callbackWhen !== 0 ) {  made this change 3/8/24, not sure of effects yet
		if ( !( when & this.callbackWhen ) )
			return false;
	}
	if ( this.callbackDelay ) {
		clearTimeout( this.callbackTimeoutID );
		var callbackStuff = {};
		callbackStuff.this = this;
		callbackStuff.when = when;
		callbackStuff.event = event;
		callbackStuff.arg = this.callbackArg;
		this.callbackTimeoutID = setTimeout( this.triggerCallback, this.callbackDelay, callbackStuff );
	}
	else {
		if ( this.callback !== null ) {
			var callbackStuff = {};
			callbackStuff.this = this;
			callbackStuff.when = when;
			callbackStuff.event = event;
			callbackStuff.arg = this.callbackArg;
			this.callback( this.callbackComponent, callbackStuff );
		}
	}
	return true;
};

//  Explicitly trigger a callback. 
Component.prototype.triggerCallback = function( callbackStuff ) {
	var theThis = callbackStuff.this;
	if ( theThis === undefined || theThis === null )
		theThis = this;
	if ( theThis.callback !== undefined && theThis.callback !== null )
		theThis.callback( theThis.callbackComponent, callbackStuff );
};

//  Change the "drawing" this component belongs to.  This is a recursive call,
//  in that it changes all child components as well.  It should not be used casually. 
Component.prototype.setDrawing = function( newDrawing ) {
	this.drawing = newDrawing;
	var child = this.children;
	while( child !== null ) {
		child.setDrawing( newDrawing );
		child = child.next;
	}
} 

//  These functions are used to redraw the current drawing.  In general you should
//  use "doRedraw()" inside events, as that function will avoid spurious draw
//  activities.
Component.prototype.doRedraw = function() {
	this.redrawAnyway = true;
	if ( this.drawing !== null )
		this.drawing.doRedraw();
};

//  The redrawNow() function acts immediately.  This is unlike doRedraw().
Component.prototype.redrawNow = function() {
	if ( this.drawing !== null )
		this.drawing.redraw();
}

//  Turn on a "shadow" for this component.  All settings (other than on/off) are
//  optional - defaults will be used (but only if the values haven't already been
//  set!).
Component.prototype.setShadow = function( on, color, blur, xoff, yoff ) {
	this.hasShadow = on;
	if ( color !== undefined )
		this.shadowColor = color;
	else if ( this.shadowColor === null )
		this.shadowColor = rgb( 0, 0, 0 );
	if ( blur !== undefined )
		this.shadowBlur = blur;
	else if ( this.shadowBlur === null )
		this.shadowBlur = 20;
	if ( xoff !== undefined )
		this.shadowX = xoff;
	else if ( this.shadowX === null )
		this.shadowX = 5;
	if ( yoff !== undefined )
		this.shadowY = yoff;
	else if ( this.shadowY === null )
		this.shadowY = 5;
};

//-----------------------------------------------------------------------------
//  Set the scale of this component.  Scales are multiplied into an overall
//  scale that may have been influenced by ancestor components.  They are not
//  absolute.
//-----------------------------------------------------------------------------
Component.prototype.setScale = function( newVal ) {
	//  If ptx and pty are defined, we will "zoom" to/from that location.
	//  This is where we actually set the scale.  The "resizeToo()" call is necessary
	//  to implement the change (and change "true" values that we use below).
	this.scale = newVal;
}

//--------------------------------
//  Change the X and Y scales independently. 
//  Don't combine these scales with those above!
//------
Component.prototype.setXYScale = function( newX, newY ) {
	this.scaleX = newX;
	this.scaleY = newY;
}

//--------------------------------
//  Return the current scale of a component.
//------
Component.prototype.getScale = function() {
	if ( this.scale === null )
		return 1.0;
	return this.scale;
}

//--------------------------------
//  Set the rotation of this object.  It will rotate about the origin.  The rotation is applied to the
//  affine transformation matrix.  Rotations are measured in radians.
//------
Component.prototype.setRotate = function( r ) {
	this.rotate = r;
	this.sinRotate = Math.sin( r );
	this.cosRotate = Math.cos( r );
}

//--------------------------------
//  Return the rotation of this component (in radians).  This is slightly bogus because a null rotation
//  triggers a 0.0 return.
//------
Component.prototype.getRotate = function() {
	if ( this.rotate === null )
		return 0.0;
	return this.rotate;
}

//--------------------------------
//  Change the x and y skew factors.  Applied to the affine transform.
//------
Component.prototype.setSkew = function( x, y ) {
	this.skewX = x;
	this.skewY = y;
}

//--------------------------------
//  Add an affine transform for this component.
//------
Component.prototype.setTransform = function( a, b, c, d, e, f ) {
	if ( a === null )
		this.transform = null;
	else {
		this.transform = {};
		this.transform.a = a;
		this.transform.b = b;
		this.transform.c = c;
		this.transform.d = d;
		this.transform.e = e;
		this.transform.f = f;
	}
}

//--------------------------------
//  Override the affine transform for this component.
//------
Component.prototype.setAbsoluteTransform = function( a, b, c, d, e, f ) {
	if ( a === null )
		this.absoluteTransform = null;
	else {
		this.absoluteTransform = {};
		this.absoluteTransform.a = a;
		this.absoluteTransform.b = b;
		this.absoluteTransform.c = c;
		this.absoluteTransform.d = d;
		this.absoluteTransform.e = e;
		this.absoluteTransform.f = f;
	}
}

//  Set "noLabel".  This causes a label, if it exists, to NOT be drawn.  By default
//  if you set a label, an attempt will be made to draw it.
Component.prototype.setNoLabel = function( newVal ) {
	this.noLabel = newVal;
};

//  Change the label.  If the label is a string, it will be drawn as text using current
//  font and alignment settings.  If it is a component, it will be drawn as a component
//  (this component's settings will apply to it).
Component.prototype.setLabel = function( newVal ) {
	this.label = newVal;
};

//  Some functions to anticipate what the user will use to change the label.
Component.prototype.setText = function( newVal ) {
	this.label = newVal;
};

//  another way to get the label.
Component.prototype.getText = function() {
	return this.label;
};

//  Set the name.  The name is supposed to be a unique string used to identify the
//  component.
Component.prototype.setName = function( newVal ) {
	this.name = newVal;
};

//  Return the current name.
Component.prototype.getName = function() {
	return this.name;
};

//  Find the child that has the given name, if one exists.  This will find the first
//  child encountered that has this name - names are assumed to be unique, however
//  there are no requirements that they be so.
Component.prototype.findChildByName = function( val ) {
	if ( this.children === null )
		return null;
	var child = this.children;
	while( child !== null ) {
		if ( val === child.getName() )
			return child;
		var ret = child.findChildByName( val );
		if ( ret !== null )
			return ret;
		child = child.next;
	}
	return null;
};

//  Set the background - this is a component that will be drawn "behind" anything
//  specific to this Component.
Component.prototype.setBackground = function( newcomp ) {
	this.background = newcomp;
	if ( this.background !== null )
		this.background.parent = this;
};

//  Return the background component.  This may be null.
Component.prototype.getBackground = function() {
	return this.background;
};

//  Set the foreground - this is a component that will be drawn "on top" of anything
//  specific to this Component.
Component.prototype.setForeground = function( newcomp ) {
	this.foreground = newcomp;
	if ( this.foreground !== null )
		this.foreground.parent = this;
};

//  Return the foreground component.  This may be null.
Component.prototype.getForeground = function() {
	return this.foreground;
};

//--------------------------------
//  Return the total number of children of this component.
//------
Component.prototype.numChildren = function() {
	if ( this.children === null )
		return 0;
	var num = 0;
	var child = this.children;
	while( child !== null ) {
		++num;
		child = child.next;
	}
	return num;

}

//  Add a component to the top of this list of components (it will be drawn
//  first).
Component.prototype.addFirst = function( newChild ) {
	if ( this.children === null )
		this.lastChild = newChild;
	newChild.next = this.children;
	this.children = newChild;
	newChild.parent = this;
	newChild.setDrawing( this.drawing );
	this.setPhysicalChange( true );
}

//  Adds a component to the children of this component.  Don't override this!
Component.prototype.addTo = function( newChild ) {
	if ( this.children === null )
		this.children = newChild;
	else
		this.lastChild.next = newChild;
	newChild.parent = this;
	newChild.previous = this.lastChild;
	this.lastChild = newChild;
	newChild.setDrawing( this.drawing );
	this.setPhysicalChange( true );  // see this function to find out what this is about!
};

//  Adds a component to the children of this component.  This version of the
//  function just calls "addTo()", but it allows an override if the user wants
//  to make something different.
Component.prototype.add = function( newChild ) {
	this.addTo( newChild );
};

//  Add an overlay component.  This can be done directly (by calling the function
//  with no class - i.e. "addOverlay()") but by doing it here we can track all 
//  overlay items that are part of this component or its children (or, of a parent
//  of this component).  
Component.prototype.addOverlay = function( newChild ) {
	if ( this.localOverlay !== null ) {
		console.info( "adding to overlay " + this.localOverlay.name );
		this.localOverlay.add( newChild );
	}
	else
		addOverlay( newChild );
	//  "Capture" this component in the first overlay list we find within its
	//  parental tree (going up).  We may well not find one!
	var testComponent = this;
	var listed = false;
	while ( testComponent !== null && testComponent !== undefined && !listed ) {
		if ( testComponent.overlayList !== null ) {
			testComponent.overlayList.push( newChild );
			listed = true;
		}
		testComponent = testComponent.getParent();
	}
}

//  Set a local overlay.  If this is set to something other than null, it will be
//  used as the overlay for any child below this component.
Component.prototype.setLocalOverlay = function( newOverlay ) {
	this.localOverlay = newOverlay;
}

//  Trigger this component to keep an overlay list.  This will track everything
//  added to the overlay by this component or its children.
Component.prototype.keepOverlayList = function() {
	this.overlayList = [];
}

//  Set the overlay list.  This is used by the "addTo" function.  You probably
//  don't want to mess around with it.
Component.prototype.setOverlayList = function( newList ) {
	this.overlayList = newList;
}

//  Obtain the overlay list.
Component.prototype.getOverlayList = function() {
	return this.overlayList;
}

//  Remove a specified child from the children list.  This is harmless if the
//  child isn't there.
Component.prototype.removeFrom = function( oldChild ) {
	if ( this.children === null )
		return;
	var child = this.children;
	while ( child !== null ) {
		if ( child === oldChild ) { //  found it!
			//  Maybe this is the first child in the list
			if ( child === this.children )
				this.children = child.next;
			else if ( child.previous !== null )
				child.previous.next = child.next;
			//  Maybe it is the last.
			if ( child === this.lastChild )
				this.lastChild = child.previous;
			else if ( child.next !== null )
				child.next.previous = child.previous;
			//  Make sure the removed child doesn't think it is still in the list.
			child.next = null;
			child.previous = null;
			child.parent = null;
			this.setPhysicalChange( true );
			return;
		}
		child = child.next;
	}
};

//  Call the function to remove a child.  This is analogous to "add", allowing an
//  override without requiring a rewrite of all of the "removeFrom()" functionality.
Component.prototype.remove = function( oldChild ) {
	this.removeFrom( oldChild );
};

//  Move a child "earlier" in the child list.  This will do nothing if the child
//  is at the beginning of the list already or if it doesn't exist.  True is returned
//  if the operation actually did something, false if it did nothing (reason for doing
//  nothing is not specified).  "Ealier" children are drawn before later ones.
Component.prototype.moveChildEarlier = function( oldChild ) {
	if ( this.children === null )
		return false;  // no children at all
	var child = this.children;
	while ( child !== null ) {
		if ( child === oldChild ) { //  found it!
		 	//  Maybe this is the first child in the list
			if ( child.previous === null )
				return false;  // can't move it earlier
		 	var saveNext = child.next;
			var savePrevious = child.previous;
			child.next = child.previous;
			child.previous = child.previous.previous;
			child.next.previous = child;
			if ( child.previous !== null )
				child.previous.next  = child;
		    //  Maybe it started as the last child.
			if ( child === this.lastChild ) {
				this.lastChild = child.next;
				this.lastChild.next = null;
			}
			else {
				savePrevious.next = saveNext;
				saveNext.previous = savePrevious;
			}
			//  See if it is now the first.
			if ( savePrevious === this.children ) {
				this.children = child; 
			}
			 this.setPhysicalChange( true );
		 	return true;
		}
		child = child.next;
	}
	return false;  // specified child not found
}

//-------------------------------------
//  Move a child to the start of the child list.
//------
Component.prototype.moveChildToStart = function( oldChild ) {
	if ( this.children === null )
		return false;  // no children at all
	var child = this.children;
	while ( child !== null ) {
		if ( child === oldChild ) { //  found it!
			//  If this is the first child in the list we can't move it any earlier.
			if ( child === this.children )
				return false;
			var saveNext = child.next;
			var savePrevious = child.previous;
			savePrevious.next = saveNext;
			//  Maybe started as the last child in the list - if so, it no longer is!
			if ( child === this.lastChild )
				this.lastChild = savePrevious;
			//  If it wasn't last, this will work.
			else
				saveNext.previous = savePrevious;
			//  Now make it first.
			this.children.previous = child;
			child.previous = null;
			child.next = this.children;
			this.children = child;
			this.setPhysicalChange( true );
			return true;
		}
		child = child.next;
	}
	return false;  // specified child not found
}

//  Move a child "later" in the child list, causing it to be drawn on top of whatever
//  is "earlier".  If the child doesn't actually exist or is already the last child in
//  the list false is returned, otherwise if something is actually done true is returned.
Component.prototype.moveChildLater = function( oldChild ) {
	if ( this.children === null )
		return false;  // no children at all
	var child = this.children;
	while ( child !== null ) {
		if ( child === oldChild ) { //  found it!
			//  If this is the last child in the list we can't move it any later.
			if ( child === this.lastChild || child.next === null )
				return false;
			var saveNext = child.next;
			var savePrevious = child.previous;
			child.next = child.next.next;
			child.previous = saveNext;
			saveNext.previous = savePrevious;
			saveNext.next = child;
			//  Maybe this is the first child in the list - if so, it no longer is!
			if ( child === this.children )
				this.children = saveNext;
			//  If it wasn't first, this will work.
			else
				savePrevious.next = saveNext;
			//  Maybe it is now last.
			if ( child.next === null )
				this.lastChild = child;
			else
				child.next.previous = child;
			this.setPhysicalChange( true );
			return true;
		}
		child = child.next;
	}
	return false;  // specified child not found
}

//-------------------------------------
//  Move a child to the end of the child list.
//------
Component.prototype.moveChildToEnd = function( oldChild ) {
	if ( this.children === null )
		return false;  // no children at all
	var child = this.children;
	while ( child !== null ) {
		if ( child === oldChild ) { //  found it!
			//  If this is the last child in the list we can't move it any later.
			if ( child === this.lastChild || child.next === null )
				return false;
			var saveNext = child.next;
			var savePrevious = child.previous;
			saveNext.previous = savePrevious;
			//  Maybe this is the first child in the list - if so, it no longer is!
			if ( child === this.children )
				this.children = saveNext;
			//  If it wasn't first, this will work.
			else
				savePrevious.next = saveNext;
			//  Now make it last.
			this.lastChild.next = child;
			child.next = null;
			child.previous = this.lastChild;
			this.lastChild = child;
			this.setPhysicalChange( true );
			return true;
		}
		child = child.next;
	}
	return false;  // specified child not found
}

//  This is a "safe" way to remove a child.  It flags children for removal, and
//  causes the parental hierarchy to know descendents need removal.  A check is
//  made prior to drawing for any removal flags.  Use this if you are looping
//  through children or something - so you don't change the child list!
Component.prototype.removeChild = function( oldChild ) {
	this.removeChildren.push( oldChild );
	this.informParentOfRemoval();
	this.setPhysicalChange( true );
}

//  Tell the parent of this object that its child (this) has removed
//  descendents.  This is a recursive process.
Component.prototype.informParentOfRemoval = function() {
	if ( this.parent !== null ) {
		this.parent.removeDescendents.push( this );
		this.parent.informParentOfRemoval();
	}
}

//  Is the given component a child?  
Component.prototype.isChild = function( testChild ) {
	if ( this.children === null )
		return false;
	var child = this.children;
	while ( child !== null ) {
		if ( child === testChild )
			return true;
		child = child.next;
	}
	return false;
};

//  Return the parent.  Might be null!
Component.prototype.getParent = function() {
	return this.parent;
};

//--------------------------------
//  Set the physical change flag to true or false.  Setting it to false makes
//  a change only to the local variable, setting it to true will trigger parents
//  to make the same change (to true).  This is a way of indicating to parents
//  that "something has changed" in this component that requires figuring out
//  something (this was developed so that browsers would respond to open/close
//  operations by recomputing their size).  Note that this is in addition to a
//  redraw.
//------
Component.prototype.setPhysicalChange = function( newVal ) {
	this.physicalChange = newVal;
	if ( this.physicalChange && this.parent !== null )
		this.parent.setPhysicalChange( true );
}

//  Remove all children of this component.  We have to dismantle the complete
//  linked list, as reusing these children elsewhere could cause problems.
Component.prototype.clear = function() {
	if ( this.children !== null ) {
		var child = this.children;
		while ( child !== null ) {
			child.previous = null;
			child.parent = null;
			tchild = child.next;
			child.next = null;
			child = tchild;
		}
	}
	this.children = null;
	this.lastChild = null;
	this.setPhysicalChange( true );
};

//  All components can be "drawn", although at this level the draw function
//  doesn't actually do anything.  It is meant to be overridden.
Component.prototype.draw = function( ins ) {
};

//  This allows inheriting components to "do things" prior to drawing.  The purpose
//  of this (mostly) is to give base classes the chance to do some drawing or make
//  some settings that inheriting classes all have in common.
Component.prototype.predraw = function( ins ) {
};

//  Paired with the above function.
Component.prototype.postdraw = function( ins ) {
};

//  Allow inheriting functions to do things with each draw instruction that happen
//  before settings.
Component.prototype.preSettings = function( ins ) {
};

//  Mirror of the above function.
Component.prototype.postSettings = function( ins ) {
};

//  See if any descendents are flagged for removal before we draw them.
Component.prototype.testRemovals = function() {
	//  Get rid of children first.  We also test the background and foreground.
	if ( this.removeChildren.length > 0 ) {
		for ( var i = 0; i < this.removeChildren.length; ++i )
			this.remove( this.removeChildren[i] );
		this.removeChildren = [];
	}
	//  Then check any children for removals.  Note that because of the above,
	//  they may be gone!
	if ( this.removeDescendents.length > 0 ) {
		for ( var i = 0; i < this.removeDescendents.length; ++i )
			this.removeDescendents[i].testRemovals();
		//  Clear the list of things to remove.
		this.removeDescendents = [];
	}
}

//  Change the value of "restrictive" redraw.  There are four optional "buffers" that can
//  be included with this function call.  The restrictive redraw captures an image of a
//  drawn component and uses that image to re-render the component when it has not changed.
//  Occasionally components will draw things that are outside their bounds - these buffer
//  amounts can accommodate that.  Use this stuff carefully!!
Component.prototype.setRestrictiveRedraw = function( newVal, left, right, top, bottom ) {
	this.restrictiveRedraw = newVal;
	if ( left !== undefined && left !== null )
		this.restLeft = left;
	else
		this.restLeft = 0;
	if ( right !== undefined && right !== null )
		this.restRight = right;
	else
		this.restRight = 0;
	if ( top !== undefined && top !== null )
		this.restTop = top;
	else
		this.restTop = 0;
	if ( bottom !== undefined && bottom !== null )
		this.restBottom = bottom;
	else
		this.restBottom = 0;
}

//  Allow negative-sized components to be drawn.  By default they are not drawn.
Component.prototype.setDrawNegative = function( newVal ) {
	this.drawNegative = newVal;
}

//  This function causes a "draw" to be called on this component and then
//  calls its counterpart for all children.  This function should NOT be
//  overridden.
Component.prototype.redraw = function( ins ) {
	if ( !this._sizeOK ) return;
	//  If "restrictive" redraw is set, an image of this component (and all
	//  contained children) will be drawn instead of a complete redraw.  This
	//  is meant to save time for components that are complex and time-consuming
	//  to render.
	if ( this.restrictiveRedraw && this.restrictiveImage !== null ) {
		if ( this.redrawAnyway === false ) {
			ins.ctx.drawImage( this.restrictiveImage, -this.restLeft, -this.restTop );
			return;
		}
		this.redrawAnyway = false;
	}
	//  Only actually draw things if the component is visible.
	if ( this.visible ) {
		//  Apply instructions prior to settings.
		this.preSettings( ins );
		//  Change instructions to reflect this object (color, line style, font, whatever)
		this.drawSettings( ins );
		//  A place to stick any instructions that are required prior to drawing.
		this.predraw( ins );
		//  Draw the background, if one is defined.  The background is a component (if it
		//  is anything at all) so it can do whatever you want.  The tricky thing is it must be
		//  translated because it behaves like a child component, then we have to translate
		//  back before drawing THIS component.  The foreground does not share this problem.
		if ( this.background !== null ) {
			if ( ins.gl === null ) {
				let storedTransform = ins.ctx.getTransform();
				ins.ctx.translate( this.drawX, this.drawY );
				this.background.redraw( ins );
				ins.ctx.setTransform( storedTransform );
			}
			else
				this.background.redraw( ins );
		}
		//  Draw this object.  This is where unique drawing is done for inheriting
		//  components.
		this.draw( ins );
		//  Save the current transform of this object.  This can be used to "de-transform" screen
		//  pixel positions to compare them to the positions in this object (for events, etc.).
		if ( ins.gl === null )
			this.drawnTransform = ins.ctx.getTransform();
		this.invT = null;
		//  Offset by the x,y position of this object - as child objects use this as the origin.
		if ( ins.gl === null )
			ins.ctx.translate( this.drawX, this.drawY );
		//  Draw children.
		if ( this.children !== null )
			this.drawChildren( ins );
		//  Draw the foreground, if one is defined.  The foreground is a component - it
		//  will be drawn on top of everything else - sort of an overlay.
		if ( this.foreground !== null ) {
			this.foreground.redraw( ins );
		}
		this.postdraw( ins );
		//  Return instructions to what they were.
		this.returnSettings( ins );
		//  Mirror of the preSettings() function.
		this.postSettings( ins );
	}
	//  Save a complete image of this component if "restrictive" redraw is set.  This
	//  image will be used to re-render the component absent any changes that require
	//  a complete redraw.  Note that because getImageData() is not influenced by the
	//  transformation matrix, we can only gather images that are boxes on the screen,
	//  not skewed or rotated.  We grab the current transformation matrix so at least
	//  we know where this component is.
	if ( this.restrictiveRedraw ) {
		//  Save the image here.
		var trans = ins.ctx.getTransform();
		var imageData = ins.ctx.getImageData( trans.e - this.restLeft, trans.f - this.restTop, 
			this.drawW + this.restLeft + this.restRight, this.drawH + this.restTop + this.restBottom );
		if ( browserType() === SAFARI ) {  // Safari doesn't have createImageBitmap() for some reason.
			Promise.all([this.dataToImage( imageData ), this]).then( function( stuff ) {
				//  Set the image data to the result.
				stuff[1].restrictiveImage = stuff[0];
			}, function( hey ) {
				console.info( "dataToImage() blew up in the ImageRectangle class -- " + hey + "\n" );
			} );
		}
		else {
			Promise.all([createImageBitmap( imageData, 0, 0, imageData.width, imageData.height ), this]).then( function( stuff ) {
				//  Set the image data to the result.
				stuff[1].restrictiveImage = stuff[0];
			}, function( hey ) {
				console.info( "createImageBitmap blew up in the ImageRectangle class -- " + hey + "\n" );
			} );
		}
	}
};

//  Create an Image instance from an ImageData instance.  This is used by Safari browsers in the
//  restrictiveRedraw image capture above.
Component.prototype.dataToImage = function( imagedata ) {
	return new Promise ( function( resolve, reject ) {
		var canvas = document.createElement( 'canvas' );
		var ctx = canvas.getContext( '2d' );
		canvas.width = imagedata.width;
		canvas.height = imagedata.height;
		ctx.putImageData( imagedata, 0, 0 );
		var img = new Image();
		img.onload = function() {
			resolve( img );
		}
		img.onError = function() {
			reject( img );
		}
		img.src = canvas.toDataURL();
	} );
}

//  Callback for the "restrictiveImage" saving process.
Component.prototype.restrictiveImageCB = function() {
	console.info( "set up!" );
}

//  Function to permit an override of how children are drawn.
Component.prototype.drawChildren = function( ins ) {
	var child = this.children;
	while ( child !== null ) {
		child.redraw( ins );
		child = child.next;
	}
}

//  Set whether this component is visible or not.
Component.prototype.setVisible = function( newVal ) {
	this.visible = newVal;
	if ( this.alwaysVisible !== undefined && this.alwaysVisible === true )
		this.visible = true;
};
Component.prototype.getVisible = function() {
	return this.visible;
};

//  This can be used to "force" a component to be visible, even when it is made invisible.
//  Note, this will ONLY apply to a component made visible/invisible - if a parent is invisible,
//  the component will also be invisible.
Component.prototype.forceVisible = function( newVal ) {
	this.alwaysVisible = newVal;
}

//  Paint is a little funny - there are two types, one for "strokes" and another for
//  "fills".  One can set these using the named functions, or one can use the "setForegroundPaint()"
//  and "setBackgroundPaint()" functions (more Fltk-like) to set these two values.
Component.prototype.setStrokePaint = function( newPaint ) {
	this.strokePaint = newPaint;
};
Component.prototype.setFillPaint = function( newPaint ) {
	this.fillPaint = newPaint;
};
Component.prototype.setFontStrokePaint = function( newPaint ) {
	this.fontStrokePaint = newPaint;
};
Component.prototype.setFontFillPaint = function( newPaint ) {
	this.fontFillPaint = newPaint;
};
Component.prototype.setInactiveFontStrokePaint = function( newPaint ) {
	this.inactiveFontStrokePaint = newPaint;
};
Component.prototype.setInactiveFontFillPaint = function( newPaint ) {
	this.inactiveFontFillPaint = newPaint;
};
Component.prototype.setForegroundPaint = function( newPaint ) {
	this.strokePaint = newPaint;
};
Component.prototype.setBackgroundPaint = function( newPaint ) {
	this.fillPaint = newPaint;
};
//  These are "get" functions for paint.
Component.prototype.getStrokePaint = function() {
	return this.strokePaint;
};
Component.prototype.getFillPaint = function() {
	return this.fillPaint;
};
Component.prototype.getFontStrokePaint = function() {
	return this.fontStrokePaint;
};
Component.prototype.getFontFillPaint = function() {
	return this.fontFillPaint;
};
Component.prototype.getInactiveFontStrokePaint = function() {
	return this.inactiveFontStrokePaint;
};
Component.prototype.getInactiveFontFillPaint = function() {
	return this.inactiveFontFillPaint;
};
Component.prototype.getForegroundPaint = function() {
	return this.strokePaint;
};
Component.prototype.getBackgroundPaint = function() {
	return this.fillPaint;
};
Component.prototype.setCombinedPaint = function( newPaint ) {
	//  Bail if the paint is not defined.
	if ( newPaint === undefined )
		return;
	if ( newPaint === null ) {
		this.fillPaint = null;
		this.strokePaint = null;
		return;
	}
	//  In the event the paint is a single value instead of a list, use
	//  it for both fill and stroke.
	if ( newPaint[1] === undefined ) {
		this.fillPaint = newPaint;
		this.strokePaint = newPaint;
		return;
	}
	//  This is a normal setting!
	if ( newPaint[0] !== null )
		this.fillPaint = newPaint[0];
	if ( newPaint[1] !== null )
		this.strokePaint = newPaint[1];
}
Component.prototype.setCombinedFontPaint = function( newPaint ) {
	//  Bail if the paint is not defined.
	if ( newPaint === undefined )
		return;
	if ( newPaint === null ) {
		this.fontFillPaint = null;
		this.fontStrokePaint = null;
		return;
	}
	//  In the event the paint is a single value instead of a list, use
	//  it for both fill and stroke.
	if ( newPaint[1] === undefined ) {
		this.fontFillPaint = newPaint;
		this.fontStrokePaint = newPaint;
		return;
	}
	//  This is a normal setting!
	if ( newPaint[0] !== null )
		this.fontFillPaint = newPaint[0];
	if ( newPaint[1] !== null )
		this.fontStrokePaint = newPaint[1];
}
Component.prototype.setCombinedInactiveFontPaint = function( newPaint ) {
	//  Bail if the paint is not defined.
	if ( newPaint === undefined )
		return;
	if ( newPaint === null ) {
		this.inactiveFontFillPaint = null;
		this.inactiveFontStrokePaint = null;
		return;
	}
	//  In the event the paint is a single value instead of a list, use
	//  it for both fill and stroke.
	if ( newPaint[1] === undefined ) {
		this.inactiveFontFillPaint = newPaint;
		this.inactiveFontStrokePaint = newPaint;
		return;
	}
	//  This is a normal setting!
	if ( newPaint[0] !== null )
		this.inactiveFontFillPaint = newPaint[0];
	if ( newPaint[1] !== null )
		this.inactiveFontStrokePaint = newPaint[1];
}
Component.prototype.getCombinedPaint = function() {
	return [this.fillPaint, this.strokePaint];
}
Component.prototype.getCombinedFontPaint = function() {
	return [this.fontFillPaint, this.fontStrokePaint];
}
Component.prototype.getCombinedInactiveFontPaint = function() {
	return [this.inactiveFontFillPaint, this.inactiveFontStrokePaint];
}

Component.prototype.setJustification = function( newVal ) {
	this.textJustification = newVal;
}

Component.prototype.getJustification = function() {
	return this.textJustification;
}

Component.prototype.setAlpha = function( newVal ) {
	this.alpha = newVal;
}
Component.prototype.getAlpha = function() {
	return this.alpha;
}

//  Line width is just a number.
Component.prototype.setLineWidth = function( newwidth ) {
	this.lineWidth = newwidth;
};
Component.prototype.getLineWidth = function() {
	return this.lineWidth;
};

//  Line caps.  Pretty simple stuff.  Predefined values are in JDH.js.
Component.prototype.setLineCap = function( newcap ) {
	this.lineCap = newcap;
};
Component.prototype.getLineCap = function() {
	return this.linecap;
};

//  Line joins are similar.
Component.prototype.setLineJoin = function( newjoin ) {
	this.lineJoin = newjoin;
};
Component.prototype.getLineJoin = function() {
	return this.lineJoin;
};

//  Miter limit applies only to miter line join.
Component.prototype.setMiterLimit = function( newlimit ) {
	this.miterLimit = newlimit;
};
Component.prototype.getMiterLimit = function() {
	return this.miterLimit;
};

//  Line dash is set as an array of integers, as in "[4,2]" or something similar.
//  This defines the number of pixels to alternately draw and not draw.  The pattern
//  will repeat as necessary.
Component.prototype.setLineDash = function( newdash ) {
	this.lineDash = newdash;
};
Component.prototype.getLineDash = function() {
	return this.lineDash;
};

//  The line dash offset specifies how many pixels to step into the current line
//  dash pattern before beginning.
Component.prototype.setLineDashOffset = function( newoffset ) {
	this.lineDashOffset;
};
Component.prototype.getLineDashOffset = function() {
	return this.lineDashOffset;
};

//  Font settings...
Component.prototype.setThisFont = function() {
	//console.info( "set the font\n" );
	this.font = new Font( this.fontFamily, this.fontSize, this.fontBold, this.fontItalic, this.fontOutline, this.fontVariant );
};
Component.prototype.setFontFamily = function( newVal ) {
	this.fontFamily = newVal;
	this.setThisFont();
};
Component.prototype.getFontFamily = function() {
	return this.fontFamily;
};
Component.prototype.setFontSize = function( newVal ) {
	this.fontSize = newVal;
	this.setThisFont();
};
Component.prototype.getFontSize = function() {
	return this.fontSize;
};
Component.prototype.setFontOutline = function( newVal ) {
	this.fontOutline = newVal;
	this.setThisFont();
};
Component.prototype.getFontOutline = function() {
	return this.fontOutline;
};
Component.prototype.setFontVariant = function( newVal ) {
	this.fontVariant = newVal;
	this.setThisFont();
};
Component.prototype.getFontVariant = function() {
	return this.fontVariant;
};
Component.prototype.setFontItalic = function( newVal ) {
	this.fontItalic = newVal;
	this.setThisFont();
};
Component.prototype.getFontItalic = function() {
	return this.fontItalic;
};
Component.prototype.setFontBold = function( newVal ) {
	this.fontBold = newVal;
	this.setThisFont();
};
Component.prototype.getFontBold = function() {
	return this.fontBold;
};
Component.prototype.setFont = function( newFont ) {
	this.font = newFont;
	if ( newFont === null ) {
		this.fontFamily = null;
		this.fontSize = null;
		this.fontItalic = null;
		this.fontBold = null;
		this.fontOutline = null;
		this.fontVariant = null;
	}
	else {
		this.fontFamily = newFont.family;
		this.fontSize = newFont.size;
		this.fontItalic = newFont.italic;
		this.fontBold = newFont.bold;
		this.fontOutline = newFont.outline;
		this.fontVariant = newFont.variant;
	}
};
Component.prototype.getFont = function() {
	return this.font;
};

//  Turn on/off clipping.  Clipping can be set to "false" or "null", indicating
//  that no clipping should be applied.  It may also be set to "true", indicating
//  clipping should be applied using the defined boundary of this component, or
//  to a complex Path component (in truth, the clipping path can be ANY component,
//  a feature which it might be profitable for some to exploit).  Clipping is
//  applied before drawing a component or its children.
Component.prototype.setClip = function( newVal ) {
	this.clipRegion = newVal;
};

//  Return the current clipping region.
Component.prototype.getClip = function() {
	return this.clipRegion;
};

//  ########  ########     ###    ##      ##     ######  ######## ######## ######## #### ##    ##  ######    ######  
//  ##     ## ##     ##   ## ##   ##  ##  ##    ##    ## ##          ##       ##     ##  ###   ## ##    ##  ##    ## 
//  ##     ## ##     ##  ##   ##  ##  ##  ##    ##       ##          ##       ##     ##  ####  ## ##        ##       
//  ##     ## ########  ##     ## ##  ##  ##     ######  ######      ##       ##     ##  ## ## ## ##   ####  ######  
//  ##     ## ##   ##   ######### ##  ##  ##          ## ##          ##       ##     ##  ##  #### ##    ##        ## 
//  ##     ## ##    ##  ##     ## ##  ##  ##    ##    ## ##          ##       ##     ##  ##   ### ##    ##  ##    ## 
//  ########  ##     ## ##     ##  ###  ###      ######  ########    ##       ##    #### ##    ##  ######    ######  
//
//  This function changes all settings to match anything the user has specified for
//  this component and its children.  This is an internal function meant to be called
//  from "redraw()", and it must be matched by a "returnSettings()" call.  If used
//  outside this context care must be taken!
Component.prototype.drawSettings = function( ins ) {
	//  These are always set - some items (like gradient paint) require them.
	if ( ins.gl === null )
		ins.ctx.save();
	ins.x = this.drawX;
	ins.y = this.drawY;
	ins.w = this.drawW;
	ins.h = this.drawH;
	//  See if any changes are required.  Save the context if so.
	if ( this.strokePaint !== null || this.fillPaint !== null ||
			this.lineWidth !== null || this.lineCap !== null ||
			this.lineJoin !== null || this.lineDash !== null ||
			this.lineDashOffset !== null || this.miterLimit !== null ||
			( this.clipRegion !== null && this.clipRegion !== false ) ||
			this.fontFamily !== null || this.fontSize !== null || 
			this.fontVariant !== null || this.fontItalic !== null || 
			this.fontBold !== null || this.fontOutline !== null ||
			this.fontFillPaint !== null || this.fontStrokePaint !== null ||
			this.inactiveFontFillPaint !== null || this.inactiveFontStrokePaint !== null ||
			this.hasShadow === true || this.deactivated || this.alpha !== null || this.scale !== null ||
			this.scaleX !== null || this.scaleY !== null || this.rotate !== null ||
			this.skewX !== null || this.skewY !== null || this.transform !== null ||
			this.absoluteTransform !== null || this.textJustification !== null ) {
		this.settingsChange = true;
	}
	else
		this.settingsChange = false;
	if ( this.strokePaint !== null )
		ins.ctx.strokeStyle = translatePaint( ins, this.strokePaint );
	if ( this.fillPaint !== null )
		ins.ctx.fillStyle = translatePaint( ins, this.fillPaint );
	if ( this.lineCap !== null )
		ins.ctx.lineCap = lineCapString[ this.lineCap ];
	if ( this.lineJoin !== null )
		ins.ctx.lineJoin = lineJoinString[ this.lineJoin ];
	if ( this.miterLimit !== null )
		ins.ctx.miterLimit = this.miterLimit;
	if ( this.lineDash !== null )
		ins.ctx.lineDash = this.lineDash;
	if ( this.lineWidth !== null )
		ins.ctx.lineWidth = this.lineWidth;
	if ( this.lineDashOffset !== null )
		ins.ctx.lineDashOffset = this.lineDashOffset;
	//  Fonts are kind of a special case, as they have a bunch of settings any one of
	//  which will require the font to be changed.  We want to change those aspects of the
	//  font that this component changes, but keep those that are inherited when we
	//  specify a new font.
	if ( this.fontFamily !== null || this.fontSize !== null || this.fontVariant !== null || 
		 this.fontItalic !== null || this.fontBold !== null || this.fontOutline !== null ||
		 this.fontFillPaint !== null || this.fontStrokePaint !== null ||
		 this.inactiveFontFillPaint !== null || this.inactiveFontStrokePaint !== null ) {
		if ( this.fontFamily !== null ) {
			this.restoreFontFamily = ins.fontFamily;
			ins.fontFamily = this.fontFamily;
		}
		if ( this.fontSize !== null ) {
			this.restoreFontSize = ins.fontSize;
			ins.fontSize = translateNumber( ins, this.fontSize );
		}
		if ( this.fontVariant !== null ) {
			this.restoreFontVariant = ins.fontVariant;
			ins.fontVariant = this.fontVariant;
		}
		if ( this.fontItalic !== null ) {
			this.restoreFontItalic = ins.fontItalic;
			if ( this.fontItalic === true )
				ins.fontItalic = "italic";
			else if ( this.fontItalic === false )
				ins.fontItalic = "normal";
			else
				ins.fontItalic = this.fontItalic;
		}
		if ( this.fontBold !== null ) {
			this.restoreFontBold = ins.fontBold;
			if ( this.fontBold === true )
				ins.fontBold = "bold";
			else if ( this.fontBold === false )
				ins.fontBold = "normal";
			else if ( this.fontBold === "light" )
				ins.fontBold = "lighter";
			else
				ins.fontBold = this.fontBold;
		}
		if ( this.fontOutline !== null ) {
			this.restoreFontOutline = ins.fontOutline;
			ins.fontOutline = this.fontOutline;
		}
		if ( this.fontFillPaint !== null ) {
			this.restoreFontFillPaint = ins.fontFillPaint;
			ins.fontFillPaint = this.fontFillPaint;
		}
		if ( this.fontStrokePaint !== null ) {
			this.restoreFontStrokePaint = ins.fontStrokePaint;
			ins.fontStrokePaint = this.fontStrokePaint;
		}
		if ( this.inactiveFontFillPaint !== null ) {
			this.restoreInactiveFontFillPaint = ins.inactiveFontFillPaint;
			ins.inactiveFontFillPaint = this.inactiveFontFillPaint;
		}
		if ( this.inactiveFontStrokePaint !== null ) {
			this.restoreInactiveFontStrokePaint = ins.inactiveFontStrokePaint;
			ins.inactiveFontStrokePaint = this.inactiveFontStrokePaint;
		}
		//  This is where we actually set the font!
		var fontStr = ins.fontSize + "px " + ins.fontFamily;
		if ( ins.fontBold !== null )
			fontStr = ins.fontBold + " " + fontStr;
		if ( ins.fontVariant !== null )
			fontStr = ins.fontVariant + " " + fontStr;
		if ( ins.fontItalic !== null )
			fontStr = ins.fontItalic + " " + fontStr;
		ins.ctx.font = fontStr;
		//  Justification for text
		if ( this.textJustification !== null ) {
			this.restoreTextJustification = ins.textJustification;
			ins.textJustification = this.textJustification;
		}
	}
	//  This is where we actually change things.
	if ( this.rotate !== null ) {
		ins.ctx.rotate( this.rotate );
	}
	if ( this.skewX !== null ) {
		var mat = ins.ctx.getTransform();
		mat.b = this.skewY;
		mat.c = this.skewX;
		ins.ctx.setTransform( mat.a, mat.b, mat.c, mat.d, mat.e, mat.f );
	}
	if ( this.scale !== null ) {
		ins.ctx.scale( this.scale, this.scale );
	}
	if ( this.scaleX !== null || this.scaleY !== null )
		ins.ctx.scale( this.scaleX, this.scaleY );
	if ( this.transform !== null )
		ins.ctx.transform( this.transform.a, this.transform.b, this.transform.c, 
			               this.transform.d, this.transform.e, this.transform.f );
	if ( this.absoluteTransform !== null )
		ins.ctx.setTransform( this.absoluteTransform.a, this.absoluteTransform.b, this.absoluteTransform.c, 
			                  this.absoluteTransform.d, this.absoluteTransform.e, this.absoluteTransform.f );
	//  Clipping can be set to a complex object (which is simply drawn - whether it
	//  clips or not) or, if set to "true", is applied as the boundary defined by
	//  this components defined limits.
	if ( this.clipRegion === true ) {
		ins.ctx.beginPath();
		ins.ctx.moveTo( this.drawX, this.drawY );
		ins.ctx.lineTo( this.drawX, this.drawY + this.drawH );
		ins.ctx.lineTo( this.drawX + this.drawW, this.drawY + this.drawH );
		ins.ctx.lineTo( this.drawX + this.drawW, this.drawY );
		ins.ctx.closePath();
		ins.ctx.clip();
	}
	//  Shadows - they have a "color" as opposed to a "paint".
	if ( this.hasShadow ) {
		ins.ctx.shadowColor = translatePaint( ins, this.shadowColor );
		ins.ctx.shadowBlur = this.shadowBlur;
		ins.ctx.shadowOffsetX = this.shadowX;
		ins.ctx.shadowOffsetY = this.shadowY;
	}
	if ( this.deactivated ) {
		ins.deactivated = true;
	}
	//  Alpha is combined with the "parent" alpha.  We can trust the "restore()" function
	//  to put it back.
	if ( this.alpha !== null )
		ins.ctx.globalAlpha = ins.ctx.globalAlpha * this.alpha;
};

//  This function sets everything that was changed in "drawSettings()" back to what
//  it was before.  As with "drawSettings()", mess with this only with caution.
Component.prototype.returnSettings = function( ins ) {
	if ( ins.gl === null )
		ins.ctx.restore();
	//  Restore font settings that we changed.
	if ( this.rotate !== null )
		ins.rotate = ins.rotate - this.rotate;
	if ( this.scale !== null )
		ins.scale = ins.scale / this.scale;
	if ( this.fontFamily !== null )
		ins.fontFamily = this.restoreFontFamily;
	if ( this.fontSize !== null )
		ins.fontSize = this.restoreFontSize;
	if ( this.fontVariant !== null )
		ins.fontVariant = this.restoreFontVariant;
	if ( this.fontItalic !== null )
		ins.fontItalic = this.restoreFontItalic;
	if ( this.fontBold !== null )
		ins.fontBold = this.restoreFontBold;
	if ( this.fontOutline !== null )
		ins.fontOutline = this.restoreFontOutline;
	if ( this.fontFillPaint !== null )
		ins.fontFillPaint = this.restoreFontFillPaint;
	if ( this.fontStrokePaint !== null )
		ins.fontStrokePaint = this.restoreFontStrokePaint;
	if ( this.inactiveFontFillPaint !== null )
		ins.inactiveFontFillPaint = this.restoreInactiveFontFillPaint;
	if ( this.inactiveFontStrokePaint !== null )
		ins.inactiveFontStrokePaint = this.restoreInactiveFontStrokePaint;
	if ( this.deactivated ) {
		ins.deactivated = false;
	if ( this.textJustification !== null )
		ins.textJustification = this.restoreTextJustification;
	}
};

//  Turn on (or off) the "inactive" appearance of this object.  If an object is inactive,
//  all fonts will be drawn with "inactive" font paints - which must be explicitly set.
//  This does NOT turn off events!  Use setInactiveEvents() to do that.  You can also use
//  setInactive() to do both at the same time.
Component.prototype.setInactiveText = function( newVal ) {
	this.deactivated = newVal;
}

//  Stop event handling for this component.
Component.prototype.setInactiveEvents = function( newVal ) {
	this.inactiveEvents = newVal;
}

//  Make this object "inactive".  This should change the font.
Component.prototype.setInactive = function( newVal ) {
	this.setInactiveText( newVal );
	this.setInactiveEvents( newVal );
}

//-----------------------------------------------------------------------------
// THIS SHOULD BE A STATIC METHOD
//  Used in a bunch of places in the following function to set the font.
//-----------------------------------------------------------------------------
Component.prototype.formFont = function( size, family, bold, variant, italic ) {
	var fontStr = size + "px " + family;
	if ( bold !== null )
		fontStr = bold + " " + fontStr;
	if ( variant !== null )
		fontStr = variant + " " + fontStr;
	if ( italic !== null )
		fontStr = italic + " " + fontStr;
	return fontStr;
}

//-----------------------------------------------------------------------------
// THIS SHOULD BE A STATIC METHOD
//  This is used internally to parse arguments to formatting instructions in
//  the drawText and measureText functions.
//-----------------------------------------------------------------------------
Component.prototype.parseInstructionArgument = function( text ) {
	var i2 = text.indexOf( ")" );
	if ( text.length > 0 && text[1] === '(' && i2 !== -1 ) {
		return text.slice( 2, i2 );
	}
	else
		return null;
}

//-----------------------------------------------------------------------------
//  This is a function used to draw text using current settings.  It was originally
//  created to implement the "outline" font aspect, but ultimately can be used to
//  make text drawing "generic" - meaning instead of simple text, we can draw objects
//  or whatever.
//-----------------------------------------------------------------------------
Component.prototype.drawText = function( ins, text, x, y ) {
	//  Split the text on the "<@" character combination (if it can be found)
	var splitText = text.split( "<@" );
	if ( splitText.length > 1 ) {
		//  With complex text we may change characteristics of the text that would
		//  propogate to other drawings if we left them in place.  So...if we are just
		//  starting a new complex text string we should save all of these characteristics
		//  such that they can be restored when the string is done.  The purpose of this is
		//  to cover instances where text strings do not properly balance all of their
		//  characteristics changes with "pop" instructions.
		if ( ins.baseText === undefined || ins.baseText === null ) {
			ins.drawTextCount = 0;
			ins.baseText = {};
			ins.baseText.height = 1.2 * ins.fontSize;
			ins.baseText.yOff = 0.0;
			ins.baseText.fontFamily = ins.fontFamily;
			ins.baseText.fontSize = ins.fontSize;
			ins.baseText.fontBold = ins.fontBold;
			ins.baseText.fontVariant = ins.fontVariant;
			ins.baseText.fontItalic = ins.fontItalic;
			ins.baseText.fontOutline = ins.fontOutline;
			ins.baseText.fontFillPaint = ins.fontFillPaint;
			ins.baseText.fontStrokePaint = ins.fontStrokePaint;
			ins.baseText.inactiveFontFillPaint = ins.inactiveFontFillPaint;
			ins.baseText.inactiveFontStrokePaint = ins.inactiveFontStrokePaint;
			ins.baseText.strokeStyle = ins.ctx.strokeStyle;
			ins.baseText.fillStyle = ins.ctx.fillStyle;
			ins.baseText.lineWidth = ins.ctx.lineWidth;
			ins.baseText.font = ins.ctx.font;
			ins.baseText.currYOff = ins.baseText.yOff;
			ins.baseText.currHeight = ins.baseText.height;
			ins.baseText.currFamily = ins.baseText.fontFamily;
			ins.baseText.currBold = ins.baseText.fontBold;
			ins.baseText.currItalic = ins.baseText.fontItalic;
			ins.baseText.currVariant = ins.baseText.fontVariant;
			ins.baseText.currSize = ins.baseText.fontSize;
			ins.baseText.currOutline = ins.fontOutline;
			ins.baseText.currFillPaint = ins.baseText.fontFillPaint;
			ins.baseText.currStrokePaint = ins.baseText.fontStrokePaint;
			ins.baseText.currLineWidth = ins.ctx.lineWidth;
			ins.baseText.currStrikePaint = ins.fontStrokePaint;
			ins.baseText.currUnderlinePaint = ins.fontStrokePaint;
			ins.baseText.sizeStack = [];
			ins.baseText.lineWidthStack = [];
			ins.baseText.heightStack = [];
			ins.baseText.yOffStack = [];
			ins.baseText.outlineStack = [];
			ins.baseText.fontFamilyStack = [];
			ins.baseText.fillPaintStack = [];
			ins.baseText.strokePaintStack = [];
			ins.baseText.strikePaintStack = [];
			ins.baseText.underlinePaintStack = []
			ins.baseText.strikeOut = false;
			ins.baseText.underline = false;
			ins.baseText.x = x;
			ins.baseText.drawCounter = 0;
			if ( this.textData !== undefined && this.textData !== null ) {
				if ( this.textJustification === RIGHT || this.textJustification === CENTER ) {
					ins.baseText.lineWidths = this.textData.lineWidths;
					if ( this.textJustification === RIGHT )
						x = ins.baseText.x - ins.baseText.lineWidths[0];
					else if ( this.textJustification === CENTER )
						x = ins.baseText.x - ins.baseText.lineWidths[0] / 2.0;
					ins.baseText.lineCount = 1;
				}
			}
		}
		//  The leading piece of text should be drawn unchanged.  If the text string starts
		//  with an instruction this may well be zero-length.
		this.drawText( ins, splitText[0], x, y + ins.baseText.currYOff );	
		x += this.measureText( ins, splitText[0] ).width;
		for ( var i = 1; i < splitText.length; ++i ) {
			//  Switch on the first character - it will tell us what to do.
			if ( splitText[i].length > 0 ) {
				++ins.drawTextCount;
				switch( splitText[i][0] ) {
					case 'n':              // newline
						ret = this.measureText( ins, splitText[i].substring( 1 ) );
						y = y + ins.baseText.currHeight;
						//  Employ justification.  We check that the data are available - they
						//  should be if measText() was called before this call.
						if ( this.textData !== undefined && this.textData !== null ) {
							if ( this.textJustification === RIGHT ) {
								x = ins.baseText.x - ins.baseText.lineWidths[ins.baseText.lineCount];
								++ins.baseText.lineCount;
							}
							else if ( this.textJustification === CENTER ) {
								x = ins.baseText.x - ins.baseText.lineWidths[ins.baseText.lineCount] / 2.0;
								++ins.baseText.lineCount;
							}
							else
								x = ins.baseText.x;
						}
						else
							x = ins.baseText.x;
						this.drawText( ins, splitText[i].substring( 1 ), x, y + ins.baseText.currYOff );
						x += ret.width;
						break;
					case 'h':              // line spacing ("height") either in pixels or as a factor of the font size
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var ret = splitText[i].slice( 2, i2 );
							ins.baseText.heightStack.push( ins.baseText.currHeight );
							if ( ret.indexOf( "." ) === -1 )
								ins.baseText.currHeight = parseFloat( ret );
							else
								ins.baseText.currHeight = parseFloat( ret ) * ins.baseText.currSize;
						}
						else {
							ins.baseText.currHeight = ins.baseText.heightStack.pop();
							i2 = 0;
						}
						this.drawText( ins, splitText[i].substring( i2 + 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( i2 + 1 ) ).width;
						break;
					case 'y':              // y offset
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var ret = splitText[i].slice( 2, i2 );
							ins.baseText.yOffStack.push( ins.baseText.currYOff );
							if ( ret.indexOf( "." ) === -1 )
								ins.baseText.currYOff = parseFloat( ret );
							else
								ins.baseText.currYOff = parseFloat( ret ) * ins.baseText.currSize;
						}
						else {
							ins.baseText.currYOff = ins.baseText.yOffStack.pop();
							i2 = 0;
						}
						this.drawText( ins, splitText[i].substring( i2 + 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( i2 + 1 ) ).width;
						break;
					case 'b':              // switch on/off bold (if available for this font)
						if ( ins.baseText.currBold === "bold" )
							ins.baseText.currBold = "normal";
						else if ( ins.baseText.currBold === null || ins.baseText.currBold === "normal" )
							ins.baseText.currBold = "bold";
						ins.ctx.font = this.formFont( ins.baseText.currSize, ins.baseText.currFamily, ins.baseText.currBold, 
							ins.baseText.currVariant, ins.baseText.currItalic );
						this.drawText( ins, splitText[i].substring( 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( 1 ) ).width;
						break;
					case 'l':              // switch on/off lighter type (if available for this font)
						if ( ins.baseText.currBold === "lighter" )
							ins.baseText.currBold = "normal";
						else if ( ins.baseText.currBold === null || ins.baseText.currBold === "normal" )
							ins.baseText.currBold = "lighter";
						ins.ctx.font = this.formFont( ins.baseText.currSize, ins.baseText.currFamily, ins.baseText.currBold, 
							ins.baseText.currVariant, ins.baseText.currItalic );
						this.drawText( ins, splitText[i].substring( 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( 1 ) ).width;
						break;
					case 'o':              // set the outline mode, which can be "outline", "both" or "none"
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var ret = splitText[i].slice( 2, i2 );
							ins.baseText.outlineStack.push( ins.baseText.currOutline );
							ret = ret.toLowerCase();
							if ( ret.includes( "outline" ) )
								ins.baseText.currOutline = "outline";
							else if ( ret.includes( "both" ) )
								ins.baseText.currOutline = "both";
							else
								ins.baseText.currOutline = null;
						}
						else {
							ins.baseText.currOutline = ins.baseText.outlineStack.pop();
							i2 = 0;
						}
						ins.fontOutline = ins.baseText.currOutline;
						this.drawText( ins, splitText[i].substring( i2 + 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( i2 + 1 ) ).width;
						break;
					case 'i':              // switch on/off italic (if available for this font)
						if ( ins.baseText.currItalic === "italic" )
							ins.baseText.currItalic = "normal";
						else
							ins.baseText.currItalic = "italic";
						ins.ctx.font = this.formFont( ins.baseText.currSize, ins.baseText.currFamily, ins.baseText.currBold, 
							ins.baseText.currVariant, ins.baseText.currItalic );
						this.drawText( ins, splitText[i].substring( 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( 1 ) ).width;
						break;
					case 's':             //  font size
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var ret = splitText[i].slice( 2, i2 );
							ins.baseText.sizeStack.push( ins.baseText.currSize );
							if ( ret.indexOf( "." ) === -1 )
								ins.baseText.currSize = parseFloat( ret );
							else
								ins.baseText.currSize = parseFloat( ret ) * ins.baseText.currSize;
						}
						else {
							ins.baseText.currSize = ins.baseText.sizeStack.pop();
							i2 = 0;
						}
						ins.ctx.font = this.formFont( ins.baseText.currSize, ins.baseText.currFamily, ins.baseText.currBold, 
							ins.baseText.currVariant, ins.baseText.currItalic );
						this.drawText( ins, splitText[i].substring( i2 + 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( i2 + 1 ) ).width;
						break;
					case 'f':              // "font" or font family
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var ret = splitText[i].slice( 2, i2 );
							ins.baseText.fontFamilyStack.push( ins.baseText.currFamily );
							ins.baseText.currFamily = ret;
						}
						else {
							ins.baseText.currFamily = ins.baseText.fontFamilyStack.pop();
							i2 = 0;
						}
						ins.ctx.font = this.formFont( ins.baseText.currSize, ins.baseText.currFamily, ins.baseText.currBold, 
							ins.baseText.currVariant, ins.baseText.currItalic );
						this.drawText( ins, splitText[i].substring( i2 + 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( i2 + 1 ) ).width;
						break;
					case 'p':              // apply paint to following text (this is the fill paint)
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							//  Ickier locating of end paren because string argument can contain them.
							var notFound = true;
							i2 = 2;
							var balance = 0;
							while ( i2 < splitText[i].length && notFound ) {
								if ( splitText[i][i2] === ")" ) {
									if ( balance === 0 )
										notFound = false;
									else
										--balance;
								}
								else if ( splitText[i][i2] === "(" )
									++balance;
								if ( notFound )
									++i2;
							}
							var ret = splitText[i].slice( 2, i2 );
							ins.baseText.fillPaintStack.push( ins.baseText.currFillPaint );
							ins.baseText.currFillPaint = eval( ret );
						}
						else {
							ins.baseText.currFillPaint = ins.baseText.fillPaintStack.pop();
							i2 = 0;
						}
						ins.fontFillPaint = ins.baseText.currFillPaint;
						this.drawText( ins, splitText[i].substring( i2 + 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( i2 + 1 ) ).width;
						break;
					case 'k':              // paint of outlines
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							//  Ickier locating of end paren because string argument can contain them.
							var notFound = true;
							i2 = 2;
							var balance = 0;
							while ( i2 < splitText[i].length && notFound ) {
								if ( splitText[i][i2] === ")" ) {
									if ( balance === 0 )
										notFound = false;
									else
										--balance;
								}
								else if ( splitText[i][i2] === "(" )
									++balance;
								if ( notFound )
									++i2;
							}
							var ret = splitText[i].slice( 2, i2 );
							ins.baseText.strokePaintStack.push( ins.baseText.currStrokePaint );
							ins.baseText.currStrokePaint = eval( ret );
						}
						else {
							ins.baseText.currStrokePaint = ins.baseText.strokePaintStack.pop();
							i2 = 0;
						}
						ins.fontStrokePaint = ins.baseText.currStrokePaint;
						this.drawText( ins, splitText[i].substring( i2 + 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( i2 + 1 ) ).width;
						break;
					case 'u':              // underline paint
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							//  Ickier locating of end paren because string argument can contain them.
							var notFound = true;
							i2 = 2;
							var balance = 0;
							while ( i2 < splitText[i].length && notFound ) {
								if ( splitText[i][i2] === ")" ) {
									if ( balance === 0 )
										notFound = false;
									else
										--balance;
								}
								else if ( splitText[i][i2] === "(" )
									++balance;
								if ( notFound )
									++i2;
							}
							var ret = splitText[i].slice( 2, i2 );
							ins.baseText.underlinePaintStack.push( ins.baseText.currUnderlinePaint );
							ins.baseText.currUnderlinePaint = eval( ret );
						}
						else {
							ins.baseText.currUnderlinePaint = ins.baseText.underlinePaintStack.pop();
							i2 = 0;
						}
						this.drawText( ins, splitText[i].substring( i2 + 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( i2 + 1 ) ).width;
						break;
					case 't':              // "strikeout" paint
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							//  Ickier locating of end paren because string argument can contain them.
							var notFound = true;
							i2 = 2;
							var balance = 0;
							while ( i2 < splitText[i].length && notFound ) {
								if ( splitText[i][i2] === ")" ) {
									if ( balance === 0 )
										notFound = false;
									else
										--balance;
								}
								else if ( splitText[i][i2] === "(" )
									++balance;
								if ( notFound )
									++i2;
							}
							var ret = splitText[i].slice( 2, i2 );
							ins.baseText.strikePaintStack.push( ins.baseText.currStrikePaint );
							ins.baseText.currStrikePaint = eval( ret );
						}
						else {
							ins.baseText.currStrikePaint = ins.baseText.strikePaintStack.pop();
							i2 = 0;
						}
						this.drawText( ins, splitText[i].substring( i2 + 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( i2 + 1 ) ).width;
						break;
					case '_':              // underline
						ins.baseText.underline = !ins.baseText.underline;
						this.drawText( ins, splitText[i].substring( 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( 1 ) ).width;
						break;
					case '-':              // "strikeout" (line through the middle)
						ins.baseText.strikeOut = !ins.baseText.strikeOut;
						this.drawText( ins, splitText[i].substring( 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( 1 ) ).width;
						break;
					case 'w':              // width of outlines
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var ret = splitText[i].slice( 2, i2 );
							ins.baseText.lineWidthStack.push( ins.baseText.currLineWidth );
							if ( ret.indexOf( "." ) === -1 )
								ins.baseText.currLineWidth = parseFloat( ret );
							else
								ins.baseText.currLineWidth = parseFloat( ret ) * ins.baseText.currSize;
						}
						else {
							ins.baseText.currLineWidth = ins.baseText.lineWidthStack.pop();
							i2 = 0;
						}
						ins.ctx.lineWidth = ins.baseText.currLineWidth;
						this.drawText( ins, splitText[i].substring( i2 + 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( i2 + 1 ) ).width;
						break;
					case '!':              // "flush" instruction - fills all settings with default values
						ins.baseText.currBold = null;
						ins.baseText.currItalic = null;
						ins.baseText.currLineWidth = 1;
						ins.baseText.currHeight = 1.2 * ins.baseText.fontSize;
						ins.baseText.currOutline = ins.baseText.fontOutline;
						ins.fontOutline = ins.baseText.currOutline;
						ins.baseText.currFamily = ins.baseText.fontFamily;
						ins.baseText.currSize = ins.baseText.fontSize;
						ins.baseText.currYOff = ins.baseText.yOff;
						ins.baseText.currFillPaint = ins.baseText.fontFillPaint;
						ins.baseText.currStrikePaint = ins.baseText.fontFillPaint;
						ins.baseText.currUnderlinePaint = ins.baseText.fontFillPaint;
						ins.fontFillPaint = ins.baseText.fontFillPaint;
						ins.baseText.currStrokePaint = ins.baseText.fontStrokePaint;
						ins.fontStrokePaint = ins.baseText.fontStrokePaint;
						ins.ctx.font = this.formFont( ins.baseText.currSize, ins.baseText.currFamily, ins.baseText.currBold, 
							ins.baseText.currVariant, ins.baseText.currItalic );
						this.drawText( ins, splitText[i].substring( 1 ), x, y + ins.baseText.currYOff );
						x += this.measureText( ins, splitText[i].substring( 1 ) ).width;
						break;
					//********************************************
					//  ONCE YOU GET THESE TO WORK THEY MUST BE COPIED (AND EDITED A BIT) INSIDE
					//  measureText()
					case 'd':              // insert a drawing
						break;
					case '.':              // start a link
						break;
					case 'r':              // rotate
						break;
					case 'A':              // affine transform
						break;
					case 'e':              // superscript ("exponential")
						break;
					case 'q':              // subscript .15 - .3 down
						break;
					//  Some other possible formatting commands...indents, tab stops, bullets, indent
					//  size, tab stop settings (as many as we want), bullet style
					default:
						//  If we don't recognize the character just print the line unchanged.
						this.drawText( ins, splitText[i], x, y + ins.baseText.currYOff );	
						x += this.measureText( ins, splitText[i] ).width;
						break;
				}
				--ins.drawTextCount;
			}
		}
		if ( ins.drawTextCount === 0 ) {
			ins.fontFamily = ins.baseText.fontFamily;
			ins.fontSize = ins.baseText.fontSize;
			ins.fontBold = ins.baseText.fontBold;
			ins.fontVariant = ins.baseText.fontVariant;
			ins.fontItalic = ins.baseText.fontItalic;
			ins.fontOutline = ins.baseText.fontOutline;
			ins.fontFillPaint = ins.baseText.fontFillPaint;
			ins.fontStrokePaint = ins.baseText.fontStrokePaint;
			ins.inactiveFontFillPaint = ins.baseText.inactiveFontFillPaint;
			ins.inactiveFontStrokePaint = ins.baseText.inactiveFontStrokePaint;
			ins.ctx.strokeStyle = ins.baseText.strokeStyle;
			ins.ctx.fillStyle = ins.baseText.fillStyle;
			ins.ctx.font = ins.baseText.font;
			ins.baseText = null;
		}
	}
	else {
		//  See if there is evidence that this is a single line of text without
		//  formatting instructions.  If this is the case we need to apply justification
		//  here.
		if ( this.textJustification === RIGHT || this.textJustification === CENTER ) {
			if ( ins.baseText === undefined || ins.baseText === null ) {
				if ( this.textJustification === RIGHT )
					x = x - this.measureText( ins, text ).width;
				else if ( this.textJustification === CENTER )
					x = x - this.measureText( ins, text ).width / 2.0;
			}
		}
		//  Check for any special instructions we have for drawing this specific text,
		//  such a spacing.
		if ( this.textData !== undefined && this.textData !== null ) {
			this.straightDrawText( ins, x, y, text );
			if ( ins.baseText !== undefined && ins.baseText !== null ) {
				//  Find an index into where we are in to (possibly) complex string we are
				//  (possibly) drawing a part of.  This will provide us with individual
				//  instructions that have been added to the "textData" by other, higher-level
				//  functions.
				ins.baseText.drawCounter += text.length;  //  This keeps track of where we are
			}
		}
		else
			this.straightDrawText( ins, x, y, text );
		//  Apply underline and strikeout intructions as requested.
		ins.ctx.save();
		if ( ins.baseText !== undefined && ins.baseText !== null ) {
			if ( ins.baseText.underline || ins.baseText.strikeOut ) {
				var ret = this.measureText( ins, text );  //  shouldn't need to do this...fix TODO
				if ( ins.baseText.underline ) {
					ins.ctx.strokeStyle = translatePaint( ins, ins.baseText.currUnderlinePaint );
					ins.ctx.beginPath();
					ins.ctx.moveTo( x, y + 3 * ins.baseText.currLineWidth );
					ins.ctx.lineTo( x + ret.width, y + 3 * ins.baseText.currLineWidth );
					ins.ctx.stroke();					
				}
				if ( ins.baseText.strikeOut ) {
					ins.ctx.strokeStyle = translatePaint( ins, ins.baseText.currStrikePaint );
					ins.ctx.beginPath();
					ins.ctx.moveTo( x, y - ins.baseText.currSize * .3 );
					ins.ctx.lineTo( x + ret.width, y - ins.baseText.currSize * .3 );
					ins.ctx.stroke();					
				}
			}
		}
		ins.ctx.restore();
	}
};

//-----------------------------------------------------------------------------
//  This is a low-level call to draw text.  It applies text colors and
//  outline characteristics, but little else.  The given text is drawn at the
//  x,y location.
//-----------------------------------------------------------------------------
Component.prototype.straightDrawText = function( ins, x, y, text ) {
	//  Text colors will be applied as needed.
	ins.ctx.save();
	//  Carve out for the Nixie font.
	if ( this.useNixieFont ) {
		ins.drawing.loadNixieFont();
		ins.nixieFont.drawText( x, y, text );
	}
	else {
		//  The font outline instruction can be null or false to trigger the default
		//  behavior, which is no outline.  It can also be the string "both".  Fonts
		//  can have their own, specified paint, but this is not a requirement - if there
		//  is not specified font paint, the regular fill/stroke paints will be used.
		if ( ins.fontOutline === FONT_BOTH || ins.fontOutline === "both" ) {
			if ( ins.deactivated ) {
				if ( ins.inactiveFontFillPaint !== null )
					ins.ctx.fillStyle = translatePaint( ins, ins.inactiveFontFillPaint );
				if ( ins.inactiveFontStrokePaint !== null )
					ins.ctx.strokeStyle = translatePaint( ins, ins.inactiveFontStrokePaint );
			}
			else {
				if ( ins.fontFillPaint !== null )
					ins.ctx.fillStyle = translatePaint( ins, ins.fontFillPaint );
				if ( ins.fontStrokePaint !== null )
					ins.ctx.strokeStyle = translatePaint( ins, ins.fontStrokePaint );
			}
			ins.ctx.fillText( text, x, y );
			ins.ctx.strokeText( text, x, y );
		}
		else if ( ins.fontOutline === true || ins.fontOutline === FONT_OUTLINE || 
			ins.fontOutline === "stroke" || ins.fontOutline === "outline" ) {
			if ( ins.deactivated ) {
				if ( ins.inactiveFontStrokePaint !== null )
					ins.ctx.strokeStyle = translatePaint( ins, ins.inactiveFontStrokePaint );
			}
			else {
				if ( ins.fontStrokePaint !== null )
					ins.ctx.strokeStyle = translatePaint( ins, ins.fontStrokePaint );
			}
			ins.ctx.strokeText( text, x, y );
		}
		else {
			if ( ins.deactivated ) {
				if ( ins.inactiveFontFillPaint !== null ) {
					ins.ctx.fillStyle = translatePaint( ins, ins.inactiveFontFillPaint );
				}
			}
			else {
				if ( ins.fontFillPaint !== null )
					ins.ctx.fillStyle = translatePaint( ins, ins.fontFillPaint );
			}
			ins.ctx.fillText( text, x, y );	
		}
	}
	ins.ctx.restore();
}

//-----------------------------------------------------------------------------
//  A comprehensive function to measure text.  This returns a structure that 
//  contains the following information about the text:
//      jdhWidth          The width of a box containing the text.
//      jdhHeight         The height of a box containing the text.
//      linewidths        A list of the widths of all lines in the text.
//      lineHeights       A list of the heights of all lines of text.  The first
//                        of these is not accurate - it will be based on the
//                        starting font size.  Subsequent line heights will be
//                        the distance from the previous line and will be
//                        accurate.
//      byLineCharData    A list of lists - one list for each line in the text.
//                        Each of the items in this list contains the return
//                        from ins.ctx.measureText() with appropriate font
//                        changes of the line of text up to and including
//                        each DRAWABLE item in the text.  This is a TextMetrics
//                        structure.  The value JDHWidth
//                        is added to this structure - it is the true width
//                        to the item (don't trust "width"!).
//  Text can contain instructions as outlined in the drawText() documentation
//  (that's the tricky part).
//-----------------------------------------------------------------------------
Component.prototype.measureText = function( ins, text, font ) {
	if ( typeof( text ) != "string" ) {
		ret = {}
		ret.width = 0;
		return ret;
	}
	//  Split the text on the "\@" character combination (if it can be found)
	var splitText = text.split( "<@" );
	if ( splitText.length > 1 ) {
		//  Most of the stuff in here is a duplicate of the section in drawText(), with items
		//  removed.  We could probably use the same storage structure as drawText(), which
		//  is called "ins.baseText", but just to be safe we create a new one "ins.measText".
		if ( ins.measText === undefined || ins.measText === null ) {
			ins.measTextCount = 0;
			ins.measText = {};
			ins.measText.height = 1.2 * ins.fontSize;
			ins.measText.yOff = 0.0;
			ins.measText.fontFamily = ins.fontFamily;
			ins.measText.fontSize = ins.fontSize;
			ins.measText.fontBold = ins.fontBold;
			ins.measText.fontVariant = ins.fontVariant;
			ins.measText.fontItalic = ins.fontItalic;
			ins.measText.fontOutline = ins.fontOutline;
			ins.measText.fontFillPaint = ins.fontFillPaint;
			ins.measText.fontStrokePaint = ins.fontStrokePaint;
			ins.measText.inactiveFontFillPaint = ins.inactiveFontFillPaint;
			ins.measText.inactiveFontStrokePaint = ins.inactiveFontStrokePaint;
			ins.measText.strokeStyle = ins.ctx.strokeStyle;
			ins.measText.fillStyle = ins.ctx.fillStyle;
			ins.measText.lineWidth = ins.ctx.lineWidth;
			ins.measText.font = ins.ctx.font;
			ins.measText.currYOff = ins.measText.yOff;
			ins.measText.currHeight = ins.measText.height;
			ins.measText.currFamily = ins.measText.fontFamily;
			ins.measText.currBold = ins.measText.fontBold;
			ins.measText.currItalic = ins.measText.fontItalic;
			ins.measText.currVariant = ins.measText.fontVariant;
			ins.measText.currSize = ins.measText.fontSize;
			ins.measText.currOutline = ins.fontOutline;
			ins.measText.currFillPaint = ins.measText.fontFillPaint;
			ins.measText.currStrokePaint = ins.measText.fontStrokePaint;
			ins.measText.currLineWidth = ins.ctx.lineWidth;
			ins.measText.currStrikePaint = ins.fontStrokePaint;
			ins.measText.currUnderlinePaint = ins.fontStrokePaint;
			ins.measText.strikeOut = false;
			ins.measText.underline = false;
			ins.measText.currJDHWidth = 0;
			ins.measText.maxJDHWidth = 0;
			ins.measText.lineWidths = [];
			ins.measText.lineHeights = [];
			ins.measText.sizeStack = [];
			ins.measText.lineWidthStack = [];
			ins.measText.heightStack = [];
			ins.measText.outlineStack = [];
			ins.measText.yOffStack = [];
			ins.measText.fontFamilyStack = [];
			ins.measText.fillPaintStack = [];
			ins.measText.strokePaintStack = [];
			ins.measText.strikePaintStack = [];
			ins.measText.underlinePaintStack = [];
			ins.measText.charIndex = 0;
			//  The following structures are used to save the position and sizes of each character
			//  that is actually drawn, such that highlighting or cursor movements are handled
			//  correctly.  Each line of text will have its own list of such sizes - these are
			//  collected in "thisLineCharData".  Each "thisLineCharData" is pushed to
			//  "byLineCharData".  This structure is then returned as
			//  "ret.byLineCharData" for use by the calling function.  Each of the elements in
			//  these lists is a "TextMetrics" structure returned by ins.ctx.measureText()
			//  which contains a bunch of information about each character.
			ins.measText.thisLineCharData = [];
			ins.measText.byLineCharData = [];
			ins.measText.byLineCharData.push( ins.measText.thisLineCharData );
			ins.measText.emptyLineCharIndex = [];
			ins.measText.emptyLineCharIndex.push( 0 );
		}
		//  The leading piece of text should be measured unchanged.  If the text string starts
		//  with an instruction this may well be zero-length.
		var ret = this.measureText( ins, splitText[0] );
		ins.measText.currJDHWidth += ret.width;
		for ( var i = 1; i < splitText.length; ++i ) {
			//  Switch on the first character - it will tell us what to do.
			if ( splitText[i].length > 0 ) {
				++ins.measTextCount;
				switch( splitText[i][0] ) {
					case 'n':              // newline
						if ( ins.measText.currJDHWidth > ins.measText.maxJDHWidth )
							ins.measText.maxJDHWidth = ins.measText.currJDHWidth;
						ins.measText.lineWidths.push( ins.measText.currJDHWidth );
						ins.measText.lineHeights.push( ins.measText.currHeight );
						//  Create a new list for the new line of character data.
						ins.measText.thisLineCharData = [];
						ins.measText.byLineCharData.push( ins.measText.thisLineCharData );
						ins.measText.currJDHWidth = 0.0;
						ins.measText.charIndex += 3;
						ins.measText.emptyLineCharIndex.push( ins.measText.charIndex );
						ret = this.measureText( ins, splitText[i].substring( 1 ) );
						ins.measText.currJDHWidth = ret.width;
						break;
					case 'h':              // line spacing ("height") either in pixels or as a factor of the font size
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var tmpret = splitText[i].slice( 2, i2 );
							ins.measText.heightStack.push( ins.measText.currHeight );
							if ( tmpret.indexOf( "." ) === -1 )
								ins.measText.currHeight = parseFloat( tmpret );
							else
								ins.measText.currHeight = parseFloat( tmpret ) * ins.measText.currSize;
						}
						else {
							ins.measText.currHeight = ins.measText.heightStack.pop();
							i2 = 0;
						}
						ins.measText.charIndex += 3 + i2;
						this.measSubtext( ins, splitText[i].substring( i2 + 1 ) );
						break;
					case 'y':              // Y offset in pixels or a fraction of the font size
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var tmpret = splitText[i].slice( 2, i2 );
							ins.measText.yOffStack.push( ins.measText.currYOff );
							if ( tmpret.indexOf( "." ) === -1 )
								ins.measText.currYOff = parseFloat( tmpret );
							else
								ins.measText.currYOff = parseFloat( tmpret ) * ins.measText.currYOff;
						}
						else {
							ins.measText.currYOff = ins.measText.yOffStack.pop();
							i2 = 0;
						}
						ins.measText.charIndex += 3 + i2;
						this.measSubtext( ins, splitText[i].substring( i2 + 1 ) );
						break;
					case 'b':              // switch on/off bold (if available for this font)
						if ( ins.measText.currBold === "bold" )
							ins.measText.currBold = "normal";
						else if ( ins.measText.currBold === null || ins.measText.currBold === "normal" )
							ins.measText.currBold = "bold";
						ins.ctx.font = this.formFont( ins.measText.currSize, ins.measText.currFamily, ins.measText.currBold, 
							ins.measText.currVariant, ins.measText.currItalic );
						ins.measText.charIndex += 3;
						this.measSubtext( ins, splitText[i].substring( 1 ) );
						break;
					case 'l':              // switch on/off lighter text (if available for this font)
						if ( ins.measText.currBold === "lighter" )
							ins.measText.currBold = "normal";
						else if ( ins.measText.currBold === null || ins.measText.currBold === "normal" )
							ins.measText.currBold = "lighter";
						ins.ctx.font = this.formFont( ins.measText.currSize, ins.measText.currFamily, ins.measText.currBold, 
							ins.measText.currVariant, ins.measText.currItalic );
						ins.measText.charIndex += 3;
						this.measSubtext( ins, splitText[i].substring( 1 ) );
						break;
					case 'o':              // set the outline mode, which can be "outline", "both" or "none"
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var tmpret = splitText[i].slice( 2, i2 );
							ins.measText.outlineStack.push( ins.measText.currOutline );
							tmpret = tmpret.toLowerCase();
							if ( tmpret.includes( "outline" ) )
								ins.measText.currOutline = "outline";
							else if ( tmpret.includes( "both" ) )
								ins.measText.currOutline = "both";
							else
								ins.measText.currOutline = null;
						}
						else {
							ins.measText.currOutline = ins.measText.outlineStack.pop();
							i2 = 0;
						}
						ins.fontOutline = ins.measText.currOutline;
						ins.measText.charIndex += 3 + i2;
						this.measSubtext( ins, splitText[i].substring( i2 + 1 ) );
						break;
					case 'i':              // switch on/off italic (if available for this font)
						if ( ins.measText.currItalic === "italic" )
							ins.measText.currItalic = "normal";
						else
							ins.measText.currItalic = "italic";
						ins.ctx.font = this.formFont( ins.measText.currSize, ins.measText.currFamily, ins.measText.currBold, 
							ins.measText.currVariant, ins.measText.currItalic );
						ins.measText.charIndex += 3;
						this.measSubtext( ins, splitText[i].substring( 1 ) );
						break;
					case 's':              //  scale the font
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var tmpret = splitText[i].slice( 2, i2 );
							ins.measText.sizeStack.push( ins.measText.currSize );
							if ( tmpret.indexOf( "." ) === -1 )
								ins.measText.currSize = parseFloat( tmpret );
							else
								ins.measText.currSize = parseFloat( tmpret ) * ins.measText.currSize;
						}
						else {
							ins.measText.currSize = ins.measText.sizeStack.pop();
							i2 = 0;
						}
						ins.ctx.font = this.formFont( ins.measText.currSize, ins.measText.currFamily, ins.measText.currBold, 
							ins.measText.currVariant, ins.measText.currItalic );
						ins.measText.charIndex += 3 + i2;
						this.measSubtext( ins, splitText[i].substring( i2 + 1 ) );
						break;
					case 'f':              // "font" or font family
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var tmpret = splitText[i].slice( 2, i2 );
							ins.measText.fontFamilyStack.push( ins.measText.currFamily );
							ins.measText.currFamily = tmpret;
						}
						else {
							ins.measText.currFamily = ins.measText.fontFamilyStack.pop();
							i2 = 0;
						}
						ins.ctx.font = this.formFont( ins.measText.currSize, ins.measText.currFamily, ins.measText.currBold, 
							ins.measText.currVariant, ins.measText.currItalic );
						ins.measText.charIndex += 3 + i2;
						this.measSubtext( ins, splitText[i].substring( i2 + 1 ) );
						break;
					case 'p':              // apply paint to following text (this is the fill paint)
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							//  Ickier locating of end paren because string argument can contain them.
							var notFound = true;
							i2 = 2;
							var balance = 0;
							while ( i2 < splitText[i].length && notFound ) {
								if ( splitText[i][i2] === ")" ) {
									if ( balance === 0 )
										notFound = false;
									else
										--balance;
								}
								else if ( splitText[i][i2] === "(" )
									++balance;
								if ( notFound )
									++i2;
							}
							var tmpret = splitText[i].slice( 2, i2 );
							ins.measText.fillPaintStack.push( ins.measText.currFillPaint );
							ins.measText.currFillPaint = eval( tmpret );
						}
						else {
							ins.measText.currFillPaint = ins.measText.fillPaintStack.pop();
							i2 = 0;
						}
						ins.fontFillPaint = ins.measText.currFillPaint;
						ins.measText.charIndex += 3 + i2;
						this.measSubtext( ins, splitText[i].substring( i2 + 1 ) );
						break;
					case 'k':              // paint of outlines
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							//  Ickier locating of end paren because string argument can contain them.
							var notFound = true;
							i2 = 2;
							var balance = 0;
							while ( i2 < splitText[i].length && notFound ) {
								if ( splitText[i][i2] === ")" ) {
									if ( balance === 0 )
										notFound = false;
									else
										--balance;
								}
								else if ( splitText[i][i2] === "(" )
									++balance;
								if ( notFound )
									++i2;
							}
							var tmpret = splitText[i].slice( 2, i2 );
							ins.measText.strokePaintStack.push( ins.measText.currStrokePaint );
							ins.measText.currStrokePaint = eval( tmpret );
						}
						else {
							ins.measText.currStrokePaint = ins.measText.strokePaintStack.pop();
							i2 = 0;
						}
						ins.fontStrokePaint = ins.measText.currStrokePaint;
						ins.measText.charIndex += 3 + i2;
						this.measSubtext( ins, splitText[i].substring( i2 + 1 ) );
						break;
					case 'u':              // underline paint
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							//  Ickier locating of end paren because string argument can contain them.
							var notFound = true;
							i2 = 2;
							var balance = 0;
							while ( i2 < splitText[i].length && notFound ) {
								if ( splitText[i][i2] === ")" ) {
									if ( balance === 0 )
										notFound = false;
									else
										--balance;
								}
								else if ( splitText[i][i2] === "(" )
									++balance;
								if ( notFound )
									++i2;
							}
							var tmpret = splitText[i].slice( 2, i2 );
							ins.measText.underlinePaintStack.push( ins.measText.currUnderlinePaint );
							ins.measText.currUnderlinePaint = eval( tmpret );
						}
						else {
							ins.measText.currUnderlinePaint = ins.measText.underlinePaintStack.pop();
							i2 = 0;
						}
						ins.measText.charIndex += 3 + i2;
						this.measSubtext( ins, splitText[i].substring( i2 + 1 ) );
						break;
					case 't':              // "strikeout" paint
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							//  Ickier locating of end paren because string argument can contain them.
							var notFound = true;
							i2 = 2;
							var balance = 0;
							while ( i2 < splitText[i].length && notFound ) {
								if ( splitText[i][i2] === ")" ) {
									if ( balance === 0 )
										notFound = false;
									else
										--balance;
								}
								else if ( splitText[i][i2] === "(" )
									++balance;
								if ( notFound )
									++i2;
							}
							var tmpret = splitText[i].slice( 2, i2 );
							ins.measText.strikePaintStack.push( ins.measText.currStrikePaint );
							ins.measText.currStrikePaint = eval( tmpret );
						}
						else {
							ins.measText.currStrikePaint = ins.measText.strikePaintStack.pop();
							i2 = 0;
						}
						ins.measText.charIndex += 3 + i2;
						this.measSubtext( ins, splitText[i].substring( i2 + 1 ) );
						break;
					case '_':              // underline
						ins.measText.underline = !ins.measText.underline;
						ins.measText.charIndex += 3;
						this.measSubtext( ins, splitText[i].substring( 1 ) );
						break;
					case '-':              // "strikeout" (line through the middle)
						ins.measText.strikeOut = !ins.measText.strikeOut;
						ins.measText.charIndex += 3;
						this.measSubtext( ins, splitText[i].substring( 1 ) );
						break;
					case 'w':              // width of outlines
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							var tmpret = splitText[i].slice( 2, i2 );
							ins.measText.lineWidthStack.push( ins.measText.currLineWidth );
							if ( tmpret.indexOf( "." ) === -1 )
								ins.measText.currLineWidth = parseFloat( tmpret );
							else
								ins.measText.currLineWidth = parseFloat( tmpret ) * ins.measText.currLineWidth;
						}
						else {
							ins.measText.currLineWidth = ins.measText.lineWidthStack.pop();
							i2 = 0;
						}
						ins.ctx.lineWidth = ins.measText.currLineWidth;
						ins.measText.charIndex += 3 + i2;
						this.measSubtext( ins, splitText[i].substring( i2 + 1 ) );
						break;
					case '!':               // "flush" instruction - fills all settings with default values
						ins.measText.currBold = null;
						ins.measText.currItalic = null;
						ins.measText.currLineWidth = 1;
						ins.measText.currHeight = 1.2 * ins.measText.fontSize;
						ins.measText.currOutline = ins.measText.fontOutline;
						ins.fontOutline = ins.measText.currOutline;
						ins.measText.currFamily = ins.measText.fontFamily;
						ins.measText.currSize = ins.measText.fontSize;
						ins.measText.currYOff = ins.measText.yOff;
						ins.measText.currFillPaint = ins.measText.fontFillPaint;
						ins.fontFillPaint = ins.measText.fontFillPaint;
						ins.measText.currStrokePaint = ins.measText.fontStrokePaint;
						ins.fontStrokePaint = ins.measText.fontStrokePaint;
						ins.measText.currStrikePaint = ins.measText.fontFillPaint;
						ins.measText.currUnderlinePaint = ins.measText.fontFillPaint;
						ins.ctx.font = this.formFont( ins.measText.currSize, ins.measText.currFamily, ins.measText.currBold, 
							ins.measText.currVariant, ins.measText.currItalic );
						ins.measText.charIndex += 3;
						this.measSubtext( ins, splitText[i].substring( 1 ) );
						break;
					//*****************************************
					//  FILL THESE IN AFTER GETTING THE DRAWING TO WORK IN drawText()
					case 'd':              // insert a drawing
						break;
					case '.':              // start a link
						break;
					case 'r':              // rotate
						break;
					case 'a':              // affine transform
						break;
					case 'e':              // superscript ("exponential")
						break;
					case 'q':              // subscript .15 - .3 down
					    break;
					default:
						//  If we don't recognize the character just measure the line unchanged.
						ins.measText.charIndex += 3;
						this.measSubtext( ins, splitText[i] );
						break;
				}
				--ins.measTextCount;
			}
		}
		//  These are JDH-specific measurements that are being added to the return
		//  structure.  For complex test strings these are really all we can trust.
		if ( ins.measText.currJDHWidth > ins.measText.maxJDHWidth )
			ret.jdhWidth = ins.measText.currJDHWidth;
		else
			ret.jdhWidth = ins.measText.maxJDHWidth;
		ins.measText.lineWidths.push( ins.measText.currJDHWidth );
		ins.measText.lineHeights.push( ins.measText.currHeight );
		ret.lineWidths = ins.measText.lineWidths;
		ret.lineHeights = ins.measText.lineHeights;
		ret.byLineCharData = ins.measText.byLineCharData;
		ret.emptyLineCharIndex = ins.measText.emptyLineCharIndex;
		//  Clean up the structure.
		if ( ins.measTextCount === 0 ) {
			ins.fontFamily = ins.measText.fontFamily;
			ins.fontSize = ins.measText.fontSize;
			ins.fontBold = ins.measText.fontBold;
			ins.fontVariant = ins.measText.fontVariant;
			ins.fontItalic = ins.measText.fontItalic;
			ins.fontOutline = ins.measText.fontOutline;
			ins.fontFillPaint = ins.measText.fontFillPaint;
			ins.fontStrokePaint = ins.measText.fontStrokePaint;
			ins.inactiveFontFillPaint = ins.measText.inactiveFontFillPaint;
			ins.inactiveFontStrokePaint = ins.measText.inactiveFontStrokePaint;
			ins.ctx.strokeStyle = ins.measText.strokeStyle;
			ins.ctx.fillStyle = ins.measText.fillStyle;
			ins.ctx.font = ins.measText.font;
			ins.measText = null;
		}
	}
	else {
		if ( font !== undefined && font !== null ) {
			if ( font.family !== null )
				var fontStr = font.family;
			else
				var fontStr = ins.fontFamily;
			if ( font.size !== null )
				fontStr = font.size + "px " + fontStr;
			else
				fontStr = ins.fontSize + "px " + fontStr;
			if ( font.bold === true )
				fontStr = "bold " + fontStr;
			else if ( font.bold === false )
				fontStr = "normal " + fontStr;
			else if ( font.bold === "light" )
				fontStr = "lighter " + fontStr;
			else if ( font.bold !== null )
				fontStr = font.bold + " " + fontStr;
			if ( font.variant !== null )
				fontStr = font.variant + " " + fontStr;
			if ( font.italic === true )
				fontStr = "italic " + fontStr;
			else if ( font.italic === false )
				fontStr = "normal " + fontStr;
			else if ( font.italic !== null )
				fontStr = font.italic + fontStr;
			ins.ctx.save();
			ins.ctx.font = fontStr;
		}
		if ( this.useNixieFont ) {
			ins.drawing.loadNixieFont();
			var ret = ins.nixieFont.measureText( text );
		}
		else
			var ret = ins.ctx.measureText( text );
		//  Measure the width of the string to each individual character.  This is
		//  time consuming but useful for locating cursors and highlighted regions.
		ret.byChar = [];
		for ( var i = 1; i < text.length; ++i ) {
			if ( this.useNixieFont )
				ret.byChar.push( ins.nixieFont.measureText( text.slice( 0, i ) ) );
			else
				ret.byChar.push( ins.ctx.measureText( text.slice( 0, i ) ) );
		}
		if ( text.length > 0 ) {
			if ( this.useNixieFont )
				ret.byChar.push( ins.nixieFont.measureText( text ) );
			else
				ret.byChar.push( ins.ctx.measureText( text ) );
		}
		//  Slightly icky here...if the initial (non-recursive) function call was with
		//  a simple line of text with no embedded instructions, ins.measText will not 
		//  have been defined.  In this case we will NOT be building the "thisLineCharData"
		//  structure (the structure won't exist).
		if ( ins.measText !== undefined && ins.measText !== null ) {
			for ( var i = 0; i < ret.byChar.length; ++i ) {
				ret.byChar[i].JDHWidth = ret.byChar[i].width + ins.measText.currJDHWidth;
				ret.byChar[i].charIndex = ins.measText.charIndex;
				ins.measText.charIndex += 1;
				ins.measText.thisLineCharData.push( ret.byChar[i] );
			}
		}
		else {
			var maxWidth = 0.0;
			for ( var i = 0; i < ret.byChar.length; ++i ) {
				ret.byChar[i].JDHWidth = ret.byChar[i].width;
				maxWidth = ret.byChar[i].width;
				ret.byChar[i].charIndex = i;
			}
			ret.byLineCharData = [ret.byChar];
			ret.lineHeights = [];
			ret.lineHeights.push( 1.2 * ins.fontSize );
			ret.lineWidths = [];
			ret.lineWidths.push( maxWidth );
		}
		//  Restore fonts.
		if ( font !== undefined && font !== null ) {
			ins.ctx.restore();
		}
		//  These are JDH-specific measurements that are being added to the return
		//  structure.
		ret.jdhWidth = ret.width;
	}
	return ret;
};

//-------------------------------------
//  This is an internal function used by measureText.
//------
Component.prototype.measSubtext = function( ins, subtext ) {
	var ret = this.measureText( ins, subtext );
	ins.measText.currJDHWidth += ret.width;
}

//-----------------------------------------------------------------------------
//  Yet another function that interprets text formatting instructions.  In
//  this case we return a text string that contains only the printable
//  characters, along with any instructions that can be easily interpeted by
//  a straight-forward text editor, such as newlines and tabs.
//-----------------------------------------------------------------------------
Component.prototype.simplifyText = function( text ) {
	//  Split the text on the "\@" character combination (if it can be found)
	var splitText = text.split( "<@" );
	if ( splitText.length > 1 ) {
		//  The leading piece of text should be drawn unchanged.  If the text string starts
		//  with an instruction this may well be zero-length.
		var ret = splitText[0];	
		for ( var i = 1; i < splitText.length; ++i ) {
			//  Switch on the first character - it will tell us what to do.
			if ( splitText[i].length > 0 ) {
				switch( splitText[i][0] ) {
					case 'n':              // newline - we can add these to the text
						ret += '\u000A';
						ret += splitText[i].substring( 1 );
						break;
					case 'h':              // line spacing ("height") either in pixels or as a factor of the font size
					case 'y':              // y offset
					case 'o':              // set the outline mode, which can be "outline", "both" or "none"
					case 's':             //  font size
					case 'f':              // "font" or font family
					case 'w':              // width of outlines
						var i2 = splitText[i].indexOf( ")" );
						if ( !( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) )
							i2 = 0;
						ret += splitText[i].substring( i2 + 1 );
						break;
					case 'b':              // switch on/off bold (if available for this font)
					case 'l':              // switch on/off lighter type (if available for this font)
					case 'i':              // switch on/off italic (if available for this font)
					case '_':              // underline
					case '-':              // "strikeout" (line through the middle)
					case '!':              // "flush" instruction - fills all settings with default values
						ret += splitText[i].substring( 1 );
						break;
					case 'p':              // apply paint to following text (this is the fill paint)
					case 'k':              // paint of outlines
					case 'u':              // underline paint
					case 't':              // "strikeout" paint
						var i2 = splitText[i].indexOf( ")" );
						if ( splitText[i].length > 0 && splitText[i][1] === '(' && i2 !== -1 ) {
							//  Ickier locating of end paren because string argument can contain them.
							var notFound = true;
							i2 = 2;
							var balance = 0;
							while ( i2 < splitText[i].length && notFound ) {
								if ( splitText[i][i2] === ")" ) {
									if ( balance === 0 )
										notFound = false;
									else
										--balance;
								}
								else if ( splitText[i][i2] === "(" )
									++balance;
								if ( notFound )
									++i2;
							}
						}
						else {
							i2 = 0;
						}
						ret += splitText[i].substring( i2 + 1 );
						break;
					//********************************************
					//  Stuff that is not implemented yet
					case 'd':              // insert a drawing
						break;
					case '.':              // start a link
						break;
					case 'r':              // rotate
						break;
					case 'a':              // affine transform
						break;
					case 'e':              // superscript ("exponential")
						break;
					case 'q':              // subscript .15 - .3 down
						break;
					//  Some other possible formatting commands...indents, tab stops, bullets, indent
					//  size, tab stop settings (as many as we want), bullet style
					default:
						//  If we don't recognize the character just print the line unchanged.
						ret += splitText[i];
						break;
				}
			}
		}
		return ret;
	}
	else {
		return text;
	}
};

//-------------------------------------
//  Hopefully the FINAL function that can recognize text commands...this one simply
//  returns the index of the next "real" character (skipping instructions, but counting
//  their index).
//------
Component.prototype.indexOfNextRealText = function( text ) {
	var ret = 0;
	//  Bail out quickly if we know we aren't starting with an instruction...
	while ( ret + 3 < text.length ) {
		if ( text[ret] !== '<' || text[ret + 1] !== '@' )
			return ret;
		switch( text[ret + 2] ) {
			case 'h':              // line spacing ("height") either in pixels or as a factor of the font size
			case 'y':              // y offset
			case 'o':              // set the outline mode, which can be "outline", "both" or "none"
			case 's':             //  font size
			case 'f':              // "font" or font family
			case 'w':              // width of outlines
				//  Make sure we have enough characters for an open/close parenthesis and a value - if we don't, return.
				if ( ret + 5 < text.length )
					return ret;
				else {
					var i2 = text.substring( ret ).indexOf( ")" );
					if ( !( text[ret + 3] === '(' && i2 !== -1 ) )
						return ret;
					ret += i2 + 1;
				}
				break;
			case 'n':              // newline
			case 'b':              // switch on/off bold (if available for this font)
			case 'l':              // switch on/off lighter type (if available for this font)
			case 'i':              // switch on/off italic (if available for this font)
			case '_':              // underline
			case '-':              // "strikeout" (line through the middle)
			case '!':              // "flush" instruction - fills all settings with default values
				ret += 3;
				break;
			case 'p':              // apply paint to following text (this is the fill paint)
			case 'k':              // paint of outlines
			case 'u':              // underline paint
			case 't':              // "strikeout" paint
				if ( ret + 5 < text.length )
					return ret;
				else {
					var i2 = text.substring( ret ).indexOf( ")" );
					if ( !( text[ret + 3] === '(' && i2 !== -1 ) )
						return ret;
					var notFound = true;
					i2 = ret + 4;
					var balance = 0;
					while ( i2 < text.length && notFound ) {
						if ( text[i2] === ")" ) {
							if ( balance === 0 )
								notFound = false;
							else
								--balance;
						}
						else if ( text[i2] === "(" )
							++balance;
						if ( notFound )
							++i2;
					}
					if ( notFound )
						return ret;
					ret = i2 + 1;
				}
				break;
			//********************************************
			//  Stuff that is not implemented yet
			case 'd':              // insert a drawing
				break;
			case '.':              // start a link
				break;
			case 'r':              // rotate
				break;
			case 'a':              // affine transform
				break;
			case 'e':              // superscript ("exponential")
				break;
			case 'q':              // subscript .15 - .3 down
				break;
			//  Some other possible formatting commands...indents, tab stops, bullets, indent
			//  size, tab stop settings (as many as we want), bullet style
			default:
				//  If we don't recognize the character just print the line unchanged.
				return ret;
				break;
		}
	}
	return ret;
};



var NOMINAL_SIZE        = 0;
var FRACTIONAL_SIZE     = 2;
var OPPOSING_SIZE       = 4;
//-------------------------------------
//  Set the position, width, and height of this object.  
//
//  You can
//  specify any of the four numbers, X, Y, W, and H, or you can put "null" in any
//  of them to indicate you don't want to change them (although if this is the first
//  time they are being set, as in the constructor of this function, they need values).
//
//  Four following arguments, which are optional, can be used to indicate whether each
//  number if relative (i.e. a fraction of the parent), and whether it is measured from
//  the origin of its parent object or from the right or bottom side of the parent object
//  (whichever is appropriate).  There are two values (defined above) that determine
//  this - FRACTIONAL_SIZE and OPPOSING_SIZE.  These values can be OR's together to form the rx, ry,
//  rw, and rh arguments.
//  
//  FRACTIONAL_SIZE values are measured as a fraction of the width of the parent.  This applies
//  to X and Y (the position values) and W and H (the size values).
//
//  OPPOSING_SIZE values are measured from the opposite side of the parent - from the width
//  side of X and W, from the height for Y and H.  For the position values this is
//  straight-forward enough.   For W and H, OPPOSING_SIZE values are defined such that the
//  width (say) is a certain distance from the width of the parent.  The same goes for the
//  height.  For instance, if a width of -100 is defined as OPPOSING_SIZE, the right edge of
//  the component will always be 100 pixels to the left of the right edge of the parent.
//
//  All four values can alll be null, which will be equivalent to not including them at all.
//
//  In the absense of the relative/absolute instruction, the X, Y, W, and H values will
//  be individually examined.  Fractions of 1 will be interpreted as FRACTIONAL_SIZE values,
//  larger than 1 (either positive or negative) will be interpreted as absolute.  1 is,
//  unfortunately, ambiguous.  As a guess, it is interpreted as FRACTIONAL_SIZE for W and H but
//  absolute for X and Y.  
//
//  Negative values are interpreted as OPPOSING_SIZE in the absense of instructions.
//
//  The FRACTIONAL_SIZE and OPPOSING_SIZE state of each component measurement can be changed by
//  this function, or by the "setRelative()" functions.  Otherwise this is a "sticky"
//  property - changes in values using the "resize()" function will not change these
//  states.
//------
Component.prototype.setSize = function( x, y, w, h, rx, ry, rw, rh ) {
	//  Only the items that are non-null are actually set.  Note that if you wish to
	//  change a "relative" value but not the value itself, use the setRelative()
	//  functions.
	if ( x !== null ) {
		this.x = x;
		if ( rx !== undefined && rx !== null )
			this.rx = rx;
		else {
			//  Determine whether this value is relative based on the value.  For position
			//  values (X and Y), a value of 1 is assumed to be an absolute pixel value, as
			//  is a zero.
			if ( x == 0 )
				this.rx = NOMINAL_SIZE;
			else if ( Math.abs( x ) < 1.0 ) {
				this.rx = FRACTIONAL_SIZE;
				if ( x < 0 )
					this.rx |= OPPOSING_SIZE;
			}
			else {
				//  Negative values are interpreted as OPPOSING_SIZE values.
				if ( x < 0 )
					this.rx = OPPOSING_SIZE;
				else
					this.rx = NOMINAL_SIZE;
			}
		}
	}
	if ( y !== undefined && y !== null )
		this.y = y;
	if ( ry !== undefined && ry !== null )
		this.ry = ry;
	else  {
		//  Determine whether this value is relative based on the value.  For position
		//  values (X and Y), a value of 1 is assumed to be an absolute pixel value.
		if ( y == 0 )
			this.ry = NOMINAL_SIZE;
		else if ( Math.abs( y ) < 1.0 ) {
			this.ry = FRACTIONAL_SIZE;
			if ( y < 0 )
				this.ry |= OPPOSING_SIZE;
		}
		else {
			if ( y < 0 )
				this.ry = OPPOSING_SIZE;
			else
				this.ry = NOMINAL_SIZE;
		}
	}
	if ( w !== undefined && w !== null )
		this.w = w;
	if ( rw !== undefined && rw !== null )
		this.rw = rw;
	else {
		//  Determine whether this value is relative based on the value.  For size
		//  values (W and H), a value of 1 is assumed to be a relative value, but a
		//  -1 is assumed to be an absolute value.  A value of 0 is assumed to be
		//  a pixel value measured from the opposite side.
		if ( w == 0 )
			this.rw = NOMINAL_SIZE;
		else if ( Math.abs( w ) < 1 ) 
			this.rw = FRACTIONAL_SIZE;
		else if ( w === 1 )
			this.rw = FRACTIONAL_SIZE;
		else if ( w === -1 )
		    this.rw = NOMINAL_SIZE;
		else
			this.rw = NOMINAL_SIZE;
		if ( w <= 0 )
			this.rw |= OPPOSING_SIZE;
	}
	if ( h !== undefined && h !== null )
		this.h = h;
	if ( rh !== undefined && rh !== null )
		this.rh = rh;
	else {
		//  Determine whether this value is relative based on the value.  For position
		//  values (X and Y), a value of 1 is assumed to be an absolute pixel value.
		//  A value of 0 is assumed to be a pixel value measured from the opposite side.
		if ( h == 0 )
			this.rh = NOMINAL_SIZE;
		else if ( Math.abs( h ) < 1 ) 
			this.rh = FRACTIONAL_SIZE;
		else if ( h === 1 )
			this.rh = FRACTIONAL_SIZE;
		else if ( h === -1 )
			this.rh = NOMINAL_SIZE;
		else
			this.rh = NOMINAL_SIZE;
		if ( h <= 0 )
			this.rh |= OPPOSING_SIZE;
	}
}

//--------------------------------
//  Force x, y, w, and h to be relative (or not).  First a function to do all at
//  once...
//------
Component.prototype.setRelative = function( rx, ry, rw, rh ) {
	this.rx = rx;
	this.ry = ry;
	this.rw = rw;
	this.rh = rh;
}

//--------------------------------
//  And then to do it individually.
//------
Component.prototype.setRelativeX = function( rx ) {
	this.rx = rx;
}
Component.prototype.setRelativeY = function( ry ) {
	this.ry = ry;
}
Component.prototype.setRelativeW = function( rw ) {
	this.rw = rw;
}
Component.prototype.setRelativeH = function( rh ) {
	this.rh = rh;
}

//--------------------------------
//  The "resize()" function is meant to be called by users to change the size of
//  this component.  It will trigger a "resizeToo()" function call to, if necessary,
//  adjust these sizes relative to its parent (that call will also propogate to
//  children).
//
//  There are a couple of differences between this and setSize().  Note that this
//  function does NOT change whether items are relative or not - to change those,
//  use setSize().  This function DOES however call resizeToo(), which is necessary
//  for the sizes to take effect.
//-------
Component.prototype.resize = function( x, y, w, h ) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
	this.resizeToo();
};

//  Just set the position.
Component.prototype.setXY = function( x, y ) {
	this.x = x;
	this.y = y;
	this.resizeToo();
};

//--------------------------------
//  Change the existing position by the given amount.  This is probably what you want
//  to do (not setXY()) because it takes into account where the component is already
//  located.
//------
Component.prototype.translate = function( x, y ) {
	this.setXY( this.x + x, this.y + y );
}

//  Just set the size.
Component.prototype.setWH = function( w, h ) {
	this.w = w;
	this.h = h;
	this.resizeToo();
};

//  Set the "locked" ratio between width and height.  The largest frame that follows
//  other instructions will be used.  Set this to null (the default) if you do not
//  wish to lock the ratio.  You can assign an (optional) alignment to this - one of
//  the nine alignment possibilities.  These determine where the component will be
//  positioned in the space if it is limited in x or y.  The default is to put it
//  to the left if limited by height and to the top if limited by width (this would
//  correspond to ALIGN_ABOVE_LEFT).
Component.prototype.setWHRatio = function( nw, nh, align, fill ) {
	if ( nw === undefined || nh === undefined || nw === null || nw === false )
		this.whRatio = null;
	else
		this.whRatio = nw / nh;
	if ( align === undefined )
		this.whAlign = null;
	else
		this.whAlign = align;
	if ( fill === undefined )
		this.whFill = false;
	else
		this.whFill = fill;
}

//--------------------------------
//  Using the user specifications for size and position (which are relative to the
//  parent) compute the pixel position, width, and height where this component will
//  be drawn.  The rules for converting from user specifications to pixel values are
//  described above.
//  This function should not be overridden, or at least not without considerable
//  care.
//------
Component.prototype.resizeToo = function() {
	//  First compute nominal values for the width and height.  These
	//  may not be final.
	if ( this.parent !== null ) {
		px = this.parent.drawX;
		py = this.parent.drawY;
		pw = this.parent.drawW;
		ph = this.parent.drawH;
	}
	else {
		//  Nominal values if the parent does not exist.  These are wrong,
		//  obviously, but they prevent a crash.
		var px = 0;
		var py = 0;
		var pw = 100;
		var ph = 100;
	}
	var tw = this.w;
	var th = this.h;
	//  Figure out the width that will be drawn - this is in pixels, but unscaled.
	if ( this.rw & FRACTIONAL_SIZE ) //  relative
		this.drawW = tw * pw;
	else           //  absolute
		this.drawW = tw;
	//  Now the height.
	if ( this.rh & FRACTIONAL_SIZE ) //  relative
		this.drawH = th * ph;
	else
		this.drawH = th;
	//  Compute the position where this component should be drawn.  These values
	//  are final - they require the above width and height values to be correct.
	this.drawX = this.xPixel( this.x );
	this.drawY = this.yPixel( this.y );
	if ( this.rw & OPPOSING_SIZE ) //  measure from the right edge
	    this.drawW = pw - this.drawX + this.drawW;
	if ( this.rh & OPPOSING_SIZE )
		this.drawH = ph - this.drawY + this.drawH;
	//  Change the size to match the resize ratio - if it exists.  It will match
	//  whatever is most restrictive.
	if ( this.whRatio !== null ) {
		var currentRatio = this.drawW / this.drawH;
		if ( ( currentRatio > this.whRatio && !this.whFill ) || ( currentRatio < this.whRatio && this.whFill ) ) { //  restricted by H
			var setDrawW = this.drawW;
			this.drawW = this.whRatio * this.drawH;
			//  Position this component based on alignment instructions, if there are any.
			switch ( this.whAlign ) {
				case ALIGN_ABOVE_MIDDLE:
				case ALIGN_BELOW_MIDDLE:
				case ALIGN_CENTERED_MIDDLE:
					this.drawX = this.drawX + ( setDrawW - this.drawW ) / 2.0;
					break;
				case ALIGN_ABOVE_RIGHT:
				case ALIGN_BELOW_RIGHT:
				case ALIGN_CENTERED_RIGHT:
					this.drawX = this.drawX + setDrawW - this.drawW;
					break;
			}
		}
		else if ( ( currentRatio < this.whRatio && !this.whFill ) || ( currentRatio > this.whRatio && this.whFill ) ) { //  restricted by W
			var setDrawH = this.drawH;
			this.drawH = this.drawW / this.whRatio;
			switch ( this.whAlign ) {
				case ALIGN_CENTERED_LEFT:
				case ALIGN_CENTERED_RIGHT:
				case ALIGN_CENTERED_MIDDLE:
					this.drawY = this.drawY + ( setDrawH - this.drawH ) / 2.0;
					break;
				case ALIGN_BELOW_LEFT:
				case ALIGN_BELOW_RIGHT:
				case ALIGN_BELOW_MIDDLE:
					this.drawY = this.drawY + setDrawH - this.drawH;
					break;
			}
		}
	}
	//  Do anything locally that must be done on a resize.
	this.resizeHandler();
	//  Do all children...
	this.resizeChildren();
	//  This is for "restrictive" redraws, which only occur when an object changes
	//  size or is deliberately redrawn.
	if ( this.restrictiveRedraw ) {
		if ( this.drawX !== this.saveDrawX )
			this.redrawAnyway = true;
		else if ( this.drawY !== this.saveDrawY )
			this.redrawAnyway = true;
		else if ( this.drawW !== this.saveDrawW )
			this.redrawAnyway = true;
		else if ( this.drawH !== this.saveDrawH )
			this.redrawAnyway = true;
		this.saveDrawX = this.drawX;
		this.saveDrawY = this.drawY;
		this.saveDrawW = this.drawW;
		this.saveDrawH = this.drawH;
	}
	//  Check that the size is not negative.
	this._sizeOK = true;
	if ( !this.drawNegative && ( this.drawW < 0 || this.drawH < 0 ) )
		this._sizeOK = false;
};

//  Compute a pixel location in x from the given instructions.  As described in the
//  documentation, the instructions can be a simple number, or a complex array of
//  numbers, names, and other instructions.  It is not expected that this function
//  will be overridden.
Component.prototype.xPixel = function( inst ) {
	var ret = 0;
	//  If the instructions are a simple number, the pixel is computed in terms of
	//  the parent component, using the "position rules".
	if ( typeof( inst ) === "number" ) {
		//  If this is the top level component, it will have no parent.  Lacking any
		//  other hint, we simply return the given value.
		if ( this.parent === null )
			var ret = inst;
		//  Otherwise, use the parent and the position rules.
		else
			var ret = this.parent.xPosition( inst, this.rx );
		}
	else {
		//  If the instructions are complex (i.e in the form of an array), find the 
		//  value by interpreting them.
		//  If the first instruction is a string, this is assumed to be a variable
		//  or the name of a component, which we attempt to locate.
		if ( typeof( inst[0] ) === "string" ) {
			//  Check the known variables first.
			ret = this.variable( inst[0] );
			if ( ret !== null )
				return ret;
			var componentPtr = null;
			if ( this.drawing.topLevel !== null )
				componentPtr = this.drawing.topLevel.findChildByName( inst[0] );
			if ( componentPtr === null )
				return this.xPixel( inst.slice( 1 ) );
			else
				return componentPtr.xPixel( inst.slice( 1 ) );
		}
		//  Note we only reach here if the first instruction was not a string!
		//  If there is only one instruction, interpret it in terms of this object's
		//  position.
		if ( inst.length === 1 ) {
			//  Interpret an object - it is assumed to be another complex instruction
			//  set.
			if ( typeof( inst[0] === "object" ) )
				return this.xPosition( this.xPixel( inst[0] ) );
			else
				return this.xPosition( inst[0] );
		}
		//  If we've reached this point, the first item should be a number representing
		//  one of our instruction options (listed in JDH.js), followed by an appropriate
		//  number of arguments.
		ret = this.instruction( inst );
		if ( ret === null )
			ret = 0;
	}
	return ret;
};

//  This is the y version of the xPixel() function.  Same comments apply.
Component.prototype.yPixel = function( inst ) {
	//  If the instructions are a simple number, the pixel is computed in terms of
	//  the parent component, using the "position rules".
	if ( typeof( inst ) === "number" ) {
		//  If this is the top level component, it will have no parent.  Lacking any
		//  other hint, we simply return the given value.
		if ( this.parent === null )
			var ret = inst;
		//  Otherwise, use the parent and the position rules.
		else
			var ret = this.parent.yPosition( inst, this.ry );
	}
	else {
		//  If the instructions are complex (i.e in the form of an array), find the 
		//  value by interpreting them.
		//  If the first instruction is a string, this is assumed to be a variable
		//  or the name of a component, which we attempt to locate.
		if ( typeof( inst[0] ) === "string" ) {
			//  Check the known variables first.
			ret = this.variable( inst[0] );
			if ( ret !== null )
				return ret;
			var componentPtr = null;
			if ( this.drawing.topLevel !== null )
				componentPtr = this.drawing.topLevel.findChildByName( inst[0] );
			if ( componentPtr === null )
				return this.yPixel( inst.slice( 1 ) );
			else
				return componentPtr.yPixel( inst.slice( 1 ) );
		}
		//  Note we only reach here if the first instruction was not a string!
		//  If there is only one instruction, interpret it in terms of this object's
		//  position.
		if ( inst.length === 1 ) {
			//  Interpret an object - it is assumed to be another complex instruction
			//  set.
			if ( typeof( inst[0] === "object" ) )
				return this.yPosition( this.yPixel( inst[0] ) );
			else
				return this.yPosition( inst[0] );
		}
		//  If we've reached this point, the first item should be a number representing
		//  one of our instruction options (listed in JDH.js), followed by an appropriate
		//  number of arguments.
		ret = this.instruction( inst );
		if ( ret === null )
			ret = 0;
	}
	return ret;
};

//  Returns a value associated with this component using its name.
Component.prototype.variable = function( varName ) {
	if ( varName === "width" )
		return this.drawW;
	if ( varName === "height" )
		return this.drawH;
	if ( varName === "x" )
		return this.drawX;
	if ( varName === "y" )
		return this.drawY;
	return null;
};

//  Returns a value based on an instruction and subsequent values, all contained in
//  an array.
Component.prototype.instruction = function( inst ) {
	switch ( inst[0] ) {
		case X_PROJECTION:
			//  Projections accept all subsequent arguments...however many are required
			//  for the given projection.
			return this.xProjection( inst.slice( 1 ) );
			break;
		case Y_PROJECTION:
			//  Projections accept all subsequent arguments...however many are required
			//  for the given projection.
			return this.yProjection( inst.slice( 1 ) );
			break;
		case ADD:
			//  Interpret the next two items in the array as numbers.
			return this.instValue( inst[1] ) + this.instValue( inst[2] );
			break;
		case SUB:
			//  Interpret the next two items in the array as numbers.
			console.info( this.instValue( inst[1] ) + "   " + this.instValue( inst[2] ) );
			return this.instValue( inst[1] ) - this.instValue( inst[2] );
			break;
		case MUL:
			//  Interpret the next two items in the array as numbers.
			return this.instValue( inst[1] ) * this.instValue( inst[2] );
			break;
		case DIV:
			//  Interpret the next two items in the array as numbers.
			return this.instValue( inst[1] ) / this.instValue( inst[2] );
			break;
	}
	return null;
};

//  Simpler version of the xPixel() and yPixel() functions that just looks for variables
//  and instructions, interpreting numbers as...well, numbers.
Component.prototype.instValue = function( inst ) {
	if ( typeof( inst ) === "number" )
		return inst;
	if ( typeof( inst ) === "string" ) {
		//  Check the known variables first.
		ret = this.variable( inst );
		if ( ret !== null )
			return ret;
		else
			return 0;
	}
	//  Instructions now assumed to be in the form of an array.  If it has a length
	//  of only one, interpret the single value.
	if ( inst.length === 1 )
		return this.instValue( inst[0] );
	//  See if the first item is a component name.
	var componentPtr = null;
	if ( this.drawing.topLevel !== null )
		componentPtr = this.drawing.topLevel.findChildByName( inst[0] );
	if ( componentPtr === null )
		//  Not a component name...assume we have an instruction set.
		ret = this.instruction( inst );
	else
		ret = componentPtr.instValue( inst.slice( 1 ) );
	if ( ret === null )
		ret = 0;
	return ret;
};

//--------------------------------
//  Compute the X positon of a child component (child components call this function)
//  in absolute pixels.  The "val" is the child component's ".x", and "relative" is
//  the child component's ".rx".
//------
Component.prototype.xPosition = function( val, relative ) {
	//  Compute the magnitude of the value in pixels
	if ( relative & FRACTIONAL_SIZE )  //  x location is relative
		var ret = val * this.drawW;
	else
		var ret = val;
	//  Now find the real position, either from the left or, if negative, the right.
	if ( relative & OPPOSING_SIZE )
		ret = this.drawW + ret;
	return ret;
};

//--------------------------------
//  Y version of the xPosition() function.
//------
Component.prototype.yPosition = function( val, relative ) {
	if ( relative & FRACTIONAL_SIZE )  //  y location is relative
		var ret = val * this.drawH;
	else
		var ret = val;
	//  Now find the real position, either from the top or, if OPPOSING_SIZE, the bottom.
	if ( relative & OPPOSING_SIZE )
		ret =  this.drawH + ret;
	return ret;
};

//  Return a "projected" pixel X value, using this component's drawn position and
//  size.  In this simple base class function the "projection" simply becomes an
//  offset from the origin.  Components with complex projections must override this
//  function with something that will translate values into a pixel location.
Component.prototype.xProjection = function( params ) {
	if ( typeof( params ) === "number" )
		return this.drawX + params;
	return this.drawX + params[0];
};

//  Projected Y pixel value.  Also supposed to be overridden.
Component.prototype.yProjection = function( params ) {
	if ( typeof( params ) === "number" )
		return this.drawY + params;
	return this.drawY + params[0];
};

//  Perform any unusual tasks in response to a component resize.  Sizes are known
//  already (this.drawX, etc.).
Component.prototype.resizeHandler = function() {
};

//  Resize all children - applying the "resizeToo()" function to them.  This function
//  is used internally for the most part, but can be called at the top level of a
//  drawing to adjust for changes in the HTML window size.  Other items (background,
//  foreground, label) are resized if they exist.
Component.prototype.resizeChildren = function() {
	if ( this.background !== null )
		this.background.resizeToo();
	if ( this.children !== null ) {
		var child = this.children;
		while ( child !== null ) {
			child.resizeToo();
			child = child.next;
		}
	}
	//  Label????
	if ( this.foreground !== null )
		this.foreground.resizeToo();
};

//  This is the generic event handler.  It is expected that this function will be
//  overridden.  Return "true" if the component uses the event - this will "consume"
//  it such that other components don't use it.
//
//  The commmented-out code shows a complete list of events that a component might
//  wish to handle.  Don't uncomment this - it will make your top level trap all
//  events!  Instead copy the parts you need in component code you develop.  If you
//  use an event and don't want other components to respond to it, return "true".
Component.prototype.handle = function( event ) {
//	switch ( event.type ) {
//		case MOUSE_PUSH:
//			console.info( "mouse button push at " + event.px + "," + event.py + " in " + this.label + "\n" );
//			return true;
//			break;
//		case MOUSE_MOVE:
//			console.info( "mouse move at " + event.px + "," + event.py + " in " + this.label + "\n" );
//			return true;
//			break;
//		case MOUSE_RELEASE:
//			console.info( "mouse button release at " + event.px + "," + event.py + " in " + this.label + "\n" );
//			return true;
//			break;
//		case MOUSE_DRAG:
//          if ( getLastEventComponent() === this ) {
//			    console.info( "mouse drag at " + event.px + "," + event.py + " in " + this.label + " distance from start is " +
//					     event.dragX + "," + event.dragY + "\n" );
//			    return true;
//          }
//			break;
//		case MOUSE_WHEEL:
//			console.info( "mouse wheel delta " + event.delta + "\n" );
//			return true;
//			break;
//		default:
//			console.info( "unknown event type!\n" );
//			return true;
//			break;
//	}
	return false;
};

//-----------------------------------------------------------------------------
//  This is the event "pre-handler".  It works exactly like the event handler,
//  except it is implemented before any children are consulted to see if they
//  want the event.  Useful in some cases.
//-----------------------------------------------------------------------------
Component.prototype.prehandle = function( event ) {
	return false;
}

//--------------------------------
//  De-transform the event x and y values in the event this needs to be done.  Because different
//  components may have different transformation matrices we need to make sure the deTransform
//  is done by THIS component before we use it (thus the "deTrasformedBy" check).
//------
Component.prototype.deTransformEvent = function( event ) {
	if ( event.dtx === null || event.deTransformedBy !== this ) {
		var ret = this.deTransform( event.px, event.py );
		event.dtx = ret.x;
		event.dty = ret.y;
	}
	if ( event.type === MOUSE_DRAG ) {
		ret = this.deTransform( event.dragStartX, event.dragStartY );
		event.dragX = event.dtx - ret.x;
		event.dragY = event.dty - ret.y;
	}
	event.deTransformedBy = this;
}

//--------------------------------
//  This function checks child components in reverse order to see if they want an event.  If they don't
//  consume it, try the handler for this component.  This should NOT be overridden.  Note that this
//  component has the opportunity to do something with the event prior to the children using the
//  "rejectEvent()" function.
//------
Component.prototype.tryHandle = function( event ) {
	var ret = false;
	//  Set the "de-transformed" x of this event to null so any functons that need x and y de-tranformed
	//  will know to recompute them.
	event.dtx = null;
	//  Only visible components can trap events!
	if ( this.visible && this.handleEvents && !this.inactiveEvents ) {
		if ( !this.rejectEvent( event ) ) {
			//  See if there is a "pre-handle" of this event - where this component can
			//  grab the event before any children (effectively nullifying the child
			//  model).  See prehandle() for details.
			ret = this.prehandle( event );
			if ( ret )
				setLastEventComponent( this );
			//  Send the component to the foreground - if it exists.
			if ( !ret && this.foreground !== null )
				ret = this.foreground.tryHandle( event );
			//  Send the event to all children, in backwards order, until one of them
			//  wants it.
			if ( !ret && this.children !== null ) {
				var child = this.lastChild;
				while ( !ret && child !== null ) {
					ret = child.tryHandle( event );
					child = child.previous;
				}
			}
			if ( !ret ) {
				//  The most recent child may have de-transformed the x and y positions to satisfy
				//  their positioning, so undo that.
				event.dtx = null;
				ret = this.handle( event );
				if ( ret )
					setLastEventComponent( this );
			}
			//  Still not used?  Send the event to the background to see if it wants it.
			if ( !ret && this.background !== null )
				ret = this.background.tryHandle( event );
			//  Final thing - check if this is a hover event, which might trigger a
			//  tooltip.  We only do this if this component and all of its children
			//  have rejected the event and there is something defined as a tooltip.
			//  I've tried to set these items up such that the "if" fails as early
			//  as possible.
			//  The "tooltipGo" thing causes the tooltip to NOT reappear if the user
			//  moves the mouse within the widget (annoying behavior otherwise).
			if ( this.tooltipDefined && !ret ) {
				if ( this.tooltipGo && event.type === MOUSE_HOVER ) {
					ret = this.executeTooltip( event );
					this.tooltipGo = false;
				}
				else if ( event.type === MOUSE_MOVE && !this.eventInside( event ) )
					this.tooltipGo = true;
			 }
		}
	}
	return ret;
};

//--------------------------------
//  Find the x and y locations within this object from an x and y position on the screen
//  by "de-transforming" the screen x and y.  I think this de-transformation may only work
//  on translation and rotation - not scaling.
//------
Component.prototype.deTransform = function( x, y ) {
	ret = {};
	if ( this.drawnTransform === null ) {
		ret.x = x;
		ret.y = y;
		ret.good = false;
	}
	else {
		//  Compute the inverse transform if we don't have it already.
		if ( this.invT === null ) {
			var dt = this.drawnTransform;
			var det = dt.a * dt.d - dt.c * dt.b;
			this.invT = {};
			if ( det !== 0 ) {
				this.invT.a = dt.d / det;
				this.invT.b = -dt.b / det;
				this.invT.c = -dt.c / det;
				this.invT.d = dt.a / det;
				this.invT.e = ( dt.c * dt.f - dt.e * dt.d ) / det;
				this.invT.f = ( dt.e * dt.b - dt.a * dt.f ) / det;
				this.invT.good = true;
			}
			else {
				//  This just keeps us both from using this transform (because it's junk) and from
				//  continuing to try to compute it.
				this.invT.good = false;
				console.error( "Component::deTransform: determinant is zero" );
			}
		}
		if ( this.invT.good ) {
			ret.x = x * this.invT.a + y * this.invT.c + this.invT.e;
			ret.y = x * this.invT.b + y * this.invT.d + this.invT.f;
			ret.good = true;
		}
		else {
			ret.x = x;
			ret.y = y;
			ret.good = false;
		}
	}
	return ret;
}

//  This is used to assure that there is only one tooltip up at once.
tooltipVisible = null;

//  Try to execute a "tooltip" function for this component.  This is triggered when
//  the user hovers - only here do we check that the hover is over the component (as
//  there are probably other computationally cheaper ways of not getting this far).
//  The tooltip is defined using the "setTooltip()" function.
Component.prototype.executeTooltip = function( event ) {
	//  Only execute if the event is inside.
	if ( this.eventInside( event ) ) {
		if ( this.defaultTooltip !== null ) {
			//  If we are showing this tooltip, get rid of any that is already up.
			if ( tooltipVisible !== null )
				tooltipVisible.setVisible( false );
			this.defaultTooltip.show( event.e.clientX, event.e.clientY );
			tooltipVisible = this.defaultTooltip;
			doOverlayRedraw();
			return true;
		}
	}
	return false;
};

//  Set the tooltip.  This can be a function (like a callback) in which case you can
//  also include a callback component (but don't have to).  The function is passed the
//  event that caused the tooltip as an argument so you can examine that.  If, instead,
//  you set the tooltip to a string, the string will be displayed in a default box.
Component.prototype.setTooltip = function( tooltip, comp ) {
	if ( tooltip === null ) {
		this.tooltipDefined = false;
		return;
	}
	if ( typeof( tooltip ) === "string" ) {
		this.tooltipCallback = null;
		this.defaultTooltip = new Tooltip( tooltip );
		this.tooltipDefined = true;
	}
	else {
		this.tooltipCallback = tooltip;
		this.defaultTooltip = null;
		if ( comp === undefined )
			comp = null;
		this.tooltipDefined = true;
	}
};

//  Set this to false if you want to ignore all events - this also applies to children.
//  This can save a lot of event interpretation time if you have a complex structure
//  below your component that not interested in events.
Component.prototype.setHandleEvents = function( newVal ) {
	this.handleEvents = newVal;
	if ( this.alwaysHandleEvents !== undefined && this.alwaysHandleEvents === true )
		this.handleEvents = true;
};

//  This can be used to "force" the component to handle events.
Component.prototype.forceHandleEvents = function( newVal ) {
	this.alwaysHandleEvents = newVal;
}

//  Check if this component wants to "reject" this event.  This function does nothing and
//  is expected to be overridden.  The model here is that some components may have many
//  complex child components and know well they shouldn't be consulted under certain
//  circumstances.  Overriding this function to return "true" under those circumstances
//  may save a lot of event response time.
Component.prototype.rejectEvent = function( event ) {
	return false;
};

//  Check if an event is "inside" this component.
Component.prototype.eventInside = function( event ) {
	this.deTransformEvent( event );
	if ( event.dtx < this.drawX )
		return false;
	if ( event.dtx > this.drawX + this.drawW )
		return false;
	if ( event.dty < this.drawY )
		return false;
	if ( event.dty > this.drawY + this.drawH )
		return false;
	return true;
};

//  Check if an x, y positions is "inside" this component.
Component.prototype.isInside = function( x, y ) {
	if ( x < this.drawX )
		return false;
	if ( y < this.drawY )
		return false;
	if ( x > this.drawX + this.drawW )
		return false;
	if ( y > this.drawY + this.drawH )
		return false;
	return true;
};

//  Check if only an x position is inside the component.  This might be useful
//  separately rather than using "isInside".
Component.prototype.xInside = function( x ) {
	if ( x < this.drawX )
		return false;
	if ( x > this.drawX + this.drawW )
		return false;
	return true;
}

//  Same for y.  See above.
Component.prototype.yInside = function( y ) {
	if ( y < this.drawY )
		return false;
	if ( y > this.drawY + this.drawH )
		return false;
	return true;
}

//  Functions to return the current position and size of this component (drawn).
Component.prototype.getX = function() {
	return this.x;
};
Component.prototype.getY = function() {
	return this.y;
};
Component.prototype.getW = function() {
	return this.w;
};
Component.prototype.getH = function() {
	return this.h;
};

//  This is the drawn position of this component - the "drawX", which is the
//  actual pixel location, subtracting any parent "drawX", such that it is the
//  pixel offset from the parent.
// Component.prototype.getDrawnX = function() {
// 	if ( this.parent !== null )
// 		return this.drawX - this.parent.drawX;
// 	else
// 		return this.drawX;
// }

// //  Same for Y
// Component.prototype.getDrawnY = function() {
// 	if ( this.parent !== null )
// 		return this.drawY - this.parent.drawY;
// 	else
// 		return this.drawY;
// }

//  This is included here to avoid circular includes
//=============================================================================
//  Tooltip
//  
//  The Tooltip component is meant to serve as a popup informational aide.  It
//  can contain text, and possibly other stuff.  Its size is determined by the
//  stuff it is meant to contain.  
//
//=============================================================================
//=============================================================================
//  Popup
//  
//  The Popup component creates a window in the overlay layer of a drawing.  When shown, it is
//  drawn on top of everything else (so it must be the last thing in the overlay).  It has some
//  options that give it "window-like" capabilities.  These include:
//    *  A title bar with a control for closing and iconizing he window.
//    *  The window can be resized using its corners - by default this is on.
//    *  The window can be given a frame.  By default there is no frame.
//    *  The title bar, frame, and window background can have different paints.
//    *  By default the container window has a shadow.  You can control this using
//       setShadow().
//
//=============================================================================
//=============================================================================
//  Text
//  
//  Draw some text.  The user specifies an x,y postion, the text itself, and an
//  optional "alignment".  Alignment determines where a "box" containing the text 
//  is drawn relative to the x,y position.
//
//  "Justification", which determines where text is drawn within the "box" is
//  handled by the Component.drawText() function.
//  
//  The text that is drawn is stored in the label of this component.
//=============================================================================

//=============================================================================
//  These are the alignment values.  These answer the question "where is my text
//  relative to my defined x,y point".  For instance, if you want your text to appear
//  to the upper right of your x,y point (such that x,y is the traditional anchor
//  point for text) you specify "ALIGN_ABOVE_RIGHT".  Up/down specifications appear
//  first, options are "ABOVE", "BELOW", and "CENTERED".  Left/right specifications
//  are after, options are "LEFT", "RIGHT", and "MIDDLE".  There are 9 possible
//  combinations.
//=============================================================================
var ALIGN_ABOVE_RIGHT             = 0;  //  Default
var ALIGN_ABOVE_LEFT              = 1;
var ALIGN_CENTERED_LEFT           = 2;
var ALIGN_BELOW_RIGHT             = 3;
var ALIGN_CENTERED_RIGHT          = 4;
var ALIGN_BELOW_LEFT              = 5;
var ALIGN_BELOW_MIDDLE            = 6;
var ALIGN_ABOVE_MIDDLE            = 7;
var ALIGN_CENTERED_MIDDLE         = 8;

class Text extends Component {
	
	constructor( x, y, textString ) {
		super( x, y, 1, 1, textString );
		this.xOffset = 0;
		this.yOffset = 0;
		this.textX = x;
		this.textY = y;
		this.alignment = ALIGN_ABOVE_RIGHT;
		this.textBox = null;  //  This tracks the x, y, w and h of the last drawn text.
		this.textData = null;
	}

	//--------------------------------
	//  Offsets are applied to move the x,y position relative to the specified alignment.
	//  Offsets are measured in pixels.
	//------
	setOffsets( newx, newy ) {
		this.xOffset = newx;
		this.yOffset = newy;
	};

	//--------------------------------
	//  Set whether the text is filled or outlined.
	//------
	setAlignment( newVal ) {
		this.alignment = newVal;
	};

	//--------------------------------
	//  Return the current alignment.
	//------
	getAlignment() {
		return this.alignment;
	};

	//--------------------------------
	//  Override setXY() to set the "textX" and "textY" values.
	//------
	setXY( nx, ny ) {
		this.textX = nx;
		this.textY = ny;
		Component.prototype.setXY.call( this, nx, ny );
	}

	setText( newVal ) {
		super.setText( newVal );
		this.doRedraw();
	};

	//--------------------------------
	//  Measure the text that will be drawn using all existing instructions and
	//  font settings.  Use the measurements to determine where to draw the text
	//  based on alignment settings.
	//
	//  Note that the "alignment" is not the same as "justification".  Alignment defines
	//  where to anchor a box that surrounds text relative to the x, y position
	//  of this component - this box is determined by the "measureText" function call.
	//  Justification defines how the text is drawn inside that box - a task handled
	//  by the "drawText" call.
	//
	//  All information about the text that we can glean is saved so that higher
	//  level functions can access it.  Because "measureText()" is somewhat 
	//  time-intensive, this should be the only place it is called for normal
	//  text drawing.
	//------
	preSettings( ins ) {
		//  Measure the text.  This returns information about the size and location
		//  of all drawn characters in the text.  Formatting instructions in the
		//  text will be accommodated by these measurments.  These data can be used
		//  for things like highlighting.
		if ( this.label.length === 0 ) {
			this.textData = null;
			return;
		}
		this.textData = this.measureText( ins, this.label );
		//  A number of parameters are saved that describe boxes that contain the
		//  text.  There are a few subtle differences between different containment
		//  boxes, most of which are insignificant.  
		//      "baseX" and "baseY"" are provided for convenience, but they are both
		//             always 0.0.
		//      "baseW" is the width of the base of the longest line of text.  
		//             This width will take you to the right edge of the BASE of
		//             the text - note that some text can "overhang" this edge
		//             (italic, for instance, will lean to the right).
		//      "baseH" is the distance from the base of the bottom line of text
		//             to the top of the DRAWN text in the top line.  This will
		//             change if you use taller or shorter letters.
		//      "fontX" is the distance from "base" x to the start of the left-most
		//             character in the text.  This is a negative number, and
		//             usually very small.  Unless you make your text huge you
		//             won't notice it.
		//      "fontY" is a positive number representing the y offset from the
		//             "base" y that will contain any descent in drawn letters in
		//             the lowest line of text.
		//      "fontW" is the width from the position represented by "font" x
		//             to the right-most drawn character - this will contain things
		//             like italic overhangs.
		//      "fontH" is the height of the text from the position represented
		//             by "font" y to the font boundary above the top line of text.
		//             The font boundary is effectively a pad to balance the
		//             descent in "font" y.
		//
		//  The values can be combined however you like.  Recall that y values are
		//  measured with positive down.
		//
		//  Some other values are collected:
		//      "topLineBaseH" and "topLineFontH" are the height of the top line.
		//      "fontOverW" is the maximum "overhang" on the right edge beyond the
		//             base (similar to "fontX").
		//      "fontOverH" is the maximum descent of the bottom line.
		//  Different values are used to determine a box surrounding text, which is
		//  used in this function to determine where to draw the text.  Text drawing
		//  starts at the base of the first line - because that's where the drawText()
		//  function starts.
		this.baseX = 0.0;
		this.baseY = 0.0;
		this.baseW = this.textData.jdhWidth;
		this.baseH = ins.fontSize / 1.25;  //  Rough guess that will apply only to empty lines
		for ( var i = 0; i < this.textData.byLineCharData[0].length; ++i ) {
			if ( this.textData.byLineCharData[0][i].actualBoundingBoxAscent > this.baseH )
				this.baseH = this.textData.byLineCharData[0][i].actualBoundingBoxAscent;
		}
		this.topLineBaseH = this.baseH;
		for ( var i = 1; i < this.textData.byLineCharData.length; ++i )
		this.baseH += this.textData.lineHeights[i];

		//  For the "font height", find the ascent of the highest characters in the top line.
		this.fontH = ins.fontSize / 1.11;
		for ( var i = 0; i < this.textData.byLineCharData[0].length; ++i ) {
			if ( this.textData.byLineCharData[0][i].fontBoundingBoxAscent > this.fontH )
			this.fontH = this.textData.byLineCharData[0][i].fontBoundingBoxAscent;
		}
		//  Save that off.
		this.topLineFontH = this.fontH;
		//  Add the known height of each line.
		for ( var i = 1; i < this.textData.byLineCharData.length; ++i )
			this.fontH += this.textData.lineHeights[i];
		//  Then add the maximum descent of the final line.
		if ( this.textData.byLineCharData[this.textData.byLineCharData.length - 1].length > 0 )
			this.fontOverH = this.textData.byLineCharData[this.textData.byLineCharData.length - 1][0].fontBoundingBoxDescent
		else
			this.fontOverH = 0.0;
		for ( var i = 1; i < this.textData.byLineCharData[this.textData.byLineCharData.length - 1].length; ++i ) {
			if ( this.textData.byLineCharData[this.textData.byLineCharData.length - 1][i].fontBoundingBoxDescent > this.fontOverH )
			this.fontOverH = this.textData.byLineCharData[this.textData.byLineCharData.length - 1][i].fontBoundingBoxDescent;
		}
		this.fontH += this.fontOverH;

		//  Find the maximum overhang on the left and right side (the left, "fontX", will be negative).
		this.fontX = 0.0;
		this.fontOverW = 0.0;
		for ( var i = 0; i < this.textData.byLineCharData.length; ++i ) {
			if ( this.textData.byLineCharData[i].length > 0 ) {
				if ( this.textData.byLineCharData[i][0].actualBoundingBoxLeft < this.fontX )
					this.fontX = this.textData.byLineCharData[i][0].actualBoundingBoxLeft;
				if ( ( this.textData.byLineCharData[i][this.textData.byLineCharData[i].length - 1].actualBoundingBoxRight - this.textData.byLineCharData[i][this.textData.byLineCharData[i].length - 1].width ) > this.fontOverW )
					this.fontOverW = this.textData.byLineCharData[i][this.textData.byLineCharData[i].length - 1].actualBoundingBoxRight - this.textData.byLineCharData[i][this.textData.byLineCharData[i].length - 1].width;
				}
		}
		//  Generate the "fontW" using these value.
		this.fontW = this.baseW + this.fontOverW - this.fontX;

		//this.rectangle.resize( 0, -this.topLineBaseH, this.baseW, this.baseH );
		//this.rectangle.resize( 0, -this.topLineFontH, this.baseW, this.fontH );
		//this.rectangle.resize( this.fontX, -this.topLineFontH, this.fontW, this.fontH );
	}

	//--------------------------------
	//  Draw the text.  The alignment and offset instructions are used to figure out
	//  where to put it first.
	//
	//  Note that the "alignment" is not the same as "justification".  Alignment defines
	//  where to anchor a box that surrounds text relative to the x, y position
	//  of this component - this box is determined by the "measureText" function call.
	//
	//  Justification defines how the text is drawn inside that box - a task handled
	//  by the "drawText" call.
	//------
	draw( ins ) {
		//  Now figure out where to put it based on alignment instructions.  Start
		//  with the anchor point.
		var x = this.drawX;
		var y = this.drawY;
		//  Change the x and y to match the alignment.
		switch ( this.alignment ) {
			default:
			case ALIGN_ABOVE_RIGHT:
				//  This is the default, because this is where text position is
				//  traditionally defined.  The bottom, left edge of the last line
				//  of text will be the anchor point.
				y = y - ( this.baseH - this.topLineBaseH );  
				break;
			case ALIGN_ABOVE_LEFT:
				y = y - ( this.baseH - this.topLineBaseH );  
				x = x - this.baseW;
				break;
			case ALIGN_CENTERED_LEFT:
				x = x - this.baseW;
				y = y + this.topLineFontH - this.fontH / 2.0;
				break;
			case ALIGN_BELOW_RIGHT:
				y = y + this.topLineFontH;
				break;
			case ALIGN_CENTERED_RIGHT:
				y = y + this.topLineFontH - this.fontH / 2.0;
				break;
			case ALIGN_BELOW_LEFT:
				x = x - this.baseW;
				y = y + this.topLineFontH;
				break;
			case ALIGN_BELOW_MIDDLE:
				x = x - this.baseW / 2.0;
				y = y + this.topLineFontH;
				break;
			case ALIGN_ABOVE_MIDDLE:
				y = y - ( this.baseH - this.topLineBaseH );  
				x = x - this.baseW / 2.0;
				break;
			case ALIGN_CENTERED_MIDDLE:
				x = x - this.baseW / 2.0;
				y = y + this.topLineFontH - this.fontH / 2.0;
				break;
		}
		x += this.xOffset;
		y += this.yOffset;
		this.drawnXPos = x;
		this.drawnYPos = y;
		//  Draw based on fill instructions.
		this.drawText( ins, this.label, x, y );
	}

}

//=============================================================================
//  This class holds a Text component, allowing the separation of x,y offset
//  (which is applied here) and rotation (which is applied to the Text component).
//  Mostly its a bunch of pass-through functions.
//=============================================================================
class TextHolder extends Component {

	constructor( x, y, textString ) {
		super( x, y, 1, 1 );
		this.text = new Text( 0, 0, textString );
		this.add( this.text );
	}
	setText( newVal ) { this.text.setText( newVal ); }
	setAlignment( newVal ) { this.text.setAlignment( newVal ); }
	getAlignment() { return this.text.getAlignment(); }
	setOffset( x, y ) { this.text.setOffset( x, y ); }
	setHeightFactor( newVal ) { this.text.setHeightFactor( newVal ); }
	setRotate( newVal ) { this.text.setRotate( newVal ); }
}
//  Frame
//  
//  The Frame component is a container for other components.  It is drawn
//  with a background, a frame, and optional clipping of all child 
//  components (on by default).  The background and frame are actually components,
//  so they can be whatever you want - the only thing unique about them is that
//  the background will be drawn before all children and the frame will be
//  drawn after all children.
//  
//  There isn't much to this component - it is here mostly for historical reasons,
//  but exists as a (possibly) useful default form of the Component.  Maybe there
//  will be more to it in the future?
//=============================================================================
//  Basic Drawing Components
//  
//  There are a whole pile of components here used to make basic, low-level drawings.
//  They mirror JavaScript capabilites generally (rectangles, etc.) with some
//  augmentation to make them more like what I am used to.  I'm trying to maintain
//  drawing efficiency where I can.
//=============================================================================

//=============================================================================
//  Rectangle
//=============================================================================
class Rectangle extends Component {
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
	}

	draw( ins ) {
		ins.ctx.strokeRect( this.drawX, this.drawY, this.drawW, this.drawH );
	}

}

//=============================================================================
//  FillRectangle
//=============================================================================
class FillRectangle extends Component {
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
	}

	draw( ins ) {
		ins.ctx.fillRect( this.drawX, this.drawY, this.drawW, this.drawH );
	}

}

//=============================================================================
//  Arc
//
//  An outline circle (or portion of one), drawn within the bounding square.
//=============================================================================
class Arc extends Component {
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		this.angle1 = 0;
		this.angle2 = 2 * Math.PI;
	}

	//  Set angles in radians
	setAngles( ang1, ang2 ) {
		this.angle1 = ang1;
		this.angle2 = ang2;
	}

	draw( ins ) {
		//  Find the center.
		var centerX = this.drawX + this.drawW / 2.0;
		var centerY = this.drawY + this.drawH / 2.0;
		if ( this.drawW > this.drawH )
			var rad = this.drawH / 2.0;
		else
			var rad = this.drawW / 2.0;
		ins.ctx.beginPath();
		ins.ctx.arc( centerX, centerY, rad, this.angle1, this.angle2 );
		ins.ctx.stroke();
	}

}

//=============================================================================
//  FillArc
//
//  A filled circle (or portion of one), drawn within the bounding square.
//  If less than a full circle, this is drawn as a "segment", with a
//  straight connection between the two ends of the arc.
//=============================================================================
class FillArc extends Component {
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		this.angle1 = 0;
		this.angle2 = 2 * Math.PI;
	}

	//  Set angles in radians
	setAngles( ang1, ang2 ) {
		this.angle1 = ang1;
		this.angle2 = ang2;
	}

	draw( ins ) {
		//  Find the center at the current scale.
		var centerX = this.drawX + this.drawW / 2.0;
		var centerY = this.drawY + this.drawH / 2.0;
		if ( this.drawW > this.drawH )
			var rad = this.drawH / 2.0;
		else
			var rad = this.drawW / 2.0;
		ins.ctx.beginPath();
		ins.ctx.arc( centerX, centerY, rad, this.angle1, this.angle2 );
		ins.ctx.fill();
	}

}

//=============================================================================
//  FillSector
//
//  A filled circle (or portion of one), drawn within the bounding square.
//  A "sector" extends to the circle center.
//=============================================================================
class FillSector extends Component {
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		this.angle1 = 0;
		this.angle2 = 2 * Math.PI;
	}

	//  Set angles in radians
	setAngles( ang1, ang2 ) {
		this.angle1 = ang1;
		this.angle2 = ang2;
	}

	draw( ins ) {
		//  Find the center.
		var centerX = this.drawX + this.drawW / 2.0;
		var centerY = this.drawY + this.drawH / 2.0;
		if ( this.drawW > this.drawH )
			var rad = this.drawH / 2.0;
		else
			var rad = this.drawW / 2.0;
		ins.ctx.beginPath();
		ins.ctx.moveTo( centerX, centerY );
		ins.ctx.arc( centerX, centerY, rad, this.angle1, this.angle2 );
		ins.ctx.fill();
	}

}

//=============================================================================
//  ImageRectangle
//
//  Fills the rectangle with an image - this is similar, but not exactly like
//  paint - in this component the image will be stretched to fill the available
//  space.
//=============================================================================
class ImageRectangle extends Component {

	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		this.dimg = null;
		this.inputData = null;
		this.data = null;
		this.fill = true;
		this.smooth = true;
		this.screenCtx = null;
		this.sourceWidth = null;
		this.sourceHeight = null;
		this.savedImage = null;
		this.xScale = 1.0;
		this.yScale = 1.0;
		this.xOffset = 0.0;
		this.yOffset = 0.0;
	}

	//  Set the image to the given source file.  This file needs to be accessible when the
	//  page is loaded by the user.
	source( sourceFile ) {
		this.dimg = new Image();
		this.dimg.src = sourceFile;
	}

	//  Meant to read files internally...this function generates an Image() instance.
	sourceToImage( sourceFile ) {
		return new Promise ( function( resolve, reject ) {
			var img = new Image();
			//img.crossOrigin = "Anonymous";
			img.onload = function() {
				resolve( img );
			}
			img.onError = function() {
				reject( img );
			}
			img.src = sourceFile;
		} );
	}

	//  Create an Image instance from an ImageData instance.
	dataToImage( imagedata ) {
		return new Promise ( function( resolve, reject ) {
			var canvas = document.createElement( 'canvas' );
			var ctx = canvas.getContext( '2d' );
			canvas.width = imagedata.width;
			canvas.height = imagedata.height;
			ctx.putImageData( imagedata, 0, 0 );
			var img = new Image();
			img.onload = function() {
				resolve( img );
			}
			img.onError = function() {
				reject( img );
			}
			img.src = canvas.toDataURL();
		} );
	}

	//  Set the image from the given source file and return an "Image()" instance that
	//  can be displayed in the draw() function.  This is an asynchronous process, so
	//  a "promise" is generated that triggers the callback when it is done.  This function
	//  was written that it would be used internally.
	setFromSource( sourceFile ) {
		Promise.all([this.sourceToImage( sourceFile ), this]).then( function( stuff ) {
			//  Set the image data to the result.
			stuff[1].dimg = stuff[0];
			//  Trigger the callback
			stuff[1].doCallback();
		}, function( hey ) {
			console.info( "sourceToImage() blew up in the ImageRectangle class -- " + hey + "\n" );
		} );
	}

	//  Internally-used function to draw data from a source on an off-screen location and grab
	//  it.
	grabOffScreenImage( image ) {
		return new Promise ( function( resolve, reject ) {
			var canvas = document.createElement( 'canvas' );
			var ctx = canvas.getContext( '2d' );
			canvas.width = image.width;
			canvas.height = image.height;
			ctx.drawImage( image, 0, 0 );
			var img = new Image();
			img.crossOrigin = "Anonymous";
			img.onload = function() {
				resolve( img );
			}
			img.onError = function() {
				reject( img );
			}
			img.src = canvas.toDataURL();
		} );
	}

	//  Read a file, then draw it off-screen.  Set the context such that a "getData()" call will
	//  read the off-screen data.
	getFromSource( sourceFile ) {
		//  If this function is called with an empty argument, return the most recent
		//  image data (from a previous call to this function WITH an argument).
		if ( sourceFile === undefined || sourceFile === null )
			return this.savedImage;
		//  Otherwise this is a dual-promise activity.  First we must generate an Image()
		//  instance from the source file.
		Promise.all([this.sourceToImage( sourceFile ), this]).then( function( stuff ) {
			//  Draw the source off-screen.  This will return an Image() instance.
			var canvas = document.getElementById( "hidden" );//createElement( 'canvas' );
			var ctx = canvas.getContext( '2d' );
			canvas.width = stuff[0].width;
			canvas.height = stuff[0].height;
			canvas.style.visibility = "hidden";
			ctx.drawImage( stuff[0], 0, 0 );
			stuff[1].savedImage = ctx.getImageData( 0, 0, stuff[0].width, stuff[0].height );
			console.info( "drew " + stuff[0].width + ", " + stuff[0].height + "\n" );
			// Promise.all([stuff[1].grabOffScreenImage( stuff[0] ), stuff[1]]).then( 
			// 	function( newStuff ) {
			// 		newStuff[1].savedImage = newStuff[0];
			// 		newStuff[1].doCallback();
			// 	}, function( newHey ) {
			// 		console.info( "grabOffScreenImage() blew up in the ImageRectangle class -- " + newHey + "\n" );
			// 	}
			// );
			stuff[1].doCallback();
		}, function( hey ) {
			console.info( "sourceToImage() blew up in the ImageRectangle class -- " + hey + "\n" );
		} );
	}

	//  Return the width and height of the current image, if there is one.
	getWidth() {
		if ( this.dimg === null )
			return 0;
		else
			return this.dimg.width;
	}

	getHeight() {
		if ( this.dimg === null )
			return 0;
		else
			return this.dimg.height;
	}

	//  Set the image to a bunch of pixel data contained in an array, along with image
	//  dimensions.  The array needs four integers per pixel in the image (R,G,B,A).
	//  When the image creation is complete, a callback is triggered.
	setFromData( imageData ) {
		if ( browserType() === SAFARI ) {  // Safari doesn't have createImageBitmap() for some reason.
			Promise.all([this.dataToImage( imageData ), this]).then( function( stuff ) {
				//  Set the image data to the result.
				stuff[1].dimg = stuff[0];
				//  Trigger the callback
				stuff[1].doCallback();
			}, function( hey ) {
				console.info( "dataToImage() blew up in the ImageRectangle class -- " + hey + "\n" );
			} );
		}
		else {
			Promise.all([createImageBitmap( imageData, 0, 0, imageData.width, imageData.height ), this]).then( function( stuff ) {
				//  Set the image data to the result.
				stuff[1].dimg = stuff[0];
				//  Trigger the callback
				stuff[1].doCallback();
			}, function( hey ) {
				console.info( "createImageBitmap blew up in the ImageRectangle class -- " + hey + "\n" );
			} );
		}
	}

	//  Generate an image data array.  You can change the data in the array by setting individual
	//  components to byte values (0-255).  There are four values for each pixel (R, G, B, A).
	//  Use "setData()" with these data as an argument to draw the image.
	getNewData( width, height ) {
		return new ImageData( new Uint8ClampedArray( 4 * width * height ), width, height );
	}

	//  Grab a portion of the current drawn screen.  This will only work AFTER this instance
	//  has been drawn at least once, as it requires a context.  The x and y values are relative
	//  to the context (the drawing area), NOT this ImageRectangle class instance.
	getScreenData( x, y, w, h ) {
		if ( this.screenCtx === null )
			return this.getNewData( w, h );
		else {
			if ( x === undefined ) x = 0;
			if ( y === undefined ) y = 0;
			if ( w === undefined ) {
				w = this.getW();
			}
			if ( h === undefined ) {
				h = this.getH();
			}
			return this.screenCtx.getImageData( x, y, w, h );
		}
	};

	//  Turn on (or off) the "fill" setting.  If fill is on (it is by default), the image
	//  will be stretched to fill the component size.  If not, it will be drawn to scale.
	setFill( newFill ) {
		this.fill = newFill;
	};

	//  By default, anti-aliasing of image pixels is used when changing stretching an image
	//  to fill a space.  You can turn this behavior on or off with this function - but it 
	//  will only apply to this image if you turn it off.
	setSmooth( newVal ) {
		this.smooth = newVal;
	};

	//  Set the "scale" of this image.  This allows the image to be sized differently
	//  independent of its parent.  This works when "fill" is on.
	setScale( x, y ) {
		this.xScale = x;
		if ( y === undefined || y === null )
			this.yScale = x;
		else
			this.yScale = y;
	};

	//  Set offsets for drawing this image.  Works when "fill" is true.  The offset is given in
	//  image pixels.
	setOffset( x, y ) {
		this.xOffset = x;
		this.yOffset = y;
	}

	draw( ins ) {
		this.screenCtx = ins.ctx;
		if ( this.dimg !== null ) {
			if ( this.fill ) {
				if ( !this.smooth ) {
					//  Turn off anti-aliasing if the user requested it.
					ins.ctx.imageSmoothingEnabled = false;
					ins.ctx.mozImageSmoothingEnabled = false;
					ins.ctx.webkitImageSmoothingEnabled = false;
					ins.ctx.msImageSmoothingEnabled = false;
				}
				ins.ctx.drawImage( this.dimg, this.drawX + this.xOffset, this.drawY + this.yOffset, this.xScale * this.drawW, this.yScale * this.drawH );
				if ( !this.smooth ) {
					//  Restore anti-aliasing.
					ins.ctx.imageSmoothingEnabled = true;
					ins.ctx.mozImageSmoothingEnabled = true;
					ins.ctx.webkitImageSmoothingEnabled = true;
					ins.ctx.msImageSmoothingEnabled = true;
				}
			}
			else
				ins.ctx.drawImage( this.dimg, this.drawX, this.drawY );
		}
	}

}

//=============================================================================
//  A Path component contains the instructions for drawing a path.  It doesn't legally
//  draw anything itself - it serves as a base class for different path types (line path,
//  loop, filled, clip path, etc.).  You add items to it in the order they
//  are to appear as part of the path using the functions matching each item type.
//=============================================================================
class Path extends Component {
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		this.scaledDrawing = false;
		this.itemList = [];
		//  Different types of path items.  The user can add items directly or use
		//  functions associated with them in the Path component.
		this.MOVETO                  = 0;
		this.LINETO                  = 1;
		this.ARCTO                   = 2;
		this.BEZIER_CURVE_TO         = 3;
		this.QUAD_CURVE_TO           = 4;
		this.ARC                     = 5;
	}

	//  Remove all items in the item list so this component will draw nothing.
	clearPoints() {
		this.itemList = [];
	}

	//  Turn on/off "scaled" drawing.  By default this is off - it will cause drawings to
	//  rescale themselves to fit the component.  Sometimes you might want this, such as
	//  when drawing a frame of a component.
	setScaledDrawing( newVal ) {
		this.scaledDrawing = newVal;
	}

	//  Add a "moveto" instruction.  I'm making these commands sort of case insensitive
	//  to accomodate JavaScript and my own conventions.
	moveTo( x, y ) { return this.moveto( x, y ); };
	moveto( x, y ) {
		var thisItem = {};
		thisItem.type = this.MOVETO;
		thisItem.x = x;
		thisItem.y = y;
		this.itemList.push( thisItem );
		return thisItem;
	}

	//  Add a "lineto" instruction.
	lineTo( x, y ) { return this.lineto( x, y ); };
	lineto( x, y ) {
		var thisItem = {};
		thisItem.type = this.LINETO;
		thisItem.x = x;
		thisItem.y = y;
		this.itemList.push( thisItem );
		return thisItem;
	}

	//  Add an "arcto" instruction.  The arguments are x,y or the start position, x,y of the end
	//  position, and r, the radius of the arc.
	arcTo( x1, y1, x2, y2, r ) { return this.arcto( x1, y1, x2, y2, r ); };
	arcto( x1, y1, x2, y2, r ) {
		var thisItem = {};
		thisItem.type = this.ARCTO;
		thisItem.x1 = x1;
		thisItem.y1 = y1;
		thisItem.x2 = x2;
		thisItem.y2 = y2;
		thisItem.r = r;
		this.itemList.push( thisItem );
		return thisItem;
	}

	//  Add a Bezier curve.  This involves three points, each with x,y.  The item is returned
	//  so you can change it!
	bezierTo( x1, y1, x2, y2, x3, y3 ) { return this.bezierto( x1, y1, x2, y2, x3, y3 ); };
	bezierto( x1, y1, x2, y2, x3, y3 ) {
		var thisItem = {};
		thisItem.type = this.BEZIER_CURVE_TO;
		thisItem.x1 = x1;
		thisItem.y1 = y1;
		thisItem.x2 = x2;
		thisItem.y2 = y2;
		thisItem.x3 = x3;
		thisItem.y3 = y3;
		this.itemList.push( thisItem );
		return thisItem;
	}

	//  This function does the path drawing.  It needs to be wrapped in the inheriting class
	//  to draw properly - don't call it at user-level.  Positions are scaled to the component
	//  that contains them if "scaledDrawing" is set (by default it is not).  It means positions
	//  must be specified as a fraction of 1.0.
	drawItems( ins ) {
		var len = this.itemList.length;
		//  Step through the instruction set.
		for ( var i = 0; i < len; ++i ) {
			var thisItem = this.itemList[i];
			if ( thisItem.type === this.MOVETO ) {
				if ( this.scaledDrawing ) {
					ins.ctx.moveTo( this.drawX + thisItem.x * this.drawW, this.drawY + thisItem.y * this.drawH );
				}
				else
					ins.ctx.moveTo( this.drawX + thisItem.x, this.drawY + thisItem.y );
			}
			else if ( thisItem.type === this.LINETO ) {
				if ( this.scaledDrawing ) {
					ins.ctx.lineTo( this.drawX + thisItem.x * this.drawW, this.drawY + thisItem.y * this.drawH );
				}
				else
					ins.ctx.lineTo( this.drawX + thisItem.x, this.drawY + thisItem.y );
			}
			else if ( thisItem.type === this.BEZIER_CURVE_TO ) {
				if ( this.scaledDrawing ) {
					ins.ctx.bezierCurveTo( this.drawX + thisItem.x1 * this.drawW, this.drawY + thisItem.y1 * this.drawH,
						this.drawX + thisItem.x2 * this.drawW, this.drawY + thisItem.y2 * this.drawH,
						this.drawX + thisItem.x3 * this.drawW, this.drawY + thisItem.y3 * this.drawH );
				}
				else
					ins.ctx.bezierCurveTo( this.drawX + thisItem.x1, this.drawY + thisItem.y1,
						this.drawX + thisItem.x2, this.drawY + thisItem.y2,
						this.drawX + thisItem.x3, this.drawY + thisItem.y3 );
			}
			else if ( thisItem.type === this.ARCTO ) {
				if ( this.scaledDrawing ) {
					ins.ctx.arcTo( this.drawX + thisItem.x1 * this.drawW, this.drawY + thisItem.y1 * this.drawH,
						this.drawX + thisItem.x2 * this.drawW, this.drawY + thisItem.y2 * this.drawH, thisItem.r * this.drawH );
					//ins.ctx.lineTo( this.drawX + thisItem.x1 * this.drawW, this.drawY + thisItem.y1 * this.drawH );
					//ins.ctx.lineTo( this.drawX + thisItem.x2 * this.drawW, this.drawY + thisItem.y2 * this.drawH );
				}
				else
					ins.ctx.arcTo( this.drawX + thisItem.x1, this.drawY + thisItem.y1, 
						this.drawX + thisItem.x2, this.drawY + thisItem.y2, thisItem.r );
			}
		}
	}

}

//=============================================================================
//  This is a "line" path, which connects points with a line, terminating in
//  the last specified point.
//=============================================================================
class LinePath extends Path {
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
	}

	//  The instructions for a line do not close the path.
	draw( ins ) {
		ins.ctx.beginPath();
		this.drawItems( ins );
		ins.ctx.stroke();
	}

}

//=============================================================================
//  This is a "loop" path, which connects points with a line that returns to
//  the first point.
//=============================================================================
class LoopPath extends Path {
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
	}

	//  Close the path.
	draw( ins ) {
		ins.ctx.beginPath();
		this.drawItems( ins );
		ins.ctx.closePath();
		ins.ctx.stroke();
	}

}

//=============================================================================
//  This is a "filled" path.
//=============================================================================
class FillPath extends Path {
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
	}

	//  Close the path.
	draw( ins ) {
		ins.ctx.beginPath();
		this.drawItems( ins );
		ins.ctx.closePath();
		ins.ctx.fill();
	}

}

//=============================================================================
//  Line (between two points)
//=============================================================================
class Line extends LinePath {
	constructor( x1, y1, x2, y2, label ) {
		super( x1, y1, x2 - x1, y2 - y1, label );
		this.moveTo( 0, 0 );
		this.lineTo( x2 - x1, y2 - y1 );
	}

}

class ScaledLine extends Line {
	constructor( x1, y1, x2, y2, label ) {
		super( x1, y1, x2, y2, label );
		this.setScaledDrawing( true );
	}

}

class Frame extends Component {
	
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		//  Add a default background - filled rectangle of color.
		this.setBackground( new FillRectangle( 0, 0, 0, 0, null ) );
		//  And a default foreground - a rectangle outline.
		this.setForeground( new Rectangle( 0, 0, 0, 0, null ) );
		//  Use the label value to actually label this frame.
		this.frameLabel = null;
		//this.setLabel( label );
	}

	//  Make the frame a simple outline.  I'm not deleting the old frame - hopefully
	//  there is some sort of garbage collector.
	outlineFrame() {
		this.setForeground( new Rectangle( 0, 0, 1, 1, null ) );
	};

	//  Get rid of any drawn frame.  Oddly enough, this has some uses.
	noFrame() {
		this.setForeground( null );
	};

	//  Make the frame of this object a "3D" thing.  If it is "up" (the default),
	//  it is illuminated on the top and left sides, and shadowed on the bottom and
	//  right.  At the moment I'm freezing the colors - but obviously this isn't a
	//  good permanent solution.  Something to think about.
	boxFrame( isDown ) {
		if ( this.illuminatedPaint === undefined || this.illuminatedPaint === null )
			this.illuminatedPaint = rgb( 255, 255, 255 );
		if ( this.shadowedPaint === undefined || this.shadowedPaint === null )
			this.shadowedPaint = rgb( 100, 100, 100 );
		this.setForeground( new Component( 0, 0, 1, 1 ) );
		this.lowerRight = new LinePath( 0, 0, 1, 1 );
		this.lowerRight.setScaledDrawing( true );
		this.lowerRight.moveTo( 0, 1 );
		this.lowerRight.lineTo( 1, 1 );
		this.lowerRight.lineTo( 1, 0 );
		this.getForeground().add( this.lowerRight );
		this.upperLeft = new LinePath( 0, 0, 1, 1 );
		this.upperLeft.setScaledDrawing( true );
		this.upperLeft.moveTo( 1, 0 );
		this.upperLeft.lineTo( 0, 0 );
		this.upperLeft.lineTo( 0, 1 );
		this.getForeground().add( this.upperLeft );
		if ( isDown === undefined || !isDown ) {
			this.upperLeft.setStrokePaint( this.illuminatedPaint );
			this.lowerRight.setStrokePaint( this.shadowedPaint );
		}
		else {
			this.lowerRight.setStrokePaint( this.illuminatedPaint );
			this.upperLeft.setStrokePaint( this.shadowedPaint );
		}
	};

	//  Set the paint for the "illuminated" sides of the frame.
	setIlluminatedPaint( newPaint ) {
		this.illuminatedPaint = newPaint;
	};

	//  Set the paint for the "shadowed" sides of the frame.
	setShadowedPaint( newPaint ) {
		this.shadowedPaint = newPaint;
	};

	//  Trying to label things but it doesn't work.  The reason being that stuff is not drawn
	//  outside the bounds of a defined frame (saves time!).
	setLabel( newLabel ) {
		//  Do this because "setLabel" means something to the Component.
		Component.prototype.setLabel.call( this, newLabel );
		//  Setting the label to null or undefined will make it invisible if it
		//  already exists.  Or it will do nothing if it doesn't exist.
		if ( newLabel === undefined || newLabel === null ) {
			if ( this.frameLabel !== null ) {
				//  Label already exists, so make it invisible.
				this.frameLabel.setVisible( false );
			}
			//  Do nothing otherwise.
		}
		else {
			//  Change this label if it already exists, make a new one if it
			//  doesn't.
			if ( this.frameLabel !== null )
				this.frameLabel.setText( newLabel );
			else {
				console.info( "adding " + newLabel );
				this.frameLabel = new Text( -this.w, this.h / 2, newLabel );
				this.frameLabel.setAlignment( ALIGN_CENTERED_LEFT );
				this.add( this.frameLabel );
			}
			this.frameLabel.setVisible( true );
		}
	}

}
//=============================================================================
//  ResizeBox
//  
//  The ResizeBox component provides a rectangular frame that can be resized
//  using mouse drag events.  It provides callbacks that indicate when it has
//  been resized, as well as functions that provide the new size.
//
//  I'm trying to make this component as flexible as possible without making
//  the class overly complicated.  It has the following controllable behaviors:
//   - It may be visible, or invisible
//   - It may be set to pay attention to events or ignore them
//   - It may become visible, or change its appearance when a mouse is
//     near it
//   - It may provide corner controls, edge controls, or both
//
//=============================================================================

class ResizeBox extends Component {

	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		//  The foreground is a simple rectangular outline.  
		this.setForeground( new Rectangle( 0, 0, 1, 1, null ) );
		//  Default paint is red.
		this.setCombinedPaint( rgba( 1, 0, 0, 1 ) );
		this.getForeground().setCombinedPaint( rgba( 1, 0, 0, 1 ) );
		this.getForeground().setLineWidth( 2 );
		//  Determine whether the callback is done on a drag, or only on the final
		//  release.
		this.doCallbackOnDrag = true;
		//  Determine whether this box can also be made to move the whole frame
		//  instead of resizing it.
		this.moveCapable = false;
		//  Determine whether this box can be resized.
		this.resizeCapable = true;
		//  These decide whether resize/move hints are drawn as part of the overlay.
		//  The frame has a similar setting, but because we use the foreground to draw
		//  it, the function call that changes whether it is visible simply changes the
		//  visibility of the foreground.
		this.drawCornerHints = true;
		this.drawEdgeHints = true;
		this.drawMoveHint = true;
		//  Size of the region around each edge and corner where the mouse is
		//  sensitive to drag events.  Measured in pixels.
		this.dragWidth = 5;
		//  Used to track whether a push was made on an interesting part of the box.
		this.pushInEffect = false;
		//  The "move" area is a portion of the resize box that allows moving.  If this
		//  is not defined, the whole box is used.
		this.moveArea = null;
	}

	//  Change whether the callback is done on drag events.  If this is set to
	//  false, the callback will only be done on the final release.
	setDoCallbackOnDrag( newVal ) {
		this.doCallbackOnDrag = newVal;
	}

	//  Change whether this resize box allows a move operation in addition to a
	//  resize.
	setMoveCapable( newVal ) {
		this.moveCapable = newVal;
	}

	//  Set the area of the resize box that is "move capable", that is, the area
	//  that allows the user to drag the box around.  Setting the first value to
	//  null will make the whole resize box the move area.
	setMoveArea( x, y, w, h ) {
		this.remove( this.moveArea );
		if ( x === null )
			this.moveArea = null;
		else
			this.moveArea = new Component( x, y, w, h );
		this.add( this.moveArea );  //  added so the resize stuff works
	}

	//  Change whether or not the box can be resized.
	setResizeCapable( newVal ) {
		this.resizeCapable = newVal;
	}

	//  Change the size of the region around edges and corners where the mouse is
	//  sensitive to drag events.  This amount, measured in pixels, is the size of
	//  the region on ALL SIDES of the edge or corner.  So the sensitive region is
	//  twice this width (for and edge).
	setDragWidth( newVal ) {
		this.dragWidth = newVal;
	}

	//  Change whether various resize indicators are drawn as part of the overlay.
	setDrawFrame( newVal ) {
		this.getForeground().setVisible( newVal );
	}
	setDrawCornerHints( newVal ) {
		this.drawCornerHints = newVal;
	}
	setDrawEdgeHints( newVal ) {
		this.drawEdgeHints = newVal;
	}
	setDrawMoveHint( newVal ) {
		this.drawMoveHint = newVal;
	}

	//  We do some explicit drawing here, depending on whether the mouse is in position
	//  to move edges or corners.  The cursor is also used to indicate this.
	draw( ins ) {
		var dist = 4;
		if ( this.getForeground().getLineWidth() !== null )
			dist = this.getForeground().getLineWidth() + 3;
		if ( this.onNW ) {
			if ( this.drawCornerHints ) {
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + 15, this.drawY - dist );
				ins.ctx.lineTo( this.drawX - dist,  this.drawY - dist );
				ins.ctx.lineTo( this.drawX - dist, this.drawY + 15 );
				ins.ctx.stroke();
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + 15 - dist, this.drawY + dist );
				ins.ctx.lineTo( this.drawX + dist,  this.drawY + dist );
				ins.ctx.lineTo( this.drawX + dist, this.drawY + 15 - dist );
				ins.ctx.stroke();
			}
		}
		else if ( this.onNE ) {
			if ( this.drawCornerHints ) {
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + this.drawW - 15, this.drawY - dist );
				ins.ctx.lineTo( this.drawX + this.drawW + dist,  this.drawY - dist );
				ins.ctx.lineTo( this.drawX + this.drawW + dist, this.drawY + 15 );
				ins.ctx.stroke();
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + this.drawW - 15 + dist, this.drawY + dist );
				ins.ctx.lineTo( this.drawX + this.drawW - dist,  this.drawY + dist );
				ins.ctx.lineTo( this.drawX + this.drawW - dist, this.drawY + 15 - dist );
				ins.ctx.stroke();
			}
		}
		else if ( this.onSE ) {
			if ( this.drawCornerHints ) {
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + this.drawW - 15, this.drawY + this.drawH + dist );
				ins.ctx.lineTo( this.drawX + this.drawW + dist,  this.drawY + this.drawH + dist );
				ins.ctx.lineTo( this.drawX + this.drawW + dist, this.drawY + this.drawH - 15 );
				ins.ctx.stroke();
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + this.drawW - 15 + dist, this.drawY + this.drawH - dist );
				ins.ctx.lineTo( this.drawX + this.drawW - dist,  this.drawY + this.drawH - dist );
				ins.ctx.lineTo( this.drawX + this.drawW - dist, this.drawY + this.drawH - 15 + dist );
				ins.ctx.stroke();
			}
		}
		else if ( this.onSW ) {
			if ( this.drawCornerHints ) {
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + 15, this.drawY + this.drawH + dist );
				ins.ctx.lineTo( this.drawX - dist,  this.drawY + this.drawH + dist );
				ins.ctx.lineTo( this.drawX - dist, this.drawY + this.drawH - 15 );
				ins.ctx.stroke();
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + 15 - dist, this.drawY + this.drawH - dist );
				ins.ctx.lineTo( this.drawX + dist,  this.drawY + this.drawH - dist );
				ins.ctx.lineTo( this.drawX + dist, this.drawY + this.drawH - 15 + dist );
				ins.ctx.stroke();
			}
		}
		else if ( this.onLeft ) {
			if ( this.drawEdgeHints ) {
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX - dist, this.drawY + this.drawH / 2 - 15 );
				ins.ctx.lineTo( this.drawX - dist,  this.drawY + this.drawH / 2 + 15 );
				ins.ctx.stroke();
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + dist, this.drawY + this.drawH / 2 - 15 + dist );
				ins.ctx.lineTo( this.drawX + dist,  this.drawY + this.drawH / 2 + 15 - dist );
				ins.ctx.stroke();
			}
		}
		else if ( this.onRight ) {
			if ( this.drawEdgeHints ) {
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + this.drawW + dist, this.drawY + this.drawH / 2 - 15 );
				ins.ctx.lineTo( this.drawX + this.drawW + dist,  this.drawY + this.drawH / 2 + 15 );
				ins.ctx.stroke();
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + this.drawW - dist, this.drawY + this.drawH / 2 - 15 + dist );
				ins.ctx.lineTo( this.drawX + this.drawW - dist,  this.drawY + this.drawH / 2 + 15 - dist );
				ins.ctx.stroke();
			}
		}
		else if ( this.onTop ) {
			if ( this.drawEdgeHints ) {
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + this.drawW / 2 - 15, this.drawY - dist );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 15, this.drawY - dist );
				ins.ctx.stroke();
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + this.drawW / 2 - 15 + dist, this.drawY + dist );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 15 - dist, this.drawY + dist );
				ins.ctx.stroke();
			}
		}
		else if ( this.onBottom ) {
			if ( this.drawEdgeHints ) {
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + this.drawW / 2 - 15, this.drawY + this.drawH + dist );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 15, this.drawY + this.drawH + dist );
				ins.ctx.stroke();
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + this.drawW / 2 - 15 + dist, this.drawY + this.drawH - dist );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 15 - dist, this.drawY + this.drawH - dist );
				ins.ctx.stroke();
			}
		}
		else if ( this.onMove ) {
			if ( this.drawMoveHint ) {
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.drawX + this.drawW / 2 - 20, this.drawY + this.drawH / 2 - 30 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2, this.drawY + this.drawH / 2 - 40 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 20, this.drawY + this.drawH / 2 - 30 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 10, this.drawY + this.drawH / 2 - 30 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 10, this.drawY + this.drawH / 2 - 10 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 30, this.drawY + this.drawH / 2 - 10 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 30, this.drawY + this.drawH / 2 - 20 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 40, this.drawY + this.drawH / 2 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 30, this.drawY + this.drawH / 2 + 20 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 30, this.drawY + this.drawH / 2 + 10 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 10, this.drawY + this.drawH / 2 + 10 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 10, this.drawY + this.drawH / 2 + 30 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 + 20, this.drawY + this.drawH / 2 + 30 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2, this.drawY + this.drawH / 2 + 40 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 - 20, this.drawY + this.drawH / 2 + 30 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 - 10, this.drawY + this.drawH / 2 + 30 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 - 10, this.drawY + this.drawH / 2 + 10 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 - 30, this.drawY + this.drawH / 2 + 10 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 - 30, this.drawY + this.drawH / 2 + 20 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 - 40, this.drawY + this.drawH / 2 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 - 30, this.drawY + this.drawH / 2 - 20 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 - 30, this.drawY + this.drawH / 2 - 10 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 - 10, this.drawY + this.drawH / 2 - 10 );
				ins.ctx.lineTo( this.drawX + this.drawW / 2 - 10, this.drawY + this.drawH / 2 - 30 );
				ins.ctx.closePath();
				ins.ctx.stroke();
			}
		}
	}

	//  We need to handle move events to see if we are near the box, drag events,
	//  release events, and possibly push events.
	handle( event ) {
		switch ( event.type ) {
			case MOUSE_PUSH:
				if ( this.eventOnEdge( event ) ) {
					this.pushInEffect = true;
					this.pushX = this.drawX;
					this.pushY = this.drawY;
					this.pushW = this.drawW;
					this.pushH = this.drawH;
					return true;
				}
				else
					this.pushInEffect = false;
				break;
			case MOUSE_MOVE:
				if ( this.eventOnEdge( event ) ) {
					event.drawing.doRedraw();
					return true;
				}
				else {
					//  Turn off all of the "resize" indicators, and cause a redraw if any of these
					//  represent a change.
					var doTheRedraw = false;
					if ( this.onTop || this.onBottom || this.onLeft || this.onRight || this.onNE || this.onNW ||
						this.onSE || this.onSW || this.onMove )
						doTheRedraw = true;
					this.onTop = false;
					this.onBottom = false;
					this.onLeft = false;
					this.onRight = false;
					this.onNE = false;
					this.onNW = false;
					this.onSE = false;
					this.onSW = false;
					this.onMove = false;
					if ( doTheRedraw )
						event.drawing.doRedraw();
				}
				break;
			case MOUSE_RELEASE:
				this.pushInEffect = false;
				break;
			case MOUSE_DRAG:
				if ( getLastEventComponent() === this ) {
					if ( this.pushInEffect ) {
						//  Figure out the change in pixels of x, y, w, and h that this event should trigger.
						this.newX = this.pushX;
						this.newY = this.pushY;
						this.newW = this.pushW;
						this.newH = this.pushH;
						if ( this.onMove ) {
							this.newX = this.pushX + event.dragX;
							this.newY = this.pushY + event.dragY;
						}
						else {
							if ( this.onTop || this.onNE || this.onNW ) {
								this.newH = this.newH - event.dragY;
								this.newY = this.pushY + event.dragY;
							}
							else if ( this.onBottom || this.onSE || this.onSW )
								this.newH = this.newH + event.dragY;
							if ( this.onLeft || this.onNW || this.onSW ) {
								this.newW = this.newW - event.dragX;
								this.newX = this.pushX + event.dragX;
							}
							else if ( this.onRight || this.onSE || this.onNE )
								this.newW = this.newW + event.dragX;
						}
						this.doCallback();
						return true;
					}
				}
				break;
			default:
				this.pushInEffect = false;
				break;
		}
		event.drawing.setCursor( "default" );
		return false;
	};

	//  Functions to return changed values for box dimensions.  These can be used in a 
	//  callback function.
	getNewX() {
		return this.newX;
	};
	getNewY() {
		return this.newY;
	};
	getNewW() {
		return this.newW;
	};
	getNewH() {
		return this.newH;
	};

	//  Check if an event is inside the "move area".  If the user hasn't set this area, it
	//  will be the entire resize box.
	eventInMoveArea( event ) {
		if ( this.moveArea === null )
			return this.eventInside( event );
		else
			return this.moveArea.eventInside( event );
	};

	//  Establish if the position of a mouse event is on an edge or corner.  This sets
	//  variables that can be consulted.  It also sets the cursor appropriately.
	eventOnEdge( event ) {
		if ( this.resizeCapable ) {
			//  These are the variables.
			this.onTop = false;
			this.onBottom = false;
			this.onLeft = false;
			this.onRight = false;
			this.onNE = false;
			this.onNW = false;
			this.onSE = false;
			this.onSW = false;
			this.onMove = false;
			//  Are we within the width of the top edge?
			if ( ( event.py > this.drawY - this.dragWidth && event.py < this.drawY + this.dragWidth ) &&
				( event.px > this.drawX - this.dragWidth && event.px < this.drawX + this.drawW + this.dragWidth ) )
				this.onTop = true;
			//  Or the bottom?
			else if  ( ( event.py > this.drawY + this.drawH - this.dragWidth && event.py < this.drawY + this.drawH + this.dragWidth ) &&
				( event.px > this.drawX - this.dragWidth && event.px < this.drawX + this.drawW + this.dragWidth ) )
				this.onBottom = true;
			//  Are we within the width of the left edge?
			if ( ( event.px > this.drawX - this.dragWidth && event.px < this.drawX + this.dragWidth ) &&
				( event.py > this.drawY - this.dragWidth && event.py < this.drawY + this.drawH + this.dragWidth ) )
				this.onLeft = true;
			//  Or maybe the right?
			else if ( ( event.px > this.drawX + this.drawW - this.dragWidth && event.px < this.drawX + this.drawW + this.dragWidth ) &&
				( event.py > this.drawY - this.dragWidth && event.py < this.drawY + this.drawH + this.dragWidth ) )
				this.onRight = true;
			//  Knowing all of that, figure out which edge or corner we might be near.
			if ( this.onTop ) {
				if ( this.onLeft ) {
					event.drawing.setCursor( "nw-resize" );
					this.onNW = true;
					return true;
				}
				else if ( this.onRight ) {
					event.drawing.setCursor( "ne-resize" );
					this.onNE = true;
					return true;
				}
				else {
					event.drawing.setCursor( "row-resize" );
					return true;
				}
			}
			else if ( this.onBottom ) {
				if ( this.onLeft ) {
					event.drawing.setCursor( "sw-resize" );
					this.onSW = true;
					return true;
				}
				else if ( this.onRight ) {
					event.drawing.setCursor( "se-resize" );
					this.onSE = true;
					return true;
				}
				else {
					event.drawing.setCursor( "row-resize" );
					return true;
				}
			}
			else if ( this.onLeft ) {
				event.drawing.setCursor( "col-resize" );
				return true;
			}
			else if ( this.onRight ) {
				event.drawing.setCursor( "col-resize" );
				return true;
			}
		}
		if ( this.moveCapable && this.eventInMoveArea( event ) ) {
			event.drawing.setCursor( "move" );
			this.onMove = true;
			return true;
		}
		return false;
	}

}
	//=============================================================================
//  Button
//  
//  This component is the base class for buttons.  It tracks whether a
//  a user is hovering over the button, pushing it, or whether it has
//  been toggled from an on to and off state.  But nothing is drawn - that is
//  the duty of inheriting classes.
//=============================================================================

class Button extends Component {
	
	constructor( x, y, w, h, label ) {
	super( x, y, w, h, label );
	this.buttonOn = false;
	this.buttonPushed = false;
	this.buttonHover = false;
	this.radioList = null;
	this.radioIndex = 0;
	this.toggleButton = false;
	this.toggleStayDown = false;
	this.triggerOnRelease = false;
	this.textItem = null;
	this.labelChild = null;  //  holds possible label icons
	if ( label !== undefined && label !== null )
		this.setLabel( label );
	this.buttonSwitch = false;
	this._buttonPushEvent = false;
}

getTextItem() {
	return this.textItem;
}

//-----------------------------------------------------------------------------
//  Change the text on the button.  This may need to create a text item to hold
//  the label.
//-----------------------------------------------------------------------------
setLabel( newVal ) {
	super.setLabel( newVal );
	if ( this.labelChild !== null )
		this.labelChild.clear();
	if ( typeof( newVal ) === "string" ) {
		if ( this.textItem === null ) {
			this.textItem = new Text( this.getW() / 2, this.getH() / 2, this.label );
			//this.textItem = new Text( .5, .5, this.label );
			this.textItem.setAlignment( ALIGN_CENTERED_MIDDLE );
			this.add( this.textItem );
		}
		this.textItem.setText( newVal );
	}
	else {
		if ( this.labelChild === null ) {
			this.labelChild = new Component( 0, 0, 1, 1 );
			this.add( this.labelChild );
		}
		this.labelChild.add( newVal );
	}
};

//-----------------------------------------------------------------------------
//  Make this a radio button, using the given radio list.  A radio
//  button has slightly different behavior - it always turns on when
//  you click it, even when it is already on.
//-----------------------------------------------------------------------------
setRadioList( newList ) {
	this.radioIndex = newList.length;
	newList[newList.length] = this;
	this.radioList = newList;
	//  A radio list needs *something* to be on.  So turn this item on
	//  if it is the first in the list.
	if ( newList.length === 1 )
		this.setButtonOn( true );
	//  Radio list buttons don't work well as toggle buttons.  You can turn
	//  this back on if you want.
	this.setToggleButton( false );
}

//-----------------------------------------------------------------------------
//  Turn this button into a "toggle" button - it turns on and remains on
//  when you push it.  Push it again and it turns off.  Callbacks occur
//  when an "off" toggle button is pushed, but when an "on" toggle button
//  is released.
//-----------------------------------------------------------------------------
setToggleButton( newVal, otherVal ) {
	this.toggleButton = newVal;
	if ( otherVal !== undefined && otherVal === true )
		this.toggleStayDown = true;
	else
		this.toggleStayDown = false;
};

//-----------------------------------------------------------------------------
//  Go through the radio list and turn off all items except this
//  one.
//-----------------------------------------------------------------------------
changeRadioList() {
	for ( var i = 0; i < this.radioList.length; ++i ) {
		if ( i !== this.radioIndex ) {
			this.radioList[i].setButtonOn( false );
		}
	}
};

//-----------------------------------------------------------------------------
//  Used to explicitly set the states of the button.
//-----------------------------------------------------------------------------
setButtonOn( newVal ) {
	this.buttonOn = newVal;
	if ( this.buttonOn && this.radioList !== null )
		this.changeRadioList();
	this.buttonChange();
}
setButtonPushed( newVal ) {
	this.buttonPushed = newVal;
	this.buttonChange();
}
setButtonHover( newVal ) {
	this.buttonHover = newVal;
	this.buttonChange();
}

//-----------------------------------------------------------------------------
//  Get the current states of a button.
//-----------------------------------------------------------------------------
getButtonOn() {
	return this.buttonOn;
}
getButtonPushed() {
	return this.buttonPushed;
}
getButtonHover() {
	return this.buttonHover;
}

//-----------------------------------------------------------------------------
//  Handle one way this widget might be expected to behave.
//-----------------------------------------------------------------------------
getValue() {
	return this.buttonOn;
}

//-----------------------------------------------------------------------------
//  Set a button to trigger a callback on release instead of push.
//-----------------------------------------------------------------------------
setTriggerOnRelease( newVal ) {
	this.triggerOnRelease = newVal;
}

//-----------------------------------------------------------------------------
//  Similar to above, this function can be used to turn a button on or off.
//-----------------------------------------------------------------------------
setValue( newVal ) {
	this.setButtonOn( newVal );
};

//-----------------------------------------------------------------------------
//  This function is meant to allow inheriting functions detect a
//  change in the state of the button - in the event they wish to
//  alter backgrounds or something.
//-----------------------------------------------------------------------------
buttonChange() {
	this.doRedraw();
};

//  Several events are handled to keep track of the on/off state,
//  whether the mouse is over the button, or whether the user is
//  pushing and holding the button.  Inheriting classes can pay
//  attention to the states or ignore them as they see fit.
handle( event ) {
	if ( this.diagnostic !== null ) {
	}
	switch ( event.type ) {
		case MOUSE_PUSH:
			if ( this.eventInside( event ) ) {
				//  All three types of buttons will trigger a callback if they are not on when
				//  pushed.  Otherwise they will all do nothing.
				if ( !this.buttonOn && !this.triggerOnRelease ) {
					//  Toggle and radio buttons have an "on" state.  Conventional buttons are
					//  triggers - they don't turn on, they simply trigger the callback.
					if ( this.toggleButton || this.radioList !== null )
						this.setButtonOn( true );
					this.doCallback( null, event );
					this.buttonSwitch = true;
				}
				else //if ( this.radioList !== null )  //  never switch off radio buttons when they are pushed
					this.buttonSwitch = false;
				//  All buttons enter the "pushed" state when pushed.
				this.setButtonPushed( true );
				this.buttonChange();
				this._buttonPushEvent = true;
				return true;
			}
			this._buttonPushEvent = false;
			break;
		case MOUSE_MOVE:
			//  Moves can change the "hover" state, but don't ever trigger callbacks.
			if ( this.eventInside( event ) ) {
				this.setButtonHover( true );
				this.buttonChange();
			}
			else {
				this.setButtonHover( false );
				this.buttonChange();
			}
			break;
		case MOUSE_RELEASE:
			//  A release is only interesting if this button is pushed.  The release does not
			//  have to be done with the mouse over the button - only the push requires that.
			//  The toggle button is the only button for which this triggers a callback.
			if ( this._buttonPushEvent ) {
				//  Toggle buttons 
				if ( this.toggleButton ) {//&& !this.radioList !== null ) {
					if ( this.buttonOn && !this.buttonSwitch ) {
						this.buttonOn = false;
						this.setButtonPushed( false );
						this.doCallback();
					}
					else if ( !this.toggleStayDown )
						this.setButtonPushed( false );
					this._buttonPushEvent = false;
					// else {
					// 	//  Toggle and radio buttons have an "on" state.  Conventional buttons are
					// 	//  triggers - they don't turn on, they simply trigger the callback.
					// 	this.setButtonOn( true );
					// }
				}
				else {
					if ( this.triggerOnRelease )
						this.doCallback();
					this.setButtonPushed( false );
				}
				this.doRedraw();
			}
			break;
		// case MOUSE_CLICK:
		// 	if ( this.eventInside( event ) ) {
		// 		console.info( "click" );
		// 		if ( this.toggleButton ) {
		// 			if ( this.buttonPushed ) {
		// 				this.buttonPushed = false;
		// 				if ( this.radioList !== null ) {
		// 					this.changeRadioList();
		// 					this.setButtonOn( true );
		// 				}
		// 				else
		// 					this.setButtonOn( !this.buttonOn );
		// 				this.doCallback( ON_RELEASE, event );
		// 				return true;
		// 			}
		// 		}
		// 		else {
		// 			this.doCallback( ON_RELEASE, event );
		// 		}
		// 		return true;  // grab the click event under all circumstances
		// 	}
		// 	break;
	}
	return false;
};
	
}

class Popup extends Frame {
	
	constructor( x, y, w, h, label ) {
		//  Keep the label away from the Frame - we don't want to use it as the title.
		super( x, y, w, h );
		//  Add a default background - filled rectangle of color.
		this.setBackground( new FillRectangle( 0, 0, 1, 1, null ) );
		Frame.prototype.getBackground.call( this ).setFillPaint( rgb( 255, 255, 255 ) );
		Frame.prototype.getBackground.call( this ).setShadow( true );
		this.resizeBox = new ResizeBox( 0, 0, 1, 1 );
		this.resizeBox.setDrawFrame( false );
		this.resizeBox.setDrawCornerHints( false );
		this.resizeBox.setDrawEdgeHints( false );
		this.resizeBox.setDrawMoveHint( false );
		this.resizeBox.setMoveCapable( true );
		this.resizeBox.setCallback( this.resizeCallback, this );
		Frame.prototype.add.call( this, this.resizeBox );
		//  This is the title bar - use "showTitleBar( false )" to get rid of it.
		this.titleBarSize = 25;
		this.titleBar = new Frame( 0, 0, 1, this.titleBarSize );
		this.titleBar.setFillPaint( rgb( 150, 150, 150 ) );
		Frame.prototype.add.call( this, this.titleBar );
		this.titleText = new Text( 10, this.titleBarSize / 2, label );
		this.titleText.setAlignment( ALIGN_CENTERED_RIGHT );
		this.titleBar.add( this.titleText );
		//  "Close" button in the upper right of the title bar.
		this.closeButton = new Button( -23, 2, 21, 21 );
		this.closeButton.setCallback( this.closeButtonCallback, this );
		this.closeButton.setCombinedPaint( rgb( 200, 200, 200 ) );
		this.closeButton.setLineWidth( 2 );
		this.line1 = new LinePath( 0, 0, 1, 1 );
		this.line1.setScaledDrawing( true );
		this.line1.moveTo( 0.2, 0.2 );
		this.line1.lineTo( 0.8, 0.8 );
		this.closeButton.add( this.line1 );
		this.line2 = new LinePath( 0, 0, 1, 1 );
		this.line2.setScaledDrawing( true );
		this.line2.moveTo( 0.2, 0.8 );
		this.line2.lineTo( 0.8, 0.2 );
		this.closeButton.add( this.line2 );
		Frame.prototype.add.call( this, this.closeButton );
		
		//  The "frame" area is where anything added to the popup is put (as the add() function is
		//  overridden).  If the title bar is removed, it will take over the whole popup.  The drawing
		//  area is duplicated (without the title bar) if the popup is "torn off".
		this.frameArea = new Frame( 0, this.titleBarSize, 1, -0.000001 );
		this.frameArea.setClip( true );
		Frame.prototype.add.call( this, this.frameArea );

		//  This makes the title bar the only part of the popup that accepts move/drag events.  You
		//  can make the whole popup window sensitive to move events using setMoveEverywhere().
		this.resizeBox.setMoveArea( 0, 0, 1, this.titleBarSize );

		//  Add this to the overlay.
		this.addOverlay( this );
		//  But it is initially not visible.
		this.setVisible( false );
		this.setX = 0;
		this.setY = 0;
		//  Some stuff used in handle.
		this.closeTimeoutID = null;
		this.resize( x, y, w, h );
		this.clickOnTitleBar = false;
		//  Modal popups will grab ALL events until they are dismissed.
		this.modal = false;
		//  By default, popups are visible until closed.  Set this to cause them to disappear after
		//  a number of milliseconds.  This will NOT happen if the mouse is inside the popup by default.
		//  You can override that using the alwaysHide setting.
		this.hideTimeout = null;
		this.alwaysHide = false;
		this.hideTimeoutID = null;
	}

	//  Override the "add" function to add things to the frame area.
	add( obj ) {
		this.frameArea.add( obj );
	}

	//  Add a component to the frame.  This dodges the overridden "add" function.
	frameAdd( comp ) {
		Frame.prototype.add.call( this, comp );
	}

	//  Make the popup act more like a frame.
	getBackground() {
		return this.frameArea.getBackground();
	}
	getForeground() {
		return this.frameArea.getForeground();
	}

	//  Direct access to the underlying Frame component.
	getFrame() {
		return this.frameArea;
	}

	//  Make the entire popup sensitive to move and drag events.  
	setMoveEverywhere() {
		this.resizeBox.setMoveArea( null );
	}

	//  Set the number of milliseconds the popup should remain visible once the mouse leaves it.
	//  You can also set it to disappear even if the mouse is inside it by setting the second
	//  value to true.
	setHideTimeout( msec, hideAlways ) {
		if ( hideAlways === undefined || hideAlways === null )
			this.alwaysHide = false;
		else
			this.alwaysHide = hideAlways;
		this.hideTimeout = msec;
	};

	//  Turn on/off resizability.  By default it is on.  This is done by making the "resize box"
	//  visible or invisible (which controls its event handling).
	setResizable( newVal ) {
		this.resizeBox.setVisible( newVal );
	};

	//  Turn on or off the shadow.
	setShadow( newVal ) {
		Frame.prototype.getBackground.call( this ).setShadow( newVal );
	}

	//  Set the name of the include file used when tearing off this popup.  If this is not used,
	//  a default will be used, which might or might not work.  This include file must contain
	//  all of the JavaScript code required for the torn off window to draw.  This value is
	//  null by default - if you want to change from something else to default behavior, set this
	//  to null.
	setTearOffInclude( newVal ) {
		this.tearOffInclude = null;
	};

	resizeCallback( thisInstance ) {
		//  Compute new pixel and fractional values for this resized plot frame.  If the pixel value
		//  of x or y is negative, we have to add the (negative) size of the box to make it
		//  appear in the right place.  This is kind of a special case.
		var newX = thisInstance.resizeBox.getNewX() - thisInstance.getParent().drawX;
		var newY = thisInstance.resizeBox.getNewY() - thisInstance.getParent().drawY;
		if ( newX < 1 )
			newX = newX - thisInstance.getParent().drawW;
		if ( newY < 1 )
			newY = newY - thisInstance.getParent().drawH;
		thisInstance.resize( newX, newY, thisInstance.resizeBox.getNewW(), thisInstance.resizeBox.getNewH() );
		thisInstance.doRedraw();
		doOverlayRedraw();
	}

	closeButtonCallback( thisInstance ) {
		thisInstance.hide();
	};

	showTitleBar( newVal ) {
		this.titleBar.setVisible( newVal );
		if ( newVal ) {
			this.frameArea.resize( 0, this.titleBarSize, 0, 0 );
			this.frameArea.setRelative( NOMINAL_SIZE, NOMINAL_SIZE, OPPOSING_SIZE, OPPOSING_SIZE );
		}
		else {
			this.frameArea.resize( 0, 0, 0, 0 );
			this.frameArea.setRelative( NOMINAL_SIZE, NOMINAL_SIZE, OPPOSING_SIZE, OPPOSING_SIZE );
		}
	};

	showCloseButton( newVal ) {
		this.closeButton.setVisible( newVal );
	};

	//  Set this popup to be modal - in which case it will grab ALL events (so pretty much nothing else
	//  will work).
	setModal( newVal ) {
		this.modal = newVal;
	};

	//  Show the window.  We try to position it such that it doesn't go off the edges of the current
	//  window.
	show() {
		// this.setX = x;
		// this.setY = y;
		if ( this.x + this.w > window.innerWidth )
			this.x = window.innerWidth - this.w;
		if ( this.x < 0 )
			this.x = 0;
		if ( this.y + this.h > window.innerHeight )
			this.y = window.innerHeight - this.h;
		if ( this.y < 0 )
			this.y = 0;
		this.resize( this.x, this.y, this.w, this.h );
		this.setVisible( true );
		if ( this.alwaysHide )
			this.closeTimeoutID = setTimeout( this.hideTimeoutCB, this.hideTimeout, this );
		doOverlayRedraw();
	};

	hideTimeoutCB( thisInstance ) {
		thisInstance.hide();
	};

	hide() {
		this.setVisible( false );
		clearTimeout( this.closeTimeoutID );
		this.closeTimeoutID = null;
		doOverlayRedraw();
	};

	handle( event ) {
		switch ( event.type ) {
			case MOUSE_MOVE:
				//  A mouse move over the popup will cancel the "close" timeout, which makes it disappear
				//  after some amount of time.  If the user hasn't set this up, this should be harmless.
				if ( this.eventInside( event ) && !this.hideAlways ) {
					clearTimeout( this.closeTimeoutID );
					this.closeTimeoutID = null;
				}
				else if ( this.closeTimeoutID === null && this.hideTimeout !== null ) {
					if ( this.hideTimeout === 0 )
						this.hideTimeoutCB( this );
					else
						this.closeTimeoutID = setTimeout( this.hideTimeoutCB, this.hideTimeout, this );
				}
			break;
			//  Grab all internal "selection" events - otherwise they will end up being captured
			//  by stuff we can't see underneath the popup.
			case MOUSE_PUSH:
			case MOUSE_RELEASE:
			case MOUSE_WHEEL:
			case MOUSE_CLICK:
				if ( this.eventInside( event ) )
					return true;
			break;
		}
		//  Grab all events if this is modal.
		if ( this.modal )
			return true;
		return false;
	}

}


class Tooltip extends Popup {
	
	constructor( label ) {
		super( 100, 100, 100, 100 );
		this.text = label;
		//  The default fill color is this sort of yellowish thing.
		this.getBackground().setFillPaint( rgb( 255, 234, 170 ) );
		this.setCombinedPaint( rgb( 255, 234, 170 ) );
		//  The default font is small.
		this.setFontSize( 12 );
		//  And the font paint is black.
		this.setCombinedFontPaint( rgb( 0, 0, 0 ) );
		//  Add the text.
		this.textComp = new Text( 10, .5, this.text );
		this.textComp.setAlignment( ALIGN_CENTERED_RIGHT );
		this.textComp.diagnostic = "bleah";
		this.add( this.textComp );
		//  Get rid of the title bar.
		this.showTitleBar( false );
		this.setResizable( false );
		this.setHideTimeout( 0, false );
		this.setX = 0;
		this.setY = 0;
		//  Some stuff used in handle.
		this.closeTimeoutID = null;
		this.delayTime = 2000;
	}

	//--------------------------------
	//  Before we draw this thing, figure out the size and how to position it so that the
	//  whole width and height appear on the screen.  Figuring out the size here allows us
	//  to screw around with the content at will.
	//------
	predraw( ins ) {
		var tPars = this.measureText( ins, this.text );
		var newW = tPars.width + 20;
		//  Make sure we fit on the current window.  Width first.
		if ( newW + this.setX > window.innerWidth )
			this.setX = window.innerWidth - newW - 10;
		if ( this.setX < 0 )
			this.setX = 0;

		if ( this.setH < 0 )
			this.setH = 0;
		this.resize( this.setX, this.setY, newW, 25 );
		this.textComp.setRelativeY( NOMINAL_SIZE );
		this.textComp.setXY( 10, 25 / 2 );
	}

	//--------------------------------
	//  Show will position the tooltip where we want it.  This may be changed by the draw
	//  function.
	//------
	show( x, y ) {
		this.setX = x;
		this.setY = y;
		Popup.prototype.show.call( this );
	}



}

//  This will cause everything to redraw.  It should be used somewhat sparingly - event should
//  never require it, as they will redraw on request post-activity.
function forceRedraw() {
	resize();
};

//  Initialize a drawing.  The first argument is the only one required - it is the string name
//  of the canvas in which this drawing will appear.  The optional "useOpenGL" argument can be true or
//  false - by default it is false.  It determines whether WebGL is used to draw items.
function JDHDrawing( canvasName, useOpenGL ) {
	this.canvasName = canvasName;
	this.useOpenGL = useOpenGL;
	if ( this.useOpenGL === undefined || this.useOpenGL === null )
		this.useOpenGL = false;
	this.context = null;
	//  Find the drawing area (the "canvas"), specified by "canvasName" that must be the "ID"
	//  in the owning HTML file.
	this.canvas = document.getElementById( this.canvasName );
	//  The "z-index" style specification in the HTML file can be used to combine more than
	//  one drawing in layers - higher z-index drawings are drawn on top.  If this is
	//  specified, find out what it is here.  It is possible that the canvas has no JDH
	//  code associated with it, and thus no "style" defined - in which case we ignore it.
	if ( this.canvas !== null && this.canvas.style.zIndex !== undefined && this.canvas.style.zIndex !== null && this.canvas.style.zIndex.length > 0 )
		this.zIndex = this.canvas.style.zIndex;
	else
		this.zIndex = null;
	//  The "context" of the canvas can either be "2d" for regular drawing instructions,
	//  or "webgl" for OpenGL drawing instructions.  Unfortunately it can't be both, or
	//  so it seems.  2D is the default.
	if ( this.useOpenGL ) {
		this.context = this.canvas.getContext( "webgl2" );
		this.gl = this.context;
		if ( this.context === null )
			alert( "WebGL is not available it seems.  Your situation is hopeless.\n" );
	}
	else
		this.context = this.canvas.getContext( "2d" );
	//  Add the drawing to the context, which is useful in some WebGL applications.
	this.context.drawing = this;
	//  Create an object to hold "instructions" for the drawing.
	this.ins = {};
	this.ins.ctx = this.context;
	this.topLevel = new Component( 0, 0, window.innerWidth, window.innerHeight, "top level" );
	this.topLevel.setDrawing( this );
	//  This sets up the event handlers for this drawing.
	this.initEventHandlers();
	//  This call creates "shared" memory for all JDH stuff - unless it is already there, in which
	//  case it just makes use of it.
	var shared = SharedMemory( "JDHShared" );
	//  Add this drawing to shared memory, so functions (like resize()) can find it and so other
	//  drawings can refer to it.
//	if ( !this.useOpenGL ) {
	if ( shared.drawings === undefined ) {
		shared.drawings = [];
		//  This is a bit klunky, but if there has been no drawing list defined, then there is
		//  no resize function.
		window.resize = function() {
			var shared = SharedMemory( "JDHShared" );
			for ( var i = 0; i < shared.drawings.length; ++i )
				shared.drawings[i].resize();
		};
		//  This is a repeatedly-called function that will redraw all drawings that have their "redraw"
		//  flag set.  Once it is done redrawing everything it will set a timeout to call itself again.
		//  This is NOT an "interval" timeout because we don't want new calls to this function occurring
		//  at the interval unless this function is already complete.
		window.redrawCycleInterval = 10;
		window.redrawCycle = function() {
			var shared = SharedMemory( "JDHShared" );
			for ( var i = 0; i < shared.drawings.length; ++i ) {
				shared.drawings[i].checkForRedraw();
				//if ( shared.drawings[i].useOpenGL )
				// if ( shared.drawings[i].redrawFlag ) {
				// 	shared.drawings[i].redrawFlag = false;
				// 	shared.drawings[i].redraw();
				// }
			}
			setTimeout( window.redrawCycle, window.redrawCycleInterval );
		}
		window.redrawCycle();
	}
	shared.drawings.push( this );
	shared[canvasName] = this;
	//  These values track the size and origin of the canvas and drawing.
	this.x = 0;
	this.y = 0;
	this.w = window.innerWidth;
	this.h = window.innerHeight;
	//  This triggers a redraw of this drawing in the periodic "redrawCycle".  See just above!  It is
	//  set by "doRedraw()" at any time to cause a redraw of this drawing on the next redraw cycle.
	this.redrawTrigger = true;
	this.nonEventRedrawTrigger = true;  //  "redrawTrigger" seemed too associated with events sometimes...
	//  These track deliberate user settings of these numbers.  Nominally they are null, indicating
	//  no setting.  However here we try to pick up any settings the user has made in the HTML.
	this.setX = null;
	this.setY = null;
	if ( this.canvas.style.left !== undefined && this.canvas.style.left !== null && this.canvas.style.left.length > 2 ) {
		this.setX = this.canvas.style.left.substring( 0, this.canvas.style.left.length - 2 );
		this.x = this.setX;
	}
	if ( this.canvas.style.top !== undefined && this.canvas.style.top !== null && this.canvas.style.top.length > 2 ) {
		this.setY = this.canvas.style.top.substring( 0, this.canvas.style.top.length - 2 );
		this.y = this.setY;
	}
	this.setW = null;
	this.setH = null;
};

//  Change the redraw interval.  This is in milliseconds - an interval of less than 10 will
//  be rounded up to 10 by JavaScript timeouts.
function setRedrawCycleInterval( newVal ) {
	window.redrawCycleInterval = newVal;
}


//  Explicitly push a drawing on the drawing list unless it is known to already be there (a search
//  is made for the canvas name amongst those items already on the list).  This function was
//  created for the popup component "tear-off" facility.  It may or may not have other uses.
function pushDrawing( newDrawing ) {
	var shared = SharedMemory( "JDHShared" );
	for ( var i = 0; i < shared.drawings.length; ++i ) {
		if ( shared.drawings[i].canvasName === newDrawing.canvasName )
			return;
	}
	console.info( "adding " + newDrawing.canvasName + " to " + shared.drawings.length );
	shared.drawings.push( newDrawing );
};

//  Top level "redraw()" instruction.  This starts drawing at the top level of the
//  JDH object hierarchy after setting some default stuff.
JDHDrawing.prototype.redraw = function() {
	//if ( this.useOpenGL ) return;
	//console.info( "redraw " + this.canvasName );
	this.ins.stokePaint = "#000000";
	this.ins.fillPaint = "#aaaaaa";
	this.ins.fontFillPaint = "#000000";
	this.ins.fontStrokePaint = "#000000";
	this.ins.ctx.font = "20px sans-serif";
	this.ins.fontSize = 20;
	this.ins.fontFamily = "sans-serif";
	this.ins.fontVariant = null;
	this.ins.fontItalic = null;
	this.ins.fontBold = null;
	this.ins.fontOutline = null;
	this.ins.deactivated = false;
	this.ins.textJustification = 0;       //  RIGHT (i.e. conventional) justification
	this.ins.scale = 1.0;
	this.ins.rotate = 0.0;
	this.ins.inactiveFontFillPaint = "#666666";
	this.ins.inactiveFontStrokePaint = "#666666";
	this.ins.ctx.strokeStyle = this.ins.strokePaint;
	this.ins.ctx.fillStyle = this.ins.fillPaint;
	this.ins.drawing = this;
	this.ins.gl = null;
	// if ( this.nixieFont === undefined || this.nixieFont === null )
	// 	this.nixieFont = new NixieFont( this.ins );
	// this.ins.nixieFont = this.nixieFont;
	if ( !this.useOpenGL )
		this.ins.ctx.clearRect( 0, 0, window.innerWidth, window.innerHeight );
	else
	    this.ins.gl = this.context;
	if ( this.topLevel != null ) {
		this.topLevel.testRemovals();
		this.topLevel.redraw( this.ins );
	}	
};

JDHDrawing.prototype.loadNixieFont = function() {
	if ( this.nixieFont === undefined || this.nixieFont === null )
		this.nixieFont = new NixieFont( this.ins );
	this.ins.nixieFont = this.nixieFont;
}

JDHDrawing.prototype.resize = function( newX, newY, newW, newH ) {
	if ( newX !== undefined && newX !== null ) {
		this.canvas.style.left = newX.toFixed( 0 ).toString() + "px";
		this.x = newX;
		this.setX = newX;
	}
	else if ( this.setX === null ) {
		this.canvas.style.left = "0px";
		this.x = 0;
	}
	if ( newY !== undefined && newY !== null ) {
		this.canvas.style.top = newY.toFixed( 0 ).toString() + "px";
		this.y = newY;
		this.setY = newY;
	}
	else if ( this.setY === null ) {
		this.canvas.style.top = "0px";
		this.y = 0;
	}
	if ( newW !== undefined && newW !== null ) {
		this.canvas.width = newW;
		this.w = newW;
		this.setW = newW;
	}
	else if ( this.setW === null ) {
		this.canvas.width = window.innerWidth - this.x;
		this.w = this.canvas.width;
	}
	else {
		this.canvas.width = this.setW;
		this.setW = this.canvas.width;
	}
	if ( newH !== undefined && newH !== null ) {
		this.canvas.height = newH;
		this.h = newH;
		this.setH = newH;
	}
	else if ( this.setH === null ) {
		this.canvas.height = window.innerHeight - this.y;
		this.h = this.canvas.height;
	}
	else {
		this.canvas.height = this.setH;
		this.h = this.canvas.height;
	}
	if ( this.useOpenGL )
		this.gl.viewport( 0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight );
	this.topLevel.resize( 0, 0, this.canvas.width, this.canvas.height );
	this.redraw();
};

//  This is used to add a component to the top level.
JDHDrawing.prototype.add = function( newComponent ) {
	if ( this.topLevel !== null ) {
		this.topLevel.add( newComponent, this );
		newComponent.setDrawing( this );
	}
};

//  Get/set the cursor.  Each canvas/drawing has its own cursor setting.
JDHDrawing.prototype.getCursor = function() {
	return this.canvas.style.cursor;
};
JDHDrawing.prototype.setCursor = function( newCursor ) {
	this.canvas.style.cursor = newCursor;
};

//=============================================================================
//  The "overlay" is a separate set of drawing instructions that is to be drawn
//  on top of all other drawings.  To do this, JDH creates a single "overlaycomponent"
//  that you add stuff to normally.  When the overlay is redrawn for the first time,
//  JDH will figure out which is the "last" drawing it should draw and make the
//  overlay the "foreground" of the top level of that drawing, then redraw it.
//  If you are using only one drawing, this is effectively a redraw of everything.
//  But if you have a specific drawing assigned to the overlay, it should be more
//  efficient, as only that drawing will be redrawn.
//=============================================================================
//  This is used to add a component to the overlay.
function addOverlay( newComponent ) {
	//  Create an overlay component if needed.
	var shared = SharedMemory( "JDHShared" );
	if ( shared.overlayComponent === undefined ) {
		shared.overlayComponent = new Component( 0, 0, window.innerWidth, window.innerHeight, "overlay" );
	}
	//  Add this component to the overlay.
	shared.overlayComponent.add( newComponent );
};

//  Clear all components in the overlay.
function clearOverlay() {
	var shared = SharedMemory( "JDHShared" );
	if ( shared.overlayComponent !== undefined )
		shared.overlayComponent.clear();
}

//  Take a single component out of the overlay.
function removeFromOverlay( oldComponent ) {
	var shared = SharedMemory( "JDHShared" );
	if ( shared.overlayComponent !== undefined ) {
		shared.overlayComponent.removeChild( oldComponent );
	}
}

//  Return true if this component is part of the overlay.
function isOverlay( oldComponent ) {
	var shared = SharedMemory( "JDHShared" );
	if ( shared.overlayComponent === undefined )
		return false;
	if ( shared.overlayComponent.isChild( oldComponent ) )
		return true;
	return false;
}

//  Redraw the overlay.  The overlay is a specific drawing, which possibly has not yet
//  been defined.  If it has not been defined, we define it here to be the "last" drawing
//  in the list of drawings - the drawing that will be drawn last (on top).  This might
//  be the one and only defined drawing - making a redrawOverlay() the same as a redraw().
//  The "foreground" of the top level of the overlay drawing is made to be the 
//  "overlayComponent", which should already have been defined.
function redrawOverlay() {
	var shared = SharedMemory( "JDHShared" );
	//  Bail out of this if no drawings have been defined...not sure if this could ever
	//  happen.
	if ( shared.drawings === undefined )
		return;
	//  Have we not defined a drawing to be the overlay?  If that's the case, we need to
	//  do so.
	if ( shared.drawings.overlay === undefined )
		shared.drawings.overlay = shared.drawings[shared.drawings.length - 1];
	//  Bail out of here if we don't yet have an overlay component.  This means nothing has
	//  been added to the overlay anyway.
	if ( shared.overlayComponent === undefined )
		return;
	//  The overlay component needs to be the foreground of the top level of the overlay
	//  drawing.  See if this needs to be done.
	if ( shared.drawings.overlay.topLevel.getForeground() === null ) {
		shared.drawings.overlay.topLevel.setForeground( shared.overlayComponent );
		shared.overlayComponent.setDrawing( shared.drawings.overlay );
	}
	//  Finally, redraw the overlay drawing.
	shared.drawings.overlay.doRedraw();
};

//==============================================================================
//  Translatable number class (originally used for font size)
//==============================================================================
function JDHNumber( type ) {
	var obj = {};
	obj.type = type;
	obj.value = null;
	obj.setValue = function( newVal ) {
		this.value = newVal;
	}
	return obj;
}

//==============================================================================
//  PAINT TYPES
//
//==============================================================================
var UNKNOWN_PAINT         = 0;
var COLOR_PAINT           = 1;
var LINEAR_GRADIENT_PAINT = 2;
var RADIAL_GRADIENT_PAINT = 3;
var IMAGE_PAINT           = 4;
var PATTERN_IMAGE_PAINT   = 5;
var POINTER_PAINT         = 6;

function Paint( type ) {
	var obj = {};
	obj.type = type;
	//  for colors
	obj.r = null;
	obj.g = null;
	obj.b = null;
	obj.a = null;
	obj.value = null;
	obj.x1;
	obj.y1;
	obj.r1;
	obj.x2;
	obj.y2;
	obj.r2;
	obj.img = null;
	obj.pattern = null;
	obj.dynamic = false;
	obj.useH1 = false;
	obj.useH2 = false;
	obj.stopList = null;
	obj.paint = null;
	obj.setPaint = function( newPaint ) {
		this.paint = newPaint;
	};
	//  Adds a "stop" to either a linear or radial gradient.  The "position" is a number between
	//  0.0 and 1.0 that assigns the position of the color in the gradient, and the "color"
	//  follows JDH color conventions - JavaScript strings are accepted as well as rgb() and rgba()
	//  function calls.
	obj.addStop = function( position, color ) {
		var stopObj = {};
		stopObj.position = position;
		stopObj.color = color;
		stopObj.next = null;
		//  Put this in our stop list
		if ( obj.stopList === null )
			obj.stopList = stopObj;
		else {
			var stop = obj.stopList;
			while ( stop.next !== null )
				stop = stop.next;
			stop.next = stopObj;
		}
	};
	return obj;
};

//  This is just a wrapper for a call to rgba().
function rgb( r, g, b ) {
	return rgba( r, g, b, null );
}

//  Create color "paint" with an alpha value.
//  R, G, B, and A values can be either less than  or equal to 1, in which case they
//  are interpreted as fractions, or greater than 1, in which case they are
//  interpreted as 0 - 255.  Zero is zero...doesn't matter.
function rgba( R, G, B, A ) {
	//  Alpha can be null
	var a = A;
	if ( a === null )
		a = 1.0;
	//  It is always defined as a fraction.
	if ( a > 1.0 )
		a = a / 255.0;
	//  Colors are defined as 0 - 255.
	var r = R;
	if ( r <= 1.0 )
		r = Math.round( r * 255 );
	var g = G;
	if ( g <= 1.0 )
		g = Math.round( g * 255 );
	var b = B;
	if ( b <= 1.0 )
		b = Math.round( b * 255 );
	//  New color
	var newPaint = new Paint( COLOR_PAINT );
	newPaint.r = r;
	newPaint.g = g;
	newPaint.b = b;
	newPaint.a = a;
	//  Convert the color to a string that JavaScript likes
	newPaint.value = "rgba( " + Math.floor( r ) + ", " + Math.floor( g ) + ", " + Math.floor( b ) + ", " + a + " )";
	return newPaint;
}

//=============================================================================
//  Some color conversion functions swiped from other sources.  These functions
//  have been examined carefully to make sure they do what they claim.
//
//  The JDH paint scheme does not recognize the values given to the CSS
//  "hsl()" function - which are done as percentages.  It prefers that if you
//  wish to use HSB (same as HSB) you convert the numbers to RGB using these
//  functions.
//=============================================================================
/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r * 255, g * 255, b * 255];
}

/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
 */
function rgbToHsv(r, g, b){
    r = r/255, g = g/255, b = b/255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if(max == min){
        h = 0; // achromatic
    }else{
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, v];
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
function hsvToRgb(h, s, v){
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [r * 255, g * 255, b * 255];
}

//  This was swiped from xenosaurus on github and slightly modified.
function hexToHsv( hex ) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec( hex );
	r = parseInt( result[1], 16 );
	g = parseInt( result[2], 16 );
	b = parseInt( result[3], 16 );
	r /= 255, g /= 255, b /= 255;
	var max = Math.max(r, g, b), min = Math.min(r, g, b);
	var h, s, l = (max + min) / 2;
	if ( max == min ) {
		h = s = 0; // achromatic
	} else {
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch ( max ) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}
	return [h, s, l];
}

//  Butchered from above. RGB values are fractions of 1.
function hexToRgb( hex ) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec( hex );
	r = parseInt( result[1], 16 );
	g = parseInt( result[2], 16 );
	b = parseInt( result[3], 16 );
	r /= 255, g /= 255, b /= 255;
	return [r, g, b];
}

//  Define linear gradient paint.  This is not a full definition - you need to add "stops"
//  to make this work.  The x and y values can be either absolute (if they are greater than
//  1) or relative (if they are 1 or less), following the rules of component sizes.
function linearGradient( x1, y1, x2, y2 ) {
	var newPaint = new Paint( LINEAR_GRADIENT_PAINT );
	newPaint.x1 = x1;
	newPaint.y1 = y1;
	newPaint.x2 = x2;
	newPaint.y2 = y2;
	return newPaint;
}

//  Define a radial gradient with two positions and radii.  Positions and radii
//  may be "absolute" or "relative" to width and height.  Both radii are scaled
//  to the window width when "relative" unless the associated "useH" value is
//  set to "true".
function radialGradient( x1, y1, r1, x2, y2, r2, useH1, useH2 ) {
	var newPaint = new Paint( RADIAL_GRADIENT_PAINT );
	newPaint.x1 = x1;
	newPaint.y1 = y1;
	newPaint.r1 = r1;
	newPaint.x2 = x2;
	newPaint.y2 = y2;
	newPaint.r2 = r2;
	//  Set useH1 and useH2 if they are explicitly set, otherwise assume they
	//  are false.
	if ( useH1 !== undefined && useH1 !== null )
		newPaint.useH1 = useH1;
	if ( useH2 !== undefined && useH2 !== null )
		newPaint.useH2 = useH2;
	return newPaint;
}

//  Define an image as paint.  The image will not be repeated in any way - for that
//  type of behavior use "patternImage()".  If "dynamic" is false, or is not set, the
//  image will be loaded once to save time.  If "dynamic" is true, the image will be
//  loaded each time it is drawn, which may be inefficient.
function image( sourceFile, dynamic ) {
	var newPaint = Paint( IMAGE_PAINT );
	if ( dynamic === undefined || dynamic === false ) {
		newPaint.img = new Image();
		newPaint.img.src = sourceFile;
		newPaint.dynamic = true;
	}
	else
		newPaint.img = sourceFile;
	return newPaint;
};

//  Define a "pattern" image.  The pattern is given as the second argument - it can be
//  one of "repeat", "repeat-x", "repeat-y" or "no-repeat".  The result of last option
//  is the same as the "image()" function.  If you want to stretch an image to fit an
//  available space, you need to use the "ImageRectangle" component.
function patternImage( sourceFile, pattern, dynamic ) {
	var newPaint = Paint( PATTERN_IMAGE_PAINT );
	if ( dynamic === undefined || dynamic === false ) {
		newPaint.img = new Image();
		newPaint.img.src = sourceFile;
		newPaint.dynamic = true;
	}
	else
		newPaint.img = sourceFile;
	newPaint.pattern = pattern;
	return newPaint;
};

//--------------------------------
//  This is a generic translate function that returns a number.  Originally designed as a font scale
//  analogue to translatePaint (see below) to be used in themes, it might have other uses.
//
//  You set one of these by changing the value of a "pointerNumber()" class.
//------
function translateNumber( ins, num ) {
	//  This allows the number to be an object that contains another number.  This can
	//  be used to make settings (such as font size) that use the number all change with
	//  the change of a single value.
	if ( typeof( num ) == "object" ) {
		//  There might be a case statement in here for different types of objects...for the
		//  moment all we have are "values", which can be numbers or strings.
		return translateValue( ins, num.value );
	}
	//  This allows the number to be a simple number.  If that makes any sense.
	else
	   return num;
}

//--------------------------------
//  Interpret a value - this is used by translateNumber() above.
//------
function translateValue( ins, value ) {
	//  What is the current value?
	switch ( typeof( value ) ) {
		// If it is a simple number, return that number.
		case "number":
			return value;
			break;
		//  A string can contain a number or a reverse-Polish operation, with two items
		//  seperated by a comma followed by +, -, / , or *.  
		case "string":
			//  See if it is a number
			var newNum = Number( value );
			if ( !isNaN( newNum) )
				return newNum;
			//  String whitespace from the string
			var str = value.trim();
			//  Is there a comma in this string, indicating an operation?
			var n = str.indexOf( "," );
			if ( n !== -1 ) {
				//  Whatever is before the string is the "X" value being operated on.
				var xVal = translateValue( ins, str.substring( 0, n ) );
				//  The outermost operator (which should be the last character) is applied to
				//  the second value, which is everthing in-between.
				var yVal = translateValue( ins, str.substring( n + 1, str.length - 1 ) );
				//  Use the operator to create a final value.
				switch ( str[str.length - 1 ] ) {
					case '/':
						return ( xVal / yVal );
						break;
					case '*':
						return ( xVal * yVal );
						break;
					case '+':
						return ( xVal + yVal );
						break;
					case '-':
						return ( xVal - yVal );
						break;
				}
				console.error( "operator " + str[str.length - 1 ] + " not recognized" );
			}
			else {
				//  Interpret the string as a variable.  Variables have two parts - a component and
				//  a characteristic, seperated by a ".".  As in "win.x".  The component is identified
				//  by its name.  Characteristics are limited to x, y, w, h (all in pixels).
				var n = str.indexOf( "." );
				if ( n !== -1 ) {
					var componentPtr = ins.drawing.topLevel.findChildByName( str.substring( 0, n ) );
					if ( componentPtr === null ) {
						console.error( "unable to locate component named \"" + str.substring( 0, n ) + "\"" );
						return 0;
					}
					//  Compare the characteristic against those we know.
					switch ( str.substring( n + 1, str.length ) ) {
						case "x":
							return componentPtr.drawX;
							break;
						case "y":
							return componentPtr.drawY;
							break;
						case "w":
							return componentPtr.drawW;
							break;
						case "h":
							return componentPtr.drawH;
							break;
					}
					console.error( "unable to locate characteristic \"" + str.substring( n + 1, str.length ) + "\" in component \"" + str.substring( 0, n ) + "\"" );
				}
				else {
					return componentPtr.xPixel( inst.slice( 1 ) );
				}
			}
			break;
	}
}

//--------------------------------
//  This is the analogue to "pointerPaint".  See the comments on that function (below).
//------
function pointerNumber( newNumberSpec ) {
	if ( newNumberSpec === undefined )
		return new JDHNumber();
	else {
		var newNum = new JDHNumber();
		newNum.setValue( newNumberSpec );
		return newNum;
	}
}

//--------------------------------
//  Using the given Instructions, translate the paint to something JavaScript
//  can deal with.
//------
function translatePaint( ins, paint ) {
	//  Check the variable type - a string will indicate a direct color definition (e.g. "#ffffff").
	if ( typeof( paint ) === "string" )
		return paint;
	//  Color paint is simple - just spit out the value.
	else if ( paint.type === COLOR_PAINT )
		return paint.value;
    //  "Mapped" paint just adds a layer of absraction - the paint object is a pointer to
	//  another paint object.
	else if ( paint.type === POINTER_PAINT )
		return translatePaint( ins, paint.paint );
	//  Gradients - these have to be constructed using the current drawing
	//  context.  Dimensions may depend on the current window size.
	else if ( paint.type === LINEAR_GRADIENT_PAINT || paint.type === RADIAL_GRADIENT_PAINT ) {
		//  All gradients.  The x and y positions may be "absolute" (in pixels) or "relative"
		//  (fractions of the window width/height).
		var x1 = paint.x1;
		var y1 = paint.y1;
		var x2 = paint.x2;
		var y2 = paint.y2;
		//  x1
		if ( Math.abs( paint.x1 ) < 1 )
			x1 = paint.x1 * ins.w;
		else
			x1 = paint.x1;
		if ( x1 < 0 )
			x1 = ins.x + ins.w + x1;
		else
			x1 = ins.x + x1;
		//  y1
		if ( Math.abs( paint.y1 ) < 1 )
			y1 = paint.y1 * ins.h;
		else
			y1 = paint.y1;
		if ( y1 < 0 )
			y1 = ins.y + ins.h + y1;
		else
			y1 = ins.y + y1;
		//  x2
		if ( Math.abs( paint.x2 ) < 1 )
			x2 = paint.x2 * ins.w;
		else
			x2 = paint.x2;
		if ( x2 < 0 )
			x2 = ins.x + ins.w + x2;
		else
			x2 = ins.x + x2;
		//  y2
		if ( Math.abs( paint.y2 ) < 1 )
			y2 = paint.y2 * ins.h;
		else
			y2 = paint.y2;
		if ( y2 < 0 )
			y2 = ins.y + ins.h + y2;
		else
			y2 = ins.y + y2;
		//  Type-specific settings.
		var ret = null;
		if ( paint.type === LINEAR_GRADIENT_PAINT )
			ret = ins.ctx.createLinearGradient( x1, y1, x2, y2 );
		else if ( paint.type === RADIAL_GRADIENT_PAINT ) {
			//  Radial gradients also include radii.  These can be "absolute" or "relative"
			//  (where they are a fraction of the width or height), but they cannot be
			//  negative.
			var r1 = paint.r1;
			var r2 = paint.r2;
			if ( paint.r1 < 1 ) {
				//  We scale by the width unless told otherwise...
				if ( paint.useH1 )
					r1 = paint.r1 * ins.h;
				else
					r1 = paint.r1 * ins.w;
			}
			if ( paint.r2 < 1 ) {
				//  We scale by the width unless told otherwise...
				if ( paint.useH2 )
					r2 = paint.r2 * ins.h;
				else
					r2 = paint.r2 * ins.w;
			}
			ret = ins.ctx.createRadialGradient( x1, y1, r1, x2, y2, r2 );
		}
		//  Add stops.  There can be any number of these.  Same for both gradient types.
		var stop = paint.stopList;
		while ( stop !== null ) {
			//  The color might be a string, or it might be a Paint object.
			if ( typeof( stop.color ) === "string" )
				ret.addColorStop( stop.position, stop.color );
			else
				ret.addColorStop( stop.position, stop.color.value );
			stop = stop.next;
		}
		return ret;
	}
	else if ( paint.type === IMAGE_PAINT ) {
		if ( paint.dynamic )
			var img = paint.img;
		else {
			var img = new Image();
			img.src = paint.img;
		}
		ret = ins.ctx.createPattern( img, 'no-repeat' );
		return ret;
	}
	else if ( paint.type === PATTERN_IMAGE_PAINT ) {
		if ( paint.dynamic )
			var img = paint.img;
		else {
			var img = new Image();
			img.src = paint.img;
		}
		ret = ins.ctx.createPattern( img, paint.pattern );
		return ret;
	}
};

//------------------------------------------------------------------------------
//  Create a "paint within a paint" reference.  This allows the user to set a
//  paint "type" to an initial value, and then later on change what that paint
//  points to.  Any components that use the paint type will have their paint
//  color changed as well.
//
//  This allows the use of color "themes", where all parts of a user interface
//  use the same paint types for drawing (say, "backgroundPaint" or "fontPaint")  
//  that have some intial value, but are then adjusted later to a different
//  set of paints.  The reason this works (and is necessary) is that paints are 
//  "translated" when they are initially defined (see the "rgba()" function for
//  instance), and these translated values are what form the paint used when
//  the component is drawn.  Unless the paint is explicitly changed in every
//  component, they will always draw the same translated paint.  With this
//  scheme we are effectively handing a "pointer" to paint, into which we can
//  put any translated paint we want at any time.  The component will pass
//  through the pointer and find the new (translated) paint.
//
//  To use this scheme, define a paint object using this function, and then use the
//  "setPaint()" function to set the "pointer" to a specific, translated paint - you
//  can use any paint definition you like (rgb, rgba, etc.).  At a later time, 
//  you can change the paint using the "SetPaint()" using any other translated
//  paint you like - all components will draw using the new paint on the next
//  drawing cycle.
//
//  EXAMPLE:
//
//  You start by defining a paint to be applied to outlines in all drawings.
//  Then set it to something you want (using one of the "translation"
//  functions).
//     drawingOutlinePaint = pointerPaint();
//     drawingOutlinePaint.setPaint( rgb( 10, 10, 100 ) );
//
//  Probably a better way to do the above is to set an initial value for
//  the paint (otherwise this paint will be defined as null initially).
//     drawingOutlinePaint = ponterPaint( rgb( 10, 10, 100 ) );
//  
//  Within your drawings you can refer to this paint as if it were defined
//  like any other paint.
//     theDrawing.setOutlinePaint( drawingOutlinePaint );
//
//  At some later date, you decide this paint is not what you want, so you
//  change it.
//     drawingOutlinePaint.setPaint( rgb( 200, 200, 0 ) );
// 
//  Redraw, and the new paint should be used!
//------------------------------------------------------------------------------
function pointerPaint( newPaintSpec ) {
	if ( newPaintSpec === undefined )
		return new Paint( POINTER_PAINT );
	else {
		var newPaint = new Paint( POINTER_PAINT );
		newPaint.setPaint( newPaintSpec );
		return newPaint;
	}
}

//==============================================================================
//  Text Justification
//
//  These variables are only recognized by a couple of Component functions,
//  but they may serve other purposes.
//==============================================================================
var RIGHT            = 0;
var LEFT             = 1;
var CENTER           = 2;

//==============================================================================
//  FONTS
//
//  The "Font" object contains all information necessary for drawing fonts.
//  These items can also be set separately.
//==============================================================================
var FONT_FILLED      = 0;
var FONT_OUTLINE     = 1;
var FONT_BOTH        = 2;
function Font( family, size, bold, italic, outline, variant ) {
	var obj = {};
	if ( family !== undefined )
		obj.family = family;
	else
		obj.family = null;
	if ( size !== undefined )
		obj.size = size;
	else
		obj.size = null;
	if ( bold !== undefined )
		obj.bold = bold;
	else
		obj.bold = null;
	if ( italic !== undefined )
		obj.italic = italic;
	else
		obj.italic = null;
	if ( outline !== undefined )
		obj.outline = outline;
	else
		obj.outline = null;
	if ( variant !== undefined )
		obj.variant = variant;
	else
		obj.variant = null;
	return obj;
};

//==============================================================================
//  LINE/CAP/JOIN STYLES
//==============================================================================
var BUTT_LINECAP     = 0;
var ROUND_LINECAP    = 1;
var SQUARE_LINECAP   = 2;
var lineCapString = ['butt', 'round', 'square'];

var MITER_LINEJOIN   = 0;
var BEVEL_LINEJOIN   = 1;
var ROUND_LINEJOIN   = 2;
var lineJoinString = ['miter', 'bevel', 'round'];

//==============================================================================
//  SOME USEFUL DEFINITIONS
//
//  These are shared by many components, and might have different meanings
//  in different components.  Essentially this is just a list of useful words
//  that make components more user-friendly.
//==============================================================================
var LINEAR           = 0;
var LOG              = 1;

//==============================================================================
//  PIXEL LOCATIONS
//
//  These are values and functions used to produce pixel locations using a set
//  of instructions.  These instructions may refer to components (by name).
//  See the comments in the findXPixel() function to follow what is going on.
//  Below are some of the rules that can be used to make up an instruction set.
//==============================================================================
var X_PROJECTION     = 1;
var Y_PROJECTION     = 2;
var ADD              = 3;
var SUM              = 3;
var SUB              = 4;
var SUBTRACT         = 4;
var MULTIPLY         = 5;
var MULT             = 5;
var MUL              = 5;
var DIV              = 6;
var DIVIDE           = 6;

//  Using the instructions "inst", find a pixel in terms of the existing drawing
//  area.  The instructions should be contained in an array.
function findXPixel( inst ) {
	if ( topLevel === null )
		return 0;
	return topLevel.xPixel( inst );
};

function findYPixel( inst ) {
	if ( topLevel === null )
		return 0;
	return topLevel.yPixel( inst );
};

//==============================================================================
//                                                                                                                       
//                                                                                                                       
//  __________                                        ____    ____                        ___ ___                        
//  `MMMMMMMMM                                        `MM'    `MM'                        `MM `MM 68b                    
//   MM      \                            /            MM      MM                          MM  MM Y89                    
//   MM     ____    ___  ____  ___  __   /M            MM      MM    ___   ___  __     ____MM  MM ___ ___  __     __     
//   MM    ,`MM(    )M' 6MMMMb `MM 6MMb /MMMMM         MM      MM  6MMMMb  `MM 6MMb   6MMMMMM  MM `MM `MM 6MMb   6MMbMMM 
//   MMMMMMM `Mb    d' 6M'  `Mb MMM9 `Mb MM            MMMMMMMMMM 8M'  `Mb  MMM9 `Mb 6M'  `MM  MM  MM  MMM9 `Mb 6M'`Mb   
//   MM    `  YM.  ,P  MM    MM MM'   MM MM            MM      MM     ,oMM  MM'   MM MM    MM  MM  MM  MM'   MM MM  MM   
//   MM        MM  M   MMMMMMMM MM    MM MM            MM      MM ,6MM9'MM  MM    MM MM    MM  MM  MM  MM    MM YM.,M9   
//   MM        `Mbd'   MM       MM    MM MM            MM      MM MM'   MM  MM    MM MM    MM  MM  MM  MM    MM  YMM9    
//   MM      /  YMP    YM    d9 MM    MM YM.  ,        MM      MM MM.  ,MM  MM    MM YM.  ,MM  MM  MM  MM    MM (M       
//  _MMMMMMMMM   M      YMMMM9 _MM_  _MM_ YMMM9       _MM_    _MM_`YMMM9'Yb_MM_  _MM_ YMMMMMM__MM__MM__MM_  _MM_ YMMMMb. 
//                                                                                                              6M    Yb 
//                                                                                                              YM.   d9 
//                                                                                                               YMMMM9  //
//  The event model in JDH is a copy of Fltk's, for the most part.  All events
//  that the system is aware of are trapped, using the code here.  The events are
//  then sent to the "handle()" methods of all components, through the component
//  hierarchy, until the components run out or one of them "consumes" the event 
//  by returning "true" from its "handle()" method.  The function "doRedraw()"
//  is provided so that handle methods can cause a redraw after an event is
//  completely processed.  Calling "redraw()" in individual handlers might mean
//  a single event could trigger many such calls, and I believe they are processed
//  immediately - so that could slow things down.
//==============================================================================

//  These are the different types of events
var UNKNOWN_EVENT  = 0;
var MOUSE_PUSH     = 1;
var MOUSE_RELEASE  = 2;
var MOUSE_LEAVE    = 3;
var MOUSE_ENTER    = 4;
var MOUSE_MOVE     = 5;     //  Move when the mouse has no buttons pushed
var MOUSE_DRAG     = 6;     //  Move when the mouse has a button pushed
var MOUSE_WHEEL    = 7;     //  The mouse wheel was spun
var MOUSE_CLICK    = 8;     //  Mouse was pushed and released in the same position
var MOUSE_HOVER    = 9;     //  Mouse was left in a position for a defined interval
var KEY_DOWN       = 10;    //  A key was pressed - occurs for almost all keys
var KEY_UP         = 11;    //  A key was released - occurs for almost all keys
var KEY_PRESS      = 12;    //  A key was pressed - occurs for most "typeable" keys
							//  but not things like shift and control
var NEW_FOCUS      = 13;    //  I created this event - it means a component has grabbed
							//  focus.  All other components should lose it.
var TIMEOUT_EVENT  = 14;    //  Throw a "timeout" through the event handler.
var TOUCH_START    = 15;
var TOUCH_MOVE     = 16;
var TOUCH_END      = 17;

var POINTER_DRAG   = 18;
var DRAG_START     = 19;
var DRAG_END       = 20;
							
//  These are the different keys that can be typed on the keyboard.  KEY_TYPING
//  means a typeable character.
var KB_TYPING     = 0;
var KB_BACKSPACE  = 8;
var KB_TAB        = 9;
var KB_UNDEFINED  = 12;   //  This is the center of the numeric keypad when "numlock" is off.
var KB_ENTER      = 13;
var KB_SHIFT      = 16;
var KB_CTRL       = 17;
var KB_ALT        = 18;
var KB_PAUSE      = 19;
var KB_CAPSLOCK   = 20;
var KB_ESCAPE     = 27;
var KB_PAGEUP     = 33;
var KB_PAGEDOWN   = 34;
var KB_END        = 35;
var KB_HOME       = 36;
var KB_ARROWLEFT  = 37;
var KB_ARROWUP    = 38;
var KB_ARROWRIGHT = 39;
var KB_ARROWDOWN  = 40;
var KB_INSERT     = 45;
var KB_DELETE     = 46;
var KB_F1         = 112;
var KB_F2         = 113;
var KB_F3         = 114;
var KB_F4         = 115;
var KB_F5         = 116;
var KB_F6         = 117;
var KB_F7         = 118;
var KB_F8         = 119;
var KB_F9         = 120;
var KB_F10        = 121;
var KB_F11        = 122;
var KB_F12        = 123;

var capsLockState = false;
var shiftState = false;
var altState = false;
var controlState = false;

function isCapsLock() { return capsLockState; }
function isShift() { return shiftState; }
function isAlt() { return altState; }
function isControl() { return controlState; }

//===================================================
//  CUT/PASTE works internally (i.e. you can copy stuff to the paste buffer
//  and obtain its contents), but for whatever reason I can't get it to use
//  the window manager paste buffer.
//  A copy/paste buffer
pasteBuffer = null;

function getPasteBuffer() {
	return pasteBuffer;
};
function setPasteBuffer( newText ) {
	pasteBuffer = newText;
};

//  Some helper functions for common queries...
//  See if some version of a control-x is being used here.  Return true if so.
//  You can (optionally) fill the system clipboard with content.
function cutEvent( event, bufferText ) {
	if ( ( event.e.key === 'x' || event.e.key === 'X' ) && event.e.ctrlKey ) {
		if ( bufferText !== undefined ) {
			setPasteBuffer( bufferText );
		}
		return true;
	}
	return false;
};

//  Determine whether a control-c is being typed, and optionally
//  copy the given text into the paste buffer.
function copyEvent( event, bufferText ) {
	if ( ( event.e.key === 'c' || event.e.key === 'C' ) && event.e.ctrlKey ) {
		if ( bufferText !== undefined ) {
			setPasteBuffer( bufferText );
		}
		return true;
	}
	return false;
};

//  Return whether or not this is a paste instuction (control-v).  The content
//  to be pasted can be obtained using "getPasteBuffer()".
function pasteEvent( event ) {
	if ( ( event.e.key === 'v' || event.e.key === 'V' ) && event.e.ctrlKey ) {
		return true;
	}
	return false;
};
//=====================================================

//  The EventInfo struction contains all the information needed to deal with an event.
function EventInfo( e ) {
	obj = {};
	obj.e = e;          //  data from JavaScript
	obj.type;           //  this is my type (see list above)
	obj.touch = false;  //  used to indicate a "touch" (finger) event type
	obj.touchType;      //  only check this if the above is true!
	obj.dragStartX;     //  position where a drag started
	obj.dragStartY;
	obj.dragX;          //  pixels dragged from start
	obj.dragY;
	obj.delta;          //  mousewheel direction - might have other uses?
	obj.component;      //  target component - used for timeouts
	return obj;
};

//  This function includes the instructions for trapping all events.  Events are
//  handed to individual functions, based on their type.  All events are trapped
//  at the window level, then handed to individual JDH drawings.
JDHDrawing.prototype.initEventHandlers = function() {
	//  This needs to be done only once for a window, thus the use of this check.
	if ( window.JDHevents === undefined ) {
		window.JDHevents = {};
		window.addEventListener( 'pointerdown', handleMouseDown );
		window.addEventListener( 'pointerup', handleMouseRelease );
		window.addEventListener( 'pointerout', handleMouseLeave );
		window.addEventListener( 'pointerover', handleMouseEnter );
		window.addEventListener( 'pointerenter', handleMouseEnter );  // redundant? does nothing?
		window.addEventListener( 'pointermove', handleMouseMove );
		window.addEventListener( "mousewheel", handleMouseWheel );      //  This for Safari, MS, Chrome, etc.
		window.addEventListener( "DOMMouseScroll", handleMouseWheel );  //  This for Firefox
		window.addEventListener( 'keypress', handleKeyPress );
		window.addEventListener( 'keyup', handleKeyUp );
		window.addEventListener( 'keydown', handleKeyDown );
		window.addEventListener( 'dragstart', handlePointerDrag );
//		window.addEventListener( '')
		//  Some variables we need.
		window.JDHevents.mousePushed = false;
		window.JDHevents.mousePushedX = 0;
		window.JDHevents.mousePushedY = 0;
		window.JDHevents.lastMoveX = 0;
		window.JDHevents.lastMoveY = 0;
		window.JDHevents.hoverInterval = 500;//1500;
		window.JDHevents.hoverEvent = null;
		window.JDHevents.hoverTimeoutID = null;
		//  This guy is used to trigger overlay redraws.
		window.JDHevents.overlayRedrawTrigger = false;
	}
	//  The redrawTrigger variable is turned on by the doRedraw() function - this occurs
	//  inside event handlers if they want to redraw things.  The processEvent() function
	//  (below) deals with this.  All drawings have their own redraw trigger - they may
	//  also tell other drawings to redraw.
	this.redrawTrigger = false;
};

//------------------------------------------------------------------------------
//  These are the event handling functions.  Each builds a new "EventInfo" structure
//  for the event which is then passed to the "tryHandle()" function at the top level
//  through which the event is passed to all components to see which, if any, want it.
//------------------------------------------------------------------------------


//  This function is called by event handlers to trigger a redraw after the event is
//  completely processed.
JDHDrawing.prototype.doRedraw = function() {
	this.redrawTrigger = true;
};

//  This function is a similar function that can be used outside events.  Mostly doRedraw()
//  works, but when combining multiple windows this proved necessary.
JDHDrawing.prototype.nonEventDoRedraw = function() {
	this.nonEventDoRedrawTrigger = true;
};

//  This applies to the overlay drawing.
function doOverlayRedraw() {
	window.JDHevents.overlayRedrawTrigger = true;
};

//  This function "processes" an event within a specific drawing.
JDHDrawing.prototype.processEvent = function( event ) {
	this.redrawTrigger = false;
	return this.topLevel.tryHandle( event );
}

//  Redraw this drawing if the "doRedraw" flag has been set for it.
JDHDrawing.prototype.checkForRedraw = function() {
	if ( this.redrawTrigger || this.nonEventDoRedrawTrigger ) {
		this.redrawTrigger = false;
		this.nonEventDoRedrawTrigger = false;
		this.redraw();
	}
};

//  This is a global version of the processEvent() function used by each drawing.
//  In this function we just throw the event at each drawing individually.
function processEvent( event ) {
	window.JDHevents.overlayRedrawTrigger = false;
	var shared = SharedMemory( "JDHShared" );
	var ret = false;
	//  See if the overlay wants the event first.  Of course - there may not be an
	//  overlay at all.
	if ( shared.overlayComponent !== undefined && shared.drawings.overlay !== undefined ) {
		event.drawing = shared.drawings.overlay;
		event.px = event.e.clientX - event.drawing.x;
		event.py = event.e.clientY - event.drawing.y;
		ret = shared.overlayComponent.tryHandle( event );
		//  See if the redraw flag has been set for the overlay drawing.  If so, cause
		//  a "redrawOverlay".
		if ( shared.drawings.overlay.redrawTrigger )
			doOverlayRedraw();
	}
	//  Check all drawings (in the reverse of the order they were defined) to
	//  see which ones want this event.  If a drawing returns "true", it means
	//  it wants to "consume" the event, such that nobody else sees it.
	for ( var i = shared.drawings.length; i > 0 && !ret; --i ) {
		event.drawing = shared.drawings[i-1];
		event.px = event.e.clientX - event.drawing.x;
		event.py = event.e.clientY - event.drawing.y;
		ret = shared.drawings[i-1].processEvent( event );
	}
	//  Check the overlay redraw instruction - if it is triggered, redraw the
	//  overlay drawing.  This will simply turn on the redraw instruction for
	//  the overlay drawing.
	if ( window.JDHevents.overlayRedrawTrigger )
		redrawOverlay();
	//  See which drawings require a redraw after this event.  This will cause things
	//  to redraw immediately (as opposed to part of the redraw cycle).
	for ( var i = 0; i < shared.drawings.length; ++i )
		shared.drawings[i].checkForRedraw();
};

//  Returns the component that absorbed the last event.  If this is unknown,
//  null is returned.
function getLastEventComponent() {
	if ( window.lastEventComponent === undefined )
		return null;
	else
		return window.lastEventComponent;
};

//  Set the component that is absorbing the last event.
function setLastEventComponent( newComponent ) {
	window.lastEventComponent = newComponent;
};

function handlePointerDrag( e ) {
	clearTimeout( window.JDHevents.hoverTimeoutID );
	var event = EventInfo( e );
	event.type = POINTER_DRAG;
	window.processEvent( event );
}

//  A "mouse down" means a mouse button was pushed - it might be part of a "click"
//  or it might initiate a drag.
function handleMouseDown( e ) {
	e.preventDefault();
	clearTimeout( window.JDHevents.hoverTimeoutID );
    window.JDHevents.mousePushed = true;
    window.JDHevents.mousePushedX = e.clientX;
    window.JDHevents.mousePushedY = e.clientY;
	var event = EventInfo( e );
	event.type = MOUSE_PUSH;
	window.processEvent( event );
};

//  The "hover" event is one I am manufacturing.  If a mouse is moved and left in a
//  position for the "hoverInterval", a single "hover" event will be generated.  The
//  hoverInterval is defined in milliseconds.
function setHoverInterval( newVal ) {
	window.JDHevents.hoverInterval = newVal;
}

//  Mouse moving within the drawing area, regardless of what is pushed.  We figure
//  out if this is actually a "drag" event, and set up the EventInfo accordingly.
//JDHDrawing.prototype.handleMouseMove = function( e ) {
function handleMouseMove( e ) {
	e.preventDefault();
	var event = EventInfo( e );
	clearTimeout( window.JDHevents.hoverTimeoutID );
	//  See if this is a "drag" event (i.e. a mouse button is pushed)
	if ( window.JDHevents.mousePushed ) {
		event.type = MOUSE_DRAG;
		event.dragStartX = window.JDHevents.mousePushedX;
		event.dragStartY = window.JDHevents.mousePushedY;
		event.dragX = e.clientX - window.JDHevents.mousePushedX;
		event.dragY = e.clientY - window.JDHevents.mousePushedY;
		event.component = getLastEventComponent();
	}
	else {
		event.type = MOUSE_MOVE;
		window.JDHevents.hoverEvent = EventInfo( e );
		window.JDHevents.hoverTimeoutID = setTimeout( hoverEventTimeout, window.JDHevents.hoverInterval );
	}
	window.JDHevents.lastMoveX = e.clientX;
	window.JDHevents.lastMoveY = e.clientY;
	processEvent( event );
};

function hoverEventTimeout() {
	window.JDHevents.hoverEvent.type = MOUSE_HOVER;
	processEvent( window.JDHevents.hoverEvent );
	//  This is a "fake" event, so redrawing in response to it doesn't quite work right.
	//  I simulate it here first by redrawing the event drawing, if needed, then doing the
	//  same for the overlay, if that was triggered.
	if ( window.JDHevents.hoverEvent.drawing.redrawTrigger )
		window.JDHevents.hoverEvent.drawing.resize();
		if ( window.JDHevents.overlayRedrawTrigger ) {
			var shared = SharedMemory( "JDHShared" );
			if ( shared.drawings[shared.drawings.length-1] !== window.JDHevents.hoverEvent.drawing )
				shared.drawings[shared.drawings.length-1].resize();
		}
	}

//  The mouse button, previously pushed, was released.
function handleMouseRelease( e ) {
	clearTimeout( window.JDHevents.hoverTimeoutID );
    window.JDHevents.mousePushed = false;
	var event = EventInfo( e );
	event.type = MOUSE_RELEASE;
	processEvent( event );
	//  A release might also be a mouse click event - if the mouse wasn't moved
	//  between push and release.
	if ( e.clientX === window.JDHevents.mousePushedX && e.clientY === window.JDHevents.mousePushedY ) {
		var event = EventInfo( e );
		event.type = MOUSE_CLICK;
		processEvent( event );
	}
};

//--------------------------------
//  This is the end of a "touch" activity (the user stopped touching).  It behaves
//  like a "mouse up" (or "release").
//------
function handleTouchEnd( e ) {
	clearTimeout( window.JDHevents.hoverTimeoutID );
    window.JDHevents.mousePushed = false;
	var event = EventInfo( e );
	event.type = TOUCH_END;//MOUSE_RELEASE;
	event.touch = true;
	event.touchType = TOUCH_END;
	event.px = e.changedTouches[event.changedTouches.length - 1].pageX;
	event.py = e.changedTouches[event.changedTouches.length - 1].pageY;
	processEvent( event );
	//  A release might also be a mouse click event - if the mouse wasn't moved
	//  between push and release.
	if ( e.clientX === window.JDHevents.mousePushedX && e.clientY === window.JDHevents.mousePushedY ) {
		var event = EventInfo( e );
		event.type = MOUSE_CLICK;
		processEvent( event );
	}
//	e.preventDefault();  //  keep the device from using this event to do other things
};

//  The mouse wheel was moved.  We compute a "delta" that indicates the wheel 
//  direction, but not how much it was turned.  That information can be extracted
//  from the system's event structure ("e") which we pass as part of our EventInfo.
function handleMouseWheel( e ) {
	clearTimeout( window.JDHevents.hoverTimeoutID );
	var event = EventInfo( e );
	event.type = MOUSE_WHEEL;
    event.delta = Math.max(-1, Math.min( 1, ( e.wheelDelta || -e.detail ) ) );
	processEvent( event );
};

//  The mouse entered the canvas.
function handleMouseEnter( e ) {
	clearTimeout( window.JDHevents.hoverTimeoutID );
	var event = EventInfo( e );
	window.JDHevents.mousePushed = false;
	event.type = MOUSE_ENTER;
	processEvent( event );
};

//  The mouse left the canvas.
function handleMouseLeave( e ) {
	clearTimeout( window.JDHevents.hoverTimeoutID );
	var event = EventInfo( e );
	window.JDHevents.mousePushed = false;
	event.type = MOUSE_LEAVE;
	processEvent( event );
};

//  A key is being pressed.  This event occurs before a "key press".
function handleKeyDown( e ) {
	clearTimeout( window.JDHevents.hoverTimeoutID );
	//  Avoid "navigate back" behavior on some browsers - instead of doing that,
	//  consider this a key press.  
	if ( e.which === 8 ) {
		e.preventDefault();
		handleKeyPress( e );
	}
	var event = EventInfo( e );
	event.type = KEY_DOWN;
	//  Save the state of "control" keys.
	if ( e.key === "Shift" )
		shiftState = true;
	else if ( e.key === "Control" )
		controlState = true;
	else if ( e.key === "Alt" )
		altState = true;
	else if ( e.key === "CapsLock" )
		capsLockState = true;
	event.e.clientX = window.JDHevents.lastMoveX;
	event.e.clientY = window.JDHevents.lastMoveY;
	//  This is an effort to trap "missed" keys - keys that some browsers seem to
	//  ignore i.e. not recognize as "KEY_PRESS" events.
	this.keyDownProcessed = false;
	//  Determine the "JDH" key code associated with this key event.  If the key translation
	//  is a single-character string we assume it is a letter/number/symbol, and make the
	//  key code "KB_TYPING".  Otherwise we keep the existing key code.  A list of these codes
	//  is given above (search for "KB_TYPING").
	if ( event.e.key.length === 1 ) {
		event.e.JDHKeyCode = KB_TYPING;
	}
	else
		event.e.JDHKeyCode = event.e.keyCode;
	processEvent( event );
}

//  A key was pressed.
function handleKeyPress( e ) {
	clearTimeout( window.JDHevents.hoverTimeoutID );
	var event = EventInfo( e );
	event.type = KEY_PRESS;
	event.e.clientX = window.JDHevents.lastMoveX;
	event.e.clientY = window.JDHevents.lastMoveY;
	this.keyDownProcessed = true;
	//  Determine the "JDH" key code associated with this key event.  If the key translation
	//  is a single-character string we assume it is a letter/number/symbol, and make the
	//  key code "KB_TYPING".  Otherwise we keep the existing key code.  A list of these codes
	//  is given above (search for "KB_TYPING").
	if ( event.e.key.length === 1 ) {
		event.e.JDHKeyCode = KB_TYPING;
	}
	else
		event.e.JDHKeyCode = event.e.keyCode;
	processEvent( event );
}

//  A key was released.
function handleKeyUp( e ) {
	clearTimeout( window.JDHevents.hoverTimeoutID );
	var event = EventInfo( e );
	event.type = KEY_UP;
	if ( e.key === "Shift" )
		shiftState = false;
	else if ( e.key === "Control" )
		controlState = false;
	else if ( e.key === "Alt" )
		altState = false;
	else if ( e.key === "CapsLock" )
		capsLockState = false;
	event.e.clientX = window.JDHevents.lastMoveX;
	event.e.clientY = window.JDHevents.lastMoveY;
	//  Not sure why, but this caused backspace to trigger twice - at least on the Windows
	//  machine (not tested on others).  Thus the special check for the backspace key code.
	//  This if statement was required to trap keyboard events that some browsers seem to
	//  ignore - arrow keys, etc.
	if ( !this.keyDownProcessed && event.e.keyCode !== KB_BACKSPACE )
		handleKeyPress( e );
	this.keyDownProcessed = true;
	processEvent( event );
}

//  Generate a "new focus" event.  Focus is held by (at most) one component
//  at a time.  The argument to this function can be a component, or it can
//  be null.  The event will cause all components except the one matching
//  the argument to lose focus.
function newFocus( e, comp ) {
	var event = EventInfo( e );
	event.type = NEW_FOCUS;
	event.focusComponent = comp;
	processEvent( event );
}

//  Browswer detection....
var UNKNOWN_BROWSER                = 0;
var EXPLORER                       = 1;
var CHROME                         = 2;
var FIREFOX                        = 3;
var SAFARI                         = 4;
var OPERA                          = 5;

//  Return the browser type (from the above list).  This value is figured out once, and then
//  stored in shared memory.
function browserType() {
	//  Does this item already exist?  Set it if it doesn't.
	var shared = SharedMemory( "JDHShared" );
	if ( shared.browser === undefined ) {
		//Check if browser is IE
		if (navigator.userAgent.search("MSIE") >= 0) {
			shared.browser = EXPLORER;
		}
		//Check if browser is Chrome
		else if (navigator.userAgent.search("Chrome") >= 0) {
			shared.browser = CHROME;
		}
		//Check if browser is Firefox 
		else if (navigator.userAgent.search("Firefox") >= 0) {
			shared.browser = FIREFOX;
		}
		//Check if browser is Safari
		else if (navigator.userAgent.search( "Safari" ) >= 0 && navigator.userAgent.search("Chrome") < 0) {
			shared.browser = SAFARI;
		}
		//Check if browser is Opera
		else if (navigator.userAgent.search( "Opera ") >= 0) {
			shared.browser = OPERA;
		}
		else
			shared.browser = UNKNOWN_BROWSER;
	}	
	return shared.browser;
}

//  Compare two strings (or string objects, or whatever) for equality.  Can't
//  believe this stupid thing is necessary.
function stringsEqual( str1, str2 ) {
	if ( str1.length !== str2.length )
		return false;
	for ( var i = 0; i < str1.length; ++i ) {
		if ( str1.charAt( i ) != str2.charAt( i ) )
			return false;
	}
	return true;
}

//--------------------------------
//  This function is supposed to help raise a keyboard on mobile devices.  It works,
//  but is not seemingly necessary.  However given mobile stuff is a work in progress
//  I am not throwing it away just yet.
//
//  See where it can be used in the TextInput::handle() method under MOUSE_PUSH.
//------
function focusAndOpenKeyboard(el, timeout) {
	if(!timeout) {
	  timeout = 100;
	}
	if(el) {
	  // Align temp input element approximately where the input element is
	  // so the cursor doesn't jump around
	  var __tempEl__ = document.createElement('input');
	  __tempEl__.style.position = 'absolute';
	  __tempEl__.style.top = (el.offsetTop + 7) + 'px';
	  __tempEl__.style.left = el.offsetLeft + 'px';
	  __tempEl__.style.height = 0;
	  __tempEl__.style.opacity = 0;
	  // Put this temp element as a child of the page <body> and focus on it
	  document.body.appendChild(__tempEl__);
	  __tempEl__.focus();
  
	  // The keyboard is open. Now do a delayed focus on the target element
	  setTimeout(function() {
		el.focus();
		el.click();
		// Remove the temp element
		document.body.removeChild(__tempEl__);
	  }, timeout);
	}
  }
  


//=============================================================================
//  BoxButton
//  
//  This is a simple rectangular button with an outline that gives it a 3-D
//  appearance.  The default color/behavior is pretty good, but can be
//  adjusted using the functions in ShapeButton.
//=============================================================================
//=============================================================================
//  ShapeButton
//  
//  This is a button that maintains a number of colors that allow it to be
//  drawn with a 3D shape.  There is no sense using this class on its own,
//  as it looks and acts just like a regular button but with extra code.  It
//  is meant to be inherited.
//
//  The paint you can set:
//     offPaint - the background of the button when it is "off"
//     onPaint - the background of the button when it is "on"
//     pushedPaint - the background of the button when it is pushed
//     hoverPaint - the background of the button when the mouse is over it
//     illuminatedPaint - paint used on "edges" that imply a light on one side
//     shadowedPaint - the reverse of the above
//
//  For inheriting functions, three drawn areas are maintained.  These are
//  the button background, the upper left, and the lower right.  They are
//  simply empty components that can be added to as needed to draw the
//  inheriting button.  The paints above are applied as follows:
//
//  The background is painted with offPaint if the button is off, onPaint if
//  the button is on, pushedPaint if it is pushed, and hoverPaint if it is being
//  hovered over - these paints are applied in this order, which is to say
//  "hovering" takes precedent over "off" and "on", etc.
//
//  The upper left is painted with the illuminated paint when the button is
//  not pushed.  If it is pushed, the shadowed paint is used.
//
//  The lower right is the reverse of the upper left.
//
//  All of these paints are null to begin with, in which case they will not
//  be set.  Paints are applied in a "preSettings" function.
//=============================================================================

class ShapeButton extends Button {
	
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		this.setBackground( new Component( 0, 0, 1, 1 ) );
		this.upperLeft = new Component( 0, 0, 1, 1 );
		this.add( this.upperLeft );
		this.lowerRight = new Component( 0, 0, 1, 1 );
		this.add( this.lowerRight );
		this.offPaint = null;
		this.onPaint = null;
		this.pushedPaint = null;
		this.hoverPaint = null;
		this.illuminatedPaint = null;
		this.shadowedPaint = null;
	}

	//--------------------------------
	//  This is a way of setting the paint all at once.  In this case, paint can
	//  only be in the form of color, thus the name.  The given color will apply to
	//  the background, and be lightened and darkened to form the illuminated and
	//  shadowed paints.
	//------
	setColor( r, g, b ) {
		this.offPaint = rgb( r, g, b );
		this.illuminatedPaint = rgb( 255, 255, 255 );
		this.shadowedPaint = rgb( r * .65, g * .65, b * .65 );
	}

	//--------------------------------
	//  Provide access to the upper left component.
	//------
	getUpperLeft() {
		return this.upperLeft;
	};

	//--------------------------------
	//  Provide access to the lower right component.
	//------
	getLowerRight() {
		return this.lowerRight;
	}

	//--------------------------------
	//  Set the paint for the "illuminated" sides of the button.
	//------
	setIlluminatedPaint( newPaint ) {
		this.illuminatedPaint = newPaint;
	};
	getIlluminatedPaint() {
		return this.illuminatedPaint;
	}

	//--------------------------------
	//  Set the paint for the "shadowed" sides of the button.
	//------
	setShadowedPaint( newPaint ) {
		this.shadowedPaint = newPaint;
	};
	getShadowedPaint() {
		return this.shadowedPaint;
	}

	//--------------------------------
	//  The "hover" paint
	//------
	setHoverPaint( newPaint ) {
		this.hoverPaint = newPaint;
	};
	getHoverPaint() {
		return this.hoverPaint;
	}

	//--------------------------------
	//  The "on" paint
	//------
	setOnPaint( newPaint ) {
		this.onPaint = newPaint;
	};
	getOnPaint() {
		return this.onPaint;
	}

	//--------------------------------
	//  The "off" paint
	//------
	setOffPaint( newPaint ) {
		this.offPaint = newPaint;
	};
	getOffPaint() {
		return this.offPaint;
	}

	//--------------------------------
	//  The "pushed" paint
	//------
	setPushedPaint( newPaint ) {
		this.pushedPaint = newPaint;
	};
	getPushedPaint() {
		return this.pushedePaint;
	}

	//--------------------------------
	//  Set the paints for all of our components based on the state of the button.
	//------
	preSettings( ins ) {
		//  Background first.  Is it "on" or "off"?
		if ( this.buttonOn && this.onPaint !== null )
			this.getBackground().setFillPaint( this.onPaint );
		else if ( this.offPaint !== null )
			this.getBackground().setFillPaint( this.offPaint );
		//  Change if we are "pushed"
		if ( this.buttonPushed && this.pushedPaint !== null )
			this.getBackground().setFillPaint( this.pushedPaint );
		//  Change if we are "hovering"
		if ( this.buttonHover && this.hoverPaint !== null )
			this.getBackground().setFillPaint( this.hoverPaint );
		//  If we are "pushed", set the lower right to be illuminated and upper
		//  left to be shadowed.
		if ( this.buttonPushed ) {
			if ( this.illuminatedPaint !== null )
				this.getLowerRight().setCombinedPaint( this.illuminatedPaint );
			if ( this.shadowedPaint !== null )
				this.getUpperLeft().setCombinedPaint( this.shadowedPaint );
		}
		else {
			if ( this.illuminatedPaint !== null )
				this.getUpperLeft().setCombinedPaint( this.illuminatedPaint );
			if ( this.shadowedPaint !== null )
				this.getLowerRight().setCombinedPaint( this.shadowedPaint );
		}
	}

}

class BoxButton extends ShapeButton {

	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		//  Add a default background - filled gray rectangle.
		this.getBackground().add( new FillRectangle( 0, 0, 1, 1 ) );
		this.getBackground().setRelative( NOMINAL_SIZE, NOMINAL_SIZE, FRACTIONAL_SIZE, FRACTIONAL_SIZE );
		this.offPaint = rgb( 200, 200, 200 );
		//  The outline is drawn with "top left" and "lower right"
		//  lines.  The colors of these can be changed to make the button
		//  appear to be "pushed".  The outline is drawn in the foreground.
		this.illuminatedPaint = rgb( 255, 255, 255 );
		this.shadowedPaint = rgb( 100, 100, 100 );
		this.lr = new LinePath( 0, 0, 1, 1 );
		this.lr.setScaledDrawing( true );
		this.lr.moveTo( 0, 1 );
		this.lr.lineTo( 1, 1 );
		this.lr.lineTo( 1, 0 );
		this.getLowerRight().add( this.lr );
		this.ul = new LinePath( 0, 0, 1, 1 );
		this.ul.setScaledDrawing( true );
		this.ul.moveTo( 1, 0 );
		this.ul.lineTo( 0, 0 );
		this.ul.lineTo( 0, 1 );
		this.getUpperLeft().add( this.ul );
	}

}

//  TextInput
//  
//  This component allows entry of a single line of text.  It is based on the TextOutput component,
//  which displays a single line of text.
//
//  Default behavior:
//     - changes to the text value cause the "changedValuePaint" to be the background (the default
//       is yellow).  This indicates the value has been changed, but not "entered".
//     - hitting return "enters" the current value (if it has been changed) and triggers the
//       callback
//
//  You have the option of making the field sensitive to mouse clicks only when the shift key is
//  pushed.  To do this, set "conventionalClick" to false.
//
//=============================================================================
//  TextOutput
//  
//  This component displays text, accommodating formatting instructions
//  within the text.  The text itself is drawn by a Text Component that is
//  added as a child.  In addition to the text, a "highlighting" path is
//  maintained, and made visible or invisible based on user mouse clicks
//  and arrow keys.  This will draw a highlighted background behind a portion
//  of the text (this can be turned on or off).
//
//  A "cursor" position is also maintained despite input not being part of
//  this class (the TextInput Component, which inherits this component does
//  that).  This can be moved around and drawn on request.  The cursor is
//  drawn by an independent class TextCursor, which is a fully legitimate
//  component in its own right, although it is defined here.
// 
//=============================================================================
//BSIncude frame.js 

//=============================================================================
//  This class is used to draw a cursor.  At this time it is used internally
//  in TextOutput only, but maybe it has its own uses somewhere else, thus it
//  is an independent class.
//=============================================================================
class TextCursor extends Component {

	//  Definitions of cursor types.  These can be blinking or not based on
	//  the value of "blink".
	NO_CURSOR          = 0;
	LINE_CURSOR        = 1;
	OUTLINE_CURSOR     = 2;
	BOX_CURSOR         = 3;
	UNDERLINE_CURSOR   = 4;

	constructor( x, y, w, h ) {
		super( x, y, w, h, "" );
		this.type = this.NO_CURSOR;
		this.blink = false;
		//  Define the different cursor types.  These are added to the cursor
		//  "holder" so that we can control the drawing easily.
		this.holder = new Component( 0, 0, 1, 1 );
		this.add( this.holder );
		this.boxCursor = new FillRectangle( 0, 0, 1, 1 );
		this.holder.add( this.boxCursor );
		this.outlineCursor = new Rectangle( 0, 0, 1, 1 );
		this.holder.add( this.outlineCursor );
		this.underlineCursor = new Line( 0, 1, 1, 1 );
		this.holder.add( this.underlineCursor );
		this.lineCursor = new Line( 0, 0, 0, 1 );
		this.holder.add( this.lineCursor );
		this.timeoutID = null;
		this.blinkPattern = [3, 1];
		this.patternVisible = true;
		this.blinkInterval = 250;
		this.blinkIndex = 0;
		this.blinkCount = 0;
		//  Some default settings....
		this.setType( this.BOX_CURSOR );
		this.setLineWidth( 0 );
		this.setCombinedPaint( rgb( 0, 1, 0 ) );

	}

	//-------------------------------------------------------------------------
	//  Change the cursor type by using the visibility.
	//-------------------------------------------------------------------------
	setType( newType ) {
		this.type = newType;
		this.boxCursor.setVisible( false );
		this.outlineCursor.setVisible( false );
		this.underlineCursor.setVisible( false );
		this.lineCursor.setVisible( false );
		switch ( this.type ) {
			case this.NO_CURSOR:
				break;
			case this.BOX_CURSOR:
				this.boxCursor.setVisible( true );
				break;
			case this.OUTLINE_CURSOR:
				this.outlineCursor.setVisible( true );
				break;
			case this.UNDERLINE_CURSOR:
				this.underlineCursor.setVisible( true );
				break;
			case this.LINE_CURSOR:
				this.lineCursor.setVisible( true );
				break;
		}
	}

	//-------------------------------------------------------------------------
	//  Turn blinking on or off.  Turning on blinking will start a repeating
	//  timeout that calls the timeout callback.
	//-------------------------------------------------------------------------
	setBlink( newVal ) {
		this.blink = newVal;
		if ( this.blink ) {
			if ( this.timeoutID === null )
				this.timeoutID = setInterval( this.timeoutCB, this.blinkInterval, this );
		}
		else {
			if ( this.timeoutID !== null )
				clearInterval( this.timeoutID );
			this.timeoutID = null;
			this.holder.setVisible( true );  //  make sure the cursor is left visible
		}
	}

	//-------------------------------------------------------------------------
	//  Change the timeout interval for blinking.  This can be done before or
	//  after blinking is turned on.
	//-------------------------------------------------------------------------
	setBlinkInterval( newVal ) {
		this.blinkInterval = parseInt( newVal );
		//  This will stop and restart blinking if it is running - otherwise
		//  is won't do much but is harmless.
		if ( this.timeoutID !== null ) {
			clearInterval( this.timeoutID );
			if ( this.blink )
				this.timeoutID = setInterval( this.timeoutCB, this.blinkInterval, this );
		}	
	}

	//-------------------------------------------------------------------------
	//  Time interval callback.  This turns on and off the "blinking" cursor,
	//  following a specific pattern, which can be set using "setBlinkPattern".
	//  The pattern is a series of integers describing the timeout cycles the
	//  cursor is alternatively visible and invisible, starting with visible.
	//  Using the default pattern [3,1], for instance, the cursor will be visible
	//  for three timeouts then invisible for one.
	//-------------------------------------------------------------------------
	timeoutCB( thisInstance ) {
		//  Figure out what we want to do...
		thisInstance.blinkCount += 1;
		//  See if we should be changing....
		if ( thisInstance.blinkCount > thisInstance.blinkPattern[thisInstance.blinkIndex] ) {
			if ( thisInstance.holder.getVisible() )
			thisInstance.holder.setVisible( false );
			else
				thisInstance.holder.setVisible( true );
			thisInstance.doRedraw();
			thisInstance.blinkCount = 0;
			thisInstance.blinkIndex += 1;
			if ( thisInstance.blinkIndex >= thisInstance.blinkPattern.length )
				thisInstance.blinkIndex = 0;
		}
	}
}

//=============================================================================
//  The TextOutput Component.
//=============================================================================
class TextOutput extends Frame {
	
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		//  Add a default background - filled white rectangle.  We put the rectangle in
		//  a child object of the background so that we can fiddle with the color under
		//  some circumstances (like when a change has occured but no callback).
		this.backgroundRectangle = new FillRectangle( 0, 0, 1, 1 );
		this.setBackground( new Component( 0, 0, 1, 1 ) );
		this.getBackground().add( this.backgroundRectangle );
		this.getBackground().setCombinedPaint( rgb( 255, 255, 255 ) );
		//  Highlight is contained in a sort of dummy component that lets outside users
		//  determine whether it is visible or not (as well as change characteristics).
		this.highlight = new Component( 0, 0, 1, 1 );
		this.highlight.setFillPaint( rgba( 0, 0, 255, .3 ) );
		this.add( this.highlight );
		//  The actual highlight is drawn as a FillPath - which is determined in this
		//  class.  This class makes this FillPath visible or invisible based on mouse
		//  actions.  Even if it is made visible, it will still not be drawn if outside
		//  users/functions change the highlight component (above).
		this.highlightBox = new FillPath( 0, 0, 1, 1 );
		this.highlightBox.setRelative( NOMINAL_SIZE, NOMINAL_SIZE, NOMINAL_SIZE, NOMINAL_SIZE );
		this.highlightBox.setVisible( true );
		this.highlight.add( this.highlightBox );
		this.horizontalMargin = 10;
		this.verticalMargin = 5;
		//  Add a cursor.  This is generally invisible for TextOutput components, but
		//  inheriting components can make use of it.
		this.cursor = new Component( 0, 0, 1, 1 );
		this.add( this.cursor );
		this.cursorDrawing = new TextCursor( 10, 2, 2, 20 );
		this.cursor.add( this.cursorDrawing );
		//  Some defaults...
		this.cursor.setVisible( false );
		this.valueText = new Text( this.horizontalMargin, .5 );
		this.valueText.setRelativeY( FRACTIONAL_SIZE );
		this.valueText.setAlignment( ALIGN_CENTERED_RIGHT );
		this.valueText.setText( "" );
		this.add( this.valueText );
		this.hasFocus = false;
		this.typePos = 0;
		this.lineWidth = 2;
		this.cursorStart = null;
		this.cursorEnd = null;
		this.alignOffset = 0;
		this.multiLine = false;
		this.defaultCursorSize = 20;  //  this is only used if we can't find anything else to use
		//  By default don't let text overwrite the edges.
		this.setClip( true );
		this.noFrame();
	}

	//--------------------------------
	//  Set the text content.
	//------
	setText( newVal ) {
		this.label = newVal;
		this.valueText.setText( newVal );
		this.valueText.doRedraw();
	}

	//--------------------------------
	//  Return the text content.  Simple enough.
	//------
	getText() {
		return this.valueText.getText();
	};

	//--------------------------------
	//  Provide access to the cursor so properties can be changed.
	//------
	getCursor() {
		return this.cursor;
	}

	//--------------------------------
	//  Provide access to the highlight so properties can be changed.
	//------
	getHighlight() {
		return this.highlight;
	}

	//--------------------------------
	//  Return the text box itself.  This can be used to play with settings.
	//------
	getValueText() {
		return this.valueText;
	}

	//--------------------------------
	//  Set the display alignment.  Move the highlight if there is one.
	//------
	setAlignment( newVal ) {
		this.valueText.setAlignment( newVal );
		if ( this.cursorStart !== null && this.cursorEnd !== null ) {
			this.startLoc = this.findLocation( this.cursorStart );
			this.endLoc = this.findLocation( this.cursorEnd );
			this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
			this.changeHighlight();
		}
		else {
			//  There is no defined cursor position - this will put it at the anchor point.
			var tempLoc = this.findLocation( null );
			console.info( tempLoc );
			this.cursorDrawing.resize( tempLoc.x, tempLoc.y, tempLoc.w, tempLoc.h );
		}
	}

	//--------------------------------
	//  Set the justification.  This is applied to the text component, but needs to
	//  move the highlight if there is one.
	//------
	setJustification( newVal ) {
		this.valueText.setJustification( newVal );
		if ( this.cursorStart !== null && this.cursorEnd !== null ) {
			this.startLoc = this.findLocation( this.cursorStart );
			this.endLoc = this.findLocation( this.cursorEnd );
			this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
			this.changeHighlight();
		}
		else {
			//  There is no defined cursor position - this will put it at the anchor point.
			var tempLoc = this.findLocation( null );
			this.cursorDrawing.resize( tempLoc.x, tempLoc.y, tempLoc.w, tempLoc.h );
		}
	}

	//--------------------------------
	//  Simple test to see if there is any highlighted area.
	//------
	anythingHighlighted() {
		return ( this.cursorStart.hlIdx !== this.cursorEnd.hlIdx );
	}

	//--------------------------------
	//  Reposition the highlighted text to match the current drag positions.
	//------
	changeHighlight() {
		this.highlightBox.clearPoints();
		//  Bail out if we don't have two endpoints.
		if ( this.cursorStart == null || this.cursorEnd == null ) 
			return;
		//  Bail out if the start and end are the same. 
		//  Find out which endpoint is earlier in the text.
		if ( this.cursorStart.hlIdx < this.cursorEnd.hlIdx ) {
			var end1 = this.cursorStart;
			var end2 = this.cursorEnd;
			var loc1 = this.startLoc;
			var loc2 = this.endLoc;
		}
		else {
			var end1 = this.cursorEnd;
			var end2 = this.cursorStart;
			var loc1 = this.endLoc;
			var loc2 = this.startLoc;
		}
		//  If all of the hightlight is on one line, we can simply use the box surrounded
		//  by the highlight ends and be done with this.
		if ( end1.onLine === end2.onLine ) {
			this.highlightBox.moveTo( loc1.x, loc1.y );
			this.highlightBox.lineTo( loc2.x, loc2.y );
			this.highlightBox.lineTo( loc2.x, loc2.y + loc2.h );
			this.highlightBox.lineTo( loc1.x, loc1.y + loc1.h );
		}
		//  multi-line highlighted area.
		else {
			//  Start at the top of top-most end of the highlighted area.
			this.highlightBox.moveTo( loc1.x, loc1.y );
			//  Find the end of the line.
			var xp = this.valueText.drawnXPos;
			if ( this.valueText.getJustification() === CENTER )
				xp += this.valueText.textData.lineWidths[end1.onLine] / 2.0;
			else if ( this.valueText.getJustification() !== RIGHT )
				xp += this.valueText.textData.lineWidths[end1.onLine];
			this.highlightBox.lineTo( xp, loc1.y );
			var yp = loc1.y + loc1.h / 1.2;
			//  Walk down the right side of the text, outlining lines until the last line
			//  that should be highlighted.
			var onLine = end1.onLine + 1;
			var ypList = [];
			while ( onLine <= end2.onLine ) {
			 	yp += this.valueText.textData.lineHeights[onLine-1];
				this.highlightBox.lineTo( xp, yp - this.valueText.textData.lineHeights[onLine-1] / 1.2 );
				var topYp = yp - this.valueText.textData.lineHeights[onLine-1] / 1.2;
				xp = this.valueText.drawnXPos;
				if ( this.valueText.getJustification() === CENTER )
					xp += this.valueText.textData.lineWidths[onLine] / 2.0;
				else if ( this.valueText.getJustification() !== RIGHT )
					xp += this.valueText.textData.lineWidths[onLine];
				this.highlightBox.lineTo( xp, yp - this.valueText.textData.lineHeights[onLine-1] / 1.2 );
				ypList.push( yp - this.valueText.textData.lineHeights[onLine-1] / 1.2 );
				++onLine;
			}
			//  The last line is a bit trickier because it might be partial.  However we can use
			//  the "end" location.
			this.highlightBox.lineTo( loc2.x, loc2.y );
			yp = loc2.y + loc2.h;
			this.highlightBox.lineTo( loc2.x, yp );
			//  Now use the starting point of all lines except for the first one...
			onLine = end2.onLine;
			while ( onLine > end1.onLine ) {
				xp = this.valueText.drawnXPos;
				if ( this.valueText.getJustification() === CENTER )
					xp -= this.valueText.textData.lineWidths[onLine] / 2.0;
				else if ( this.valueText.getJustification() === RIGHT )
					xp -= this.valueText.textData.lineWidths[onLine];
				this.highlightBox.lineTo( xp, yp );
				//yp -= this.valueText.textData.lineHeights[onLine-1];
				yp = ypList.pop();
				this.highlightBox.lineTo( xp, yp );
				--onLine;
			}
			this.highlightBox.lineTo( loc1.x, loc1.y + loc1.h / 1.2 + this.valueText.textData.lineHeights[end1.onLine] * ( 1.0 - 1.0 / 1.2 ) );
		}
	}

	//--------------------------------
	//  Return the highlighted content, if there is any.  Formatting instructions that
	//  immediately precede the "real" text are generally included in this text, those
	//  that follow the last "real" text are not included. 
	//------
	highlightedText() {
		if ( this.cursorStart !== null && this.cursorEnd !== null ) {
			//  Find out which side of the highlight is "earlier".
			if ( this.cursorStart.hlIdx > this.cursorEnd.hlIdx ) {
				var early = this.cursorEnd;
				var late = this.cursorStart;
			}
			else {
				var early = this.cursorStart;
				var late = this.cursorEnd;
			}
			return this.valueText.getText().slice( early.hlIdx, late.hlIdx );
		}
		return null;
	}

	//--------------------------------
	//  Convenience function for setting the output to accommodate multi-line text (or single line
	//  text if this is set to false).
	//------
	setMultiline( newVal ) {
		if ( newVal === undefined || newVal ) {
			this.valueText.setXY( this.horizontalMargin, this.verticalMargin );
			this.valueText.setRelativeY( NOMINAL_SIZE );
			this.setAlignment( ALIGN_BELOW_RIGHT );
		}
		else {
			this.valueText.setXY( this.horizontalMargin, .5 );
			this.valueText.setRelativeY( FRACTIONAL_SIZE );
			this.setAlignment( ALIGN_CENTERED_RIGHT );
		}
		this.multiLine = newVal;
	}
	
	//--------------------------------
	//  Locate the index of the text that is nearest the given position.  This depends on the alignment
	//  of the text and text offset.  If the optional "feedLine" argument is given the position is
	//  located on the given line (i.e. the ypos is ignored).
	//------
	findIndexNear( xpos, ypos, feedLine ) {
		var ret = {};
		ret.xpos = xpos;
		ret.ypos = ypos;
		ret.above = 0;
		ret.below = 0;
		ret.onLine = null;
		if ( feedLine !== undefined )
			ret.onLine = feedLine;
		var textData = this.valueText.textData;  //  Shortcut to the textData
		//  We have to deal with the possibility that there is no text, so no text data.
		if ( textData === null ) {
			ret.left = 1;
			ret.right = 0;
			ret.onLine = 0;
			ret.charIdx = 0;
			ret.hlIdx = 0;
			return ret;
		}
		//  First the line closest to the y position, which can be on a line, below, or above the text.  The
		//  closest line in the above or below case is the first or last line (respectively).  We do make a
		//  note of whether y is above or below in case that is interesting.
		ypos = ypos - this.drawY;
		if ( ypos < this.valueText.drawnYPos - textData.lineHeights[0] ) {
			ret.above = 1;
			ret.onLine = 0;  //  We aren't actually on the line, but the first line is closest
		}
		else if ( ypos < this.valueText.drawnYPos ) {
			ret.onLine = 0;
		}
		else {
			var tryOff = this.valueText.drawnYPos;
			for ( var i = 1; i < textData.lineHeights.length && ret.onLine === null; ++i ) {
				tryOff += textData.lineHeights[i];
				if ( ypos < tryOff ) {
					ret.onLine = i;
				}
			}
			if ( ret.onLine === null ) {
				ret.below = 1;
				ret.onLine = textData.lineHeights.length - 1;  //  Last line is closest
			}
		}
		//  Find the character that is nearest the x position on the given line.
		//  First check for if we are left of the text.
		ret.charIdx = null;
		ret.left = 0;
		ret.right = 0;
		xpos = xpos - this.drawX;
		var offset = this.valueText.drawnXPos;
		if ( this.valueText.getJustification() === CENTER )
			offset -= textData.lineWidths[ret.onLine] / 2.0;
		else if ( this.valueText.getJustification() === RIGHT )
			offset -= textData.lineWidths[ret.onLine];
		if ( xpos < offset ) {
			ret.charIdx = 0;
			ret.left = 1;
		}
		else if ( textData.byLineCharData[ret.onLine].length === 0 ) {
			ret.charIdx = 0;
			ret.right = 1;
		}
		else {
			var idx = 0;
			var dis = Math.abs( xpos - offset );
			for ( var i = 0; i < textData.byLineCharData[ret.onLine].length && ret.charIdx === null; ++i ) {
				var tdis = Math.abs( xpos - offset - textData.byLineCharData[ret.onLine][i].JDHWidth );
				if ( dis < tdis ) {
					ret.charIdx = idx;
					if ( i === 0 )
						ret.left = 1;
				}
				else {
					idx = i;
					dis = tdis;
				}
			}
			if ( ret.charIdx === null ) {
				ret.charIdx = textData.byLineCharData[ret.onLine].length - 1;
				ret.right = 1;
			}
		}
		//  This is an effort to located the indices of characters that should be
		//  put in paste buffers as represented by the highlight.  This logic was
		//  arrived at emperically, so it may well be flawed.
		if ( textData.byLineCharData[ret.onLine].length === 0 ) {
			ret.left = 1;
			ret.hlIdx = textData.emptyLineCharIndex[ret.onLine];
		}
		else
			ret.hlIdx = textData.byLineCharData[ret.onLine][ret.charIdx].charIndex;
		if ( !ret.left )
			ret.hlIdx += 1;
		return ret;
	};

	//--------------------------------
	//  Find the x,y location, height, and "suggested" width of a cursor at the given
	//  location.  The suggested width matches the width of an underlying character,
	//  or, if there is none, a size based on the height.  The location is given by
	//  "typePos", which is a return from the "findIndexNear()" function.
	//------
	findLocation( typePos ) {
		//  Put the cursor at this location.
		var linePos = 0.0;
		var i = 0;
		var ret = {};
		ret.x = this.valueText.drawnXPos;
		if ( ret.x === undefined )
			ret.x = 10;
		if ( this.valueText.textData === null || typePos === null ) {
			//  This means there is no text, so we have to position the cursor where text
			//  would be drawn.  This depends on alignment, so is a bit complex.
			var alignment = this.valueText.getAlignment();
			if ( alignment === ALIGN_ABOVE_LEFT || alignment === ALIGN_ABOVE_RIGHT || alignment === ALIGN_ABOVE_MIDDLE )
				ret.y = this.valueText.drawY - this.defaultCursorSize;
			else if ( alignment === ALIGN_CENTERED_LEFT || alignment === ALIGN_CENTERED_RIGHT || alignment === ALIGN_CENTERED_MIDDLE )
				ret.y = this.valueText.drawY - this.defaultCursorSize / 2.0;
			else
				ret.y = this.valueText.drawY;
			ret.w = 2;
			ret.h = this.defaultCursorSize;
			return ret;
		}
		while ( i < typePos.onLine ) {
			linePos += this.valueText.textData.lineHeights[i];
			++i;
		}
		if ( typePos.onLine > 0 )
			ret.h = this.valueText.textData.lineHeights[typePos.onLine - 1];
		else
			ret.h = this.valueText.textData.lineHeights[0];
		if ( this.valueText.getJustification() === CENTER )
			ret.x -= this.valueText.textData.lineWidths[typePos.onLine] / 2.0;
		else if ( this.valueText.getJustification() === RIGHT )
			ret.x -= this.valueText.textData.lineWidths[typePos.onLine];
		if ( typePos.right )  //  to the right!
			ret.x += this.valueText.textData.lineWidths[typePos.onLine];
		else if ( !typePos.left )  //  not to the left!
			ret.x += this.valueText.textData.byLineCharData[typePos.onLine][typePos.charIdx].JDHWidth;
		ret.y = this.valueText.drawnYPos + linePos - ret.h / 1.2;
		ret.w = 2;
		return ret;
	}

	//--------------------------------
	//  Return the width of an individual character, as well as its distance from the 
	//  start of the line.
	//------
	characterWidth( onLine, charIdx ) {
		//  Subtract the position of the previous character from this one, if one exists.
		if ( charIdx > 0 )
			return [this.valueText.textData.byLineCharData[onLine][charIdx].JDHWidth -
				    this.valueText.textData.byLineCharData[onLine][charIdx - 1].JDHWidth, 
			        this.valueText.textData.byLineCharData[onLine][charIdx].JDHWidth];
	//  Otherwise we just use this character's position twice.
		else
			return [this.valueText.textData.byLineCharData[onLine][charIdx].JDHWidth, 
				    this.valueText.textData.byLineCharData[onLine][charIdx].JDHWidth];
	}

	//--------------------------------
	//  Fill the paste buffers with whatever is in the highlight.  This
	//  function returns "true" if there is anything in the buffer.
	//------
	highlightToPaste() {
		if ( this.highlight.getVisible() && this.highlightBox.getVisible() ) {
			var textToCopy = this.highlightedText();
			//  Set our internal paste buffer.  This will maintain all
			//  of our formatting instructions.
			setPasteBuffer( textToCopy );
			//  Set the paste buffer shared with the window manager.  This is
			//  "simple" text without the formatting instructions.
			navigator.clipboard.writeText( this.simplifyText( textToCopy ) );
			return true;
		}
		else
			return false;
	}

	//--------------------------------
	//  Handle events used to change the value.
	//------
	handle( event ) {
		switch ( event.type ) {
			case NEW_FOCUS:
				if ( event.focusComponent !== this ) {
					this.hasFocus = false;
					this.highlightBox.setVisible( false );
					event.drawing.doRedraw();
				}
				break;
			case MOUSE_PUSH:
				if ( this.eventInside( event ) ) {
					this.hasFocus = true;
					newFocus( event.e, this );
					this.deTransformEvent( event );
					//  Figure out which character position the mouse is closest to.
					this.cursorStart = this.findIndexNear( event.dtx, event.dty );
					//  Generate a location from that.
					this.startLoc = this.findLocation( this.cursorStart );
					//  Put the cursor there.
					this.cursorDrawing.resize( this.startLoc.x, this.startLoc.y, this.startLoc.w, this.startLoc.h );
					//  The end location needs to be identical.
					this.cursorEnd = this.cursorStart;
					this.endLoc = this.findLocation( this.cursorEnd );
					this.changeHighlight();
					this.highlightBox.setVisible( false );
					this.cursorDrawing.setBlink( true );
					event.drawing.doRedraw();
					return true;
				}
				else {
					if ( this.hasFocus )
						event.drawing.doRedraw();
					this.cursorDrawing.setBlink( false );
					this.hasFocus = false;
				}
				break;
			case MOUSE_DRAG:
				if ( getLastEventComponent() === this ) {
					if ( this.hasFocus ) {
						this.deTransformEvent( event );
						this.cursorEnd = this.findIndexNear( event.dtx, event.dty );
						this.endLoc = this.findLocation( this.cursorEnd );
						this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
						this.changeHighlight();
						this.highlightBox.setVisible( true );
						event.drawing.doRedraw();
						return true;
					}
				}
				break;
			case KEY_PRESS:
				//  Only pay attention to key board events inside the component
				if ( this.hasFocus ) {
					switch ( event.e.JDHKeyCode ) {
						case KB_TYPING:
							//  The text output allows copying, but nothing else.
							if ( copyEvent( event ) ) {
								if ( this.highlightToPaste() )
									return true;
							}
							break;
						case KB_ARROWLEFT:
							//  Move wherever the cursor is to the left.  First make sure we are not
							//  on the 0th line at the 0th character - can't move then.
							if ( this.cursorEnd !== null ) {
								//  Find the width of the previous character on the current line, which 
								//  will tell us how much to adjust the cursor position.  If there is no
								//  previous character on the line, move up a line.
								if ( this.cursorEnd.left ) {
									if ( this.cursorEnd.onLine != 0 ) {
										//  Move to the end of the previous line.  Where this is will depend on the
										//  current justification.
										this.cursorEnd.xpos = this.drawX + this.valueText.drawnXPos;
										if ( this.valueText.getJustification() === CENTER )
											this.cursorEnd.xpos += this.valueText.textData.lineWidths[this.cursorEnd.onLine - 1] / 2.0;
										else if ( this.valueText.getJustification() !== LEFT )
											this.cursorEnd.xpos += this.valueText.textData.lineWidths[this.cursorEnd.onLine - 1];
										this.cursorEnd.ypos -= this.valueText.textData.lineHeights[this.cursorEnd.onLine - 1];	
									}
								}
								else {
									//  Use the cursor drawn location as a stand-in for the position where the mouse would
									//  be pointing (if this was a click).
									this.cursorEnd.xpos = this.drawX + this.endLoc.x - this.characterWidth( this.cursorEnd.onLine, this.cursorEnd.charIdx )[0];
									this.cursorEnd.ypos = this.drawY + this.endLoc.y + 0.75 * this.endLoc.h;
								}
								//  Use the new position to find the location of the cursor.
								this.cursorEnd = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
								this.endLoc = this.findLocation( this.cursorEnd );
								//  If shift is NOT held down get rid of the highlight...by making
								//  this both the drag start and end.
								if ( !isShift() ) {
									this.cursorStart = this.cursorEnd;
									this.startLoc = this.findLocation( this.cursorStart );
									this.cursorDrawing.resize( this.startLoc.x, this.startLoc.y, this.startLoc.w, this.startLoc.h );
									this.highlightBox.setVisible( false );
								}
								else
									this.highlightBox.setVisible( this.anythingHighlighted() );
								this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
								this.changeHighlight();
								event.drawing.doRedraw();
								return true;
							}
							break;
						case KB_ARROWRIGHT:
							if ( this.cursorEnd !== null ) {
								//  Find the width of the next character on the current line, which 
								//  will tell us how much to adjust the cursor position.  If there is no
								//  next character on the line, move down a line.
								if ( this.cursorEnd.right ) {
									if ( this.cursorEnd.onLine < this.valueText.textData.lineWidths.length - 1 ) {
										//  Move to the start of the next line.  Where this is will depend on the
										//  current justification.
										this.cursorEnd.xpos = this.drawX + this.valueText.drawnXPos;
										if ( this.valueText.getJustification() === CENTER )
											this.cursorEnd.xpos -= this.valueText.textData.lineWidths[this.cursorEnd.onLine + 1] / 2.0;
										else if ( this.valueText.getJustification() === LEFT )
											this.cursorEnd.xpos -= this.valueText.textData.lineWidths[this.cursorEnd.onLine + 1];
										this.cursorEnd.ypos += this.valueText.textData.lineHeights[this.cursorEnd.onLine + 1];	
									}
								}
								else {
									//  Use the cursor drawn location as a stand-in for the position where the mouse would
									//  be pointing (if this was a click).
									this.cursorEnd.xpos = this.drawX + this.endLoc.x + this.characterWidth( this.cursorEnd.onLine, this.cursorEnd.charIdx + 1 )[0];
									this.cursorEnd.ypos = this.drawY + this.endLoc.y + 0.75 * this.endLoc.h;
								}
								//  Use the new position to find the location of the cursor.
								this.cursorEnd = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
								this.endLoc = this.findLocation( this.cursorEnd );
								//  If shift is NOT held down get rid of the highlight...by making
								//  this both the drag start and end.
								if ( !isShift() ) {
									this.cursorStart = this.cursorEnd;
									this.startLoc = this.findLocation( this.cursorStart );
									this.cursorDrawing.resize( this.startLoc.x, this.startLoc.y, this.startLoc.w, this.startLoc.h );
									this.highlightBox.setVisible( false );
								}
								else
									this.highlightBox.setVisible( this.anythingHighlighted() );
								this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
								this.changeHighlight();
								event.drawing.doRedraw();
								return true;
							}
							break;
						case KB_ARROWUP:
							if ( this.cursorEnd !== null ) {
								//  Move to the same x position on the previous line (if there is a previous line).
								if ( this.cursorEnd.onLine != 0 ) {
									this.cursorEnd.ypos -= this.valueText.textData.lineHeights[this.cursorEnd.onLine - 1];	
								}
								//  Use the new position to find the location of the cursor.
								this.cursorEnd = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
								this.endLoc = this.findLocation( this.cursorEnd );
								//  If shift is NOT held down get rid of the highlight...by making
								//  this both the drag start and end.
								if ( !isShift() ) {
									this.cursorStart = this.cursorEnd;
									this.startLoc = this.findLocation( this.cursorStart );
									this.cursorDrawing.resize( this.startLoc.x, this.startLoc.y, this.startLoc.w, this.startLoc.h );
									this.highlightBox.setVisible( false );
								}
								else
									this.highlightBox.setVisible( this.anythingHighlighted() );
								this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
								this.changeHighlight();
								event.drawing.doRedraw();
								return true;
							}
							break;
						case KB_ARROWDOWN:
							if ( this.cursorEnd !== null ) {
								//  Move to the same x position on the next line.
								if ( this.cursorEnd.onLine < this.valueText.textData.lineWidths.length - 1 ) {
									this.cursorEnd.ypos += this.valueText.textData.lineHeights[this.cursorEnd.onLine + 1];	
								}
								//  Use the new position to find the location of the cursor.
								this.cursorEnd = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
								this.endLoc = this.findLocation( this.cursorEnd );
								//  If shift is NOT held down get rid of the highlight...by making
								//  this both the drag start and end.
								if ( !isShift() ) {
									this.cursorStart = this.cursorEnd;
									this.startLoc = this.findLocation( this.cursorStart );
									this.cursorDrawing.resize( this.startLoc.x, this.startLoc.y, this.startLoc.w, this.startLoc.h );
									this.highlightBox.setVisible( false );
								}
								else
									this.highlightBox.setVisible( this.anythingHighlighted() );
								this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
								this.changeHighlight();
								event.drawing.doRedraw();
								return true;
							}
							break;
							default:
						break;
					}
				}
				break;
		}
		return false;
	}
	
	draw( ins ) {
		super.draw( ins );
		// if ( this.valueText.textData  !== null )  {
		// 	console.info( this.valueText.textData.byLineCharData );
		// 	console.info( this.valueText.getText() );
		// }
		this.defaultCursorSize = ins.fontSize;
	}
}
	
class TextInput extends TextOutput {
	
	constructor ( x, y, w, h, label ) {
		super( x, y, w, h, label );
		this.changedValuePaint = rgb( 255, 255, 50 );
		this.setCallbackWhen( ON_ENTER );
		this.prompt = new Text( 10, .5, "enter text" );
		this.prompt.setVisible( false );
		this.prompt.setAlignment( ALIGN_CENTERED_RIGHT );
		this.prompt.setCombinedFontPaint( rgb( 255, 0, 0 ) );
		this.prompt.setFontItalic( true );
		this.add( this.prompt );
		this.getCursor().setVisible( true );
		this.cursorDrawing.setVisible( false );
		this.moveCursor = 0;
		this.forceMoveCursor = false;
		this.moveLines = 0;
		this.newLine = false;
		this.changeInstruction = false;
		this.changeScaleInstruction = 0;
		this.removeHighlight = false;
		this.onlyRemoveHighlight = false;
		this.fontSizeSetting = 30.0;
		this.fontFamilySetting = "Helvetica";
		this.fontFamilySetting = "Arial";
		this.fontFamilySetting = "Arial Black";
		this.fontFamilySetting = "Verdana";
		this.fontFamilySetting = "Tahoma";
		this.fontFamilySetting = "Trebuchet MS";
		this.fontFamilySetting = "Impact";
		this.fontFamilySetting = "Gill Sans";
		this.fontFamilySetting = "Times New Roman";
		this.fontFamilySetting = "Georgia";
		this.fontFamilySetting = "Palatino";
		this.fontFamilySetting = "Baskerville";
		this.fontFamilySetting = "Garamond";
		this.fontFamilySetting = "Andale Mono";
		this.fontFamilySetting = "Courier";
		this.fontFamilySetting = "Courier New";
		this.fontFamilySetting = "Lucida";
		this.fontFamilySetting = "Monaco";
		this.fontFamilySetting = "Bradley Hand";
		this.fontFamilySetting = "Brush Script MT";
		this.fontFamilySetting = "Comic Sans MS";
		this.fontFamilySetting = "Luminari";
		this.lineSpacingSetting = 2.0;
		this.yOffsetSetting = 6;
		this.outlineModeSetting = "outline";
		this.outlineWidthSetting = 2;
		this.allowEdit = true;
		// this.conventionalClick = true;
	}

	//--------------------------------
	//  Allow the text color to be set.  This is kind of a clunky way to do this.
	//------
	setCombinedFontPaint( newVal ) {
		this.valueText.setCombinedFontPaint( newVal );
	};

	//--------------------------------
	//  Paint used on the background when a value has been changed but not entered
	//  (no callback triggered yet).
	//------
	setChangedValuePaint( newVal ) {
		this.changedValuePaint = newVal;
	};

	//--------------------------------
	//  Override the callback function to change the background if the callback
	//  isn't actually triggered.
	//------
	doCallback( when, event ) {
		var ret = super.doCallback( when, event );
		if ( ret )
			this.backgroundRectangle.setFillPaint( null );
		else
			this.backgroundRectangle.setFillPaint( this.changedValuePaint );
		return ret;
	}

	//--------------------------------
	//  Get rid of the "change" color in the background.
	//------
	clearChange() {
		this.backgroundRectangle.setFillPaint( null );
		this.doRedraw();
	}

	//--------------------------------
	//  Return whether there is anything highlighted.
	//------
	anyHighlight() {
		if ( this.cursorStart.onLine !== this.cursorEnd.onLine )
			return true;
		if ( this.cursorStart.charIdx !== this.cursorEnd.charIdx )
			return true;
		return false;
	}

	//--------------------------------
	//  Find the "start" position of a highlighted region.  This isn't outwardly tricky unless we have a line that doesn't
	//  have any characters on it.
	//------
	findStartPos() {
		if ( this.cursorStart.left )
			return this.valueText.textData.emptyLineCharIndex[this.cursorStart.onLine];
		else
			return this.valueText.textData.byLineCharData[this.cursorStart.onLine][this.cursorStart.charIdx].charIndex;
	}

	//--------------------------------
	//  Find the "end" position of a highlighted region.
	//------
	findEndPos() {
		if ( this.cursorEnd.left )
			return this.valueText.textData.emptyLineCharIndex[this.cursorEnd.onLine];
		else
			return this.valueText.textData.byLineCharData[this.cursorEnd.onLine][this.cursorEnd.charIdx].charIndex;
	}

	//--------------------------------
	//  Delete the text items that are highlighted.
	//------
	deleteHighlight() {
		var startPos = this.findStartPos();
		var endPos = this.findEndPos();
		if ( startPos > endPos ) {

		}
		else if ( endPos > startPos ) {

		}
		else if ( this.cursorStart.left && !this.cursorEnd.left ) {

		}
		else if ( this.cursorEnd.left && !this.cursorStart.left ) {

		}
		// if ( this.dragStart > this.dragEnd ) {
		// 	//this.valueText.setText( this.valueText.getText().slice( 0, this.dragEnd ) + this.valueText.getText().slice( this.dragStart, this.valueText.getText().length ) );
		// 	this.setText( this.valueText.getText().slice( 0, this.dragEnd ) + this.valueText.getText().slice( this.dragStart, this.valueText.getText().length ) );
		// 	this.typePos = this.dragEnd;
		// }
		// else {
		// 	//this.valueText.setText( this.valueText.getText().slice( 0, this.dragStart ) + this.valueText.getText().slice( this.dragEnd, this.valueText.getText().length ) );
		// 	this.setText( this.valueText.getText().slice( 0, this.dragStart ) + this.valueText.getText().slice( this.dragEnd, this.valueText.getText().length ) );
		// 	this.typePos = this.dragStart;
		// }
		// this.highlightBox.setVisible( false );
	};

	//--------------------------------
	//  Function that can be inherited to check whether text is legal before adding it to
	//  the "valueText".
	//------
	checkAddedText( addition, result, addPosition ) {
		return true;
	};

	//--------------------------------
	//  Set the "prompt".  This is displayed using the "setDisplayPrompt" function.  It is text that
	//  is displayed in the text field that tells the user what to put there.  Giving the widget focus
	//  will make it disappear.  You can change the font and color.
	//------
	setPrompt( newText ) {
		this.prompt.setText( newText );
	}

	//--------------------------------
	//  Display the prompt.  Or don't.
	//------
	setDisplayPrompt( newVal ) {
		this.prompt.setVisible( newVal );
	}

	//--------------------------------
	//  This this input field to accommodate multiline text.  Most of this is handled
	//  by the TextOutput class (inherited).  However we must treat an ENTER as a newline
	//  character, not as a callback event driver.
	//------
	setMultiline( newVal ) {
		super.setMultiline( newVal );
		if ( this.multiLine ) {
			this.setCallbackWhen( NOTHING );
		}
	}

	//--------------------------------
	//  This function will cause the browser to prompt the user to allow the paste event
	//  to got forward.  We call this with some event data ("e") which is essentially
	//  meaningless - it is a copy of the event data from the paste event that triggered
	//  this call.  Once the prompt returns a new "timeout" event is generated so the
	//  paste can be accomplished.
	//------
	async getTextFromClipboard( e ) {
		var event = EventInfo( e );
		event.type = TIMEOUT_EVENT;
		event.component = this;
		try {
			const text = await navigator.clipboard.readText();
			event.textData = text;
			processEvent( event );
		} catch (error) {
			console.error('Error reading text from clipboard:', error);
		}
	  }
	  

	//--------------------------------
	//  Find the buffer the user wants to use - we have access to our "internal" JDH
	//  buffer, which is what we will normall return.  If the user is depressing the
	//  shift key we will use to window manager "copy buffer".  This requires an
	//  asynchronous "promise" request, which means the actual return of the content
	//  will be delayed.  We return "None" in this case so the calling function
	//  in handle() knows not to use the item yet.  The getTextFromClipboardWithWait()
	//  function will trigger an event when the paste content becomes available.
	//------
	findDesiredBuffer( e ) {
		if ( isShift() ) {
			this.getTextFromClipboard( e );
			return null;
		}
		else
			return getPasteBuffer();
	}

	//--------------------------------
	//  Split based on a complex instruction (one with arguments).  This is meant
	//  to duplicate the result of "var hlSplit = this.highlightedText().split( instruction )"
	//  with non-argument instructions.
	//------
	complexSplit( text, instruction ) {
		//  Split the text on the arguments.
		var splitText = text.split( instruction );
		if ( splitText.length < 2 )
			return splitText;
		//  Trim any arguments from the beginning of each resulting string.
		for ( var i = 0; i < splitText.length; ++i ) {
			console.info( i, splitText[i] );
			var balance = -1;
			var i2 = 0;
			var notFound = true;
			while ( i2 < splitText[i].length && notFound ) {
				if ( splitText[i][i2] === ")" ) {
					if ( balance === 0 )
						notFound = false;
					else
						--balance;
				}
				else if ( splitText[i][i2] === "(" )
					++balance;
				++i2;
			}
			if ( !notFound )
				splitText[i] = splitText[i].slice( i2 );
		}
		return splitText;
	}

	//--------------------------------
	//  Handle events used to change the value.  This is hideously complicated and long unfortunately,
	//  but there are a lot of things the user can do to change the text.
	//------
	handle( event ) {
		//  In the event you wish to shut off editing...this is a kill switch.  It makes the input
		//  behave like an output.
		if ( !this.allowEdit ) 
			return false;
		switch ( event.type ) {
			case TIMEOUT_EVENT:
				//  A timeout event may have been generated by a "paste" instruction in this
				//  class instance.  This comes as a timeout because the paste was from outside
				//  the browser, and requires a "Promise" structure (i.e. it is asynchronous).
				//  The event is generated in getTextFromClipboard().
				if ( event.component === this ) {
					var startPos = this.cursorStart.hlIdx;
					var endPos = this.cursorEnd.hlIdx;
					if ( this.anyHighlight() ) {
						//  Replace the highlighted region with the new character.  This is a bit
						//  messy because we need to know where to put the cursor after the redraw.
						if ( this.cursorEnd.hlIdx < this.cursorStart.hlIdx ) {
							var startPos = this.cursorEnd.hlIdx;
							var endPos = this.cursorStart.hlIdx;
							this.removeHighlight = this.cursorEnd;
						}
						else {
							this.removeHighlight = this.cursorStart;
						}
					}
					//  The one detail regarding this text is that newline characters need to
					//  be replaced with our newline "code".
					var splitText = event.textData.split( "\n" );
					var tryText = this.valueText.getText().slice( 0, startPos );
					tryText += splitText[0];
					for ( var i = 1; i < splitText.length; ++i )
						tryText += "<@n" + splitText[i];
					tryText += this.valueText.getText().slice( endPos, this.valueText.getText().length );
					if ( this.checkAddedText( event.textData, tryText, startPos ) ) {
						this.setText( tryText );
						//  Figuring out where to put the cursor after the text is changed is...tricky.
						this.moveLines = splitText.length - 1;
						this.moveCursor = splitText[splitText.length - 1].length;
						if ( this.moveLines )
							this.moveCursor -= 1;
						this.highlightBox.setVisible( false );
						this.doCallback( ON_CHANGE );
					}
				}
				else
					return false;
				break;
			case NEW_FOCUS:
				if ( event.focusComponent !== this ) {
					this.hasFocus = false;
					this.highlightBox.setVisible( false );
					this.cursorDrawing.setVisible( false );
					//this.cursorDrawing.setType( this.cursorDrawing.OUTLINE_CURSOR );
					//this.cursorDrawing.setBlink( false );
					event.drawing.doRedraw();
				}
				else {
					this.hasFoucus = true;
					this.prompt.setVisible( false );
					this.cursorDrawing.setVisible( true );
				}
				break;
			case KEY_PRESS:
				//  Only pay attention to key board events inside the component
				if ( this.hasFocus ) {
					this.setDisplayPrompt( false );
					switch ( event.e.JDHKeyCode ) {
						case KB_TYPING:
							//  Before we actually type this key, see if this is a cut/copy/paste activity
							var absorbedKey = false;
							var changed = false;
							if ( cutEvent( event ) ) {
								absorbedKey = true;
								if ( this.anyHighlight() ) {
									this.highlightToPaste();
									if ( this.cursorEnd.hlIdx < this.cursorStart.hlIdx ) {
										var startPos = this.cursorEnd.hlIdx;
										var endPos = this.cursorStart.hlIdx;
										this.removeHighlight = this.cursorEnd;
									}
									else {
										var startPos = this.cursorStart.hlIdx;
										var endPos = this.cursorEnd.hlIdx;
										this.removeHighlight = this.cursorStart;
										//  This repositions the cursor - not necessary if the end position is lower, because
										//  the cursor is already at the end position.
										this.cursorDrawing.resize( this.startLoc.x, this.startLoc.y, this.startLoc.w, this.startLoc.h );
									}
									this.setText( this.valueText.getText().slice( 0, startPos ) + 
												  this.valueText.getText().slice( endPos, this.valueText.getText().length ) );
									this.changeHighlight();
									this.highlightBox.setVisible( false );
									this.onlyRemoveHighlight = true;
									changed = true;
								}
							}
							if ( !absorbedKey && copyEvent( event ) ) {
								//  The copy event is properly handled by the TextOutput class (which is inherited).
								absorbedKey = true;
								this.highlightToPaste();
							}
							if ( !absorbedKey && pasteEvent( event ) ) {
								absorbedKey = true;
								var pasteStuff = this.findDesiredBuffer( event.e, startPos );
								if ( pasteStuff !== null ) {
									var startPos = this.cursorStart.hlIdx;
									var endPos = this.cursorEnd.hlIdx;
									if ( this.anyHighlight() ) {
										//  Replace the highlighted region with the new character.  This is a bit
										//  messy because we need to know where to put the cursor after the redraw.
										if ( this.cursorEnd.hlIdx < this.cursorStart.hlIdx ) {
											var startPos = this.cursorEnd.hlIdx;
											var endPos = this.cursorStart.hlIdx;
											this.removeHighlight = this.cursorEnd;
										}
										else {
											this.removeHighlight = this.cursorStart;
										}
									}
									var tryText = this.valueText.getText().slice( 0, startPos ) + pasteStuff +
										this.valueText.getText().slice( endPos, this.valueText.getText().length );
									if ( this.checkAddedText( pasteStuff, tryText, startPos ) ) {
										this.setText( tryText );
										this.highlightBox.setVisible( false );
										//  Advance the cursor position by the number of characters in the text,
										//  or by the appropriate number of lines and characters if it is multiple
										//  lines.
										var splitText = pasteStuff.split( "<@n" );
										this.moveLines = splitText.length - 1;
										this.moveCursor = splitText[splitText.length - 1].length;
										if ( this.moveLines )
											this.moveCursor -= 1;
										//this.moveCursor = this.simplifyText( pasteStuff ).length;
										changed = true;
									}
									else
										return false;
								}
							}
							if ( !absorbedKey ) {
								//  This is a key press.  Under "nominal" circumstances we will by simply adding
								//  whatever is typed to the text.  However we must look for formatting instructions,
								//  which are regular characters typed while holding the control key.
								if ( isControl() ) {
									//  Switch on the key to figure out what to do with it.  Anything we don't
									//  know what to do with we ignore.  
									switch ( event.e.key ) {
										//  These items are all simple toggle settings.  Except for their "value" all
										//  follow the same procedure.
										case 'b':              // bold
										case 'l':              // lighter type
										case 'i':              // italic
										case '_':              // underline
										case '-':              // "strikeout" (line through the middle)
										case '!':              // "flush" instruction - fills all settings with default values
										//  Instructions with arguments are more complicated.  We perform the same steps as
										//  for toggle instructions, but must accommodate arguments in parenthesis that follow
										//  the instruction.  
										case 'h':              // line spacing ("height") either in pixels or as a factor of the font size
										case 'y':              // y offset
										case 'o':              // set the outline mode, which can be "outline", "both" or "none"
										case 's':              //  font size
										case 'f':              // "font" or font family
										case 'w':              // width of outlines
											switch ( event.e.key ) {
												case 'h':              // line spacing ("height") either in pixels or as a factor of the font size
													var instrArgs = "(" + this.lineSpacingSetting + ")";
													break;
												case 'y':              // y offset
													var instrArgs = "(" + this.yOffsetSetting + ")";
													break;
												case 'o':              // set the outline mode, which can be "outline", "both" or "none"
													var instrArgs = "(\"" + this.outlineModeSetting + "\")";
													break;
												case 's':
													var instrArgs = "(" + this.fontSizeSetting + ")";
													break;
												case 'f':              // "font" or font family
													var instrArgs = "(" + this.fontFamilySetting + ")";
													break;
												case 'w':              // width of outlines
													var instrArgs = "(" + this.outlineWidthSetting + ")";
													break;
												default:
													var instrArgs = "";
													break;
											}
											var instruction = "<@" + event.e.key;
											if ( this.anyHighlight() ) {
												if ( this.cursorEnd.hlIdx < this.cursorStart.hlIdx ) {
													var startPos = this.cursorEnd.hlIdx;
													var endPos = this.cursorStart.hlIdx;
												}
												else {
													var startPos = this.cursorStart.hlIdx;
													var endPos = this.cursorEnd.hlIdx;
												}
												//  Find out how many similar instructions are in the highlighted area.  Remove
												//  them all, but see if the number is odd or even.
												console.info( this.valueText.getText().slice( startPos, endPos ) );
												var hlSplit = this.complexSplit( this.valueText.getText().slice( startPos, endPos ), instruction );
												var hlText = hlSplit.join( "" );
												console.info( ">>>" + hlText );												
												//  If there were no instructions in the highlighted string, add an instruction prior to and after
												//  the string.
												if ( hlSplit.length === 1 ) {
													var tryText = this.valueText.getText().slice( 0, startPos ) + instruction + instrArgs + hlText + instruction +
														this.valueText.getText().slice( endPos, this.valueText.getText().length );
													this.changeScaleInstruction = (instruction + instrArgs ).length + instruction.length;
												}
												else {
													//  If there is an odd number of instructions, add only one instruction to the string
													//  end UNLESS the text immediately following starts with the instruction in which case
													//  we eliminate that.
													if ( hlSplit.length % 2 === 0 ) {
														if ( this.valueText.getText().slice( endPos, endPos + 3 ) === instruction ) {
															var tryText = this.valueText.getText().slice( 0, startPos ) + hlText + 
																this.valueText.getText().slice( endPos + 3, this.valueText.getText().length );
															this.changeScaleInstruction = endPos - startPos + hlText.length;
														}
														else {
															var tryText = this.valueText.getText().slice( 0, startPos ) + hlText + instruction +
																this.valueText.getText().slice( endPos, this.valueText.getText().length );
															this.changeScaleInstruction = endPos - startPos + hlText.length + instruction.length;
														}
													}
													//  Otherwise we just get rid of all of the instructions in the string.
													else {
														var tryText = this.valueText.getText().slice( 0, startPos ) + hlText +
															this.valueText.getText().slice( endPos, this.valueText.getText().length );
														this.changeScaleInstruction = hlText.length - this.valueText.getText().slice( startPos, endPos ).length;
													}
												}
											}
											else {
												//  This is an embedded instruction with no highlighted area.  This should cause the instruction
												//  to either "turn on" for subsequent text, or "turn off" if it is already on.  The latter gests
												//  a bit tricky, because the cursor position can be either infront of the instruction or behind
												//  it.  We have to look in both directions.
												var instLen = ( instruction + instrArgs ).length;
												if ( this.valueText.getText().slice( this.cursorEnd.hlIdx, this.cursorEnd.hlIdx + instLen ) === ( instruction + instrArgs ) ) {
													//  Matching instruction follows the cursor
													var tryText = this.valueText.getText().slice( 0, this.cursorEnd.hlIdx ) +  
														this.valueText.getText().slice( this.cursorEnd.hlIdx + instLen, this.valueText.getText().length );
													this.changeScaleInstruction = -instLen;
												}
												else if ( this.valueText.getText().slice( this.cursorEnd.hlIdx - instLen, this.cursorEnd.hlIdx ) === ( instruction + instrArgs ) ) {
													//  Matching instruction precedes the cursor
													var tryText = this.valueText.getText().slice( 0, this.cursorEnd.hlIdx - instLen ) +  
														this.valueText.getText().slice( this.cursorEnd.hlIdx, this.valueText.getText().length );
													this.changeScaleInstruction = -instLen;
												}
												else {
													//  If this instruction has no argumnet (i.e. it is a "toggle" instruction), simply insert it
													//  and advance beyond it so subsequent typing will have the instruction applied.
													if ( instrArgs.length === 0 ) {
														var tryText = this.valueText.getText().slice( 0, this.cursorEnd.hlIdx ) + instruction + instrArgs + 
															this.valueText.getText().slice( this.cursorEnd.hlIdx, this.valueText.getText().length );
														this.changeScaleInstruction = instLen;
													}
													//  Otherwise, this is a bit messier.  We need to look previously and see if there is a matching
													//  instruction, and if it has the same arguments as this instruction.  If so, we will insert an
													//  instruction without arguments (to "turn off" the previous instruction).  If not we insert this
													//  instruction with arguments.
													else {
														var pos = this.cursorEnd.hlIdx - instruction.length;
														var foundit = false;
														var foundAnother = false;
														while ( !foundit && !foundAnother && pos > 0 ) {
															if ( this.valueText.getText().slice( pos, pos + instLen ) === ( instruction + instrArgs ) ) {
																//  Found a matching instruction with matching arguments
																foundit = true;  
															}
															else if ( this.valueText.getText().slice( pos, pos + instruction.length ) === instruction ) {
																//  Found a matching instruction with non-matching arguments
																foundAnother = true;  
															}
															else
																pos -= 1;
														}
														//  If we found a matching instruction + arguments, turn it off with an instruction without
														//  arguments.
														if ( foundit ) {
															var tryText = this.valueText.getText().slice( 0, this.cursorEnd.hlIdx ) + instruction + 
																this.valueText.getText().slice( this.cursorEnd.hlIdx, this.valueText.getText().length );
															this.changeScaleInstruction = instruction.length;
														}
														//  Otherwise insert the instruction and arguments.
														else {
															var tryText = this.valueText.getText().slice( 0, this.cursorEnd.hlIdx ) + instruction + instrArgs + 
																this.valueText.getText().slice( this.cursorEnd.hlIdx, this.valueText.getText().length );
															this.changeScaleInstruction = instLen;
														}
													}
												}
											}
											//  This flag tells the "postDraw()" function to reposition highlights and the cursor
											//  to whatever new location these changes triggered.
											this.changeInstruction = true;
											this.setText( tryText );
											console.info( tryText );
											changed = true;
											break;
									}
								}
								else {
									if ( this.anyHighlight() ) {
										//  Replace the highlighted region with the new character.  This is a bit
										//  messy because we need to know where to put the cursor after the redraw.
										if ( this.cursorEnd.hlIdx < this.cursorStart.hlIdx ) {
											var startPos = this.cursorEnd.hlIdx;
											var endPos = this.cursorStart.hlIdx;
											this.removeHighlight = this.cursorEnd;
										}
										else {
											var startPos = this.cursorStart.hlIdx;
											var endPos = this.cursorEnd.hlIdx;
											this.removeHighlight = this.cursorStart;
										}
										var insertPos = startPos;
										var tryText = this.valueText.getText().slice( 0, startPos ) + event.e.key +
										              this.valueText.getText().slice( endPos, this.valueText.getText().length );
									}
									else {
										//  This is easy, just install a new character.
										var insertPos = this.cursorEnd.hlIdx;
										var tryText = this.valueText.getText().slice( 0, this.cursorEnd.hlIdx ) + event.e.key + 
												      this.valueText.getText().slice( this.cursorEnd.hlIdx, this.valueText.getText().length );
									}
									if ( this.checkAddedText( event.e.key, tryText, insertPos ) ) {
										this.setText( tryText );
										this.moveCursor = 1;
										this.highlightBox.setVisible( false );
										changed = true;
									}
									else
										return false;
								}
							}
							if ( changed )
								this.doCallback( ON_CHANGE );
							this.doRedraw();
							return true;
							break;
						case KB_BACKSPACE:
							//  Delete the highlighted region if there is one.
							if ( this.anyHighlight() ) {
								if ( this.cursorEnd.hlIdx < this.cursorStart.hlIdx ) {
									var startPos = this.cursorEnd.hlIdx;
									var endPos = this.cursorStart.hlIdx;
									this.removeHighlight = this.cursorEnd;
								}
								else {
									var startPos = this.cursorStart.hlIdx;
									var endPos = this.cursorEnd.hlIdx;
									this.removeHighlight = this.cursorStart;
									//  This repositions the cursor - not necessary if the end position is lower, because
									//  the cursor is already at the end position.
									this.cursorDrawing.resize( this.startLoc.x, this.startLoc.y, this.startLoc.w, this.startLoc.h );
								}
								this.setText( this.valueText.getText().slice( 0, startPos ) + 
											  this.valueText.getText().slice( endPos, this.valueText.getText().length ) );
								this.changeHighlight();
								this.highlightBox.setVisible( false );
								this.onlyRemoveHighlight = true;
							}
							else {
								if ( this.cursorEnd.left ) {
									if ( this.cursorEnd.onLine != 0 ) {
										//  Move to the end of the previous line.  Where this is will depend on the
										//  current justification.
										this.cursorEnd.xpos = this.drawX + this.valueText.drawnXPos;
										if ( this.valueText.getJustification() === CENTER )
											this.cursorEnd.xpos += this.valueText.textData.lineWidths[this.cursorEnd.onLine - 1] / 2.0;
										else if ( this.valueText.getJustification() !== LEFT )
											this.cursorEnd.xpos += this.valueText.textData.lineWidths[this.cursorEnd.onLine - 1];
										this.cursorEnd.ypos -= this.valueText.textData.lineHeights[this.cursorEnd.onLine - 1];	
									}
								}
								else {
									//  Use the cursor drawn location as a stand-in for the position where the mouse would
									//  be pointing (if this was a click).
									this.cursorEnd.xpos = this.drawX + this.endLoc.x - this.characterWidth( this.cursorEnd.onLine, this.cursorEnd.charIdx )[0];
									this.cursorEnd.ypos = this.drawY + this.endLoc.y + 0.75 * this.endLoc.h;
								}
								//  Use the new position to find the location of the cursor.
								var endPos = this.cursorEnd.hlIdx;
								this.cursorEnd = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
								this.endLoc = this.findLocation( this.cursorEnd );
								this.cursorStart = this.cursorEnd;
								this.startLoc = this.endLoc;
								this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
								this.setText( this.valueText.getText().slice( 0, this.cursorEnd.hlIdx ) + 
									this.valueText.getText().slice( endPos, this.valueText.getText().length ) );
							}
							this.doCallback( ON_CHANGE );
							this.doRedraw();
							return true;   //  added 5/23
							break;
						case KB_DELETE:
							//  Delete the highlighted region if there is one.
							if ( this.anyHighlight() ) {
								if ( this.cursorEnd.hlIdx < this.cursorStart.hlIdx ) {
									var startPos = this.cursorEnd.hlIdx;
									var endPos = this.cursorStart.hlIdx;
									this.removeHighlight = this.cursorEnd;
								}
								else {
									var startPos = this.cursorStart.hlIdx;
									var endPos = this.cursorEnd.hlIdx;
									this.removeHighlight = this.cursorStart;
									//  This repositions the cursor - not necessary if the end position is lower, because
									//  the cursor is already at the end position.
									this.cursorDrawing.resize( this.startLoc.x, this.startLoc.y, this.startLoc.w, this.startLoc.h );
								}
								this.setText( this.valueText.getText().slice( 0, startPos ) + 
											  this.valueText.getText().slice( endPos, this.valueText.getText().length ) );
								this.changeHighlight();
								this.highlightBox.setVisible( false );
								this.onlyRemoveHighlight = true;
								this.doCallback( ON_CHANGE );
							}
							else {
								var charpos = this.cursorEnd.hlIdx;
								if ( this.valueText.textData.emptyLineCharIndex !== undefined )
									charpos -= this.valueText.textData.emptyLineCharIndex[this.cursorEnd.onLine];
								if ( charpos >= this.valueText.textData.byLineCharData[this.cursorEnd.onLine].length ) {
									if ( !( this.cursorEnd.onLine >= this.valueText.textData.byLineCharData.length - 1 ) ) {
										//  Remove the newline instruction that follows (3 characters).
										this.setText( this.valueText.getText().slice( 0, this.cursorEnd.hlIdx ) + 
											this.valueText.getText().slice( this.cursorEnd.hlIdx + 3, this.valueText.getText().length ) );
										this.doCallback( ON_CHANGE );
									}
								}
								else {
									//  Simple character removal.
									var newIdx = this.cursorEnd.hlIdx + this.indexOfNextRealText( this.valueText.getText().slice( this.cursorEnd.hlIdx, this.valueText.getText().length ) );
									this.setText( this.valueText.getText().slice( 0, this.cursorEnd.hlIdx ) + 
											this.valueText.getText().slice( newIdx + 1, this.valueText.getText().length ) );
									this.doCallback( ON_CHANGE );
								}
							}
							this.doRedraw();
							return true;   //  added 5/23
							break;
						case KB_ENTER:
							//  If the callback is set to trigger on ENTER, do that.  If that is not
							//  the case, stick a newline instruction in the text.
							if ( !this.doCallback( ON_ENTER ) ) {
								if ( this.anyHighlight() ) {
									//  Replace the highlighted region with the newline.  This is a bit
									//  messy because we need to know where to put the cursor after the redraw.
									if ( this.cursorEnd.hlIdx < this.cursorStart.hlIdx ) {
										var startPos = this.cursorEnd.hlIdx;
										var endPos = this.cursorStart.hlIdx;
										this.removeHighlight = this.cursorEnd;
									}
									else {
										var startPos = this.cursorStart.hlIdx;
										var endPos = this.cursorEnd.hlIdx;
										this.removeHighlight = this.cursorStart;
									}
									var insertPos = startPos;
									var tryText = this.valueText.getText().slice( 0, startPos ) + "<@n" +
												  this.valueText.getText().slice( endPos, this.valueText.getText().length );
								}
								else {
									//  This is easy, just install a new character.
									var insertPos = this.cursorEnd.hlIdx;
									var tryText = this.valueText.getText().slice( 0, this.cursorEnd.hlIdx ) + "<@n" + 
												  this.valueText.getText().slice( this.cursorEnd.hlIdx, this.valueText.getText().length );
								}
								if ( this.checkAddedText( event.e.key, tryText, insertPos ) ) {
									this.setText( tryText );
									this.newLine = true;
									this.highlightBox.setVisible( false );
									this.doCallback( ON_CHANGE );
								}
								else
									return false;
							}
							this.doRedraw();
							return true;   //  added 5/23
							break;
					}
				}
				break;
		}
		return super.handle( event );
	}

	postdraw( ins ) {
		super.postdraw( ins );
		if ( this.moveCursor || this.moveLines || this.forceMoveCursor ) {
			this.forceMoveCursor = false;
			if ( this.removeHighlight === this.cursorStart ) {
				var newIdx = this.cursorStart.charIdx;
				var moreLine = this.cursorStart.onLine + this.moveLines;
				var stayLeft = this.cursorStart.left;
				if ( this.moveLines )
					newIdx = this.moveCursor;
				else
					newIdx += this.moveCursor;
				if ( stayLeft )
					newIdx -= 1;
				if ( newIdx < 0 )
					this.cursorStart.xpos = this.drawX + this.valueText.drawnXPos;
				else
					this.cursorStart.xpos = this.drawX + this.valueText.drawnXPos + this.valueText.textData.byLineCharData[moreLine][newIdx].JDHWidth;
				this.cursorStart.ypos = this.drawY + this.startLoc.y + 0.75 * this.startLoc.h;
				for ( var i = 0; i < this.moveLines; ++i )
					this.cursorStart.ypos += this.valueText.textData.lineHeights[this.cursorStart.onLine + i];
				this.cursorStart = this.findIndexNear( this.cursorStart.xpos, this.cursorStart.ypos );
				this.startLoc = this.findLocation( this.cursorStart );
				this.cursorEnd = this.findIndexNear( this.cursorStart.xpos, this.cursorStart.ypos );
				this.endLoc = this.findLocation( this.cursorEnd );
				this.cursorDrawing.resize( this.startLoc.x, this.startLoc.y, this.startLoc.w, this.startLoc.h );
			}
			else {
				var newIdx = this.cursorEnd.charIdx;
				var stayLeft = this.cursorEnd.left;
				var moreLine = this.cursorEnd.onLine + this.moveLines;
				if ( this.moveLines )
					newIdx = this.moveCursor;
				else
					newIdx += this.moveCursor;
				if ( stayLeft )
					newIdx -= 1;
				if ( newIdx < 0 )
					this.cursorEnd.xpos = this.drawX + this.valueText.drawnXPos;
				else
					this.cursorEnd.xpos = this.drawX + this.valueText.drawnXPos + this.valueText.textData.byLineCharData[moreLine][newIdx].JDHWidth;
				this.cursorEnd.ypos = this.drawY + this.endLoc.y + 0.75 * this.endLoc.h;
				for ( var i = 0; i < this.moveLines; ++i )
					this.cursorEnd.ypos += this.valueText.textData.lineHeights[this.cursorEnd.onLine + i];
				this.cursorEnd = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
				this.endLoc = this.findLocation( this.cursorEnd );
				this.cursorStart = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
				this.startLoc = this.findLocation( this.cursorEnd );
				this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
			}
			this.moveCursor = 0;
			this.moveLines = 0;
			this.changeHighlight();
			this.removeHighlight = false;
			this.doRedraw();
		}
		if ( this.onlyRemoveHighlight ) {
			if ( this.removeHighlight === this.cursorStart ) {
				this.cursorStart = this.findIndexNear( this.cursorStart.xpos, this.cursorStart.ypos );
				this.startLoc = this.findLocation( this.cursorStart );
				this.cursorEnd = this.findIndexNear( this.cursorStart.xpos, this.cursorStart.ypos );
				this.endLoc = this.findLocation( this.cursorEnd );
				this.cursorDrawing.resize( this.startLoc.x, this.startLoc.y, this.startLoc.w, this.startLoc.h );
			}
			else {
				this.cursorEnd = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
				this.endLoc = this.findLocation( this.cursorEnd );
				this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
			}
			this.onlyRemoveHighlight = false;
			this.doRedraw();
		}
		if ( this.newLine ) {
			this.newLine = false;
			this.cursorEnd.xpos = this.drawX + this.valueText.drawnXPos;
			this.cursorEnd.ypos = this.drawY + this.valueText.textData.lineHeights[this.cursorEnd.onLine] + this.endLoc.y + 0.75 * this.endLoc.h;
			this.cursorEnd = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
			this.endLoc = this.findLocation( this.cursorEnd );
			this.cursorStart = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
			this.startLoc = this.findLocation( this.cursorEnd );
			this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
			this.doRedraw();
		}
		if ( this.changeInstruction ) {
			this.changeInstruction = false;
			console.info( "change by " + this.changeScaleInstruction + " chars" );
			if ( this.changeScaleInstruction !== 0 ) {
				if ( this.cursorEnd.hlIdx < this.cursorStart.hlIdx )
					this.cursorStart.hlIdx += this.changeScaleInstruction;
				else
					this.cursorEnd.hlIdx += this.changeScaleInstruction;
				this.changeScaleInstruction = 0;
				this.startLoc = this.findLocation( this.cursorStart );
				this.endLoc = this.findLocation( this.cursorEnd );
			}
			else {
				//  This process is a bit ugly - it is trying to locate the character that is nearest
				//  the cursor.  This should work if the font sizes don't change.
				this.cursorStart = this.findIndexNear( this.cursorStart.xpos, this.cursorStart.ypos );
				this.startLoc = this.findLocation( this.cursorStart );
				this.cursorEnd = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
				this.endLoc = this.findLocation( this.cursorEnd );
			}
			this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
			this.changeHighlight();
			this.doRedraw();
		}
	}

}
//  ValueInput
//  
//  This is a basic value display that allows changes.  It allows setting of
//  minimum and maximum values (but does not require them), display digits of
//  precision, and adjustments to how the number changes with mouse and arrow
//  events.  It also allows string representation of numbers.  Details follow.
//
// 

class ValueInput extends TextInput {
	
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		//  Add a default background - filled white rectangle.
		// this.setBackground( new FillRectangle( 1, 1, -1, -1 ) );
		// this.getBackground().setFillPaint( rgb( 255, 255, 255 ) );
		this.minimum = null;
		this.maximum = null;
		this.precision = null;
		this.savePrecision = null;
		this.stepSize = 1;
		this.value = parseFloat( 0.0 );
		this.stringSub = null;
		this.setValue( 0 );
		this.minCallback = null;
		this.minCallbackComponent = null;
		this.maxCallback = null;
		this.maxCallbackComponent = null;
		this.addCallbackWhen( ON_MOUSE_WHEEL );
		this.addCallbackWhen( ON_ARROW_KEY );
		this.stepSizeLock = false;
		this.stepSizeMin = null;
		this.stepSizeMax = null;
		this.keepString = false;
		this.valueInputMoveCursor = false;
		this.errorValuePaint = "#aa0000";
		this.typePos = 1;
		this.recentEntry = null;
		this.entryList = [];
		this.justUp = false;
		this.justDown = false;
	}

	//--------------------------------
	//  Set an array of strings as the "substitute" to certain values.  These are
	//  interpreted from 0 onward.  If the value of this ValueInput matches the index
	//  of the string, the string will be displayed in place of the value.
	//------
	setStringSubstitution( newVal ) {
		if ( this.stringSub === null )
			this.stringSub = [];
		this.stringSub.push( newVal );
		//  Set some stuff that makes the string substitution work as one would expect.  All
		//  of these things can be changed if required.
		this.setStepSizeLock( true );  //  Ignores the cursor position as a stepSize determiner
		this.setMinimum( 0 );
		this.setMaximum( this.stringSub.length - 1 );
		this.value = this.stringSub.length - 1;
	}

	//--------------------------------
	//  Set the step size - this will determine how much the value is increased or
	//  decreased when using the arrow keys, mouse wheel, or drag functionality.
	//------
	setStepSize( newVal ) {
		this.stepSize = newVal;
	};

	//--------------------------------
	//  Force the step size to stay at the given value.  Nominally this is not done - the
	//  step size changes based on the position of the cursor.  If this value is set to
	//  true, it will not change.  This was put in place to deal with string substitutions,
	//  but it might have other uses.
	//------
	setStepSizeLock( newVal ) {
		this.stepSizeLock = newVal;
	};

	//--------------------------------
	//  Set the minimum and maximum step sizes that are allowed.  Null these out if you want
	//  to turn them off.
	//------
	setStepSizeMinimum( newVal ) {
		this.stepSizeMin = newVal;
	};

    setStepSizeMaximum( newVal ) {
		this.stepSizeMax = newVal;
	};

	//--------------------------------
	//  Set the minimum and maximum values that can be set by the user.
	//------
	setMinimum( newVal ) {
		this.minimum = newVal;
		if ( this.value < this.minimum )
			this.setValue( this.minimum );
	};

	getMinimum() {
		return this.minimum;
	}

    setMaximum( newVal ) {
		this.maximum = newVal;
		if ( this.value > this.maximum )
			this.setValue( this.maximum );
	};

	getMaximum( newVal ) {
		return this.maximum;
	}

	//--------------------------------
	//  This causes the ValueInput to keep whatever string the user entered even while
	//  interpreting it as a single number.
	//------
	setKeepString( newVal ) {
		this.keepString = newVal;
	}

	//--------------------------------
	//  These callbacks occur when the value is set to something outside the minimum
	//  or maximum.
	//------
	setMinimumCallback( newCallback, newComponent ) {
		if ( newComponent === undefined )
			this.minCallbackComponent = null;
		else
			this.minCallbackComponent = newComponent;
		this.minCallback = newCallback;
	}

		setMaximumCallback( newCallback, newComponent ) {
		if ( newComponent === undefined )
			this.maxCallbackComponent = null;
		else
			this.maxCallbackComponent = newComponent;
		this.maxCallback = newCallback;
	}

	//--------------------------------
	//  Set the value.  A check is made to assure that this is within min and max
	//  limits.  If the value is outside the limits it is changed to the appropriate
	//  limit.  The "regular" callback for this component is triggered if the value
	//  is changed.  There are also optional callbacks that can be set for when the
	//  desired values hits one of the limits.  See setMinimumCallback() and
	//  setMaximumCallback() for more about that.
	//------
	setValue( newVal ) {
		var oldValue = this.value;
		this.value = newVal;
		if ( typeof( this.value ) !== "number" )
			this.value = parseFloat( this.value );
		if ( isNaN( this.value ) )
			this.value = 0.0;
		if ( this.minimum !== null ) {
			if ( newVal < this.minimum ) {
				this.value = this.minimum;
				if ( this.minCallback !== null )
					this.minCallback( this.minCallbackComponent );
			}
		}
		if ( this.maximum !== null ) {
			if ( newVal > this.maximum ) {
				this.value = this.maximum;
				if ( this.maxCallback !== null )
					this.maxCallback( this.maxCallbackComponent );
			}
		}
		//  Change the value display based on settings
		//  First, see if there is a string substitution we need to make.
		var valueSet = false;
		if ( this.stringSub != null ) {
			console.info( this.stringSub );
			if ( this.value > -1 && this.value < this.stringSub.length ) {
				if ( this.stringSub[this.value] !== null ) {
					this.valueText.setText( this.stringSub[this.value] );
					valueSet = true;
				}
			}
		}
		if ( !valueSet ) {
			//  This is the default - simply convert the value to a string.  The
			//  precision is applied if it is set, otherwise we are at the mercy of
			//  how the local JavaScript wants to construct the string.
			if ( this.precision !== null && this.precision > -1 )
				this.valueText.setText( this.value.toFixed( this.precision ) );//.toString() );
			else if ( this.savePrecision !== null )
				this.valueText.setText( this.value.toFixed( this.savePrecision ) );//.toString() );
			else
				this.valueText.setText( this.value.toString() );
		}
	}

	//--------------------------------
	//  This function does not require an instance to work - it "suggests" a precision based
	//  on a range.  The "minimum" value is exactly that - the precision is never less than
	//  this.  By default this value is 1 (so the number will appear to be floating point).
	//------
	suggestPrecision( range, minimum ) {
		if ( minimum === undefined || minimum === null )
			minimum = 1;
		//  Get the log10 value of the range.
		var val = Math.log10( Math.abs( range ) );
		val = 2 - parseInt( val );
		if ( val < minimum ) {
			return minimum;
		}
		return val;
	}

	//--------------------------------
	//  Set the precision.
	//------
	setPrecision( newPrecision ) {
		this.precision = newPrecision;
	};

	//--------------------------------
	//  Return the value.  Returned as a floating point number.
	//------
	getValue() {
		return parseFloat( this.value );
	};

	//--------------------------------
	//  Return the value as text (that's how it is stored).
	//------
	getTextValue() {
		return this.value;
	};

	//--------------------------------
	//  Test the current cursor position to determine a step size.  This may or may
	//  not have changed.
	//------
	checkStepSize() {
		if ( this.stepSizeLock )
			return;
		var txt = this.valueText.getText();
		this.stepSize = 1.0;
		var decimalHit = false;
		for ( var i = 0; i < txt.length; ++i ) {
			if ( txt.charAt( i ) === '.' )
				decimalHit = true;
			else if ( txt.charAt( i ) != '+' && txt.charAt( i ) != '-' ) {
				if ( decimalHit && i < this.typePos )
					this.stepSize = this.stepSize / 10.0;
				else if ( !decimalHit && i >= this.typePos )
					this.stepSize = this.stepSize * 10.0;
			}
		}
		//  Apply max and min checks to the step size if they are relevant.
		if ( this.stepSizeMin !== null && this.stepSize < this.stepSizeMin )
			this.stepSize = this.stepSizeMin;
		if ( this.stepSizeMax !== null && this.stepSize > this.stepSizeMax )
			this.stepSize = this.stepSizeMax;
	};

	//--------------------------------
	//  Override the deleteHighlight() function from the TextInput.  The
	//  deleting part of that class is fine (we use it), but we need to change
	//  where the type position is put.
	//------
	deleteHighlight() {
		if ( this.dragStart > this.dragEnd )
			var oldDiff = this.valueText.getText().length - this.dragStart;
		else
			var oldDiff = this.valueText.getText().length - this.dragEnd;
		super.deleteHighlight( this );
		this.typePos = this.valueText.getText().length - oldDiff;
	};

	//--------------------------------
	//  Check whether we want to include this text in the value input.  We are
	//  provided with the text that is added, and the "result" - what the full
	//  text will look like if we add the "addition".  Basically we want to make
	//  sure the text can be interpreted as a number or that it is on its way to
	//  being something that can be interpreted as a number.
	//------
	checkAddedText( addition, result, addPosition ) {
		return true;
		//  If the result is not a legal number, return false.  But we allow a lone
		//  "sign" character.
		var tryIt = parseFloat( result );
		if ( isNaN( tryIt ) )
			return false;
		if ( addition === null )
			return false;
		//  Check each character in the addition - make sure it is a number or a
		//  legal character.
		var okayString = true;
		for ( var i = 0; i < addition.length; ++i ) {
			var tokay = false;
			var c = addition.charAt( i );
			if ( c >= '0' && c <= '9' )
				tokay = true;
			//  Plus and minus signs are legal under some circumstances.
			else if ( c === '-' || c === '+' ) {
				//  If this is the first character...
				if ( addPosition === 0 )
					tokay = true;
			}
			else if ( c === "." )
				tokay = true;
			else if ( c === 'e' || c === 'E' )
				tokay = true;
			if ( !tokay )
				okayString = false;
		}
		return okayString;
	};

	//--------------------------------
	//  Override the callback function to change a text value to a number.  This function tries
	//  to interpret the text as a number using everything it knows (including math functions).
	//  If it fails, it does not trigger the callback.
	//------
	doCallback( when ) {
		//  See if the callback should be done based on "when".  This will save us the effort
		//  of doing all the stuff below.  This is lifted from the Component class.
		if ( when !== undefined && when !== null ) {
			if ( !( when & this.callbackWhen ) ) {
				this.backgroundRectangle.setFillPaint( this.changedValuePaint );
				return false;
			}
		}
		//  See if we can interpret the text as a number.  If not, the callback will not be
		//  activated.
		var txt = this.valueText.getText();
		var desiredCursorPos = 0;
		var tryIt = Number( txt ).toFixed( this.precision );
		if ( isNaN( tryIt ) ) {
			//  See if we can interpret any mathematics in here to produce a number.
			tryIt = ValueInput.interpretString( txt );
			if ( isNaN( tryIt ) ) {
				this.backgroundRectangle.setFillPaint( this.errorValuePaint );
				return false;
			}
			//  The cursor is put at the end of the numeric string.  We indicate this
			//  with a -1.
			this.desiredCursorPos = -1;
			this.valueInputMoveCursor = true;
			if ( this.recentEntry === null || this.recentEntry === this.entryList.length - 1 ) {
				this.recentEntry = this.entryList.length;
				this.entryList.push( txt );
			}
			else {
				this.entryList[this.recentEntry  + 1] = txt;
				this.recentEntry = this.entryList.length - 1;
			}
			this.justDown = false;
			this.justUp = false;
		}
		else {
			//  The entered text was a number.  Try to keep the cursor next to the same
			//  numbers the user was entering.
		}
		this.value = tryIt;
		var ret = super.doCallback( when );
		if ( ret ) {
			//  We replace the entered text, whatever it was, with the number interpretation,
			//  following precision and other rules.  However the user can "setKeepString( true )"
			//  and the text will not change.  The numeric value returned by "getValue()"
			//  WILL change, however.
			if ( !this.keepString )
				this.valueText.setText( Number( tryIt ).toFixed( this.precision ) );
			this.originalEntry = this.getText();
		}
		else
			this.backgroundRectangle.setFillPaint( this.changedValuePaint );
		return ret;
	}

	//--------------------------------
	//  Interpret a string using basic functions to generate a number.  If the string
	//  can't be interpreted return null.
	//------
	static interpretString( newTxt ) {
		var txt = ValueInput.cleanString( newTxt.toUpperCase() );
		//  Break into a list of items that surround an operator (or a single item if no
		//  operator exists).
		var tokens = ValueInput.parseEquation( txt );
		//  If there is a single token, figure out what it is.
		if ( tokens.length === 1 ) {
			//  If it can be interpreted as a number, return that value.
			if ( !isNaN( tokens[0] ) )
				return Number( tokens[0] );
			//  If not, check against the functions we know.  These take no arguments...
			switch ( tokens[0] ) {
				case "PI":
					return Math.PI;
				case "E":
					return Math.E;          // Euler's number
				case "LN10":
					return Math.LN10;       // Natural log of 10
				case "LN2":
					return Math.LN10;       // Natural log of 2
				case "LOG10E":    
					return Math.LOG10E;     // Base-10 log of e
				case "LOG2E":
					return Math.LOG2E;      // Base-2 log of e
				case "SQRT1_2":
					return Math.SQRT1_2;    // Square root of 1/2
				case "SQRT2":
					return Math.SQRT2;      // Square root of 2
			}
			//  Still here? Must be a function - get the name of the function and its arguments.
			var fTokens = ValueInput.splitTextAndParentheses( tokens[0] );
			switch ( fTokens[0] ) {
				//  Zero arguments
				case "RANDOM":
					return Math.random();   // Return a random number
				//  One argument
				case "SIN":
					return Math.sin( ValueInput.interpretString( fTokens[1] ) );
				case "COS":
					return Math.cos( ValueInput.interpretString( fTokens[1] ) );
				case "TAN":
					return Math.tan( ValueInput.interpretString( fTokens[1] ) );
				case "SINH":                //  Hyperbolic sine
					return Math.sinh( ValueInput.interpretString( fTokens[1] ) );
				case "COSH":                //  Hyperbolic cosine
					return Math.cosh( ValueInput.interpretString( fTokens[1] ) );
				case "TANH":                //  Hyperbolic tangent
					return Math.tanh( ValueInput.interpretString( fTokens[1] ) );
				case "ASIN":                //  Inverse sine
					return Math.asin( ValueInput.interpretString( fTokens[1] ) );
				case "ACOS":                //  Inverse cosine
					return Math.acos( ValueInput.interpretString( fTokens[1] ) );
				case "ATAN":                //  Inverse tangent - single argument
					return Math.atan( ValueInput.interpretString( fTokens[1] ) );
				case "ASINH":               //  Inverse hyperbolic sine
					return Math.asinh( ValueInput.interpretString( fTokens[1] ) );
				case "ACOSH":               //  Inverse hyperbolic cosine
					return Math.acosh( ValueInput.interpretString( fTokens[1] ) );
				case "ATANH":               //  Inverse hyperbolic tangent
					return Math.atanh( ValueInput.interpretString( fTokens[1] ) );
				case "LOG":                 //  Natural log (base e)
					return Math.log( ValueInput.interpretString( fTokens[1] ) );
				case "LOG10":               //  Base 10 log
					return Math.log10( ValueInput.interpretString( fTokens[1] ) );
				case "LOG2":                //  Base 2 log
					return Math.log2( ValueInput.interpretString( fTokens[1] ) );
				case "SQRT":
					return Math.sqrt( ValueInput.interpretString( fTokens[1] ) );
				case "CBRT":                //  Cube root
					return Math.cbrt( ValueInput.interpretString( fTokens[1] ) );
				case "CEIL":
					return Math.ceil( ValueInput.interpretString( fTokens[1] ) );
				case "FLOOR":
					return Math.floor( ValueInput.interpretString( fTokens[1] ) );
				case "EXP":                 //  e raised to a power
					return Math.exp( ValueInput.interpretString( fTokens[1] ) );
				case "ABS":                 //  Absolute value
					return Math.abs( ValueInput.interpretString( fTokens[1] ) );
				case "ROUND":               //  Round tot he nearest integer
					return Math.round( ValueInput.interpretString( fTokens[1] ) );
				//  Two arguments
				case "ATAN2":               //  Inverse tangent - two arguments
					var args = ValueInput.splitStringByCommas( fTokens[1] );
					return Math.atan2( ValueInput.interpretString( args[0] ), ValueInput.interpretString( args[1] ) );
				case "POW":                 //  Raise x to the power y
					var args = ValueInput.splitStringByCommas( fTokens[1] );
					return Math.pow( ValueInput.interpretString( args[0] ), ValueInput.interpretString( args[1] ) );
				case "MIN":                 //  Minimum of two numbers
					var args = ValueInput.splitStringByCommas( fTokens[1] );
					return Math.min( ValueInput.interpretString( args[0] ), ValueInput.interpretString( args[1] ) );
				case "MAX":                 //  Maximum of two numbers
					var args = ValueInput.splitStringByCommas( fTokens[1] );
					return Math.max( ValueInput.interpretString( args[0] ), ValueInput.interpretString( args[1] ) );
			}
		}
		else {
			//  There are three tokens, the middle of which is an operator.  Find the values
			//  before and after the operator and apply it to them.
			var val1 = ValueInput.interpretString( tokens[0] );
			var val2 = ValueInput.interpretString( tokens[2] );
			switch ( tokens[1] ) {
				case '+':
					return val1 + val2;
					break;
				case '-':
					return val1 - val2;
					break;
				case '*':
					return val1 * val2;
					break;
				case '/':
					return val1 / val2;
					break;
				case '%':
					return val1 % val2;
					break;
			}
		}
		return null;
	}

	//---------------------------------
	//  A.I. generated function that returns a list of components of a string 
	//  split by operators in descending precedence order.
	//------
	static parseEquation(equation) {
		function findMainOperator(equation, operators) {
			let parenDepth = 0;
			
			for (let i = equation.length - 1; i >= 0; i--) {
				if (equation[i] === ')') parenDepth++;
				else if (equation[i] === '(') parenDepth--;
				else if (operators.includes(equation[i]) && parenDepth === 0) {
					return i;
				}
			}
			return -1;
		}
	
		const primaryOperators = ['+', '-'];
		const secondaryOperators = ['*', '/', '%'];
		
		let mainOperatorIndex = findMainOperator(equation, primaryOperators);
	
		if (mainOperatorIndex === -1) {
			mainOperatorIndex = findMainOperator(equation, secondaryOperators);
		}
	
		if (mainOperatorIndex === -1) {
			return [equation];  // No operator found
		}
	
		const beforeOperator = equation.slice(0, mainOperatorIndex).trim();
		const operator = equation[mainOperatorIndex];
		const afterOperator = equation.slice(mainOperatorIndex + 1).trim();
	
		return [beforeOperator, operator, afterOperator];
	}
	
	
	//---------------------------------
	//  Clean a string of whitespace and matching parenthesis.
	//------
	static cleanString(input) {
		input = input.trim();
	
		while (input.startsWith('(') && input.endsWith(')')) {
			// Remove spaces and matching parentheses from the ends
			let inner = input.slice(1, -1).trim();
			// Check if inner string has balanced parentheses
			let balance = 0;
			for (let char of inner) {
				if (char === '(') balance++;
				else if (char === ')') balance--;
				if (balance < 0) break;
			}
			if (balance === 0) {
				input = inner;
			} else {
				break;
			}
		}
		return input;
	}

	//---------------------------------
	//  Find the name of a function and its arguments.  Returned as a list of two items.
	//------
	static splitTextAndParentheses(input) {
		const result = [];
		let currentText = '';
		let parenContent = '';
		let parenDepth = 0;
		let recordingParenContent = false;
	
		for (const char of input) {
			if (char === '(') {
				parenDepth++;
				recordingParenContent = true;
				if (parenDepth === 1) continue; // Skip adding this parenthesis to parenContent
			}
			if (char === ')') {
				parenDepth--;
				if (parenDepth === 0) {
					recordingParenContent = false;
					result.push(currentText.trim(), parenContent.trim());
					return result;
				}
			}
			if (recordingParenContent) {
				parenContent += char;
			} else {
				currentText += char;
			}
		}
	
		if (currentText.trim()) result.push(currentText.trim());
		if (parenContent.trim()) result.push(parenContent.trim());
		
		return result;
	}
	
	//---------------------------------
	//  Returns a list of items that are comma-separated.
	//------
	static splitStringByCommas(input) {
		const result = [];
		let currentToken = '';
		let parenDepth = 0;
	
		for (const char of input) {
			if (char === ',' && parenDepth === 0) {
				result.push(currentToken.trim());
				currentToken = '';
			} else {
				if (char === '(') parenDepth++;
				else if (char === ')') parenDepth--;
				currentToken += char;
			}
		}
		if (currentToken) {
			result.push(currentToken.trim());
		}
	
		return result;
	}
	
	
	//--------------------------------
	//  A.I. generated function that breaks a string into a list of objects and operators,
	//  calling anything within parenthesis a single object.
	//------
	static splitStringIntoTokens(input) {
		const regex = /([^\s\(\)\+\-\*\/]+|\(|\)|\+|\-|\*|\/)/g;
		const tokens = [];
		let match;
		
		while ((match = regex.exec(input)) !== null) {
			tokens.push(match[0]);
		}
	
		const groupedTokens = [];
		let stack = [];
	
		tokens.forEach(token => {
			if (token === '(') {
				stack.push(token);
			} else if (token === ')') {
				let temp = '';
				while (stack.length && stack[stack.length - 1] !== '(') {
					temp = stack.pop() + temp;
				}
				stack.pop(); // Remove '('
				groupedTokens.push(temp);
			} else if (stack.length) {
				stack.push(token);
			} else {
				groupedTokens.push(token);
			}
		});
	
		return groupedTokens;
	}
	
	
	//--------------------------------
	//  Determine how many digits of precision are currently displayed.  This precision
	//  includes ALL digits in the displayed number.
	//------
	displayedPrecision() {
		var txt = this.valueText.getText();
		var val = txt.indexOf( "." );
		if ( val === -1 )
			return 0;
		else
			return txt.length - val - 1;
	}

	//--------------------------------
	//  Return the cursor position relative to the decimal (if there is one).  This
	//  takes the form of a two-number list, a number indicating the distance from the
	//  decimal, and true/false indicating to the left (true) or to the right (false).
	//  This function *may* be making the assumption that the value is sensible.
	//------
	getCursorPosition() {
		this.savePrecision = this.displayedPrecision();
		var txt = this.valueText.getText();
		var posFound = false;
		var distCount = 0;
		var highSide = true;
		var quitNow = false;
		for ( var i = 0; i < txt.length && !quitNow; ++i ) {
			if ( !posFound && i === this.cursorStart.hlIdx )
				posFound = true;
			if ( highSide ) {
				if ( txt.charAt( i ) === '.' ) {
					if ( posFound )
						quitNow = true;
					else {
						highSide = false;
						distCount = 0;
					}
				}
				else if ( posFound )
					distCount = distCount + 1;
			}
			else if ( !posFound )
				distCount = distCount + 1;
		}
		//  Compute the step size.  This is a class variable.
		if ( highSide )
			this.stepSize = Math.pow( 10.0, distCount );
		else
			this.stepSize = 1.0 / Math.pow( 10.0, distCount + 1 );
		return [ distCount, highSide ];
	}

	//--------------------------------
	//  Using a list like that returned from getCursorPosition(), set the cursor
	//  to an appropriate location.
	//------
	setCursorPosition( arg ) {
		this.savePrecision = null;
		var distCount = arg[0];
		var highSide = arg[1];
		var txt = this.valueText.getText();
		//  Locate the position of the decimal point.  There may not be one!
		var ptPos = txt.indexOf( '.' );
		var oldPos = this.cursorStart.hlIdx;
		//  If we are on the "high" side, this is now pretty simple.
		if ( highSide ) {
			if ( ptPos === -1 ) //  No decimal place found
				this.typePos = txt.length - distCount;
			else
				this.typePos = ptPos - distCount;
		}
		//  To the right of the decimal is trickier.
		else {
			//  If no decimal was found, just dump the cursor at the end.
			if ( ptPos === -1 )
				this.typePos = txt.length;
			else
				this.typePos = ptPos + distCount + 1;
		}
		this.forceMoveCursor = true;
		this.moveCursor = this.typePos - oldPos;
		// this.startLoc = this.findLocation( this.cursorStart );
		// // this.cursorEnd = this.findIndexNear( this.cursorStart.xpos, this.cursorStart.ypos );
		// // this.endLoc = this.findLocation( this.cursorEnd );
		// this.cursorDrawing.resize( this.startLoc.x, this.startLoc.y, this.startLoc.w, this.startLoc.h );

	}

	//--------------------------------
	//  Handle events used to change the value.  Most events are handled by the 
	//  parent TextInput class, with a few exceptions.
	//------
	handle( event ) {
		if ( !this.allowEdit )
			return false;
		if ( super.handle( event ) ) {
			//this.checkStepSize();
			//  When a new ValueInput is created, it has a "0" as its text - which lets the user know
			//  it is a numeric input.  But if the use starts typing numbers (or anything else) it will
			//  keep the "0" in first position, which is wrong.  We get rid of it here.
			var tmp = this.getText();
			if ( tmp.length > 1 ) {
				if ( tmp[0] === '0' && tmp[1] !== '.' ) {
					this.setText( tmp.substring( 1 ) );
					this.moveCursor -= 1;
				}
			}
			return true;
		}
		switch ( event.type ) {
			case MOUSE_WHEEL:
				if ( this.hasFocus ) {
					var cursorSet = this.getCursorPosition();
					this.setValue( parseFloat( this.value ) + parseFloat( event.delta ) * parseFloat( this.stepSize ) );
					this.setCursorPosition( cursorSet );
					this.doCallback( ON_MOUSE_WHEEL );
					this.doRedraw();
					return true;
				}
				break;
			case KEY_DOWN:
				//  Only pay attention to keyboard events inside the component - here we only
				//  grab the up and down arrow keys - the parent TextInput component handles
				//  keystrokes (although we check them for sanity in "checkAddedText").
				if ( this.hasFocus ) { //&& this.eventInside( event ) ) {
					switch ( event.e.JDHKeyCode ) {
						case KB_ARROWUP:
							//  See if the shift key is held - if so, we change to the previous item in the
							//  list of text entered.
							if ( isShift() ) {
								if ( this.recentEntry !== null ) {
									if ( this.justDown )
										this.recentEntry -= 2;
									if ( this.recentEntry > this.entryList.length - 1 )
										this.recentEntry = this.entryList.length - 1;
									if ( this.recentEntry > -1 ) {
										this.setText( this.entryList[this.recentEntry] );
										this.desiredCursorPos = -1;
										this.valueInputMoveCursor = true;
										this.recentEntry -= 1;
									}
									this.justUp = true;
									this.justDown = false;
									this.backgroundRectangle.setFillPaint( this.changedValuePaint );
								}
							}
							else {
								var cursorSet = this.getCursorPosition();
								this.setValue( parseFloat( this.value ) + parseFloat( this.stepSize ) );
								this.setCursorPosition( cursorSet );
								this.doCallback( ON_ARROW_KEY );
							}
							this.doRedraw();
							return true;
							break;
						case KB_ARROWDOWN:
							if ( isShift() ) {
								if ( this.recentEntry !== null ) {
									if ( this.recentEntry < this.entryList.length + 1 && this.entryList.length > 0 ) {
										if ( this.justUp )
											this.recentEntry += 2;
										if ( this.recentEntry < this.entryList.length ) {
											this.setText( this.entryList[this.recentEntry] );
											this.desiredCursorPos = -1;
										}
										else {
											this.setText( this.originalEntry );
											this.backgroundRectangle.setFillPaint( null );
										}
										this.recentEntry += 1;
										this.desiredCursorPos = -1;
										this.valueInputMoveCursor = true;
										this.justDown = true;
										this.justUp = false;
									}
								}
							}
							else {
								var cursorSet = this.getCursorPosition();
								this.setValue( parseFloat( this.value ) - parseFloat( this.stepSize ) );
								this.setCursorPosition( cursorSet );
								this.doCallback( ON_ARROW_KEY );
							}
							this.doRedraw();
							return true;
							break;
					}
				}
				break;
		}
		return false;
	}

	//---------------------------------
	//  Function called after the displayed value is drawn.  We use this to move the
	//  cursor to where we want it.
	//------
	postdraw( ins ) {
		super.postdraw( ins );
		if ( this.valueInputMoveCursor ) {
			//  This is a ValueInput-specific instruction to position the cursor.
			if ( this.desiredCursorPos ===  -1 ) {
				//  This instruction is to go to the end of the line.
				this.cursorEnd.xpos = this.drawX + this.valueText.drawnXPos + this.valueText.textData.lineWidths[0];
				this.cursorEnd = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
				this.endLoc = this.findLocation( this.cursorEnd );
				this.cursorStart = this.findIndexNear( this.cursorEnd.xpos, this.cursorEnd.ypos );
				this.startLoc = this.findLocation( this.cursorEnd );
				this.cursorDrawing.resize( this.endLoc.x, this.endLoc.y, this.endLoc.w, this.endLoc.h );
				this.changeHighlight();
				this.doRedraw();
			}
			this.valueInputMoveCursor = false;
		}
	}

}
	
	

//=============================================================================
//  XYPlot
//  
//=============================================================================
//=============================================================================
//  BasePlot
//  
//  The BasePlot component contains much of the functionality shared by all plots,
//  in particular the handling of events.
//=============================================================================

class BasePlot extends Frame {
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		this.mouseInside = false;
		this.mousePushed = false;
		this.xScale = 1.0;
		this.yScale = 1.0;
		this.zoomInStep = 1.1;
		this.zoomOutStep = 1.1;
		this.xZoomOn = true;
		this.yZoomOn = true;
		this.xZoomBuffer = null;
		this.yZoomBuffer = null;
		this.symbol = null;
		//  This causes the data to be clipped to the plot limits.  A complex clip may
		//  be applied by putting a Path component here instead of "true".  Or you can
		//  shut it all off by setting it to "false" or "null".  Inheriting objects
		//  handle the clipping as they see fit - however this item is common to all.
		this.clipData = true;
		//  List of plot "items".  There are three of these: "grid" items that go in the
		//  background; "data" items that are drawn on top of the grid items, and "label"
		//  items that are drawn last.  The nature of the actual items is not important - any
		//  type of item can be put in any of the three lists.  If clipping is applied, it
		//  will affect grid and data items, but not label items.  The three lists all share
		//  the "itemPtr" variable, which is used to create a unique key for the item.  You 
		//  can use this key, which is returned when you add an item to the list, to delete 
		//  it if need be.
		this.dataItems = null;
		this.itemPtr = 0;
		this.lastItem = null;
		this.labelItems = null;
		this.lastLabelItem = null;
		this.gridItems = null;
		this.lastGridItem = null;
		//  These flags can be used (usually by inheriting classes) to tell which list to
		//  add something to.  They might have other uses.
		this.DATA_ITEM                        = 0;
		this.GRID_ITEM                        = 1;
		this.LABEL_ITEM                       = 2;
		//  These are item "types".  Inheriting plot classes may have their own types to add
		//  to this list - these are shared.
		this.NON_DRAWING_ITEM                 = 0;  //  Allows items to be included that don't do anything
		this.SET_STROKE_COLOR                 = 1;
		this.SET_FILL_COLOR                   = 2;
		this.SET_SYMBOL                       = 3;
		this.ITEM_LIST                        = 4;
		this.BASE_MAX                         = 5;
		//  These are symbol types.
		this.SYMBOL_CROSS                     = 0;
		this.SYMBOL_SQUARE                    = 1;
		this.SYMBOL_FILLED_SQUARE             = 2;
		this.SYMBOL_TRIANGLE                  = 3;
		this.SYMBOL_FILLED_TRIANGLE           = 4;
		this.SYMBOL_CIRCLE                    = 5;
		this.SYMBOL_FILLED_CIRCLE             = 6;
		this.SYMBOL_INVERTED_TRIANGLE         = 7;
		this.SYMBOL_FILLED_INVERTED_TRIANGLE  = 8;
		this.SYMBOL_DIAMOND                   = 9;
		this.SYMBOL_FILLED_DIAMOND            = 10;
		this.SYMBOL_X                         = 11;
		this.triHgt = 4.330127; 
		this.diHgt = 7.0710678;;
		//  These variables can hold a "paint cycle" - a series of paint specifications
		//  that will be cycled through if the user does not specify paint for different
		//  data plotting operations.  If these "cycles" are not filled (using "setStrokeCycle()"
		//  and "setFillCycle()") then no such paint changes will be made.
		this.strokeCycle = null;
		this.fillCycle = null;
		this.strokeCycleCount = 0;
		this.fillCycleCount = 0;
		//  Similar variables for the "symbol cycle".
		this.symbolCycle = null;
		this.symbolCycleCount = 0;
		//  These are different criteria that determine when callbacks occur for the different
		//  types of point searches below.
		this.TRIGGER_ALL                      = 0;
		this.TRIGGER_LAST                     = 1;
		this.TRIGGER_CLOSEST                  = 2;
		//  These items are used to create "hot" lists of points that trigger callbacks under
		//  different circumstances.  These lists are created as they are required during operation,
		//  then reused as proves useful.  They tend to be refreshed each time a plot is drawn.
		//  The first list holds locations that trigger callbacks associated with mouse move events.
		this.moveHotPointList = [];
		this.moveHotPointCount = 0;
		this.moveHotPointTotal = 0;
		//  Default radius over which we trigger a move callback.  This is in pixels.
		this.moveRadius = 5;
		//  This determines which points actually trigger events, all within radii specifications,
		//  the last one in the list that does so, or the closest point.
		this.moveTrigger = this.TRIGGER_CLOSEST;
		//  This callback is triggered when a move event doesn't locate any hot points near it (but
		//  it WILL NOT be called if there are no hot points).
		this.noMoveHotPointCB = null;
		this.noMoveHotPointCBArg = null;
		//  This callback is triggered when a move event occurs inside the plot, regardless.
		this.moveInsideCB = null;
		this.moveInsideCBArg = null;
		//  This callback is triggered when a move event occurs outside the plot.
		this.moveOutsideCB = null;
		this.moveOutsideCBArg = null;
		//  This list holds locations that trigger callbacks when click events occur.
		this.clickHotPointList = [];
		this.clickHotPointCount = 0;
		this.clickHotPointTotal = 0;
		//  Default radius for clicking.
		this.clickRadius = 5;
		//  This determines which points actually trigger events, all within radii specifications,
		//  the last one in the list that does so, or the closest point.
		this.clickTrigger = this.TRIGGER_CLOSEST;
		//  And another list for hovering events.
		this.hoverHotPointList = [];
		this.hoverHotPointCount = 0;
		this.hoverHotPointTotal = 0;
		//  Default radius for hovering.
		this.hoverRadius = 5;
		//  This determines which points actually trigger events, all within radii specifications,
		//  the last one in the list that does so, or the closest point.
		this.hoverTrigger = this.TRIGGER_CLOSEST;
		//  This is an "overlay" frame that allows us to select a portion of the plot to
		//  display.  The frame is always a rectangle, so we can do that part in this base
		//  class.  Inheriting classes handle the actual selection part.
		this.overlayFrame = new Rectangle( 0, 0, 0, 0, null );
		this.overlayFrame.setStrokePaint( rgb( 1, 0, 0 ) );
		this.overlayFrame.setVisible( false );
		this.overlayAdded = false;
		//this.addOverlay( this.overlayFrame );
		this.sliceX = null;
		this.sliceY = null;
		this.sliceW = null;
		this.sliceH = null;
		this.pushInside = false;
		//  The "label pool" maintains a list of text components that are used repeatedly
		//  to draw labels.  It grows as necessary.
		this.labelPool = [];
		this.poolTotal = 0;
		this.labelPoolCount = 0;
		//  Some common label types and their default sizes.
		this.labelFont = null;
		this.axisFont = null;
		this.titleFont = null;
		//  The resize box is used to allow changes to the size of this plot.  How child
		//  plots use the size is up to them.
		this.resizeBox = null;
		this.resizeClipBox = null;
		this.callbackOnResize = null;
		this.callbackOnResizeComponent = null;
		//  Some frame values.  Some of these we may know initially, others not yet.  But
		//  we need to fill them with *something*, as other classes depend on them.
		this.currentPixelX = this.x;
		this.currentPixelY = this.y;
		this.currentFractionX = this.x;
		this.currentFractionY = this.y;
		this.currentPixelW = this.w;
		this.currentPixelH = this.h;
		this.currentFractionW = this.w;
		this.currentFractionH = this.h;

		//  Plot decorations.  "Labels" in this usage are the labels along axis (they have tic marks
		//  associated with them, usually).  Axis can also have "titles".
		this.showGrid = true;
		this.gridColor = rgb( 100, 100, 100 );
		this.ticColor = rgb( 100, 100, 100 );
		this.labelPaint = null;

		//  These values are used for "date" labels - they control which are used.  These can be
		//  or'd together.
		this.LABEL_YEARS             = 1;
		this.LABEL_MONTHS            = 2;
		this.LABEL_DAYS              = 4;
		this.LABEL_HOURS             = 8;
		this.LABEL_MINUTES           = 16;
		this.LABEL_SECONDS           = 32;
		this.LABEL_TO_DAYS           = 7;
		this.LABEL_ALL               = 63;

		//  Plots maintain their own callback structure along with a bunch of conditions under which
		//  callbacks are made.  Inheriting classes can add to these conditions.  When any type of
		//  "plot" callback is triggered, the list of callbacks is consulted to see which conditions
		//  are met.  You can define new conditions in inheriting classes - see xyPlot for an example
		//  (search on LAST_CB_CONDITION).
		this.plotCallbackList = [];
		this.LAST_CB_CONDITION = 0;

		//  Plots allow you to define a whole list of items that should be drawn in the grid, data, and
		//  label categories.  However, you can define a "list" of items that should be drawn - these
		//  are specified by the "key" pointer returned from "appendItem".  They will be drawn in
		//  the order they are listed.  Setting each of these to "null" causes all of the items to
		//  be drawn.
		this.gridDrawList = null;
		this.dataDrawList = null;
		this.labelDrawList = null;
	}

	//  Destroy the existing labels, grids, and tic marks and recreate them based on current user
	//  settings.
	resetLabels() {
		this.clearGridItems();
		this.clearLabelItems();
		this.createLabels();
	}

	//  This function recreates labels - called by the function above.  It is expected that this
	//  will be overridden by inheriting classes to suit their specific label needs.
	createLabels() {};

	//---------------------------------
	//  A non-drawing item occupies the "data" space of a drawable item (label, whatever).
	//  It won't draw anything, but it keeps the item's "place", such that it can be turned
	//  on and off without changing what is drawn on top of it or below it.
	//------
	generateNonDrawingItem() {
		return [this.NON_DRAWING_ITEM];
	}

	//  Set the default font size for grid labels.
	setLabelFont( newFont ) {
		this.labelFont = newFont;
	}

	//  Add a callback to the list of callbacks.  Each callback has a "condition" under which it
	//  is actually called.  When the "plotCallback" function is called, it is given a "condition".
	//  The list of callbacks is consulted to see which ones should be called under those conditions.
	addPlotCallback( newCallback, condition, callbackComponent, callbackArg ) {
		if ( callbackComponent === undefined )
			this.callbackComponent = null;
		else
			this.callbackComponent = callbackComponent;
		if ( callbackArg === undefined )
			this.callbackArg = null;
		else
			this.callbackArg = callbackArg;
		this.plotCallbackList.push( [ newCallback, condition, callbackComponent, callbackArg ] );
	};

	//  Trigger a "plot" callback.  This is called with a condition - all callback functions
	//  that match this condition are triggered (in the order they were "added").  An optional
	//  event pointer can be the second argument.
	doPlotCallback( condition, event, eventArg ) {
		for ( var i = 0; i < this.plotCallbackList.length; ++i ) {
			if ( this.plotCallbackList[i][1] === condition ) {
				var theCallback = this.plotCallbackList[i][0];
				var callbackStuff = {};
				callbackStuff.this = this;
				callbackStuff.when = condition;
				callbackStuff.event = event;
				callbackStuff.eventArg = eventArg;
				callbackStuff.component = this.plotCallbackList[i][2];
				callbackStuff.arg = this.plotCallbackList[i][3];
				theCallback( this.plotCallbackList[i][2], callbackStuff );
			}
		}

	}

	//  Set the (default) grid paint.

	//  Set whether a grid is shown or not.


	//  "Clear" the list of move hot points.  This should be done before drawing.
	clearMoveHotPoints() {
		this.moveHotPointCount = 0;
	};

	//  "Clear" the list of click hot points.
	clearClickHotPoints() {
		this.clickHotPointCount = 0;
	};

	//  "Clear" the list of hover hot points.
	clearHoverHotPoints() {
		this.hoverHotPointCount = 0;
	};

	//  Set the default radius over which we are sensitive to different types of data
	//  point associated events.
	setMoveRadius( newVal ) {
		this.moveRadius = newVal;
	};
	setClickRadius( newVal ) {
		this.clickRadius = newVal;
	};
	setHoverRadius( newVal ) {
		this.hoverRadius = newVal;
	};

	//  Set the callback that will be done if there are no hot points located on a
	//  move.
	setNoMoveHotPointCB( callbackFunction, callbackArg ) {
		this.noMoveHotPointCB = callbackFunction;
		this.noMoveHotPointCBArg = callbackArg;
	};

	//  Set the callback that will be done if there is a move event inside the plot.
	setMoveInsideCB( callbackFunction, callbackArg ) {
		this.moveInsideCB = callbackFunction;
		this.moveInsideCBArg = callbackArg;
	};

	//  Set the callback that will be done if there is a move event outside the plot.
	setMoveOutsideCB( callbackFunction, callbackArg ) {
		this.moveOutsideCB = callbackFunction;
		this.moveOutsideCBArg = callbackArg;
	};

	//  Add a move hot point to the list, reusing an old object or creating a new one
	//  if necessary.  This is called from inheriting functions.
	addMoveHotPoint( x, y, callback, radius, args ) {
		if ( this.moveHotPointCount === this.moveHotPointTotal ) {
			var obj = {};
			this.moveHotPointList[this.moveHotPointCount] = obj;
			++this.moveHotPointTotal;
		}
		else
			var obj = this.moveHotPointList[this.moveHotPointCount];
		++this.moveHotPointCount;
		obj.x = x - this.drawX;
		obj.y = y - this.drawY;
		obj.callback = callback;
		obj.radius = radius;
		obj.args = args;
		return obj;
	}

	//  Add a hover hot point to the list, reusing an old object or creating a new one
	//  if necessary.  This is called from inheriting functions.
	addHoverHotPoint( x, y, callback, radius, args ) {
		if ( this.hoverHotPointCount === this.hoverHotPointTotal ) {
			var obj = {};
			this.hoverHotPointList[this.hoverHotPointCount] = obj;
			++this.hoverHotPointTotal;
		}
		else
			var obj = this.hoverHotPointList[this.hoverHotPointCount];
		++this.hoverHotPointCount;
		obj.x = x - this.drawX;
		obj.y = y - this.drawY;
		obj.callback = callback;
		obj.radius = radius;
		obj.args = args;
		return obj;
	}

	//  Add a click hot point to the list, reusing an old object or creating a new one
	//  if necessary.  This is called from inheriting functions.
	addClickHotPoint( x, y, callback, radius, args ) {
		if ( this.clickHotPointCount === this.clickHotPointTotal ) {
			var obj = {};
			this.clickHotPointList[this.clickHotPointCount] = obj;
			++this.clickHotPointTotal;
		}
		else
			var obj = this.clickHotPointList[this.clickHotPointCount];
		++this.clickHotPointCount;
		obj.x = x - this.drawX;
		obj.y = y - this.drawY;
		obj.callback = callback;
		obj.radius = radius;
		obj.args = args;
		return obj;
	}

	//  This function actually adds a hotpoint of any (or all) types.
	internalAddHotPoint( x, y, moveCallback, moveRadius, moveArgs, clickCallback, 
		clickRadius, clickArgs, hoverCallback, hoverRadius, hoverArgs ) {
		if ( moveCallback !== null )
			this.addMoveHotPoint( x, y, moveCallback, moveRadius, moveArgs );
		if ( clickCallback !== null )
			this.addClickHotPoint( x, y, clickCallback, clickRadius, clickArgs );
		if ( hoverCallback !== null )
			this.addHoverHotPoint( x, y, hoverCallback, hoverRadius, hoverArgs );
	};

	//  Get the next Text component from the "label pool".  Create one if necessary.
	nextText() {
		if ( this.labelPoolCount === this.poolTotal ) {
			var txtComp = new TextHolder( 0, 0, "" );
			this.labelPool[this.labelPoolCount] = txtComp;
			++this.poolTotal;
		}
		else
			var txtComp = this.labelPool[this.labelPoolCount];
		++this.labelPoolCount;
		return txtComp;
	}

	//-------------------------------------------------------------------------
	//  Find a value for precision based on user-supplied strings.  This value
	//  is to be used as the "precisionHint" in formatLabel() where it eliminates
	//  rounding errors in JavaScript addition math.  The strings are interpreted
	//  as numbers, and the number of digits (zero or otherwise) is counted.  The
	//  larger of the two results is returned.
	//---------------------
	findPrecsion( startStr, stepStr ) {
		var ret = null;
		if ( startStr !== null ) {
			var idx = startStr.indexOf( "." );
			if ( idx > -1 )
				var ret = startStr.length - idx;
			else
				var ret = 0;
		}
		if ( stepStr !== null ) {
			idx = stepStr.indexOf( "." );
				if ( idx > -1 && stepStr.length - idx > ret )
					ret = stepStr.length - idx;
		}
		ret = 2;
		return ret;
	}

	//  Produce a label from the given value using the given format.  The format can be
	//  a number of different things:
	//     1) It can be a simple string, in which case the label will be a Text Component
	//        (pulled from the "pool" of label components).  In this case the value is 
	//        ignored - it doesn't change the label.  
	//     2) The format may be null, in which case the value is converted to a string that
	//        forms a Text Component (again from the pool).  The string version of the value
	//        will have whatever precision is attached to the number itself.  The optional
	//        argument "precisionHint" will tell it how many digits should be considered
	//        significant - if not included this defaults to 10.
	//     3) It can be a number, which is interpreted as a precision that is used to convert
	//        the value to a string, then a Text Component.
	//     4) The format may be a complex JDH Component.  In this case, the component is
	//        made the label of a Text Component (so as to employ any higher level alignment
	//        instructions).
	//     5) The format may also be a function.  In this case, the function is called with
	//        ins as the first argument (in the event it is needed), the value as the second
	//        argument and "args" as the third argument.  The return is then
	//        the "format" argument in a recursive call to this function - so the function
	//        can return any of the above 4 items.  The function is user defined.
	formatLabel( ins, value, format, args, precisionHint ) {
		//  If no format is specified, convert the value to a string using system default
		//  precision.
		if ( format === null ) {
			if ( precisionHint === undefined || precisionHint === null )
				precisionHint = 10;
			var tStr = Number( Number.parseFloat( value ).toPrecision( precisionHint ) ).toString();
		}
		//  A number indicates the digits of precision desired.
		else if ( typeof( format ) === "number" )
			var tStr = value.toFixed( format );
		//  A string is used as a straight-forward label.  No adjustments.
		else if ( typeof( format ) === "string" )
			var tStr = format;
		//  An object is straight-forward as well - it will be used below as the "text"
		//  of the text object that draws the label.
		else if ( typeof( format ) === "object" )
			var tStr = format;
		//  If the format is a function, call it with the value and arguments.
		else if ( typeof( format ) === "function" ) {
			var retFormat = format( ins, value, args );
			//  The return of the format function is recursively passed to this function
			//  to generate a return component.  This is a little messy, but it allows
			//  the function to return any of the above format types.  If the function is
			//  just returning a string, this will work fine.
			return this.formatLabel( ins, value, retFormat, args );
		}
		//  Grab a text component for this label.
		var tComp = this.nextText();
		tComp.setText( tStr );
		return tComp;
	};

	resizeCallback( thisInstance ) {
		//  Compute new pixel and fractional values for this resized plot frame.  If the pixel value
		//  of x or y is negative, we have to add the (negative) size of the box to make it
		//  appear in the right place.  This is kind of a special case.
		var newX = thisInstance.resizeBox.getNewX() - thisInstance.getParent().drawX;
		var newY = thisInstance.resizeBox.getNewY() - thisInstance.getParent().drawY;
		thisInstance.currentPixelX = newX;
		thisInstance.currentPixelY = newY;
		thisInstance.currentFractionX = newX / thisInstance.getParent().drawW;
		thisInstance.currentFractionY = newY / thisInstance.getParent().drawH;
		thisInstance.currentPixelW = thisInstance.resizeBox.getNewW();
		thisInstance.currentPixelH = thisInstance.resizeBox.getNewH();
		thisInstance.currentFractionW = thisInstance.resizeBox.getNewW() / thisInstance.getParent().drawW;
		thisInstance.currentFractionH = thisInstance.resizeBox.getNewH() / thisInstance.getParent().drawH;
		if ( newX < 1 )
			newX = newX - thisInstance.getParent().drawW;
		if ( newY < 1 )
			newY = newY - thisInstance.getParent().drawH;
		thisInstance.resize( newX, newY, thisInstance.resizeBox.getNewW(), thisInstance.resizeBox.getNewH() );
		//  This is an additional callback for this frame - in case an outside component
		//  needs to know when this item is resized.
		if ( thisInstance.callbackOnResize !== null )
			thisInstance.callbackOnResize( thisInstance.callbackOnResizeComponent );
		thisInstance.doRedraw();
		doOverlayRedraw();
	}

	//  Set an additional callback when a resize callback (from the resize box) occurs.
	//  Both the callback function and its component need to be included.
	setCallbackOnResize( callbackFunction, callbackComponent ) {
		this.callbackOnResize = callbackFunction;
		this.callbackOnResizeComponent = callbackComponent;
	};

	//  Turn on the "resize box" which allows this plot to be resized.  This will draw
	//  a frame in the overlay area that will trap a bunch of events (move, push, drag,
	//  release) as appropriate.
	showResizeBox( newVal ) {
		if ( newVal ) {
			//  Create the box if necessary.
			if ( this.resizeBox === null ) {
				this.resizeBox = new ResizeBox( 100, 100, 200, 200 );
				this.resizeBox.setMoveCapable( true );
				this.resizeBox.setCallback( this.resizeCallback, this );
				this.resizeClipBox = new Component( 100, 100, 200, 200 );
				this.resizeClipBox.add( this.resizeBox );
				this.resizeClipBox.setClip( true );
				//addOverlay( this.resizeClipBox );
			}
			if ( !isOverlay( this.resizeClipBox ) )
				this.addOverlay( this.resizeClipBox );
		}
		//  Hide any resize box that is being shown.
		else {
			if ( this.resizeClipBox !== null ) {
				removeFromOverlay( this.resizeClipBox );
				this.resizeClipBox = null;
			}
		}
	}

	//  This allows external functions to control the resize box.
	getResizeBox() {
		return this.resizeBox;
	};

	//                                                     
	//  ___                               ___ ___          
	//  `MM                               `MM `MM          
	//   MM                                MM  MM          
	//   MM  __      ___   ___  __     ____MM  MM   ____   
	//   MM 6MMb   6MMMMb  `MM 6MMb   6MMMMMM  MM  6MMMMb  
	//   MMM9 `Mb 8M'  `Mb  MMM9 `Mb 6M'  `MM  MM 6M'  `Mb 
	//   MM'   MM     ,oMM  MM'   MM MM    MM  MM MM    MM 
	//   MM    MM ,6MM9'MM  MM    MM MM    MM  MM MMMMMMMM 
	//   MM    MM MM'   MM  MM    MM MM    MM  MM MM       
	//   MM    MM MM.  ,MM  MM    MM YM.  ,MM  MM YM    d9 
	//  _MM_  _MM_`YMMM9'Yb_MM_  _MM_ YMMMMMM__MM_ YMMMM9  
	//                                                     
	//  Handle the events that are common to all plots.  These allow the user to drag the
	//  plot around (rescaling or reorienting it), zoom in and out, and locate positions
	//  on it.  Positions are adjusted to the position of this plot component, and functions
	//  that are meant to be overridden are called with these positions.  Some effort is
	//  made to pay attention only to events that occur within the plot area or as a result
	//  of activities that occur within the plot area.
	handle( event ) {
		switch ( event.type ) {
			case MOUSE_PUSH:
                this.deTransformEvent( event );
				if ( this.mouseInside ) {
					this.mousePushed = true;
				}
				return this.mousePush( event, event.dtx - this.drawX, event.dty - this.drawY );
				break;
			case MOUSE_MOVE:
				//  Keep track of whether the mouse is inside or outside this object.  Only call
				//  move events when inside.
                this.deTransformEvent( event );
				if ( this.pixelPositionInside( event.dtx, event.dty ) ) {
					if ( !this.mouseInside ) {
						this.mouseInside = true;
						this.mouseEnter( event, event.dtx - this.drawX, event.dty - this.drawY );
					}
				}
				else {
					if ( this.mouseInside ) {
						this.mouseInside = false;
						this.mouseLeave( event, event.dtx - this.drawX, event.dty - this.drawY );
					}
				}
				return this.mouseMove( event, event.dtx - this.drawX, event.dty - this.drawY );
				break;
			case MOUSE_RELEASE:
                this.deTransformEvent( event );
				if ( this.mousePushed )
					this.mousePushed = false;
				else
					this.mouseDrop( event, event.dtx - this.drawX, event.dty - this.drawY );
				return this.mouseRelease( event, event.dtx - this.drawX, event.dty - this.drawY );
				break;
			case MOUSE_CLICK:
                this.deTransformEvent( event );
				return this.mouseClick( event, event.dtx - this.drawX, event.dty - this.drawY );
				break;
			case MOUSE_HOVER:
                this.deTransformEvent( event );
				return this.mouseHover( event, event.dtx - this.drawX, event.dty - this.drawY );
				break;
			// case MOUSE_PUSH:
            //     this.deTransformEvent( event );
			// 	return this.mousePush( event, event.dtx - this.drawX, event.dty - this.drawY );
			// 	break;
			case MOUSE_DRAG:
				if ( getLastEventComponent() === this ) {
					this.deTransformEvent( event );
					if ( this.pixelPositionInside( event.dtx, event.dty ) )
						this.mouseInside = true;
					else
						this.mouseInside = false;
					return this.mouseDrag( event, event.dtx - this.drawX, event.dty - this.drawY );
				}
				break;
			case MOUSE_WHEEL:
				//  The mouse wheel produces an event, but also we track x and y scale values (for zooming).
                this.deTransformEvent( event );
				if ( this.mouseInside ) {
					var scaleFactor = 1.0;  
					if ( event.delta > 0.0 ) { //  The sign of this thing determines which way we zoom
						if ( event.e.shiftKey )
							scaleFactor = ( this.zoomOutStep - 1.0 ) / 10.0 + 1.0;
						else
							scaleFactor = this.zoomInStep;
					}
					else {
						if ( event.e.shiftKey )
							scaleFactor = 1.0 / ( ( this.zoomOutStep - 1.0 ) / 10.0 + 1.0 );
						else
							scaleFactor = 1.0 / this.zoomOutStep;
					}
					if ( scaleFactor != 1.0 ) {
						var xScaleFactor = 1.0;
						var yScaleFactor = 1.0;
						if ( this.xZoomOn )
							xScaleFactor = scaleFactor;
						if ( this.yZoomOn )
							yScaleFactor = scaleFactor;
						//  All plots are supposed to change their scale with the mouse wheel (zoom in/out).
						//  How this is done depends on the inheriting plot type.
						this.rescale( xScaleFactor, yScaleFactor, event.dtx - this.drawX, event.dty - this.drawY, event );
					}
					//  Anything else the mouse wheel needs to do?
					this.mouseWheel( event, event.dtx - this.drawX, event.dty - this.drawY );
					return true;
				}
				//  Also check for "external" mousewheel events - these are being used by XY plots to allow
				//  zooming outside the plot where the labels normally go.
				else {
					if ( this.xZoomOn && this.insideXZoomBuffer( event.dtx, event.dty ) ) {
						var scaleFactor = 1.0;  
						if ( event.delta > 0.0 ) { //  The sign of this thing determines which way we zoom
							if ( event.e.shiftKey )
								scaleFactor = ( this.zoomOutStep - 1.0 ) / 10.0 + 1.0;
							else
								scaleFactor = this.zoomInStep;
						}
						else {
							if ( event.e.shiftKey )
								scaleFactor = 1.0 / ( ( this.zoomOutStep - 1.0 ) / 10.0 + 1.0 );
							else
								scaleFactor = 1.0 / this.zoomOutStep;
						}
						if ( scaleFactor != 1.0 ) {
							this.rescale( scaleFactor, 1.0, event.dtx - this.drawX, event.dty - this.drawY, event );
						}
					}
					if ( this.yZoomOn && this.yZoomBuffer !== null ) {
						if ( event.dty > this.drawY && event.dty < this.drawY + this.drawH ) {
							if ( event.dtx > this.drawX - this.xZoomBuffer[0] &&
								event.dtx < this.drawX + this.drawW + this.xZoomBuffer[1] ) {
								var scaleFactor = 1.0;  
								if ( event.delta > 0.0 ) { //  The sign of this thing determines which way we zoom
									if ( event.e.shiftKey )
										scaleFactor = ( this.zoomOutStep - 1.0 ) / 10.0 + 1.0;
									else
										scaleFactor = this.zoomInStep;
								}
								else {
									if ( event.e.shiftKey )
										scaleFactor = 1.0 / ( ( this.zoomOutStep - 1.0 ) / 10.0 + 1.0 );
									else
										scaleFactor = 1.0 / this.zoomOutStep;
								}
								if ( scaleFactor != 1.0 ) {
									this.rescale( 1.0, scaleFactor, event.dtx - this.drawX, event.dty - this.drawY, event );
								}
							}
						}
					}
				}
				break;
		}
		return false;
	};

	//  Determine whether a location is inside the X "zoom buffer" - an area outside the
	//  limits of a plot (which may or may not exist).
	insideXZoomBuffer( x, y ) {
		if ( this.xZoomBuffer !== null ) {
			if ( x > this.drawX && x < this.drawX + this.drawW ) {
				if ( y < this.drawY + this.drawH + this.xZoomBuffer[0] && y > this.drawY - this.xZoomBuffer[1] )
					return true;
			}
		}
		return false;
	};

	//  Determine whether a location is inside the Y "zoom buffer" - an area outside the
	//  limits of a plot (which may or may not exist).
	insideYZoomBuffer( x, y ) {
		if ( this.yZoomBuffer !== null ) {
			if ( y > this.drawY && y < this.drawY + this.drawH ) {
				if ( x > this.drawX - this.xZoomBuffer[0] && x < this.drawX + this.drawW + this.xZoomBuffer[1] )
					return true;
			}
		}
		return false;
	};

	//=============================================================================
	//  These functions respond to mouse activities, usually in response to an event.
	//  They don't have to be overridden, but if you want them to do anything they 
	//  need to be.  Note that most return true or false depending on whether the
	//  event should be consumed or not.
	//=============================================================================

	mousePush( event, x, y ) {
		return false;
	};

	//  Move events can trigger "hotpoints".
	mouseMove( event, x, y ) {
		if ( this.mouseInside ) {
			//  Look at the list of "move" hotpoints and trigger callbacks for them according
			//  to user instructions.
			if ( this.moveHotPointCount > 0 ) {
				var pt = null;
				var savePt = null;
				var saveR = null;
				var r = this.moveRadius;
				var foundSomething = false;
				//  Search through all "move" points to find those that are located within a radius
				//  of the current x,y position.  There are a bunch of ways of doing this - we can
				//  located ALL move points that meet this requirement, the LAST point that does so
				//  (presumably the point drawn top-most, but we do nothing to confirm that here)
				//  or the CLOSEST point.  Which we do depends on "moveTrigger".
				for ( var i = 0; i < this.moveHotPointCount; ++i ) {
					//  The move will trigger a callback if it is within a radius of the hotpoint.
					//  We are trying to locate the point that is closest to our x,y position.
					//  This radius can be unique for each point, but if it is not specified we use
					//  the default.  We try to do this as efficiently as possible!
					pt = this.moveHotPointList[i];
					//  Test radius may be set for the individual point - if not we use the default.
					if ( pt.radius !== null )
						r = pt.radius;
					else
						r = this.moveRadius;
					//  If we are locating the closest point and the radius of the closest point we
					//  have found so far is smaller, use that.
					if ( this.moveTrigger === this.TRIGGER_CLOSEST && this.saveR !== null && this.saveR < r )
						r = this.saveR;
					//  See if this point is within the radius.  We try to do this as efficiently as
					//  possible!
					if ( Math.abs( x - pt.x ) < r && Math.abs( y - pt.y ) < r ) {
						var nr = Math.sqrt( ( x - pt.x ) * ( x - pt.x ) + ( y - pt.y ) * ( y - pt.y ) );
						if ( nr < r ) {
							//  If we are triggering on "all", do so.
							if ( this.moveTrigger === this.TRIGGER_ALL )
								pt.callback( event, nr, pt.args );
							//  Otherwise just save the point information.  If we are interested in only
							//  the closest point, we have already assured with the search radius that this 
							//  is the closest.
							else {
								savePt = pt;
								saveR = nr;
							}
							foundSomething = true;
						}
					}
				}
				if ( this.moveTrigger !== this.TRIGGER_ALL && savePt != null )
					savePt.callback( event, savePt.x, savePt.y, saveR, savePt.args );
				if ( !foundSomething && this.noMoveHotPointCB !== null )
					this.noMoveHotPointCB( this.noMoveHotPointCBArg, event );
			}
			if ( this.moveInsideCB !== null ) {
				this.callbackEvent = event;
				this.callbackX = x;
				this.callbackY = y;
				this.moveInsideCB( this.moveInsideCBArg );
			}
			return true;
		}
		else {
			if ( this.moveOutsideCB !== null )
				this.moveOutsideCB( this.moveOutsideCBArg );
			return false;
		}
	};

	//  Enter and Leave are "false" events generated by move events.  Thus they
	//  don't return anything - the move event will also be triggered.
	mouseEnter( event, x, y ) {
	};

	mouseLeave( event, x, y ) {
	};

	mousePush( event, x, y ) {
	};

	mouseRelease( event, x, y ) {
		if ( this.overlayFrame.getVisible() ) {
			this.overlayFrame.setVisible( false );
			this.overlaySlice( this.sliceX, this.sliceY, this.sliceW, this.sliceH );
			event.drawing.doRedraw();
			return true;
		}
		return false;
	};

	//  This function redraws the plot based on a rectangular area.  Ostensibly this is
	//  chosen by the user with the mouse (triggered by "mouseRelease()" above), but that
	//  is not required.  Each inheriting plot will interpret this instruction in a
	//  different way - this do-nothing function is meant to be overridden.
	overlaySlice( x, y, w, h ) {
	};

	//  Drop doesn't seem to work right now, and in any case is a manufactured event type
	//  so does not return anything.
	mouseDrop( event, x, y ) {
	};

	//  Click events may trigger "hot point" results if they are within the confines of
	//  defined hot points.  These take precedent.  If none are found, a click on the plot
	//  returns a generic callback.  
	mouseClick( event, x, y ) {
		if ( this.mouseInside && this.clickHotPointCount !== 0 ) {
			var pt = null;
			var savePt = null;
			var saveR = null;
			var r = this.clickRadius;
			var foundSomething = false;
			//  Search through all "move" points to find those that are located within a radius
			//  of the current x,y position.  There are a bunch of ways of doing this - we can
			//  located ALL move points that meet this requirement, the LAST point that does so
			//  (presumably the point drawn top-most, but we do nothing to confirm that here)
			//  or the CLOSEST point.  Which we do depends on "moveTrigger".
			for ( var i = 0; i < this.clickHotPointCount; ++i ) {
				//  The move will trigger a callback if it is within a radius of the hotpoint.
				//  We are trying to locate the point that is closest to our x,y position.
				//  This radius can be unique for each point, but if it is not specified we use
				//  the default.  We try to do this as efficiently as possible!
				pt = this.clickHotPointList[i];
				//  Test radius may be set for the individual point - if not we use the default.
				if ( pt.radius !== null )
					r = pt.radius;
				else
					r = this.clickRadius;
				//  If we are locating the closest point and the radius of the closest point we
				//  have found so far is smaller, use that.
				if ( this.clickTrigger === this.TRIGGER_CLOSEST && this.saveR !== null && this.saveR < r )
					r = this.saveR;
				//  See if this point is within the radius.  We try to do this as efficiently as
				//  possible!
				if ( Math.abs( x - pt.x ) < r && Math.abs( y - pt.y ) < r ) {
					var nr = Math.sqrt( ( x - pt.x ) * ( x - pt.x ) + ( y - pt.y ) * ( y - pt.y ) );
					if ( nr < r ) {
						//  If we are triggering on "all", do so.
						if ( this.clickTrigger === this.TRIGGER_ALL )
							pt.callback( event, pt.x, pt.y, nr, pt.args );
						//  Otherwise just save the point information.  If we are interested in only
						//  the closest point, we have already assured with the search radius that this 
						//  is the closest.
						else {
							savePt = pt;
							saveR = nr;
						}
						foundSomething = true;
					}
				}
			}
			if ( this.clickTrigger !== this.TRIGGER_ALL && savePt != null )
				savePt.callback( event, savePt.x, savePt.y, saveR, savePt.args );
		}
		if ( this.callback !== null ) {
			if ( this.pixelPositionInside( event.dtx, event.dty ) ) {
				this.callbackEvent = event;
				this.callbackX = x;
				this.callbackY = y;
				this.doCallback();
			}
		}
		return false;
	};

	//  Hovering may trigger a hot point event.
	mouseHover( event, x, y ) {
		if ( this.mouseInside && this.hoverHotPointCount !== 0 ) {
			var pt = null;
			var savePt = null;
			var saveR = null;
			var r = this.hoverRadius;
			var foundSomething = false;
			//  Search through all "move" points to find those that are located within a radius
			//  of the current x,y position.  There are a bunch of ways of doing this - we can
			//  located ALL move points that meet this requirement, the LAST point that does so
			//  (presumably the point drawn top-most, but we do nothing to confirm that here)
			//  or the CLOSEST point.  Which we do depends on "moveTrigger".
			for ( var i = 0; i < this.hoverHotPointCount; ++i ) {
				//  The move will trigger a callback if it is within a radius of the hotpoint.
				//  We are trying to locate the point that is closest to our x,y position.
				//  This radius can be unique for each point, but if it is not specified we use
				//  the default.  We try to do this as efficiently as possible!
				pt = this.hoverHotPointList[i];
				//  Test radius may be set for the individual point - if not we use the default.
				if ( pt.radius !== null )
					r = pt.radius;
				else
					r = this.hoverRadius;
				//  If we are locating the closest point and the radius of the closest point we
				//  have found so far is smaller, use that.
				if ( this.hoverTrigger === this.TRIGGER_CLOSEST && this.saveR !== null && this.saveR < r )
					r = this.saveR;
				//  See if this point is within the radius.  We try to do this as efficiently as
				//  possible!
				if ( Math.abs( x - pt.x ) < r && Math.abs( y - pt.y ) < r ) {
					var nr = Math.sqrt( ( x - pt.x ) * ( x - pt.x ) + ( y - pt.y ) * ( y - pt.y ) );
					if ( nr < r ) {
						//  If we are triggering on "all", do so.
						if ( this.hoverTrigger === this.TRIGGER_ALL )
							pt.callback( event, pt.x, pt.y, nr, pt.args );
						//  Otherwise just save the point information.  If we are interested in only
						//  the closest point, we have already assured with the search radius that this 
						//  is the closest.
						else {
							savePt = pt;
							saveR = nr;
						}
						foundSomething = true;
					}
				}
			}
			if ( this.hoverTrigger !== this.TRIGGER_ALL && savePt != null )
				savePt.callback( event, savePt.x, savePt.y, saveR, savePt.args );
		}
	}

	mouseDrag( event, x, y ) {
		//  A shift key on a drag indicates that we are selecting a portion of the plot.
		if ( event.e.shiftKey ) {
			//  Make sure the drag event start is within the limits of the plot, including
			//  any zoom buffers.  If not, we don't want this event.
			if ( this.pixelPositionInside( event.dragStartX, event.dragStartY ) ||
				this.insideXZoomBuffer( event.dragStartX, event.dragStartY ) || 
				this.insideYZoomBuffer( event.dragStartY, event.dragStartY ) ) {
				if ( event.dragX < 0 ) {
					this.sliceX = event.dragStartX + event.dragX;
					this.sliceW = -event.dragX;
				}
				else {
					this.sliceX = event.dragStartX;
					this.sliceW = event.dragX;
				}
				if ( event.dragY < 0 ) {
					this.sliceY = event.dragStartY + event.dragY;
					this.sliceH = -event.dragY;
				}
				else {
					this.sliceY = event.dragStartY;
					this.sliceH = event.dragY;
				}
				this.overlayFrame.resize( this.sliceX, this.sliceY, this.sliceW, this.sliceH );
				if ( this.sliceW < 2 || this.sliceH < 2 )
					this.overlayFrame.setVisible( false );
				else {
					if ( !this.overlayAdded ) {
						this.addOverlay( this.overlayFrame );
						this.overlayAdded = true;
					}
					this.overlayFrame.setVisible( true );
				}
				event.drawing.doRedraw();
				return true;
			}
		}
		//  This is a conventional drag event.  As long as the drag start was within limits,
		//  consider this a "reposition" event - inheriting classes will handle this as they
		//  see fit.
		return this.repositionDrag( event, x, y );
	};

	//  Do-nothing function to be overridden.  Use the drag event to reposition the plot
	//  as appropriate for the plot type.
	repositionDrag( event ) {
		return false;
	};

	mouseWheel( event, x, y ) {
	};

	setXScale( val ) {
		this.xScale = val;
	};

	setYScale( val ) {
		this.yScale = val;
	};

	getXScale() {
		return this.xScale;
	};

	getYScale() {
		return this.yScale;
	};

	setZoomInStep( val ) {
		this.zoomInStep = val;
	};

	setZoomOutStep( val ) {
		this.zoomOutStep = val;
	};

	setXZoomOn( val ) {
		this.xZoomOn = val;
	};

	setYZoomOn( val ) {
		this.yZoomOn = val;
	};

	//  Set the zoom "buffer".  This is an area outside of the plot where zoom operations for
	//  one dimension or the other is allowed.  The zoom buffer is defined as a pair of pixel
	//  depths for the low and high sides of the plot.  The behavior is off by default for
	//  the BasePlot - the XYPlots turn it on.  Not sure if it can be used elsewhere.
	setXZoomBuffer( newVal ) {
		//  Eliminate some ways of shutting it off...
		if ( newVal === undefined || newVal === null || newVal === false ) {
			this.xZoomBuffer = null;
			return;
		}
		//  A single number is interpreted as both the low and high values.
		else if ( typeof( newVal ) === "number" ) {
			this.xZoomBuffer = [ newVal, newVal ];
		}
		//  Otherwise we hope the user did this right!
		else
			this.xZoomBuffer = newVal;
	};

	//  See the notes for setXZoomBuffer...
	setYZoomBuffer( newVal ) {
		if ( newVal === undefined || newVal === null || newVal === false ) {
			this.yZoomBuffer = null;
			return;
		}
		else if ( typeof( newVal ) === "number" ) {
			this.yZoomBuffer = [ newVal, newVal ];
		}
		else
			this.yZoomBuffer = newVal;
	};

	//  Change the scale of this plot by the "scale factors".  The x,y position is where the
	//  change in scale should be centered (this position should maintain its location in the
	//  plot).  This may be done in response to an event, but any function should handle the
	//  possibility that the event is undefined or null.
	rescale( xScaleFactor, yScaleFactor, x, y, event ) {
		if ( xScaleFactor !== 1.0 )
			this.xScale = this.xScale * xScaleFactor;
		if ( yScaleFactor !== 1.0 )
			this.yScale = this.yScale * yScaleFactor;
		this.doRedraw();
	};

	pixelPositionInside( x, y ) {
		if ( x < this.drawX )
			return false;
		if ( y < this.drawY )
			return false;
		if ( x > this.drawX + this.drawW )
			return false;
		if ( y > this.drawY + this.drawH )
			return false;
		return true;
	};

	//  Return the x pixel position of the given data point.  Data can take whatever form the
	//  plot type desires.  This function must be overridden by all inheriting plot classes.
	xProject( data ) {
		return this.drawX;
	};

	//  Return the y pixel position of the given data point.  Data can take whatever form the
	//  plot type desires.  This function must be overridden by all inheriting plot classes.
	yProject( data ) {
		return this.drawY;
	};

	//  Return the x,y pixel position of the given data point.  If you are interested in both
	//  x and y, this function call is either more efficient or at least as efficient at calling
	//  xProject() and yProject() individually.  However if you only want one or the other, this
	//  call is either equally efficient or less efficient than calling one of the two individually.
	//  Depends on the plot type.  This function must be overridden by all inheriting plot
	//  classes.
	project( data ) {
		return [this.drawX, this.drawY];
	};

	//  From an x,y pixel position, produce a data point.  The reverse of the above function.
	//  This function must be overridden by all inheriting plot classes.
	deproject( x, y ) {
		return null;
	};

	//  Turn on/off clipping of the data.  This will not apply to decorations, labels, tic
	//  marks, or whatever, but it WILL apply to grids and drawn data items.
	setClipData( newVal ) {
		this.clipData = newVal;
	};

	//  This is a utility function used to determine start and step values for "reasonable"
	//  intervals (such as where you might want labels or grid lines).  You give it (at a
	//  minimum) a low and high value, as well as a minimum and a maximum number of labels.
	//  Between the minimum and maximum you can specify an optional "best" number of
	//  labels, or a "preferred" step interval.  The latter will take precedent, and be used
	//  if it can be within the "min" and "max" limits.  If the "preferred" value is not
	//  there or doesn't work, the "best" value comes into play.  The function returns an
	//  array of 3 values - the start value, the step size, and the "order" of the step.  This
	//  last value tells you the number of digits of precision required to fully display the
	//  labels.  This value can be negative, which means you need less than 0 digits of
	//  precision - i.e. the step size is greater than 10.
	findSteps( low, high, min, max, best, preferred, allowFraction ) {
		if ( high == low )
			return [low, 1, 0];
		var range = high - low;
		//  If the range is negative, reverse min and max and run this function again.  Then
		//  reverse the results and return them.  This is kludgy, but it should be okay.  At the
		//  moment I can't image what ill effects it might have.
		if ( range < 0 ) {
			var ret = this.findSteps( high, low, min, max, best, preferred, allowFraction );
			ret[1] = -ret[1];
			//console.info( ret[0] + "  " + ret[1] );
			return ret;
		}
		//  See if min and max have been chosen.  If not, pick logical values.
		if ( min === undefined || min === null )
			min = 2;
		if ( max === undefined || max === null )
			max = 6;
		if ( preferred === undefined )
			preferred = null;
		if ( allowFraction === undefined || allowFraction === null )
			allowFraction = true;
		//  Find the "best" value if it hasn't been chosen.
		if ( best === undefined || best === null )
			best = min + parseInt( ( max - min ) / 2 );
		//  Find the magnitude of the range....
		var logVal = parseInt( Math.log10( range ) ); 
		var bestVal = null;
		var bestDRange = null;
		//  If a "preferred" values is specified, see how well it works.
		if ( preferred !== null ) {
			var dRange = parseInt( range / preferred );
			if ( dRange < max || dRange > min )
				bestVal = preferred;
		}
		//  If that didn't work, find a new value.
		if ( bestVal === null ) {
			//  The logVal gives us an idea how big this range is.  We know that it is between
			//  1/10 and 10 times 10 to the logVal power.  So, we try .1, .25, .5, 1, 2.5, and 5
			//  times this value to see what comes closest to "best".  We throw away things that
			//  are outside "min" and "max".
			var keep = [];
			for ( var i = 0; i < 12; ++i )
				keep[i] = true;
			var val = [];
			val[8] = Math.pow( 10.0, logVal );
			val[0] = .01 * val[8];
			val[1] = .02 * val[8];
			val[2] = .025 * val[8];
			val[3] = .05 * val[8];
			val[4] = .1 * val[8];
			val[5] = .2 * val[8];
			val[6] = .25 * val[8];
			val[7] = .5 * val[8];
			val[9] = 2 * val[8];
			val[10] = 2.5 * val[8];
			val[11] = 5.0 * val[8];
			var bestOrder = 0;
			for ( var i =0; i < 12; ++i ) {
				if ( allowFraction || ( i !== 2 && i !== 6 && i !== 10 ) ) {
					var dRange = parseInt( range / val[i] );
					if ( dRange < max || dRange > min ) {
						if ( bestVal === null || Math.abs( dRange - best ) < Math.abs( bestDRange - best ) ) {
							bestVal = val[i];
							switch ( i ) {
								case 0:
								case 1:
								case 3:
								case 6:
									bestOrder = 2 - logVal;
									break;
								case 2:
									bestOrder = 3 - logVal;
									break;
								case 4:
								case 5:
								case 7:
								case 10:
									bestOrder = 1 - logVal;
									break;
								case 8:
								case 9:
								case 11:
									bestOrder = -logVal;
									break;
							}
							bestDRange = dRange;
						}
					}
				}
			}
		}
		var ret = [];
		if ( bestVal === null ) {
			//  This is effectively a panic.  The algorithm broke down - send back the low value
			//  as the start and the range / best as the step.  Which will probably be garbage.
			ret[0] = low;
			ret[1] = range / best;
		}
		else {
			//  Eliminate some floating point errors (problem when converting these number to
			//  labels).
			//  Generate a start value that is certain to be inside the low/high range.
			ret[0] = ( parseInt( low / bestVal ) + 1 ) * bestVal;
			while ( ret[0] - low > bestVal )
				ret[0] = ret[0] - bestVal;
			ret[1] = bestVal;
		}
		ret[2] = bestOrder;
		return ret;
	};

	//  This is a "date specific" version of the above function.  It finds intervals between
	//  two Date values (start and end).  The Date values are assumed to be in milliseconds
	//  since 1970 (the number you get using the "getTime()" function of the Date class).  The
	//  values for min, max, best, and preferred are used the same way they are used in the
	//  "findSteps" function, although some adjustments are made in the case of months (either
	//  all or none of them are included).  A structure of arrays is returned, each array containing
	//  a list of millisecond time values - these can be stuffed back into a Date class instance
	//  to generate dates if necessary.  The arrays in the structure represent, in order, year positions,
	//  month positions, day positions, hour positions, minute positions, and second positions.
	//  The final array simply contains the digits of precision for seconds, if they are included.
	//  Any of the values can be null - either because there are none (start and end don't include
	//  a year, for instance) or because their step interval is too small to fit.
	//  This function is fairly careful not to put the same exact date in multiple lists.  That is,
	//  if January of a given year is in a year list, it will not be included in the month list.
	findDateSteps( min, max, best, start, end, preferred, included ) {
		var obj = {};
		obj.years = null;
		obj.months = null;
		obj.days = null;
		obj.hours = null;
		obj.minutes = null;
		obj.seconds = null;
		obj.precision = null;
		var usedList = [];
		//  See if min and max have been chosen.  If not, pick logical values.
		if ( min === undefined || min === null )
			min = 2;
		if ( max === undefined || max === null )
			max = 6;
		if ( preferred === undefined )
			preferred = null;
		if ( included === undefined || included === null )
			included = this.LABEL_ALL;
		//  Find the "best" value if it hasn't been chosen.
		if ( best === undefined || best === null )
			best = min + parseInt( ( max - min ) / 2 );
		//  Locate the years before and after the start and end.
		var yearAhead = 1970;
		var yearBehind = yearAhead + 1;
		var yDate = new Date( yearBehind, 0, 1 );
		while ( yDate.getTime() < start ) {
			yearAhead += 1;
			yearBehind += 1;
			yDate.setFullYear( yearBehind );
		}
		while ( yDate.getTime() <= end ) {
			yearBehind += 1;
			yDate.setFullYear( yearBehind );
		}
		// console.info( yearAhead + " to " + yearBehind + "\n" );
		// console.info( ( included & this.LABEL_YEARS ) + "   " + ( yearBehind - yearAhead > 1 ) + "\n" );
		var keepGoing = true;
		if ( ( included & this.LABEL_YEARS ) && ( yearBehind - yearAhead > 1 ) ) {
			//  Figure out which years to use.  We don't deal with year ranges beyond centuries, as
			//  some other method should be used to track the date for such time spans.
			var ret = this.findSteps( yearAhead + .001, yearBehind - .001, min, max, best, preferred, false );
			obj.years = [];
			for ( var val = ret[0];val < yearBehind; val = val + ret[1] ) {
				yDate.setFullYear( val );
				obj.years.push( yDate.getTime() );
				usedList.push( yDate.getTime() );
			}
			if ( obj.years.length > max )
				keepGoing = false;
		}
		//  Months
		if ( keepGoing ) {
			var monthAhead = 0;
			var monthBehind = monthAhead + 1;
			yDate.setFullYear( yearAhead );
			yDate.setMonth( monthBehind );
			while ( yDate.getTime() < start ) {
				monthAhead += 1;
				monthBehind += 1;
				yDate.setFullYear( yearAhead );
				yDate.setMonth( monthBehind );
			}
			while ( yDate.getTime() <= end ) {
				monthBehind += 1;
				yDate.setFullYear( yearAhead );
				yDate.setMonth( monthBehind );
			}
			if ( ( included & this.LABEL_MONTHS ) && ( monthBehind - monthAhead > 1 ) ) {
				var ret = this.findSteps( monthAhead + .001, monthBehind - .001, 2 * min, 2 * max, 2 * best, preferred, false );
				if ( ret[1] < 2 && ret[1] > 0 ) {
					obj.months = [];
					for ( var val = ret[0]; val < monthBehind; val = val + 1 ) {  //  Use ALL months
						yDate.setFullYear( yearAhead );
						yDate.setMonth( val );
						var newVal = yDate.getTime();
						if ( usedList.indexOf( newVal ) === -1 ) {
							obj.months.push( newVal );
							usedList.push( newVal );
						}
					}
					if ( obj.months.length > max )
						keepGoing = false;
				}
			}
		}
		//  Days
		if ( keepGoing ) {
			var dayAhead = 1;
			var dayBehind = dayAhead + 1;
			yDate.setFullYear( yearAhead );
			yDate.setMonth( monthAhead );
			yDate.setDate( dayBehind );
			while ( yDate.getTime() < start ) {
				dayAhead += 1;
				dayBehind += 1;
				yDate.setFullYear( yearAhead );
				yDate.setMonth( monthAhead );
				yDate.setDate( dayBehind );
			}
			while ( yDate.getTime() <= end ) {
				dayBehind += 1;
				yDate.setFullYear( yearAhead );
				yDate.setMonth( monthAhead );
				yDate.setDate( dayBehind );
			}
			if ( ( included & this.LABEL_DAYS ) && ( dayBehind - dayAhead > 1 ) && ( dayBehind - dayAhead < 30 ) ) {
				var ret = this.findSteps( dayAhead + .001, dayBehind - .001, 2 * min, 2 * max, 2 * best, preferred, false );
				obj.days = [];
				for ( var val = ret[0]; val < dayBehind; val = val + ret[1] ) {
					yDate.setFullYear( yearAhead );
					yDate.setMonth( monthAhead );
					yDate.setDate( val );
					var newVal = yDate.getTime();
					if ( usedList.indexOf( newVal ) === -1 ) {
						obj.days.push( newVal );
						usedList.push( newVal );
					}
			}
				if ( obj.days.length > max )
					keepGoing = false;
			}
		}
		return obj;
	};

	//  Create a date label from a millisecond (since 1970) value.
	generateDateText( ins, val, format, args ) {
		var tComp = this.nextText();
		tComp.setText( this.formatDate( ins, val, format, args ) );
		return tComp;
	}

	//  Create a text string from a millisecond (since 1970) value using the given
	//  format.
	formatDate( ins, val, format, args ) {
		var fDD = new Date( val );
		switch ( format ) {
			case "YYYY":
			case "yyyy":
				return fDD.getUTCFullYear();
				break;
			case "Mon":
				switch ( fDD.getMonth() ) {
					case 0:
						return "Jan";
						break;
					case 1:
						return "Feb";
						break;
					case 2:
						return "Mar";
						break;
					case 3:
						return "Apr";
						break;
					case 4:
						return "May";
						break;
					case 5:
						return "Jun";
						break;
					case 6:
						return "Jul";
						break;
					case 7:
						return "Aug";
						break;
					case 8:
						return "Sep";
						break;
					case 9:
						return "Oct";
						break;
					case 10:
						return "Nov";
						break;
					case 11:
						return "Dec";
						break;
				}
				break;
			case "Mon, YYYY":
				return this.formatDate( ins, val, "Mon", args ) + ", " + this.formatDate( ins, val, "YYYY", args );
				break;
			case "Mon D, YYYY":
				return this.formatDate( ins, val, "Mon", args ) + " " + fDD.getDate() + ", " + this.formatDate( ins, val, "YYYY", args );
				break;
			case "D":
				return fDD.getDate();
				break;
		}
		return format;
	}

	//  Create a new data item with the given data.
	generateDataItem( data ) {
		//  Generate a unique item pointer.
		this.itemPtr = this.itemPtr + 1;
		//  Generate the item itself.
		var newItem = {};
		newItem.key = this.itemPtr;
		newItem.dontDraw = false;
		newItem.data = data;
		newItem.next = null;
		return newItem;
	};

	//---------------------------------
	//  Generate a "ITEM_LIST" item using the existing data.  This can be appended to (see the
	//  appendDataList function).
	//------
	generateItemList() {
		return [this.ITEM_LIST, []];
	}

	//---------------------------------
	//  Add data to a "ITEM_LIST" which should already exist.  The index of the item is returned.
	//------
	appendItemList( listItem, data ) {
		listItem[1].push( this.generateDataItem( data ) );
		return listItem[1].length - 1;
	}

	//  Generic append function.  Based on the value of "toList" the item will be appended to one
	//  of the three lists.  The value of "insertIt", which might not be present, can be used to
	//  indicate that the item should be inserted at the beginning of the list.
	appendItem( toList, data, insertIt ) {
		if ( insertIt !== undefined && insertIt ) {
			if ( toList === this.DATA_ITEM )
				return this.insertDataItem( data );
			else if ( toList === this.GRID_ITEM )
				return this.insertGridItem( data );
			else if ( toList === this.LABEL_ITEM )
				return this.insertLabelItem( data );
		}
		if ( toList === this.DATA_ITEM )
			return this.appendDataItem( data );
		else if ( toList === this.GRID_ITEM )
			return this.appendGridItem( data );
		else if ( toList === this.LABEL_ITEM )
			return this.appendLabelItem( data );
	}

	//  Add a data item to the end of the linked list of items.  Return the unique key to
	//  the new item.
	appendDataItem( data ) {
		//  Add a new item to the end of the list, or make it the beginning if the list is empty.
		if ( this.dataItems === null ) {
			this.dataItems = this.generateDataItem( data );
			this.lastItem = this.dataItems;
			return this.dataItems.key;
		}
		else {
			this.lastItem.next = this.generateDataItem( data );
			this.lastItem = this.lastItem.next;
			return this.lastItem.key;
		}
	};

	//  Add a data item after the item given by the itemPtr key.  Return null if the key
	//  was not found (no add will have been done), or the key to the new item.
	addDataItem( data, key ) {
		//  Find the key first.
		var thisItem = this.dataItems;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {
				var tmp = thisItem.next;
				thisItem.next = this.generateDataItem( data );
				thisItem.next.next = tmp;
				if ( this.lastItem === thisItem )
					this.lastItem = thisItem.next;
				return thisItem.next.key;
			}
			thisItem = thisItem.next;
		}
		return null;
	};

	//  Insert a data item before the item given by the itemPtr key.  Return null if the
	//  key was not found (no insert will have been done) or the key to the new item.
	//  Special case: if you don't define the key, or define it as null, the item is
	//  inserted at the start of the list.
	insertDataItem( data, key ) {
		if ( key === undefined || key === null ) {
			var firstItem = this.dataItems;
			this.dataItems = this.generateDataItem( data );
			this.dataItems.next = firstItem;
			if ( this.lastItem === null )
				this.lastItem = this.dataItems;
			return this.dataItems.key;
		}
		//  Find the key first.
		var thisItem = this.dataItems;
		var lastItem = null;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {
				if ( lastItem === null ) {
					//  Start of the list!
					this.dataItems = this.generateDataItem( data );
					this.dataItems.next = thisItem;
					return this.dataItems.key;
				}
				lastItem.next = this.generateDataItem( data );
				lastItem.next.next = thisItem;
				return lastItem.next.key;
			}
			lastItem = thisItem;
			thisItem = thisItem.next;
		}
		return null;
	};

	//  Delete the item indicated by the key.  Return true if this is successful, false
	//  if not.
	deleteDataItem( key ) {
		//  Find the key first.
		var thisItem = this.dataItems;
		var lastItem = null;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {
				if ( lastItem === null ) {
					this.dataItems = thisItem.next;
					if ( this.dataItems === null )
						this.lastItem = null;
				}
				else {
					lastItem.next = thisItem.next;
					//  In case we are trimming the last item in the list.
					if ( lastItem.next === null )
						this.lastItem = lastItem;
				}
				return true;
			}
			lastItem = thisItem;
			thisItem = thisItem.next;
		}
		return false;
	};

	//  Return the data item specified by the key.  Returns null if not found.
	findDataItem( key ) {
		var thisItem = this.dataItems;
		while ( thisItem !== null ) {
			if ( thisItem.key === key )
				return thisItem;
			thisItem = thisItem.next;
		}
		return null;
	}

	//  Remove all data items in the data item list.
	clearDataItems() {
		var thisItem = this.dataItems;
		var killItem = null;
		while ( thisItem != null ) {
			killItem = thisItem;
			thisItem = thisItem.next;
			killItem.next = null;
		}
		this.lastItem = null;
		this.dataItems = null;
	};

	//  These are an identical function set for the grid items.
	appendGridItem( data ) {
		//  Add a new item to the end of the list, or make it the beginning if the list is empty.
		if ( this.gridItems === null ) {
			this.gridItems = this.generateDataItem( data );
			this.lastGridItem = this.gridItems;
			return this.gridItems.key;
		}
		else {
			this.lastGridItem.next = this.generateDataItem( data );
			this.lastGridItem = this.lastGridItem.next;
			return this.lastGridItem.key;
		}
	};

	addGridItem( data, key ) {
		//  Find the key first.
		var thisItem = this.gridItems;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {
				var tmp = thisItem.next;
				thisItem.next = this.generateDataItem( data );
				thisItem.next.next = tmp;
				if ( this.lastGridItem === thisItem )
					this.lastGridItem = thisItem.next;
				return thisItem.next.key;
			}
			thisItem = thisItem.next;
		}
		return null;
	};
		
	insertGridItem( data, key ) {
		if ( key === undefined || key === null ) {
			var firstItem = this.gridItems;
			this.gridItems = this.generateDataItem( data );
			this.gridItems.next = firstItem;
			if ( this.lastItem === null )
				this.lastItem = this.gridItems;
			return this.gridItems.key;
		}
		//  Find the key first.
		var thisItem = this.gridItems;
		var lastGridItem = null;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {
				if ( lastGridItem === null ) {
					//  Start of the list!
					this.gridItems = this.generateDataItem( data );
					this.gridItems.next = thisItem;
					return this.gridItems.key;
				}
				lastGridItem.next = this.generateDataItem( data );
				lastGridItem.next.next = thisItem;
				return lastGridItem.next.key;
			}
			lastGridItem = thisItem;
			thisItem = thisItem.next;
		}
		return null;
	};

	deleteGridItem( key ) {
		//  Find the key first.
		var thisItem = this.gridItems;
		var lastGridItem = null;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {			
				if ( lastGridItem === null ) {
					this.gridItems = thisItem.next;
					if ( this.gridItems === null )
						this.lastGridItem = null;
				}
				else {
					lastGridItem.next = thisItem.next;
					//  In case we are trimming the last item in the list.
					if ( lastGridItem.next === null )
						this.lastGridItem = lastGridItem;
				}
				return true;
			}
			lastGridItem = thisItem;
			thisItem = thisItem.next;
		}
		return false;
	};

	//  Return the grid item specified by the key.  Returns null if not found.
	findGridItem( key ) {
		var thisItem = this.gridItems;
		while ( thisItem !== null ) {
			if ( thisItem.key === key )
				return thisItem;
			thisItem = thisItem.next;
		}
		return null;
	}

	//  Remove all grid items in the grid item list.
	clearGridItems() {
		var thisItem = this.gridItems;
		var killItem = null;
		while ( thisItem != null ) {
			killItem = thisItem;
			thisItem = thisItem.next;
			killItem.next = null;
		}
		this.lastGridItem = null;
		this.gridItems = null;
	};

	//  These are for the label items.
	appendLabelItem( data ) {
		//  Add a new item to the end of the list, or make it the beginning if the list is empty.
		if ( this.labelItems === null ) {
			this.labelItems = this.generateDataItem( data );
			this.lastLabelItem = this.labelItems;
			return this.labelItems.key;
		}
		else {
			this.lastLabelItem.next = this.generateDataItem( data );
			this.lastLabelItem = this.lastLabelItem.next;
			return this.lastLabelItem.key;
		}
	};

	addLabelItem( data, key ) {
		//  Find the key first.
		var thisItem = this.labelItems;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {
				var tmp = thisItem.next;
				thisItem.next = this.generateDataItem( data );
				thisItem.next.next = tmp;
				if ( this.lastLabelItem === thisItem )
					this.lastLabelItem = thisItem.next;
				return thisItem.next.key;
			}
			thisItem = thisItem.next;
		}
		return null;
	};
		
	insertLabelItem( data, key ) {
		if ( key === undefined || key === null ) {
			var firstItem = this.labelItems;
			this.labelItems = this.generateDataItem( data );
			this.labelItems.next = firstItem;
			if ( this.lastItem === null )
				this.lastItem = this.labelItems;
			return this.labelItems.key;
		}
		//  Find the key first.
		var thisItem = this.labelItems;
		var lastLabelItem = null;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {
				if ( lastLabelItem === null ) {
					//  Start of the list!
					this.labelItems = this.generateDataItem( data );
					this.labelItems.next = thisItem;
					return this.labelItems.key;
				}
				lastLabelItem.next = this.generateDataItem( data );
				lastLabelItem.next.next = thisItem;
				return lastLabelItem.next.key;
			}
			lastLabelItem = thisItem;
			thisItem = thisItem.next;
		}
		return null;
	};

	deleteLabelItem( key ) {
		//  Find the key first.
		var thisItem = this.labelItems;
		var lastLabelItem = null;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {			
				if ( lastLabelItem === null ) {
					this.labelItems = thisItem.next;
					if ( this.labelItems === null )
						this.lastLabelItem = null;
				}
				else {
					lastLabelItem.next = thisItem.next;
					//  In case we are trimming the last item in the list.
					if ( lastLabelItem.next === null )
						this.lastLabelItem = lastLabelItem;
				}
				return true;
			}
			lastLabelItem = thisItem;
			thisItem = thisItem.next;
		}
		return false;
	};

	//  Return the label item specified by the key.  Returns null if not found.
	findLabelItem( key ) {
		var thisItem = this.labelItems;
		while ( thisItem !== null ) {
			if ( thisItem.key === key )
				return thisItem;
			thisItem = thisItem.next;
		}
		return null;
	}

	//  Remove all data items in the data item list.
	clearLabelItems() {
		var thisItem = this.labelItems;
		var killItem = null;
		while ( thisItem != null ) {
			killItem = thisItem;
			thisItem = thisItem.next;
			killItem.next = null;
		}
		this.lastLabelItem = null;
		this.labelItems = null;
	};

	//---------------------------------
	//  Bunch of functions for moving items around.  Returns true if they did something, false
	//  if not.
	//------
	moveLabelItemEarlier( key ) {
		var thisItem = this.labelItems;
		var lastItem = null;
		var lastLastItem = null;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {
				if ( thisItem !== this.labelItems ) {
					if ( this.lastLabelItem === thisItem ) {
						this.lastLabelItem = lastItem;
						lastItem.next = null;
					}
					else
						lastItem.next = thisItem.next;
					thisItem.next = lastItem;
					if ( this.labelItems === lastItem ) 
						this.labelItems = thisItem;
					else
						lastLastItem.next = thisItem;
					return true;
				}
			}
			if ( lastItem !== null )
				lastLastItem = lastItem;
			lastItem = thisItem;
			thisItem = thisItem.next;
		}
		return false;			
	}

	moveLabelItemLater( key ) {
		var thisItem = this.labelItems;
		var lastItem = null;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {
				if ( thisItem.next !== null ) {
					if ( this.labelItems === thisItem )
						this.labelItems = thisItem.next;
					if ( this.lastLabelItem === thisItem.next )
						this.lastLabelItem = thisItem;
					if ( lastItem !== null )
						lastItem.next = thisItem.next;
					lastItem = thisItem.next;
					thisItem.next = thisItem.next.next;
					lastItem.next = thisItem;
					return true;
				}
			}
			lastItem = thisItem;
			thisItem = thisItem.next;
		}
		return false;			
	}

	moveLabelItemFirst( key ) {
		var thisItem = this.labelItems;
		var lastItem = null;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {
				if ( thisItem !== this.labelItems ) {
					if ( this.lastLabelItem === thisItem ) {
						this.lastLabelItem = lastItem;
						lastItem.next = null;
					}
					else
						lastItem.next = thisItem.next;
					thisItem.next = this.labelItems;
					this.labelItems = thisItem;
					return true;
				}
			}
			lastItem = thisItem;
			thisItem = thisItem.next;
		}
		return false;			
	}

	moveLabelItemLast( key ) {
		var thisItem = this.labelItems;
		var lastItem = null;
		while ( thisItem !== null ) {
			if ( thisItem.key === key ) {
				if ( thisItem.next !== null ) {
					if ( this.labelItems === thisItem )
						this.labelItems = thisItem.next;
					if ( lastItem !== null )
						lastItem.next = thisItem.next;
					lastItem = thisItem.next;
					thisItem.next = null;
					this.lastLabelItem.next = thisItem;
					this.lastLabelItem = thisItem;
					return true;
				}
			}
			lastItem = thisItem;
			thisItem = thisItem.next;
		}
		return false;			
	}

	//---------------------------------
	//  Make this item a "temporarily" undrawn item by changing its type.  The true type of
	//  the item is saved so that it can be "shown" later.  This function can be called
	//  multiple times on an already-hidden item witout harm.
	//------
	hideDataItem( thisItem ) {
		if ( thisItem.data !== undefined && thisItem.data !== null ) {
			if ( thisItem.data[0] !== this.NON_DRAWING_ITEM ) {
				thisItem.dontDraw = thisItem.data[0];
				thisItem.data[0] = this.NON_DRAWING_ITEM;
			}
		}
	}

	//---------------------------------
	//  Companion function to hideDataItem() that works with labels.
	//------
	hideLabelItem( key ) {
		this.hideDataItem( this.findLabelItem( key ) );
	}

	//---------------------------------
	//  Change a hidden item back to its original type.  This function can be called
	//  multiple times on an already-shown item witout harm.
	//------
	showDataItem( thisItem ) {
		if ( thisItem.data !== undefined && thisItem.data !== null ) {
			thisItem.data[0] = thisItem.dontDraw;
		}
	}

	//---------------------------------
	//  Companion function to showDataItem() that works with labels.
	//------
	showLabelItem( key ) {
		this.showDataItem( this.findLabelItem( key ) );
	}

	//  This function examines all of the data items this class knows about.  Inheriting
	//  classes should have a function that overrides this one, but CALLS it for data items
	//  that it doesn't recognize.
	drawDataItem( ins, thisItem ) {
		// if ( thisItem.dontDraw )
		// 	return;
		switch( thisItem.data[0] ) {
			case this.ITEM_LIST:
				//  List of items, all to be drawn.  This was introduced to allow groups of
				//  items to be hidden or shown, but maybe there are other good reasons to 
				//  do this.
				for ( var i = 0; i < thisItem.data[1].length; ++i )
					this.drawDataItem( ins, thisItem.data[1][i] );
				break;
			case this.SET_FILL_COLOR:
				this.setFillCount( thisItem.data[1] );
				break;
			case this.SET_STROKE_COLOR:
				this.setStrokeCount( thisItem.data[1] );
				break;
			case this.SET_SYMBOL:
				this.setSymbolCount( thisItem.data[1] );
				break;
		}
	};

	//  Generic "find item" function that can find an item in the specified list.
	findListedItem( key, fromList ) {
		switch ( fromList ) {
			case this.LABEL_ITEM:
				return this.findLabelItem( key );
				break;
			case this.GRID_ITEM:
				return this.findGridItem( key );
				break;
			case this.DATA_ITEM:
			default:
				return this.findDataItem( key );
				break;
		}
		return null;
	}

	//  These are functions meant to be called by the "user" to set up draw items whereby
	//  the colors are set to specific things.
	setFillCounter( val ) {
		this.appendDataItem( [ this.SET_FILL_COLOR, val ] );
	};
	setStrokeCounter( val ) {
		this.appendDataItem( [ this.SET_STROKE_COLOR, val ] );
	};
	setSymbolCounter( val ) {
		this.appendDataItem( [ this.SET_SYMBOL, val ] );
	};

	//  Set the "stroke paint cycle".  This is an array of paint specifications that will
	//  be cycled through by the "findStrokePaint()" function when the user does not
	//  specify paint.  The specification should be an array.  Whenever this function is
	//  called the "cycle counter" is set to 0.  This is not only required because we don't
	//  know how long the array might be, but it is probably also what the user expects.
	setStrokeCycle( spec ) {
		this.strokeCycle = spec;
		this.strokeCycleCount = 0;
	};

	//  Same function for the "fill paint cycle".
	setFillCycle( spec ) {
		this.fillCycle = spec;
		this.fillCycleCount = 0;
	};

	//  Set the counter to the different cycles to a specific number (if no number is
	//  included the counter is set to 0).
	setStrokeCount( val ) {
		if ( val === undefined || val === null )
			this.strokeCycleCount = 0;
		else
			this.strokeCycleCount = val;
	};
	setFillCount( val ) {
		if ( val === undefined || val === null )
			this.fillCycleCount = 0;
		else
			this.fillCycleCount = val;
	};
	setSymbolCount( val ) {
		if ( val === undefined || val === null )
			this.symbolCycleCount = 0;
		else
			this.symbolCycleCount = val;
	};

	//  Set a specific "draw list" for any of the categories.  This gives a list of the
	//  keys pointing to draw items that should be drawn - they will be drawn in order.
	//  Set this to null to draw everything, or use the "drawAll" functions below.
	setGridDrawList( newVal ) {
		this.gridDrawList = newVal;
	}
	setGridDrawAll() {
		this.gridDrawList = null;
	}
	setDataDrawList( newVal ) {
		this.dataDrawList = newVal;
	}
	setDataDrawAll() {
		this.dataDrawList = null;
	}
	setLabelDrawList( newVal ) {
		this.labelDrawList = newVal;
	}
	setLabelDrawAll() {
		this.labelDrawList = null;
	}

	//  Cause the "cycles" to be initialize to zero.  This makes sure that each time we
	//  redraw the plot, we begin the cycles in the same place.  Otherwise they might 
	//  change as we redraw (through resizing or whatever).  
	predraw( ins ) {
		this.strokeCycleCount = 0;
		this.fillCycleCount = 0;
		this.symbolCycleCount = 0;
		//  We use a shared list of text components called the "label pool" to draw
		//  labels.  This will cause us to start at the beginning.
		this.labelPoolCount = 0;
		//  Also, if we have a "resizeBox", make sure it is the same size as the frame of
		//  this plot.
		if ( this.resizeBox !== null ) {
			this.resizeClipBox.resize( this.getParent().drawX, this.getParent().drawY, 
				this.getParent().drawW, this.getParent().drawH );
			var newX = this.drawX - this.getParent().drawX;
			var newY = this.drawY - this.getParent().drawH;
			if ( newX < 1 )
				newX = newX - this.getParent().drawW;
			if ( newY < 1 )
				newY = newY - this.getParent().drawY;
			this.resizeBox.resize( newX, newY, this.drawW, this.drawH );
		}
	};

	//  This is where we draw the plotting data.  Some effort has been made to do as much
	//  computation in advance as possible so that this function is as fast as possible.
	draw( ins ) {
		this.drawX2 = this.drawX + this.drawW;
		this.drawY2 = this.drawY + this.drawH;
		//  Clear hotpoints.  These are used (by the base class, and this one) to cause
		//  things to happen when mice move near/over or do things to positions.
		this.clearMoveHotPoints();
		this.clearClickHotPoints();
		this.clearHoverHotPoints();
		//  Before drawing the data apply a clipping region to it if desired (this is
		//  the default behavior).
		if ( this.clipData !== false && this.clipData !== null ) {
			ins.ctx.save();
			//  The clipping may be to a region specified by a complex clipping path.  Or
			//  the setting may simply be "true" which tells us to clip to the rectangular
			//  component area.
			if ( this.clipData === true ) {
				ins.ctx.beginPath();
				//ins.ctx.rect( this.drawX + 1, this.drawY + 1, this.drawW - 2, this.drawH - 2 );
				ins.ctx.rect( this.drawX, this.drawY, this.drawW, this.drawH );
				ins.ctx.clip();
			}
		}
		//  Draw the list of "grid" items.
		if ( this.gridDrawList === null ) {
			var thisItem = this.gridItems;
			while ( thisItem !== null ) {
				this.drawDataItem( ins, thisItem );
				thisItem = thisItem.next;
			}
		}
		else {
			//  Draw a specified set of items.
			for ( var i = 0; i < this.gridDrawList.length; ++i ) {
				var key = this.gridDrawList[i];
				var thisItem = this.gridItems;
				while ( thisItem !== null ) {
					if ( key === thisItem.key ) {
						this.drawDataItem( ins, thisItem );
						thisItem = null;
					}
					else
						thisItem = thisItem.next;
				}
			}
		}
		//  Draw the list of data items.
		if ( this.dataDrawList === null ) {
			var thisItem = this.dataItems;
			while ( thisItem !== null ) {
				this.drawDataItem( ins, thisItem );
				thisItem = thisItem.next;
			}
		}
		else {
			//  Draw a specified set of items.
			for ( var i = 0; i < this.dataDrawList.length; ++i ) {
				var key = this.dataDrawList[i];
				var thisItem = this.dataItems;
				while ( thisItem !== null ) {
					if ( key === thisItem.key ) {
						this.drawDataItem( ins, thisItem );
						thisItem = null;
					}
					else
						thisItem = thisItem.next;
				}
			}
		}
		//  Run a "restore" if we applied clipping before the data.
		if ( this.clipData !== false && this.clipData !== null )
			ins.ctx.restore();
		//  Draw the list of "label" items.  These are outside of any clipping instructions.
		//  However, there is no difference between a "data" item and a "label" item - both
		//  are drawn by the same function.
		if ( this.labelDrawList === null ) {
			var thisItem = this.labelItems;
			while ( thisItem !== null ) {
				this.drawDataItem( ins, thisItem );
				thisItem = thisItem.next;
			}
		}
		else {
			//  Draw a specified set of items.
			for ( var i = 0; i < this.labelDrawList.length; ++i ) {
				var key = this.labelDrawList[i];
				var thisItem = this.labelItems;
				while ( thisItem !== null ) {
					if ( key === thisItem.key ) {
						this.drawDataItem( ins, thisItem );
						thisItem = null;
					}
					else
						thisItem = thisItem.next;
				}
			}
		}
	};

	//  Figure out a "stroke" paint specification from a given specification.  If the specification
	//  is null, see if we have a "paint cycle" that is to be applied to stroke paint.  If
	//  so, find the next paint in the cycle and increment the cycle.  If the specification
	//  is not null, simply return that.
	findStrokePaint( spec ) {
		if ( spec === null ) {
			if ( this.strokeCycle !== null ) {
				var ret = this.strokeCycle[this.strokeCycleCount];
				this.strokeCycleCount = this.strokeCycleCount + 1;
				if ( this.strokeCycleCount === this.strokeCycle.length )
					this.strokeCycleCount = 0;
				return ret;
			}
			return null;
		}
		return spec;
	};

	//  Same function for fill paint.
	findFillPaint( spec ) {
		if ( spec === null ) {
			if ( this.fillCycle !== null ) {
				var ret = this.fillCycle[this.fillCycleCount];
				this.fillCycleCount = this.fillCycleCount + 1;
				if ( this.fillCycleCount === this.fillCycle.length )
					this.fillCycleCount = 0;
				return ret;
			}
			return null;
		}
		return spec;
	};

	//                                                                                                     
	//       ___                                    ____                            ___                ___ 
	//       `MM                                   6MMMMb\                           MM                `MM 
	//        MM                                  6M'    `                           MM                 MM 
	//    ____MM ___  __    ___  ____    _    ___ MM     ____    ___ ___  __    __   MM____     _____   MM 
	//   6MMMMMM `MM 6MM  6MMMMb `MM(   ,M.   )M' YM.    `MM(    )M' `MM 6MMb  6MMb  MMMMMMb   6MMMMMb  MM 
	//  6M'  `MM  MM69 " 8M'  `Mb `Mb   dMb   d'   YMMMMb `Mb    d'   MM69 `MM69 `Mb MM'  `Mb 6M'   `Mb MM 
	//  MM    MM  MM'        ,oMM  YM. ,PYM. ,P        `Mb YM.  ,P    MM'   MM'   MM MM    MM MM     MM MM 
	//  MM    MM  MM     ,6MM9'MM  `Mb d'`Mb d'         MM  MM  M     MM    MM    MM MM    MM MM     MM MM 
	//  MM    MM  MM     MM'   MM   YM,P  YM,P          MM  `Mbd'     MM    MM    MM MM    MM MM     MM MM 
	//  YM.  ,MM  MM     MM.  ,MM   `MM'  `MM'    L    ,M9   YMP      MM    MM    MM MM.  ,M9 YM.   ,M9 MM 
	//   YMMMMMM__MM_    `YMMM9'Yb.  YP    YP     MYMMMM9     M      _MM_  _MM_  _MM_MYMMMM9   YMMMMM9 _MM_
	//                                                       d'                                            
	//                                                   (8),P                                             
	//                                                    YMM                                              
	//
	//  Draw a symbol centered on pixel position x,y.  The symbol may be a complex
	//  component, a simple string, or it may be null.  If the symbol is null a default symbol
	//  will be used.  Default symbols are either some crappy pre-set stuff, or they can be
	//  predefined by the user using "setSymbolCycle()".  Which point is used is determined
	//  by the "symbolCycleCount" variable.  A string can also be used to specify one of the
	//  crappy pre-defined symbols.  
	//
	//  Any symbol can be specified as an array.  The symbol specification is always the
	//  first item in the array.  The second is a scale factor.  This was originally meant
	//  to apply to the default (crappy) symbols, which are nominally 10x10 pixels in
	//  size.  The scale is a simple multiplier.
	drawSymbol( ins, x, y, symbol, sPaint, fPaint ) {
		var trueSymbol = symbol;
		var symbolScale = 1.0;
		//  Is this symbol specification an array?  If so, it contains a symbol specification AND a scale.
		if ( symbol !== undefined && symbol !== null && symbol.length !== undefined ) {
			trueSymbol = symbol[0];
			symbolScale = symbol[1];
		}
		//  Avoid a few repetitive calculations...
		var sym5 = 5 * symbolScale;
		var sym10 = 10 * symbolScale;
		var symTri = this.triHgt * symbolScale;
		//  Draw the symbol as specified.  It could be a component, one of the pre-defined
		//  symbols, or it could be null or undefined, in which case we get a default symbol.
		if ( trueSymbol === undefined || trueSymbol === null || trueSymbol === this.SYMBOL_CROSS ) {
			ins.ctx.beginPath();
			ins.ctx.moveTo( x, y - sym5 );
			ins.ctx.lineTo( x, y + sym5 );
			ins.ctx.stroke();
			ins.ctx.beginPath();
			ins.ctx.moveTo( x - sym5, y );
			ins.ctx.lineTo( x + sym5, y );
			ins.ctx.stroke();
		}
		//  See if the symbol is a component, in which case we just draw it.  The following is a test
		//  to see if it is a component (I don't care about the paint, honestly, but all components
		//  have a paint member).
		else if ( trueSymbol.strokePaint !== undefined ) {
			//  Apply the scale.
			//  Then draw the component.
		}
		//  Otherwise check our known components.
		else {
			switch ( trueSymbol ) {
				case this.SYMBOL_SQUARE:
					// ins.ctx.beginPath();
					// ins.ctx.moveTo( x - sym5, y - sym5 );
					// ins.ctx.lineTo( x - sym5, y + sym5 );
					// ins.ctx.lineTo( x + sym5, y + sym5 );
					// ins.ctx.lineTo( x + sym5, y - sym5 );
					// ins.ctx.closePath();
					// ins.ctx.stroke();
					ins.ctx.strokeRect( x - sym5, y - sym5, sym10, sym10 );
					break;
				case this.SYMBOL_FILLED_SQUARE:
					// ins.ctx.beginPath();
					// ins.ctx.moveTo( x - sym5, y - sym5 );
					// ins.ctx.lineTo( x - sym5, y + sym5 );
					// ins.ctx.lineTo( x + sym5, y + sym5 );
					// ins.ctx.lineTo( x + sym5, y - sym5 );
					// ins.ctx.closePath();
					// ins.ctx.fill();
					// ins.ctx.stroke();
					ins.ctx.fillRect( x - sym5, y - sym5, sym10, sym10 );
				break;
				case this.SYMBOL_INVERTED_TRIANGLE:
					ins.ctx.beginPath();
					ins.ctx.moveTo( x - sym5, y - symTri );
					ins.ctx.lineTo( x, y + symTri );
					ins.ctx.lineTo( x + sym5, y - symTri );
					ins.ctx.closePath();
					ins.ctx.stroke();
					break;
				case this.SYMBOL_FILLED_INVERTED_TRIANGLE:
					ins.ctx.beginPath();
					ins.ctx.moveTo( x - sym5, y - symTri );
					ins.ctx.lineTo( x, y + symTri );
					ins.ctx.lineTo( x + sym5, y - symTri );
					ins.ctx.closePath();
					ins.ctx.fill();
					ins.ctx.stroke();
					break;
				case this.SYMBOL_TRIANGLE:
					ins.ctx.beginPath();
					ins.ctx.moveTo( x - sym5, y + symTri );
					ins.ctx.lineTo( x, y - symTri );
					ins.ctx.lineTo( x + sym5, y + symTri );
					ins.ctx.closePath();
					ins.ctx.stroke();
					break;
				case this.SYMBOL_FILLED_TRIANGLE:
					ins.ctx.beginPath();
					ins.ctx.moveTo( x - sym5, y + symTri );
					ins.ctx.lineTo( x, y - symTri );
					ins.ctx.lineTo( x + sym5, y + symTri );
					ins.ctx.closePath();
					ins.ctx.fill();
					ins.ctx.stroke();
				break;
				case this.SYMBOL_CIRCLE:
					ins.ctx.beginPath();
					ins.ctx.arc( x, y, sym5, 0, 2 * Math.PI );
					ins.ctx.stroke();
					break;
				case this.SYMBOL_FILLED_CIRCLE:
					ins.ctx.beginPath();
					ins.ctx.arc( x, y, sym5, 0, 2 * Math.PI );
					ins.ctx.fill();
					ins.ctx.stroke();
					break;
				case this.SYMBOL_DIAMOND:
					ins.ctx.beginPath();
					ins.ctx.moveTo( x - this.diHgt * symbolScale, y );
					ins.ctx.lineTo( x, y + this.diHgt * symbolScale );
					ins.ctx.lineTo( x + this.diHgt * symbolScale, y );
					ins.ctx.lineTo( x, y - this.diHgt * symbolScale );
					ins.ctx.closePath();
					ins.ctx.stroke();
					break;
				case this.SYMBOL_FILLED_DIAMOND:
					ins.ctx.beginPath();
					ins.ctx.moveTo( x - this.diHgt * symbolScale, y );
					ins.ctx.lineTo( x, y + this.diHgt * symbolScale );
					ins.ctx.lineTo( x + this.diHgt * symbolScale, y );
					ins.ctx.lineTo( x, y - this.diHgt * symbolScale );
					ins.ctx.closePath();
					ins.ctx.fill();
					ins.ctx.stroke();
					break;
				case this.SYMBOL_CROSS:
				default:
					ins.ctx.beginPath();
					ins.ctx.moveTo( x, y - sym5 );
					ins.ctx.lineTo( x, y + sym5 );
					ins.ctx.stroke();
					ins.ctx.beginPath();
					ins.ctx.moveTo( x - sym5, y );
					ins.ctx.lineTo( x + sym5, y );
					ins.ctx.stroke();
					break;
			}
		}
	}

	//  Draw a straight line between the two data points.  


	//  This is used in a number of plotting classes - finds the minimumu and maximum
	//  of an array of numbers.  Don't feed it anything other than numbers - no checks
	//  are made!  The one cute aspect to this is that the value can be a single number,
	//  not an array (in which case the return is trivial).
	findLimits( arr ) {
		//  Watch for a single value...
		if ( !Array.isArray( arr ) )
			return [arr,arr];
		var len = arr.length;
		var min = arr[0];
		var max = arr[0];
		while (len--) {
			if (arr[len] < min) {
				min = arr[len];
			}
			if (arr[len] > max) {
				max = arr[len];
			}
		}
		return [min,max];
	}

}

class XYPlot extends BasePlot {
	
	constructor( x, y, w, h, label ) {
		super( x, y, w, h, label );
		//  These defaults are reset by the following functions...but I hate to not have
		//  values here.
		this.originalXmin = 0.0;
		this.originalXmax = 1.0;
		this.originalYmin = 0.0;
		this.originalYmax = 1.0;
		this.setXLimits( 0.0, 1.0 );
		this.setYLimits( 0.0, 1.0 );
		this.xType = LINEAR;
		this.yType = LINEAR;
		this.setXLogBase( 10.0 );
		this.setYLogBase( 10.0 );
		this.ticSize = 5;
		//  The zoom in/out limits keep the user from going beyond scale factors of the
		//  original plot limits.  By default you can never zoom out more than the original
		//  limits.
		this.xZoomOutLimit = 1.0;
		this.yZoomOutLimit = 1.0;
		//  But there is no limit to how far you can zoom in.
		this.xZoomInLimit = null;
		this.yZoomInLimit = null;
		//  These are plotting "instructions", used to build an instruction list.  The
		//  BasePlot class has some instructions that are common to all plots (thus the
		//  "BASE_MAX" offset value).
		this.CLEAR_SUM                = this.BASE_MAX + 0;
		this.CURVE                    = this.BASE_MAX + 2;
		this.SUM_CURVE                = this.BASE_MAX + 3;
		this.POINTS                   = this.BASE_MAX + 4;
		this.SUM_POINTS               = this.BASE_MAX + 5;
		this.XGRID_LINE               = this.BASE_MAX + 6;
		this.XGRID                    = this.BASE_MAX + 7;
		this.YGRID_LINE               = this.BASE_MAX + 8;
		this.YGRID                    = this.BASE_MAX + 9;
		this.XTIC                     = this.BASE_MAX + 10;
		this.YTIC                     = this.BASE_MAX + 11;
		this.XTICS                    = this.BASE_MAX + 12;
		this.YTICS                    = this.BASE_MAX + 13;
		this.XLABEL                   = this.BASE_MAX + 14;
		this.YLABEL                   = this.BASE_MAX + 15;
		this.XLABELS                  = this.BASE_MAX + 16;
		this.YLABELS                  = this.BASE_MAX + 17;
		this.HOT_POINTS               = this.BASE_MAX + 18;
		this.DYNAMIC_XLABELS          = this.BASE_MAX + 19;
		this.DYNAMIC_YLABELS          = this.BASE_MAX + 20;
		this.DYNAMIC_XGRID            = this.BASE_MAX + 21;
		this.DYNAMIC_YGRID            = this.BASE_MAX + 22;
		this.DYNAMIC_XTICS            = this.BASE_MAX + 23;
		this.DYNAMIC_YTICS            = this.BASE_MAX + 24;
		this.DATE_XGRID               = this.BASE_MAX + 25;
		this.DATE_XTICS               = this.BASE_MAX + 26;
		this.DATE_XLABELS             = this.BASE_MAX + 27;
		this.DYNAMIC_DATE_XGRID       = this.BASE_MAX + 25;
		this.DYNAMIC_DATE_XTICS       = this.BASE_MAX + 26;
		this.DYNAMIC_DATE_XLABELS     = this.BASE_MAX + 27;
		this.LOOP                     = this.BASE_MAX + 28;
		this.POLYGON                  = this.BASE_MAX + 29;
		this.IMAGE                    = this.BASE_MAX + 30;
		this.HISTOGRAM                = this.BASE_MAX + 31;
		this.SUM_HISTOGRAM            = this.BASE_MAX + 32;
		this.SEGMENTS                 = this.BASE_MAX + 33;
		this.setXZoomBuffer( 50 );
		this.setYZoomBuffer( 50 );
		//  Used to asist in drag events.
		this.pushEventXVal = null;
		this.pushEventYVal = null;
		//  These variables are used to make the limits "soft".  This means they will define the
		//  max range allowed, but the plot can still be moved beyond them (like a sliding window).
		this.softXLimits = false;
		this.softYLimits = false;
		//  These are "hard" limints, that only come into play if "soft" limits are turned on (above).
		//  They put limits on the "sliding window".  Setting them to "null" means there are none.
		this.hardXmin = null;
		this.hardXmax = null;
		this.hardYmin = null;
		this.hardYmax = null;
		//  These values are used to set a "fixed" minimum.  When zooming, the minimum will remain
		//  fixed at what it is.
		this.fixedXZoomMin = null;
		this.fixedYZoomMin = null;
		//  These items determine the color/style of grid lines.  By default they are null, which means they
		//  will inherit parental settings.
		this.gridPaint = null;
		//  This is used to refer to dynamic label/tic/grid spacing.
		this.lastDynamicXStep = null;
		this.lastDynamicYStep = null;
		this.lastXStep = null;
		this.lastYStep = null;
		this.lastXStart = null;
		this.lastYStart = null;
		this.lastXEnd = null;
		this.lastYEnd = null;
		this.lastXFormat = null;
		this.lastYFormat = null;

		//  Some plot decorations
		this.xLabelsOn = true;
		this.yLabelsOn = true;

		//  These are "plot callback conditions" - callbacks can be set to be triggered
		//  when these things happen (there are calls at appropriate locations in this
		//  code to "doPlotCallback()").
		this.XLIMITS_CHANGE_CONDITION      = this.LAST_CB_CONDITION;
		this.YLIMITS_CHANGE_CONDITION      = this.LAST_CB_CONDITION + 1;
		this.MOUSE_MOVE_CONDITION          = this.LAST_CB_CONDITION + 2;

		this.LAST_CB_CONDITION = this.YLIMITS_CHANGE_CONDITION + 1;  //  set for next inheritor/plot type
	};

	setXType( newVal ) {
		this.xType = newVal;
	};

	setYType( newVal ) {
		this.yType = newVal;
	};

	setTicSize( newVal ) {
		this.ticSize = newVal;
	}

	//  Set the paint for grids.
	setGridPaint( newPaint ) {
		this.gridPaint = newPaint;
	}

	//  Set the x minimum and maximum.  These are the PLOTTED values, not the data values.
	//  On a linear plot there is no difference between the two, but a log plot will be
	//  different - on a log (base 10) axis, setting these values to 1.0 and 3.0 translates
	//  to a range in data values of 10 to 1000.
	//
	//  Unless the final argument is included and is true, a callback will be generated.
	//
	//  Don't use these functions internally!  They are meant to be user functions - they
	//  set the "original" values, which have other implications.
	setXLimits( lowVal, highVal, skipCallback ) {
		this.originalXmin = lowVal;
		this.originalXmax = highVal;
		this.newXLimits( lowVal, highVal );
		if ( skipCallback === undefined || skipCallback != true )
			this.doPlotCallback( this.XLIMITS_CHANGE_CONDITION );
	};

	//  Set the y minimum and maximum.  See notes about xLimits().
	setYLimits( lowVal, highVal, skipCallback ) {
		this.originalYmin = lowVal;
		this.originalYmax = highVal;
		this.newYLimits( lowVal, highVal );
		if ( skipCallback === undefined || skipCallback != true )
			this.doPlotCallback( this.YLIMITS_CHANGE_CONDITION );
	};

	//  Functions to grab the "original" limit values.
	getXLimits() {
		return [this.originalXmin, this.originalXmax];
	};

	getYLimits() {
		return [this.originalYmin, this.originalYmax];
	};

	//  Allow the limits of the plot to be "soft".
	setSoftXLimits( newVal ) {
		this.softXLimits = newVal;
	};

	setSoftYLimits( newVal ) {
		this.softYLimits = newVal;
	};

	//  Set "hard" limits to the plot, which only apply if the original limits are defined as
	//  "soft".  These values can be set to "null" if there are no such limits.
	setHardXLimits( lowVal, highVal ) {
		this.hardXmin = lowVal;
		this.hardXmax = highVal;
	}

	setHardYLimits( lowVal, highVal ) {
		this.hardYmin = lowVal;
		this.hardYmax = highVal;
	}

	//  Process new x limits.  The settings here are aspirational - they are a desired new limit
	//  setting, but they may have to be adjusted to accommodate the original "hard" limits of
	//  the plot or to deal with "wrapping" if that is allowed.
	newXLimits( lowVal, highVal ) {
		var desiredRange = highVal - lowVal;
		//  Check against "hard" limits.
		var lVal = lowVal;
		var hVal = highVal;
		if ( !this.softXLimits ) {
			if ( lowVal < highVal ) {
				if ( lVal < this.originalXmin ) {
					lVal = this.originalXmin;
					hVal = lVal + desiredRange;
				}
				if ( hVal > this.originalXmax ) {
					hVal = this.originalXmax;
					lVal = hVal - desiredRange;
				}
			}
			else {
				//  The low and high limits are reversed.
				if ( lVal > this.originalXmin ) {
					lVal = this.originalXmin;
					hVal = lVal + desiredRange;
				}
				if ( hVal < this.originalXmax ) {
					hVal = this.originalXmax;
					lVal = hVal - desiredRange;
				}
			}
		}
		else {
			if ( this.hardXmin !== null && lVal < this.hardXmin ) {
				lVal = this.hardXmin;
				hVal = lVal + desiredRange;
			}
			if ( this.hardXmax !== null && hVal > this.hardXmax ) {
				hVal = this.hardXmax;
				lVal = hVal - desiredRange;
			}
		}
		this.xmin = lVal;
		this.xmax = hVal;
		this.xRange = this.xmax - this.xmin;
		this.xSpan = Math.abs( this.xRange );
		//  Change the current "scale" to match.  The scale is used by mousewheel zooming, it
		//  might have other purposes.
		this.xScale = ( this.originalXmax - this.originalXmin ) / this.xRange;
	};

	//  Process new y limits.  These may have to be adjusted to accommodate the original limits,
	//  or to deal with "wrapping" if that is allowed.
	newYLimits( lowVal, highVal ) {
		var desiredRange = highVal - lowVal;
		//  Check against "hard" limits.
		var lVal = lowVal;
		var hVal = highVal;
		if ( !this.softYLimits ) {
			if ( lowVal < highVal ) {
				if ( lVal < this.originalYmin ) {
					lVal = this.originalYmin;
					hVal = lVal + desiredRange;
				}
				if ( hVal > this.originalYmax ) {
					hVal = this.originalYmax;
					lVal = hVal - desiredRange;
				}
			}
			else {
				//  The low and high limits are reversed.
				if ( lVal > this.originalYmin ) {
					lVal = this.originalYmin;
					hVal = lVal + desiredRange;
				}
				if ( hVal < this.originalYmax ) {
					hVal = this.originalYmax;
					lVal = hVal - desiredRange;
				}
			}
		}
		else {
			if ( this.hardYmin !== null && lVal < this.hardYmin ) {
				lVal = this.hardYmin;
				hVal = lVal + desiredRange;
			}
			if ( this.hardYmax !== null && hVal > this.hardYmax ) {
				hVal = this.hardYmax;
				lVal = hVal - desiredRange;
			}
		}
		this.ymin = lVal;
		this.ymax = hVal;
		this.yRange = this.ymax - this.ymin;
		this.ySpan = Math.abs( this.yRange );
		//  Change the current "scale" to match.  The scale is used by mousewheel zooming, it
		//  might have other purposes.
		this.yScale = ( this.originalYmax - this.originalYmin ) / this.yRange;
	};

	//  Set the log base.  We also compute the numerator in the formula used to compute
	//  the log using any base from the natural log:  logBASE( val ) = ln( val ) / ln( BASE ).
	setXLogBase( newVal ) {
		this.xLogBase = newVal;
		this.xLogDiv = Math.log( newVal );
	};

	//  See notes on setXLogBase().
	setYLogBase( newVal ) {
		this.yLogBase = newVal;
		this.yLogDiv = Math.log( newVal );
	};

	//  Set the "zoom out" limits.  These represent what fraction of the plot the defined
	//  limits can represent at maximum zoom out.  The default value for these numbers
	//  is 1.0.  To make the plot zoom out more, make the number SMALLER than 1.0.  Values
	//  can be set to null, which means no limit.
	setZoomOutLimits( newX, newY ) {
		this.xZoomOutLimit = newX;
		this.yZoomOutLimit = newY;
	};

	//  These are the limits on zooming in.  Same representation as for the zoom out numbers.
	//  If you want to allow your plot to zoom in a lot, use a larger number.  The default
	//  setting for these numbers is null, which means no limit.
	setZoomInLimits( newX, newY ) {
		this.xZoomInLimit = newX;
		this.yZoomInLimit = newY;
	}

	//  Return the x pixel position of the given x data value.
	xProject( xData ) {
		var val = xData;
		if ( this.xType === LOG )
			val = Math.log( xData ) / this.xLogDiv;
		val = this.drawX + this.drawW * ( val - this.xmin ) / this.xRange;
		return val;
	};

	//  This is a wrapper function allowing the above to be overridden.  It is applied to "data"
	//  as opposed to limits (tic marks, etc.) so the two can operate differently.  Required for
	//  RA wrapping, maybe has other uses.
	dataXProject( xData ) {
		return this.xProject( xData );
	};

	//  Return the y pixel position of the given y data value.  Y is, of course, 
	//  upside down.
	yProject( yData ) {
		var val = yData;
		if ( this.yType === LOG )
			val = Math.log( yData ) / this.yLogDiv;
		val = this.drawY + this.drawH - this.drawH * ( val - this.ymin ) / this.yRange;
		return val;
	};

	//  Y Data wrapper, analogous to dataXProject().
	dataYProject( yData ) {
		return this.yProject( yData );
	};

	//  Return the x,y pixel position of the given x,y data point.
	project( xData, yData ) {
		return [this.xProject( xData ), this.yProject( yData )];
	};

	//  From an x,y pixel position, produce an x,y data point.  The reverse of the above function.
	deproject( x, y ) {
		return [this.deprojectX( x ), this.deprojectY( y )];
	};

	//  From an x pixel position, produce an x data point.
	deprojectX( x ) {
		var val =  this.xmin + this.xRange * ( x - this.drawX ) / this.drawW;
		if ( this.xType === LOG )
			return Math.exp( val * this.xLogDiv );
		return val;
	};

	//  From a y pixel position, produce a y data point.
	deprojectY( y ) {
		var val =  this.ymin + this.yRange * ( this.drawH + this.drawY - y ) / this.drawH;
		if ( this.yType === LOG )
			return Math.exp( val * this.yLogDiv );
		return val;
	};

	//  Ignore log adjustments, deproject X.  This is used for rescale(), but might have
	//  other uses.
	limitDeprojectX( x ) {
		return this.xmin + this.xRange * x / this.drawW;
	};

	//  Ignore log adjustments, deproject Y.  This is used for rescale(), but might have
	//  other uses.
	limitDeprojectY( y ) {
		return this.ymin + this.yRange * ( this.drawH - y ) / this.drawH;
	};

	//  Change the scale of this plot by the "scale factors".  The x,y position is where the
	//  change in scale should be centered (this position should maintain its location in the
	//  plot).  This may be done in response to an event, but I believe we ignore it.
	rescale( xScaleFactor, yScaleFactor, x, y, event ) {
		var oldX = this.limitDeprojectX( x );
		var oldY = this.limitDeprojectY( y );
		super.rescale( xScaleFactor, yScaleFactor, x, y, event );
		//  In some cases (like, say, the default), x and y limits can be no more zoomed out
		//  than the original defined limits.
		if ( this.xZoomOutLimit !== null && this.xScale < this.xZoomOutLimit )
			this.xScale = this.xZoomOutLimit;
		if ( this.yZoomOutLimit !== null &&  this.yScale < this.yZoomOutLimit )
			this.yScale = this.yZoomOutLimit;
		if ( this.xZoomInLimit !== null && this.xScale > this.xZoomInLimit )
			this.xScale = this.xZoomInLimit;
		if ( this.yZoomInLimit !== null && this.yScale > this.yZoomInLimit )
			this.yScale = this.yZoomInLimit;
		//  Find new x and y limits.  These should maintain the x,y data position of the
		//  x,y mouse position given as a function argument.
		if ( xScaleFactor !== 1.0 ) {
			var newXRange = ( this.originalXmax - this.originalXmin ) / this.xScale;
			if ( this.fixedXZoomMin )
				var newXMin = this.originalXmin;
			else
				var newXMin = oldX - newXRange * ( oldX - this.xmin ) / this.xRange;
			this.newXLimits( newXMin, newXMin + newXRange );
		}
		if ( yScaleFactor !== 1.0 ) {
			var newYRange = ( this.originalYmax - this.originalYmin ) / this.yScale;
			if ( this.fixedYZoomMin )
				var newYMin = this.originalYmin;
			else
				var newYMin = oldY - newYRange * ( oldY - this.ymin ) / this.yRange;
			this.newYLimits( newYMin, newYMin + newYRange );
		}
		this.doRedraw();
	};

	//  "Fix" a minimum x limit.  This means that zoom operations will not change it.
	setFixedXZoomMin( newVal ) {
		this.fixedXZoomMin = newVal;
	}

	//  Same for Y.
	setFixedYZoomMin( newVal ) {
		this.fixedYZoomMin = newVal;
	}

	//  Add a "points" instruction to the draw instructions.  This will cause one (or many)
	//  points to be drawn on the plot.  Data take the form of either a pair of numbers or
	//  a pair of arrays of numbers.  The symbol will be drawn at the point if given - if
	//  not a unique default symbol will be drawn.  You can also specify a color.  The symbol
	//  can be specified as an index into the array of defaults (which you can set up).  The
	//  paint can also be specified that way, or explicitly as a paint.
	addPoints( x, y, symbol, strokePaint, fillPaint, toList, insertIt ) {
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( fillPaint === undefined )
			fillPaint = null;
		if ( symbol === undefined )
			symbol = null;
		if ( toList === undefined )
			toList = this.DATA_ITEM;
		if ( insertIt === undefined )
			insertIt = false;
		return this.appendItem( toList, [ this.POINTS, x, y, symbol, strokePaint, fillPaint ], insertIt );
	};

	//  This function allows you to change existing points.  It accepts the same arguments as the
	//  addPoints function with a few differences.  The "toList" argument indicates which list the 
	//  points have been added to previously ("toList" in the "addPoints()" function).  The "key" argument
	//  is used to locate the points in whatever list is specified - this value was returned by the
	//  "addPoints()"" function.  Any argument that is null is NOT changed.
	changePoints( key, x, y, symbol, strokePaint, fillPaint, fromList ) {
		if ( fromList === undefined || fromList === null )
			fromList = this.DATA_ITEM;
		//  Get the item from the proper list.
		var item = this.findListedItem( key, fromList );
		if ( item === null )
			return;
		if ( x === undefined || x === null )
			x = item.data[1];
		if ( y === undefined || y === null )
			y = item.data[2];
		if ( symbol === undefined || symbol === null )
			symbol = item.data[3];
		if ( strokePaint === undefined || strokePaint === null )
			strokePaint = item.data[4];
		if ( fillPaint === undefined || fillPaint === null )
			fillPaint = item.data[5];
		item.data = [ this.POINTS, x, y, symbol, strokePaint, fillPaint ];
	}

	//  Add a "histogram" instruction to the draw instructions.  A histogram is either x-based (the default)
	//  or y-based (an option).  The histogram has a base value (by default it is zero).  You must specify
	//  at the very least an array of values that represent the start of each histogram bar (this is the x-array
	//  if the histogram is x-based) and bar heights (the y-array if x-based).  The "step" value, which is
	//  optional, can either be a single value that specifies the width of all histogram bars or an array of
	//  values specifying the width of each histogram bar.  If this argument is not included at all (or is null),
	//  each histogram bar's width is the distance between its start value and the next start value.
	//  The appearance of the histogram bars is determined partially by the paint - if you want them filled,
	//  specify a fillPaint.  If you want them outlined, specify a strokePaint.  If you want a line to appear
	//  at the base, specify "drawBase" (by default this is not done).  You may also specify "connectOutline"
	//  which will cause the outline (if strokePaint is not null) to not outline all bars back to the base, but
	//  instead make them a jagged connected mass - this is a style I detest, but it is used often enough.
	//  You may also pad the edges of each bar with a number of pixels using "bufferPix".  This will create
	//  gaps between each bar, which can make things attractive.
	addHistogram( x, y, step, base, yBased, strokePaint, fillPaint, drawBase, connectOutline, bufferPix, toList, insertIt ) {
		if ( yBased === undefined || yBased === null )
			yBased = false;
		if ( base === undefined || base === null )
			base = 0.0;
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( fillPaint === undefined )
			fillPaint = null;
		if ( drawBase === undefined || drawBase === null )
			drawBase = false;
		if ( connectOutline === undefined || connectOutline === null )
			connectOutline = false;
		if ( toList === undefined || toList === null )
			toList = this.DATA_ITEM;
		if ( step === undefined )
			step = null;
		if ( bufferPix === undefined || bufferPix === null )
			bufferPix = 0;
		if ( insertIt === undefined || insertIt === null )
			insertIt = false;
		return this.appendItem( toList, [ this.HISTOGRAM, x, y, step, base, yBased, strokePaint, fillPaint, drawBase, connectOutline, bufferPix ], insertIt );
	}

	//  Wrapper function to insert a point instruction.  This causes it to be drawn first.
	insertPoints( x, y, symbol, strokePaint, fillPaint, toList ) {
		return this.addPoints( x, y, symbol, strokePaint, fillPaint, toList, true );
	};

	//  Add a list of segments, to the plot.  The "segments" list is a list of four point lists.  The points
	//  in the four points lists are [x1, y1, x2, y2].  The segments are considered independent - they do not
	//  necessarily connect, and are not drawn connecting.
	addSegments( segments, strokePaint, lineWidth, lineDash, toList, insertIt ) {
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( lineDash === undefined )
			lineDash = null;
		if ( toList === undefined )
			toList = this.DATA_ITEM;
		if ( insertIt === undefined )
			insertIt = false;
		return this.appendItem( toList, [ this.SEGMENTS, segments, strokePaint, lineWidth, lineDash ], insertIt );
	}

	//  Add a "curve" instruction.  This is a line through the specified points.
	addCurve( x, y, strokePaint, lineWidth, lineDash, toList, insertIt ) {
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( lineDash === undefined )
			lineDash = null;
		if ( toList === undefined )
			toList = this.DATA_ITEM;
		if ( insertIt === undefined )
			insertIt = false;
		return this.appendItem( toList, [ this.CURVE, x, y, strokePaint, lineWidth, lineDash, this.findLimits( x ), this.findLimits( y ) ], insertIt );
	}

	//  Add a "loop" instruction.  This is a closed line through the specified points.
	addLoop( x, y, strokePaint, lineWidth, lineDash, toList, insertIt ) {
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( lineDash === undefined )
			lineDash = null;
		if ( toList === undefined )
			toList = this.DATA_ITEM;
		if ( insertIt === undefined )
			insertIt = false;
		return this.appendItem( toList, [ this.LOOP, x, y, strokePaint, lineWidth, lineDash, this.findLimits( x ), this.findLimits( y ) ], insertIt );
	}

	//  Add a "polygon" instruction.
	addPolygon( x, y, fillPaint, toList, insertIt ) {
		if ( fillPaint === undefined )
			fillPaint = null;
		if ( toList === undefined )
			toList = this.DATA_ITEM;
		if ( insertIt === undefined )
			insertIt = false;
		return this.appendItem( toList, [ this.POLYGON, x, y, fillPaint, this.findLimits( x ), this.findLimits( y ) ], insertIt );
	}

	//  Add "hot" points to the draw instructions.  These trigger callbacks when the mouse moves
	//  nearest to them, hovers over them or clicks on them.  Optional callback arguments are given
	//  in the form of an array.  The callback functions themselves are ALWAYS given the event, the
	//  x and y point of the hotpoint (in pixels), and the radius of the event from the point as
	//  arguments.  These are followed by the optional arguments as an array.  The move, hover and click
	//  "radii" tell us the maximum distance between the point and the event for the point to be 
	//  considered.
	addHotPoints( x, y, moveCallback, moveRadius, moveArgs, clickCallback, clickRadius, 
		clickArgs, hoverCallback, hoverRadius, hoverArgs ) {
		if ( moveCallback === undefined )
			moveCallback = null;
		if ( moveRadius === undefined )
			moveRadius = null;
		if ( moveArgs === undefined )
			moveArgs = null;
		if ( clickCallback === undefined )
			clickCallback = null;
		if ( clickRadius === undefined )
			clickRadius = null;
		if ( clickArgs === undefined )
			clickArgs = null;
		if ( hoverCallback === undefined )
			hoverCallback = null;
		if ( hoverRadius === undefined )
			hoverRadius = null;
		if ( hoverArgs === undefined )
			hoverArgs = null;
		//  The list we add to doesn't matter in this case.
		return this.appendItem( this.DATA_ITEM, [ this.HOT_POINTS, x, y, moveCallback, moveRadius, moveArgs, clickCallback, 
			clickRadius, clickArgs, hoverCallback, hoverRadius, hoverArgs ] );
	};

	//  Add an image to the draw instructions.  The image takes the form of a "ImageRectangle", a basic drawing
	//  component.  The data in the image must be set before drawing will work.  Arguments include "img", which
	//  is the ImageRectangle instance, x and y, the location of the top left corner of the image, and xsize and
	//  ysize, the size of the image in defined plot coordinates (these will determine what scale the image is
	//  drawn at).
	addImage( img, x, y, xsize, ysize, toList, insertIt ) {
		if ( x === undefined )
			x = null;
		if ( y === undefined )
			y = null;
		if ( xsize === undefined )
			xsize = null;
		if ( ysize === undefined )
			ysize = null;
		if ( toList === undefined )
			toList = this.DATA_ITEM;
		if ( insertIt === undefined )
			insertIt = false;
		return this.appendItem( toList, [ this.IMAGE, img, x, y, xsize, ysize ], insertIt );
	}

	//  Add a grid line parallel to the y-axis at the given x value.  By default this is added
	//  to the "grid" list of items.
	addXGridLine( x, strokePaint, lineWidth, lineDash, ymin, ymax, toList ) {
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( lineDash === undefined )
			lineDash = null;
		if ( ymin === undefined )
			ymin = null;
		if ( ymax === undefined )
			ymax = null;
		if ( toList === undefined )
			toList = this.GRID_ITEM;
		return this.appendItem( toList, [ this.XGRID_LINE, x, strokePaint, lineWidth, lineDash, ymin, ymax ] );
	}

	//  Add a bunch of grid lines along the x axis of the plot.  The grid lines are given a step value and optional
	//  start and stop values.  You really only need the step value.
	addXGrid( stepI, start, stop, xRangeI, strokePaint, lineWidth, lineDash, ymin, ymax,
		toList ) {
		//  See if the step has a "no step" value associated with it.
		if ( typeof( stepI ) === "object" ) {
			var step = stepI[0];
			var noStep = stepI[1];
		}
		else {
			var step = stepI;
			var noStep = null;
		}
		if ( start === undefined )
			start = null;
		if ( stop === undefined )
			stop = null;
		if ( xRangeI === undefined || xRangeI === null ) {
			var xRange = null;
			var bottomRange = null;
		}
		else if ( typeof( xRangeI ) === "object" ) {
			var xRange = xRangeI[0];
			var bottomRange = xRangeI[1];
		}
		else {
			var xRange = xRangeI;
			var bottomRange = null;
		}
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( lineDash === undefined )
			lineDash = null;
		if ( ymin === undefined )
			ymin = null;
		if ( ymax === undefined )
			ymax = null;
		if ( toList === undefined )
			toList = this.GRID_ITEM;
		return this.appendItem( toList, [ this.XGRID, step, start, stop, xRange, strokePaint, lineWidth, lineDash,
			ymin, ymax, noStep, bottomRange ] );
	}

	//  Add a bunch of grid lines along the x axis of the plot.  The grid lines are given a step value and optional
	//  start and stop values.  You really only need the step value.
	addDynamicXGrid( min, max, best, start, stop, xRangeI, strokePaint, lineWidth, lineDash, ymin, ymax,
		toList ) {
		if ( min === undefined )
			min = null;
		if ( max === undefined )
			max = null;
		if ( best === undefined )
			best = null;
		if ( start === undefined )
			start = null;
		if ( stop === undefined )
			stop = null;
		if ( xRangeI === undefined || xRangeI === null ) {
			var xRange = null;
			var bottomRange = null;
		}
		else if ( typeof( xRangeI ) === "object" ) {
			var xRange = xRangeI[0];
			var bottomRange = xRangeI[1];
		}
		else {
			var xRange = xRangeI;
			var bottomRange = null;
		}
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( lineDash === undefined )
			lineDash = null;
		if ( ymin === undefined )
			ymin = null;
		if ( ymax === undefined )
			ymax = null;
		if ( toList === undefined )
			toList = this.GRID_ITEM;
		return this.appendItem( toList, [ this.DYNAMIC_XGRID, min, max, best, start, stop, xRange, strokePaint, lineWidth, lineDash,
				ymin, ymax, bottomRange ] );
	}

	//---------------------------------
	//  Generate a label at the given x value.  You must specify the location
	//  of the label in x, but everything else is optional.  The label string will be created from the
	//  value using the given format, drawn using the specified paint, font, and font
	//  size.  "yLine" is the value in Y of the line being labeled (nominally ymin - the bottom of the
	//  plot), "yOffset" is the number of pixels to offset the string from the yLine (default is twice the
	//  fontsize), and "alignment" is the text alignment to this offset position (see the Text component).
	//  You can set fontOutline to "stroke" or "both" (filled is the default) along with a strokePaint if
	//  needed.  Text components are used to draw these.
	//------
	generateXLabel( x, format, args, combinedPaint, font, yLine, yOffset, alignment ) {
		if ( args === undefined )
			args = null;
		if ( combinedPaint === undefined )
			combinedPaint = null;
		if ( format === undefined )
			format = null;
		if ( yLine === undefined )
			yLine = null;
		if ( yOffset === undefined )
			yOffset = null;
		if ( font === undefined )
			font = null;
		if ( alignment === undefined )
			alignment = null;
		return [ this.XLABEL, x, format, args, combinedPaint, font, yLine, yOffset, alignment ];
	}

	//---------------------------------
	//  Add an X label at the given x value.  By default this is added
	//  to the "label" list of items - not subjected to clipping.
	//------
	addXLabel( x, format, args, combinedPaint, font, yLine, yOffset, alignment, toList ) {
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, this.generateXLabels( x, format, args, combinedPaint, font, yLine, yOffset, alignment ) );
	}

	//---------------------------------
	//  Add a series of x labels with similar characteristics.  The settings here are the same
	//  as for a single x label with the exception of the x value which has been replaced by 
	//  step, start, and end values.  The only value you really need is the step value.
	//------
	addXLabels( stepI, start, end, xRangeI, format, args, combinedPaint, font, yLine,
		yOffset, alignment, yLineOpposite, xOffset, rotation, outline, outlineWidth, toList ) {
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, this.generateXLabels( stepI, start, end, xRangeI, format, args, combinedPaint, font, yLine,
			yOffset, alignment, yLineOpposite, xOffset, rotation, outline, outlineWidth ) );
	}

	//---------------------------------
	//  Create a data item that contains X labels settings.  This is used in the "addXLabels"
	//  function, but it can be used to replace the data in an existing item.
	//------
	generateXLabels( stepI, start, end, xRangeI, format, args, combinedPaint, font, yLine,
		yOffset, alignment, yLineOpposite, xOffset, rotation, outline, outlineWidth ) {
		//  See if the step has a "no step" value associated with it.
		if ( typeof( stepI ) === "object" ) {
			var step = stepI[0];
			var noStep = stepI[1];
		}
		else {
			var step = stepI;
			var noStep = null;
		}
		if ( start === undefined )
			start = null;
		if ( end === undefined )
			end = null;
		if ( xRangeI === undefined || xRangeI === null ) {
			var xRange = null;
			var bottomRange = null;
		}
		else if ( typeof( xRangeI ) === "object" ) {
			var xRange = xRangeI[0];
			var bottomRange = xRangeI[1];
		}
		else {
			var xRange = xRangeI;
			var bottomRange = null;
		}
		if ( args === undefined )
			args = null;
		if ( combinedPaint === undefined )
			combinedPaint = null;
		if ( format === undefined )
			format = null;
		if ( yLine === undefined )
			yLine = null;
		if ( yOffset === undefined )
			yOffset = null;
		if ( font === undefined )
			font = null;
		if ( alignment === undefined )
			alignment = null;
		if ( yLineOpposite === undefined )
			yLineOpposite = null;
		if ( xOffset === undefined )
			xOffset = null;
		if ( rotation === undefined )
			rotation = null;
		if ( outline === undefined )
			outline = null;
		if ( outlineWidth === undefined )
			outlineWidth = 0;
		return  [ this.XLABELS, step, start, end, xRange, format, args, combinedPaint, font, yLine,
			yOffset, alignment, noStep, bottomRange, yLineOpposite, xOffset, rotation, outline, outlineWidth ];
	}

	//---------------------------------
	//  Add "dynamic" X labels to the plot.  See "generateDynamicXLabels()" to see what the arguments
	//  do.
	//------
	addDynamicXLabels( min, max, best, start, end, format, args, combinedPaint, font, yLine, yOffset, 
		alignment, yLineOpposite, xOffset, rotation, outline, outlineWidth, toList ) {
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, this.generateDynamicXLabels( min, max, best, start, end, format, 
			args, combinedPaint, font, yLine, yOffset, alignment, yLineOpposite, xOffset, rotation, outline, outlineWidth ) );
	}

	//---------------------------------
	//  Generate "dynamic" X labels for the plot.  You don't actually have to have any arguments for this call
	//  at all - it will try to find labels between the current minimum and maximum of the plot that make
	//  sense (i.e. use nice values).  You can specify the minimum, maximum, and "best" number of labels
	//  you would like.  Everything else is kind of like the other label instructions, and all are optional.
	//------
	generateDynamicXLabels( min, max, best, start, end, format, args, combinedPaint, font, yLine, yOffset, 
		alignment, yLineOpposite, xOffset, rotation, outline, outlineWidth ) {
		if ( min === undefined )
			min = null;
		if ( max === undefined )
			max = null;
		if ( best === undefined )
			best = null;
		if ( start === undefined )
			start = null;
		if ( end === undefined )
			end = null;
		if ( args === undefined )
			args = null;
		if ( combinedPaint === undefined )
			combinedPaint = null;
		if ( format === undefined )
			format = null;
		if ( yLine === undefined )
			yLine = null;
		if ( yOffset === undefined )
			yOffset = null;
		if ( font === undefined )
			font = null;
		if ( alignment === undefined )
			alignment = null;
		if ( yLineOpposite === undefined )
			yLineOpposite = null;
		if ( xOffset === undefined )
			xOffset = null;
		if ( rotation === undefined )
			rotation = null;
		if ( outline === undefined )
			outline = null;
		if ( outlineWidth === undefined )
			outlineWidth = 0;
		return [ this.DYNAMIC_XLABELS, min, max, best, start, end, format, args, combinedPaint, font, yLine, 
			yOffset, alignment, yLineOpposite, xOffset, rotation, outline, outlineWidth ];
	}

	//  Add "date" labels.  This is a special case where the x value is interpreted as a number of miliseconds
	//  since 1970, using the JavaScript "Date" class.  Years, months, days, hours, minutes and seconds will
	//  be labelled as appropriate for the scale.
	addDynamicXDateLabels( min, max, best, start, end, included, format, args, combinedPaint, font, yLine, yOffset, alignment, toList ) {
		if ( min === undefined )
			min = null;
		if ( max === undefined )
			max = null;
		if ( best === undefined )
			best = null;
		if ( start === undefined )
			start = null;
		if ( end === undefined )
			end = null;
		if ( included === undefined )
			included = null;
		if ( args === undefined )
			args = null;
		if ( combinedPaint === undefined )
			combinedPaint = null;
		if ( format === undefined )
			format = null;
		if ( yLine === undefined )
			yLine = null;
		if ( yOffset === undefined )
			yOffset = null;
		if ( font === undefined )
			font = null;
		if ( alignment === undefined )
			alignment = null;
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, [ this.DYNAMIC_DATE_XLABELS, min, max, best, start, end, included, format, args, combinedPaint, font, yLine, 
			yOffset, alignment ] );
	}

	//---------------------------------
	//  Generate a tic mark at the given x location.  "yLine" is the y-value at which the tic starts,
	//  and ySize is its length in pixels (positive is down, negative is up).
	//------
	generateXTic( x, strokePaint, lineWidth, yLine, ySize ) {
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( yLine === undefined )
			yLine = null;
		if ( ySize === undefined )
			ySize = null;
		return [ this.XTIC, x, strokePaint, lineWidth, yLine, ySize ];
	}

	//---------------------------------
	//  Add a tic mark at the given x location.
	//------
	addXTic( x, strokePaint, lineWidth, yLine, ySize, toList ) {
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, this.generateXTic( x, strokePaint, lineWidth, yLine, ySize ) );
	}

	//---------------------------------
	//  Bunch of x-axis tic marks.
	//------
	generateXTics( stepI, start, stop, xRangeI, strokePaint, lineWidth, yLine, ySize, drawLine, 
		yLineOpposite, offset ) {
		//  See if the step has a "no step" value associated with it.
		if ( typeof( stepI ) === "object" ) {
			var step = stepI[0];
			var noStep = stepI[1];
		}
		else {
			var step = stepI;
			var noStep = null;
		}
		if ( start === undefined )
			start = null;
		if ( stop === undefined )
			stop = null;
		if ( xRangeI === undefined || xRangeI === null ) {
			var xRange = null;
			var bottomRange = null;
		}
		else if ( typeof( xRangeI ) === "object" ) {
			var xRange = xRangeI[0];
			var bottomRange = xRangeI[1];
		}
		else {
			var xRange = xRangeI;
			var bottomRange = null;
		}
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( yLine === undefined )
			yLine = null;
		if ( ySize === undefined )
			ySize = null;
		if ( yLineOpposite === undefined )
			yLineOpposite = null;
		if ( drawLine === undefined )
			drawLine = null;
		if ( offset === undefined )
			offset = null;
		return [ this.XTICS, step, start, stop, xRange, strokePaint, lineWidth, yLine, ySize,
			noStep, bottomRange, drawLine, yLineOpposite, offset ];
	}

	//---------------------------------
	//  Add a bunch of x-axis tic marks.
	//------
	addXTics( stepI, start, stop, xRangeI, strokePaint, lineWidth, yLine, ySize, drawLine, yLineOpposite,
		 offset, toList ) {
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, this.generateXTics( stepI, start, stop, xRangeI, strokePaint, lineWidth, yLine, 
			ySize, drawLine, yLineOpposite, offset ) );
	}

	//---------------------------------
	//  Dynamic x tic marks.
	//------
	generateDynamicXTics( min, max, best, start, stop, xRangeI, strokePaint, lineWidth, yLine, ySize, drawLine, yLineOpposite
		, offset ) {
		if ( min === undefined )
			min = null;
		if ( max === undefined )
			max = null;
		if ( best === undefined )
			best = null;
		if ( start === undefined )
			start = null;
		if ( stop === undefined )
			stop = null;
		if ( xRangeI === undefined || xRangeI === null ) {
			var xRange = null;
			var bottomRange = null;
		}
		else if ( typeof( xRangeI ) === "object" ) {
			var xRange = xRangeI[0];
			var bottomRange = xRangeI[1];
		}
		else {
			var xRange = xRangeI;
			var bottomRange = null;
		}
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( yLine === undefined )
			yLine = null;
		if ( ySize === undefined )
			ySize = null;
		if ( yLineOpposite === undefined )
			yLineOpposite = null;
		if ( drawLine === undefined )
			drawLine = null;
		if ( offset === undefined )
			offset = null;
		return [ this.DYNAMIC_XTICS, min, max, best, start, stop, xRange, strokePaint, lineWidth, yLine, ySize,
			bottomRange, drawLine, yLineOpposite, offset ];
	}

	//---------------------------------
	//  Dynamic x tic marks.
	//------
	addDynamicXTics( min, max, best, start, stop, xRangeI, strokePaint, lineWidth, yLine, ySize, drawLine, yLineOpposite, 
		offset, toList ) {
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, this.generateDynamicXTics( min, max, best, start, stop, xRangeI, strokePaint,
			 lineWidth, yLine, ySize, drawLine, yLineOpposite, offset ) );
	}

	//  These are "date" labels, used in the special case that an axis is a date given in milliseconds since
	//  1970 - as used in the Date class.
	addDynamicXDateTics( min, max, best, start, stop, xRangeI, strokePaint, lineWidth, yLine, ySize, toList ) {
		if ( min === undefined )
			min = null;
		if ( max === undefined )
			max = null;
		if ( best === undefined )
			best = null;
		if ( start === undefined )
			start = null;
		if ( stop === undefined )
			stop = null;
		if ( xRangeI === undefined || xRangeI === null ) {
			var xRange = null;
			var bottomRange = null;
		}
		else if ( typeof( xRangeI ) === "object" ) {
			var xRange = xRangeI[0];
			var bottomRange = xRangeI[1];
		}
		else {
			var xRange = xRangeI;
			var bottomRange = null;
		}
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( yLine === undefined )
			yLine = null;
		if ( ySize === undefined )
			ySize = null;
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, [ this.DYNAMIC_DATE_XTICS, min, max, best, start, stop, xRange, strokePaint, lineWidth, yLine, ySize,
			bottomRange ] );
	}

	//  Add a grid line parallel to the x-axis at the given y value.  By default this is added
	//  to the "grid" list of items.
	addYGridLine( y, strokePaint, lineWidth, lineDash, xmin, xmax, toList ) {
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( lineDash === undefined )
			lineDash = null;
		if ( xmin === undefined )
			xmin = null;
		if ( xmax === undefined )
			xmax = null;
		if ( toList === undefined )
			toList = this.GRID_ITEM;
		return this.appendItem( toList, [ this.YGRID_LINE, y, strokePaint, lineWidth, lineDash, xmin, xmax ] );
	}

	//  Add a bunch of grid lines to y-axis of the plot.  The grid lines are given a step value and optional
	//  start and stop values.  You really only need the step value.
	addYGrid( stepI, start, stop, yRangeI, strokePaint, lineWidth, lineDash, xmin,
		xmax, toList ) {
		//  See if the step has a "no step" value associated with it.
		if ( typeof( stepI ) === "object" ) {
			var step = stepI[0];
			var noStep = stepI[1];
		}
		else {
			var step = stepI;
			var noStep = null;
		}
		if ( start === undefined )
			start = null;
		if ( stop === undefined )
			stop = null;
		if ( yRangeI === undefined || yRangeI === null ) {
			var yRange = null;
			var bottomRange = null;
		}
		else if ( typeof( yRangeI ) === "object" ) {
			var yRange = yRangeI[0];
			var bottomRange = yRangeI[1];
		}
		else {
			var yRange = yRangeI;
			var bottomRange = null;
		}
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( lineDash === undefined )
			lineDash = null;
		if ( xmin === undefined )
			xmin = null;
		if ( xmax === undefined )
			xmax = null;
		if ( toList === undefined )
			toList = this.GRID_ITEM;
		return this.appendItem( toList, [ this.YGRID, step, start, stop, yRange, strokePaint, lineWidth, lineDash, xmin,
			xmax, noStep, bottomRange ] );
	}

	//  Add a bunch of grid lines to y-axis of the plot.  The grid lines are given a step value and optional
	//  start and stop values.  You really only need the step value.
	addDynamicYGrid( min, max, best, start, stop, yRangeI, strokePaint, lineWidth, lineDash, xmin,
		xmax, toList ) {
		if ( min === undefined )
			min = null;
		if ( max === undefined )
			max = null;
		if ( best === undefined )
			best = null;
		if ( start === undefined )
			start = null;
		if ( stop === undefined )
			stop = null;
		if ( yRangeI === undefined || yRangeI === null ) {
			var yRange = null;
			var bottomRange = null;
		}
		else if ( typeof( yRangeI ) === "object" ) {
			var yRange = yRangeI[0];
			var bottomRange = yRangeI[1];
		}
		else {
			var yRange = yRangeI;
			var bottomRange = null;
		}
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( lineDash === undefined )
			lineDash = null;
		if ( xmin === undefined )
			xmin = null;
		if ( xmax === undefined )
			xmax = null;
		if ( toList === undefined )
			toList = this.GRID_ITEM;
		return this.appendItem( toList, [ this.DYNAMIC_YGRID, min, max, best, start, stop, yRange, strokePaint, lineWidth, lineDash, xmin,
			xmax, bottomRange ] );
	}

	//  Add a tic mark at the given y location.  "xLine" is the x-value at which the tic starts,
	//  and xSize is its length in pixels (positive is left, negative is right).
	addYTic( y, strokePaint, lineWidth, xLine, xSize, toList ) {
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( xLine === undefined )
			xLine = null;
		if ( xSize === undefined )
			xSize = null;
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, [ this.YTIC, y, strokePaint, lineWidth, xLine, xSize ] );
	}

	//----------------------------
	//  Generate instructions for Y tics.
	//------
	generateYTics( stepI, start, stop, yRangeI, strokePaint, lineWidth, xLine, xSize, drawLine, 
		xLineOpposite, offset ) {
		//  See if the step has a "no step" value associated with it.
		if ( typeof( stepI ) === "object" ) {
			var step = stepI[0];
			var noStep = stepI[1];
		}
		else {
			var step = stepI;
			var noStep = null;
		}
		if ( start === undefined )
			start = null;
		if ( stop === undefined )
			stop = null;
		if ( yRangeI === undefined || yRangeI === null ) {
			var yRange = null;
			var bottomRange = null;
		}
		else if ( typeof( yRangeI ) === "object" ) {
			var yRange = yRangeI[0];
			var bottomRange = yRangeI[1];
		}
		else {
			var yRange = yRangeI;
			var bottomRange = null;
		}
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( xLine === undefined )
			xLine = null;
		if ( xSize === undefined )
			xSize = null;
		if ( xLineOpposite === undefined )
			xLineOpposite = null;
		if ( drawLine === undefined )
			drawLine = null;
		if ( offset === undefined )
			offset = null;
		return [ this.YTICS, step, start, stop, yRange, strokePaint, lineWidth, xLine, xSize,
			noStep, bottomRange, drawLine, xLineOpposite, offset ];
	}

	//----------------------------
	//  Add a bunch of y-axis tic marks.
	//------
	addYTics( stepI, start, stop, yRangeI, strokePaint, lineWidth, xLine, xSize, drawLine, xLineOpposite, 
		offset, toList ) {
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, this.generateYTics( stepI, start, stop, yRangeI, strokePaint, lineWidth, xLine, 
			xSize, drawLine, xLineOpposite, offset ) );
	}

	//----------------------------
	//  Generate instructions for dynamically spaced y-axis tic marks.
	//------
	generateDynamicYTics( min, max, best, start, stop, yRangeI, strokePaint, lineWidth, xLine, xSize, drawLine,
		 xLineOpposite, offset ) {
		if ( min === undefined )
			min = null;
		if ( max === undefined )
			max = null;
		if ( best === undefined )
			best = null;
		if ( start === undefined )
			start = null;
		if ( stop === undefined )
			stop = null;
		if ( yRangeI === undefined || yRangeI === null ) {
			var yRange = null;
			var bottomRange = null;
		}
		else if ( typeof( yRangeI ) === "object" ) {
			var yRange = yRangeI[0];
			var bottomRange = yRangeI[1];
		}
		else {
			var yRange = yRangeI;
			var bottomRange = null;
		}
		if ( strokePaint === undefined )
			strokePaint = null;
		if ( lineWidth === undefined )
			lineWidth = null;
		if ( xLine === undefined )
			xLine = null;
		if ( xSize === undefined )
			xSize = null;
		if ( xLineOpposite === undefined )
			xLineOpposite = null;
		if ( drawLine === undefined )
			drawLine = null;
		if ( offset === undefined )
			offset = null;
		return [ this.DYNAMIC_YTICS, min, max, best, start, stop, yRange, strokePaint, lineWidth, xLine, xSize,
			bottomRange, drawLine, xLineOpposite, offset ];
	}

	//  Dynamically spaced y-axis tic marks.
	addDynamicYTics( min, max, best, start, stop, yRangeI, strokePaint, lineWidth, xLine, xSize, drawLine, 
		xLineOpposite, offset, toList ) {
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, this.generateDynamicYTics( min, max, best, start, stop, yRangeI, strokePaint, 
			lineWidth, xLine, xSize, drawLine, xLineOpposite, offset ) );
	}

	//  Add a y label.  See the notes on addXLabel for details.
	addYLabel( y, format, args, combinedPaint, font, xLine, xOffset, alignment, toList ) {
		if ( args === undefined )
			args = null;
		if ( combinedPaint === undefined )
			combinedPaint = null;
		if ( format === undefined )
			format = null;
		if ( xLine === undefined )
			xLine = null;
		if ( xOffset === undefined )
			xOffset = null;
		if ( font === undefined )
			font = null;
		if ( alignment === undefined )
			alignment = null;
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, [ this.YLABEL, y, format, args, combinedPaint, font, xLine, xOffset, alignment ] );
	}

	//---------------------------------
	//  Add a series of y labels with similar characteristics.  The settings here are the same
	//  as for a single y label with the exception of the y value which has been replaced by 
	//  step, start, and end values.  The only value you really need is the step value.
	//------
	addXLabels( stepI, start, end, yRangeI, format, args, combinedPaint, font, xLine,
		xOffset, alignment, xLineOpposite, yOffset, rotation, outline, outlineWidth, toList ) {
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, this.generateYLabels( stepI, start, end, yRangeI, format, args, combinedPaint, font, xLine,
			xOffset, alignment, xLineOpposite, yOffset, rotation, outline, outlineWidth ) );
	}

	//---------------------------------
	//  Create a data item that contains X labels settings.  This is used in the "addXLabels"
	//  function, but it can be used to replace the data in an existing item.
	//------
	generateYLabels( stepI, start, end, yRangeI, format, args, combinedPaint, font, xLine,
		xOffset, alignment, xLineOpposite, yOffset, rotation, outline, outlineWidth ) {
		//  See if the step has a "no step" value associated with it.
		if ( typeof( stepI ) === "object" ) {
			var step = stepI[0];
			var noStep = stepI[1];
		}
		else {
			var step = stepI;
			var noStep = null;
		}
		if ( start === undefined )
			start = null;
		if ( end === undefined )
			end = null;
		if ( yRangeI === undefined || yRangeI === null ) {
			var yRange = null;
			var bottomRange = null;
		}
		else if ( typeof( yRangeI ) === "object" ) {
			var yRange = yRangeI[0];
			var bottomRange = yRangeI[1];
		}
		else {
			var yRange = yRangeI;
			var bottomRange = null;
		}
		if ( args === undefined )
			args = null;
		if ( combinedPaint === undefined )
			combinedPaint = null;
		if ( format === undefined )
			format = null;
		if ( xLine === undefined )
			xLine = null;
		if ( xOffset === undefined )
			xOffset = null;
		if ( font === undefined )
			font = null;
		if ( alignment === undefined )
			alignment = null;
		if ( xLineOpposite === undefined )
			xLineOpposite = null;
		if ( yOffset === undefined )
			yOffset = null;
		if ( rotation === undefined )
			rotation = null;
		if ( outline === undefined )
			outline = null;
		if ( outlineWidth === undefined )
			outlineWidth = 0;
		return [ this.YLABELS, step, start, end, yRange, format, args, combinedPaint, font, xLine, xOffset, 
			alignment, noStep, bottomRange, xLineOpposite, yOffset, rotation, outline, outlineWidth ];
	}

	//---------------------------------
	//  Add "dynamic" labels to the plot.  You don't actually have to have any arguments for this call
	//  at all - it will try to find labels between the current minimum and maximum of the plot that make
	//  sense (i.e. use nice values).  You can specify the minimum, maximum, and "best" number of labels
	//  you would like.  Everything else is kind of like the other label instructions, and all are optional.
	//------
	addDynamicYLabels( min, max, best, start, end, format, args, combinedPaint, font, xLine, 
		xOffset, alignment, xLineOpposite, yOffset, rotation, outline, outlineWidth, toList ) {
		if ( toList === undefined )
			toList = this.LABEL_ITEM;
		return this.appendItem( toList, this.generateDynamicYLabels( min, max, best, start, end, format, args, combinedPaint, font, xLine, 
			xOffset, alignment, xLineOpposite, yOffset, rotation, outline, outlineWidth ) );
	}

	//---------------------------------
	//  Create a data item that contains X labels settings.  This is used in the "addXLabels"
	//  function, but it can be used to replace the data in an existing item.
	//------
	generateDynamicYLabels( min, max, best, start, end, format, args, combinedPaint, font, xLine, 
		xOffset, alignment, xLineOpposite, yOffset, rotation, outline, outlineWidth ) {
		if ( min === undefined )
			min = null;
		if ( max === undefined )
			max = null;
		if ( best === undefined )
			best = null;
		if ( start === undefined )
			start = null;
		if ( end === undefined )
			end = null;
		if ( args === undefined )
			args = null;
		if ( combinedPaint === undefined )
			combinedPaint = null;
		if ( format === undefined )
			format = null;
		if ( xLine === undefined )
			xLine = null;
		if ( xOffset === undefined )
			xOffset = null;
		if ( font === undefined )
			font = null;
		if ( alignment === undefined )
			alignment = null;
		if ( xLineOpposite === undefined )
			xLineOpposite = null;
		if ( yOffset === undefined )
			yOffset = null;
		if ( rotation === undefined )
			rotation = null;
		if ( outline === undefined )
			outline = null;
		if ( outlineWidth === undefined )
			outlineWidth = 0;
		return [ this.DYNAMIC_YLABELS, min, max, best, start, end, format, args, combinedPaint, font, xLine, 
			xOffset, alignment, xLineOpposite, yOffset, rotation, outline, outlineWidth ];
	}

	// //  This is where we draw the plotting data.  Some effort has been made to do as much
	// //  computation in advance as possible so that this function is as fast as possible.
	// draw( ins ) {
	// 	this.drawX2 = this.drawX + this.drawW;
	// 	this.drawY2 = this.drawY + this.drawH;
	// 	//  Clear hotpoints.  These are used (by the base class, and this one) to cause
	// 	//  things to happen when mice move near/over or do things to positions.
	// 	this.clearMoveHotPoints();
	// 	//  Before drawing the data apply a clipping region to it if desired (this is
	// 	//  the default behavior).
	// 	if ( this.clipData !== false && this.clipData !== null ) {
	// 		ins.ctx.save();
	// 		//  The clipping may be to a region specified by a complex clipping path.  Or
	// 		//  the setting may simply be "true" which tells us to clip to the rectangular
	// 		//  component area.
	// 		if ( this.clipData === true ) {
	// 			ins.ctx.beginPath();
	// 			//ins.ctx.rect( this.drawX + 1, this.drawY + 1, this.drawW - 2, this.drawH - 2 );
	// 			ins.ctx.rect( this.drawX, this.drawY, this.drawW, this.drawH );
	// 			ins.ctx.clip();
	// 		}
	// 	}
	// 	//  Draw the list of "grid" items.
	// 	var thisItem = this.gridItems;
	// 	while ( thisItem !== null ) {
	// 		this.drawDataItem( ins, thisItem );
	// 		thisItem = thisItem.next;
	// 	}
	// 	//  Draw the list of data items.
	// 	var thisItem = this.dataItems;
	// 	while ( thisItem !== null ) {
	// 		this.drawDataItem( ins, thisItem );
	// 		thisItem = thisItem.next;
	// 	}
	// 	//  Run a "restore" if we applied clipping before the data.
	// 	if ( this.clipData !== false && this.clipData !== null )
	// 		ins.ctx.restore();
	// 	//  Draw the list of "label" items.  These are outside of any clipping instructions.
	// 	//  However, there is no difference between a "data" item and a "label" item - both
	// 	//  are drawn by the same function.
	// 	var thisItem = this.labelItems;
	// 	while ( thisItem !== null ) {
	// 		this.drawDataItem( ins, thisItem );
	// 		thisItem = thisItem.next;
	// 	}
	// };

	//                                                                                                                  
	//       ___                                 ________                            ____                               
	//       `MM                                 `MMMMMMMb.                          `MM'                               
	//        MM                                  MM    `Mb           /               MM   /                            
	//    ____MM ___  __    ___  ____    _    ___ MM     MM    ___   /M        ___    MM  /M      ____  ___  __    __   
	//   6MMMMMM `MM 6MM  6MMMMb `MM(   ,M.   )M' MM     MM  6MMMMb /MMMMM   6MMMMb   MM /MMMMM  6MMMMb `MM 6MMb  6MMb  
	//  6M'  `MM  MM69 " 8M'  `Mb `Mb   dMb   d'  MM     MM 8M'  `Mb MM     8M'  `Mb  MM  MM    6M'  `Mb MM69 `MM69 `Mb 
	//  MM    MM  MM'        ,oMM  YM. ,PYM. ,P   MM     MM     ,oMM MM         ,oMM  MM  MM    MM    MM MM'   MM'   MM 
	//  MM    MM  MM     ,6MM9'MM  `Mb d'`Mb d'   MM     MM ,6MM9'MM MM     ,6MM9'MM  MM  MM    MMMMMMMM MM    MM    MM 
	//  MM    MM  MM     MM'   MM   YM,P  YM,P    MM     MM MM'   MM MM     MM'   MM  MM  MM    MM       MM    MM    MM 
	//  YM.  ,MM  MM     MM.  ,MM   `MM'  `MM'    MM    .M9 MM.  ,MM YM.  , MM.  ,MM  MM  YM.  ,YM    d9 MM    MM    MM 
	//   YMMMMMM__MM_    `YMMM9'Yb.  YP    YP    _MMMMMMM9' `YMMM9'Yb.YMMM9 `YMMM9'Yb_MM_  YMMM9 YMMMM9 _MM_  _MM_  _MM_
	//                                                                                                                  
	//  Interpret and draw a data "item".  The item may be complex, involving any number of
	//  arguments.  This is an overriding function - the BasePlot class has some data items
	//  it knows about.  If we don't understand the data item here, we call the BasePlot
	//  class to see if it can interpret it.
	drawDataItem( ins, thisItem ) {
		// if ( thisItem.dontDraw )
		// 	return;
		//  What we do next depends on the type of item.
		switch( thisItem.data[0] ) {
			case this.POINTS:
				//  The data may take the form of a single point (two numbers) or many
				//  points (two arrays).  Paint specifications are applied if they exist.
				if ( thisItem.data[1].length === undefined ) {
					var tspaint = this.findStrokePaint( thisItem.data[4] );
					var tfpaint = this.findFillPaint( thisItem.data[5] );
					if ( tspaint !== null || tfpaint !== null )
						ins.ctx.save();
					if ( tspaint !== null ) {
						ins.ctx.strokeStyle = translatePaint( ins, tspaint );
					}
					if ( tfpaint !== null ) {
						ins.ctx.fillStyle = translatePaint( ins, tfpaint );
					}
					this.drawSymbol( ins, this.dataXProject( thisItem.data[1] ), this.dataYProject( thisItem.data[2] ), thisItem.data[3] );
					if ( tspaint !== null || tfpaint !== null )
						ins.ctx.restore();
				}
				//  This happens if the point specifications are arrays.
				else {
					var tspaint = this.findStrokePaint( thisItem.data[4] );
					var tfpaint = this.findFillPaint( thisItem.data[5] );
					if ( tspaint !== null || tfpaint !== null )
						ins.ctx.save();
					if ( tspaint !== null ) {
						ins.ctx.strokeStyle = translatePaint( ins, tspaint );
					}
					if ( tfpaint !== null ) {
						ins.ctx.fillStyle = translatePaint( ins, tfpaint );
					}
					//  Run through each point described by the arrays.  The two arrays
					//  must be the same length (or, more strictly, the x array must be
					//  no longer than the y array) or bad things might happen.  The
					//  symbol and color array items (3 and 4) are not expected to be
					//  arrays.  If you want those things to change between items, you
					//  need to draw the with individual calls to "addPoints()".
					for ( i = 0; i < thisItem.data[1].length; ++i )
						this.drawSymbol( ins, this.dataXProject( thisItem.data[1][i] ), this.dataYProject( thisItem.data[2][i] ), thisItem.data[3] );
					if ( tspaint !== null || tfpaint !== null )
						ins.ctx.restore();
				}
				break;
			//	rx, y, step, base, yBased, strokePaint, fillPaint, drawBase, connectOutline
			case this.HISTOGRAM:
				var x = thisItem.data[1];
				var y = thisItem.data[2];
				var step = thisItem.data[3];
				var base = thisItem.data[4];
				var yBased = thisItem.data[5];
				var strokePaint = thisItem.data[6];
				var fillPaint = thisItem.data[7];
				var drawBase = thisItem.data[8];
				var connectOutline = thisItem.data[9];
				var bufferPix = thisItem.data[10];
				var boxX = [];
				var boxY = [];
				//  Make each bar...this is done first for "fill" and then "stroke".
				if ( fillPaint !== null || strokePaint !== null )
					ins.ctx.save();
				if ( fillPaint !== null || ( fillPaint === null && strokePaint === null ) ) {
					if ( fillPaint !== null )
						ins.ctx.fillStyle = translatePaint( ins, fillPaint );
					for ( var i = 0; i < x.length; ++i ) {
						//  Sort out the step....depends on what the user specified.
						if ( step === null ) {
							if ( yBased )
								var thisW = y[1] - y[0];
							else
								var thisW = x[1] - x[0];
						}
						else if ( typeof( step ) === "number" )
							var thisW = step;
						else
							var thisW = step[i];
						ins.ctx.beginPath();
						if ( yBased ) {
							ins.ctx.moveTo( this.dataXProject( base ), this.dataYProject( y[i] ) + bufferPix );
							ins.ctx.lineTo( this.dataXProject( x[i] ), this.dataYProject( y[i] ) + bufferPix );
							ins.ctx.lineTo( this.dataXProject( x[i] ), this.dataYProject( y[i] + thisW ) - bufferPix );
							ins.ctx.lineTo( this.dataXProject( base ), this.dataYProject( y[i] + thisW ) - bufferPix );
						}
						else {
							ins.ctx.moveTo( this.dataXProject( x[i] ) + bufferPix, this.dataYProject( base ) );
							ins.ctx.lineTo( this.dataXProject( x[i] ) + bufferPix, this.dataYProject( y[i] ) );
							ins.ctx.lineTo( this.dataXProject( x[i] + thisW ) - bufferPix, this.dataYProject( y[i] ) );
							ins.ctx.lineTo( this.dataXProject( x[i] + thisW ) - bufferPix, this.dataYProject( base ) );
						}
						ins.ctx.closePath();
						ins.ctx.fill();
					}
				}
				if ( strokePaint !== null ) {
					ins.ctx.strokeStyle = translatePaint( ins, strokePaint );
					for ( var i = 0; i < x.length; ++i ) {
						//  Sort out the step....depends on what the user specified.
						if ( step === null ) {
							if ( yBased )
								var thisW = y[1] - y[0];
							else
								var thisW = x[1] - x[0];
						}
						else if ( typeof( step ) === "number" )
							var thisW = step;
						else
							var thisW = step[i];
						if ( connectOutline ) {
							//  Haven't figured this out yet!
						}
						else {
							if ( drawBase ) {
								ins.ctx.beginPath();
								ins.ctx.moveTo( this.dataXProject( x[i] ) + bufferPix, this.dataYProject( base ) );
								ins.ctx.lineTo( this.dataXProject( x[i] ) + bufferPix, this.dataYProject( y[i] ) );
								ins.ctx.lineTo( this.dataXProject( x[i] + thisW ) - bufferPix, this.dataYProject( y[i] ) );
								ins.ctx.lineTo( this.dataXProject( x[i] + thisW ) - bufferPix, this.dataYProject( base ) );
								ins.ctx.closePath();
								ins.ctx.stroke();
			
							}
							else {
								ins.ctx.beginPath();
								ins.ctx.moveTo( this.dataXProject( x[i] ) + bufferPix, this.dataYProject( base ) );
								ins.ctx.lineTo( this.dataXProject( x[i] ) + bufferPix, this.dataYProject( y[i] ) );
								ins.ctx.lineTo( this.dataXProject( x[i] + thisW ) - bufferPix, this.dataYProject( y[i] ) );
								ins.ctx.lineTo( this.dataXProject( x[i] + thisW ) - bufferPix, this.dataYProject( base ) );
								ins.ctx.stroke();
			
							}
						}
					}
				}
				if ( fillPaint !== null || strokePaint !== null )
					ins.ctx.restore();
				break;
			//  Segments are drawn as a bunch of individual lines.
			//  this.SEGMENTS, segments, strokePaint, lineWidth, lineDash ], insertIt );
			case this.SEGMENTS:
				if ( thisItem.data[2] !== null || thisItem.data[3] !== null || thisItem.data[4] !== null )
					ins.ctx.save();
				if ( thisItem.data[4] !== null )
					ins.ctx.setLineDash( thisItem.data[4] );
				if ( thisItem.data[3] !== null )
					ins.ctx.lineWidth = thisItem.data[3];
				if ( thisItem.data[2] !== null )
					ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[2] );
				this.drawAsSegments( ins, thisItem.data[1] );
				if ( thisItem.data[2] !== null || thisItem.data[3] !== null || thisItem.data[4] !== null )
					ins.ctx.restore();
				break;
			//  Curves in an X-Y plot are pretty trivial - simply connect them with lines.  
			case this.CURVE:
				if ( thisItem.data[3] !== null || thisItem.data[4] !== null || thisItem.data[5] !== null )
					ins.ctx.save();
				if ( thisItem.data[5] !== null )
					ins.ctx.setLineDash( thisItem.data[5] );
				if ( thisItem.data[4] !== null )
					ins.ctx.lineWidth = thisItem.data[4];
				if ( thisItem.data[3] !== null )
					ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[3] );
				this.drawAsCurve( ins, thisItem.data[1], thisItem.data[2] );
				if ( thisItem.data[3] !== null || thisItem.data[4] !== null || thisItem.data[5] !== null )
					ins.ctx.restore();
				break;
			//  Same with loops - they are just like curves with the last point connected to the first.
			case this.LOOP:
				if ( thisItem.data[3] !== null || thisItem.data[4] !== null || thisItem.data[5] !== null )
					ins.ctx.save();
				if ( thisItem.data[5] !== null )
					ins.ctx.setLineDash( thisItem.data[5] );
				if ( thisItem.data[4] !== null )
					ins.ctx.lineWidth = thisItem.data[4];
				if ( thisItem.data[3] !== null )
					ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[3] );
				this.drawAsLoop( ins, thisItem.data[1], thisItem.data[2] );
				if ( thisItem.data[3] !== null || thisItem.data[4] !== null || thisItem.data[5] !== null )
					ins.ctx.restore();
				break;
			//  Polygons are also trivial.  
			case this.POLYGON:
				if ( thisItem.data[3] !== null )
					ins.ctx.save();
				if ( thisItem.data[3] !== null )
					ins.ctx.fillStyle = translatePaint( ins, thisItem.data[3] );
				this.drawAsPolygon( ins, thisItem.data[1], thisItem.data[2] );
				if ( thisItem.data[3] !== null )
					ins.ctx.restore();
				break;
			case this.HOT_POINTS:
				//  The data may take the form of a single point (two numbers) or many
				//  points (two arrays).  Points are added to appropriate "hot" lists
				//  if they are inside the plot limits.
				if ( thisItem.data[1].length === undefined ) {
					var x = this.dataXProject( thisItem.data[1] );
					var y = this.dataYProject( thisItem.data[2] );
					if ( this.isInside( x, y ) )
						this.internalAddHotPoint( this.dataXProject( thisItem.data[1] ), this.dataYProject( thisItem.data[2] ), thisItem.data[3],
									thisItem.data[4], thisItem.data[5], thisItem.data[6], thisItem.data[7], thisItem.data[8],
									thisItem.data[9], thisItem.data[10], thisItem.data[11] );
				}
				//  This happens if the point specifications are arrays.
				else {
					for ( i = 0; i < thisItem.data[1].length; ++i )
						this.internalAddHotPoint( this.dataXProject( thisItem.data[1][i] ), this.dataYProject( thisItem.data[2][i] ), thisItem.data[3],
									thisItem.data[4], thisItem.data[5], thisItem.data[6], thisItem.data[7], thisItem.data[8],
									thisItem.data[9], thisItem.data[10], thisItem.data[11] );
				}
				break;
			case this.IMAGE:
				//  The image is an instance of the ImageRectangle class.  It needs to be scaled
				//  and positioned to match the current axis limits.
				var img = thisItem.data[1];
				img.resize( this.drawX, this.drawY, this.drawW, this.drawH );
				if ( thisItem.data[4] !== null ) {
					if ( thisItem.data[5] !== null ) {
						var xScale = thisItem.data[4] / ( this.xmax - this.xmin );
						var yScale = thisItem.data[5] / ( this.ymax - this.ymin )
						img.setScale( xScale, yScale );
						img.setXY( this.xProject( thisItem.data[2] ), this.yProject( thisItem.data[3] ) );
						//img.setOffset( ( thisItem.data[2] - this.xmin ) * xScale, ( thisItem.data[3] - this.ymin ) * yScale )
					}
					else {
						var xScale = thisItem.data[4] / ( this.xmax - this.xmin );
						img.setScale( xScale );
						img.setXY( this.xProject( thisItem.data[2] ), this.yProject( thisItem.data[3] ) );
						//img.setOffset( ( thisItem.data[2] - this.xmin ) * xScale, ( thisItem.data[3] - this.ymin ) * xScale )
					}
				}
				img.redraw( ins );
				break;
			case this.XGRID_LINE:
				//  Draw a single grid line using specified paint and style at a given x value.
				//  The line will go from the top to the bottom of the plot unless y limits are
				//  given.
				var tVal = this.xProject( thisItem.data[1] );
				if ( !this.xInside( tVal ) )
					break;
				var tMin = thisItem.data[5];
				var tMax = thisItem.data[6];
				if ( tMin === null )
					tMin = this.ymin;
				if ( tMax === null )
					tMax = this.ymax;
				if ( thisItem.data[2] !== null || thisItem.data[3] !== null || thisItem.data[4] !== null )
					ins.ctx.save();
				if ( thisItem.data[4] !== null )
					ins.ctx.setLineDash( thisItem.data[4] );
				if ( thisItem.data[3] !== null )
					ins.ctx.lineWidth = thisItem.data[3];
				if ( thisItem.data[2] !== null )
					ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[2] );
				else if ( this.gridPaint !== null )
					ins.ctx.strokeStyle = translatePaint( ins, this.gridPaint );
				ins.ctx.beginPath();
				ins.ctx.moveTo( tVal, this.yProject( tMin ) );
				ins.ctx.lineTo( tVal, this.yProject( tMax ) );
				ins.ctx.stroke();
				if ( thisItem.data[2] !== null || thisItem.data[3] !== null || thisItem.data[4] !== null )
					ins.ctx.restore();
				break;
			case this.XGRID:
				if ( ( thisItem.data[4] === null || thisItem.data[4] > this.xSpan ) &&
					( thisItem.data[11] === null || thisItem.data[11] < this.xSpan ) ) {  //  Range limited, perhaps!
					//  Draw a series of grid lines using specified paint and style with a step between
					//  them and a start and stop value.
					//  The line will go from the top to the bottom of the plot unless y limits are
					//  given.
					//  Check the "tStep" value to see if it contains some sort of fancy command.
					var tStep = this.interpretXStep( thisItem.data[1] );
					var tStart = thisItem.data[2];
					var tEnd = thisItem.data[3];
					var tMin = thisItem.data[8];
					var tMax = thisItem.data[9];
					if ( tStart === null )
						tStart = this.locateXStart( tStep );
					if ( tEnd === null )
						tEnd = this.locateXEnd( tStart, tStep );
					if ( tMin === null )
						tMin = this.ymin;
					if ( tMax === null )
						tMax = this.ymax;
					if ( thisItem.data[5] !== null || thisItem.data[6] !== null || thisItem.data[7] !== null )
						ins.ctx.save();
					if ( thisItem.data[7] !== null )
						ins.ctx.setLineDash( thisItem.data[7] );
					if ( thisItem.data[6] !== null )
						ins.ctx.lineWidth = thisItem.data[6];
					if ( thisItem.data[5] !== null )
						ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[5] );
					else if ( this.gridPaint !== null )
						ins.ctx.strokeStyle = translatePaint( ins, this.gridPaint );
					var ptMin = this.yProject( tMin );
					var ptMax = this.yProject( tMax );
					var xVal = tStart;
					tEnd = tEnd + tStep / 2;
					var comp = Math.abs( tStep / 10000 );
					while ( ( this.xRange > 0 && xVal < tEnd ) || ( this.xRange < 0 && xVal > tEnd ) ) {
						var useIt = true;
						if ( thisItem.data[10] !== null ) {
							var rem = xVal % thisItem.data[10];
							if ( rem === 0 )
								useIt = false;
							else if ( Math.abs( rem ) < comp )
								useIt = false;
							else if ( Math.abs( Math.abs( rem ) - Math.abs( thisItem.data[10] ) ) < comp )
								useIt = false;
						}
						if ( useIt ) {
							var tVal = this.xProject( xVal );
							if ( this.xInside( tVal ) ) {
								ins.ctx.beginPath();
								ins.ctx.moveTo( tVal, ptMin );
								ins.ctx.lineTo( tVal, ptMax );
								ins.ctx.stroke();
							}
						}
						xVal = xVal + tStep;
					}
					this.lastXStep = tStep;
					if ( thisItem.data[5] !== null || thisItem.data[6] !== null || thisItem.data[7] !== null )
						ins.ctx.restore();
				}
				break;
			case this.DYNAMIC_XGRID:
				if ( ( thisItem.data[4] === null || thisItem.data[4] > this.xSpan ) &&
					( thisItem.data[11] === null || thisItem.data[11] < this.xSpan ) ) {  //  Range limited, perhaps!
					//  Draw a series of grid lines using specified paint and style with a step between
					//  them and a start and stop value.
					//  The line will go from the top to the bottom of the plot unless y limits are
					//  given.
					//  Check the "tStep" value to see if it contains some sort of fancy command.
					var min = thisItem.data[1];
					var max = thisItem.data[2];
					var best = thisItem.data[3];
					if ( min === null )
						min = 2;
					if ( max === null )
						max = 6;
					if ( best === null )
						best = parseInt( min + ( max - min ) / 2 );
					var start = thisItem.data[4];
					if ( start === null )
						start = this.xmin;
					var tEnd = thisItem.data[5];
					if ( tEnd === null )
						tEnd = this.xmax;
					var ret = this.findSteps( start, tEnd, min, max );
					var tStart = this.locateXStart( ret[1] );
					var tStep = ret[1];
					if ( tStart === null )
						tStart = this.locateXStart( tStep );
					if ( tEnd === null )
						tEnd = this.locateXEnd( tStart, tStep );
					tStart = this.checkXStart( tStart, tStep );
					tEnd = this.checkXEnd( tEnd, tStep );
					var tMin = thisItem.data[10];
					var tMax = thisItem.data[11];
					if ( tStart === null )
						tStart = this.locateXStart( tStep );
					if ( tEnd === null )
						tEnd = this.locateXEnd( tStart, tStep );
					if ( tMin === null )
						tMin = this.ymin;
					if ( tMax === null )
						tMax = this.ymax;
					if ( thisItem.data[7] !== null || thisItem.data[8] !== null || thisItem.data[9] !== null )
						ins.ctx.save();
					if ( thisItem.data[9] !== null )
						ins.ctx.setLineDash( thisItem.data[9] );
					if ( thisItem.data[8] !== null )
						ins.ctx.lineWidth = thisItem.data[8];
					if ( thisItem.data[7] !== null )
						ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[7] );
					else if ( this.gridPaint !== null )
						ins.ctx.strokeStyle = translatePaint( ins, this.gridPaint );
					var ptMin = this.yProject( tMin );
					var ptMax = this.yProject( tMax );
					var xVal = tStart;
					tEnd = tEnd + tStep / 2;
					var comp = Math.abs( tStep / 10000 );
					while ( ( this.xRange > 0 && xVal < tEnd ) || ( this.xRange < 0 && xVal > tEnd ) ) {
						var useIt = true;
						if ( thisItem.data[10] !== null ) {
							var rem = xVal % thisItem.data[12];
							if ( rem === 0 )
								useIt = false;
							else if ( Math.abs( rem ) < comp )
								useIt = false;
							else if ( Math.abs( Math.abs( rem ) - Math.abs( thisItem.data[12] ) ) < comp )
								useIt = false;
						}
						if ( useIt ) {
							var tVal = this.xProject( xVal );
							if ( this.xInside( tVal ) ) {
								ins.ctx.beginPath();
								ins.ctx.moveTo( tVal, ptMin );
								ins.ctx.lineTo( tVal, ptMax );
								ins.ctx.stroke();
							}
						}
						xVal = xVal + tStep;
					}
					this.lastXStep = tStep;
					this.lastDynamicXStep = tStep;
					this.lastXFormat = ret[2];
					this.lastXStart = tStart;
					this.lastXEnd = tEnd;
					if ( thisItem.data[7] !== null || thisItem.data[8] !== null || thisItem.data[9] !== null )
						ins.ctx.restore();
				}
				break;
			case this.YGRID_LINE:
				//  Draw a single grid line using specified paint and style at a given y value.
				//  The line will go from the top to the bottom of the plot unless x limits are
				//  given.
				var tVal = this.yProject( thisItem.data[1] );
				if ( !this.yInside( tVal ) )
					break;
				var tMin = thisItem.data[5];
				var tMax = thisItem.data[6];
				if ( tMin === null )
					tMin = this.xmin;
				if ( tMax === null )
					tMax = this.xmax;
				if ( thisItem.data[2] !== null || thisItem.data[3] !== null || thisItem.data[4] !== null )
					ins.ctx.save();
				if ( thisItem.data[4] !== null )
					ins.ctx.setLineDash( thisItem.data[4] );
				if ( thisItem.data[3] !== null )
					ins.ctx.lineWidth = thisItem.data[3];
				if ( thisItem.data[2] !== null )
					ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[2] );
				else if ( this.gridPaint !== null )
					ins.ctx.strokeStyle = translatePaint( ins, this.gridPaint );
				ins.ctx.beginPath();
				ins.ctx.moveTo( this.xProject( tMin ), tVal );
				ins.ctx.lineTo( this.xProject( tMax ), tVal );
				ins.ctx.stroke();
				if ( thisItem.data[2] !== null || thisItem.data[3] !== null || thisItem.data[4] !== null )
					ins.ctx.restore();
				break;
			case this.YGRID:
				if ( ( thisItem.data[4] === null || thisItem.data[4] > this.ySpan ) &&
					( thisItem.data[11] === null || thisItem.data[11] < this.ySpan ) ) {  //  Range limited, perhaps!
					//  Draw a series of grid lines using specified paint and style with a step between
					//  them and a start and stop value.
					var tStep = thisItem.data[1];
					var tStart = thisItem.data[2];
					var tEnd = thisItem.data[3];
					var tMin = thisItem.data[8];
					var tMax = thisItem.data[9];
					if ( tStart === null )
						tStart = this.locateYStart( tStep );
					if ( tEnd === null )
						tEnd = this.locateYEnd( tStart, tStep );
					if ( tMin === null )
						tMin = this.xmin;
					if ( tMax === null )
						tMax = this.xmax;
					if ( thisItem.data[5] !== null || thisItem.data[6] !== null || thisItem.data[7] !== null )
						ins.ctx.save();
					if ( thisItem.data[7] !== null )
						ins.ctx.setLineDash( thisItem.data[7] );
					if ( thisItem.data[6] !== null )
						ins.ctx.lineWidth = thisItem.data[6];
					if ( thisItem.data[5] !== null )
						ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[5] );
					else if ( this.gridPaint !== null )
						ins.ctx.strokeStyle = translatePaint( ins, this.gridPaint );
					var ptMin = this.xProject( tMin );
					var ptMax = this.xProject( tMax );
					var yVal = tStart;
					tEnd = tEnd + tStep / 2;
					var comp = Math.abs( tStep / 10000 );
					while ( yVal < tEnd ) {
						var useIt = true;
						if ( thisItem.data[10] !== null ) {
							var rem = yVal % thisItem.data[10];
							if ( rem === 0 )
								useIt = false;
							else if ( Math.abs( rem ) < comp )
								useIt = false;
							else if ( Math.abs( Math.abs( rem ) - Math.abs( thisItem.data[10] ) ) < comp )
								useIt = false;
						}
						if ( useIt ) {
							var tVal = this.yProject( yVal );
							if ( this.yInside( tVal ) ) {
								ins.ctx.beginPath();
								ins.ctx.moveTo( ptMin, tVal );
								ins.ctx.lineTo( ptMax, tVal );
								ins.ctx.stroke();
							}
						}
						yVal = yVal + tStep;
					}
					this.lastYStep = tStep;
					if ( thisItem.data[5] !== null || thisItem.data[6] !== null || thisItem.data[7] !== null )
						ins.ctx.restore();
				}
				break;
			case this.DYNAMIC_YGRID:
				if ( ( thisItem.data[4] === null || thisItem.data[4] > this.ySpan ) &&
					( thisItem.data[11] === null || thisItem.data[11] < this.ySpan ) ) {  //  Range limited, perhaps!
					//  Draw a series of grid lines using specified paint and style with a step between
					//  them and a start and stop value.
					//  The line will go from the top to the bottom of the plot unless y limits are
					//  given.
					//  Check the "tStep" value to see if it contains some sort of fancy command.
					var min = thisItem.data[1];
					var max = thisItem.data[2];
					var best = thisItem.data[3];
					if ( min === null )
						min = 2;
					if ( max === null )
						max = 6;
					if ( best === null )
						best = parseInt( min + ( max - min ) / 2 );
					var start = thisItem.data[4];
					if ( start === null )
						start = this.ymin;
					var tEnd = thisItem.data[5];
					if ( tEnd === null )
						tEnd = this.ymax;
					var ret = this.findSteps( start, tEnd, min, max );
					var tStart = this.locateYStart( ret[1] );
					var tStep = ret[1];
					if ( tStart === null )
						tStart = this.locateYStart( tStep );
					if ( tEnd === null )
						tEnd = this.locateYEnd( tStart, tStep );
					tStart = this.checkYStart( tStart, tStep );
					tEnd = this.checkYEnd( tEnd, tStep );
					var tMin = thisItem.data[10];
					var tMax = thisItem.data[11];
					if ( tStart === null )
						tStart = this.locateYStart( tStep );
					if ( tEnd === null )
						tEnd = this.locateYEnd( tStart, tStep );
					if ( tMin === null )
						tMin = this.xmin;
					if ( tMax === null )
						tMax = this.xmax;
					if ( thisItem.data[7] !== null || thisItem.data[8] !== null || thisItem.data[9] !== null )
						ins.ctx.save();
					if ( thisItem.data[9] !== null )
						ins.ctx.setLineDash( thisItem.data[9] );
					if ( thisItem.data[8] !== null )
						ins.ctx.lineWidth = thisItem.data[8];
					if ( thisItem.data[7] !== null )
						ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[7] );
					else if ( this.gridPaint !== null )
						ins.ctx.strokeStyle = translatePaint( ins, this.gridPaint );
					var ptMin = this.xProject( tMin );
					var ptMax = this.xProject( tMax );
					var yVal = tStart;
					tEnd = tEnd + tStep / 2;
					var comp = Math.abs( tStep / 10000 );
					while ( yVal < tEnd ) {
						var useIt = true;
						if ( thisItem.data[10] !== null ) {
							var rem = yVal % thisItem.data[12];
							if ( rem === 0 )
								useIt = false;
							else if ( Math.abs( rem ) < comp )
								useIt = false;
							else if ( Math.abs( Math.abs( rem ) - Math.abs( thisItem.data[12] ) ) < comp )
								useIt = false;
						}
						if ( useIt ) {
							var tVal = this.yProject( yVal );
							if ( this.yInside( tVal ) ) {
								ins.ctx.beginPath();
								ins.ctx.moveTo( ptMin, tVal );
								ins.ctx.lineTo( ptMax, tVal );
								ins.ctx.stroke();
							}
						}
						yVal = yVal + tStep;
					}
					this.lastYStep = tStep;
					this.lastDynamicYStep = tStep;
					this.lastYFormat = ret[2];
					this.lastYStart = tStart;
					this.lastYEnd = tEnd;
					if ( thisItem.data[7] !== null || thisItem.data[8] !== null || thisItem.data[9] !== null )
						ins.ctx.restore();
				}
				break;
			case this.XTIC:
				//  Draw a single tic mark at a specified x location.
				var tVal = this.xProject( thisItem.data[1] );
				if ( !this.xInside( tVal ) )
					break;
				var tLine = thisItem.data[4];
				var tSize = thisItem.data[5];
				if ( tLine === null )
					tLine = this.yProject( this.ymin );
				else
					tLine = this.yProject( tLine );
				if ( tSize === null )
					tSize = this.ticSize;
				if ( thisItem.data[2] !== null || thisItem.data[3] !== null )
					ins.ctx.save();
				if ( thisItem.data[3] !== null )
					ins.ctx.lineWidth = thisItem.data[3];
				if ( thisItem.data[2] !== null )
					ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[2] );
				ins.ctx.beginPath();
				ins.ctx.moveTo( tVal, tLine );
				ins.ctx.lineTo( tVal, tLine + tSize );
				ins.ctx.stroke();
				if ( thisItem.data[2] !== null || thisItem.data[3] !== null )
					ins.ctx.restore();
				break;
			case this.XTICS:
				if ( ( thisItem.data[4] === null || thisItem.data[4] > this.xSpan ) &&
					( thisItem.data[10] === null || thisItem.data[10] < this.xSpan ) ) {  //  Range limited, perhaps!
					//  Draws a series of tics along the x-axis
					var tStep = this.interpretXStep( thisItem.data[1] );
					var tStart = thisItem.data[2];
					var tEnd = thisItem.data[3];
					if ( tStart === null ) {
						if ( this.nullXStart !== null )
							tStart = this.nullXStart;
						else
							tStart = this.locateXStart( tStep );
					}
					else
						tStart = this.checkXStart( tStart, tStep );
					if ( tEnd === null ) {
						if ( this.nullXEnd !== null )
							tEnd = this.nullXEnd;
						else
							tEnd = this.locateXEnd( tStart, tStep );
					}
					//  Old stuff?  See note in DYNAMIC_XTICS
					// else
					// 	tEnd = this.locateXEnd( tStart, tStep );
					var tLine = thisItem.data[7];
					var tSize = thisItem.data[8];
					if ( tLine === null ) {
						if ( thisItem.data[12] !== null )
							tLine = this.yProject( this.ymax );
						else
							tLine = this.yProject( this.ymin );
					}
					else
						tLine = this.yProject( tLine );
					var tOff = thisItem.data[13];
					if ( tOff === null )
						tOff = 0;
					if ( tSize === null )
						tSize = this.ticSize;
					if ( thisItem.data[5] !== null || thisItem.data[6] !== null )
						ins.ctx.save();
					if ( thisItem.data[5] !== null )
						ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[5] );
					if ( thisItem.data[6] !== null )
						ins.ctx.lineWidth = thisItem.data[6];
					var xVal = tStart;
					tEnd = tEnd + tStep / 10000;
					var comp = Math.abs( tStep / 10000 );
					while ( ( this.xRange > 0 && xVal <= tEnd ) || ( this.xRange < 0 && xVal >= tEnd ) ) {
						var useIt = true;
						if ( thisItem.data[9] !== null ) {
							var rem = xVal % thisItem.data[9];
							if ( rem === 0 )
								useIt = false;
							else if ( Math.abs( rem ) < comp )
								useIt = false;
							else if ( Math.abs( Math.abs( rem ) - Math.abs( thisItem.data[9] ) ) < comp )
								useIt = false;
						}
						if ( useIt ) {
							var tVal = this.xProject( xVal );
							if ( this.xInside( tVal ) ) {
								ins.ctx.beginPath();
								ins.ctx.moveTo( tVal, tLine - tOff );
								ins.ctx.lineTo( tVal, tLine + tSize - tOff );
								ins.ctx.stroke();
							}
						}
						xVal = xVal + tStep;
					}
					this.lastXStep = tStep;
					//  Draw the line if so instructed - the line goes from the start to end of user
					//  specifications (within plot limits).
					if ( thisItem.data[11] ) {
						if ( thisItem.data[2] === null )
							var startVal = this.xProject( this.xmin );
						else
							var startVal = this.xProject( thisItem.data[2] );
						if ( thisItem.data[3] === null )
							var endVal = this.xProject( this.xmax );
						else
							var endVal = this.xProject( thisItem.data[3] );
						if ( startVal > endVal ) {
							if ( !this.xInside( startVal ) )
								startVal = this.drawX + this.drawW;
							if ( !this.xInside( endVal ) )
								endVal = this.drawX;
						}
						else {
							if ( !this.xInside( startVal ) )
								startVal = this.drawX;
							if ( !this.xInside( endVal ) )
								endVal = this.drawX + this.drawW;
						}
						ins.ctx.beginPath();
						ins.ctx.moveTo( startVal, tLine );
						ins.ctx.lineTo( endVal, tLine );
						ins.ctx.stroke();
					}
					if ( thisItem.data[5] !== null || thisItem.data[6] !== null )
						ins.ctx.restore();
				}
				break;
			case this.DYNAMIC_XTICS:
				if ( ( thisItem.data[6] === null || thisItem.data[6] > this.xSpan ) &&
					( thisItem.data[11] === null || thisItem.data[11] < this.xSpan ) ) {  //  Range limited, perhaps!
					var min = thisItem.data[1];
					var max = thisItem.data[2];
					var best = thisItem.data[3];
					if ( min === null )
						min = 2;
					if ( max === null )
						max = 6;
					if ( best === null )
						best = parseInt( min + ( max - min ) / 2 );
					var tStart = thisItem.data[4];
					if ( tStart === null )
						tStart = this.xmin;
					var tEnd = thisItem.data[5];
					if ( tEnd === null )
						tEnd = this.xmax;
					var ret = this.findSteps( tStart, tEnd, min, max );
					var tStep = ret[1];
					if ( tStart === null ) {
						if ( this.nullXStart !== null )
							tStart = this.nullXStart;
						else
							tStart = this.locateXStart( tStep );
					}
					else
						tStart = this.checkXStart( tStart, tStep );
					//  This stuff was in here previously, but I think it may be trying to solve
					//  a problem that doesn't exist anymore.
					// if ( tEnd === null ) {
					// 		if ( this.nullXEnd !== null )
					// 			tEnd = this.nullXEnd;
					// 		else
					// 			tEnd = this.locateXEnd( tStart, tStep );
					// 	}
					// 	else
					// 		tEnd = this.locateXEnd( tStart, tStep );
					var tLine = thisItem.data[9];
					var tSize = thisItem.data[10];
					if ( tLine === null ) {
						if ( thisItem.data[13] !== null )
							tLine = this.yProject( this.ymax );
						else
							tLine = this.yProject( this.ymin );
					}
					else
						tLine = this.yProject( tLine );
					var tOff = thisItem.data[14];
					if ( tOff === null )
						tOff = 0;
					if ( tSize === null )
						tSize = this.ticSize;
					if ( thisItem.data[7] !== null || thisItem.data[8] !== null )
						ins.ctx.save();
					if ( thisItem.data[7] !== null )
						ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[7] );
					if ( thisItem.data[8] !== null )
						ins.ctx.lineWidth = thisItem.data[8];
					var xVal = tStart;
					if ( thisItem.data[12] ) {
						var startVal = tStart;
						if ( !this.xInside( this.xProject( startVal ) ) )
							startVal = this.drawX;
						else
							startVal = this.xProject( startVal );
						var endVal = tEnd;
						if ( !this.xInside( this.xProject( endVal ) ) )
							endVal = this.drawX + this.drawW;
						else
							endVal = this.xProject( endVal );
						ins.ctx.beginPath();
						ins.ctx.moveTo( startVal, tLine );
						ins.ctx.lineTo( endVal, tLine );
						ins.ctx.stroke();
					}
					tEnd = tEnd + tStep / 10000;
					var comp = Math.abs( tStep / 10000 );
					while ( ( this.xRange > 0 && xVal < tEnd ) || ( this.xRange < 0 && xVal > tEnd ) ) {
						var tVal = this.xProject( xVal );
						if ( this.xInside( tVal ) ) {
							ins.ctx.beginPath();
							ins.ctx.moveTo( tVal, tLine - tOff );
							ins.ctx.lineTo( tVal, tLine + tSize - tOff );
							ins.ctx.stroke();
						}
						xVal = xVal + tStep;
					}
					this.lastXStep = tStep;
					this.lastDynamicXStep = tStep;
					this.lastXFormat = ret[2];
					this.lastXStart = tStart;
					this.lastXEnd = tEnd;
					if ( thisItem.data[7] !== null || thisItem.data[8] !== null )
						ins.ctx.restore();
				}
				break;
			case this.XLABEL:
				var tVal = thisItem.data[1];
				if ( !this.isInside( this.xProject( tVal ) ) )
					break;
				var tComp = this.formatLabel( ins, tVal, thisItem.data[2], thisItem.data[3] );
				this.lastXLabelArg = thisItem.data[3];
				tComp.setCombinedPaint( thisItem.data[4] );
				tComp.setCombinedFontPaint( thisItem.data[4] );
				if ( thisItem.data[5] === null )
					tComp.setFont( this.labelFont );
				else
					tComp.setFont( thisItem.data[5] );
				var tLine = thisItem.data[6];
				if ( tLine === null )
					tLine = this.ymin;
				var tOffset = thisItem.data[7];
				if ( tOffset === null )
					tOffset = 2 * this.ticSize;
				//  Default alignment depends on the direction of the offset.
				if ( thisItem.data[8] === null ) {
					if ( tOffset > 0 )
						tComp.setAlignment( ALIGN_BELOW_MIDDLE );
					else
						tComp.setAlignment( ALIGN_ABOVE_MIDDLE );
				}
				else
					tComp.setAlignment( thisItem.data[8] );
				//  Set the position based on values and specifications.
				tComp.resize( this.xProject( tVal ), this.yProject( tLine ) + tOffset, 0, 0 );
				//  And draw the new label.
				tComp.redraw( ins );
				break;
			case this.XLABELS:
				//, yLineOpposite, xOffset, rotation 14, 15, 16
				if ( ( thisItem.data[4] === null || thisItem.data[4] > this.xSpan ) &&
					( thisItem.data[13] === null || thisItem.data[13] < this.xSpan ) ) {  //  Range limited, perhaps!
					var tStep = this.interpretXStep( thisItem.data[1] );
					var tStart = thisItem.data[2];
					var tEnd = thisItem.data[3];
					//  Make sure there aren't too many steps...
					if ( tStep === 0.0 )
						tStep = tEnd - tStart;
					else if ( tStep < ( tEnd - tStart ) / 10000000.0 )
						tStep = tEnd - tStart;
					if ( tStart === null ) {
						if ( this.nullXStart !== null )
							tStart = this.nullXStart;
						else
							tStart = this.locateXStart( tStep );
					}
					else
						tStart = this.checkXStart( tStart, tStep );
					if ( tEnd === null ) {
						if ( this.nullXEnd !== null )
							tEnd = this.nullXEnd;
						else
							tEnd = this.locateXEnd( tStart, tStep );
					}
					//  Old stuff?  See note in DYNAMIC_XTICS
					// else
					// 	tEnd = this.locateXEnd( tStart, tStep );
					var tLine = thisItem.data[9];
					if ( tLine === null ) {
						if ( thisItem.data[14] !== null )
							tLine = this.ymax;
						else
							tLine = this.ymin;
					}
					var tOffset = thisItem.data[10];
					if ( tOffset === null )
						tOffset = 2 * this.ticSize;
					tLine = this.yProject( tLine ) + tOffset;
					var oOffset = thisItem.data[15];
					if ( oOffset === null )
						oOffset = 0.0;
					var format = thisItem.data[5];
					// if ( format === null && this.nullXFormat > 0 )
					// 	format = this.nullXFormat;
					args = thisItem.data[6];
					var rotation = thisItem.data[16];
					var precisionHint = this.findPrecsion( Number( thisItem.data[2] ).toString(), Number( tStep ).toString() );
					//  Loop through all of the applicable label locations.
					var tVal = tStart;
					tEnd = tEnd + tStep / 10000;
					var comp = Math.abs( tStep / 10000 );
					while ( ( this.xRange > 0 && tVal <= tEnd ) || ( this.xRange < 0 && tVal >= tEnd ) ) {
						var useIt = true;
						if ( thisItem.data[12] !== null ) {
							var rem = tVal % thisItem.data[12];
							if ( rem === 0 )
								useIt = false;
							else if ( Math.abs( rem ) < comp )
								useIt = false;
							else if ( Math.abs( Math.abs( rem ) - Math.abs( thisItem.data[12] ) ) < comp )
								useIt = false;
						}
						if ( useIt && this.xInside( this.xProject( tVal ) ) ) {
							var tComp = this.formatLabel( ins, tVal, format, args, precisionHint );
							//var tComp = this.formatLabel( ins, tVal, 6, thisItem.data[6] );
							this.lastXLabelArg = args;
							tComp.setCombinedPaint( thisItem.data[7] );
							tComp.setCombinedFontPaint( thisItem.data[7] )
							if ( thisItem.data[8] === null )
								tComp.setFont( this.labelFont );
							else
								tComp.setFont( thisItem.data[8] );
							//  Default alignment depends on the direction of the offset.
							if ( thisItem.data[11] === null ) {
								if ( tOffset > 0 )
									tComp.setAlignment( ALIGN_BELOW_MIDDLE );
								else
									tComp.setAlignment( ALIGN_ABOVE_MIDDLE );
							}
							else
								tComp.setAlignment( thisItem.data[11] );
							//  Set the position based on values and specifications.
							tComp.resize( this.xProject( tVal ) + oOffset, tLine, 0, 0 );
							if ( rotation !== null )
								tComp.setRotate( rotation );
							tComp.setFontOutline( thisItem.data[17] );
							tComp.setLineWidth( thisItem.data[18] );
							//  And draw the new label.
							tComp.redraw( ins );
						}
						tVal = tVal + tStep;
					}
					this.lastXStep = tStep;
				}
				break;
			case this.DYNAMIC_DATE_XLABELS:
				var min = thisItem.data[1];
				var max = thisItem.data[2];
				var best = thisItem.data[3];
				if ( min === null )
					min = 2;
				if ( max === null )
					max = 6;
				if ( best === null )
					best = parseInt( min + ( max - min ) / 2 );
				var start = thisItem.data[4];
				if ( start === null )
					start = this.xmin;
				var end = thisItem.data[5];
				if ( end === null )
					end = this.xmax;
				var included = thisItem.data[6];
				if ( included === null )
					included = this.LABEL_ALL;
				var format = thisItem.data[7];
				var args = thisItem.data[8];
				var combinedPaint = thisItem.data[9];
				var font = thisItem.data[10];
				var tLine = thisItem.data[11];
				if ( tLine === null )
					tLine = this.ymin;
				var tOffset = thisItem.data[12];
				if ( tOffset === null )
					tOffset = 2 * this.ticSize;
				tLine = this.yProject( tLine ) + tOffset;
				var alignment = thisItem.data[13];
				//  Get a list of date values that will be labelled.
				var dates = this.findDateSteps( min, max, best, start, end, null, included );
				var yearLabeled = false;
				var monthLabeled = false;
				if ( dates.years !== null ) {
					for ( var i = 0; i < dates.years.length; ++i ) {
						var tVal = this.xProject( dates.years[i] );
						if ( this.xInside( tVal ) ) {
							yearLabeled = true;
							var tComp = this.generateDateText( ins, dates.years[i], "YYYY", args );
							this.drawXLabel( ins, tComp, tVal, tOffset, tLine, combinedPaint, font, alignment );
						}
					}
				}
				if ( dates.months !== null ) {
					var year
					for ( var i = 0; i < dates.months.length; ++i ) {
						var tVal = this.xProject( dates.months[i] );
						if ( this.xInside( tVal ) ) {
							//  If there have been no years labelled on the plot, and this is the first
							//  month label, add the year to it.
							if ( !yearLabeled )
								var tComp = this.generateDateText( ins, dates.months[i], "Mon, YYYY", args );
							else
								var tComp = this.generateDateText( ins, dates.months[i], "Mon", args );
							yearLabeled = true;
							monthLabeled = true;
							this.drawXLabel( ins, tComp, tVal, tOffset, tLine, combinedPaint, font, alignment );
						}
					}
				}
				if ( dates.days !== null ) {
					for ( var i = 0; i < dates.days.length; ++i ) {
						var tVal = this.xProject( dates.days[i] );
						if ( this.xInside( tVal ) ) {
							if ( !monthLabeled )
								var tComp = this.generateDateText( ins, dates.days[i], "Mon D, YYYY", args );
							else
								var tComp = this.generateDateText( ins, dates.days[i], "D", args );
							yearLabeled = true;
							monthLabeled = true;
							this.drawXLabel( ins, tComp, tVal, tOffset, tLine, combinedPaint, font, alignment );
						}
					}
				}
				break;
			case this.DYNAMIC_DATE_XTICS:
				if ( ( thisItem.data[6] === null || thisItem.data[6] > this.xSpan ) &&
					( thisItem.data[11] === null || thisItem.data[11] < this.xSpan ) ) {  //  Range limited, perhaps!
					var min = thisItem.data[1];
					var max = thisItem.data[2];
					var best = thisItem.data[3];
					if ( min === null )
						min = 2;
					if ( max === null )
						max = 6;
					if ( best === null )
						best = parseInt( min + ( max - min ) / 2 );
					var start = thisItem.data[4];
					if ( start === null )
						start = this.xmin;
					var end = thisItem.data[5];
					if ( end === null )
						end = this.xmax;
					var ret = this.findSteps( start, tEnd, min, max );
					var tLine = thisItem.data[9];
					var tSize = thisItem.data[10];
					if ( tLine === null )
						tLine = this.yProject( this.ymin );
					else
						tLine = this.yProject( tLine );
					if ( tSize === null )
						tSize = this.ticSize;
					if ( thisItem.data[7] !== null || thisItem.data[8] !== null )
						ins.ctx.save();
					if ( thisItem.data[7] !== null )
						ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[7] );
					if ( thisItem.data[8] !== null )
						ins.ctx.lineWidth = thisItem.data[8];
					//  Get a list of date values that will be labelled.
					var dates = this.findDateSteps( min, max, best, start, end, null, included );
					if ( dates.years !== null ) {
						for ( var i = 0; i < dates.years.length; ++i )
							this.drawXTic( ins, dates.years[i], tLine, tSize );
					}
					if ( dates.months !== null ) {
						for ( var i = 0; i < dates.months.length; ++i )
							this.drawXTic( ins, dates.months[i], tLine, tSize );
					}
					if ( dates.days !== null ) {
						for ( var i = 0; i < dates.days.length; ++i )
							this.drawXTic( ins, dates.days[i], tLine, tSize );
					}
					if ( dates.hours !== null ) {
						for ( var i = 0; i < dates.hours.length; ++i )
							this.drawXTic( ins, dates.hours[i], tLine, tSize );
					}
					if ( dates.minutes !== null ) {
						for ( var i = 0; i < dates.minutes.length; ++i )
							this.drawXTic( ins, dates.minutes[i], tLine, tSize );
					}
					if ( dates.seconds !== null ) {
						for ( var i = 0; i < dates.seconds.length; ++i )
							this.drawXTic( ins, dates.seconds[i], tLine, tSize );
					}
					// this.lastXStep = tStep;
					// this.lastDynamicXStep = tStep;
					// this.lastXFormat = ret[2];
					// this.lastXStart = tStart;
					// this.lastXEnd = tEnd;
					if ( thisItem.data[7] !== null || thisItem.data[8] !== null )
						ins.ctx.restore();
				}
				break;
			case this.DYNAMIC_XLABELS:
				var min = thisItem.data[1];
				var max = thisItem.data[2];
				var best = thisItem.data[3];
				//  Minimum and maximum are supposed to be the number of labels desired.  Some (guess) defaults...
				if ( min === null )
					min = 2;
				if ( max === null )
					max = 6;
				if ( best === null )
					best = parseInt( min + ( max - min ) / 2 );
				var tStart = thisItem.data[4];
				if ( tStart === null )
					tStart = this.xmin;
				var tEnd = thisItem.data[5];
				if ( tEnd === null )
					tEnd = this.xmax;
				var ret = this.findSteps( tStart, tEnd, min, max );
				var format = thisItem.data[6];
				if ( format === null && ret[2] > 0 )
					format = ret[2];
				var args = thisItem.data[7];
				var combinedPaint = thisItem.data[8];
				if ( thisItem.data[9] === null )
					var font = this.labelFont;
				else
					var font = thisItem.data[9];
				var alignment = thisItem.data[12];
				var tStep = ret[1];
				if ( tStart === null ) {
					if ( this.nullXStart !== null )
						tStart = this.nullXStart;
					else
						tStart = this.locateXStart( tStep );
				}
				else
					tStart = this.checkXStart( tStart, tStep );
				//  This stuff was in here previously, but I think it may be trying to solve
				//  a problem that doesn't exist anymore.
				// if ( tEnd === null ) {
				// 	if ( this.nullXEnd !== null )
				// 		tEnd = this.nullXEnd;
				// 	else
				// 		tEnd = this.locateXEnd( tStart, tStep );
				// }
				// else
				// 	tEnd = this.locateXEnd( tStart, tStep );
				var tLine = thisItem.data[10];
				if ( tLine === null ) {
					if ( thisItem.data[13] !== null )
						tLine = this.ymax;
					else
						tLine = this.ymin;
				}
				var tOffset = thisItem.data[11];
				if ( tOffset === null )
					tOffset = 2 * this.ticSize;
				var oOffset = thisItem.data[14];
				if ( oOffset === null )
					oOffset = 0.0;
				var rotation = thisItem.data[15];
				var outline = thisItem.data[16];
				tLine = this.yProject( tLine ) + tOffset;
				var precisionHint = this.findPrecsion( Number( tStart ).toString(), Number( tStep ).toString() );
				//  Loop through all of the applicable label locations.
				var tVal = tStart;
				tEnd = tEnd + tStep / 10000;
				var comp = Math.abs( tStep / 10000 );
				while ( ( this.xRange > 0 && tVal < tEnd ) || ( this.xRange < 0 && tVal > tEnd )) {
					var useIt = true;
					if ( thisItem.data[12] !== null ) {
						var rem = tVal % thisItem.data[12];
						if ( rem === 0 )
							useIt = false;
						else if ( Math.abs( rem ) < comp )
							useIt = false;
						else if ( Math.abs( Math.abs( rem ) - Math.abs( thisItem.data[12] ) ) < comp )
							useIt = false;
					}
					if ( useIt && this.xInside( this.xProject( tVal ) ) ) {
						var tComp = this.formatLabel( ins, tVal, format, args, precisionHint );
						this.lastXLabelArg = args;
						//tComp.setCombinedPaint( combinedPaint );
						tComp.setCombinedFontPaint( combinedPaint )
						tComp.setFont( font );
						//  Default alignment depends on the direction of the offset.
						if ( alignment === null ) {
							if ( tOffset > 0 )
								tComp.setAlignment( ALIGN_BELOW_MIDDLE );
							else
								tComp.setAlignment( ALIGN_ABOVE_MIDDLE );
						}
						else
							tComp.setAlignment( alignment );
						//  Set the position based on values and specifications.
						tComp.resize( this.xProject( tVal ) + oOffset, tLine, 0, 0 );
						if ( rotation !== null )
							tComp.setRotate( rotation );
						tComp.setFontOutline( thisItem.data[16] );
						tComp.setLineWidth( thisItem.data[17] );
						//  And draw the new label.
						tComp.redraw( ins );
					}
					tVal = tVal + tStep;
				}
				this.lastDynamicXStep = tStep;
				this.lastXFormat = format;
				this.lastXStep = tStep;
				this.lastXStart = tStart;
				this.lastXEnd = tEnd;
				break;
			case this.YTIC:
				//  Draw a single tic mark at a specified x location.
				var tVal = this.yProject( thisItem.data[1] );
				if ( !this.yInside( tVal ) )
					break;
				var tLine = thisItem.data[4];
				var tSize = thisItem.data[5];
				if ( tLine === null )
					tLine = this.xProject( this.xmin );
				else
					tLine = this.xProject( tLine );
				if ( tSize === null )
					tSize = this.ticSize;
				if ( thisItem.data[2] !== null || thisItem.data[3] !== null )
					ins.ctx.save();
				if ( thisItem.data[2] !== null )
					ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[2] );
				if ( thisItem.data[3] !== null )
					ins.ctx.lineWidth = thisItem.data[3];
				ins.ctx.beginPath();
				ins.ctx.moveTo( tLine, tVal );
				ins.ctx.lineTo( tLine - tSize, tVal );
				ins.ctx.stroke();
				if ( thisItem.data[2] !== null || thisItem.data[3] !== null )
					ins.ctx.restore();
				break;		
			case this.YTICS:
				//  Draws a series of tics along the y-axis
				if ( ( thisItem.data[4] === null || thisItem.data[4] > this.ySpan ) &&
					( thisItem.data[10] === null || thisItem.data[10] < this.ySpan ) ) {  //  Range limited, perhaps!
					var tStep = thisItem.data[1];
					var tStart = thisItem.data[2];
					var tEnd = thisItem.data[3];
					//  Make sure there aren't too many steps...
					if ( tStep === 0.0 )
						tStep = tEnd - tStart;
					else if ( tStep < ( tEnd - tStart ) / 10000000.0 )
						tStep = tEnd - tStart;
					if ( tStart === null ) {
						if ( this.nullYStart !== null )
							tStart = this.nullYStart;
						else
							tStart = this.locateYStart( tStep );
					}
					else
						tStart = this.checkYStart( tStart, tStep );
					if ( tEnd === null ) {
						if ( this.nullYEnd !== null )
							tEnd = this.nullYEnd;
						else
							tEnd = this.locateYEnd( tStart, tStep );
					}
					//  Old stuff?  See notes in DYNAMIC_XTICS
					// else
					// 	tEnd = this.locateYEnd( tStart, tStep );
					var tLine = thisItem.data[7];
					var tSize = thisItem.data[8];
					if ( tLine === null ) {
						if ( thisItem.data[12] !== null )
							tLine = this.xProject( this.xmax );
						else
							tLine = this.xProject( this.xmin );
					}
					else
						tLine = this.xProject( tLine );
					var tOff = thisItem.data[13];
					if ( tOff === null )
						tOff = 0;
					if ( tSize === null )
						tSize = this.ticSize;
					if ( thisItem.data[5] !== null || thisItem.data[6] !== null )
						ins.ctx.save();
					if ( thisItem.data[5] !== null )
						ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[5] );
					if ( thisItem.data[6] !== null )
						ins.ctx.lineWidth = thisItem.data[6];
					var yVal = tStart;
					tEnd = tEnd + tStep / 10000;
					var comp = Math.abs( tStep / 10000 );
					while ( ( this.yRange > 0 && yVal < tEnd ) || ( this.yRange < 0 && yVal > tEnd ) ) {
						var useIt = true;
						if ( thisItem.data[9] !== null ) {
							var rem = yVal % thisItem.data[9];
							if ( rem === 0 )
								useIt = false;
							else if ( Math.abs( rem ) < comp )
								useIt = false;
							else if ( Math.abs( Math.abs( rem ) - Math.abs( thisItem.data[9] ) ) < comp )
								useIt = false;
						}
						if ( useIt ) {
							var tVal = this.yProject( yVal );
							if ( this.yInside( tVal ) ) {
								ins.ctx.beginPath();
								ins.ctx.moveTo( tLine + tOff, tVal );
								ins.ctx.lineTo( tLine - tSize + tOff, tVal );
								ins.ctx.stroke();
							}
						}
						yVal = yVal + tStep;
					}
					this.lastYStep = tStep;
					//  Draw the line if so instructed - the line goes from the start to end of user
					//  specifications (within plot limits).
					if ( thisItem.data[11] ) {
						if ( thisItem.data[2] === null )
							var startVal = this.yProject( this.ymin );
						else
							var startVal = this.yProject( thisItem.data[2] );
						if ( thisItem.data[3] === null )
							var endVal = this.yProject( this.ymax );
						else
							var endVal = this.yProject( thisItem.data[3] );
						if ( startVal > endVal ) {
							if ( !this.yInside( startVal ) )
								startVal = this.drawY + this.drawH;
							if ( !this.yInside( endVal ) )
								endVal = this.drawY;
						}
						else {
							if ( !this.yInside( startVal ) )
								startVal = this.drawY;
							if ( !this.yInside( endVal ) )
								endVal = this.drawY + this.drawH;
						}
						ins.ctx.beginPath();
						ins.ctx.moveTo( tLine, startVal );
						ins.ctx.lineTo( tLine, endVal );
						ins.ctx.stroke();
					}

					if ( thisItem.data[5] !== null || thisItem.data[6] !== null )
						ins.ctx.restore();
				}
				break;
			case this.DYNAMIC_YTICS:
				if ( ( thisItem.data[6] === null || thisItem.data[6] > this.ySpan ) &&
					( thisItem.data[11] === null || thisItem.data[11] < this.ySpan ) ) {  //  Range limited, perhaps!
					var min = thisItem.data[1];
					var max = thisItem.data[2];
					var best = thisItem.data[3];
					if ( min === null )
						min = 2;
					if ( max === null )
						max = 6;
					if ( best === null )
						best = parseInt( min + ( max - min ) / 2 );
					var tStart = thisItem.data[4];
					if ( tStart === null )
						tStart = this.ymin;
					var tEnd = thisItem.data[5];
					if ( tEnd === null )
						tEnd = this.ymax;
					var ret = this.findSteps( tStart, tEnd, min, max );
					var tStep = ret[1];
					if ( tStart === null ) {
						if ( this.nullYStart !== null )
							tStart = this.nullYStart;
						else
							tStart = this.locateYStart( tStep );
					}
					else
						tStart = this.checkYStart( tStart, tStep );
					//  Old stuff?  See note in DYNAMICE_XTICS
					// if ( tEnd === null ) {
					// 	if ( this.nullYEnd !== null )
					// 		tEnd = this.nullYEnd;
					// 	else
					// 		tEnd = this.locateYEnd( tStart, tStep );
					// }
					// else
					// 	tEnd = this.locateYEnd( tStart, tStep );
					var tLine = thisItem.data[9];
					var tSize = thisItem.data[10];
					if ( tLine === null ) {
						if ( thisItem.data[13] !== null )
							tLine = this.xProject( this.ymax );
						else
							tLine = this.xProject( this.ymin );
					}
					else
						tLine = this.xProject( tLine );
					var tOff = thisItem.data[14];
					if ( tOff === null )
						tOff = 0;
					if ( tSize === null )
						tSize = this.ticSize;
					if ( thisItem.data[7] !== null || thisItem.data[8] !== null )
						ins.ctx.save();
					if ( thisItem.data[7] !== null )
						ins.ctx.strokeStyle = translatePaint( ins, thisItem.data[7] );
					if ( thisItem.data[8] !== null )
						ins.ctx.lineWidth = thisItem.data[8];
					var yVal = tStart;
					tEnd = tEnd + tStep / 10000;
					var comp = Math.abs( tStep / 10000 );
					while ( ( this.yRange > 0 && yVal < tEnd ) || ( this.yRange < 0 && yVal > tEnd ) ) {
						var tVal = this.yProject( yVal );
						if ( this.yInside( tVal ) ) {
							ins.ctx.beginPath();
							ins.ctx.moveTo( tLine + tOff, tVal );
							ins.ctx.lineTo( tLine - tSize + tOff, tVal );
							ins.ctx.stroke();
						}
						yVal = yVal + tStep;
					}
					this.lastYStep = tStep;
					this.lastDynamicYStep = tStep;
					this.lastYFormat = ret[2];
					this.lastYStart = tStart;
					this.lastYEnd = tEnd;
					if ( thisItem.data[7] !== null || thisItem.data[8] !== null )
						ins.ctx.restore();
				}
				break;
			case this.YLABEL:
				var tVal = thisItem.data[1];
				if ( !this.yInside( this.yProject( tVal ) ) )
					break;
				var tComp = this.formatLabel( ins, tVal, thisItem.data[2], thisItem.data[3] );
				this.lastYLabelArg = thisItem.data[3];
				tComp.setCombinedPaint( thisItem.data[4] );
				tComp.setCombinedFontPaint( thisItem.data[4] );
				if ( thisItem.data[5] === null )
					tComp.setFont( this.labelFont );
				else
					tComp.setFont( thisItem.data[5] );
				var tLine = thisItem.data[6];
				if ( tLine === null )
					tLine = this.xmin;
				else if ( typeof( tLine ) === "string" ) {
					if ( tLine === "max" )
						tLine = this.xmax;
				}
				var tOffset = thisItem.data[7];
				if ( tOffset === null )
					tOffset = 2 * this.ticSize;
				//  Default alignment depends on the direction of the offset.
				if ( thisItem.data[8] === null ) {
					if ( tOffset > 0 )
						tComp.setAlignment( ALIGN_CENTERED_LEFT );
					else
						tComp.setAlignment( ALIGN_CENTERED_RIGHT );
				}
				else
					tComp.setAlignment( thisItem.data[8] );
				//  Set the position based on values and specifications.
				tComp.resize( this.xProject( tLine ) - tOffset, this.yProject( tVal ), 0, 0 );
				//  And draw the new label.
				tComp.redraw( ins );
				break;
			case this.YLABELS:
				//, yLineOpposite, xOffset, rotation 14, 15, 16
				if ( ( thisItem.data[4] === null || thisItem.data[4] > this.xSpan ) &&
					( thisItem.data[13] === null || thisItem.data[13] < this.xSpan ) ) {  //  Range limited, perhaps!
					var tStep = this.interpretYStep( thisItem.data[1] );
					var tStart = thisItem.data[2];
					var tEnd = thisItem.data[3];
					//  Make sure there aren't too many steps...
					if ( tStep === 0.0 )
						tStep = tEnd - tStart;
					else if ( tStep < ( tEnd - tStart ) / 10000000.0 )
						tStep = tEnd - tStart;
					if ( tStart === null ) {
						if ( this.nullYStart !== null )
							tStart = this.nullYStart;
						else
							tStart = this.locateYStart( tStep );
					}
					else
						tStart = this.checkYStart( tStart, tStep );
					if ( tEnd === null ) {
						if ( this.nullYEnd !== null )
							tEnd = this.nullYEnd;
						else
							tEnd = this.locateYEnd( tStart, tStep );
					}
					//  Old stuff?  See note in DYNAMIC_XTICS
					// else
					// 	tEnd = this.locateYEnd( tStart, tStep );
					var tLine = thisItem.data[9];
					if ( tLine === null ) {
						if ( thisItem.data[14] !== null )
							tLine = this.xmax;
						else
							tLine = this.xmin;
					}
					var tOffset = thisItem.data[10];
					if ( tOffset === null )
						tOffset = 2 * this.ticSize;
					tLine = this.xProject( tLine ) + tOffset;
					var oOffset = thisItem.data[15];
					if ( oOffset === null )
						oOffset = 0.0;
					var format = thisItem.data[5];
					// if ( format === null && this.nullYFormat > 0 )
					// 	format = this.nullYFormat;
					args = thisItem.data[6];
					var rotation = thisItem.data[16];
					var precisionHint = this.findPrecsion( Number( thisItem.data[2] ).toString(), Number( tStep ).toString() );
					//  Loop through all of the applicable label locations.
					var tVal = tStart;
					tEnd = tEnd + tStep / 10000;
					var comp = Math.abs( tStep / 10000 );
					while ( ( this.yRange > 0 && tVal <= tEnd ) || ( this.yRange < 0 && tVal >= tEnd ) ) {
						var useIt = true;
						if ( thisItem.data[12] !== null ) {
							var rem = tVal % thisItem.data[12];
							if ( rem === 0 )
								useIt = false;
							else if ( Math.abs( rem ) < comp )
								useIt = false;
							else if ( Math.abs( Math.abs( rem ) - Math.abs( thisItem.data[12] ) ) < comp )
								useIt = false;
						}
						if ( useIt && this.yInside( this.yProject( tVal ) ) ) {
							var tComp = this.formatLabel( ins, tVal, format, args, precisionHint );
							this.lastYLabelArg = args;
							tComp.setCombinedPaint( thisItem.data[7] );
							tComp.setCombinedFontPaint( thisItem.data[7] )
							if ( thisItem.data[8] === null )
								tComp.setFont( this.labelFont );
							else
								tComp.setFont( thisItem.data[8] );
							//  Default alignment depends on the direction of the offset.
							if ( thisItem.data[11] === null ) {
								if ( tOffset > 0 )
									tComp.setAlignment( ALIGN_CENTERED_LEFT );
								else
									tComp.setAlignment( ALIGN_CENTERED_RIGHT );
							}
							else
								tComp.setAlignment( thisItem.data[11] );
							//  Set the position based on values and specifications.
							tComp.resize( tLine, this.yProject( tVal ) + oOffset, 0, 0 );
							if ( rotation !== null )
								tComp.setRotate( rotation );
							tComp.setFontOutline( thisItem.data[17] );
							tComp.setLineWidth( thisItem.data[18] );
							//  And draw the new label.
							tComp.redraw( ins );
						}
						tVal = tVal + tStep;
					}
					this.lastYStep = tStep;
				}
				break;
			case this.DYNAMIC_YLABELS:
				var min = thisItem.data[1];
				var max = thisItem.data[2];
				var best = thisItem.data[3];
				//  Minimum and maximum are supposed to be the number of labels desired.  Some (guess) defaults...
				if ( min === null )
					min = 2;
				if ( max === null )
					max = 6;
				if ( best === null )
					best = parseInt( min + ( max - min ) / 2 );
				var tStart = thisItem.data[4];
				if ( tStart === null )
					tStart = this.ymin;
				var tEnd = thisItem.data[5];
				if ( tEnd === null )
					tEnd = this.ymax;
				var ret = this.findSteps( tStart, tEnd, min, max );
				var format = thisItem.data[6];
				if ( format === null && ret[2] > 0 )
					format = ret[2];
				var args = thisItem.data[7];
				var combinedPaint = thisItem.data[8];
				if ( thisItem.data[9] === null )
					var font = this.labelFont;
				else
					var font = thisItem.data[9];
				var alignment = thisItem.data[12];
				var tStep = ret[1];
				if ( tStart === null ) {
					if ( this.nullYStart !== null )
						tStart = this.nullYStart;
					else
						tStart = this.locateYStart( tStep );
				}
				else
					tStart = this.checkYStart( tStart, tStep );
				//  Old stuff?  See notes in DYNAMIC_XTICS
				// if ( tEnd === null ) {
				// 	if ( this.nullYEnd !== null )
				// 		tEnd = this.nullYEnd;
				// 	else
				// 		tEnd = this.locateYEnd( tStart, tStep );
				// }
				// else
				// 	tEnd = this.locateYEnd( tStart, tStep );
				var tLine = thisItem.data[10];
				if ( tLine === null ) {
					if ( thisItem.data[13] !== null )
						tLine = this.xmax;
					else
						tLine = this.xmin;
				}
				var tOffset = thisItem.data[11];
				if ( tOffset === null )
					tOffset = 2 * this.ticSize;
				var oOffset = thisItem.data[14];
				if ( oOffset === null )
					oOffset = 0.0;
				var rotation = thisItem.data[15];
				tLine = this.xProject( tLine ) + tOffset;
				var precisionHint = this.findPrecsion( Number( tStart ).toString(), Number( tStep ).toString() );
				//  Loop through all of the applicable label locations.
				var tVal = tStart;
				tEnd = tEnd + tStep / 10000;
				var comp = Math.abs( tStep / 10000 );
				while ( ( this.yRange > 0 && tVal < tEnd ) || ( this.yRange < 0 && tVal > tEnd )) {
					var useIt = true;
					if ( thisItem.data[12] !== null ) {
						var rem = tVal % thisItem.data[12];
						if ( rem === 0 )
							useIt = false;
						else if ( Math.abs( rem ) < comp )
							useIt = false;
						else if ( Math.abs( Math.abs( rem ) - Math.abs( thisItem.data[12] ) ) < comp )
							useIt = false;
					}
					if ( useIt && this.yInside( this.yProject( tVal ) ) ) {
						var tComp = this.formatLabel( ins, tVal, format, args, precisionHint );
						this.lastYLabelArg = args;
						//tComp.setCombinedPaint( combinedPaint );
						tComp.setCombinedFontPaint( combinedPaint )
						tComp.setFont( font );
						//  Default alignment depends on the direction of the offset.
						if ( alignment === null ) {
							if ( tOffset > 0 )
								tComp.setAlignment( ALIGN_CENTERED_LEFT );
							else
								tComp.setAlignment( ALIGN_CENTERED_RIGHT );
						}
						else
							tComp.setAlignment( alignment );
						//  Set the position based on values and specifications.
						tComp.resize( tLine, this.yProject( tVal ) + oOffset, 0, 0 );
						if ( rotation !== null )
							tComp.setRotate( rotation );
						tComp.setFontOutline( thisItem.data[16] );
						tComp.setLineWidth( thisItem.data[17] );
						//  And draw the new label.
						tComp.redraw( ins );
					}
					tVal = tVal + tStep;
				}
				this.lastDynamicYStep = tStep;
				this.lastYFormat = format;
				this.lastYStep = tStep;
				this.lastYStart = tStart;
				this.lastYEnd = tEnd;
				break;
			// case this.DYNAMIC_YLABELS:
			// 	var min = thisItem.data[1];
			// 	var max = thisItem.data[2];
			// 	var best = thisItem.data[3];
			// 	//  Minimum and maximum are supposed to be the number of labels desired.  Some (guess) defaults...
			// 	if ( min === null )
			// 		min = 2;
			// 	if ( max === null )
			// 		max = 6;
			// 	if ( best === null )
			// 		best = parseInt( min + ( max - min ) / 2 );
			// 	var start = thisItem.data[4];
			// 	if ( start === null )
			// 		start = this.ymin;
			// 	var tEnd = thisItem.data[5];
			// 	if ( tEnd === null )
			// 		tEnd = this.ymax;
			// 	var ret = this.findSteps( start, tEnd, min, max );
			// 	var format = thisItem.data[6];
			// 	if ( format === null && ret[2] > 0 )
			// 		format = ret[2];
			// 	var args = thisItem.data[7];
			// 	var combinedPaint = thisItem.data[8];
			// 	if ( thisItem.data[9] === null )
			// 		var font = this.labelFont;
			// 	else
			// 		var font = thisItem.data[9];
			// 	var alignment = thisItem.data[12];
			// 	var tStart = this.locateYStart( ret[1] );
			// 	var tStep = ret[1];
			// 	if ( tEnd === null )
			// 		tEnd = this.locateYEnd( tStart, tStep );
			// 	tStart = this.checkYStart( tStart, tStep );
			// 	tEnd = this.checkYEnd( tEnd, tStep );
			// 	var tLine = thisItem.data[10];
			// 	if ( tLine === null )
			// 		tLine = this.xmin;
			// 	var tOffset = thisItem.data[11];
			// 	if ( tOffset === null )
			// 		tOffset = 2 * this.ticSize;
			// 	tLine = this.xProject( tLine ) - tOffset;
			// 	//  Loop through all of the applicable label locations.
			// 	var tVal = tStart;
			// 	tEnd = tEnd + tStep / 10000;
			// 	var comp = Math.abs( tStep / 10000 );
			// 	while ( ( this.yRange > 0 && tVal < tEnd ) || ( this.yRange < 0 && tVal > tEnd ) ) {
			// 		var useIt = true;
			// 		if ( thisItem.data[12] !== null ) {
			// 			var rem = tVal % thisItem.data[12];
			// 			if ( rem === 0 )
			// 				useIt = false;
			// 			else if ( Math.abs( rem ) < comp )
			// 				useIt = false;
			// 			else if ( Math.abs( Math.abs( rem ) - Math.abs( thisItem.data[12] ) ) < comp )
			// 				useIt = false;
			// 		}
			// 		if ( useIt && this.yInside( this.yProject( tVal ) ) ) {
			// 			var tComp = this.formatLabel( ins, tVal, format, args );
			// 			this.lastYLabelArg = args;
			// 			tComp.setCombinedPaint( combinedPaint );
			// 			tComp.setCombinedFontPaint( combinedPaint )
			// 			tComp.setFont( font );
			// 			//  Default alignment depends on the direction of the offset.
			// 			if ( alignment === null ) {
			// 				if ( tOffset > 0 )
			// 					tComp.setAlignment( ALIGN_CENTERED_LEFT );
			// 				else
			// 					tComp.setAlignment( ALIGN_CENTERED_RIGHT );
			// 		}
			// 			else
			// 				tComp.setAlignment( thisItem.data[11] );
			// 			//  Set the position based on values and specifications.
			// 			tComp.resize( tLine, this.yProject( tVal ), 0, 0 );
			// 			//  And draw the new label.
			// 			tComp.redraw( ins );
			// 		}
			// 		tVal = tVal + tStep;
			// 	}
			// 	this.lastYStep = tStep;
			// 	this.lastDynamicYStep = tStep;
			// 	this.lastYFormat = format;
			// 	this.lastYStart = tStart;
			// 	this.lastYEnd = tEnd;
			// 	break;
			default:
				//  We don't recognize this instruction, so it may belong to the BasePlot class.
				super.drawDataItem( ins, thisItem );
				break;
		}
	};

	//  This is a slightly kludgy thing to do.  These functions return the last arguments used in
	//  a function call to create labels in X and Y.  You might want this if you intend to duplicate
	//  the format of the labels in some way - for instance, this value might be the precision of
	//  the label.  When you use these you should accommodate a null return.
	getLastXLabelArg() {
		if ( this.lastXLabelArg === undefined )
			return null;
		return this.lastXLabelArg;
	}

	getLastYLabelArg() {
		if ( this.lastYLabelArg === undefined )
			return null;
		return this.lastYLabelArg;
	}

	//  Function to draw a "curve" connecting a bunch of points.  This allows the process to be
	//  overridden (wrapping in "map" plots requires this, for instance).
	drawAsCurve( ins, x, y ) {
		ins.ctx.beginPath();
		ins.ctx.moveTo( this.dataXProject( x[0] ), this.dataYProject( y[0] ) );
		for ( var i = 0; i < x.length; ++i )
			ins.ctx.lineTo( this.dataXProject( x[i] ), this.dataYProject( y[i] ) );
		ins.ctx.stroke();
	};

	//  Draws a "loop" or a closed curve.  Basically the same as the drawAsCurve()
	//  function, but with a "closePath" instruction.
	drawAsLoop( ins, x, y ) {
		ins.ctx.beginPath();
		ins.ctx.moveTo( this.dataXProject( x[0] ), this.dataYProject( y[0] ) );
		for ( var i = 0; i < x.length; ++i )
			ins.ctx.lineTo( this.dataXProject( x[i] ), this.dataYProject( y[i] ) );
		ins.ctx.closePath();
		ins.ctx.stroke();
	};

	//  Function to draw a bunch of independent segments.  This allows the process to be
	//  overridden (wrapping in "map" plots requires this, for instance).
	drawAsSegments( ins, segments ) {
		for ( i = 0; i < segments.length; ++i ) {
			ins.ctx.beginPath();
			ins.ctx.moveTo( this.dataXProject( segments[i][0] ), this.dataYProject( segments[i][1] ) );
			ins.ctx.lineTo( this.dataXProject( segments[i][2] ), this.dataYProject( segments[i][3] ) );
			ins.ctx.stroke();
		}
	};

	//  Function to draw a "polygon" connecting a bunch of points.  This allows the process to be
	//  overridden (wrapping in "map" plots requires this, for instance).
	drawAsPolygon( ins, x, y ) {
		ins.ctx.beginPath();
		ins.ctx.moveTo( this.dataXProject( x[0] ), this.dataYProject( y[0] ) );
		for ( var i = 0; i < x.length; ++i )
			ins.ctx.lineTo( this.dataXProject( x[i] ), this.dataYProject( y[i] ) );
		ins.ctx.closePath();
		ins.ctx.fill();
	};

	//  Helper function to eliminate repetitive code.
	drawXTic( ins, value, tLine, tSize )  {
		var tVal = this.xProject( value );
		if ( this.xInside( tVal ) ) {
			ins.ctx.beginPath();
			ins.ctx.moveTo( tVal, tLine );
			ins.ctx.lineTo( tVal, tLine + tSize );
			ins.ctx.stroke();
		}
	}

	//  Helper function to draw a label on the x-axis.
	drawXLabel( ins, tComp, tVal, tOffset, tLine, combinedPaint, font, alignment ) {
		tComp.setCombinedPaint( combinedPaint );
		tComp.setCombinedFontPaint( combinedPaint );
		if ( font === null )
			tComp.setFont( this.labelFont );
		else
			tComp.setFont( font );
		//  Default alignment depends on the direction of the offset.
		if ( alignment === null ) {
			if ( tOffset > 0 )
				tComp.setAlignment( ALIGN_BELOW_MIDDLE );
			else
				tComp.setAlignment( ALIGN_ABOVE_MIDDLE );
		}
		else
			tComp.setAlignment( alignment );
		//  Set the position based on values and specifications.
		tComp.resize( tVal, tLine, 0, 0 );
		//  And draw the new label.
		tComp.redraw( ins );
	}

	//  Given a step value, locate the start of x-axis grid lines or labels that make sense
	//  given the limits on the plot.  This function is expected to be overridden by inheriting
	//  plot types if it is not applicable.
	locateXStart( tStep ) {
		var tStart = Math.floor( this.xmin / tStep ) * tStep;
		//  This value might be outside the limits of the plot - find the next one inside.
		if ( tStart < this.xmin )
			tStart = tStart + tStep;
		return tStart;
	}

	//  Check the given start to make sure it is on the plot.
	checkXStart( tStart, tStep ) {
		if ( this.xRange < 0 ) {
			while ( tStart > this.xmin )
				tStart += tStep;
		}
		else {
			while ( tStart < this.xmin )
				tStart += tStep;
		}
		return tStart;
	}

	//  Given a starting value and a step value, find the ending value within the current plot
	//  limits.
	locateXEnd( tStart, tStep ) {
		var tEnd = tStart;
		if ( this.xRange < 0 ) {
			if ( tStep > 0 )
				tStep = -tStep;
			while ( tEnd > this.xmax )
				tEnd = tEnd + tStep;
		}
		else {
			while ( tEnd < this.xmax )
				tEnd = tEnd + tStep;
		}
		return tEnd;
	}

	//  Check the given end to make sure it is on the plot.
	checkXEnd( tEnd, tStep ) {
		if ( this.xRange < 0 ) {
			while ( tEnd < this.xmax )
				tEnd -= tStep;
		}
		else {
			while ( tEnd > this.xmax )
				tEnd -= tStep;
		}
		return tEnd;
	}

	//  Given a step value, locate the start of y-axis grid lines or labels that make sense
	//  given the limits on the plot.  This function is expected to be overridden by inheriting
	//  plot types if it is not applicable.
	locateYStart( tStep ) {
		var tStart = Math.floor( this.ymin / tStep ) * tStep;
		//  This value might be outside the limits of the plot - find the next one inside.
		if ( tStart < this.ymin )
			tStart = tStart + tStep;
		return tStart;
	}

	//  Check the given start to make sure it is on the plot.
	checkYStart( tStart, tStep ) {
		while ( tStart < this.ymin )
			tStart += tStep;
		return tStart;
	}

	//  Given a starting value and a step value, find the ending y value within the current plot
	//  limits.
	locateYEnd( tStart, tStep ) {
		var tEnd = tStart;
		if ( this.yRange < 0 ) {
			if ( tStep > 0 )
				tStep = -tStep;
			while ( tEnd > this.ymax )
				tEnd = tEnd + tStep;
		}
		else {
			while ( tEnd < this.ymax )
				tEnd = tEnd + tStep;
		}
		return tEnd;
	}

	//  Check the given end to make sure it is on the plot.
	checkYEnd( tEnd, tStep ) {
		while ( tEnd > this.ymax )
			tEnd -= tStep;
		return tEnd;
	}

	//  Interpret an x step request.  This might be a number, in which case it is returned
	//  without much fuss.  If it is a string, however, it needs to be interpreted.  The string
	//  may contain keywords "last" and "lastDynamic", and may be followed by a "*" or a "/" and
	//  a number (or nothing at all).
	interpretXStep( tVal ) {
		//  These three values provide defaults for things when the user appies "last" step values,
		//  but does not specify format, start, or end.
		this.nullXFormat = null;
		this.nullXStart = null;
		this.nullXEnd = null;
		//  Interpret the value - it might be a string.
		if ( typeof( tVal ) === "string" ) {
			this.nullXFormat = this.lastXFormat;
			this.nullXStart = this.lastXStart;
			this.nullXEnd = this.lastXEnd;
			if ( tVal === "lastDynamic" )
				return this.lastDynamicXStep;
			else if ( tVal === "last" )
				return this.lastXStep;
		}
		else if ( tVal > 0 && this.xRange < 0 )
			return -tVal;
		else
			return tVal;
	}

	//  Interpret an y step request.  This might be a number, in which case it is returned
	//  without much fuss.  If it is a string, however, it needs to be interpreted.  The string
	//  may contain keywords "last" and "lastDynamic", and may be followed by a "*" or a "/" and
	//  a number (or nothing at all).
	interpretYStep( tVal ) {
		//  These three values provide defaults for things when the user appies "last" step values,
		//  but does not specify format, start, or end.
		this.nullYFormat = null;
		this.nullYStart = null;
		this.nullYEnd = null;
		//  Interpret the value - it might be a string.
		if ( typeof( tVal ) === "string" ) {
			this.nullYFormat = this.lastYFormat;
			this.nullYStart = this.lastYStart;
			this.nullYEnd = this.lastYEnd;
			if ( tVal === "lastDynamic" )
				return this.lastDynamicYStep;
			else if ( tVal === "last" )
				return this.lastYStep;
		}
		else if ( tVal > 0 && this.yRange < 0 )
			return -tVal;
		else
			return tVal;
	}

	//=============================================================================
	//                                                                    ___                              ___ 
	//                                                                    `MM                              `MM 
	//                                        /                            MM           /                   MM 
	//    ____  ____    ___  ____  ___  __   /M           ___  __   ____   MM    ___   /M      ____     ____MM 
	//   6MMMMb `MM(    )M' 6MMMMb `MM 6MMb /MMMMM        `MM 6MM  6MMMMb  MM  6MMMMb /MMMMM  6MMMMb   6MMMMMM 
	//  6M'  `Mb `Mb    d' 6M'  `Mb MMM9 `Mb MM            MM69 " 6M'  `Mb MM 8M'  `Mb MM    6M'  `Mb 6M'  `MM 
	//  MM    MM  YM.  ,P  MM    MM MM'   MM MM            MM'    MM    MM MM     ,oMM MM    MM    MM MM    MM 
	//  MMMMMMMM   MM  M   MMMMMMMM MM    MM MM            MM     MMMMMMMM MM ,6MM9'MM MM    MMMMMMMM MM    MM 
	//  MM         `Mbd'   MM       MM    MM MM            MM     MM       MM MM'   MM MM    MM       MM    MM 
	//  YM    d9    YMP    YM    d9 MM    MM YM.  ,        MM     YM    d9 MM MM.  ,MM YM.  ,YM    d9 YM.  ,MM 
	//   YMMMM9      M      YMMMM9 _MM_  _MM_ YMMM9       _MM_     YMMMM9 _MM_`YMMM9'Yb.YMMM9 YMMMM9   YMMMMMM_
	//                                                                                                         
	//=============================================================================

	//  This function changes the limits on the plot to encompass only that portion contained
	//  within the given pixel locations.  This is expected to be smaller than the existing
	//  plot although that is not a limitation baked into this code.
	overlaySlice( x, y, w, h ) {
		var pt1 = this.deproject( x, y )
		var pt2 = this.deproject( x + w, y + h );
		if ( pt1[0] > pt2[0] && this.xmin < this.xmax ) {
			var lowX = pt2[0];
			var highX = pt1[0];
		}
		else {
			var lowX = pt1[0];
			var highX = pt2[0];
		}
		if ( pt1[1] > pt2[1] && this.ymin < this.ymax ) {
			var lowY = pt2[1];
			var highY = pt1[1];
		}
		else {
			var lowY = pt1[1];
			var highY = pt2[1];
		}
		this.newXLimits( lowX, highX );
		this.newYLimits( lowY, highY );
		this.doRedraw();
	};

	//  This function is used in response to a drag event, where the drag began within
	//  the plot limits.  
	repositionDrag( event ) {
		//  This is fairly easy - deproject the new position and find out how much
		//  the x and y limits will have to change to get there.  Then try to change
		//  them.
		var pt = this.deproject( event.px, event.py );
		//  Change x limits first.  We can't just throw these at "newXLimits()" because
		//  that function can change only one or the other under certain circumstances.
		//  We don't want that, we want the behavior to act like a sliding window.
		var ret = false;
		if ( this.pushEventXVal !== null ) {
			var desiredRange = this.xmax - this.xmin;
			var diff = this.pushEventXVal - pt[0];
			//  Check against "hard" limits.
			var lVal = this.xmin + diff;
			var hVal = this.xmax + diff;
			if ( !this.softXLimits ) {
				if ( lVal < hVal ) {
					if ( lVal < this.originalXmin ) {
						lVal = this.originalXmin;
						hVal = lVal + desiredRange;
					}
					if ( hVal > this.originalXmax ) {
						hVal = this.originalXmax;
						lVal = hVal - desiredRange;
					}
				}
				else {
					//  The low and high limits are reversed.
					if ( lVal > this.originalXmin ) {
						lVal = this.originalXmin;
						hVal = lVal + desiredRange;
					}
					if ( hVal < this.originalXmax ) {
						hVal = this.originalXmax;
						lVal = hVal - desiredRange;
					}
				}
			}
			else {
				if ( this.hardXmin !== null && lVal < this.hardXmin ) {
					lVal = this.hardXmin;
					hVal = lVal + desiredRange;
				}
				if ( this.hardXmax !== null && hVal > this.hardXmax ) {
					hVal = this.hardXmax;
					lVal = hVal - desiredRange;
				}
			}
			this.newXLimits( lVal, hVal );
			ret = true;
			this.doRedraw();
		}
		if ( this.pushEventYVal !== null ) {
			var desiredRange = this.ymax - this.ymin;
			var diff = this.pushEventYVal - pt[1];
			//  Check against "hard" limits.
			var lVal = this.ymin + diff;
			var hVal = this.ymax + diff;
			if ( !this.softYLimits ) {
				if ( lVal < hVal ) {
					if ( lVal < this.originalYmin ) {
						lVal = this.originalYmin;
						hVal = lVal + desiredRange;
					}
					if ( hVal > this.originalYmax ) {
						hVal = this.originalYmax;
						lVal = hVal - desiredRange;
					}
				}
				else {
					//  The low and high limits are reversed.
					if ( lVal > this.originalYmin ) {
						lVal = this.originalYmin;
						hVal = lVal + desiredRange;
					}
					if ( hVal < this.originalYmax ) {
						hVal = this.originalYmax;
						lVal = hVal - desiredRange;
					}
				}
			}
			else {
				if ( this.hardYmin !== null && lVal < this.hardYmin ) {
					lVal = this.hardYmin;
					hVal = lVal + desiredRange;
				}
				if ( this.hardYmax !== null && hVal > this.hardYmax ) {
					hVal = this.hardYmax;
					lVal = hVal - desiredRange;
				}
			}
			this.newYLimits( lVal, hVal );
			ret = true;
			this.doRedraw();
		}
		return ret;
	};

	//  Save the plot location of a push event.
	mousePush( event, x, y ) {
		if ( this.mouseInside ) {
			this.pushEventXVal = this.deprojectX( event.px );
			this.pushEventYVal = this.deprojectY( event.py );
			return true;
		}
		else {
			if ( this.xZoomOn && this.insideXZoomBuffer( event.px, event.py ) )
				this.pushEventXVal = this.deprojectX( event.px );
			else
				this.pushEventXVal = null;
			if ( this.yZoomOn && this.insideYZoomBuffer( event.px, event.py ) )
				this.pushEventYVal = this.deprojectY( event.py );
			else
				this.pushEventYVal = null;
		}
		return false;
	};

	//  The mouseMove event allows us to track where we are on a plot.  It is only used
	//  if the user turns it on.
	mouseMove( event, x, y ) {
		//  If the event is outside, we send a null as its position.  Inside we send
		//  the projection (the values in X and Y based on the limits) of its position.
		//  If necessary, you can get the X and Y pixel values from the event (which is
		//  always sent to the conditional callback).
		if ( this.eventInside( event ) ) {
			this.doPlotCallback( this.MOUSE_MOVE_CONDITION, event, [this.deprojectX( event.px ), this.deprojectY( event.py )] );
		}
		this.doPlotCallback( this.MOUSE_MOVE_CONDITION, event, null );
		super.mouseMove( event, x, y );
	}

}

//mouseEnter( event, x, y ) {
//	console.info( "mouse enter at " + x + ", " + y + "\n" );
//};
//
//mouseLeave( event, x, y ) {
//	console.info( "mouse leave at " + x + ", " + y + "\n" );
//};
//
//mouseRelease( event, x, y ) {
//	console.info( "mouse release at " + x + ", " + y + "\n" );aaaaa
//};
//
//mouseDrop( event, x, y ) {
//	console.info( "mouse drop at " + x + ", " + y + "\n" );
//};
//
//mouseClick( event, x, y ) {
//	console.info( "mouse click at " + x + ", " + y + "\n" );
//};
//
//mouseDrag( event, x, y ) {
//	console.info( "mouse drag at " + x + ", " + y + "\n" );
//};
//
//mouseWheel( event, x, y ) {
//	console.info( "mouse wheel at " + x + ", " + y + " scale is now " + this.xScale + "\n" );
//};










// (helper functions.js)

function mapped_number() {
    // creates a random number beetween 0 and 1
    var num = Math.random();

    //makes the range of the number beetween .5 and 1.5
    num += .5;

    // the return value is multiplied by a number to create random variation
    return num;
}


class NCurve {
    constructor(num = null, 
        mean = null, 
        stddev = null, 
        zScore = null) {

            this.num = num;
            this.mean = mean;
            this.stddev = stddev;
            if (zScore != null){
                this.zScore = zScore;
            }
            else {
                this.zScore = this.Zscore;
            }

        }

    get Zscore() {
        return (this.num - this.mean) / this.stddev;
    }

    get StdDev() {
        return (this.num - this.mean) / this.zScore;
    }
  }
  





// (population.js)

class population {


    initial; // initial value of the population

    population_curve; // stores the normalized curve instance that hholds the data for the population

    dependencies; // a list of other populations it depends on

    predatory_decrement; // how impacted the population is by it's predators 

    data = []; // a list of the population number for every instance of the run function

    constructor(initial_pop, mean, stddev){

        this.initial = initial_pop;

        this.population_curve = new NCurve(initial_pop, mean, stddev);

        this.dependencies = [];

        this.predatory_decrement = 0;

        this.data.push(initial_pop);

    }


    dependencies_calc(){


        var final = 0; //value to be returned
        // returns how well a certain population has done based
        // on the success of it's dependencies

        var dp_type_scores = []; // the values stored from each type of dependency

        var importance = []; // the importance of each dependency type

        //console.log(this.dependencies);



        for (var dp_type_num = 0;  dp_type_num < this.dependencies.length; dp_type_num++){

            var dependencyType = this.dependencies[dp_type_num];


            var score = 0; // how well the population is doing for each dependency type


            for (var dependency_num = 0; dependency_num < dependencyType[0].length ; dependency_num++){
                // the first item  in dependencyType is a list of each...
                // dependency that supplies for that type, the second is the importance

                


                var dependency = dependencyType[0][dependency_num][0];
                var dependency_importance = dependencyType[0][dependency_num][1];


                

                // how well each dependency source supplies that dependency
                score += dependency.population_curve.zScore * dependency_importance;
                // how well a population is doing ^ * it's importance ^
                

                dependency.predatory_decrement += this.population_curve.Zscore * dependency_importance * this.population_curve.stddev;
                // adds the success of this population to the predatory_decrement of the dependency source...
                // since the source should do badly if it's predators are doing well

            }

            importance.push(dependencyType[1]); // appends the importance of each dependency type to the "importances" list

            dp_type_scores.push(score); // appends the score which was stored in the score variable and modified ...
            // by the giant for block
        }

        for (var i = 0; i < dp_type_scores.length;i++){
            final += dp_type_scores[i] * importance[i];
        }
        return final;
    }

    increment(){
        //this function is the heart of the simulation, it is called on every population in every run instance
        // it is called in the run method of environment

        var pop = this.population_curve.num;
        //^ variable is created to store the previose population number
        // so that it can be used by the rest of the simulation

        this.population_curve.num += Math.floor((this.dependencies_calc() / 150) * this.population_curve.stddev * mapped_number());
        // ^ adding the success of dependencies to the population

        this.population_curve.num -= Math.floor((this.predatory_decrement / 20) * mapped_number());
        // ^ reducing population by the success of predators

        this.predatory_decrement = 0;
        // ^ resseting the score for success of the predators

        // returning previose population number to stay consistent 

        this.data.push(this.population_curve.num);

        return pop;
    }

    print(name = null){
        if (name != null){
            console.log(name, ":");
        }

        console.log("mean ", this.population_curve.mean, "number: ", this.population_curve.num, "standard dev: ", this.population_curve.stddev, "\n");
    }

};









//environment.js

class environment {

    populations = {};

    env_data = {};

    stop;

    runtimes = 0;

    printPop(){
        console.log("this.populations: \n")
        console.log(this.populations);

        for (let key in this.populations) {
            console.log("key = " + key);
            console.log(" \n(this.populations)[key] \n")
            console.log(this.populations[key]);
            console.log(this.populations[key], " = ", this.populations[key].print());            
        }
    }

    pop_setup(){
        this.populations["birds"] = new population(500, 450, 100);
        this.populations["worms"] = new population(2500, 3000, 400);
        this.populations["birds"].dependencies = [[[[this.populations["worms"],1]],1]];

        //this function is no longer called, the  "setup" function in this class is currently what is run...
        //and sets up the populations based on user input
    }

    run(){


        this.runtimes++
        if (this.stop == undefined){
            return;
        }

        var iteration = 0;


        for (const population in this.populations) {
            this.env_data[population] = [];
        }

        var plz_break = false;
  

        while(true){




            var New = this.populations;
            // ^ creating new copy of population values to store new values...
            // isolated from old ones that the simulation is running on

            var extinct = [];

            for (const population in New) {

                New[population].increment();

                //console.log(`${population}: ${New[population].population_curve.num}`);
                
                if (New[population].population_curve.num <= 0){
                    extinct.push(population);
                }

                this.env_data[population] = this.populations[population].data;
            }

            iteration++;


            if (iteration >= this.stop){
                plz_break = true;
            }

            for (const extinct_index in extinct){
                var ex = extinct[extinct_index];
                delete New[ex];
                plz_break = true;
            }
            this.populations = New;
            

            if (plz_break){
                return;
            }            
        }


        /* for (const population in this.populations) {
            this.env_data[population] = this.populations[population].data;
        } */
    }
}



// (simulation.js)

env = new environment();
env.pop_setup();
env.run();







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