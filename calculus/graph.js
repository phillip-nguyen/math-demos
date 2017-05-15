// GRAPH.js module
// Copyright 2014 Phillip Nguyen.
// All rights reserved.
//
// Usage:
// var graph = new GRAPH.Graph("#my-canvas")
// 
GRAPH = (function() {
    "use strict";

    function Graph(name) {
	this.name = name;
	var canvas = $(this.name)[0];
	this.ctx = canvas.getContext("2d");
	this.margin = 25;
	this.drag_point = false;
	this.functions = {};
    }

    Graph.prototype.canvas = function() {
	return $(this.name)[0];
    }

    // Given an interval, returns an appropriate step value
    // to divide into subintervals for display.
    function calculateNiceStep(min, max) {
	var step = (max - min) / 20;
	if (step >= 1) {
	    if (step < 2) return 1;
	    if (step < 8) return 5;
	    if (step < 20) return 10;
	    if (step < 30) return 25;
	    if (step < 60) return 50;
	    step = Math.pow(10, Math.ceil(Math.log10(step)));
	    if ((max - min) / step < 5) step /= 2;
	    return step;
	} else {
	    if (step > 0.5) return 1;
	    if (step > 0.1) return 0.5;
	    step = Math.pow(10, Math.ceil(Math.log10(step)));
	    if ((max - min) / step < 5) step /= 5;
	    return step;
	} 
    }

    // Set up the graph window.  The tick mark placement
    // is automatically calculated.
    Graph.prototype.set_window = function(xmin, xmax, ymin, ymax) {
	this.xmin = xmin
	this.xmax = xmax;
	this.xspan = xmax - xmin;
	this.xstep = calculateNiceStep(xmin, xmax);

	this.ymin = ymin;
	this.ymax = ymax;
	this.yspan = ymax - ymin;
	this.ystep = calculateNiceStep(ymin, ymax);

	// Need to redo the transformation matrix after this.
	this.resize();
    }

    // Calculate the transformation matrix and its inverse based on the
    // width and height of the canvas and the current graph window.
    Graph.prototype.resize = function() {
	var width = ""+$(this.name).width();
	var height = ""+$(this.name).height();

	// Need to actually change the canvas dimensions manually.
	// Not totally sure why, but otherwise it will just stretch
	// the previously drawn image.
	var canvas = $(this.name)[0];
	canvas.width = width;
	canvas.height = height;

	var xScale = (width - 2*this.margin) / (this.xmax - this.xmin);
	var yScale = -(height - 2*this.margin) / (this.ymax - this.ymin);

	this.matrix = {a:xScale, 
		       b:0, 
		       c:0, 
		       d:yScale, 
		       e:this.margin - this.xmin*xScale, 
		       f:this.margin - this.ymax*yScale};

	this.inverse = {a: 1/this.matrix.a,
			b: 0,
			c: 0,
			d: 1/this.matrix.d,
			e: -this.matrix.e/this.matrix.a,
			f: -this.matrix.f/this.matrix.d};

	var m = this.matrix;
	this.ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    }

    // Modifies the translation part of the transformation matrix for the canvas
    // so that the canvas (x,y) coordinates map to the (anchorX, anchorY) graph coords.
    Graph.prototype.translateAnchorPoint = function(x, y, anchorX, anchorY) {
	var m = this.matrix;
	this.xmin = anchorX - (x-this.margin)/m.a;
	this.xmax = this.xmin + this.xspan;
	this.ymax = anchorY - (y-this.margin)/m.d;
	this.ymin = this.ymax - this.yspan;
	m.e = x - anchorX*m.a;
	m.f = y - anchorY*m.d;
	this.inverse.e = -m.e/m.a;
	this.inverse.f = -m.f/m.d;
	this.ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    }

    Graph.prototype.scaleGraphHorizontally = function(x, anchorX) {
	var m = this.matrix;
	// origin in canvas space is (m.e, m.f)
	// distance from current point to origin is x - m.e
	// we want to rescale graph so that (x - m.e) = anchorX * xScale.
	var xScale = (x - m.e) / anchorX;
	if (xScale <= 0) return;
	this.xspan *= m.a/xScale;
	m.a = xScale;
	this.xmin = (this.margin - m.e) / m.a;
	this.xmax = this.xmin + this.xspan;
	this.inverse.a = 1/m.a;
	this.inverse.e = -m.e/m.a;
	this.xstep = calculateNiceStep(this.xmin, this.xmax, m.a);
	this.ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    }

    Graph.prototype.scaleGraphVertically = function(y, anchorY) {
	var m = this.matrix;
	// origin in canvas space is (m.e, m.f)
	// distance from current point to origin is y - m.f
	// we want to rescale graph so that (y - m.f) = anchorY * yScale.
	var yScale = (y - m.f) / anchorY;
	if (yScale >= 0) return;
	this.yspan *= m.d/yScale;
	m.d = yScale;
	this.ymax = (this.margin - m.f) / m.d;
	this.ymin = this.ymax - this.yspan;
	this.inverse.d = 1/m.d;
	this.inverse.f = -m.f/m.d;
	this.ystep = calculateNiceStep(this.ymin, this.ymax, m.d);
	this.ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
    }

    // Given a point (x, y) in raw canvas coordinates, transforms
    // it into equivalent graph window coordinates.
    Graph.prototype.transformPoint = function(x, y) {
	var inv = this.inverse;
	return { x: inv.a*x + inv.c*y + inv.e,
		 y: inv.b*x + inv.d*y + inv.f };
    }

    Graph.prototype.canvas_press = function(event) {
	var x = event.pageX-$(this.name).offset().left;
	var y = event.pageY-$(this.name).offset().top;

	// Need to transform x and y via the graph inverse transformation matrix
	// so that the resulting point p is in graph space.
	var p = this.transformPoint(x, y);
	var xScale = this.matrix.a;
	var yScale = this.matrix.d;

	// First see if mouse clicked on the x or y axis,
	// and if so, set up an initial drag point for scaling.
	// Otherwise set up an initial drag point for translation.
	if (Math.abs(p.y*yScale) < 5) {
	    this.drag_point = {type: 'x-axis', x: x, y: y, anchorX: p.x};
	} else if (Math.abs(p.x*xScale) < 5) {
	    this.drag_point = {type: 'y-axis', x: x, y: y, anchorY: p.y};
	} else {
	    this.drag_point = {type: 'translate', x: x, y: y, anchorX: p.x, anchorY: p.y};	      
	}
    }

    Graph.prototype.canvas_endPress = function(event) {
	this.drag_point = false;
    }

    Graph.prototype.canvas_drag = function(event) {
	var x = event.pageX-$(this.name).offset().left;
	var y = event.pageY-$(this.name).offset().top;

	if (this.drag_point) {
	    if (this.drag_point.type == 'x-axis') {
		this.scaleGraphHorizontally(x, this.drag_point.anchorX);
		this.redraw();
	    } else if (this.drag_point.type == 'y-axis') {
		this.scaleGraphVertically(y, this.drag_point.anchorY);
		this.redraw();
	    } else if (this.drag_point.type == 'translate') {
		this.translateAnchorPoint(x, y, this.drag_point.anchorX, this.drag_point.anchorY);
		this.redraw();
	    }
	}
    }

    Graph.prototype.canvas_move = function(event) {
	var x = event.pageX-$(this.name).offset().left;
	var y = event.pageY-$(this.name).offset().top;
	
	// Need to transform x and y via the canvas transformation matrix
	// so that the resulting point p is in graph space.
	var xScale = this.matrix.a;
	var yScale = this.matrix.d;
	var p = this.transformPoint(x, y);

	if (Math.abs(p.x*xScale) < 3 || Math.abs(p.y*yScale) < 3) {
	    $('body').css('cursor', 'pointer');
	} else {
	    $('body').css('cursor', 'default');
	}	  
    }      

    // Returns the number x rounded to n decimal places.
    function round(x, n) {
	if (n <= 0) return x;
	var p = Math.pow(10, n);
	return Math.round(x * p) / p;
    }

    Graph.prototype.draw_grid = function() {
	var deg_to_rad = Math.PI/180.0;
	var xScale = this.matrix.a;
	var yScale = this.matrix.d;

	this.ctx.beginPath();
	this.ctx.strokeStyle="rgba(100,100,100,0.25)";
	// Grid lines
	var startx = Math.ceil(this.xmin/this.xstep)*this.xstep;
	for (var x = startx; x <= this.xmax; x+=this.xstep) {
	    this.ctx.moveTo(x, this.ymin);
	    this.ctx.lineTo(x, this.ymax);
	}
	var starty = Math.ceil(this.ymin/this.ystep)*this.ystep;
	for (var y = starty; y <= this.ymax; y+=this.ystep) {
	    this.ctx.moveTo(this.xmin, y);
	    this.ctx.lineTo(this.xmax, y);
	}
	// Before stroking the lines, we save the context,
	// and remove any scaling transformations so that the
	// linewidth will not be transformed, then restore the context.
	this.ctx.save();
	this.ctx.setTransform(1,0,0,1,0,0);
	this.ctx.lineWidth = 1;
	this.ctx.stroke();
	this.ctx.restore();

	// X and Y axes.
	var offset = 5;
	this.ctx.beginPath();
	this.ctx.strokeStyle="black";
	if (this.ymin <= 0 && 0 <= this.ymax) {
	    this.ctx.moveTo(this.xmin - offset/xScale, 0);
	    this.ctx.lineTo(this.xmax + offset/xScale, 0);
	}
	if (this.xmin <= 0 && 0 <= this.xmax) {
	    // The signs are backwards here because yScale is negative.
	    this.ctx.moveTo(0, this.ymin + offset/yScale);
	    this.ctx.lineTo(0, this.ymax - offset/yScale);
	}
	this.ctx.save();
	this.ctx.setTransform(1,0,0,1,0,0);
	this.ctx.lineWidth = 1.5;
	this.ctx.stroke();
	this.ctx.restore();

	// Draw the labels for x and y axes and the axis tick marks.
	// We temporarily remove the scaling part of transformation matrix, 
	// since we don't want the text to be scaled.
	this.ctx.save();
	this.ctx.setTransform(1, 0, 0, 1, this.margin - this.xmin*xScale, this.margin - this.ymax*yScale);
	this.ctx.font = "bold italic 18px Times New Roman";
	this.ctx.fillStyle = "black";
	this.ctx.textAlign = "center";
	this.ctx.textBaseline = "middle";
	this.ctx.fillText("x", this.xmax*xScale + 3*offset, 0);
	this.ctx.fillText("y", 0, this.ymax*yScale - 4*offset);
	// Tick mark labels
	this.ctx.font = "10px sans-serif";
	// Determine where to put the x tick marks.  If the x-axis is visible within the window,
	// then we place them below the x-axis.  Otherwise we put them at the bottom of the graph.
	var y = 0;
	if (0 < this.ymin || this.ymax < 0) { y = this.ymin*yScale; }
	// Figure out how many decimal places we need to round tick marks to.
	// If precision is negative, no rounding will occur.
	var precision = -Math.floor(Math.log10(this.xstep));
	// Replace negative sign with unicode symbol for '-', returning string.
	function unicodeMinus(x) {
	    if (x < 0) { return "\u2212"+(-x); }
	    else { return ''+x; }
	}
	for (var x = startx; x <= this.xmax; x+=this.xstep) {
	    if (x == 0) continue;
	    this.ctx.fillText(unicodeMinus(round(x, precision)), x*xScale, 2*offset + y);
	}
	// Determine where to put the y tick marks.  If the y-axis is visible withint the window, 
	// then we place them to the left of the y-axis.  Otherwise put them at left of graph.
	var x = 0;
	if (0 < this.xmin || this.xmax < 0) { x = this.xmin*xScale; }
	// Determine number of decimal places needed for the y tick marks.
	precision = -Math.floor(Math.log10(this.ystep));
	this.ctx.textAlign = "right";
	for (var y = starty; y <= this.ymax; y+=this.ystep) {
	    this.ctx.fillText(unicodeMinus(round(y, precision)), -offset+x, y*yScale);
	}
	this.ctx.restore();
    }
        
    // Solves f(x) = c on the interval [x1,x2] using bisection.
    // Assumes that there is only one solution in the given interval.
    // Returns the solution x, or NaN if no solution found.
    function bisect(f, c, x1, x2) {
	var y1 = f(x1) - c;
	if (y1 == 0) return x1;
	var y2 = f(x2) - c;
	if (y2 == 0) return x2;
	if (y1*y2 > 0) return NaN;

	var x, dx;
	if (y1 < 0) {
	    x = x1;
	    dx = x2 - x1;
	} else {
	    x = x2;
	    dx = x1 - x2;
	}

	for (var n = 1; n <= 40; n++) {
	    dx *= 0.5;
	    var xmid = x + dx;
	    y2 = f(xmid) - c;
	    if (y2 <= 0) x = xmid;
	    if (Math.abs(dx) < 1e-12 || y2 == 0) {
		return x;
	    }
	}
	return NaN;
    }

    // Uses bisection to look for endpoints of f on the interval [x1,x2].
    function endpoint_bisect(f, x1, x2) {
	var x, dx;
	var y1 = f(x1);
	var y2 = f(x2);
	if (isFinite(y1) && isFinite(y2)) return NaN;
	if (isFinite(y1)) {
	    x = x1;
	    dx = x2 - x1;
	} else {
	    x = x2;
	    dx = x1 - x2;
	}

	for (var n = 1; n <= 40; n++) {
	    dx *= 0.5;
	    var xmid = x + dx;
	    y2 = f(xmid);
	    if (isFinite(y2)) x = xmid;
	    if (Math.abs(dx) < 1e-12) {
		return x;
	    }
	}
	return NaN;
    }

    // Returns true if the function f seems to be monotonic
    // near the given x value.
    function crosses_at_x(f, x) {
	var epsilon = 1e-6;
	var y = f(x);
	var y1 = f(x - epsilon) - y;
	var y2 = f(x + epsilon) - y;
	return y1*y2 < 0;
    }

    // Finds *all* solutions to f(x) = c on the interval [xmin, xmax]
    // by first breaking interval into several subintervals and then 
    // performing bisection on each subinterval with a possible zero.
    function find_crossings(f, c, xmin, xmax) {
	// Start with a bisection algorithm to find the possible zeros.
	var dx = (xmax - xmin) / 2000;
	var x1 = xmin;
	var y1 = f(x1)-c;
	var points = [];
	for (var x2 = xmin+dx; x2 <= xmax; x2+=dx) {	      
	    var y2 = f(x2)-c;
	    if (y1*y2 <= 0) {
		var x = bisect(f, c, x1, x2);
		if (crosses_at_x(f, x)) {
		    points.push(x);
		}
	    }
	    x1 = x2;
	    y1 = y2;
	}
	return points;
    }

    // Finds all endpoints of f on the interval [xmin,xmax].
    function find_endpoints(f, xmin, xmax, ymin, ymax) {
	var dx = (xmax - xmin) / 2000;
	var x1 = xmin;
	var y1 = f(x1);
	var points = [];
	for (var x2 = xmin+dx; x2 <= xmax; x2+=dx) {	      
	    var y2 = f(x2);
	    if (isFinite(y1) != isFinite(y2)) {
		var x = endpoint_bisect(f, x1, x2);
		if (!isNaN(x)) {
		    var y = f(x);
		    if (ymin < y && y < ymax) {
			points.push(x);
		    }
		}
	    }
	    x1 = x2;
	    y1 = y2;
	}
	return points;
    }
    
    function get_graph_bounds(f, xmin, xmax, ymin, ymax) {
	var bounds = find_crossings(f, ymax, xmin, xmax);
	bounds = bounds.concat(find_crossings(f, ymin, xmin, xmax));

	// Look for endpoints.
	var endpoints = find_endpoints(f, xmin, xmax, ymin, ymax);
	bounds = bounds.concat(endpoints);

	// Include xmin and xmax in the bounds array if appropriate.
	var y = f(xmin);
	if (ymin < y && y < ymax) bounds.push(xmin);
	y = f(xmax);
	if (ymin < y && y < ymax) bounds.push(xmax);
	// If we didn't find enough bounds to make sense, then just draw the
	// graph over the entire interval as a failsafe.
	if (bounds.length < 2) bounds = [xmin, xmax];

	bounds.sort(function(a,b){ return a-b; });
	return {bounds: bounds, endpoints: endpoints};
    }
    
    function graph_function_over_interval(f, x1, x2, ctx) {
	var incr = (x2 - x1) / 1000;
	ctx.beginPath();
	for (var x = x1; x < x2; x += incr) {
	    ctx.lineTo(x, f(x));
	}
	ctx.lineTo(x2, f(x2));
	
	ctx.save();
	ctx.setTransform(1,0,0,1,0,0);
	ctx.stroke();
	ctx.restore();
    }
    
    Graph.prototype.graph_function = function(f, color) {
	if (!f) return;
	
	if (!color) color = "red";
	this.ctx.strokeStyle=color;
	this.ctx.fillStyle=color;
	this.ctx.lineWidth = 2.5;
	
	// Get bounds of graph
	var interesting_points = get_graph_bounds(f, this.xmin, this.xmax, this.ymin, this.ymax);
	var bounds = interesting_points.bounds;
	var endpoints = interesting_points.endpoints;
	//console.log(JSON.stringify(bounds));
	
	// The draw the graph in sections.
	for (var i=0, len=bounds.length-1; i < len; i+=2) {
	    graph_function_over_interval(f, bounds[i], bounds[i+1], this.ctx);
	}
	
	// And draw any endpoints.
	for (var i=0, len=endpoints.length; i < len; i++) {
	    var x = endpoints[i];
	    var y = f(x);
	    this.ctx.save();
	    this.ctx.setTransform(1, 0, 0, 1, this.matrix.e, this.matrix.f);
	    this.ctx.beginPath();
	    this.ctx.arc(x*this.matrix.a, y*this.matrix.d, 3.5, 0, 2*Math.PI);
	    this.ctx.fill();
	    this.ctx.restore();
	}
    }

    Graph.prototype.redraw = function() {
	var width = ""+$(this.name).width();
	var height = ""+$(this.name).height();

	this.ctx.save();
	this.ctx.setTransform(1, 0, 0, 1, 0, 0);
	this.ctx.clearRect(0, 0, width, height);
	this.ctx.restore();

	this.draw_grid();

	var colors = {'f': 'red', 'g': 'purple', 'h': 'blue'};
	for (var key in this.functions) {
	    if (this.functions.hasOwnProperty(key)) {
		this.graph_function(this.functions[key], colors[key])
	    }
	}
    }

    // Expose public methods.
    return { Graph : Graph };
})();
