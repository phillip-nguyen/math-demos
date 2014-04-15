var MATRIX = (function() {

    // Use jQuery to return a deep copy of m.
    function deepCopy(m) {
	return $.extend(true, [], m);
    }

    // Multiplies row i of matrix m by the *rational* value k = [p, q].
    // May also pass in a scalar decimal k.
    // Returns a new matrix with the result.  Matrix m is unchanged.
    function scaleRow(m, i, k) {
	i -= 1;
	if (m[i] === undefined) return undefined;
	if (typeof(k) === "number") {
	    k = [k, 1];
	}
	var copy = deepCopy(m);
	var row = copy[i];
	for (var n = 0, len = row.length; n < len; n++) {
	    row[n] = MATH.rat_mul(row[n], k);
	}
	return copy;
    }

    // row_i <--> row_j
    // Swaps rows i and j of the matrix m, returning a new matrix
    // and leaving the original matrix m unchanged.
    function swapRows(m, i, j) {
	i -= 1;
	j -= 1;
	if (m[i] === undefined || m[j] === undefined) return undefined;
	var copy = deepCopy(m);
	var temp = copy[i];
	copy[i] = copy[j];
	copy[j] = temp;
	return copy;
    }

    // k*row_i + row_j --> row_j
    function addMultiple(m, k, i, j) {
	i -= 1;
	j -= 1;
	if (m[i] === undefined || m[j] === undefined) return undefined;
	var copy = deepCopy(m);
	row1 = copy[i];
	row2 = copy[j];
	for (var n = 0, len = row1.length; n < len; n++) {
	    row2[n] = MATH.rat_add(row2[n], MATH.rat_mul(row1[n], k));
	}
	return copy;
    }

    // Returns the number of rows in the matrix m.
    function numRows(m) {
	return m.length;
    }

    // Returns the number of columns in the first row of the matrix m,
    // or undefined if m doesn't have a first row.
    function numCols(m) {
	return (m[0] && m[0].length);
    }

    // Returns LaTeX code to typeset an augmented matrix.
    // The optional augm argument specifies the column number
    // after which a vertical line will be drawn.
    function typeset(m, augm) {
	var html = '\\(\\left[\\begin{array}{';
	if (augm && augm > 0 && augm < numCols(m)) {
	    html += new Array(augm+1).join('r') + '|' + new Array(numCols(m)-augm+1).join('r')
	} else {
	    html += new Array(numCols(m)+1).join('r')
	}
	html += '}';
	var rows = [];
	for (var i=0, len=numRows(m); i < len; i++) {
	    rows.push($.map(m[i], function(x,index) {
		return MATH.rat_typeset(x);
	    }).join('&'));
	}
	html += rows.join('\\\\');
	html += '\\end{array}\\right]'
	    + '\\)';
	return html;
    }

    function randInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    function randMatrix(nrows, ncols) {
	var m = [];
	for (var i = 0; i < nrows; i++) {
	    var row = [];
	    for (var j = 0; j < ncols; j++) {
		row.push([randInt(-9, 9), 1]);
	    }
	    m.push(row);
	}
	return m;
    }

    return {
	scaleRow: scaleRow,
	swapRows: swapRows,
	addMultiple: addMultiple,
	numRows: numRows,
	numCols: numCols,
	typeset: typeset,
	randMatrix: randMatrix,
    };
}());
