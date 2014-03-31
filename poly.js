// POLY.js module
// Copyright 2014 Phillip Nguyen.
// All rights reserved.
//
// This module exposes some methods for parsing polynomial expressions
// and checking for polynomial equality.
POLY = (function() {
    "use strict";

    function lex(input) {
	var token_list = [];

	// The find_next_match function has <input> and <token_list> 
	// in scope, and modifies both if it finds a match.
	function find_next_match(type, pattern) {
	    var result = input.match(pattern); 
	    if (result === null) return false;
	    var tok = result[0];
	    if (type === "OPERATOR" || type === "PARENTHESES") {
		type = tok;
	    }
	    token_list.push({token: tok, type: type});
	    input = input.substr(tok.length);
	    return true;
	}
	
	while (input) {
	    // Remove leading whitespace
	    input = input.replace(/^\s+/, "");
	    if (input === "") break;
	    // Look for valid tokens.
	    if (find_next_match("NUMBER", /(^\d+(\.\d+)?)|(^\.\d+)/)) continue;
	    if (find_next_match("FUNCTION", /^(sin|cos|tan|csc|sec|cot|ln|exp|abs)/)) continue;
	    if (find_next_match("OPERATOR", /^(\+|-|\*|\/|\^)/)) continue;
	    if (find_next_match("PARENTHESES", /^(\(|\))/)) continue;
	    // Must look for constants and variables after functions, so that
	    // "exp" is found before "e", and "tan" is found before "t".
	    if (find_next_match("CONSTANT", /^(pi|e)/)) continue;
	    if (find_next_match("VARIABLE", /^x/)) continue;
	    // If nothing matched, then input was invalid and we return false.
	    throw {type: "LexicalError", msg: "Don't understand " + input};
	}
	return token_list;
    }


    // Parse function takes an input string and returns an equivalent
    // postfix expression stored as a sequence of tokens in an array.
    function parse(input) {
	var tokens = lex(input), token_index = 0;
	var curr_tok = tokens[0];
	var postfix = [];
	if (!tokens || tokens.length === 0) return false;

	// Returns the next token in the token stream.
	// Modifies the value of <token_index> declared above.
	// Returns false if we run out of tokens.
	function next_token() {
	    token_index += 1;
	    if (token_index >= tokens.length) return false;
	    return tokens[token_index];
	}

	// Tries to match the given token type with the 
	// current token in the token stream.  If there is a valid
	// match, then the current token is advanced to the next one,
	// otherwise we throw a syntax error.
	function match(tok) {
	    if (curr_tok.type === tok) {
		curr_tok = next_token();
	    } else {
		throw {type: "SyntaxError", msg: "Error matching" + tok};
	    }
	}

	// Checks if the current token type matches <tok>
	// but does not advance to the next token.
	function lookahead(tok) {
	    if (curr_tok.type === tok) return true;
	    return false;
	}

	function F() {
	    if (lookahead('(')) {
		match('('); E(); match(')');
	    } else if (lookahead("NUMBER")) {
		postfix.push(curr_tok);
		match("NUMBER");
	    } else if (lookahead("FUNCTION")) {
		var f = curr_tok;
		match("FUNCTION"); match('('); E(); match(')');
		postfix.push(f);
	    } else if (lookahead("CONSTANT")) {  
		postfix.push(curr_tok);
		match("CONSTANT");
	    } else if (lookahead("VARIABLE")) {  // 
		postfix.push(curr_tok);
		match("VARIABLE");
	    } else {
		throw {type: "SyntaxError", msg: "Error parsing F"};
	    }
	}

	function S() {
	    var neg = false;
	    if (lookahead('-')) {
		match('-');
		neg = true;
	    }
	    F();
	    if (lookahead('^')) {
		var p = curr_tok;
		match('^'); S();
		postfix.push(p);
	    }
	    if (neg) {
		postfix.push({token: '-', type: 'NEGATION'});
	    }
	}
	
	function T() {
	    S(); T_rest();
	}

	function T_rest() {
	    if (lookahead('*')) {
		var m = curr_tok;
		match('*'); S(); postfix.push(m); T_rest();
	    } else if (lookahead('/')) {
		var d = curr_tok;
		match('/'); S(); postfix.push(d); T_rest();		  
	    } else if (lookahead('NUMBER') || 
		       lookahead('CONSTANT') || 
		       lookahead('(') || 
		       lookahead('VARIABLE') || 
		       lookahead('FUNCTION')) {
		// Next expression is a factor.
		S(); postfix.push({token: "", type: '*'}); T_rest();
	    } else {
		// empty
	    }
	}

	function E() {
	    T(); E_rest();
	}

	function E_rest() {
	    if (lookahead('+')) {
		var a = curr_tok;
		match('+'); T(); postfix.push(a); E_rest();
	    } else if (lookahead('-')) {
		var s = curr_tok;
		match('-'); T(); postfix.push(s); E_rest();
	    } else {
		// empty
	    }
	}

	// Start parsing with the input as an expression E.
	E();

	// Return the contents of the postfix array if we
	// parsed the input successfully.
	return postfix;
    }

    // Add-ons to the included math functions.
    // Probably should have some checks in here for NaN results.
    function cosecant(x) { return 1/Math.sin(x); }
    function secant(x) { return 1/Math.cos(x); }
    function cotangent(x) { return 1/Math.tan(x); }

    // Given an array representing an expression parsed into postfix form,
    // returns an equivalent parse tree.  Note that this converts constants
    // like e and pi into equivalent NUMBER nodes in order to reduce the
    // number of node types.  This has repercussions in that coefficients
    // such as (pi/2) or (e^3) would not be considered simplified.
    function tree_from_postfix(postfix) {
	// Table of constants.
	var c = {"pi": Math.PI, "e": Math.E};
	var stack = [];
	for (var i = 0, len = postfix.length; i < len; i++) {
	    var tok = postfix[i];
	    if (tok.type === 'NUMBER') {
		var node = {type: 'NUMBER', value: parseFloat(tok.token)};
		stack.push(node);
	    } else if (tok.type === 'CONSTANT') {
		var node = {type: 'NUMBER', value: c[tok.token]};
		stack.push(node);
	    } else if (tok.type === 'VARIABLE') {
		var node = {type: tok.type};
		stack.push(node);
	    } else if (tok.type === '+' || tok.type === '-' || tok.type === '*' || tok.type === '/' || tok.type === '^') {
		var node = {type: 'BINARYOP', operator: tok.type, right: stack.pop(), left: stack.pop() };
		stack.push(node);
	    } else if (tok.type === 'NEGATION') {
		var node = {type: 'UNARYOP', operator: tok.type, child: stack.pop()}
		stack.push(node);
	    } else if (tok.type === 'FUNCTION') {
		var node = {type: 'UNARYOP', operator: tok.type, func: tok.token, child: stack.pop()}
		stack.push(node);
	    }
	}
	return stack.pop();
    }

    // Evaluates the expression represented by the root node, substituting in the
    // given value for any occurence of a VARIABLE node.
    function evaluate_tree(node, value) {
	// Table of functions.
	var f = {"sin": Math.sin, "cos": Math.cos, "tan": Math.tan, 
		 "csc": cosecant, "sec": secant, "cot": cotangent, 
		 "exp": Math.exp, "ln": Math.log, "abs": Math.abs};

	if (node.type === 'NUMBER') return node.value;
	if (node.type === 'VARIABLE') return value;
	if (node.operator === 'NEGATION') return -evaluate_tree(node.child, value);
	if (node.operator === 'FUNCTION') return f[node.func](evaluate_tree(node.child, value));
	if (node.operator === '+') return evaluate_tree(node.left, value) + evaluate_tree(node.right, value);
	if (node.operator === '-') return evaluate_tree(node.left, value) - evaluate_tree(node.right, value);
	if (node.operator === '*') return evaluate_tree(node.left, value) * evaluate_tree(node.right, value);
	if (node.operator === '/') return evaluate_tree(node.left, value) / evaluate_tree(node.right, value);
	if (node.operator === '^') return Math.pow(evaluate_tree(node.left, value), evaluate_tree(node.right, value));
	return undefined;
    }

    // Returns true if all leaf nodes of the parse tree are numbers.
    function is_constant(node) {
	if (node.type === 'NUMBER') return true;
	if (node.type === 'VARIABLE') return false;
	if (node.type === 'UNARYOP') return is_constant(node.child);
	if (node.type === 'BINARYOP') return (is_constant(node.left) && is_constant(node.right));
	return false;
    }

    // Returns true if the given expression tree could be represented as a polynomial.
    function is_polynomial(node) {
	if (node.type === 'NUMBER') return true;
	if (node.type === 'VARIABLE') return true;
	if (node.operator === 'FUNCTION') return is_constant(node.child);
	if (node.operator === 'NEGATION') return is_polynomial(node.child);
	if (node.operator === '/') return (is_polynomial(node.left) && is_constant(node.right));
	if (node.operator === '^') {
	    if (!is_polynomial(node.left)) return false;
	    if (!is_constant(node.right)) return false;
	    var exponent = evaluate_tree(node.right);
	    return (is_integer(exponent) && exponent >= 0);
	}
	if (node.type === 'BINARYOP') return (is_polynomial(node.left) && is_polynomial(node.right));
	return false;
    }

    // Given a polynomial p in vector form and a scalar value k, returns k*p.
    function scale_poly(k, p) {
	var kp = [];
	for (var i=0, len=p.length; i < len; i++) {
	    kp.push(k*p[i]);
	}
	return kp;
    }

    // Given an integer exponent k, returns a vector representation for x^k.
    // For example, x^3 = x_to_power(3) = [0, 0, 0, 1].
    function x_to_power(k) {
	if (!is_integer(k) || k < 0) {
	    throw { type: 'ValueError', msg: 'Exponent ' + k + ' is not a whole number.' };
	}
	var p = [];
	for (var i = 0; i < k; i++) {
	    p.push(0);
	}
	p.push(1);
	return p;
    }

    // Given two vectors p and q represented in vector form, returns 
    // their product p*q also as a vector.  The following example shows what 
    // the algorithm does:
    // p = [1 0 2 4]  (represents 1 + 2x^2 + 4x^3)
    // q = [3 1 5]    (represents 3 + x + 5x^2)
    // p * q = [1*3, 1*1 + 0*3, 1*5 + 0*1 + 2*3, 0*5 + 2*1 + 4*3, 2*5 + 4*1, 4*5]
    function mul_poly(p, q) {
	var result = [];
	var n = p.length;  // degree of p is (n-1)
	var m = q.length;  // degree of q is (m-1)
	// degree of p*q is (n-1)+(m-1) = n + m - 2.
	// So we want 0 <= i <= n + m - 2 ==> 0 <= i < n + m - 1.
	for (var i = 0; i < n + m - 1; i++) {
	    result[i] = 0;
	    // j iterates from 0 to i.  However
	    // p[j] requires that 0 <= j < n.
	    // q[i-j] requires that 0 <= i - j < m ==> -i <= -j < m - i ==> i - m < j =< i ==> i - m + 1 <= j < i+1
	    // Thefore j starts at max(0, i-m+1) and ends before min(i+1, n).
	    for (var j = Math.max(0, i-m+1); j < Math.min(i+1, n); j++) {
		result[i] += p[j]*q[i-j];
	    }
	}
	return result;
    }

    // Given two polynomials p and q represented in vector form,
    // returns their sum p + q.  The resulting vector may have 
    // leading 0 coefficients.
    function add_poly(p, q) {
	var result = [];
	var max = Math.max(p.length, q.length);
	for (var i = 0; i < max; i++) {
	    result[i] = (p[i] || 0) + (q[i] || 0);
	}
	return result;
    }

    // Given two polynomials p and q represented in vector form, 
    // returns their difference p - q.  Note that the resulting vector
    // may have leading 0 coefficients.
    function sub_poly(p, q) {
	var result = [];
	var max = Math.max(p.length, q.length);
	for (var i = 0; i < max; i++) {
	    result[i] = (p[i] || 0) - (q[i] || 0);
	}
	return result;
    }

    // Returns a list of polynomial coefficients, assuming that the given node 
    // represents an expression that simplifies into a polynomial.  Note that in the
    // process of getting the coefficients, it also simplifies the polynomial by
    // multiplying factors and adding like terms so that a node representing
    // (3x+5)*(2x-1) will return [-5, 7, 6] representing -5 + 7x + 6x^2.
    // So if you wish to treat the expressions (3x+5)*(2x-1) and 6x^2 + 7x - 5 differently,
    // then this function is not what you want.
    function get_polynomial_coefficients(node) {
	if (node.type === 'NUMBER') return [node.value];
	if (node.type === 'VARIABLE') return [0, 1];
	if (node.operator === 'NEGATION') return scale_poly(-1, get_polynomial_coefficients(node.child));
	if (node.operator === '^') {
	    if (node.left.type === 'VARIABLE' && is_constant(node.right)) {
		var exponent = evaluate_tree(node.right)
		return x_to_power(exponent);
	    } 
	    throw { type: 'SyntaxError', msg: 'Bad args to ^ operator.' };
	}
	if (node.operator === '*') return mul_poly(get_polynomial_coefficients(node.left), get_polynomial_coefficients(node.right));
	if (node.operator === '+') return add_poly(get_polynomial_coefficients(node.left), get_polynomial_coefficients(node.right));
	if (node.operator === '-') return sub_poly(get_polynomial_coefficients(node.left), get_polynomial_coefficients(node.right));
	if (node.operator === '/') {
	    if (is_constant(node.right)) {
		var denom = evaluate_tree(node.right);
		return scale_poly(1/denom, get_polynomial_coefficients(node.left));
	    } 
	    throw { type: 'SyntaxError', msg: 'Dividing by variable expression.' };
	}
	
    }

    // Returns a list of nodes split up into terms, by
    // separating the original tree at + and - operations.
    function get_terms(node) {
	if (node.operator === '+') {
	    var left = get_terms(node.left);
	    var right = get_terms(node.right);
	    left.push.apply(left, right);
	    return left;
	}
	if (node.operator === '-') {
	    var left = get_terms(node.left);
	    var right = get_terms(node.right);
	    for (var i=0, len=right.length; i < len; i++) {
		left.push( {type: 'UNARYOP', operator: 'NEGATION', child: right[i]} );
	    }
	    return left;
	}
	return [node];
    }

    // Returns a list of nodes split up into factors, by 
    // separating the original tree at * operations.  If a non-numeric
    // entity is negated, then -1 is split off as a separate factor.
    function get_factors(node) {
	if (node.operator === '*') {
	    var left = get_factors(node.left);
	    var right = get_factors(node.right);
	    left.push.apply(left, right);
	    return left;
	}
	if (node.operator === 'NEGATION') {
	    if (node.child.type === 'NUMBER') {
		return [node];
	    } else {
		// Create a -1 factor to represent the negation.
		var left = [ {type: 'NUMBER', value: -1} ]; 
		var right = get_factors(node.child);
		left.push.apply(left, right);
		return left;
	    }
	}
	return [node];
    }

    // Can also check x % 1 === 0.
    // Not sure which is faster.
    function is_integer(x) {
	return Math.floor(x) === x;
    }

    // Returns the greatest common divisor of a and b.
    // Note: the GCD is the largest *positive* integer that divides the numbers without remainder.
    // So we should be sure to return a positive answer.
    function gcd(a, b) {
	if (b === 0) return Math.abs(a);
	return gcd(b, a % b);
    }

    // Checks that node represents either a single number
    // or rational fraction in simplified form
    // (meaning p/q with gcd(p,q) == 1 and q > 0).
    // If this is the case, then the coefficient is returned
    // in the form of [p, q] or [r, 1].
    // Otherwise returns false.
    function get_simplified_coefficient(node, negated) {
	if (node.type === 'NUMBER') {
	    if (negated) {
		// Make sure we don't have a double negative.
		if (node.value < 0) return false;
		return [-node.value, 1];
	    } else {
		return [node.value, 1];
	    }
	}
	if (node.operator === 'NEGATION') {
	    if (negated) return false;  // don't want double negation
	    return get_simplified_coefficient(node.child, true);
	}
	if (node.operator === '/') {
	    var numer, denom;
	    // If the denominator is negated, then the fraction is not simplified.
	    if (node.right.operator === 'NEGATION') return false;
	    // It's okay if the numerator is negated, so long as the entire fraction
	    // wasn't already negated earlier.
	    if (node.left.operator === 'NEGATION') {
		if (negated) return false;
		numer = node.left.child;
		denom = node.right;
		negated = true;
	    } else {
		numer = node.left;
		denom = node.right;
	    }
	    // Make sure that both the numerator and denominator are number values
	    // and that they are integers.
	    if (numer.type !== 'NUMBER' || denom.type !== 'NUMBER') return false;
	    if (!is_integer(numer.value)) return false;
	    if (!is_integer(denom.value)) return false;
	    // Make sure that the denominator is positive.
	    if (denom.value < 0) return false;
	    // The numerator can be negative so long as we haven't already seen
	    // a negation operator.
	    if (numer.value < 0 && negated) return false;
	    // Make sure that we're not dividing by zero.
	    if (denom.value === 0) return false;
	    // Check that fraction is in reduced form.
	    if (Math.abs(denom.value) === 1) return false;
	    if (gcd(numer.value, denom.value) !== 1) return false;
	    // Return the rational number coefficient.
	    if (negated) {
		return [-numer.value, denom.value];
	    } else {
		return [numer.value, denom.value];
	    }    
	}
	return false;
    }

    // Returns true if the given parse tree is of the form x^n for some nonnegative integer n.
    function is_power_of_x(node) {
	if (node.type === 'VARIABLE') return true;
	if (node.operator === '^') {
	    return (node.left.type === 'VARIABLE' && node.right.type === 'NUMBER' && is_integer(node.right.value) && node.right.value >= 0);
	}
	return false;
    }

    // Returns true if the given parse tree is of the form k*x^n where
    // k is a simplified coefficient (either a number or a reduced fraction).
    // n is a nonnegative integer exponent.
    // Should also return true for x^n or k*x or x or their negations.
    function is_simplified_monomial(node) {
	if (node.type === 'NUMBER' || node.type === 'VARIABLE') return true;
	if (is_power_of_x(node)) return true;
	if (node.operator === '*') return Boolean(get_simplified_coefficient(node.left)) && is_power_of_x(node.right);
	if (node.operator === 'NEGATION') return is_simplified_monomial(node.child);
	return false;
    }

    // Returns the degree of a polynomial node.
    // The zero polynomial returns degree 0 for the sake of simplicity.
    function polynomial_degree(node) {
	var p = get_polynomial_coefficients(node);
	for (var i = p.length - 1; i >= 0; i--) {
	    if (p[i] !== 0) return i;
	}
	return 0;
    }

    // Returns true if the given input parses as an exponential
    // function written in the form coeff*base^x.
    // Both coeff and base are assumed to be decimal numbers.
    function is_simplified_exponential(input, coeff, base) {
	try {
	    var postfix = parse(input);
	    var node = tree_from_postfix(postfix);
	} catch (exception) {
	    return false;
	}

	// Check for multiplication
	if (node.operator !== '*') {
	    // If there was no multiplication node, it's possible that
	    // it was omitted because the coefficient was 1.
	    if (coeff !== 1) return false;
	} else {
	    // Check that coefficient is correct.
	    if (node.left.type !== 'NUMBER') return false;
	    if (node.left.value !== coeff) return false;
	    node = node.right;
	}

	// Check for exponent.
	if (node.operator !== '^') return false;
	// Check for correct base.
	if (node.left.type !== 'NUMBER') return false;
	if (node.left.value !== base) return false;
	// Check that exponent is an x.
	if (node.right.type !== 'VARIABLE') return false;

	// Passed the gauntlet of tests.
	return true;
    }

    // Returns true if the given parse tree represents a polynomial expression
    // in simplified form, meaning 
    // (1) all coefficients and exponents have been simplified and reduced 
    // (2) all like terms have been combined into a single term
    // (3) there are no unmultiplied factors
    function is_simplified_polynomial(node) {
	var terms = get_terms(node);
	var degrees = [];
	// Check that every term is a simplified monomial.
	for (var i = 0; i < terms.length; i++) {
	    var term = terms[i];
	    if (!is_simplified_monomial(term)) return false;
	    // Check that there aren't any uncombined like terms.
	    var d = polynomial_degree(term);
	    if (degrees[d] === true) {
		return false;
	    } else {
		degrees[d] = true;
	    }
	}
	return true;
    }
    
    // Returns true if the given input parses as a quadratic
    // polynomial written in vertex form as a*(x-h)^2 + k,
    // with sign simplifications and with the leading coefficient a
    // as an exact number in reduced form.
    // Note: a should be passed as a rational number [p, q]
    // and both h and k should be integers.
    function is_simplified_vertex_form(input, a, h, k) {
	try {
	    var postfix = parse(input);
	    var node = tree_from_postfix(postfix);
	} catch (exception) {
	    return false;
	}
	
	// Check that the k term is correct.  We require that
	// the k be added on the right side.
	if (k > 0) {
	    if (node.operator !== '+') return false;
	    if (node.right.type !== 'NUMBER') return false;
	    if (node.right.value !== k) return false;
	    node = node.left;
	} else if (k < 0) {
	    if (node.operator !== '-') return false;
	    if (node.right.type !== 'NUMBER') return false;
	    if (node.right.value !== -k) return false;
	    node = node.left;
	} else if (k === 0) {
	    // do nothing
	}
	    
	if (node.operator !== '*') {
	    // If the leading coefficient is -1, then it may
	    // appear simply as a negation node.
	    if (node.operator === 'NEGATION') {
		if (!arrayEquals(a, [-1,1])) return false;
		node = node.child;
	    } else {
		// If the leading coefficient is 1, then it's possible that
		// it was omitted, hence no multiplication node.
		if (!arrayEquals(a, [1, 1])) return false;
	    }
	} else {
	    // If this was a multiplication node, then the left node
	    // should represent the leading coefficient.
	    // Check that a is correct.
	    var coeff = get_simplified_coefficient(node.left);
	    if (!coeff) return false;
	    if (!arrayEquals(coeff, a)) return false;
	    node = node.right;
	}

	// Check for square	
	if (node.operator !== '^') return false;
	if (node.right.type !== 'NUMBER' || node.right.value !== 2) return false;
	node = node.left;

	// Check that the h term is correct.
	if (h > 0) {
	    if (node.operator !== '-') return false;
	    if (node.right.type !== 'NUMBER') return false;
	    if (node.right.value !== h) return false;	    
	    if (node.left.type !== 'VARIABLE') return false;
	} else if (h < 0) {
	    if (node.operator !== '+') return false;
	    if (node.right.type !== 'NUMBER') return false;
	    if (node.right.value !== -h) return false;	    
	    if (node.left.type !== 'VARIABLE') return false;
	} else if (h === 0) {
	    if (node.type !== 'VARIABLE') return false;
	}
	
	// Passed the gauntlet of tests.
	return true;
    }

    // Returns true if the give expression node represents the factor^exponent.
    // factor should be passed in as a vector poly in the form [3, 1] for (x+3)
    // exponent is the integer power.
    function nodeEqualsFactor(node, factor, exponent) {
	if (node.operator === '^') {
	    // Check that exponent is correct
	    if (node.right.type !== 'NUMBER') return false;
	    if (node.right.value !== exponent) return false;
	    node = node.left
	} else {
	    // There was no exponent, so make sure that
	    // it was supposed to be 1.
	    if (exponent !== 1) return false;
	}
	// Now check that the factor itself is correct.
	if (!is_polynomial(node)) return false;
	if (!is_simplified_polynomial(node)) return false;
	return arrayEquals(factor, get_polynomial_coefficients(node));
    }

    // Returns true if the given input expression (a string like "2/3(x-4)^2(x+1)")
    // represents a polynomial in complete factored form.
    // a is the leading coefficient as a rational number in the form [p, q].
    // factors is an array of linear factors in vector form e.g. [3, 1].
    // exponents is an array of factor exponents.
    function isFactoredForm(input, a, factors, exponents) {
	try { 
	    var postfix = parse(input);
	    var node = tree_from_postfix(postfix);
	} catch (exception) {
	    return false;
	}

	var inputFactors = get_factors(node);
	var f = inputFactors[0];
	// Check for leading coefficient
	if (f.type === 'NUMBER' || f.operator === '/' || f.operator === 'NEGATION') {
	    var coeff = get_simplified_coefficient(f);
	    if (!coeff) return false;
	    if (!arrayEquals(coeff, a)) return false;
	    inputFactors.shift();  // remove coefficient node from factors list.
	} else {
	    // If there wasn't a node for the leading coefficient as the
	    // first factor, then make sure that the leading coefficient is 1.
	    if (!arrayEquals(a, [1,1])) return false;
	}

	if (inputFactors.length !== factors.length) return false;

	function matchFactor(f, e) {
	    for (var i = 0, len = inputFactors.length; i < len; i++) {
		if (nodeEqualsFactor(inputFactors[i], f, e)) return true;
	    }
	    return false;
	}

	for (var i = 0, len = factors.length; i < len; i++) {
	    if (!matchFactor(factors[i], exponents[i])) return false;
	}
	return true;
    }

    // A shallow equality test for arrays.  Returns true only if
    // the first level items in both arrays are identically equal.
    function arrayEquals(a, b) {
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (a.length !== b.length) return false;
	for (var i=0, len=a.length; i < len; i++) {
	    if (a[i] !== b[i]) return false;
	}
	return true;
    }

    // Returns true if the given input expression (a string like "3x^2 + 4x - 9")
    // represents a simplified polynomial and is also equivalent to the given
    // poly (a polynomial represented in vector form as [-9, 4, 3]).
    function equals_simplified_polynomial(input, poly) {
	try {
	    var postfix = parse(input);
	    var node = tree_from_postfix(postfix);
	    if (!is_polynomial(node)) return false;
	    if (!is_simplified_polynomial(node)) return false;
	    return arrayEquals(poly, get_polynomial_coefficients(node));
	} catch (exception) {
	    return false;
	}
    }

    // Returns true if the given input expression is a rational number
    // represented in lowest terms and equal to r = [p, q]
    function equals_simplified_rational(input, r) {
	try {
	    var postfix = parse(input);
	    var node = tree_from_postfix(postfix);
	    var coeff = get_simplified_coefficient(node);
	    return (coeff && arrayEquals(coeff, r));
	} catch (exception) {
	    return false;
	}
    }


    function signCharacter(x, leadingTerm) {
	if (x < 0) {
	    return '&#8722;';
	} else if (leadingTerm) {
	    return '';
	} else {
	    return '+';
	}
    }

    // Returns HTML code for nice looking version of polynomial.
    function toHtml(p) {
	var html = '';
	var degree = p.length - 1;
	var firstTerm = true;
	for (var i = degree; i >= 0; i--) {
	    var coeff = p[i];
	    if (coeff === 0) {
		if (firstTerm && i === 0) {
		    html += "0";
		}
		continue;
	    }
	    if (firstTerm) {
		html += signCharacter(coeff, firstTerm);
		firstTerm = false;
	    } else {
		html += " " + signCharacter(coeff) + " ";
	    }
	    if (Math.abs(coeff) !== 1 || i === 0) {
		html += Math.abs(coeff);
	    }
	    if (i !== 0) {
		html += "<i>x</i>";
	    } 
	    if (i > 1) {
		html += "<sup>" + i + "</sup>";
	    }
	}
	return html;
    }	  

    return { 
	degree: polynomial_degree,
	is_simplified_polynomial: is_simplified_polynomial,
	equals_simplified_polynomial: equals_simplified_polynomial,
	gcd: gcd,
	is_simplified_vertex_form: is_simplified_vertex_form,
	isFactoredForm: isFactoredForm,
	toHtml: toHtml,
	signCharacter: signCharacter,
	multiply: mul_poly,
	equals_simplified_rational: equals_simplified_rational,
	is_simplified_exponential: is_simplified_exponential,
    };

})();
