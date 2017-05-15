// touchhandler.js
// Copyright 2013 by Phillip Nguyen
//
// HOW TO USE THIS:
// 1. Include this script: <script src="touchhandler.js"></script>
// 2. It exposes exactly one function, enableTouchEvents.  For a given HTML element,
//    call enableTouchEvents(element) to add all of the touch/mouse event listeners
//    to that element.
// 3. Then add methods to the element for the events you wish to handle.
//    The following event names are used:
//       press -- mouse/finger pressed down.
//       longPress -- mouse/finger pressed in same position for long time
//       endPress -- mouse/finger lifted up
//       tap -- mouse/finger pressed, then quickly released.
//       doubleTap -- mouse/finger tapped twice in quick succession
//       drag -- mouse/finger moved after being pressed
//       move -- mouse pointer moved (without a preceding press)
//
//  Example:
//  var canvas = $("#myCanvas")[0];
//  enableTouchEvents(canvas);
//  canvas.doubleTap = function(event) { console.log("doubleTap"); };
//
function enableTouchEvents(element) {

    element.addEventListener("mousedown", touchStart);
    element.addEventListener("touchstart", touchStart);

    element.addEventListener("mouseup", touchEnd);
    element.addEventListener("touchend", touchEnd);

    element.addEventListener("mousemove", touchMove);	  
    element.addEventListener("touchmove", touchMove);

    element.addEventListener("touchcancel", touchCancel);
    
    var touchHandler = { hasTouch: 'ontouchstart' in window,
			 pressDuration: 300, 
			 motionThreshold: 12,
			 doubleTapInterval: 300,
			 doubleTapDistanceThreshold: 30
		       };

    // Add touchHandler object as property of the element
    // so that user can change touch settings.
    element.touchHandler = touchHandler;

    function touchStart(event) {
	var timeStamp = event.timeStamp || +new Date();

	event.preventDefault();
	// Cancel if multiple touches.
	if (touchHandler.hasTouch && event.touches.length > 1) {
	    return;
	}
	var touch = touchHandler.hasTouch ? (event.targetTouches[0] || event.touches[0]) : event;
	touchHandler.start = {x: touch.pageX, y: touch.pageY };
	touchHandler.timeStamp = timeStamp;
	touchHandler.motion = false;
	touchHandler.cancel = false;
	touchHandler.press = false;
	touchHandler.pressCallback = setTimeout(function() {
	    if (!touchHandler.motion) {
		touchHandler.press = true;
		// Fire a press event.
		if (element.longPress) {
		    element.longPress(touch);
		}
	    }
	}, touchHandler.pressDuration);

	// Fire a touch event?
	if (element.press) {
	    element.press(touch);
	}
    }

    function touchEnd(event) {
	var timeStamp = event.timeStamp || +new Date();
	
	event.preventDefault();
	var touch = touchHandler.hasTouch ? (event.targetTouches[0] || event.changedTouches[0] || event.touches[0]) : event;
	
	// Cancel press timeout.
	clearTimeout(touchHandler.pressCallback);

	// If no motion and no cancel and no press then fire a tap event.
	if (!touchHandler.motion && !touchHandler.cancel && !touchHandler.press) {

	    // This is a double tap if:
	    // 1. there exists a previous tap.
	    // 2. the previous tap ended within tapInterval.
	    // 3. the previous tap and this tap are not too far away.
	    if (touchHandler.previousTap && 
		timeStamp - touchHandler.previousTime < touchHandler.doubleTapInterval &&
		Math.abs(touchHandler.previousTap.x - touchHandler.start.x) < touchHandler.doubleTapDistanceThreshold &&
		Math.abs(touchHandler.previousTap.y - touchHandler.start.y) < touchHandler.doubleTapDistanceThreshold) {
		// Fire a double tap event.
		if (element.doubleTap) {
		    element.doubleTap(touch);
		}
		
		// Prevent a future double tap from firing.
		touchHandler.previousTap = false;
	    } else {
		// Fire a tap event.
		if (element.tap) {
		    element.tap(touch);
		}

		// Store info for double tap.
		touchHandler.previousTap = touchHandler.start;
		touchHandler.previousTime = timeStamp;
	    }
	}

	touchHandler.start = false;

	// Fire touch end event?
	if (element.endPress) {
	    element.endPress(touch);
	}
    }

    function touchMove(event) {
	event.preventDefault();
	var touch = touchHandler.hasTouch ? (event.targetTouches[0] || event.changedTouches[0] || event.touches[0]) : event;

	if (touchHandler.start && !touchHandler.motion) {
	    var delta = {x: touch.pageX - touchHandler.start.x, y: touch.pageY - touchHandler.start.y};

	    // If we haven't moved that far from the start position,
	    // then we don't count it as true movement event.
	    if (Math.abs(delta.x) <= touchHandler.motionThreshold && 
		Math.abs(delta.y) <= touchHandler.motionThreshold)
		return;
	}
	
	touchHandler.motion = true;
	
	// Cancel press timeout.
	clearTimeout(touchHandler.pressCallback);
	
	// Fire a drag event.
	if (touchHandler.start && element.drag) {
	    element.drag(touch);
	} else if (element.move) {
	    element.move(touch);
	}
    }

    // Not really sure what this event is.
    function touchCancel(event) {
	event.preventDefault();
	var touch = touchHandler.hasTouch ? (event.targetTouches[0] || event.changedTouches[0] || event.touches[0]) : event;
	touchHandler.cancel = true;
	touchHandler.previousTap = false;
	touchHandler.start = false;
    }

}
