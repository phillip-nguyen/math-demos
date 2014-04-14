var MATRIX = (function() {

    function dupe(m) {
	var copy = [];
	for (var i = 0, len = m.length; i < len; i++) {
	    copy[i] = m[i].slice(0);
	}
	return copy;
    }

    // Multiplies row i of matrix m by the scalar value k.
    // Returns a new matrix with the result.  Matrix m is unchanged.
    function scaleRow(m, i, k) {
	i -= 1;
	if (m[i] === undefined) return undefined;
	var copy = dupe(m);
	var row = copy[i];
	for (var n = 0, len = row.length; n < len; n++) {
	    row[n] *= k;
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
	var copy = dupe(m);
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
	var copy = dupe(m);
	row1 = copy[i];
	row2 = copy[j];
	for (var n = 0, len = row1.length; n < len; n++) {
	    row2[n] += k*row1[n];
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
    function typeset(m) {
	var html = '\\('
	    + '\\left[\\begin{array}{'
	    + new Array(numCols(m)).join('r')
	    + '|r}';
	var rows = [];
	for (var i=0, len=numRows(m); i < len; i++) {
	    rows.push(m[i].join('&'));
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
		row.push(randInt(-9, 9));
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
